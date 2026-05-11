"""
One-time migration: convert legacy seeded courses
   modules[]      → chapters[]
   modules.chapters[] → chapters.modules[]
   modules.chapters.steps[] (videos) → chapters.modules.items[]   (type='video' with transcript)

After this script:
  • Admin panel can fully edit every course.
  • Legacy `modules[]` is regenerated automatically by `legacy_sync.sync_to_legacy()`
    on every admin save so the mobile app keeps working.

Idempotent: re-running won't duplicate chapters; it only fills `chapters` if
empty, OR (with --force) it rebuilds from `modules[]` again.

Run:
    cd /app/backend && python migrate_legacy_courses.py [--force]
"""
import asyncio
import os
import sys
import uuid
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def legacy_to_new(course: dict) -> list:
    """Build chapters[] from modules[].chapters[].steps[].

    Mapping
    -------
    paper          → chapter
    paper.chapter  → chapter.module
    paper.step     → module.items[] (single video item w/ transcript)
    """
    chapters: list = []
    for p_idx, paper in enumerate(course.get("modules", []) or []):
        new_chapter = {
            "id": paper.get("id") or _new_id("ch"),
            "title": paper.get("title", f"Paper {p_idx + 1}"),
            "description": paper.get("description", ""),
            "order": paper.get("order", p_idx + 1),
            "modules": [],
        }
        for c_idx, ch in enumerate(paper.get("chapters", []) or []):
            new_module = {
                "id": ch.get("id") or _new_id("mod"),
                "title": ch.get("title", f"Module {c_idx + 1}"),
                "description": ch.get("description", ""),
                "order": ch.get("order", c_idx + 1),
                "items": [],
            }
            for s_idx, step in enumerate(ch.get("steps", []) or []):
                item = {
                    "id": step.get("id") or _new_id("itm"),
                    "type": "video",
                    "title": step.get("title", f"Lesson {s_idx + 1}"),
                    "video_url": step.get("video_url") or step.get("videoUrl") or "",
                    "duration": step.get("duration", 0),
                    "transcript": step.get("transcript") or [],
                    "order": s_idx + 1,
                }
                new_module["items"].append(item)
            new_chapter["modules"].append(new_module)
        chapters.append(new_chapter)
    return chapters


async def main():
    force = "--force" in sys.argv
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "csninja")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    cursor = db.courses.find({})
    migrated = 0
    skipped = 0
    async for course in cursor:
        cid = course.get("id")
        has_legacy = bool(course.get("modules"))
        has_new = bool(course.get("chapters"))
        if has_new and not force:
            print(f"⏭  {cid:14}  already has chapters[] (use --force to rebuild)")
            skipped += 1
            continue
        if not has_legacy:
            print(f"⏭  {cid:14}  no modules[] to migrate (new course)")
            skipped += 1
            continue
        new_chapters = legacy_to_new(course)
        await db.courses.update_one(
            {"id": cid},
            {"$set": {"chapters": new_chapters}},
        )
        print(f"✅ {cid:14}  → {len(new_chapters)} chapters, "
              f"{sum(len(c['modules']) for c in new_chapters)} modules, "
              f"{sum(len(m['items']) for c in new_chapters for m in c['modules'])} items")
        migrated += 1

    print()
    print(f"Migration complete — {migrated} migrated, {skipped} skipped.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
