import sqlite3
import os

# --- Setup ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "housing_tracker.db"))

def dedupe_silver():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Count how many duplicates exist
    cursor.execute('''
        SELECT COUNT(*) FROM (
            SELECT unit_id, scrape_date
            FROM silver_listings
            GROUP BY unit_id, scrape_date
            HAVING COUNT(*) > 1
        )
    ''')
    duplicates = cursor.fetchone()[0]
    print(f"[INFO] Found {duplicates} duplicate (unit_id, scrape_date) groups.")

    if duplicates == 0:
        print("[INFO] No duplicates to remove.")
    else:
        # Delete all but latest entry (highest rowid) for each unit_id + scrape_date
        cursor.execute('''
            DELETE FROM silver_listings
            WHERE rowid NOT IN (
                SELECT MAX(rowid)
                FROM silver_listings
                GROUP BY unit_id, scrape_date
            )
        ''')
        print("[SUCCESS] Removed duplicates, keeping only most recent entries.")

    # Add a UNIQUE constraint to prevent future dupes
    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_unique_unit_date
        ON silver_listings(unit_id, scrape_date)
    ''')
    print("[LOCKED] Unique constraint applied on (unit_id, scrape_date).")

    conn.commit()
    conn.close()
    print("[DONE] Database cleaned and protected.")

if __name__ == "__main__":
    dedupe_silver()
