# scraper/scraper.py

import time
import csv
import os
import re
import logging
import warnings
import contextlib
import ctypes
import undetected_chromedriver as uc
from datetime import datetime
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from webdriver_manager.chrome import ChromeDriverManager

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.database import create_bronze_table, insert_bronze_listing

# Setup
@contextlib.contextmanager
def suppress_oserror_6():
    try:
        yield
    except OSError as e:
        if getattr(e, 'winerror', None) == 6:
            pass
        else:
            raise


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORT_DIR = os.environ.get("CSV_EXPORT_PATH", os.path.join(BASE_DIR, "../csv_exports"))
CHROME_PATH = os.environ.get("CHROMEDRIVER_PATH", ChromeDriverManager().install())

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

def fetch_listings():
    options = uc.ChromeOptions()
    options.headless = True
    options.add_argument('--user-agent=Mozilla/5.0')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    driver = uc.Chrome(driver_executable_path=CHROME_PATH, options=options)

    listings = []
    seen_building_urls = set()
    buildings_scraped = 0
    building_limit = 200 #SHOULD BE 200 as of May 2nd, 2025

    try:
        url = "https://www.apartments.com/des-moines-ia/"
        driver.get(url)
        time.sleep(5)

        page = 1
        max_pages = 10

        while page <= max_pages and buildings_scraped < building_limit:
            logging.info(f"Scraping page {page}...")
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            cards = soup.find_all('li', class_='mortar-wrapper')

            for card in cards:
                if buildings_scraped >= building_limit:
                    break

                try:
                    link_tag = card.find('a', class_='property-link', href=True)
                    if not link_tag:
                        continue
                    listing_url = link_tag['href']
                    if listing_url in seen_building_urls:
                        continue
                    seen_building_urls.add(listing_url)

                    logging.info(f"[{datetime.now().strftime('%H:%M:%S')}] Scraping building {buildings_scraped + 1} of page {page}")

                    listing_element = driver.find_element(By.XPATH, f"//a[@href='{listing_url}']")
                    driver.execute_script("arguments[0].click();", listing_element)
                    time.sleep(3)

                    building_name = get_building_name(driver)
                    floorplans = scrape_floorplans(driver, building_name, listing_url)
                    listings.extend(floorplans)

                    buildings_scraped += 1
                    driver.back()
                    time.sleep(3)

                except Exception as e:
                    logging.warning(f"Failed to scrape listing: {e}")
                    try:
                        driver.back()
                        time.sleep(3)
                    except:
                        pass
                    continue

            if buildings_scraped < building_limit:
                try:
                    next_button = driver.find_element(By.CSS_SELECTOR, 'a.next')
                    if next_button and next_button.is_enabled():
                        next_button.click()
                        page += 1
                        time.sleep(5)
                    else:
                        break
                except Exception as e:
                    logging.warning(f"No next button or error: {e}")
                    break

    finally:

        with suppress_oserror_6():
            driver.quit()
            del driver

            
        
        




    return listings, buildings_scraped

def get_building_name(driver):
    try:
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        title_tag = soup.find('h1', class_='propertyName')
        return title_tag.get_text(strip=True) if title_tag else None
    except:
        return None

def scrape_floorplans(driver, building_name, listing_url):
    try:
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        floorplans = []

        address = city = state = zipcode = None
        address_block = soup.find('div', class_='propertyAddressRow')
        if address_block:
            address_span = address_block.find('span', class_='delivery-address')
            if address_span:
                address = address_span.get_text(strip=True)
                city_span = address_span.find_next_sibling('span')
                if city_span:
                    city = city_span.get_text(strip=True)
                statezip_container = address_block.find('span', class_='stateZipContainer')
                if statezip_container:
                    state_zip_spans = statezip_container.find_all('span')
                    if len(state_zip_spans) >= 2:
                        state = state_zip_spans[0].get_text(strip=True)
                        zipcode = state_zip_spans[1].get_text(strip=True)

        seen_unit_ids = set()
        available_units = None
        availability_header = soup.find('div', class_='availability')
        if availability_header:
            match = re.search(r'(\d+)', availability_header.get_text(strip=True))
            if match:
                available_units = int(match.group(1))

        unit_cards = soup.find_all('li', class_='unitContainer js-unitContainerV3')
        for unit in unit_cards:
            unit_id = unit.get('data-unit')
            if unit_id in seen_unit_ids:
                continue
            seen_unit_ids.add(unit_id)

            unit_name = unit.get('data-model')
            beds = unit.get('data-beds')
            baths = unit.get('data-baths')

            price_raw = unit.find('div', class_='pricingColumn')
            sqft_raw = unit.find('div', class_='sqftColumn')
            available_move_in_date = unit.find('div', class_='availableColumn')

            sqft = None
            if sqft_raw:
                match = re.search(r'(\d{3,5})', sqft_raw.get_text(strip=True).replace(',', ''))
                if match:
                    sqft = match.group(1)

            floorplans.append({
                "building_name": building_name,
                "address": address,
                "city": city,
                "state": state,
                "zipcode": zipcode,
                "unit_name": unit_name,
                "unit_id": unit_id,
                "price_raw": price_raw.get_text(strip=True) if price_raw else None,
                "beds": beds,
                "baths": baths,
                "sqft": sqft,
                "available_move_in_date": available_move_in_date.get_text(strip=True) if available_move_in_date else None,
                "total_available_units": available_units,
                "listing_url": listing_url,
                "scrape_date": datetime.now().date(),
                "scrape_timestamp": datetime.now().isoformat()
            })

        return floorplans
    except Exception as e:
        logging.warning(f"Failed to scrape floorplans from {listing_url}: {e}")
        return []

def save_listings_to_csv(listings):
    os.makedirs(EXPORT_DIR, exist_ok=True)
    today_str = datetime.now().strftime("%Y-%m-%d")
    filepath = os.path.join(EXPORT_DIR, f"scraped_{today_str}.csv")

    with open(filepath, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=listings[0].keys())
        writer.writeheader()
        for listing in listings:
            writer.writerow(listing)

    logging.info(f"📝 Saved {len(listings)} listings to {filepath}")

def save_listings_to_db(listings):
    create_bronze_table()
    for listing in listings:
        insert_bronze_listing(listing)
    logging.info(f"Inserted {len(listings)} listings into bronze_listings table.")

if __name__ == "__main__":
    listings = fetch_listings()
    if listings:
        os.makedirs(EXPORT_DIR, exist_ok=True)  # <-- explicitly make sure it's created
        save_listings_to_csv(listings)
        save_listings_to_db(listings)
    else:
        logging.warning("No listings fetched.")