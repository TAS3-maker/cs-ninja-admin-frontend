"""
Keep `course.modules[]` (legacy mobile shape) in sync with `course.chapters[]`
(new admin shape) so the mobile app's LearningScreen keeps working after
admin edits.

Reverse mapping
---------------
chapters[]      → modules[]              (1 chapter = 1 paper)
chapter.modules[] → paper.chapters[]     (1 module = 1 chapter)
module.items[]    → chapter.steps[]      (ALL item types are surfaced;
                                          mobile UI dispatches by `type`)
"""
from typing import Optional


def chapters_to_legacy(chapters: list) -> list:
    """Build legacy `modules[].chapters[].steps[]` from new `chapters[].modules[].items[]`.

    Every item is surfaced as a step (preserving admin order). The `type`
    field is included so the mobile player can render PDF / doubt / summary /
    link / quiz alongside videos.
    """
    legacy_papers: list = []
    for c_idx, ch in enumerate(chapters or []):
        paper = {
            "id": ch.get("id"),
            "title": ch.get("title", f"Paper {c_idx + 1}"),
            "description": ch.get("description", ""),
            "order": ch.get("order", c_idx + 1),
            "chapters": [],
        }
        for m_idx, mod in enumerate(ch.get("modules", []) or []):
            legacy_chapter = {
                "id": mod.get("id"),
                "title": mod.get("title", f"Module {m_idx + 1}"),
                "description": mod.get("description", ""),
                "order": mod.get("order", m_idx + 1),
                "duration": mod.get("duration", ""),
                "steps": [],
            }
            for it_idx, it in enumerate(mod.get("items", []) or []):
                t = (it.get("type") or "").lower()
                step: dict = {
                    "id": it.get("id"),
                    "type": t or "video",
                    "title": it.get("title", f"Lesson {it_idx + 1}"),
                    "duration": it.get("duration", 0),
                }
                if t == "video":
                    step["video_url"] = it.get("video_url", "") or ""
                    step["transcript"] = it.get("transcript") or []
                elif t == "pdf":
                    step["pdf_url"] = it.get("pdf_url", "") or ""
                    if it.get("answer_sheet_url"):
                        step["answer_sheet_url"] = it.get("answer_sheet_url")
                    if it.get("answer_sheet_publish_at"):
                        step["answer_sheet_publish_at"] = it.get("answer_sheet_publish_at")
                elif t == "link":
                    step["href"] = it.get("href", "") or ""
                elif t == "summary":
                    step["body"] = it.get("body", "") or ""
                # doubt / quiz: no extra fields needed; mobile renders the in-built tab
                legacy_chapter["steps"].append(step)
            paper["chapters"].append(legacy_chapter)
        legacy_papers.append(paper)
    return legacy_papers


async def sync_to_legacy(db, course_id: str) -> Optional[dict]:
    """Re-derive `modules[]` from current `chapters[]` for a course and persist it.

    Call this after every admin write that changes course structure.
    Returns the new modules[] (or None if course not found).
    """
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        return None
    chapters = course.get("chapters") or []
    legacy_modules = chapters_to_legacy(chapters)
    await db.courses.update_one(
        {"id": course_id},
        {"$set": {"modules": legacy_modules}},
    )
    return legacy_modules
