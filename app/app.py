# app/app.py

from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, date
import logging
from flask import send_from_directory

# --- Setup ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.environ.get("DB_PATH", "/app/db_volume/housing_tracker.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def generate_signature(row):
    def normalize(val):
        if val is None:
            return ""
        if isinstance(val, (int, float)):
            return f"{float(val):.1f}".rstrip('0').rstrip('.')  # e.g., 2.0 → "2", 2.5 → "2.5"
        return str(val).strip().lower()

    return "|".join([
        normalize(row["unit_id"]),
        normalize(row["title"]),
        normalize(row["unit_name"]),
        normalize(row["beds"]),
        normalize(row["baths"]),
        normalize(row["sqft"])
    ])


def create_app():
    app = Flask(__name__, static_folder="dist")
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

        # Get last two scrape dates
        date_rows = conn.execute("""
            SELECT DISTINCT scrape_date FROM silver_listings
            ORDER BY scrape_date DESC LIMIT 2
        """).fetchall()
        if len(date_rows) < 2:
            conn.close()
            return jsonify({})

        latest = date_rows[0]["scrape_date"]
        previous = date_rows[1]["scrape_date"]

        # Get rows for both days
        latest_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (latest,)).fetchall()
        previous_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (previous,)).fetchall()

        # Signature comparison
        latest_signatures = set(generate_signature(r) for r in latest_units)
        previous_signatures = set(generate_signature(r) for r in previous_units)

        new_listing_count = len(latest_signatures - previous_signatures)

        conn.close()

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
            "two_plus_bed_count": row_today["two_plus_bed_count"],
            "new_listing_count": new_listing_count,
        })

    @app.route("/api/todays-prices")
    def todays_prices():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT price FROM silver_listings
            WHERE scrape_date = (SELECT MAX(scrape_date) FROM silver_listings)
            AND price IS NOT NULL
        """).fetchall()
        conn.close()
        return jsonify([row["price"] for row in rows])


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
        date_param = request.args.get("date")
        if not date_param:
            return jsonify({"error": "Missing 'date' query param"}), 400

        dates = conn.execute("""
            SELECT DISTINCT scrape_date FROM silver_listings
            WHERE scrape_date <= ?
            ORDER BY scrape_date DESC LIMIT 2
        """, (date_param,)).fetchall()

        if len(dates) < 2:
            return jsonify({ "error": "Not enough data" }), 400

        latest, previous = dates[0]["scrape_date"], dates[1]["scrape_date"]
        latest_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (latest,)).fetchall()
        previous_units = conn.execute("SELECT * FROM silver_listings WHERE scrape_date = ?", (previous,)).fetchall()
        conn.close()

        # Remove build_signature entirely — replace all its usage with generate_signature



        latest_map = {generate_signature(r): float(r["price"]) for r in latest_units if r["price"] is not None}
        previous_map = {generate_signature(r): float(r["price"]) for r in previous_units if r["price"] is not None}


        


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

    @app.route("/api/zip-counts")
    def zip_counts():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT zipcode, COUNT(*) as count
            FROM silver_listings
            WHERE scrape_date = (SELECT MAX(scrape_date) FROM silver_listings)
            GROUP BY zipcode
            ORDER BY count DESC
        """).fetchall()
        conn.close()
        return jsonify([{ "zip": row["zipcode"], "count": row["count"] } for row in rows])

    @app.route("/api/neighborhood-counts")
    def neighborhood_counts():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT neighborhood, COUNT(*) as count
            FROM silver_listings
            WHERE scrape_date = (SELECT MAX(scrape_date) FROM silver_listings)
            GROUP BY neighborhood
            ORDER BY count DESC
        """).fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    
    @app.route("/api/gold-metrics-unit-types")
    def gold_metrics_unit_types():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT scrape_date, 
                AVG(CASE WHEN beds = 0 THEN price END) as avg_studio,
                AVG(CASE WHEN beds = 1 THEN price END) as avg_1br,
                AVG(CASE WHEN beds >= 2 THEN price END) as avg_2plus
            FROM silver_listings
            GROUP BY scrape_date
            ORDER BY scrape_date ASC
        """).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    
    @app.route("/api/volatility-by-neighborhood")
    def volatility_by_neighborhood():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT neighborhood, 
                COUNT(*) as count,
                AVG(price) as avg_price,
                AVG(price * price) - AVG(price) * AVG(price) AS variance,
                SQRT(AVG(price * price) - AVG(price) * AVG(price)) AS std_dev
            FROM silver_listings
            WHERE scrape_date >= date('now', '-7 day')
            GROUP BY neighborhood
            HAVING count >= 3
            ORDER BY std_dev DESC
            LIMIT 10
        """).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    
    @app.route("/api/avg-volatility")
    def avg_volatility():
        conn = get_db_connection()
        row = conn.execute("""
            SELECT AVG(price_std_dev) AS avg_volatility
            FROM gold_metrics
            WHERE scrape_date >= date('now', '-7 day')
        """).fetchone()
        conn.close()
        return jsonify(dict(row) if row else {})
    
    @app.route("/api/fastest-market")
    def fastest_market():
        conn = get_db_connection()
        row = conn.execute("""
            SELECT neighborhood, AVG(listing_age) AS avg_days
            FROM (
                SELECT neighborhood, unit_id, COUNT(DISTINCT scrape_date) AS listing_age
                FROM silver_listings
                WHERE scrape_date >= date('now', '-7 day')
                   AND neighborhood != 'General Area'        
                GROUP BY neighborhood, unit_id
            )
            GROUP BY neighborhood
            ORDER BY avg_days ASC
            LIMIT 1
        """).fetchone()
        conn.close()
        return jsonify(dict(row) if row else {})
    
    @app.route("/api/median-lifespan")
    def median_lifespan():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT COUNT(DISTINCT scrape_date) AS listing_age
            FROM (
                SELECT 
                unit_id || '|' || LOWER(title) || '|' || LOWER(unit_name) || '|' || beds || '|' || baths || '|' || sqft AS signature,
                scrape_date
                FROM silver_listings
                WHERE scrape_date >= date('now', '-7 day')
            ) sub
            WHERE signature NOT IN (
                SELECT 
                unit_id || '|' || LOWER(title) || '|' || LOWER(unit_name) || '|' || beds || '|' || baths || '|' || sqft AS signature
                FROM silver_listings
                WHERE scrape_date = date('now')
            )
            GROUP BY signature
        """).fetchall()
        conn.close()

        ages = [row["listing_age"] for row in rows]
        ages.sort()
        n = len(ages)
        if n == 0:
            median = None
        elif n % 2 == 1:
            median = ages[n // 2]
        else:
            median = (ages[n // 2 - 1] + ages[n // 2]) / 2

        return jsonify({"median_days": int(median) if median is not None else None})

    
    @app.route("/api/max-price-drop")
    def max_price_drop():
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT current.unit_id,
                current.price AS current_price,
                prev.price AS prev_price,
                current.scrape_date AS current_scrape_date,
                prev.scrape_date AS prev_scrape_date
            FROM silver_listings current
            JOIN silver_listings prev
            ON current.unit_id = prev.unit_id
            AND current.title = prev.title
            AND current.unit_name = prev.unit_name
            AND current.beds = prev.beds
            AND current.baths = prev.baths
            AND current.sqft = prev.sqft
            AND julianday(current.scrape_date) = julianday(prev.scrape_date) + 1
            WHERE current.scrape_date >= date('now', '-7 day')
            AND current.price IS NOT NULL
            AND prev.price IS NOT NULL
            AND current.price < prev.price
        """).fetchall()

        conn.close()

        # 🔥 DEBUG PRINT ALL ROWS
        for row in rows:
            logging.info(f"unit_id: {row['unit_id']}, current: {row['current_price']}, prev: {row['prev_price']}, dates: {row['current_scrape_date']} / {row['prev_scrape_date']}")

        # compute deltas
        drops = []
        for row in rows:
            if row["current_price"] is not None and row["prev_price"] is not None:
                delta = row["current_price"] - row["prev_price"]
                if delta < 0:
                    drops.append(delta)

        logging.info(f"Collected {len(drops)} price drops: {drops}")

        if drops:
            max_drop = min(drops)
        else:
            max_drop = None

        return jsonify({"max_drop": max_drop})



    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")





    
    return app

    

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
