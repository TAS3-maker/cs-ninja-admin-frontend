# CSninja — Full-Stack EdTech Platform

> Mobile-first online coaching platform for CSEET, CS Executive & CS Professional with live courses, video player, doubts, payments and a built-in admin panel.

## 🌐 Live URLs

| Service | URL |
|---|---|
| 📱 **Mobile App (web preview)** | https://expo-runner-2.preview.emergentagent.com |
| ⚙️ **Backend API** | https://expo-runner-2.preview.emergentagent.com/api |
| 🛠️ **Admin Panel** | https://expo-runner-2.preview.emergentagent.com/api/admin-ui/login |
| ❤️ **Health Check** | https://expo-runner-2.preview.emergentagent.com/api/health |

> Use the default test accounts from the [bottom of this README](#-default-test-accounts) to log in.

---

**Stack**
- 📱 **Mobile App** — React Native + Expo Router (`/frontend`)
- ⚙️ **Backend API** — FastAPI + MongoDB (`/backend`)
- 🛠️ **Admin Panel** — React + Vite + Tailwind, served from FastAPI (`/admin-panel`)
- ☁️ **Storage** — AWS S3 + CloudFront
- 💳 **Payments** — Razorpay (web checkout)

---

## 📁 Project Structure

```
/app
├── backend/                # FastAPI server (port 8001)
│   ├── server.py           # Main API
│   ├── admin_routes.py     # Admin RBAC + course builder
│   ├── legacy_sync.py      # Schema sync helpers
│   ├── pay_static/         # Razorpay checkout HTML
│   ├── admin_static/       # Compiled admin SPA (output)
│   └── .env                # Backend secrets (NOT in git)
│
├── frontend/               # Expo Router app (port 3000)
│   ├── app/                # File-based routes
│   ├── src/                # Components, screens, contexts, utils
│   └── .env                # Frontend env (NOT in git)
│
├── admin-panel/            # Vite + React admin SPA (source)
│   ├── src/pages/          # Courses, Faculty, Doubts, Coupons …
│   └── dist/               # Built output → copied to backend/admin_static
│
├── tests/                  # Backend smoke tests
└── README.md               # This file
```

---

## 🔐 Environment Variables

> 🚨 **Never commit real secrets to Git.** Copy the templates below into local `.env` (or `.env.local`) files and fill in your own values. The provided `.env.example` files in `/backend` and `/frontend` already contain these templates.

### 1. Backend — `/backend/.env`

```dotenv
# ── MongoDB ─────────────────────────────────────────────────
MONGO_URL="mongodb://localhost:27017"
DB_NAME="csninja"

# ── JWT (auth tokens) ───────────────────────────────────────
# Generate: python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET="<your-jwt-secret>"
JWT_EXPIRES_MIN=15
REFRESH_EXPIRES_DAYS=7

# ── AWS S3 (video / image uploads) ──────────────────────────
AWS_ACCESS_KEY_ID="<your-aws-access-key-id>"
AWS_SECRET_ACCESS_KEY="<your-aws-secret-access-key>"
AWS_REGION="ap-southeast-2"
S3_BUCKET="<your-s3-bucket-name>"
CLOUDFRONT_DOMAIN="<your-cloudfront-domain>"   # e.g. d1234abcd.cloudfront.net

# ── Razorpay (payments) ─────────────────────────────────────
# Use rzp_test_* in development, rzp_live_* in production.
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="<your-razorpay-key-secret>"
RAZORPAY_WEBHOOK_SECRET=""

# ── Pusher / Beams (push notifications, optional) ───────────
PUSHER_APP_ID=""
PUSHER_KEY=""
PUSHER_SECRET=""
PUSHER_CLUSTER="ap2"
PUSHER_BEAMS_INSTANCE_ID=""
PUSHER_BEAMS_SECRET_KEY=""
```

### 2. Mobile App — `/frontend/.env`

```dotenv
# Tunnel hostnames (only matter for cloud preview deployments)
EXPO_TUNNEL_SUBDOMAIN=your-tunnel-subdomain
EXPO_PACKAGER_HOSTNAME=http://localhost:8081
EXPO_PACKAGER_PROXY_URL=http://localhost:8081

# Backend API URL the app calls
# • Local sim:           http://localhost:8001
# • Physical device:     http://<your-LAN-ip>:8001
# • Production:          https://api.your-domain.com
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# Misc Expo / Metro
EXPO_USE_FAST_RESOLVER="1"
METRO_CACHE_ROOT=./.metro-cache
```

### 3. Admin Panel — `/admin-panel/`

The admin panel does **not** require its own `.env` file. It's a Vite-built SPA that consumes the same backend API directly via fetch (`/api/admin/...`). All API URLs are relative and resolved by the browser at runtime, so no compile-time secrets are needed.

If you ever need to add admin-specific env vars (Vite-style):

```dotenv
# /admin-panel/.env  (only if needed; prefix with VITE_)
VITE_API_BASE_URL=/api
```

---

## 🚀 Local Development — Step-by-Step

### Prerequisites

- **Python 3.11+**
- **Node.js 20+** & **Yarn**
- **MongoDB 7+** running locally on port 27017 (or a hosted Atlas URL)

### 🔧 Step 1 — Run the Backend (FastAPI on port 8001)

```bash
cd backend

# Create a virtual env (recommended)
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up env
cp .env.example .env              # then edit .env with your secrets

# Start MongoDB if not already running
# macOS:   brew services start mongodb-community
# Linux:   sudo systemctl start mongod
# Docker:  docker run -d -p 27017:27017 --name csninja-mongo mongo:7

# Run the API server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at **http://localhost:8001/api**.

#### Seed initial data (optional)

```bash
# Inside /backend with venv activated:
python -c "import asyncio; from seed import seed_all; asyncio.run(seed_all())"
```

> Default super-admin credentials after seed:
> - Email: `superadmin@csninja.in`
> - Password: `Admin@1234`

#### API health check

```bash
curl http://localhost:8001/api/health
# → { "status": "ok", "mongo": true, "razorpay": true, "s3": true, ... }
```

---

### 📱 Step 2 — Run the Mobile App (Expo on port 3000)

```bash
cd frontend

# Install dependencies
yarn install

# Set up env
cp .env.example .env              # then edit .env (point EXPO_PUBLIC_BACKEND_URL to your backend)

# Start Expo dev server
yarn start                        # opens Expo Dev Tools (Metro on 8081, web on 3000)
```

Then:
- Press **`w`** to open in a web browser
- Press **`i`** for the iOS simulator (Mac only)
- Press **`a`** for an Android emulator
- Or scan the QR code with the **Expo Go** app on your phone

> **Tip — testing on a physical device:** Replace `localhost` in `EXPO_PUBLIC_BACKEND_URL` with your machine's LAN IP (e.g. `http://192.168.1.42:8001`) so your phone can reach the backend.

---

### 🛠️ Step 3 — Run the Admin Panel

The admin panel is **served by the backend** at `/api/admin-ui/`.

#### Option A — Use the prebuilt admin (default)

The compiled admin SPA already lives in `/backend/admin_static/`. Just run the backend (Step 1) and visit:

> **http://localhost:8001/api/admin-ui/login**

#### Option B — Develop the admin source live

If you're editing files in `/admin-panel/src/`:

```bash
cd admin-panel

# Install dependencies
yarn install

# Hot-reload dev server (defaults to port 5173)
yarn dev

# When done editing, build & deploy to backend:
yarn build
cp -rT dist ../backend/admin_static
```

The Vite dev server proxies API requests to `localhost:8001` automatically.

---

## 🗂️ One-Command Setup (after first run)

For day-to-day work after initial setup, you can use three terminals:

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 — Mobile App
cd frontend && yarn start

# Terminal 3 — Admin (only if editing admin source)
cd admin-panel && yarn dev
```

---

## 🧪 Testing

```bash
# Backend smoke tests
cd backend
python -m pytest tests/                    # all
python tests/backend_test.py               # full integration suite

# Lint frontend
cd frontend && yarn lint
```

---

## 📦 Deployment Notes

- **Backend**: Run uvicorn behind a reverse proxy (nginx/Caddy). Set all env vars in your platform's secret manager. The backend serves both `/api/*` (JSON) and `/api/admin-ui/*` (admin SPA) and `/api/pay-ui/*` (Razorpay checkout HTML).
- **Frontend**: Build with `eas build` for iOS/Android, or `expo export --platform web` for a static web bundle.
- **Admin**: Already built into `/backend/admin_static/` — runs wherever the backend runs.
- **MongoDB**: Use MongoDB Atlas in production. Whitelist your backend's IP.
- **S3**: IAM policy must allow `PutObject`, `GetObject` on `videos/*` (the only prefix mobile clients can upload to via presigned URLs).

---

## 👥 Default Test Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@csninja.in` | `Admin@1234` |
| Student | `test@csninja.in` | `pass1234` |

---

## 📄 License

Proprietary — © 2026 CSninja. All rights reserved.
