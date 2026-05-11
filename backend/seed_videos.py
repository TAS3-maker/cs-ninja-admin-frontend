"""Seed CSninja MongoDB with sample course videos.

Usage:
    cd /app/backend && python seed_videos.py

Inserts a handful of videos pointing to public cloud video URLs so the
LearningScreen has real content to play even before any S3 upload.
Idempotent — re-running will not create duplicates (matched by `key`).
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "csninja")

# Public sample videos that are still anonymously accessible (verified 2026).
SAMPLE_VIDEOS = [
    {
        "title": "Business Communication — Formal Letters",
        "description": "Introduction to formal business letters, structure and tone.",
        "url": "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
        "thumbnail_url": "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg",
        "duration": 596,
        "course_id": "course_001",
        "chapter_id": "ch_1",
    },
    {
        "title": "Types of Communication — Live Class",
        "description": "Formal vs informal communication, channels, the 7 Cs.",
        "url": "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
        "thumbnail_url": "",
        "duration": 10,
        "course_id": "course_001",
        "chapter_id": "ch_2",
    },
    {
        "title": "Tax Laws — GST Basics",
        "description": "Foundational concepts of Goods and Services Tax.",
        "url": "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4",
        "thumbnail_url": "",
        "duration": 10,
        "course_id": "course_002",
        "chapter_id": "ch_1",
    },
    {
        "title": "Corporate Law — Share Capital",
        "description": "Concepts of share capital, types of shares, and key provisions.",
        "url": "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4",
        "thumbnail_url": "",
        "duration": 10,
        "course_id": "course_003",
        "chapter_id": "ch_1",
    },
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    inserted, skipped = 0, 0
    for v in SAMPLE_VIDEOS:
        existing = await db.videos.find_one({"url": v["url"]})
        if existing:
            skipped += 1
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": "system",
            "uploader_name": "CSninja",
            "key": v["url"],          # for external videos, key == url
            "createdAt": datetime.now(timezone.utc).isoformat(),
            **v,
        }
        await db.videos.insert_one(doc)
        inserted += 1

    print(f"Seed complete — inserted: {inserted}, skipped (already exists): {skipped}")
    print(f"Total videos in DB: {await db.videos.count_documents({})}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
