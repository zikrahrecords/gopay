# GOPAY BDT - full-stack project

- `frontend/`  Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `backend/`   Node.js + Express REST API + PostgreSQL
- `docker-compose.yml`  local PostgreSQL

## Run locally
1. `docker compose up -d`            (starts PostgreSQL; or use your own and edit DATABASE_URL)
2. Backend:
   ```
   cd backend && cp .env.example .env   # set JWT_SECRET (32+ chars) and ADMIN_PASSWORD
   npm install && npm run migrate && npm run seed && npm run dev
   ```
3. Frontend (new terminal):
   ```
   cd frontend && cp .env.example .env.local
   npm install && npm run dev
   ```
4. Open http://localhost:3000. User app: `/`. Admin panel: `/admin` (sign in at `/login` with the ADMIN_PHONE/ADMIN_PASSWORD from .env; the user app has no admin link).

## What is built
- Auth: register, login, logout, forgot/reset password (bcrypt, JWT in httpOnly cookie, rate limits), change password, profile photo upload, referral code
- Buy (claim order -> buy balance + bonus to available balance), wallets (bKash/Nagad/Rocket, online/offline), withdrawals (buy-balance and available-balance), history, support panel
- Admin (role verified on the server for every route): stats, products with image, user deposits, withdrawals with partial completion and reject/refund, support settings
- All money changes run in database transactions with row locks.

## Not built yet / before going live
- Frontend screens: Sell, Promotion, Team income, Online numbers, Notifications, separate admin Orders/Payments pages (APIs for orders exist). Team income needs the commission rules you want.
- Email/SMS delivery for password reset (link is printed in the API console), PWA manifest/service worker, tests, HTTPS, CSRF hardening for cross-site deployment, backups, audit log.
- Legal: fixed % rewards, referral/team income and using customers' mobile wallet numbers can fall under deposit-scheme / MFS / mule-account rules in Bangladesh. Get legal advice before launch.
