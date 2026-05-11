#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Wire CSninja LearningScreen to fetch real videos from FastAPI backend (MongoDB + AWS S3 / CloudFront / external CDN) instead of hardcoded Sintel URL. Seed sample videos via script."

backend:
  - task: "Videos API: list/get/save endpoints + CloudFront URL resolution"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Endpoints exist: GET /api/videos (auth, optional course_id/mine filters), GET /api/videos/{id}, POST /api/videos, DELETE /api/videos/{id}. Seeded 4 sample videos via /app/backend/seed_videos.py pointing to public Google GTV CDN mp4 files, mapped to course_001/002/003."
        - working: false
          agent: "testing"
          comment: "API layer fully working (16/17 tests pass). Two issues found: (a) GTV CDN seed URLs return 403 AccessDenied (Google revoked anonymous access). (b) _video_url() prepends CloudFront to keys that are already full URLs."
        - working: true
          agent: "main"
          comment: "FIXED both. (a) Re-seeded with mp4s from download.blender.org and test-videos.co.uk — all verified HTTP 200 video/mp4. (b) _video_url() now returns http(s):// keys as-is to avoid nested CloudFront paths."

  - task: "S3 Presigned upload + CloudFront stream URL"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Implemented: POST /api/uploads/presign returns PUT URL + public CloudFront URL. GET /api/uploads/stream/{key} returns CloudFront URL. Not yet exercised by any frontend screen."
        - working: true
          agent: "testing"
          comment: "POST /api/uploads/presign with {filename:'test.mp4'} returns upload_url, key (videos/{user_id}/{uuid}_test.mp4), and public_url prefixed with CloudFront domain dvvr3f6m67pzg.cloudfront.net. JWT enforced."

  - task: "Razorpay create-order + verify"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Endpoints implemented with Razorpay test keys configured."
        - working: true
          agent: "testing"
          comment: "POST /api/payments/create-order with {course_id:'course_001', amount:100} returns valid Razorpay order_id (order_Smyp...), amount=10000 paise, currency=INR, key_id=rzp_test_Rt1tQndMxYrIAr. Order persisted in db.orders. Verify endpoint not exercised (requires real signed payment)."

  - task: "Auth + JWT (signup/login/refresh/me)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Verified manually in previous session via curl + UI signup/login."
        - working: true
          agent: "testing"
          comment: "Full round-trip verified via /app/backend_test.py: signup (200, conflict 409), login (200, invalid creds 401), GET /api/auth/me with bearer (200, returns correct user), refresh (200 returns new accessToken). Health endpoint also reports mongo=true, razorpay=true, s3=true, pusher_*=false as expected."

  - task: "RBAC + admin APIs (users, courses, chapters, modules, faculty, experts, analytics)"
    implemented: true
    working: true
    file: "/app/backend/admin_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Added /app/backend/admin_routes.py mounted at /api/admin/*. 4 roles seeded (superadmin/teacher/assistant/accountant) via seed_admin.py. Verified manually: superadmin login → list users (8), create course (returns id+order), add chapter, add module with mixed items (video+pdf+doubt → 3 items), analytics summary (totals, revenue). Reorder endpoints exist: /courses/reorder, /courses/{cid}/chapters/reorder, /courses/{cid}/chapters/{ch}/modules/reorder. teachers can only edit assigned_courses; assistants gated by granular permissions[]; accountant has read-only analytics."

  - task: "Profile DP upload (S3 presign + PATCH /me avatar)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/screens/ProfileScreen.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Wired expo-image-picker → /api/uploads/presign → PUT to S3 → PATCH /api/auth/me {avatar: cloudfront_url}. Avatar component now renders <Image> when uri set; falls back to initials. iOS Info.plist + Android permissions added in app.json."

  - task: "PDF Answer Sheet support on module items (admin schema)"
    implemented: true
    working: true
    file: "/app/backend/admin_routes.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Extended ModuleItemIn schema with optional answer_sheet_url (str) and answer_sheet_publish_at (ISO date str). Mobile player conditionally shows a 'Answer Sheet' download button on/after the publish date."
        - working: true
          agent: "testing"
          comment: "Verified end-to-end against https://expo-runner-2.preview.emergentagent.com (superadmin@csninja.in / Admin@1234). POST /api/admin/courses/course_001/chapters/{ch}/modules with items=[{type:'pdf', title:'Assignment 1', pdf_url, answer_sheet_url:'https://example.com/ans.pdf', answer_sheet_publish_at:'2026-06-30'}] → 200; response item preserves both new fields. Round-trip GET via /api/courses/course_001 confirms persistence. PATCH same module to set answer_sheet_url=None and answer_sheet_publish_at='2026-07-15' → 200; subsequent GET shows new date and cleared url. Legacy modules[] correctly omits pdf items (only video steps). DELETE module → 200, cleanup successful. NOTE: GET /api/admin/courses/{cid} (single-course admin GET) does NOT exist on the admin router — only the list endpoint /api/admin/courses is exposed. Used the public /api/courses/{cid} for round-trip verification (same DB doc). Optional improvement: add a single-course admin GET. Core feature works as specified."

  - task: "Notes update + delete endpoints (PATCH/DELETE /api/progress/note/{id})"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 1
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "PATCH /api/progress/note/{id} (body {content}) and DELETE /api/progress/note/{id}. Used by new MyNotes screen on mobile."
        - working: false
          agent: "testing"
          comment: "Owner happy-path works (POST→PATCH→GET, DELETE→GET). Auth: PATCH/DELETE without bearer→401, cross-user PATCH→404. BUG: cross-user DELETE returned 200 instead of 404 — handler did blanket $pull without ownership check."
        - working: true
          agent: "main"
          comment: "Fixed at /app/backend/server.py L847-855: DELETE now first matches {user_id, notes.id}; if matched_count==0, raises 404. Same pattern as PATCH. Backend reloaded successfully."

  - task: "Notifications feed (synthesized) — GET /api/notifications + mark-read + dismiss"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/notifications composes a feed on-the-fly from: (1) successful orders → 'Course unlocked', (2) doubt replies authored by non-student roles → 'Mentor replied', (3) enrolled courses with updatedAt within 30 days → 'Course updated'. POST /api/notifications/mark-read accepts {ids:[]} ($addToSet to user.notif_read_ids). POST /api/notifications/dismiss accepts {id} ($addToSet to user.notif_dismissed_ids). The list endpoint filters out dismissed and marks read flag from read_ids. All require auth bearer."
        - working: false
          agent: "testing"
          comment: "ROUTE CONFLICT — synthesized GET /api/notifications is dead code. server.py declares the path TWICE: legacy DB-backed handler `get_notifications` at line 732 wins over synthesized `list_notifications` at line 936. FIX: delete the older endpoint at lines 731-735."
        - working: true
          agent: "testing"
          comment: "RE-VERIFIED after duplicate route removal. Confirmed only ONE GET /api/notifications declaration in server.py (line 934, synthesized handler). Live test against https://expo-runner-2.preview.emergentagent.com with student test@csninja.in / pass1234 via /app/backend_test.py: ALL 9 notification assertions PASS. (1) GET /api/notifications without auth → 401. (2) GET with bearer → 200 returning {notifications: [...]}; payload shape exactly {id,type,title,body,timestamp,read,course_id,doubt_id}; observed type='doubt' with id 'doubt_fe2417ec-...' title 'CSninja Superadmin replied to your doubt', timestamp ISO-8601, read=false initially. (3) POST /notifications/mark-read {ids:[<id>]} → 200; subsequent GET shows the same id with read=true. (4) POST /notifications/dismiss {id:<id>} → 200; subsequent GET no longer contains the id. (5) Negative cases: mark-read with ids=[] → 200, mark-read with ids='not-a-list' → 400 ('ids must be a list'), dismiss with empty body → 400 ('id required'). Full backend_test.py run = 27/27 PASS (including Feature B address-on-order regression and smoke tests)."

  - task: "Address attached to /api/payments/create-order + order document"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "CreateOrderIn now accepts optional address_id. Endpoint snapshots address from user.addresses into order doc under {address_id, address}. If id missing/invalid, both fields end up null but order still creates."
        - working: true
          agent: "testing"
          comment: "Verified end-to-end against the public preview URL with student test@csninja.in. (1) POST /api/payments/create-order with {course_id:'course_001', amount:999, address_id:<id>} → 200 (Razorpay order_id returned). Subsequent GET /api/orders shows the new order with address_id set AND address dict embedded matching name/city of the user's address. (2) Same call WITHOUT address_id → 200; order doc has address_id=None and address=None. (3) Same call with bogus address_id 'addr_does_not_exist' → 200; order is still created with address_id='addr_does_not_exist' but address=None (no snapshot match). All three cases behaved exactly as specified."

  - task: "POST /api/progress/complete-step now persists (camelCase→snake_case fix)"
    implemented: true
    working: true
    file: "/app/frontend/src/services/api.ts"
    stuck_count: 1
    priority: "high"
    needs_retesting: false
    status_history:
        - working: false
          agent: "main"
          comment: "Frontend was sending {courseId, stepId} (camelCase) but backend expects {course_id, step_id} (snake_case). Result: every Mark Done call returned 400 and progress never persisted (visible in backend logs as 'POST /api/progress/complete-step HTTP/1.1 400 Bad Request'). Button reverted to 'Mark Done' on next render."
        - working: true
          agent: "main"
          comment: "Fixed api.completeStep to remap to snake_case before send. Verified via curl: POST → {ok:true, xp_gained:10}; GET /api/progress shows the step in completedSteps. Backend logs clean."

  - task: "legacy_sync surfaces ALL item types as steps (was video-only)"
    implemented: true
    working: true
    file: "/app/backend/legacy_sync.py"
    stuck_count: 1
    priority: "high"
    needs_retesting: false
    status_history:
        - working: false
          agent: "main"
          comment: "chapters_to_legacy() dropped any item with type!='video', so PDFs/doubts added via admin panel never appeared in the mobile curriculum (mobile reads modules[]→chapters[]→steps[])."
        - working: true
          agent: "main"
          comment: "Updated to surface all item types preserving their type field (video, pdf, doubt, summary, link, quiz). Re-ran sync_to_legacy on all 5 courses. Verified /api/courses/course_b15dd750 returns step types {pdf, video} (was video-only). Mobile LearningScreen auto-switches the bottom tab when a non-video step is opened."

frontend:
  - task: "MyNotes screen replaces Study tab — grouped Course → Chapter → Module"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/screens/MyNotesScreen.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BottomNav now has 'Notes' tab (replacing Study). Screen lists notes grouped by course → chapter → module with search, edit modal, swipe-delete, and 'Open course' shortcut. Verified visually via screenshot — backend list/edit/delete already wired through ProgressContext.updateNote / deleteNote."

  - task: "LearningScreen — dynamic tab ordering + dynamic PDF tab"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/screens/LearningScreen.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Tabs (Transcript / PDF / Doubt) inside the player now follow the order of the admin's module.items[] (drag-and-drop ordering). 'Notes' is auto-pinned right after the first Transcript. PDF tab now renders the actual pdf items from the current module (with Download buttons) and shows a green 'Answer Sheet' button when answer_sheet_url is set and answer_sheet_publish_at has passed; otherwise a scheduled-publish banner is shown."


    implemented: true
    working: "NA"
    file: "/app/frontend/src/screens/LearningScreen.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Replaced hardcoded SAMPLE_VIDEO_URL with state-driven videoUrl. useEffect calls api.listVideos({course_id}), picks chapter match else first video, falls back to FALLBACK_VIDEO_URL. Will defer FE testing until user requests."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Notifications feed (synthesized) — GET /api/notifications + mark-read + dismiss"
    - "Address attached to /api/payments/create-order + order document"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Two new backend changes to test. (1) Notifications: GET /api/notifications synthesizes a feed from successful orders (status in [paid,captured,success]) → 'Course unlocked'; doubts where the latest reply has by_role != 'student' → 'Mentor replied'; enrolled courses with updatedAt within 30 days → 'Course updated'. POST /api/notifications/mark-read body {ids:[]} appends to user.notif_read_ids ($addToSet). POST /api/notifications/dismiss body {id} appends to user.notif_dismissed_ids. List endpoint filters out dismissed, sets read=true for ids in read_ids, sorts newest-first. All require bearer. Test with student test@csninja.in / pass1234 — they already have order(s) and doubts in the DB. Confirm: list shape {id,type,title,body,timestamp,read,course_id?,doubt_id?}; mark-read flips read=true on next list; dismiss makes the id disappear from subsequent list. (2) /api/payments/create-order now accepts optional address_id; if user.addresses contains it, the order doc gets {address_id, address: <snapshot>}. Verify via subsequent GET /api/orders that the new order has these fields populated when address_id is supplied, and null/absent when not."
    - agent: "testing"
      message: "RE-VERIFICATION of Feature A after duplicate route removal: PASS. Confirmed only one GET /api/notifications declaration remains in /app/backend/server.py (line 934, synthesized handler). Live test against https://expo-runner-2.preview.emergentagent.com with student test@csninja.in / pass1234 via /app/backend_test.py: 27/27 PASS. Notifications shape now correct ({id,type,title,body,timestamp,read,course_id,doubt_id}); type='doubt' observed; mark-read flips read=true on subsequent GET; dismiss removes id from subsequent GET; all negative cases (401 no-auth, 400 ids-not-list, 400 dismiss-no-id) correct. Feature B (address-on-order) and regression smoke also still PASS. Notifications task is now working=true, needs_retesting=false."
    - agent: "testing"
      message: "Tested both features against https://expo-runner-2.preview.emergentagent.com with student test@csninja.in / pass1234 via /app/backend_test.py. RESULT: 23 passed / 4 failed. (B) Address-on-order: ALL 3 cases pass (with valid address_id → snapshot embedded; without → null/null; with bogus id → still creates, address null). (A) Notifications: BROKEN due to a route conflict in /app/backend/server.py — the path GET /api/notifications is declared TWICE: the older DB-backed handler `get_notifications` at line 732 (returns docs from db.notifications collection with shape {id,user_id,title,body,event,data,read,createdAt}) and the new synthesized `list_notifications` at line 936. FastAPI matches by registration order, so the OLDER handler wins and the synthesized feed is dead code. Observable consequences in the live test: (1) returned items are missing the required `type` and `timestamp` keys; (2) no items have type='doubt'/'order'/'course'; (3) POST /notifications/mark-read returns 200 but the next GET still shows read=false (legacy handler reads `read` from the db doc, ignores user.notif_read_ids); (4) POST /notifications/dismiss returns 200 but the dismissed id still appears (legacy handler doesn't consult user.notif_dismissed_ids). Fix: REMOVE the older endpoint at lines 731-735 (the `@app.get('/api/notifications')` on `get_notifications`) so only the synthesized one at line 936 remains. The unique-path endpoints (mark-read, dismiss) are correctly validating bodies (200/400 cases all pass). Regression smoke (auth/me, courses, progress, videos, presign, create-order) all PASS. NOTE: I did not patch the code — fix is the main agent's call."