# 🍽️ RecipeAI

AI-powered recipe recommendations based on what's in your pantry.  
Built with **Next.js**, **Supabase**, and a **LightGBM** ML model — deployable to **Vercel** in minutes.

---

## ✨ Features

- 🔍 **Recipe Finder** — pick ingredients, cuisine & location → ML model ranks recipes by predicted popularity
- 📚 **All Recipes** — browse & filter the full recipe database
- 🔖 **Save Recipes** — bookmark your favorites (requires login)
- 🕐 **Search History** — automatically logged per user
- 👤 **Auth** — sign up / sign in via Supabase Auth (email + password)

---

## 🗂️ Project Structure

```
recipe-finder/
├── app/                  ← Next.js pages (App Router)
│   ├── page.jsx          ← Recipe Finder (home)
│   ├── recipes/          ← Browse All Recipes
│   ├── saved/            ← Saved Recipes + Search History
│   └── auth/             ← Login / Sign Up
├── components/           ← Shared React components
├── lib/supabase.js        ← Supabase client
├── api/                  ← Python serverless functions (Vercel)
│   ├── predict.py        ← POST /api/predict  (ML model)
│   ├── ingredients.py    ← GET  /api/ingredients
│   ├── cuisines.py       ← GET  /api/cuisines
│   ├── locations.py      ← GET  /api/locations
│   └── recipes.py        ← GET  /api/recipes
├── model/                ← Trained ML .pkl files (keep these!)
├── scripts/
│   └── migrate_to_supabase.py  ← One-time data migration
├── supabase/
│   └── schema.sql        ← Run once in Supabase SQL Editor
├── .env.example          ← Copy to .env.local
├── vercel.json
├── requirements.txt      ← Python deps
└── package.json          ← Node deps
```

---

## 🚀 Setup Guide

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/recipe-finder.git
cd recipe-finder
npm install
```

### Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Open the **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**
3. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (only for migration script)

### Step 3 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Step 4 — Migrate Recipe Data to Supabase (optional but recommended)

This populates the "All Recipes" browse page from your ML dataset:

```bash
pip install supabase joblib pandas
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
python scripts/migrate_to_supabase.py
```

### Step 5 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> ⚠️ The Python API functions (`/api/*.py`) run as Vercel serverless functions. To test them locally, use the [Vercel CLI](https://vercel.com/docs/cli):
> ```bash
> npm i -g vercel
> vercel dev
> ```

---

## ☁️ Deploy to Vercel

### Option A — Vercel Dashboard (easiest)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add **Environment Variables** in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** ✅

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

> **Note**: Vercel will automatically detect Next.js and install Python dependencies from `requirements.txt`.

---

## 🗄️ Supabase Tables

| Table | Purpose |
|-------|---------|
| `recipes` | Full recipe dataset (migrated from pkl) |
| `profiles` | User profile (auto-created on signup) |
| `saved_recipes` | User bookmarks |
| `search_history` | Per-user search analytics |

All tables have Row Level Security (RLS) enabled. Users can only access their own data.

---

## 🧠 How the ML Works

1. User selects **ingredients**, **cuisine**, and **location**
2. The `POST /api/predict` function filters recipes by cuisine
3. For each candidate recipe, it counts ingredient matches
4. The **LightGBM** model predicts a popularity score (0–100)
5. Regional adjustments are applied (e.g. dietary preferences by location)
6. Results are sorted by predicted popularity and returned

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) |
| ML Model | LightGBM + scikit-learn |
| API | Python serverless functions (Vercel) |
| Deployment | Vercel |

---

## 📝 Notes

- The `.pkl` model files in `model/` are required for the ML API — don't delete them
- The `model/full_dataset.pkl` is also used for browse fallback if Supabase is unavailable
- Make sure to **never** commit `.env.local` or your service role key to git
