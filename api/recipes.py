"""Vercel Python Serverless Function — GET /api/recipes"""

from http.server import BaseHTTPRequestHandler
import json, os, joblib

_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(_ROOT, "model")

try:
    df = joblib.load(os.path.join(MODEL_DIR, "full_dataset.pkl"))
    df = df.drop_duplicates("recipe_name", keep="first")
    
    COLS = ["recipe_name", "cuisine_type", "customer_rating", "preparation_time",
            "ingredients", "instructions", "spice_level", "dish_category",
            "cooking_method", "price_range", "location"]
    
    available_cols = [c for c in COLS if c in df.columns]
    recipes = df[available_cols].fillna("").to_dict(orient="records")
    _LOADED = True
except Exception as e:
    recipes = []
    _LOADED = False


class handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        body = json.dumps({"recipes": recipes}).encode()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)
