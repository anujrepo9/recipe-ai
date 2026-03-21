# 🍽️ RecipeAI

AI-powered recipe recommendations based on what's in your pantry.  
Built with **Next.js 14**, **Flask**, **Supabase**, a **LightGBM** ML model, and **Groq** for Chef AI chat.

---

## ✨ Features

- 🔍 **Recipe Finder** — pick ingredients, cuisine & location → ML model ranks recipes by predicted popularity
- 📚 **All Recipes** — browse, search, and filter the full recipe database
- 🤖 **Chef AI** — four-mode AI assistant (Q&A, improve a recipe, generate from scratch, write descriptions) powered by Groq (LLaMA 3.3 70B)
- 🔖 **Save Recipes** — bookmark your favorites (requires login)
- 🕐 **Search History** — automatically logged per user
- 👤 **Auth** — sign up / sign in via Supabase Auth (email + password)
- 🌗 **Dark / Light mode** — theme persisted to localStorage

---

## 🗂️ Project Structure

```
recipe-ai/
├── app/                        ← Next.js pages (App Router)
│   ├── page.jsx                ← Recipe Finder (home)
│   ├── recipes/page.jsx        ← Browse All Recipes
│   ├── chat/page.jsx           ← Chef AI (Groq)
│   ├── saved/page.jsx          ← Saved Recipes + Search History
│   ├── auth/page.jsx           ← Login / Sign Up
│   └── api/chat/route.js       ← Next.js API route → Groq proxy
├── components/
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── RecipeCard.jsx
├── lib/
│   ├── supabase.js             ← Supabase browser client (singleton)
│   └── ThemeProvider.jsx       ← Dark/light mode context
├── api/                        ← Flask routes (served by local_server.py / Render)
│   ├── predict.py              ← POST /api/predict  (ML inference)
│   ├── ingredients.py          ← GET  /api/ingredients
│   ├── cuisines.py             ← GET  /api/cuisines
│   ├── locations.py            ← GET  /api/locations
│   └── recipes.py              ← GET  /api/recipes
├── model/                      ← Trained ML .pkl files — do not delete
│   ├── popularity_model.pkl    ← LightGBM model
│   ├── recipes.pkl
│   ├── ingredients_list.pkl
│   ├── label_encoders.pkl
│   ├── feature_columns.pkl
│   └── full_dataset.pkl        ← Also used as browse fallback
├── scripts/
│   └── migrate_to_supabase.py  ← One-time data migration
├── supabase/
│   └── schema.sql              ← Run once in Supabase SQL Editor
├── local_server.py             ← Flask dev server (mirrors Render)
├── .env.example
├── vercel.json
├── requirements.txt            ← Python deps (Flask, LightGBM, etc.)
└── package.json
```

---

## 🏗️ Architecture

The app runs across **three separate services**:

| Service | What it runs | Platform |
|---------|-------------|----------|
| Next.js frontend + `/api/chat` | React pages + Groq proxy | Vercel |
| Flask ML backend | `/api/predict`, `/api/ingredients`, `/api/cuisines`, `/api/locations`, `/api/recipes` | Render |
| Database + Auth | PostgreSQL tables + JWT sessions | Supabase |

The Flask server is **stateless** — it only handles ML inference and never writes to Supabase. All database reads and writes (saved recipes, search history) go directly from the browser to Supabase via the `supabase-js` client.

---

## 🚀 Setup Guide

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/recipe-ai.git
cd recipe-ai
npm install
```

### Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Open the **SQL Editor** → paste `supabase/schema.sql` → **Run**
3. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` *(migration script only — never commit this)*

### Step 3 — Get a Groq API Key

1. Go to [console.groq.com](https://console.groq.com) → create a free account
2. Generate an API key → `GROQ_API_KEY`

### Step 4 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Groq (Chef AI chat)
GROQ_API_KEY=gsk_...

# Flask API base URL — only needed for local dev
# Leave empty on Vercel (set NEXT_PUBLIC_API_URL to your Render URL instead)
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

### Step 5 — Migrate Recipe Data to Supabase *(optional but recommended)*

Populates the "All Recipes" browse page from your ML dataset:

```bash
pip install supabase joblib pandas
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
python scripts/migrate_to_supabase.py
```

> Without this step the Recipes page falls back to `full_dataset.pkl` served by the Flask API.

### Step 6 — Run Locally

The app needs **two processes** running simultaneously:

**Terminal 1 — Flask ML server:**
```bash
pip install flask flask-cors lightgbm numpy pandas joblib scikit-learn
python local_server.py
# → API running at http://127.0.0.1:5000
```

**Terminal 2 — Next.js:**
```bash
npm run dev
# → App running at http://localhost:3000
```

---

## ☁️ Deploying to Production

### Deploy Flask to Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `python local_server.py`
5. Note your Render URL (e.g. `https://recipe-ai-api.onrender.com`)

### Deploy Next.js to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
2. Add **Environment Variables** in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_API_URL` → your Render URL (e.g. `https://recipe-ai-api.onrender.com`)
3. Click **Deploy** ✅

Or via CLI:

```bash
npm i -g vercel
vercel --prod
```

---

## 🗄️ Supabase Tables

| Table | Purpose |
|-------|---------|
| `recipes` | Full recipe dataset (migrated from pkl) |
| `profiles` | User profile (auto-created on signup) |
| `saved_recipes` | Per-user bookmarks |
| `search_history` | Per-user search analytics (fire-and-forget write) |

All tables have **Row Level Security (RLS)** enabled — users can only read and write their own data.

---

## 🧠 How the ML Works

1. User selects **ingredients**, **cuisine**, and **location**
2. `POST /api/predict` filters recipes by cuisine type
3. For each candidate recipe, ingredient overlap is computed
4. The **LightGBM** model predicts a popularity score (0–100) using categorical features: location, restaurant type, cuisine, dish category, price range, cooking method, spice level, and season
5. Regional boosts/penalties are applied (e.g. dietary restrictions by location)
6. Results are sorted by predicted popularity and returned with `matched_ingredients` and `additional_ingredients` per recipe

The model files are loaded **once at server startup** and kept in memory for fast inference.

---

## 🤖 Chef AI Modes

The `app/api/chat/route.js` Next.js route proxies to Groq and switches system prompt based on `mode`:

| Mode | What it does |
|------|-------------|
| `chat` | General cooking Q&A |
| `improve` | Suggests enhancements based on your ingredients |
| `generate` | Writes a full recipe from your ingredient list |
| `describe` | Writes appetizing 60-word card copy for a recipe |

The `GROQ_API_KEY` lives **server-side only** in the Next.js route — it is never exposed to the browser.

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), custom CSS variables |
| AI Chat | Groq API — LLaMA 3.3 70B |
| Auth | Supabase Auth (email + password, JWT) |
| Database | Supabase (PostgreSQL + RLS) |
| ML Model | LightGBM + scikit-learn |
| ML API | Flask + Flask-CORS (Render) |
| Deployment | Vercel (Next.js) + Render (Flask) |

---

## 📝 Notes

- The `model/` `.pkl` files are required for all ML endpoints — never delete them
- `full_dataset.pkl` doubles as a browse fallback if Supabase is unreachable
- Static API responses (`/api/ingredients`, `/api/cuisines`, `/api/locations`) are cached by Vercel's CDN and in the browser's `sessionStorage` — they only hit the Flask server on the very first visit
- Never commit `.env.local` or your `service_role` key to git