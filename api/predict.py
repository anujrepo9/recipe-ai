"""
Vercel Python Serverless Function — POST /api/predict
Runs the ML model and returns recipe recommendations.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# ── Resolve model directory (works locally + on Vercel) ──────────────────────
_THIS = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_THIS)
MODEL_DIR = os.path.join(_ROOT, "model")

# ── Load all assets once at module level (cached in Lambda container) ─────────
try:
    import joblib
    import numpy as np
    import pandas as pd

    model           = joblib.load(os.path.join(MODEL_DIR, "popularity_model.pkl"))
    feature_cols    = joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl"))
    ingredients_list= joblib.load(os.path.join(MODEL_DIR, "ingredients_list.pkl"))
    df_original     = joblib.load(os.path.join(MODEL_DIR, "full_dataset.pkl"))
    _LOADED = True
except Exception as _e:
    _LOADED = False
    _LOAD_ERR = str(_e)

# ── Regional rules ────────────────────────────────────────────────────────────
REGIONAL_RESTRICTIONS = {
    "Mumbai India":    {"beef": -50, "pork": -30},
    "Delhi India":     {"beef": -45, "pork": -25},
    "New York NY":     {},
    "Los Angeles CA":  {},
    "Chicago IL":      {},
}

def _regional_boost(location, ingredients):
    boost = 0
    if any(c in location for c in ["NY", "CA", "IL"]) and "beef" in ingredients:
        boost += 10
    if "India" in location and not any(m in ingredients for m in ["chicken", "beef", "fish", "prawns", "pork"]):
        boost += 15
    return boost


def _cors(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        _cors(self)
        self.end_headers()

    def log_message(self, *args):
        pass  # suppress default access log noise

    def _respond(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        _cors(self)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not _LOADED:
            return self._respond(500, {"success": False, "error": f"Model not loaded: {_LOAD_ERR}"})

        # Read body
        length = int(self.headers.get("Content-Length", 0))
        data   = json.loads(self.rfile.read(length))

        user_ingredients = [i.strip().lower() for i in data.get("ingredients", [])]
        cuisine  = data.get("cuisine",  "").strip()
        location = data.get("location", "").strip()

        if not user_ingredients or not cuisine or not location:
            return self._respond(400, {"success": False, "error": "Missing required fields"})

        # Regional penalty
        regional_penalty = 0
        for restricted, penalty in REGIONAL_RESTRICTIONS.get(location, {}).items():
            if restricted in user_ingredients:
                regional_penalty += penalty

        # Filter by cuisine
        candidates = df_original[df_original["cuisine_type"].str.lower() == cuisine.lower()].copy()
        if candidates.empty:
            return self._respond(404, {"success": False, "error": f"No recipes for {cuisine} cuisine"})

        candidates = candidates.sort_values("customer_rating", ascending=False).drop_duplicates("recipe_name", keep="first")

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
            return self._respond(404, {"success": False, "error": "No matching recipes for your ingredients"})

        # ML prediction
        X = candidates[["location", "restaurant_type", "cuisine_type", "dish_category",
                         "price_range", "cooking_method", "spice_level", "season"]]
        raw = model.predict(X)
        candidates["predicted_popularity"] = np.clip(raw, 0, 100)
        adj = regional_penalty + _regional_boost(location, user_ingredients)
        candidates["predicted_popularity"] = np.clip(candidates["predicted_popularity"] + adj, 0, 100)
        candidates = candidates.sort_values("predicted_popularity", ascending=False)

        recs = []
        for _, row in candidates.iterrows():
            matched    = row["matched_list"]
            additional = [i for i in row["recipe_ings"] if i not in matched][:5]
            recs.append({
                "recipe_name":           row["recipe_name"],
                "predicted_popularity":  round(float(row["predicted_popularity"]), 1),
                "customer_rating":       float(row["customer_rating"]),
                "preparation_time":      int(row.get("preparation_time", 30)),
                "instructions":          row.get("instructions", ""),
                "cuisine_type":          row.get("cuisine_type", ""),
                "spice_level":           row.get("spice_level", ""),
                "matched_ingredients":   matched,
                "additional_ingredients": additional,
                "total_ingredients":     len(row["recipe_ings"]),
            })

        return self._respond(200, {"success": True, "recommendations": recs})
