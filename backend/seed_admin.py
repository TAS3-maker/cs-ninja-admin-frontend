"""Seed CSninja superadmin + sample teacher/assistant/accountant.

Idempotent. Safe to re-run.

Usage: cd /app/backend && python seed_admin.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "csninja")

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _user(email: str, name: str, password: str, role: str, *, permissions=None, courses=None):
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email.lower(),
        "phone": None,
        "password": pwd_ctx.hash(password),
        "role": role,
        "permissions": permissions or [],
        "assigned_courses": courses or [],
        "is_active": True,
        "avatar": None,
        "enrolledCourses": [],
        "xp": 0,
        "level": 1,
        "streak": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


SEED = [
    _user("superadmin@csninja.in", "CSninja Superadmin", "Admin@1234", "superadmin"),
    _user("teacher@csninja.in", "Adv. Mohit Dhiman", "Teacher@1234", "teacher",
          courses=["course_001", "course_002"]),
    _user("assistant@csninja.in", "Doubt Solver — Riya", "Assist@1234", "assistant",
          permissions=["doubt:read", "doubt:reply", "course:read"],
          courses=["course_001"]),
    _user("accounts@csninja.in", "Finance Team", "Acct@1234", "accountant"),
]


async def main():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    inserted, updated = 0, 0
    for u in SEED:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            # Force role + permissions to seed values; keep original id + password if same role
            await db.users.update_one(
                {"email": u["email"]},
                {"$set": {
                    "role": u["role"],
                    "permissions": u["permissions"],
                    "assigned_courses": u["assigned_courses"],
                    "is_active": True,
                    "name": u["name"],
                    "password": u["password"],  # reset pw to known seed
                }},
            )
            updated += 1
        else:
            await db.users.insert_one(u)
            inserted += 1
    print(f"Seed admin done — inserted: {inserted}, updated: {updated}")
    print("Credentials:")
    print("  superadmin@csninja.in / Admin@1234")
    print("  teacher@csninja.in    / Teacher@1234")
    print("  assistant@csninja.in  / Assist@1234")
    print("  accounts@csninja.in   / Acct@1234")


if __name__ == "__main__":
    asyncio.run(main())
