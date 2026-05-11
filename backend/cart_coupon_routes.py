"""CSninja — Cart & Coupon endpoints.

Cart is stored as `cart_items: [course_id]` on the user doc.
Coupons live in `coupons` collection with usage tracking.

Mounted under /api/cart/* and /api/coupons/*  (regular auth)
plus /api/admin/coupons/* (superadmin).
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(tags=["cart-coupons"])

db = None
_user_from_header = None


def init(database, user_dep):
    global db, _user_from_header
    db = database
    _user_from_header = user_dep


# Pass-through dep so FastAPI resolves Header correctly
from fastapi import Header
async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    return await _user_from_header(authorization)


# ───────────────────────── Schemas ─────────────────────────
class CartItemIn(BaseModel):
    course_id: str


class CouponIn(BaseModel):
    code: str = Field(..., min_length=2)
    description: Optional[str] = ""
    discount_pct: int = Field(..., ge=1, le=100)
    max_redemptions: Optional[int] = None  # None = unlimited
    expiry: Optional[str] = None           # ISO date
    applicable_courses: List[str] = []     # empty = all
    min_amount: int = 0
    is_active: bool = True


class CouponValidateIn(BaseModel):
    code: str
    course_id: str


# ───────────────────────── Cart ─────────────────────────
@router.get("/api/cart")
async def get_cart(user: dict = Depends(current_user)):
    cart_ids = user.get("cart_items", [])
    courses = await db.courses.find(
        {"id": {"$in": cart_ids}},
        {"_id": 0, "id": 1, "title": 1, "subtitle": 1, "category": 1, "price": 1,
         "originalPrice": 1, "thumbnail": 1, "duration": 1, "level": 1,
         "language": 1, "rating": 1, "students": 1},
    ).to_list(50)
    # Preserve order
    by_id = {c["id"]: c for c in courses}
    items = [by_id[cid] for cid in cart_ids if cid in by_id]
    return {"items": items, "count": len(items)}


@router.post("/api/cart")
async def add_to_cart(data: CartItemIn, user: dict = Depends(current_user)):
    course = await db.courses.find_one({"id": data.course_id}, {"_id": 0, "id": 1})
    if not course:
        raise HTTPException(404, "Course not found")
    # Block adding already-enrolled
    if data.course_id in (user.get("enrolledCourses") or []):
        raise HTTPException(400, "You are already enrolled in this course")
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"cart_items": data.course_id}},
    )
    return await get_cart(await db.users.find_one({"id": user["id"]}))


@router.delete("/api/cart/{course_id}")
async def remove_from_cart(course_id: str, user: dict = Depends(current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"cart_items": course_id}},
    )
    return await get_cart(await db.users.find_one({"id": user["id"]}))


@router.delete("/api/cart")
async def clear_cart(user: dict = Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"cart_items": []}})
    return {"items": [], "count": 0}


# ───────────────────────── Coupons (public validate) ─────────────────────────
@router.post("/api/coupons/validate")
async def validate_coupon(data: CouponValidateIn, user: dict = Depends(current_user)):
    code = data.code.strip().upper()
    coupon = await db.coupons.find_one({"code": code})
    if not coupon:
        raise HTTPException(404, "Invalid coupon code")
    if not coupon.get("is_active", True):
        raise HTTPException(400, "Coupon is no longer active")

    # Expiry
    if coupon.get("expiry"):
        try:
            exp = datetime.fromisoformat(coupon["expiry"]).replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(400, "Coupon has expired")
        except ValueError:
            pass

    # Applicable courses (empty = all)
    applicable = coupon.get("applicable_courses") or []
    if applicable and data.course_id not in applicable:
        raise HTTPException(400, "Coupon doesn't apply to this course")

    # Max redemptions
    if coupon.get("max_redemptions") is not None:
        used = coupon.get("used_count", 0)
        if used >= coupon["max_redemptions"]:
            raise HTTPException(400, "Coupon usage limit reached")

    # Min amount check
    course = await db.courses.find_one({"id": data.course_id}, {"_id": 0, "price": 1})
    if course and coupon.get("min_amount", 0):
        if course["price"] < coupon["min_amount"]:
            raise HTTPException(400, f"Minimum order ₹{coupon['min_amount']} required")

    return {
        "code": coupon["code"],
        "description": coupon.get("description", ""),
        "discount_pct": coupon["discount_pct"],
        "valid": True,
    }


# ───────────────────────── Admin Coupon CRUD ─────────────────────────
@router.get("/api/admin/coupons")
async def list_coupons(user: dict = Depends(current_user)):
    if user.get("role") not in ("superadmin", "accountant"):
        raise HTTPException(403, "Forbidden")
    docs = await db.coupons.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return {"coupons": docs}


@router.post("/api/admin/coupons")
async def create_coupon(data: CouponIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    code = data.code.strip().upper()
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(409, "Coupon code already exists")
    doc = {
        "id": f"cpn_{uuid.uuid4().hex[:8]}",
        "code": code,
        "used_count": 0,
        "createdBy": user["id"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        **data.model_dump(),
    }
    doc["code"] = code
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/api/admin/coupons/{cid}")
async def update_coupon(cid: str, data: CouponIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    payload = data.model_dump(exclude_unset=True)
    if "code" in payload:
        payload["code"] = payload["code"].strip().upper()
    res = await db.coupons.update_one({"id": cid}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Coupon not found")
    return await db.coupons.find_one({"id": cid}, {"_id": 0})


@router.delete("/api/admin/coupons/{cid}")
async def delete_coupon(cid: str, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}
