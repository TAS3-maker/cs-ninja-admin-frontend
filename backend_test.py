"""Backend integration tests for CSninja.

Focus (per review request):
  • Feature A — Notifications feed (GET /api/notifications, POST mark-read, POST dismiss)
  • Feature B — address_id snapshot on /api/payments/create-order
  • Quick regression smoke (auth/me, courses, progress, videos, presign, create-order)
"""
import os
import sys
import json
import time
import requests

BASE = os.environ.get("CSNINJA_BASE_URL", "https://expo-runner-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

STUDENT_EMAIL = "test@csninja.in"
STUDENT_PASS = "pass1234"

PASS = []
FAIL = []


def _log(ok: bool, name: str, detail: str = ""):
    line = f"{'PASS' if ok else 'FAIL'} | {name}"
    if detail:
        line += f" — {detail}"
    print(line)
    (PASS if ok else FAIL).append(name + (f" :: {detail}" if detail else ""))


def login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"identifier": email, "password": password}, timeout=20)
    r.raise_for_status()
    return r.json()["accessToken"]


def section(label: str):
    print(f"\n========== {label} ==========")


def main():
    section("LOGIN")
    try:
        token = login(STUDENT_EMAIL, STUDENT_PASS)
        H = {"Authorization": f"Bearer {token}"}
        _log(True, "student login")
    except Exception as e:
        _log(False, "student login", repr(e))
        return

    # ─────────────────────────────────────────────────────────────
    section("FEATURE A — Notifications feed")
    r = requests.get(f"{API}/notifications", timeout=20)
    _log(r.status_code == 401, "GET /notifications without auth → 401", f"status={r.status_code}")

    r = requests.get(f"{API}/notifications", headers=H, timeout=20)
    if r.status_code != 200:
        _log(False, "GET /notifications with auth → 200", f"status={r.status_code} body={r.text[:300]}")
        return
    body = r.json()
    items = body.get("notifications")
    _log(isinstance(items, list), "GET /notifications: notifications is a list",
         f"len={len(items) if isinstance(items,list) else 'n/a'}")
    print("  raw response (first 1200 chars):", json.dumps(body)[:1200])

    needed_keys = {"id", "type", "title", "body", "timestamp", "read"}
    has_doubt_type = False
    has_order_type = False
    valid_shape = bool(items)
    for it in items:
        missing = needed_keys - set(it.keys())
        if missing:
            valid_shape = False
            print(f"  shape MISSING {missing} on item {it}")
        if it.get("type") == "doubt": has_doubt_type = True
        if it.get("type") == "order": has_order_type = True
        if not isinstance(it.get("read"), bool):
            valid_shape = False
            print(f"  read is not bool: {it.get('read')!r}")
    _log(valid_shape, "Notifications shape: {id,type,title,body,timestamp,read}")
    _log(has_doubt_type, "Notifications include type=doubt (admin reply on student doubt)",
         "no doubt-type notifications found" if not has_doubt_type else "")

    if not items:
        _log(False, "Notifications feed not empty",
             "feed returned []. Likely the synthesized GET is shadowed by the older DB-backed GET (two routes share /api/notifications).")
    else:
        first = items[0]
        fid = first["id"]
        r = requests.post(f"{API}/notifications/mark-read", json={"ids": [fid]}, headers=H, timeout=20)
        _log(r.status_code == 200, "POST /notifications/mark-read → 200", f"status={r.status_code}")
        r2 = requests.get(f"{API}/notifications", headers=H, timeout=20)
        items2 = r2.json().get("notifications", [])
        target = next((x for x in items2 if x["id"] == fid), None)
        _log(target is not None and target.get("read") is True,
             "After mark-read: target item has read=true",
             f"target.read={target.get('read') if target else 'NOT FOUND'}")

        r = requests.post(f"{API}/notifications/dismiss", json={"id": fid}, headers=H, timeout=20)
        _log(r.status_code == 200, "POST /notifications/dismiss → 200", f"status={r.status_code}")
        r3 = requests.get(f"{API}/notifications", headers=H, timeout=20)
        items3 = r3.json().get("notifications", [])
        still = next((x for x in items3 if x["id"] == fid), None)
        _log(still is None, "After dismiss: target id no longer in list",
             "still appears" if still else "")

    r = requests.post(f"{API}/notifications/mark-read", json={"ids": []}, headers=H, timeout=20)
    _log(r.status_code == 200, "POST /notifications/mark-read with ids=[] → 200", f"status={r.status_code}")

    r = requests.post(f"{API}/notifications/mark-read", json={"ids": "not-a-list"}, headers=H, timeout=20)
    _log(r.status_code == 400, "POST /notifications/mark-read with ids=string → 400",
         f"status={r.status_code} body={r.text[:200]}")

    r = requests.post(f"{API}/notifications/dismiss", json={}, headers=H, timeout=20)
    _log(r.status_code == 400, "POST /notifications/dismiss without id → 400",
         f"status={r.status_code} body={r.text[:200]}")

    # ─────────────────────────────────────────────────────────────
    section("FEATURE B — address_id on /payments/create-order")
    r = requests.get(f"{API}/addresses", headers=H, timeout=20)
    _log(r.status_code == 200, "GET /addresses → 200", f"status={r.status_code}")
    addrs = r.json().get("addresses", [])
    if not addrs:
        addr_payload = {
            "name": "Aarav Sharma",
            "line1": "B-204, Crystal Heights, MG Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "phone": "+919812345678",
            "is_default": True,
        }
        r = requests.post(f"{API}/addresses", json=addr_payload, headers=H, timeout=20)
        _log(r.status_code == 200, "POST /addresses (seed default) → 200",
             f"status={r.status_code} body={r.text[:200]}")
        addr = r.json()
    else:
        addr = addrs[0]
    addr_id = addr.get("id")
    _log(bool(addr_id), "Have an address id to use", f"id={addr_id}")

    r = requests.get(f"{API}/courses", timeout=20)
    courses = r.json().get("courses", [])
    course_id = courses[0]["id"] if courses else "course_001"

    # WITH address_id
    r = requests.post(f"{API}/payments/create-order",
                      json={"course_id": course_id, "amount": 999, "address_id": addr_id},
                      headers=H, timeout=30)
    _log(r.status_code == 200, "POST /payments/create-order WITH address_id → 200",
         f"status={r.status_code} body={r.text[:300]}")
    rzp_with_addr = (r.json() or {}).get("order_id")

    time.sleep(0.4)
    r = requests.get(f"{API}/orders", headers=H, timeout=20)
    orders = r.json().get("orders", [])
    matched = next((o for o in orders if o.get("razorpay_order_id") == rzp_with_addr), None)
    if not matched:
        _log(False, "GET /orders includes the just-created order (with addr)",
             f"rzp_order={rzp_with_addr} first_order={orders[0] if orders else 'EMPTY'}")
    else:
        ok = matched.get("address_id") == addr_id and isinstance(matched.get("address"), dict)
        _log(ok, "Order doc has address_id + address dict embedded",
             f"address_id={matched.get('address_id')} address.name={(matched.get('address') or {}).get('name')}")
        ok2 = ((matched.get("address") or {}).get("city") == addr.get("city")
               and (matched.get("address") or {}).get("name") == addr.get("name"))
        _log(ok2, "Embedded address snapshot matches name+city of source", "")

    # WITHOUT address_id
    r = requests.post(f"{API}/payments/create-order",
                      json={"course_id": course_id, "amount": 999},
                      headers=H, timeout=30)
    _log(r.status_code == 200, "POST /payments/create-order WITHOUT address_id → 200",
         f"status={r.status_code} body={r.text[:300]}")
    rzp_no_addr = (r.json() or {}).get("order_id")
    time.sleep(0.4)
    r = requests.get(f"{API}/orders", headers=H, timeout=20)
    orders = r.json().get("orders", [])
    matched = next((o for o in orders if o.get("razorpay_order_id") == rzp_no_addr), None)
    if not matched:
        _log(False, "GET /orders includes the just-created order (no addr)", f"rzp_order={rzp_no_addr}")
    else:
        ok = matched.get("address_id") in (None, "") and matched.get("address") is None
        _log(ok, "Order without address_id: address_id null/absent + address null",
             f"address_id={matched.get('address_id')!r} address={matched.get('address')!r}")

    # Bogus address_id
    r = requests.post(f"{API}/payments/create-order",
                      json={"course_id": course_id, "amount": 999, "address_id": "addr_does_not_exist"},
                      headers=H, timeout=30)
    _log(r.status_code == 200, "POST /payments/create-order with bogus address_id → 200",
         f"status={r.status_code} body={r.text[:300]}")
    rzp_bogus = (r.json() or {}).get("order_id")
    time.sleep(0.4)
    r = requests.get(f"{API}/orders", headers=H, timeout=20)
    orders = r.json().get("orders", [])
    matched = next((o for o in orders if o.get("razorpay_order_id") == rzp_bogus), None)
    if not matched:
        _log(False, "GET /orders includes the bogus-addr order", "")
    else:
        ok = matched.get("address") is None
        _log(ok, "Order with bogus address_id: address snapshot is null",
             f"address_id={matched.get('address_id')!r} address={matched.get('address')!r}")

    # ─────────────────────────────────────────────────────────────
    section("REGRESSION SMOKE")
    r = requests.get(f"{API}/auth/me", headers=H, timeout=20)
    _log(r.status_code == 200 and "user" in r.json(), "GET /auth/me", f"status={r.status_code}")

    r = requests.get(f"{API}/courses", timeout=20)
    _log(r.status_code == 200 and len(r.json().get("courses", [])) > 0, "GET /courses",
         f"count={len(r.json().get('courses', []))}")

    r = requests.get(f"{API}/progress", headers=H, timeout=20)
    _log(r.status_code == 200, "GET /progress", f"status={r.status_code}")

    r = requests.get(f"{API}/videos", headers=H, params={"course_id": "course_001"}, timeout=20)
    _log(r.status_code == 200, "GET /videos?course_id=course_001",
         f"count={len(r.json().get('videos', []))}")

    r = requests.post(f"{API}/uploads/presign",
                      json={"filename": "lecture-intro.mp4", "content_type": "video/mp4", "purpose": "video"},
                      headers=H, timeout=20)
    ok = r.status_code == 200 and "upload_url" in r.json() and "public_url" in r.json()
    _log(ok, "POST /uploads/presign", f"status={r.status_code}")

    r = requests.post(f"{API}/payments/create-order",
                      json={"course_id": "course_001", "amount": 100},
                      headers=H, timeout=30)
    _log(r.status_code == 200 and "order_id" in r.json(), "POST /payments/create-order (smoke)",
         f"status={r.status_code} body={r.text[:200]}")

    section("SUMMARY")
    print(f"PASSED: {len(PASS)}")
    print(f"FAILED: {len(FAIL)}")
    for f in FAIL:
        print("  X", f)
    sys.exit(0 if not FAIL else 1)


if __name__ == "__main__":
    main()
