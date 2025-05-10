# daily_scraper.py

import time
import schedule
import subprocess
import sys
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

def run_scraper():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logging.info(f"Starting scheduled job at {now}")
    
    try:
        subprocess.run([sys.executable, "run.py"], check=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"Job failed: {e}")
    else:
        logging.info("Job finished successfully.")

run_scraper()
# Run once per day at 08:00
schedule.every().day.at("17:00").do(run_scraper)
####run_scraper()

if __name__ == "__main__":
    logging.info("Scheduler started. Press Ctrl+C to exit.")
    while True:
        schedule.run_pending()
        time.sleep(60)
