# Lucky Draw

A mobile-friendly H5 lucky draw wheel with an admin dashboard for probability and spin limits.

## Features

- **6 prize tiers**: Apple Desktop, Apple Laptop, iPhone 17 Pro Max, iPhone 17 Pro, Apple Watch, $500 USD
- **Server-side draw**: Probabilities and results are computed on the backend
- **Browser ID**: Auto-generated UUID in `localStorage` — no login required
- **Admin dashboard**: Set spins per user, prize weights, and view stats

## Local development

```bash
npm install
node server/index.js
```

- Draw page: http://localhost:3000
- Admin: http://localhost:3000/admin.html
- Default password: `admin123`

Local dev uses `data/config.json` and `data/users.json` for storage.

---

## Deploy to Vercel

Vercel runs API routes as serverless functions. **File storage does not persist on Vercel**, so you need **Upstash Redis** (from Vercel Marketplace) for config and user data.

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "Lucky draw wheel"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Import project on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Framework Preset: **Other** (no build command needed)
5. Root Directory: `.` (project root)
6. Click **Deploy** (first deploy may fail until KV is connected — that's OK)

### Step 3 — Add Upstash Redis (replaces old Vercel KV)

Vercel no longer has a native "KV" option. Use **Upstash Redis** instead:

1. Open your project on Vercel
2. Go to **Storage** tab
3. Under **Marketplace Database Providers**, find **Upstash** → **Upstash for Redis**
4. Click **Add** / **Create** → choose the free plan → **Create**
5. Click **Connect Project** and select your `ucky-draw` project
6. Vercel auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Alternative: [vercel.com/marketplace/upstash](https://vercel.com/marketplace/upstash) → Install → connect to project

### Step 4 — Redeploy

**Deployments → ... → Redeploy** (or push a new commit).

Admin password is fixed: `admin123`

### Step 6 — Verify

- Draw page: `https://your-project.vercel.app`
- Admin: `https://your-project.vercel.app/admin.html`

---

## Project structure (Vercel)

```
public/          → static files (HTML/CSS/JS)
api/             → serverless API routes
lib/             → shared business logic
data/            → local dev storage only
vercel.json      → routing config
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/status?userId=` | Remaining spins and prize list |
| `POST /api/spin` | Execute draw `{ userId }` |
| `GET /api/admin/config` | Get admin config |
| `PUT /api/admin/config` | Update weights and spin limits |
| `GET /api/admin/stats` | Participation statistics |

Admin requests require header: `X-Admin-Password: admin123`

## Probability

Weights are **relative** — they do not need to sum to 100.

## CLI deploy (optional)

```bash
npm i -g vercel
vercel login
vercel
# follow prompts, then link KV in dashboard and redeploy
vercel --prod
```
