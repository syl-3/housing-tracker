# run.py

from scraper import scraper
from cleaner import cleaner
from datetime import datetime
from meta_tracker import create_meta_table, update_last_updated
import os

print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting housing scrape job...\n")

listings, building_count = scraper.fetch_listings()

expected = 200
actual = len(listings)
if actual < expected:
    print(f"[WARNING] Only scraped {building_count} of {expected} buildings.")
else:
    print(f"[INFO] Scraped full {expected} buildings successfully.")


if listings:
    # 👇 Ensure the CSV folder exists
    os.makedirs(os.path.join(os.path.dirname(__file__), "csv_exports"), exist_ok=True)

    # 👇 Save the CSV export
    scraper.save_listings_to_csv(listings)

    # 👇 Continue with normal pipeline
    scraper.save_listings_to_db(listings)
    cleaner.promote_bronze_to_silver()
    cleaner.promote_silver_to_gold()
    create_meta_table()
    update_last_updated()

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Job complete.\n")
else:
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ No listings fetched — skipping clean + promote.\n")
