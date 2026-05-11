"""CSninja admin / RBAC routes.

Roles:
    superadmin  → full access
    teacher     → manage assigned courses + reply to course doubts
    assistant   → granular `permissions[]` (e.g. ["doubt:read","doubt:reply"])
    accountant  → revenue + analytics read
    student     → default for app users (no admin access)

A user document carries:
    role: str
    permissions: List[str]           # extra granular grants (assistants)
    assigned_courses: List[str]      # course_ids visible/editable to teachers/assistants
    avatar: Optional[str]            # CloudFront URL for DP

Mounted at /api/admin/*
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── globals injected by server.py ─────────────────────────────────────────
db = None             # type: ignore[assignment]
_user_from_header = None  # type: ignore[assignment]
_hash = None          # type: ignore[assignment]


def init(database, user_dep, pw_hasher):
    global db, _user_from_header, _hash
    db = database
    _user_from_header = user_dep
    _hash = pw_hasher


# Pass-through dependency so FastAPI resolves the Header injection on the
# real `_user_from_header` set at startup time.
async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    return await _user_from_header(authorization)


# ── Auth guards ────────────────────────────────────────────────────────────
ADMIN_ROLES = {"superadmin", "teacher", "assistant", "accountant"}


async def require_role(required: List[str]):
    """Returns a dependency that asserts the current user has one of `required` roles."""
    async def _dep(user: dict = Depends(current_user)):
        role = user.get("role", "student")
        if role not in required:
            raise HTTPException(403, f"Role '{role}' not permitted (need one of {required})")
        return user
    return _dep


def role_dep(required: List[str]):
    async def _inner(user: dict = Depends(lambda *a, **k: _user_from_header(*a, **k))):
        role = user.get("role", "student")
        if role not in required:
            raise HTTPException(403, f"Role '{role}' not permitted")
        return user
    return _inner


def has_perm(user: dict, perm: str) -> bool:
    if user.get("role") == "superadmin":
        return True
    return perm in (user.get("permissions") or [])


def can_edit_course(user: dict, course_id: str) -> bool:
    role = user.get("role", "student")
    if role == "superadmin":
        return True
    if role in ("teacher", "assistant"):
        return course_id in (user.get("assigned_courses") or [])
    return False


# ── Schemas ────────────────────────────────────────────────────────────────
class CreateUserIn(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=6)
    role: Literal["superadmin", "teacher", "assistant", "accountant"]
    permissions: List[str] = []
    assigned_courses: List[str] = []
    phone: Optional[str] = None
    avatar: Optional[str] = None


class UpdateUserIn(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["superadmin", "teacher", "assistant", "accountant", "student"]] = None
    permissions: Optional[List[str]] = None
    assigned_courses: Optional[List[str]] = None
    is_active: Optional[bool] = None
    avatar: Optional[str] = None

class BookIn(BaseModel):
    title: str
    description: Optional[str] = ""
    included: bool = True

class CourseIn(BaseModel):
    title: str
    category: str
    price: int
    originalPrice: Optional[int] = None
    language: Optional[str] = "English"
    level: Optional[str] = "Beginner"
    description: Optional[str] = ""
    coverImage: Optional[str] = None
    thumbnail: Optional[str] = None
    demoUrl: Optional[str] = ""
    tags: List[str] = []
    highlights: List[str] = []
    books: List[BookIn] = [] 
    faculty_ids: List[str] = []
    teacher_ids: List[str] = []
    assistant_ids: List[str] = []
    structure: Optional[dict] = None
    duration: Optional[str] = ""
    durationDays: Optional[int] = 365

class CourseUpdate(CourseIn):
    title: Optional[str] = None  # type: ignore[assignment]
    category: Optional[str] = None  # type: ignore[assignment]
    price: Optional[int] = None  # type: ignore[assignment]


class ChapterIn(BaseModel):
    title: str
    description: Optional[str] = ""
    order: Optional[int] = None


class ModuleItemIn(BaseModel):
    type: Literal["video", "pdf", "doubt", "quiz", "link", "summary"]
    title: str
    # video
    video_id: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[int] = 0
    # transcript paired with the video (list of {sec:int, text:str, topic?:str})
    transcript: Optional[List[dict]] = None
    # pdf
    pdf_url: Optional[str] = None
    # optional answer-sheet for pdf assignments (uploaded later by admin)
    answer_sheet_url: Optional[str] = None
    answer_sheet_publish_at: Optional[str] = None  # ISO date string
    # link
    href: Optional[str] = None
    # quiz
    quiz_id: Optional[str] = None
    # summary (rich text body)
    content: Optional[str] = None
    # generic
    meta: Optional[dict] = None
    # explicit ordering inside a module (lower = first). Set automatically on save when missing.
    order: Optional[int] = None


class ModuleIn(BaseModel):
    title: str
    description: Optional[str] = ""
    order: Optional[int] = None
    items: List[ModuleItemIn] = []


class ReorderIn(BaseModel):
    ids: List[str]  # ordered list of ids in their new order


class FacultyIn(BaseModel):
    name: str
    subject: Optional[str] = ""
    bio: Optional[str] = ""
    avatar: Optional[str] = None
    rating: float = 4.8
    students: int = 0


class ExpertIn(BaseModel):
    name: str
    title: Optional[str] = ""
    bio: Optional[str] = ""
    avatar: Optional[str] = None
    expertise: List[str] = []


# ─────────────────────────────────────────────────────────────────────────
# USER MANAGEMENT (superadmin only, except teachers can create assistants)
# ─────────────────────────────────────────────────────────────────────────
@router.get("/users")
async def list_users(role: Optional[str] = None, user: dict = Depends(current_user)):
    if user.get("role") not in ("superadmin", "teacher"):
        raise HTTPException(403, "Forbidden")
    q: dict = {}
    if role:
        q["role"] = role
    if user.get("role") == "teacher":
        # teachers only see assistants assigned to their courses
        q["role"] = "assistant"
        q["assigned_courses"] = {"$in": user.get("assigned_courses", [])}
    users = await db.users.find(q, {"password": 0, "_id": 0}).to_list(500)
    return {"users": users}


@router.post("/users")
async def create_user(data: CreateUserIn, user: dict = Depends(current_user)):
    role = user.get("role")
    if role == "teacher" and data.role != "assistant":
        raise HTTPException(403, "Teachers can only create assistants")
    if role not in ("superadmin", "teacher"):
        raise HTTPException(403, "Forbidden")
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(409, "Email already in use")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "email": data.email.lower(),
        "phone": data.phone,
        "password": _hash(data.password),
        "role": data.role,
        "permissions": data.permissions,
        "assigned_courses": data.assigned_courses,
        "is_active": True,
        "avatar": data.avatar,
        "enrolledCourses": [],
        "xp": 0,
        "level": 1,
        "streak": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": user["id"],
    }
    await db.users.insert_one(doc)
    doc.pop("password", None)
    doc.pop("_id", None)
    return doc


@router.patch("/users/{uid}")
async def update_user(uid: str, data: UpdateUserIn, user: dict = Depends(current_user)):
    if user.get("role") not in ("superadmin", "teacher"):
        raise HTTPException(403, "Forbidden")
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    if user.get("role") == "teacher" and target.get("role") != "assistant":
        raise HTTPException(403, "Teachers can only edit assistants")
    payload = data.model_dump(exclude_unset=True)
    if user.get("role") != "superadmin":
        payload.pop("role", None)  # only superadmin can change role
    if payload:
        await db.users.update_one({"id": uid}, {"$set": payload})
    fresh = await db.users.find_one({"id": uid}, {"password": 0, "_id": 0})
    return fresh


@router.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Only superadmin can delete users")
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    res = await db.users.delete_one({"id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────
# COURSES → CHAPTERS → MODULES → ITEMS
# ─────────────────────────────────────────────────────────────────────────
@router.get("/courses")
async def admin_list_courses(user: dict = Depends(current_user)):
    role = user.get("role")
    q: dict = {}
    if role in ("teacher", "assistant"):
        q["id"] = {"$in": user.get("assigned_courses", [])}
    elif role not in ("superadmin", "accountant"):
        raise HTTPException(403, "Forbidden")
    courses = await db.courses.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return {"courses": courses}


@router.post("/courses")
async def admin_create_course(data: CourseIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Only superadmin can create courses")
    cid = f"course_{uuid.uuid4().hex[:8]}"
    last = await db.courses.find_one({}, sort=[("order", -1)])
    next_order = (last.get("order", 0) + 1) if last else 1
    data_dict = data.model_dump()
    if "books" in data_dict:
        data_dict["books"] = [b if isinstance(b, dict) else b for b in data_dict["books"]]
    doc = {
        "id": cid,
        "order": next_order,
        "chapters": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        **data_dict,
    }
    await db.courses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/courses/{cid}")
async def admin_update_course(cid: str, data: CourseUpdate, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(400, "No fields")
    if "books" in payload:
        payload["books"] = [b if isinstance(b, dict) else b.model_dump() for b in payload["books"]]
    res = await db.courses.update_one({"id": cid}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Course not found")
    fresh = await db.courses.find_one({"id": cid}, {"_id": 0})
    return fresh


@router.delete("/courses/{cid}")
async def admin_delete_course(cid: str, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Only superadmin can delete courses")
    res = await db.courses.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Course not found")
    return {"ok": True}


@router.post("/courses/reorder")
async def admin_reorder_courses(payload: ReorderIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    for i, cid in enumerate(payload.ids):
        await db.courses.update_one({"id": cid}, {"$set": {"order": i + 1}})
    return {"ok": True, "count": len(payload.ids)}


# ── chapters / modules / items live as embedded arrays on the course doc ──
def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# Re-derive the legacy `modules[]` shape after any structural write so the
# mobile app's LearningScreen keeps playing videos.
from legacy_sync import sync_to_legacy  # noqa: E402


async def _sync(cid: str) -> None:
    try:
        await sync_to_legacy(db, cid)
    except Exception as e:                # never block the write on sync failure
        print(f"[legacy_sync] failed for {cid}: {e}")


@router.post("/courses/{cid}/chapters")
async def add_chapter(cid: str, data: ChapterIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    course = await db.courses.find_one({"id": cid})
    if not course:
        raise HTTPException(404, "Course not found")
    chapters = course.get("chapters", [])
    order = data.order if data.order is not None else (len(chapters) + 1)
    chapter = {"id": _new_id("ch"), "title": data.title, "description": data.description or "", "order": order, "modules": []}
    await db.courses.update_one({"id": cid}, {"$push": {"chapters": chapter}})
    await _sync(cid)
    return chapter


@router.patch("/courses/{cid}/chapters/{ch_id}")
async def update_chapter(cid: str, ch_id: str, data: ChapterIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    payload = {f"chapters.$.{k}": v for k, v in data.model_dump(exclude_unset=True).items()}
    res = await db.courses.update_one({"id": cid, "chapters.id": ch_id}, {"$set": payload})
    if res.matched_count == 0:
        raise HTTPException(404, "Chapter not found")
    await _sync(cid)
    return {"ok": True}


@router.delete("/courses/{cid}/chapters/{ch_id}")
async def delete_chapter(cid: str, ch_id: str, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    await db.courses.update_one({"id": cid}, {"$pull": {"chapters": {"id": ch_id}}})
    await _sync(cid)
    return {"ok": True}


@router.post("/courses/{cid}/chapters/reorder")
async def reorder_chapters(cid: str, payload: ReorderIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    course = await db.courses.find_one({"id": cid})
    if not course:
        raise HTTPException(404, "Course not found")
    by_id = {ch["id"]: ch for ch in course.get("chapters", [])}
    new_chapters = []
    for i, chid in enumerate(payload.ids):
        ch = by_id.get(chid)
        if ch:
            ch["order"] = i + 1
            new_chapters.append(ch)
    await db.courses.update_one({"id": cid}, {"$set": {"chapters": new_chapters}})
    await _sync(cid)
    return {"ok": True}


@router.post("/courses/{cid}/chapters/{ch_id}/modules")
async def add_module(cid: str, ch_id: str, data: ModuleIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    course = await db.courses.find_one({"id": cid, "chapters.id": ch_id})
    if not course:
        raise HTTPException(404, "Course/chapter not found")
    chapter = next((c for c in course.get("chapters", []) if c["id"] == ch_id), None)
    modules = chapter.get("modules", []) if chapter else []
    order = data.order if data.order is not None else (len(modules) + 1)
    items_with_id = [{"id": _new_id("itm"), **i.model_dump()} for i in data.items]
    module = {
        "id": _new_id("mod"),
        "title": data.title,
        "description": data.description or "",
        "order": order,
        "items": items_with_id,
    }
    await db.courses.update_one(
        {"id": cid, "chapters.id": ch_id},
        {"$push": {"chapters.$.modules": module}},
    )
    await _sync(cid)
    return module


@router.patch("/courses/{cid}/chapters/{ch_id}/modules/{mod_id}")
async def update_module(cid: str, ch_id: str, mod_id: str, data: ModuleIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    payload = data.model_dump(exclude_unset=True)
    set_doc = {}
    for k, v in payload.items():
        if k == "items":
            v = [{"id": i.get("id") or _new_id("itm"), **{x: y for x, y in i.items() if x != "id"}} for i in v]
        set_doc[f"chapters.$[c].modules.$[m].{k}"] = v
    if not set_doc:
        return {"ok": True}
    res = await db.courses.update_one(
        {"id": cid},
        {"$set": set_doc},
        array_filters=[{"c.id": ch_id}, {"m.id": mod_id}],
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Module not found")
    await _sync(cid)
    return {"ok": True}


@router.delete("/courses/{cid}/chapters/{ch_id}/modules/{mod_id}")
async def delete_module(cid: str, ch_id: str, mod_id: str, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    await db.courses.update_one(
        {"id": cid, "chapters.id": ch_id},
        {"$pull": {"chapters.$.modules": {"id": mod_id}}},
    )
    await _sync(cid)
    return {"ok": True}


@router.post("/courses/{cid}/chapters/{ch_id}/modules/reorder")
async def reorder_modules(cid: str, ch_id: str, payload: ReorderIn, user: dict = Depends(current_user)):
    if not can_edit_course(user, cid):
        raise HTTPException(403, "Forbidden")
    course = await db.courses.find_one({"id": cid})
    if not course:
        raise HTTPException(404, "Not found")
    chapter = next((c for c in course.get("chapters", []) if c["id"] == ch_id), None)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    by_id = {m["id"]: m for m in chapter.get("modules", [])}
    new_mods = []
    for i, mid in enumerate(payload.ids):
        m = by_id.get(mid)
        if m:
            m["order"] = i + 1
            new_mods.append(m)
    await db.courses.update_one(
        {"id": cid, "chapters.id": ch_id},
        {"$set": {"chapters.$.modules": new_mods}},
    )
    await _sync(cid)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────
# FACULTY & EXPERTS
# ─────────────────────────────────────────────────────────────────────────
@router.get("/faculties")
async def list_faculties(user: dict = Depends(current_user)):
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "Forbidden")
    docs = await db.faculties.find({}, {"_id": 0}).to_list(500)
    return {"faculties": docs}


@router.post("/faculties")
async def create_faculty(data: FacultyIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    doc = {"id": _new_id("fac"), **data.model_dump(), "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.faculties.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/faculties/{fid}")
async def update_faculty(fid: str, data: FacultyIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    res = await db.faculties.update_one({"id": fid}, {"$set": data.model_dump(exclude_unset=True)})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    fresh = await db.faculties.find_one({"id": fid}, {"_id": 0})
    return fresh


@router.delete("/faculties/{fid}")
async def delete_faculty(fid: str, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    await db.faculties.delete_one({"id": fid})
    return {"ok": True}


@router.get("/experts")
async def list_experts(user: dict = Depends(current_user)):
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "Forbidden")
    docs = await db.experts.find({}, {"_id": 0}).to_list(500)
    return {"experts": docs}


@router.post("/experts")
async def create_expert(data: ExpertIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    doc = {"id": _new_id("exp"), **data.model_dump(), "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.experts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/experts/{eid}")
async def update_expert(eid: str, data: ExpertIn, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    await db.experts.update_one({"id": eid}, {"$set": data.model_dump(exclude_unset=True)})
    return await db.experts.find_one({"id": eid}, {"_id": 0})


@router.delete("/experts/{eid}")
async def delete_expert(eid: str, user: dict = Depends(current_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(403, "Forbidden")
    await db.experts.delete_one({"id": eid})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────
# ANALYTICS / REVENUE (accountant + superadmin)
# ─────────────────────────────────────────────────────────────────────────
@router.get("/analytics/summary")
async def analytics_summary(user: dict = Depends(current_user)):
    if user.get("role") not in ("superadmin", "accountant"):
        raise HTTPException(403, "Forbidden")
    total_users = await db.users.count_documents({})
    total_students = await db.users.count_documents({"role": {"$in": [None, "student"]}})
    total_courses = await db.courses.count_documents({})
    paid_orders = await db.orders.count_documents({"status": "paid"})
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    rev = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = (rev[0]["total"] if rev else 0)
    return {
        "totals": {
            "users": total_users,
            "students": total_students,
            "courses": total_courses,
            "paid_orders": paid_orders,
            "revenue_inr": total_revenue,
        },
    }


@router.get("/analytics/revenue")
async def analytics_revenue(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(current_user),
):
    if user.get("role") not in ("superadmin", "accountant"):
        raise HTTPException(403, "Forbidden")
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {
            "_id": {"$substr": ["$paidAt", 0, 10]},
            "amount": {"$sum": "$amount"},
            "orders": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
        {"$limit": days},
    ]
    rows = await db.orders.aggregate(pipeline).to_list(days)
    return {"days": [{"date": r["_id"], "amount": r["amount"], "orders": r["orders"]} for r in rows]}


@router.get("/analytics/top-courses")
async def analytics_top_courses(user: dict = Depends(current_user)):
    if user.get("role") not in ("superadmin", "accountant"):
        raise HTTPException(403, "Forbidden")
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": "$course_id", "amount": {"$sum": "$amount"}, "orders": {"$sum": 1}}},
        {"$sort": {"amount": -1}},
        {"$limit": 10},
    ]
    rows = await db.orders.aggregate(pipeline).to_list(10)
    return {"top_courses": [{"course_id": r["_id"], "amount": r["amount"], "orders": r["orders"]} for r in rows]}
