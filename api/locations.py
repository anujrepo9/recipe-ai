"""Vercel Python Serverless Function — GET /api/locations"""

from http.server import BaseHTTPRequestHandler
import json, os, joblib

_ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(_ROOT, "model")

try:
    import pandas as pd
    df = joblib.load(os.path.join(MODEL_DIR, "full_dataset.pkl"))
    locations = sorted(df["location"].dropna().unique().tolist())
except Exception:
    locations = []


class handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        body = json.dumps({"locations": locations}).encode()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)
