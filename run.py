# run.py

from scraper import scraper
from cleaner import cleaner
from datetime import datetime
from meta_tracker import create_meta_table, update_last_updated

print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting housing scrape job...\n")

listings = scraper.fetch_listings()

if listings:
    scraper.save_listings_to_db(listings)
    cleaner.promote_bronze_to_silver()
    cleaner.promote_silver_to_gold()
    create_meta_table()
    update_last_updated()
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Job complete.\n")
else:
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ No listings fetched — skipping clean + promote.\n")
