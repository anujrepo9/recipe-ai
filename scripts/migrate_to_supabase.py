"""
migrate_to_supabase.py
----------------------
Reads the recipe dataset from model/full_dataset.pkl
and uploads all unique recipes to your Supabase `recipes` table.

Usage:
  pip install supabase pandas
  python scripts/migrate_to_supabase.py

Or pass credentials via environment variables:
  SUPABASE_URL=https://xxx.supabase.co \
  SUPABASE_SERVICE_KEY=your-service-role-key \
  python scripts/migrate_to_supabase.py
"""

import os, sys, pickle, pandas as pd
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL") or input("Enter your Supabase URL: ").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or input("Enter your Supabase service role key: ").strip()

BATCH_SIZE = 100

# ── Load Data ─────────────────────────────────────────────────────────────────
_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(_ROOT, "model")

print("Loading dataset...")

# Use pickle (not joblib) — dataset was saved with pickle.dump protocol 4
# to ensure compatibility across pandas versions
pd.options.future.infer_string = False
with open(os.path.join(MODEL_DIR, "full_dataset.pkl"), "rb") as f:
    df = pickle.load(f)

print(f"  ✓ Loaded {len(df)} rows, {df['recipe_name'].nunique()} unique recipes")

# One row per recipe — pick the highest-rated row for each
df = df.sort_values("customer_rating", ascending=False)\
       .drop_duplicates("recipe_name", keep="first")\
       .reset_index(drop=True)
print(f"  ✓ After dedup: {len(df)} rows")

# ── Prepare rows ──────────────────────────────────────────────────────────────
COLUMNS = [
    "recipe_name", "cuisine_type", "location", "restaurant_type",
    "dish_category", "price_range", "cooking_method", "spice_level",
    "season", "ingredients", "instructions", "customer_rating",
    "preparation_time", "youtube_url",
]

available = [c for c in COLUMNS if c in df.columns]
missing   = [c for c in COLUMNS if c not in df.columns]
if missing:
    print(f"  ⚠ Columns not in dataset (will be skipped): {missing}")

df_clean = df[available].copy()

# Fix numeric types
if "customer_rating"  in df_clean:
    df_clean["customer_rating"]  = pd.to_numeric(df_clean["customer_rating"],  errors="coerce").fillna(0)
if "preparation_time" in df_clean:
    df_clean["preparation_time"] = pd.to_numeric(df_clean["preparation_time"], errors="coerce").fillna(30).astype(int)

# Replace NaN with empty string for text columns
df_clean = df_clean.fillna("")

records = df_clean.to_dict(orient="records")
print(f"  ✓ Prepared {len(records)} records for upload")

# ── Upload to Supabase ────────────────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

total   = len(records)
success = 0
errors  = 0

print(f"\nUploading {total} recipes in batches of {BATCH_SIZE}...")
for i in range(0, total, BATCH_SIZE):
    batch = records[i : i + BATCH_SIZE]
    try:
        supabase.table("recipes").upsert(batch, on_conflict="recipe_name").execute()
        success += len(batch)
        pct = int((i + len(batch)) / total * 100)
        print(f"  [{pct:3d}%] Uploaded rows {i+1}–{min(i+BATCH_SIZE, total)}", end="\r")
    except Exception as e:
        errors += len(batch)
        print(f"\n  ✗ Batch {i//BATCH_SIZE + 1} failed: {e}")

print(f"\n\n✅ Done! {success} rows uploaded, {errors} errors.")
print("Check: Supabase Dashboard → Table Editor → recipes")