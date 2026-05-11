"""CSninja backend — FastAPI + MongoDB + JWT + AWS S3 + Razorpay + Pusher."""
import os
import re
import uuid
import hmac
import hashlib
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
import boto3
import razorpay
from botocore.config import Config as BotoConfig
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field

load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "csninja")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_EXPIRES_MIN = int(os.environ.get("JWT_EXPIRES_MIN", "15"))
REFRESH_EXPIRES_DAYS = int(os.environ.get("REFRESH_EXPIRES_DAYS", "7"))

AWS_REGION = os.environ.get("AWS_REGION", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "")
CLOUDFRONT_DOMAIN = os.environ.get("CLOUDFRONT_DOMAIN", "")

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

PUSHER_APP_ID = os.environ.get("PUSHER_APP_ID", "")
PUSHER_KEY = os.environ.get("PUSHER_KEY", "")
PUSHER_SECRET = os.environ.get("PUSHER_SECRET", "")
PUSHER_CLUSTER = os.environ.get("PUSHER_CLUSTER", "ap2")
PUSHER_BEAMS_INSTANCE_ID = os.environ.get("PUSHER_BEAMS_INSTANCE_ID", "")
PUSHER_BEAMS_SECRET_KEY = os.environ.get("PUSHER_BEAMS_SECRET_KEY", "")

# ─── External clients ──────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

s3_client = None
if os.environ.get("AWS_ACCESS_KEY_ID") and S3_BUCKET:
    s3_client = boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
    )

razor_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razor_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

pusher_client = None
if PUSHER_APP_ID and PUSHER_KEY and PUSHER_SECRET:
    try:
        from pusher import Pusher
        pusher_client = Pusher(app_id=PUSHER_APP_ID, key=PUSHER_KEY, secret=PUSHER_SECRET, cluster=PUSHER_CLUSTER, ssl=True)
    except Exception:
        pusher_client = None

beams_client = None
if PUSHER_BEAMS_INSTANCE_ID and PUSHER_BEAMS_SECRET_KEY:
    try:
        from pusher_push_notifications import PushNotifications
        beams_client = PushNotifications(instance_id=PUSHER_BEAMS_INSTANCE_ID, secret_key=PUSHER_BEAMS_SECRET_KEY)
    except Exception:
        beams_client = None


# ─── Expo Push (free, no credentials needed) ──────────────────────────────
import httpx  # noqa: E402

EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(tokens: List[str], title: str, body: str, data: Optional[dict] = None):
    """Fire-and-forget push to one or more Expo push tokens.

    No credentials needed for Expo's free push tier. Returns whatever Expo
    returns; failures are logged but don't raise (best-effort delivery).
    """
    if not tokens:
        return
    valid = [t for t in tokens if isinstance(t, str) and t.startswith(("ExponentPushToken[", "ExpoPushToken["))]
    if not valid:
        return
    payload = [{"to": t, "title": title, "body": body, "data": data or {}, "sound": "default", "priority": "high"} for t in valid]
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(EXPO_PUSH_ENDPOINT, json=payload, headers={"accept": "application/json", "content-type": "application/json"})
    except Exception:
        pass  # never break a request because of a push failure

# ─── FastAPI app ──────────────────────────────────────────────────────────
app = FastAPI(
    title="CSninja API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ─── Helpers ──────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_RE = re.compile(r"^\+?\d{10,15}$")


def _hash(pw: str) -> str:
    return pwd_ctx.hash(pw)


def _verify(pw: str, pw_hash: str) -> bool:
    try:
        return pwd_ctx.verify(pw, pw_hash)
    except Exception:
        return False


def _make_token(user_id: str, kind: str = "access") -> str:
    exp = datetime.now(timezone.utc) + (
        timedelta(minutes=JWT_EXPIRES_MIN) if kind == "access" else timedelta(days=REFRESH_EXPIRES_DAYS)
    )
    return jwt.encode({"sub": user_id, "type": kind, "exp": exp}, JWT_SECRET, algorithm="HS256")


def _decode(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


async def _user_from_header(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = _decode(token)
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"password": 0, "_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ─── Schemas ──────────────────────────────────────────────────────────────
class SignupIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)


class LoginIn(BaseModel):
    identifier: str  # email or phone
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class CreateOrderIn(BaseModel):
    course_id: str
    amount: int  # in INR rupees (gross before coupon)
    currency: str = "INR"
    coupon_code: Optional[str] = None
    address_id: Optional[str] = None


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    course_id: str


class AskDoubtIn(BaseModel):
    course_id: str
    chapter_id: Optional[str] = None
    topic: Optional[str] = None
    question: str = Field(..., min_length=3, max_length=2000)


class UploadUrlIn(BaseModel):
    filename: str
    content_type: str = "video/mp4"
    course_id: Optional[str] = None
    purpose: Optional[str] = "video"   # "video" | "image" | "doubt" | "avatar" | "transcript"


class SaveVideoIn(BaseModel):
    title: str
    description: Optional[str] = ""
    key: str                    # S3 key returned by presign
    duration: Optional[int] = 0 # seconds
    course_id: Optional[str] = None
    chapter_id: Optional[str] = None
    thumbnail_key: Optional[str] = None


class NotifyIn(BaseModel):
    user_ids: Optional[List[str]] = None   # list of user ids for targeted push
    channel: Optional[str] = None           # pusher channel for broadcast
    event: str = "notification"
    title: str
    body: str
    interests: Optional[List[str]] = None   # for Beams


# ─── Routes ───────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "services": {
            "mongo": True,
            "razorpay": razor_client is not None,
            "s3": s3_client is not None,
            "pusher_channels": pusher_client is not None,
            "pusher_beams": beams_client is not None,
        },
    }


# ── AUTH ──────────────────────────────────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(data: SignupIn):
    if not data.email and not data.phone:
        raise HTTPException(400, "Provide email or phone")
    if data.email and not EMAIL_RE.match(data.email):
        raise HTTPException(400, "Invalid email")
    if data.phone and not PHONE_RE.match(data.phone):
        raise HTTPException(400, "Invalid phone")

    q = {"$or": []}
    if data.email: q["$or"].append({"email": data.email.lower()})
    if data.phone: q["$or"].append({"phone": data.phone})
    if await db.users.find_one(q):
        raise HTTPException(409, "User already exists with this email or phone")

    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": data.name.strip(),
        "email": data.email.lower() if data.email else None,
        "phone": data.phone,
        "password": _hash(data.password),
        "role": "student",
        "permissions": [],
        "assigned_courses": [],
        "is_active": True,
        "avatar": None,
        "enrolledCourses": [],
        "xp": 0,
        "level": 1,
        "streak": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    access = _make_token(user_id, "access")
    refresh = _make_token(user_id, "refresh")
    doc.pop("password", None); doc.pop("_id", None)
    return {"accessToken": access, "refreshToken": refresh, "user": doc}


@app.post("/api/auth/login")
async def login(data: LoginIn):
    ident = data.identifier.strip().lower() if "@" in data.identifier else data.identifier.strip()
    user = await db.users.find_one({"$or": [{"email": ident}, {"phone": ident}]})
    if not user or not _verify(data.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    uid = user["id"]
    access = _make_token(uid, "access")
    refresh = _make_token(uid, "refresh")
    user.pop("password", None); user.pop("_id", None)
    return {"accessToken": access, "refreshToken": refresh, "user": user}


@app.post("/api/auth/refresh")
async def refresh_token(data: RefreshIn):
    try:
        payload = _decode(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except Exception:
        raise HTTPException(401, "Invalid refresh token")
    return {"accessToken": _make_token(payload["sub"], "access")}


@app.get("/api/auth/me")
async def me(user: dict = Depends(_user_from_header)):
    return {"user": user}


@app.patch("/api/auth/me")
async def update_me(payload: dict, user: dict = Depends(_user_from_header)):
    allowed = {k: v for k, v in payload.items() if k in {"name", "email", "phone", "avatar", "expo_push_token"}}
    if allowed:
        if "email" in allowed and allowed["email"]:
            allowed["email"] = allowed["email"].lower()
        await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    fresh = await db.users.find_one({"id": user["id"]}, {"password": 0, "_id": 0})
    return {"user": fresh}


# ── COURSES (mock data served from DB, seeded on first request) ───────────
# DEMO_COURSES = [
#     {"id": "course_001", "title": "Complete CSEET Package", "category": "CSEET", "price": 14999, "originalPrice": 19999, "language": "English + Hindi", "level": "Beginner", "faculty": {"name": "Adv. Mohit Dhiman", "subject": "Business Communication", "rating": 4.9, "students": 50000}},
#     {"id": "course_002", "title": "CS Executive — Module 1", "category": "Executive", "price": 8499, "originalPrice": 9999, "language": "English", "level": "Intermediate", "faculty": {"name": "CA Rohit Mehta", "subject": "Tax Laws", "rating": 4.8, "students": 32000}},
#     {"id": "course_003", "title": "CS Professional Advanced", "category": "Professional", "price": 11999, "originalPrice": 14999, "language": "English", "level": "Advanced", "faculty": {"name": "Adv. Kusum Kapuria", "subject": "Corporate Law", "rating": 4.9, "students": 18000}},
# ]


@app.get("/api/courses")
async def list_courses():
    docs = await db.courses.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    # Collect ALL faculty IDs needed (primary + faculty_ids arrays)
    all_fac_ids = set()
    for d in docs:
        if d.get("faculty") and isinstance(d["faculty"], dict) and d["faculty"].get("id"):
            all_fac_ids.add(d["faculty"]["id"])
        for fid in (d.get("faculty_ids") or []):
            all_fac_ids.add(fid)
    if all_fac_ids:
        fac_docs = await db.faculties.find({"id": {"$in": list(all_fac_ids)}}, {"_id": 0}).to_list(500)
        fac_map = {f["id"]: f for f in fac_docs}
        for d in docs:
            # Hydrate primary faculty
            fac = d.get("faculty")
            if fac and isinstance(fac, dict) and fac.get("id") and fac["id"] in fac_map:
                d["faculty"] = {**fac, **fac_map[fac["id"]]}
            # Embed full faculty objects for all faculty_ids
            if d.get("faculty_ids"):
                primary_id = (d.get("faculty") or {}).get("id")
                fac_list = [fac_map[fid] for fid in d["faculty_ids"] if fid in fac_map]
                if primary_id:
                    fac_list.sort(key=lambda f: 0 if f["id"] == primary_id else 1)
                d["faculties_data"] = fac_list
    return {"courses": docs}
    
@app.get("/api/courses/{course_id}")
async def get_course(course_id: str):
    c = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Course not found")
    # Collect all faculty IDs to fetch
    all_fac_ids = set()
    fac = c.get("faculty")
    if fac and isinstance(fac, dict) and fac.get("id"):
        all_fac_ids.add(fac["id"])
    for fid in (c.get("faculty_ids") or []):
        all_fac_ids.add(fid)
    if all_fac_ids:
        fac_docs = await db.faculties.find({"id": {"$in": list(all_fac_ids)}}, {"_id": 0}).to_list(100)
        fac_map = {f["id"]: f for f in fac_docs}
        if fac and isinstance(fac, dict) and fac.get("id") and fac["id"] in fac_map:
            c["faculty"] = {**fac, **fac_map[fac["id"]]}
        if c.get("faculty_ids"):
            primary_id = (c.get("faculty") or {}).get("id")
            fac_list = [fac_map[fid] for fid in c["faculty_ids"] if fid in fac_map]
            if primary_id:
                fac_list.sort(key=lambda f: 0 if f["id"] == primary_id else 1)
            c["faculties_data"] = fac_list
    return c
@app.get("/api/faculties")
async def list_faculties_public():
    docs = await db.faculties.find({}, {"_id": 0}).to_list(200)
    return {"faculties": docs}


@app.get("/api/experts")
async def list_experts_public():
    docs = await db.experts.find({}, {"_id": 0}).to_list(200)
    return {"experts": docs}


# ── RAZORPAY: create order + verify payment + webhook ─────────────────────
@app.post("/api/payments/create-order")
async def create_order(data: CreateOrderIn, user: dict = Depends(_user_from_header)):
    if not razor_client:
        raise HTTPException(503, "Payments not configured")

    # Apply coupon server-side (single source of truth)
    course = await db.courses.find_one({"id": data.course_id}, {"_id": 0, "price": 1})
    base_inr = int(course["price"]) if course else int(data.amount)
    final_inr = base_inr
    coupon_doc = None
    if data.coupon_code:
        code = data.coupon_code.strip().upper()
        coupon_doc = await db.coupons.find_one({"code": code, "is_active": True})
        if not coupon_doc:
            raise HTTPException(400, "Invalid or inactive coupon")
        applicable = coupon_doc.get("applicable_courses") or []
        if applicable and data.course_id not in applicable:
            raise HTTPException(400, "Coupon doesn't apply to this course")
        if coupon_doc.get("max_redemptions") is not None and coupon_doc.get("used_count", 0) >= coupon_doc["max_redemptions"]:
            raise HTTPException(400, "Coupon usage limit reached")
        discount = round(base_inr * coupon_doc["discount_pct"] / 100)
        final_inr = max(1, base_inr - discount)

    amount_paise = int(final_inr * 100)
    order = razor_client.order.create({"amount": amount_paise, "currency": data.currency, "receipt": f"rcpt_{uuid.uuid4().hex[:12]}", "payment_capture": 1, "notes": {"user_id": user["id"], "course_id": data.course_id, "coupon": (coupon_doc or {}).get("code", "")}})
    # Snapshot the selected delivery address (so the order remains accurate
    # even if the user later edits/deletes the address)
    addr_snapshot = None
    if data.address_id:
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "addresses": 1})
        for a in (u or {}).get("addresses", []) or []:
            if a.get("id") == data.address_id:
                addr_snapshot = a
                break
    await db.orders.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "course_id": data.course_id,
        "razorpay_order_id": order["id"],
        "amount": final_inr,
        "base_amount": base_inr,
        "coupon_code": (coupon_doc or {}).get("code"),
        "discount": base_inr - final_inr,
        "currency": data.currency,
        "status": "created",
        "address_id": data.address_id,
        "address": addr_snapshot,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    return {"order_id": order["id"], "amount": amount_paise, "currency": data.currency, "key_id": RAZORPAY_KEY_ID, "final_inr": final_inr, "discount": base_inr - final_inr}


@app.post("/api/payments/verify")
async def verify_payment(data: VerifyPaymentIn, user: dict = Depends(_user_from_header)):
    if not razor_client:
        raise HTTPException(503, "Payments not configured")
    try:
        razor_client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
    except Exception:
        raise HTTPException(400, "Invalid payment signature")
    # Enroll user + clear from cart, and record start/expiry dates based on
    # the course's durationDays (admin-configurable, default 365). When the
    # current date passes expires_at, the mobile UI prompts for re-enroll.
    course_doc = await db.courses.find_one({"id": data.course_id}, {"_id": 0, "durationDays": 1})
    validity_days = int((course_doc or {}).get("durationDays") or 365)
    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(days=validity_days)
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$addToSet": {"enrolledCourses": data.course_id},
            "$pull": {"cart_items": data.course_id, "enrollments": {"course_id": data.course_id}},
        },
    )
    # Re-add fresh enrollment with dates (first $pull clears any stale entry)
    await db.users.update_one(
        {"id": user["id"]},
        {"$push": {"enrollments": {
            "course_id": data.course_id,
            "enrolled_at": now_dt.isoformat(),
            "expires_at": expires_dt.isoformat(),
            "validity_days": validity_days,
        }}},
    )
    # Mark order paid + bump coupon usage
    paid_order = await db.orders.find_one_and_update(
        {"razorpay_order_id": data.razorpay_order_id},
        {"$set": {"status": "paid", "razorpay_payment_id": data.razorpay_payment_id, "paidAt": datetime.now(timezone.utc).isoformat()}},
    )
    if paid_order and paid_order.get("coupon_code"):
        await db.coupons.update_one({"code": paid_order["coupon_code"]}, {"$inc": {"used_count": 1}})
    # Trigger push
    _trigger_pusher(channel=f"user-{user['id']}", event="enrolled", data={"course_id": data.course_id})
    target = await db.users.find_one({"id": user["id"]}, {"_id": 0, "expo_push_token": 1})
    if target and target.get("expo_push_token"):
        await send_expo_push([target["expo_push_token"]], title="Enrollment confirmed", body="You're now enrolled. Start learning!", data={"type": "enrolled", "course_id": data.course_id})
    return {"ok": True, "enrolled": data.course_id}


@app.post("/api/payments/webhook")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    if RAZORPAY_WEBHOOK_SECRET:
        digest = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(digest, signature):
            raise HTTPException(400, "Invalid webhook signature")
    # TODO: parse body JSON and update order status
    return {"ok": True}


# ── AWS S3: presigned upload + streaming URL ──────────────────────────────
@app.post("/api/uploads/presign")
async def presign_upload(data: UploadUrlIn, user: dict = Depends(_user_from_header)):
    if not s3_client:
        raise HTTPException(503, "S3 not configured")
    # NOTE: Our current IAM policy only permits s3:PutObject under the
    # `videos/` prefix. Until policy is widened we namespace every kind of
    # upload under `videos/<purpose>/...`. This keeps avatars/images/doubts
    # working from the admin web UI without S3 AccessDenied errors.
    purpose = (data.purpose or "video").lower()
    prefix_map = {
        "video": "videos",
        "image": "videos/images",
        "doubt": "videos/doubts",
        "avatar": "videos/avatars",
        "transcript": "videos/transcripts",
    }
    prefix = prefix_map.get(purpose, "videos/files")
    key = f"{prefix}/{user['id']}/{uuid.uuid4().hex}_{data.filename}"
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": S3_BUCKET, "Key": key, "ContentType": data.content_type},
        ExpiresIn=3600,
    )
    public_url = (f"https://{CLOUDFRONT_DOMAIN}/{key}" if CLOUDFRONT_DOMAIN
                  else f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}")
    return {"upload_url": url, "key": key, "public_url": public_url}


# Direct server-side upload (used by the admin web panel where browser CORS blocks
# direct PUT to S3). The mobile app continues to use the presign + PUT flow.
from fastapi import UploadFile, File, Form  # noqa: E402


@app.post("/api/uploads/direct")
async def direct_upload(
    file: UploadFile = File(...),
    purpose: str = Form("image"),
    user: dict = Depends(_user_from_header),
):
    if not s3_client:
        raise HTTPException(503, "S3 not configured")
    # Same `videos/` umbrella prefix as presign — see note above.
    prefix_map = {
        "video": "videos",
        "image": "videos/images",
        "doubt": "videos/doubts",
        "avatar": "videos/avatars",
        "transcript": "videos/transcripts",
    }
    prefix = prefix_map.get((purpose or "image").lower(), "videos/files")
    safe_name = (file.filename or "file").replace("/", "_").replace("\\", "_")
    key = f"{prefix}/{user['id']}/{uuid.uuid4().hex}_{safe_name}"
    body = await file.read()
    if not body:
        raise HTTPException(400, "Empty file")
    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=body,
        ContentType=file.content_type or "application/octet-stream",
    )
    public_url = (f"https://{CLOUDFRONT_DOMAIN}/{key}" if CLOUDFRONT_DOMAIN
                  else f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}")
    return {"key": key, "public_url": public_url}


# ── Inline attachments stored directly in Mongo ──────────────────────────
# Used for small images (avatars, doubt screenshots, faculty photos) when S3
# IAM policy blocks PutObject. Limit: ~3 MB per file. Served back via
# `/api/attachments/{id}` with a long Cache-Control header.
import base64  # noqa: E402

_MAX_INLINE_BYTES = 3 * 1024 * 1024  # 3 MB


@app.post("/api/uploads/inline")
async def inline_upload(
    file: UploadFile = File(...),
    purpose: str = Form("image"),
    user: dict = Depends(_user_from_header),
):
    body = await file.read()
    if not body:
        raise HTTPException(400, "Empty file")
    if len(body) > _MAX_INLINE_BYTES:
        raise HTTPException(413, f"File too large (max {_MAX_INLINE_BYTES // (1024 * 1024)} MB for inline storage; use S3 for larger files)")
    aid = uuid.uuid4().hex
    await db.attachments.insert_one({
        "id": aid,
        "user_id": user["id"],
        "purpose": purpose,
        "filename": file.filename or "file",
        "content_type": file.content_type or "application/octet-stream",
        "size": len(body),
        "data_b64": base64.b64encode(body).decode("ascii"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    # Build absolute URL so it works from both mobile and admin web.
    base = os.environ.get("PUBLIC_BASE_URL", "")
    public_url = f"{base.rstrip('/')}/api/attachments/{aid}" if base else f"/api/attachments/{aid}"
    return {"id": aid, "public_url": public_url}


@app.get("/api/attachments/{aid}")
async def get_attachment(aid: str):
    doc = await db.attachments.find_one({"id": aid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Attachment not found")
    raw = base64.b64decode(doc["data_b64"])
    return Response(
        content=raw,
        media_type=doc.get("content_type", "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.get("/api/uploads/stream/{key:path}")
async def stream_url(key: str, user: dict = Depends(_user_from_header)):
    if not s3_client:
        raise HTTPException(503, "S3 not configured")
    if CLOUDFRONT_DOMAIN:
        return {"url": f"https://{CLOUDFRONT_DOMAIN}/{key}", "expires_in": 3600}
    url = s3_client.generate_presigned_url("get_object", Params={"Bucket": S3_BUCKET, "Key": key}, ExpiresIn=3600)
    return {"url": url, "expires_in": 3600}


# ── VIDEOS (user-uploaded, metadata in Mongo) ─────────────────────────────
def _video_url(key: str) -> str:
    # Already a full URL → return as-is (used for externally seeded videos)
    if key.startswith("http://") or key.startswith("https://"):
        return key
    if CLOUDFRONT_DOMAIN:
        return f"https://{CLOUDFRONT_DOMAIN}/{key}"
    return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}"


@app.post("/api/videos")
async def save_video(data: SaveVideoIn, user: dict = Depends(_user_from_header)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "uploader_name": user["name"],
        "title": data.title.strip(),
        "description": (data.description or "").strip(),
        "key": data.key,
        "url": _video_url(data.key),
        "thumbnail_url": _video_url(data.thumbnail_key) if data.thumbnail_key else None,
        "duration": data.duration or 0,
        "course_id": data.course_id,
        "chapter_id": data.chapter_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@app.get("/api/videos")
async def list_videos(user: dict = Depends(_user_from_header), course_id: Optional[str] = None, mine: bool = False):
    q: dict = {}
    if course_id: q["course_id"] = course_id
    if mine: q["user_id"] = user["id"]
    docs = await db.videos.find(q, {"_id": 0}).sort("createdAt", -1).to_list(200)
    return {"videos": docs}


@app.get("/api/videos/{video_id}")
async def get_video(video_id: str, user: dict = Depends(_user_from_header)):
    doc = await db.videos.find_one({"id": video_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Video not found")
    return doc


@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str, user: dict = Depends(_user_from_header)):
    doc = await db.videos.find_one({"id": video_id})
    if not doc:
        raise HTTPException(404, "Video not found")
    if doc["user_id"] != user["id"]:
        raise HTTPException(403, "Only uploader can delete")
    # Delete S3 object best-effort
    if s3_client:
        try: s3_client.delete_object(Bucket=S3_BUCKET, Key=doc["key"])
        except Exception: pass
    await db.videos.delete_one({"id": video_id})
    return {"ok": True}


# ── DOUBTS ────────────────────────────────────────────────────────────────
@app.post("/api/doubts")
async def ask_doubt(data: AskDoubtIn, user: dict = Depends(_user_from_header)):
    doubt = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "course_id": data.course_id,
        "chapter_id": data.chapter_id,
        "topic": data.topic,
        "question": data.question,
        "status": "pending",
        "replies": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.doubts.insert_one(doubt)
    _trigger_pusher(channel=f"course-{data.course_id}", event="new_doubt", data={"doubt_id": doubt["id"], "user": user["name"]})
    doubt.pop("_id", None)
    return doubt


@app.get("/api/doubts")
async def list_doubts(user: dict = Depends(_user_from_header)):
    role = user.get("role", "student")
    if role == "superadmin":
        q: dict = {}
    elif role in ("teacher", "assistant"):
        # Staff see doubts on their assigned courses
        q = {"course_id": {"$in": user.get("assigned_courses", [])}}
    else:
        q = {"user_id": user["id"]}
    docs = await db.doubts.find(q, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return {"doubts": docs}


@app.post("/api/doubts/{doubt_id}/reply")
async def reply_doubt(doubt_id: str, payload: dict, user: dict = Depends(_user_from_header)):
    content = (payload.get("content") or "").strip()
    image_url = (payload.get("image_url") or "").strip() or None
    if not content and not image_url:
        raise HTTPException(400, "content or image_url required")
    reply = {
        "by": user["name"],
        "by_id": user["id"],
        "by_role": user.get("role", "student"),
        "content": content,
        "image_url": image_url,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    # Status: still 'answered' if a staff member replied; if a student replies on their
    # own thread we mark it 'pending' again so the inbox surfaces it for follow-up.
    next_status = "answered" if user.get("role") in {"superadmin", "teacher", "assistant"} else "pending"
    r = await db.doubts.update_one(
        {"id": doubt_id},
        {"$push": {"replies": reply}, "$set": {"status": next_status, "updatedAt": reply["at"]}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Doubt not found")
    doubt = await db.doubts.find_one({"id": doubt_id}, {"_id": 0})
    _trigger_pusher(channel=f"user-{doubt['user_id']}", event="doubt_reply", data={"doubt_id": doubt_id})

    # Only push notify the student when staff reply.
    if next_status == "answered":
        target = await db.users.find_one({"id": doubt["user_id"]}, {"_id": 0, "expo_push_token": 1, "name": 1})
        tok = (target or {}).get("expo_push_token")
        body_preview = content[:160] if content else "📷 Image attached"
        if tok:
            await send_expo_push(
                [tok],
                title=f"{user['name']} replied to your doubt",
                body=body_preview,
                data={"type": "doubt_reply", "doubt_id": doubt_id},
            )
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": doubt["user_id"],
            "title": f"{user['name']} replied to your doubt",
            "body": body_preview,
            "event": "doubt_reply",
            "data": {"doubt_id": doubt_id},
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
    return doubt


# ── NOTIFICATIONS ──────────────────────────────────────────────────────────
# (GET /api/notifications is defined further below as a synthesized feed
#  pulling from orders + doubt replies + course updates.)


@app.post("/api/notifications/send")
async def send_notification(data: NotifyIn, user: dict = Depends(_user_from_header)):
    """Server-side trigger for push — in-app via Pusher Channels + OS push via Beams."""
    record = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "body": data.body,
        "event": data.event,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if data.user_ids:
        for uid in data.user_ids:
            rec = dict(record); rec["user_id"] = uid; rec["id"] = str(uuid.uuid4())
            await db.notifications.insert_one(rec)
            _trigger_pusher(channel=f"user-{uid}", event=data.event, data={"title": data.title, "body": data.body})
        # Expo push to those users
        u_docs = await db.users.find(
            {"id": {"$in": data.user_ids}, "expo_push_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "expo_push_token": 1},
        ).to_list(1000)
        await send_expo_push([u["expo_push_token"] for u in u_docs], data.title, data.body, {"event": data.event})
    elif data.channel:
        rec = dict(record); rec["user_id"] = "*"
        await db.notifications.insert_one(rec)
        _trigger_pusher(channel=data.channel, event=data.event, data={"title": data.title, "body": data.body})
        # Broadcast Expo push to ALL users with a token
        u_docs = await db.users.find(
            {"expo_push_token": {"$exists": True, "$ne": None}},
            {"_id": 0, "expo_push_token": 1},
        ).to_list(2000)
        await send_expo_push([u["expo_push_token"] for u in u_docs], data.title, data.body, {"event": data.event})

    # Legacy OS push via Beams (no-op when keys missing)
    _trigger_beams(interests=data.interests or [], title=data.title, body=data.body)
    return {"ok": True, "sent": True}


@app.post("/api/notifications/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(_user_from_header)):
    await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ── PUSHER helpers (graceful no-op when keys absent) ──────────────────────
def _trigger_pusher(channel: str, event: str, data: dict):
    if not pusher_client:
        return False
    try:
        pusher_client.trigger(channel, event, data)
        return True
    except Exception:
        return False


def _trigger_beams(interests: List[str], title: str, body: str):
    if not beams_client or not interests:
        return False
    try:
        beams_client.publish_to_interests(interests=interests, publish_body={
            "fcm": {"notification": {"title": title, "body": body}},
            "apns": {"aps": {"alert": {"title": title, "body": body}}},
        })
        return True
    except Exception:
        return False


# ── PROGRESS ──────────────────────────────────────────────────────────────
@app.post("/api/progress/complete-step")
async def complete_step(payload: dict, user: dict = Depends(_user_from_header)):
    step_id = payload.get("step_id"); course_id = payload.get("course_id")
    if not step_id:
        raise HTTPException(400, "step_id required")
    await db.progress.update_one(
        {"user_id": user["id"]},
        {"$addToSet": {"completedSteps": step_id}, "$set": {"last_course": course_id, "updatedAt": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 10}})
    return {"ok": True, "xp_gained": 10}


@app.get("/api/progress")
async def get_progress(user: dict = Depends(_user_from_header)):
    doc = await db.progress.find_one({"user_id": user["id"]}, {"_id": 0})
    return doc or {"user_id": user["id"], "completedSteps": [], "notes": []}


@app.post("/api/progress/note")
async def add_note(payload: dict, user: dict = Depends(_user_from_header)):
    note = {
        "id": str(uuid.uuid4()),
        "courseId": payload.get("courseId"),
        "chapterId": payload.get("chapterId"),
        "moduleId": payload.get("moduleId"),
        "stepId": payload.get("stepId"),
        "timestamp": payload.get("timestamp"),
        "content": payload.get("content", "").strip(),
        "type": payload.get("type", "typed"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if not note["content"]:
        raise HTTPException(400, "content required")
    await db.progress.update_one({"user_id": user["id"]}, {"$push": {"notes": note}}, upsert=True)
    return note


@app.patch("/api/progress/note/{note_id}")
async def update_note(note_id: str, payload: dict, user: dict = Depends(_user_from_header)):
    new_content = (payload.get("content") or "").strip()
    if not new_content:
        raise HTTPException(400, "content required")
    r = await db.progress.update_one(
        {"user_id": user["id"], "notes.id": note_id},
        {"$set": {"notes.$.content": new_content, "notes.$.updatedAt": datetime.now(timezone.utc).isoformat()}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


@app.delete("/api/progress/note/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(_user_from_header)):
    r = await db.progress.update_one(
        {"user_id": user["id"], "notes.id": note_id},
        {"$pull": {"notes": {"id": note_id}}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


# ── ORDERS (read user's payment history) ──────────────────────────────────
@app.get("/api/orders")
async def list_orders(user: dict = Depends(_user_from_header)):
    docs = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)
    # Attach course title for display
    course_ids = list({o.get("course_id") for o in docs if o.get("course_id")})
    courses = {c["id"]: c for c in await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0, "id": 1, "title": 1}).to_list(200)}
    for o in docs:
        c = courses.get(o.get("course_id"))
        if c:
            o["course_title"] = c.get("title")
    return {"orders": docs}


# ── ADDRESSES (per-user CRUD; embedded on user doc) ───────────────────────
class AddressIn(BaseModel):
    name: str
    line1: str
    line2: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    phone: Optional[str] = ""
    is_default: bool = False


@app.get("/api/addresses")
async def list_addresses(user: dict = Depends(_user_from_header)):
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "addresses": 1})
    return {"addresses": (fresh or {}).get("addresses", [])}


@app.post("/api/addresses")
async def add_address(data: AddressIn, user: dict = Depends(_user_from_header)):
    addr = {"id": str(uuid.uuid4()), **data.model_dump(), "createdAt": datetime.now(timezone.utc).isoformat()}
    if data.is_default:
        # Clear default flag on existing addresses (only if any exist)
        await db.users.update_one(
            {"id": user["id"], "addresses.0": {"$exists": True}},
            {"$set": {"addresses.$[].is_default": False}},
        )
    await db.users.update_one({"id": user["id"]}, {"$push": {"addresses": addr}})
    return addr


@app.patch("/api/addresses/{aid}")
async def update_address(aid: str, data: AddressIn, user: dict = Depends(_user_from_header)):
    payload = {f"addresses.$.{k}": v for k, v in data.model_dump(exclude_unset=True).items()}
    res = await db.users.update_one({"id": user["id"], "addresses.id": aid}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Address not found")
    return {"ok": True}


@app.delete("/api/addresses/{aid}")
async def delete_address(aid: str, user: dict = Depends(_user_from_header)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"addresses": {"id": aid}}})
    return {"ok": True}


# ── NOTIFICATIONS (synthesized from orders + doubt replies + course updates) ──
# We compose a lightweight feed on-the-fly so we don't need a separate DB collection.
# Sources:
#   • Successful orders (last 60 days)               → "Course unlocked"
#   • Doubt replies authored by staff (last 60 days) → "Mentor replied"
#   • Courses the user is enrolled in that were updated (last 30 days) → "Course updated"
@app.get("/api/notifications")
async def list_notifications(user: dict = Depends(_user_from_header)):
    items: list = []
    # Pull user fresh for enrolledCourses + read-state
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    enrolled = (fresh or {}).get("enrolledCourses", []) or []
    read_ids: set = set((fresh or {}).get("notif_read_ids", []) or [])
    dismissed_ids: set = set((fresh or {}).get("notif_dismissed_ids", []) or [])

    # 1. Orders → purchase confirmation
    orders = await db.orders.find({"user_id": user["id"], "status": {"$in": ["paid", "captured", "success"]}}, {"_id": 0}).sort("createdAt", -1).to_list(50)
    course_ids = list({o.get("course_id") for o in orders if o.get("course_id")})

    # 2. Doubts authored by user → look at staff replies
    doubts = await db.doubts.find({"user_id": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(50)
    for d in doubts:
        course_ids.append(d.get("course_id"))
    course_ids = list({c for c in course_ids if c})
    course_ids += [c for c in enrolled if c not in course_ids]
    courses_map = {c["id"]: c for c in await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0, "id": 1, "title": 1, "updatedAt": 1}).to_list(200)} if course_ids else {}

    for o in orders:
        c = courses_map.get(o.get("course_id"))
        nid = f"order_{o.get('id') or o.get('order_id') or o.get('createdAt','')}"
        if nid in dismissed_ids:
            continue
        items.append({
            "id": nid,
            "type": "order",
            "title": "Course unlocked",
            "body": f"Welcome to {c.get('title') if c else 'your new course'} — you can start learning right away.",
            "timestamp": o.get("createdAt"),
            "course_id": o.get("course_id"),
            "read": nid in read_ids,
        })

    for d in doubts:
        replies = d.get("replies", []) or []
        # Find latest non-student reply
        last_staff = None
        for r in reversed(replies):
            if r.get("by_role") and r.get("by_role") != "student":
                last_staff = r
                break
        if not last_staff:
            continue
        ts = last_staff.get("createdAt") or d.get("updatedAt") or d.get("createdAt")
        nid = f"doubt_{d.get('id')}_{ts}"
        if nid in dismissed_ids:
            continue
        c = courses_map.get(d.get("course_id"))
        preview = (last_staff.get("content") or ("Image attached" if last_staff.get("image_url") else "")).strip()[:140]
        items.append({
            "id": nid,
            "type": "doubt",
            "title": f"{last_staff.get('by') or 'Mentor'} replied to your doubt",
            "body": preview or f"New reply on your doubt about {c.get('title') if c else 'your course'}.",
            "timestamp": ts,
            "course_id": d.get("course_id"),
            "doubt_id": d.get("id"),
            "read": nid in read_ids,
        })

    # 3. Recently updated enrolled courses
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    for cid in enrolled:
        c = courses_map.get(cid)
        if not c:
            continue
        upd = c.get("updatedAt")
        if not upd:
            continue
        try:
            upd_dt = datetime.fromisoformat(upd.replace("Z", "+00:00"))
        except Exception:
            continue
        if upd_dt < cutoff:
            continue
        nid = f"course_upd_{cid}_{upd}"
        if nid in dismissed_ids:
            continue
        items.append({
            "id": nid,
            "type": "course",
            "title": "Course updated",
            "body": f"New content available in {c.get('title')}.",
            "timestamp": upd,
            "course_id": cid,
            "read": nid in read_ids,
        })

    # Sort newest-first
    items.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return {"notifications": items}


@app.post("/api/notifications/mark-read")
async def mark_notifications_read(payload: dict, user: dict = Depends(_user_from_header)):
    ids = payload.get("ids") or []
    if not isinstance(ids, list):
        raise HTTPException(400, "ids must be a list")
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"notif_read_ids": {"$each": [str(i) for i in ids]}}},
    )
    return {"ok": True}


@app.post("/api/notifications/dismiss")
async def dismiss_notification(payload: dict, user: dict = Depends(_user_from_header)):
    nid = str(payload.get("id") or "")
    if not nid:
        raise HTTPException(400, "id required")
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"notif_dismissed_ids": nid}},
    )
    return {"ok": True}


# ── TRANSCRIPT for a specific course step / item (supports both shapes) ──
@app.get("/api/courses/{course_id}/steps/{step_id}/transcript")
async def get_step_transcript(course_id: str, step_id: str):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(404, "Course not found")
    # Legacy shape: modules[].chapters[].steps[]
    for m in course.get("modules", []):
        for ch in m.get("chapters", []):
            for s in ch.get("steps", []):
                if s.get("id") == step_id:
                    return {"transcript": s.get("transcript", [])}
    # New admin shape: chapters[].modules[].items[] (transcript stored on the video item)
    for ch in course.get("chapters", []):
        for mod in ch.get("modules", []):
            for it in mod.get("items", []):
                if it.get("id") == step_id and it.get("type") == "video":
                    return {"transcript": it.get("transcript", []) or []}
    return {"transcript": []}


# Fallback 404 handler for debugging
@app.exception_handler(HTTPException)
async def http_exc_handler(request: Request, exc: HTTPException):
    return JSONResponse({"error": exc.detail, "status": exc.status_code}, status_code=exc.status_code)


# ─── Admin / RBAC routes (mounted last so all helpers exist) ──────────────
import admin_routes  # noqa: E402
admin_routes.init(db, _user_from_header, _hash)
app.include_router(admin_routes.router)

# ─── Cart & Coupon routes ────────────────────────────────────────────────
import cart_coupon_routes  # noqa: E402
cart_coupon_routes.init(db, _user_from_header)
app.include_router(cart_coupon_routes.router)


# ─── Admin Panel UI (static React build, mounted at /api/admin-ui) ────────
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.responses import FileResponse, RedirectResponse  # noqa: E402

ADMIN_DIR = os.path.join(os.path.dirname(__file__), "admin_static")
if os.path.isdir(ADMIN_DIR):
    # Serve hashed JS/CSS assets directly
    app.mount("/api/admin-ui/assets", StaticFiles(directory=os.path.join(ADMIN_DIR, "assets")), name="admin_assets")

    @app.get("/api/admin-ui")
    async def _admin_root():
        return RedirectResponse("/api/admin-ui/")

    @app.get("/api/admin-ui/favicon.svg")
    async def _admin_favicon():
        return FileResponse(os.path.join(ADMIN_DIR, "favicon.svg"))

    # SPA catch-all (anything not under /api/admin-ui/assets/...) → index.html
    @app.get("/api/admin-ui/{full_path:path}")
    async def _admin_spa(full_path: str):
        return FileResponse(os.path.join(ADMIN_DIR, "index.html"))


# ─── Hosted Razorpay checkout page (App Store-compliant external payment) ─
PAY_DIR = os.path.join(os.path.dirname(__file__), "pay_static")
if os.path.isdir(PAY_DIR):
    @app.get("/api/pay-ui")
    async def _pay_root():
        return RedirectResponse("/api/pay-ui/checkout")

    @app.get("/api/pay-ui/checkout")
    async def _pay_checkout():
        return FileResponse(os.path.join(PAY_DIR, "checkout.html"))
