"""Seed CSninja with realistic catalog data — wipes legacy/mock courses
and inserts a rich tree using the SAME shape the mobile UI expects
(modules → chapters → steps), plus faculty + experts.

Idempotent: re-running clears system-seeded courses and re-inserts.

Usage:
    cd /app/backend && python seed_all.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "csninja")

# Public, anonymously-accessible mp4s — verified 200 video/mp4
V = {
    "bbb": "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    "bbb_short": "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
    "sintel": "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4",
    "jelly":  "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4",
    "elephant": "https://test-videos.co.uk/vids/elephantsdream/mp4/h264/720/ElephantsDream_720_10s_1MB.mp4",
}

THUMB = lambda seed: f"https://picsum.photos/seed/{seed}/400/220"


def step(title, video=None, duration="12 min", kind="video", completed=False, locked=False, transcript=None):
    return {
        "id": f"step_{uuid.uuid4().hex[:8]}",
        "title": title,
        "duration": duration,
        "type": kind,        # video | pdf | quiz | doubt
        "completed": completed,
        "isLocked": locked,
        "video_url": video,  # if type=video
        "transcript": transcript or [],
    }


# Reusable transcript blocks
TRANSCRIPT_INTRO = [
    {"sec": 0,   "topic": "Introduction",     "text": "Welcome — in this lesson we'll cover the foundational concepts you need to master before exam day."},
    {"sec": 18,  "topic": "Introduction",     "text": "We'll go step-by-step from definitions to real-world applications, with examples drawn from past exam papers."},
    {"sec": 42,  "topic": "Definitions",      "text": "Let's start with the core definitions — these terms appear repeatedly in CSEET, Executive and Professional papers."},
    {"sec": 70,  "topic": "Definitions",      "text": "Pay special attention to terms marked in bold; the examiner often tests these directly."},
    {"sec": 105, "topic": "Examples",         "text": "Now let's apply this with a worked example — note how each step maps back to the definition we just covered."},
    {"sec": 145, "topic": "Examples",         "text": "Notice the structure of the answer; this is the format you'll want to mimic in your own exam responses."},
    {"sec": 195, "topic": "Common Mistakes",  "text": "Here are the three most common mistakes students make on this topic. Avoid these and you'll already score above average."},
    {"sec": 245, "topic": "Practice",         "text": "Pause the video and try the practice question on screen. Return when you're ready to compare your answer."},
    {"sec": 305, "topic": "Practice",         "text": "Solution walkthrough — observe how I structured each line of working. Marks are awarded for steps, not just final answers."},
    {"sec": 380, "topic": "Recap",            "text": "Quick recap of the key takeaways before we move on to the next chapter."},
    {"sec": 430, "topic": "Recap",            "text": "Make sure you've added these points to your revision notes — we'll build on them in the next session."},
]
TRANSCRIPT_GST = [
    {"sec": 0,   "topic": "GST Foundations",   "text": "GST is a destination-based tax on consumption of goods and services. Let's break down what that means in practice."},
    {"sec": 25,  "topic": "GST Foundations",   "text": "There are three components: CGST, SGST and IGST — each applicable in different transaction scenarios."},
    {"sec": 60,  "topic": "Rates & Slabs",     "text": "Standard rates are 5%, 12%, 18% and 28%. Some items are zero-rated or exempt."},
    {"sec": 110, "topic": "Rates & Slabs",     "text": "Knowing which slab applies to a given supply is a frequent exam question — memorise the major examples."},
    {"sec": 165, "topic": "Input Tax Credit",  "text": "Input Tax Credit lets a registered person reduce their output tax liability by the GST already paid on inputs."},
    {"sec": 220, "topic": "Input Tax Credit",  "text": "Conditions: tax invoice received, goods/services received, supplier paid the tax, and return filed."},
    {"sec": 280, "topic": "Returns Cycle",     "text": "GSTR-1 is filed monthly for outward supplies; GSTR-3B is the summary return."},
    {"sec": 340, "topic": "Returns Cycle",     "text": "Late filing attracts interest at 18% per annum and a late fee — these are common MCQ traps."},
]


def chapter(num, title, duration, steps, locked=False):
    return {
        "id": f"ch_{uuid.uuid4().hex[:8]}",
        "number": num,
        "title": title,
        "duration": duration,
        "isLocked": locked,
        "steps": steps,
    }


def module(num, title, description, chapters):
    return {
        "id": f"mod_{uuid.uuid4().hex[:8]}",
        "number": num,
        "title": title,
        "description": description,
        "chapters": chapters,
    }


# ─── COURSES ──────────────────────────────────────────────────────────────
def cseet_course():
    return {
        "id": "course_001",
        "system": True,
        "order": 1,
        "title": "CSEET Complete Preparation 2026",
        "subtitle": "Crack CSEET in your first attempt",
        "category": "cseet",
        "faculty": {"id": "fac_rm", "name": "CA Rohit Mehta", "subject": "Company Law", "rating": 4.9, "students": 12400, "avatar": None},
        "price": 4999,
        "originalPrice": 9999,
        "rating": 4.9,
        "reviewCount": 2847,
        "students": 15200,
        "duration": "120 hours",
        "language": "Hindi + English",
        "level": "Beginner",
        "isBestseller": True,
        "isTrending": True,
        "thumbnail": THUMB("cseet1"),
        "tags": ["CSEET", "Company Law", "Economics", "Communication"],
        "startDate": (datetime.now() - timedelta(days=20)).date().isoformat(),
        "expiryDate": (datetime.now() + timedelta(days=345)).date().isoformat(),
        "description": "The most comprehensive CSEET preparation course covering all 4 papers with HD video lectures, practice tests, and full mock exams. Includes live doubt sessions, PDF notes, and 24/7 mentor support.",
        "highlights": [
            "200+ HD Video Lectures",
            "50+ Chapter Tests",
            "10 Full Mock Exams",
            "Live Doubt Sessions",
            "PDF Notes Included",
            "24/7 Mentor Chat",
        ],
        "modules": [
            module(1, "Paper 1: Business Communication", "Master written and verbal business communication", [
                chapter(1, "Formal Letters & Memos", "1h 8m", [
                    step("Introduction to Formal Letters", V["bbb"], "12 min", completed=True, transcript=TRANSCRIPT_INTRO),
                    step("Letter Structure & Tone", V["bbb_short"], "10 min", completed=True, transcript=TRANSCRIPT_INTRO),
                    step("Memo Writing Best Practices", V["sintel"], "14 min", transcript=TRANSCRIPT_INTRO),
                    step("Practice Quiz", duration="10 min", kind="quiz"),
                ]),
                chapter(2, "Email Communication", "55 min", [
                    step("Email Etiquette", V["jelly"], "11 min"),
                    step("Subject Lines That Work", V["bbb"], "9 min"),
                    step("Notes PDF", duration="—", kind="pdf"),
                ]),
                chapter(3, "Verbal & Non-verbal", "45 min", [
                    step("Body Language Basics", V["sintel"], "13 min"),
                    step("Voice & Tone", V["bbb"], "10 min"),
                ], locked=False),
            ]),
            module(2, "Paper 2: Legal Aptitude", "Foundations of legal reasoning", [
                chapter(1, "Indian Constitution", "1h 30m", [
                    step("Preamble Explained", V["elephant"], "15 min"),
                    step("Fundamental Rights", V["bbb"], "20 min"),
                    step("DPSPs & Duties", V["sintel"], "18 min"),
                ]),
                chapter(2, "Contract Act 1872", "1h 12m", [
                    step("Offer & Acceptance", V["jelly"], "14 min"),
                    step("Consideration", V["bbb_short"], "12 min", locked=True),
                ], locked=False),
            ]),
            module(3, "Paper 3: Economic & Business Environment", "Macro & micro fundamentals", [
                chapter(1, "Indian Economy", "1h 40m", [
                    step("GDP & GVA", V["bbb"], "18 min"),
                    step("Fiscal vs Monetary Policy", V["sintel"], "22 min"),
                ]),
            ]),
            module(4, "Paper 4: Current Affairs", "Stay updated", [
                chapter(1, "May 2026 Roundup", "55 min", [
                    step("Top Headlines", V["jelly"], "20 min"),
                    step("Quiz", duration="10 min", kind="quiz"),
                ]),
            ]),
        ],
    }


def executive_course():
    return {
        "id": "course_002",
        "system": True,
        "order": 2,
        "title": "CS Executive — Module 1 (New Syllabus)",
        "subtitle": "Tax Laws + Company Law + Setting up of Business",
        "category": "executive",
        "faculty": {"id": "fac_pn", "name": "CS Priya Nair", "subject": "SEBI & Compliance", "rating": 4.8, "students": 9800, "avatar": None},
        "price": 7499,
        "originalPrice": 12999,
        "rating": 4.8,
        "reviewCount": 1432,
        "students": 8740,
        "duration": "180 hours",
        "language": "English",
        "level": "Intermediate",
        "isBestseller": True,
        "isTrending": False,
        "thumbnail": THUMB("exec1"),
        "tags": ["Executive", "Tax", "Company Law", "Business Setup"],
        "startDate": (datetime.now() - timedelta(days=10)).date().isoformat(),
        "expiryDate": (datetime.now() + timedelta(days=360)).date().isoformat(),
        "description": "Complete CS Executive Module 1 with detailed lectures, case studies, and exam-style questions for all three papers.",
        "highlights": [
            "300+ HD Video Lectures",
            "80+ Case Studies",
            "15 Mock Tests",
            "Live Faculty Sessions",
            "Latest Bare Acts",
        ],
        "modules": [
            module(1, "Paper 1: Tax Laws", "Direct + Indirect taxation", [
                chapter(1, "Income Tax Basics", "2h 30m", [
                    step("Heads of Income", V["bbb"], "25 min"),
                    step("Salary Income", V["sintel"], "28 min"),
                    step("Capital Gains", V["jelly"], "32 min", locked=True),
                ]),
                chapter(2, "GST Foundations", "1h 50m", [
                    step("GST Council & Rates", V["bbb_short"], "20 min", transcript=TRANSCRIPT_GST),
                    step("Input Tax Credit", V["elephant"], "25 min", locked=True, transcript=TRANSCRIPT_GST),
                ], locked=True),
            ]),
            module(2, "Paper 2: Company Law", "Companies Act 2013", [
                chapter(1, "Incorporation", "1h 40m", [
                    step("Memorandum of Association", V["bbb"], "18 min"),
                    step("Articles of Association", V["sintel"], "16 min"),
                ]),
            ]),
            module(3, "Paper 3: Setting up of Business", "From idea to operations", [
                chapter(1, "Business Structures", "1h 20m", [
                    step("Sole Prop vs LLP vs Pvt Ltd", V["jelly"], "22 min"),
                ]),
            ]),
        ],
    }


def professional_course():
    return {
        "id": "course_003",
        "system": True,
        "order": 3,
        "title": "CS Professional — Advanced Module",
        "subtitle": "Resolution of Corporate Disputes & Insolvency",
        "category": "professional",
        "faculty": {"id": "fac_sg", "name": "Adv. Sandeep Gupta", "subject": "Tax Law", "rating": 4.7, "students": 7600, "avatar": None},
        "price": 11999,
        "originalPrice": 14999,
        "rating": 4.9,
        "reviewCount": 768,
        "students": 4320,
        "duration": "210 hours",
        "language": "English",
        "level": "Advanced",
        "isBestseller": False,
        "isTrending": True,
        "thumbnail": THUMB("prof1"),
        "tags": ["Professional", "Insolvency", "NCLT", "Corporate Disputes"],
        "startDate": (datetime.now() - timedelta(days=5)).date().isoformat(),
        "expiryDate": (datetime.now() + timedelta(days=360)).date().isoformat(),
        "description": "Deep-dive into resolution of corporate disputes, IBC framework, NCLT/NCLAT processes and arbitration.",
        "highlights": [
            "120+ Video Lectures",
            "Real Case Studies",
            "Live Q&A with Senior Advocates",
            "Updated Bare Acts",
        ],
        "modules": [
            module(1, "Insolvency & Bankruptcy Code", "IBC 2016", [
                chapter(1, "Introduction to IBC", "2h 10m", [
                    step("Why IBC was Needed", V["sintel"], "20 min"),
                    step("Key Definitions", V["bbb"], "22 min"),
                    step("Corporate Insolvency Process", V["jelly"], "30 min", locked=True),
                ]),
            ]),
            module(2, "NCLT / NCLAT Practice", "Tribunals", [
                chapter(1, "Filing & Procedures", "1h 30m", [
                    step("Drafting Petitions", V["bbb"], "25 min", locked=True),
                ], locked=True),
            ]),
        ],
    }


def foundation_course():
    return {
        "id": "course_004",
        "system": True,
        "order": 4,
        "title": "CS Foundation — Quick Start",
        "subtitle": "Beginner-friendly intro to CS",
        "category": "foundation",
        "faculty": {"id": "fac_rm", "name": "CA Rohit Mehta", "subject": "Company Law", "rating": 4.9, "students": 12400, "avatar": None},
        "price": 2499,
        "originalPrice": 4999,
        "rating": 4.7,
        "reviewCount": 412,
        "students": 6210,
        "duration": "60 hours",
        "language": "Hindi + English",
        "level": "Beginner",
        "isBestseller": False,
        "isTrending": False,
        "thumbnail": THUMB("found1"),
        "tags": ["Foundation", "Basics"],
        "startDate": (datetime.now() - timedelta(days=2)).date().isoformat(),
        "expiryDate": (datetime.now() + timedelta(days=200)).date().isoformat(),
        "description": "Perfect entry point — covers all foundation papers in plain language with abundant examples.",
        "highlights": ["80+ Video Lectures", "20 Practice Tests", "Free Doubt Channel"],
        "modules": [
            module(1, "Business Environment", "Concepts & ecosystem", [
                chapter(1, "Indian Business Landscape", "1h", [
                    step("Sectors of Economy", V["bbb"], "18 min"),
                    step("Types of Businesses", V["sintel"], "12 min"),
                ]),
            ]),
        ],
    }


COURSES = [cseet_course(), executive_course(), professional_course(), foundation_course()]

# ─── FACULTIES (admin-managed pool) ───────────────────────────────────────
FACULTIES = [
    {"id": "fac_rm", "name": "CA Rohit Mehta",   "subject": "Company Law",       "rating": 4.9, "students": 12400, "bio": "Top-rated CA with 14+ years teaching CS Executive & Professional aspirants.", "avatar": None},
    {"id": "fac_pn", "name": "CS Priya Nair",    "subject": "SEBI & Compliance", "rating": 4.8, "students": 9800,  "bio": "Practicing Company Secretary specialising in SEBI listing regulations.", "avatar": None},
    {"id": "fac_sg", "name": "Adv. Sandeep Gupta","subject": "Tax Law",          "rating": 4.7, "students": 7600,  "bio": "Senior Advocate, Supreme Court — direct + indirect tax expert.", "avatar": None},
    {"id": "fac_kk", "name": "Adv. Kusum Kapuria","subject": "Corporate Law",    "rating": 4.9, "students": 18000, "bio": "Author of two widely-used Companies Act commentaries.", "avatar": None},
]

# ─── EXPERTS ──────────────────────────────────────────────────────────────
EXPERTS = [
    {"id": "exp_1", "name": "Mr. Anand Krishnan", "title": "Independent Director, Listed Co.", "bio": "30+ years on Indian boards; mentors students on governance.", "expertise": ["Governance", "Listing", "M&A"], "avatar": None},
    {"id": "exp_2", "name": "Ms. Sneha Iyer",     "title": "Senior Tax Consultant — Deloitte", "bio": "Deep expertise in GST and corporate tax planning.", "expertise": ["GST", "Tax Planning"], "avatar": None},
    {"id": "exp_3", "name": "Adv. Karan Malhotra", "title": "NCLT Practitioner", "bio": "Practiced 100+ insolvency cases; teaches IBC live every weekend.", "expertise": ["IBC", "NCLT", "Arbitration"], "avatar": None},
]


COUPONS = [
    {"id": "cpn_welcome10", "code": "WELCOME10",  "description": "10% off your first course",            "discount_pct": 10, "max_redemptions": None, "expiry": None, "applicable_courses": [], "min_amount": 0,    "is_active": True, "used_count": 0},
    {"id": "cpn_csninja25", "code": "CSNINJA25",  "description": "25% off CSEET Complete Preparation",   "discount_pct": 25, "max_redemptions": 100,  "expiry": None, "applicable_courses": ["course_001"], "min_amount": 0, "is_active": True, "used_count": 0},
    {"id": "cpn_pro30",     "code": "PROFESSIONAL30","description": "30% off Professional courses",      "discount_pct": 30, "max_redemptions": 50,   "expiry": None, "applicable_courses": ["course_003"], "min_amount": 5000, "is_active": True, "used_count": 0},
    {"id": "cpn_flat50",    "code": "FLAT50",     "description": "50% off — limited time",                "discount_pct": 50, "max_redemptions": 20,   "expiry": None, "applicable_courses": [], "min_amount": 1000, "is_active": True, "used_count": 0},
]


async def main():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]

    # Wipe system-seeded courses (keep admin-created ones intact)
    deleted = await db.courses.delete_many({"system": True})
    print(f"Wiped {deleted.deleted_count} system courses")

    for c in COURSES:
        c["createdAt"] = datetime.now(timezone.utc).isoformat()
        await db.courses.insert_one(c)
    print(f"Inserted {len(COURSES)} courses")

    # Faculties (upsert by id)
    for f in FACULTIES:
        await db.faculties.update_one(
            {"id": f["id"]},
            {"$set": {**f, "createdAt": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    print(f"Upserted {len(FACULTIES)} faculties")

    # Experts (upsert by id)
    for e in EXPERTS:
        await db.experts.update_one(
            {"id": e["id"]},
            {"$set": {**e, "createdAt": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    print(f"Upserted {len(EXPERTS)} experts")

    # Coupons (upsert by code)
    for c in COUPONS:
        await db.coupons.update_one(
            {"code": c["code"]},
            {"$set": {**c, "createdAt": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    print(f"Upserted {len(COUPONS)} coupons")

    # Auto-enroll all student users in course_001 + course_004 (the cheap ones)
    await db.users.update_many(
        {"role": {"$in": [None, "student"]}},
        {"$set": {"enrolledCourses": ["course_001", "course_004"]}},
    )

    print("\nDone. Snapshot:")
    print("  courses:   ", await db.courses.count_documents({}))
    print("  faculties: ", await db.faculties.count_documents({}))
    print("  experts:   ", await db.experts.count_documents({}))
    print("  coupons:   ", await db.coupons.count_documents({}))


if __name__ == "__main__":
    asyncio.run(main())
