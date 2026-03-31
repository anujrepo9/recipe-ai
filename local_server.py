"""
local_server.py
---------------
Local development server that mirrors all Vercel API endpoints.
Use this when running the project locally with `npm run dev`.

Usage:
    pip install flask flask-cors numpy pandas joblib scikit-learn
    python local_server.py

Runs on: http://127.0.0.1:5000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# ── Load model files ──────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")

print("Loading model files...")
try:
    model            = joblib.load(os.path.join(MODEL_DIR, "popularity_model.pkl"))
    feature_cols     = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
    ingredients_list = joblib.load(os.path.join(MODEL_DIR, "ingredients_list.pkl"))
    df_original      = joblib.load(os.path.join(MODEL_DIR, "full_dataset.pkl"))
    print(f"✅ All model files loaded — {len(df_original)} recipes ready")
except FileNotFoundError as e:
    print(f"❌ Error loading model files: {e}")
    print(f"   Make sure the model/ folder contains all .pkl files")
    exit(1)

# ── Regional rules ────────────────────────────────────────────────────────────
REGIONAL_RESTRICTIONS = {
    "Mumbai India":   {"beef": -50, "pork": -30},
    "Delhi India":    {"beef": -45, "pork": -25},
    "New York NY":    {},
    "Los Angeles CA": {},
    "Chicago IL":     {},
}

def get_regional_boost(location, ingredients):
    boost = 0
    if any(c in location for c in ["NY", "CA", "IL"]) and "beef" in ingredients:
        boost += 10
    if "India" in location and not any(m in ingredients for m in ["chicken", "beef", "fish", "prawns", "pork"]):
        boost += 15
    return boost

# ── GET /api/ingredients ──────────────────────────────────────────────────────
@app.route("/api/ingredients", methods=["GET"])
def get_ingredients():
    return jsonify({"ingredients": ingredients_list})

# ── GET /api/cuisines ─────────────────────────────────────────────────────────
@app.route("/api/cuisines", methods=["GET"])
def get_cuisines():
    cuisines = sorted(df_original["cuisine_type"].dropna().unique().tolist())
    return jsonify({"cuisines": cuisines})

# ── GET /api/locations ────────────────────────────────────────────────────────
@app.route("/api/locations", methods=["GET"])
def get_locations():
    locations = sorted(df_original["location"].dropna().unique().tolist())
    return jsonify({"locations": locations})

# ── GET /api/recipes ──────────────────────────────────────────────────────────
@app.route("/api/recipes", methods=["GET"])
def get_recipes():
    df = df_original.drop_duplicates("recipe_name", keep="first")
    COLS = [
        "recipe_name", "cuisine_type", "customer_rating", "preparation_time",
        "ingredients", "instructions", "spice_level", "dish_category",
        "cooking_method", "price_range", "location"
    ]
    available = [c for c in COLS if c in df.columns]
    recipes = df[available].fillna("").to_dict(orient="records")
    return jsonify({"recipes": recipes})

# ── POST /api/predict ─────────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data             = request.get_json()
        user_ingredients = [i.strip().lower() for i in data.get("ingredients", [])]
        cuisine          = data.get("cuisine",  "").strip()
        location         = data.get("location", "").strip()

        if not user_ingredients or not cuisine or not location:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Regional penalty
        regional_penalty = 0
        for restricted, penalty in REGIONAL_RESTRICTIONS.get(location, {}).items():
            if restricted in user_ingredients:
                regional_penalty += penalty

        # Filter by cuisine
        candidates = df_original[
            df_original["cuisine_type"].str.lower() == cuisine.lower()
        ].copy()

        if candidates.empty:
            return jsonify({"success": False, "error": f"No recipes found for {cuisine} cuisine"}), 404

        candidates = candidates.sort_values("customer_rating", ascending=False)\
                               .drop_duplicates("recipe_name", keep="first")

        # Match ingredients
        def calc(row_ings):
            rlist   = [i.strip().lower() for i in str(row_ings).split(",")]
            matched = [i for i in user_ingredients if i in rlist]
            return len(matched), matched, rlist

        results = candidates["ingredients"].apply(calc)
        candidates = candidates.copy()
        candidates["matched_count"] = results.apply(lambda x: x[0])
        candidates["matched_list"]  = results.apply(lambda x: x[1])
        candidates["recipe_ings"]   = results.apply(lambda x: x[2])
        candidates = candidates[candidates["matched_count"] >= 1].copy()

        if candidates.empty:
            return jsonify({"success": False, "error": "No recipes match your ingredients"}), 404

        # ML prediction
        X   = candidates[["location", "restaurant_type", "cuisine_type", "dish_category",
                           "price_range", "cooking_method", "spice_level", "season"]]
        raw = model.predict(X)
        candidates["predicted_popularity"] = np.clip(raw, 0, 100)
        adj = regional_penalty + get_regional_boost(location, user_ingredients)
        candidates["predicted_popularity"] = np.clip(
            candidates["predicted_popularity"] + adj, 0, 100
        )
        candidates = candidates.sort_values("predicted_popularity", ascending=False)

        recommendations = []
        for _, row in candidates.iterrows():
            matched    = row["matched_list"]
            additional = [i for i in row["recipe_ings"] if i not in matched][:5]
            recommendations.append({
                "recipe_name":            row["recipe_name"],
                "predicted_popularity":   round(float(row["predicted_popularity"]), 1),
                "customer_rating":        float(row["customer_rating"]),
                "preparation_time":       int(row.get("preparation_time", 30)),
                "instructions":           row.get("instructions", ""),
                "cuisine_type":           row.get("cuisine_type", ""),
                "spice_level":            row.get("spice_level", ""),
                "matched_ingredients":    matched,
                "additional_ingredients": additional,
                "total_ingredients":      len(row["recipe_ings"]),
                "youtube_url":            row.get("youtube_url", ""),
            })

        return jsonify({"success": True, "recommendations": recommendations})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🍽️  RecipeAI Local Server")
    print("=" * 40)
    print("API running at: http://127.0.0.1:5000")
    print("Next.js should run at: http://localhost:3000")
    print("\nMake sure .env.local has:")
    print("  NEXT_PUBLIC_API_URL=http://127.0.0.1:5000")
    print("=" * 40 + "\n")
    app.run(debug=True, port=5000)