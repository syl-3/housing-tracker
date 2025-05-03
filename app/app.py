# app/app.py

from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

# --- Setup ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "../housing_tracker.db"))

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_app():
    app = Flask(__name__)
    CORS(app)

    # --- Existing Routes ---
    @app.route("/api/ping")
    def ping():
        return jsonify({ "status": "ok" })

    @app.route("/api/gold-metrics")
    def gold_metrics():
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM gold_metrics ORDER BY scrape_date ASC").fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    @app.route("/api/silver-latest")
    def silver_latest():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT * FROM silver_listings
            WHERE scrape_date = (SELECT MAX(scrape_date) FROM silver_listings)
        """).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    @app.route("/api/last-updated")
    def last_updated():
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT last_updated FROM meta WHERE id = 1").fetchone()
            return jsonify({ "last_updated": row["last_updated"] if row else None })
        finally:
            conn.close()

    # --- New Routes ---

    @app.route("/api/summary-stats")
    def summary_stats():
        conn = get_db_connection()

        # Get today's metrics
        row_today = conn.execute("""
            SELECT * FROM gold_metrics
            ORDER BY scrape_date DESC LIMIT 1
        """).fetchone()

        # Get yesterday's metrics (for delta)
        row_yesterday = conn.execute("""
            SELECT * FROM gold_metrics
            ORDER BY scrape_date DESC LIMIT 1 OFFSET 1
        """).fetchone()

        conn.close()

        if not row_today:
            return jsonify({})

        # Compute price change if yesterday exists
        price_change = None
        if row_yesterday:
            price_change = row_today["median_price"] - row_yesterday["median_price"]

        return jsonify({
            "scrape_date": row_today["scrape_date"],
            "median_price": row_today["median_price"],
            "price_change": price_change,
            "listing_count": row_today["listing_count"],
            "studio_count": row_today["studio_count"],
            "one_bed_count": row_today["one_bed_count"],
            "two_plus_bed_count": row_today["two_plus_bed_count"]
        })


    @app.route("/api/silver-zip/<zip>")
    def silver_by_zip(zip):
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT * FROM silver_listings
            WHERE zipcode = ?
            AND scrape_date = (SELECT MAX(scrape_date) FROM silver_listings)
        """, (zip,)).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    @app.route("/api/scrape-dates")
    def scrape_dates():
        conn = get_db_connection()
        rows = conn.execute("SELECT DISTINCT scrape_date FROM silver_listings ORDER BY scrape_date DESC").fetchall()
        conn.close()
        return jsonify([row["scrape_date"] for row in rows])

    @app.route("/api/silver-by-date/<date>")
    def silver_by_date(date):
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (date,)).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    @app.route("/api/gold-compare")
    def compare_gold_dates():
        start = request.args.get("start")
        end = request.args.get("end")
        if not start or not end:
            return jsonify({"error": "Missing 'start' or 'end' query param"}), 400

        conn = get_db_connection()
        start_row = conn.execute("SELECT * FROM gold_metrics WHERE scrape_date = ?", (start,)).fetchone()
        end_row = conn.execute("SELECT * FROM gold_metrics WHERE scrape_date = ?", (end,)).fetchone()
        conn.close()

        return jsonify({
            "start": dict(start_row) if start_row else f"No data for {start}",
            "end": dict(end_row) if end_row else f"No data for {end}"
        })


    @app.route("/api/silver-changes")
    def silver_changes():
        conn = get_db_connection()
        dates = conn.execute("SELECT DISTINCT scrape_date FROM silver_listings ORDER BY scrape_date DESC LIMIT 2").fetchall()
        if len(dates) < 2:
            return jsonify({ "error": "Not enough data" }), 400

        latest, previous = dates[0]["scrape_date"], dates[1]["scrape_date"]
        latest_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (latest,)).fetchall()
        previous_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (previous,)).fetchall()
        conn.close()

        def build_signature(row):
            def safe(val):
                return str(val).strip().lower() if val is not None else ""
            return "|".join([
                safe(row["unit_id"]),
                safe(row["title"]),
                safe(row["unit_name"]),
                safe(row["beds"]),
                safe(row["baths"]),
                safe(row["sqft"]),
            ])


        latest_map = {build_signature(r): float(r["price"]) for r in latest_units if r["price"] is not None}
        previous_map = {build_signature(r): float(r["price"]) for r in previous_units if r["price"] is not None}


        print(f"[DEBUG] Today's unique signatures: {len(latest_map)}")
        print(f"[DEBUG] Yesterday's unique signatures: {len(previous_map)}")

        print("[DEBUG] Sample today's signatures:")
        for sig in list(latest_map.keys())[:5]:
            print(f"  - {sig}")

        print("[DEBUG] Sample yesterday's signatures:")
        for sig in list(previous_map.keys())[:5]:
            print(f"  - {sig}")


        changes = {}

        for sig, price in latest_map.items():
            if sig not in previous_map:
                changes[sig] = { "change": "new" }
            elif previous_map[sig] != price:
                delta = price - previous_map[sig]
                changes[sig] = { "change": "changed", "delta": delta }

        return jsonify({
            "latest_date": latest,
            "previous_date": previous,
            "changes": changes
        })





    @app.route("/api/download-latest-csv")
    def download_csv():
        today = datetime.now().strftime("%Y-%m-%d")
        path = os.path.join(os.path.dirname(__file__), "../csv_exports", f"scraped_{today}.csv")
        path = os.path.abspath(path)  # make sure it's clean
        if not os.path.exists(path):
            return jsonify({ "error": "CSV not found." }), 404
        return send_file(path, as_attachment=True)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
