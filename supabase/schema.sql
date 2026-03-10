-- ============================================================
-- RecipeAI — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Recipes Table (migrated from pkl) ───────────────────────
CREATE TABLE IF NOT EXISTS public.recipes (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_name      TEXT    NOT NULL,
  cuisine_type     TEXT,
  location         TEXT,
  restaurant_type  TEXT,
  dish_category    TEXT,
  price_range      TEXT,
  cooking_method   TEXT,
  spice_level      TEXT,
  season           TEXT,
  ingredients      TEXT,
  instructions     TEXT,
  customer_rating  NUMERIC(3, 1) DEFAULT 0,
  preparation_time INTEGER DEFAULT 30,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cuisine/spice filtering
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine  ON public.recipes (cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipes_spice    ON public.recipes (spice_level);
CREATE INDEX IF NOT EXISTS idx_recipes_rating   ON public.recipes (customer_rating DESC);

-- ── User Profiles (extends Supabase auth.users) ──────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Saved Recipes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_name  TEXT    NOT NULL,
  recipe_data  JSONB,
  saved_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, recipe_name)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_recipes (user_id);

-- ── Search History ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_history (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredients   TEXT[]  DEFAULT '{}',
  cuisine       TEXT,
  location      TEXT,
  results_count INTEGER DEFAULT 0,
  searched_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON public.search_history (user_id);

-- ── Row Level Security (RLS) ─────────────────────────────────

-- Recipes: public read
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes are publicly readable"
  ON public.recipes FOR SELECT USING (true);

-- Profiles: users can only read/update their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles are updatable by owner"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Saved Recipes: users can only see/edit their own
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved recipes viewable by owner"
  ON public.saved_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Saved recipes insertable by owner"
  ON public.saved_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Saved recipes deletable by owner"
  ON public.saved_recipes FOR DELETE USING (auth.uid() = user_id);

-- Search History: users can only see/edit their own
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History viewable by owner"
  ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "History insertable by owner"
  ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "History deletable by owner"
  ON public.search_history FOR DELETE USING (auth.uid() = user_id);

-- ── Done! ─────────────────────────────────────────────────────
-- Next: run scripts/migrate_to_supabase.py to populate the recipes table.
