import sqlite3
import os
import re
import statistics
import logging

# --------------------
# Setup
# --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "../housing_tracker.db"))

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

ZIP_TO_NEIGHBORHOOD = {
    "50309": "Downtown",
    "50310": "Beaverdale",
    "50311": "Drake",
    "50312": "Sherman Hill",
    "50313": "Highland Park",
    "50314": "River Bend",
    "50315": "South Side",
    "50316": "Capitol East",
    "50317": "East Des Moines",
    "50320": "SE Des Moines",
    "50321": "Airport/SW",
    "50322": "Urbandale (DSM)",
    "50327": "Pleasant Hill",
    "50265": "Valley Junction (West Des Moines)",
    "50266": "Jordan Creek (West Des Moines)",
    "50023": "Northwest Ankeny",
    "50009": "Altoona",
    "50263": "Waukee",
    "50325": "Clive",
    "50131": "Johnston",
    "50211": "Norwalk",
    "50111": "Grimes"
}

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --------------------
# SILVER LAYER
# --------------------

def create_silver_table():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS silver_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zipcode TEXT,
            neighborhood TEXT,
            price INTEGER,
            beds INTEGER,
            baths REAL,
            sqft INTEGER,
            unit_name TEXT,
            unit_id TEXT,
            available_move_in_date TEXT,
            total_available_units INTEGER,
            listing_url TEXT,
            scrape_date DATE,
            scrape_timestamp TEXT
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_silver_date ON silver_listings(scrape_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_silver_zip ON silver_listings(zipcode)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_silver_date ON silver_listings(scrape_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_silver_zip ON silver_listings(zipcode)')

# Prevent future duplicates of (unit_id + scrape_date)
    cursor.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_unique_unit_date
        ON silver_listings(unit_id, scrape_date)
    ''')

    conn.commit()
    conn.close()
    logging.info("Silver table and indexes ensured.")

# --------------------
# Normalizers w/ Type Guards
# --------------------
def normalize_address(raw):
    return raw.strip().rstrip(',') if raw else None

def normalize_availability(raw):
    if not raw:
        return None
    cleaned = raw.replace('availability', '').replace('availibility', '')
    return cleaned.strip().title()

def normalize_price(raw):
    try:
        if not raw:
            return None
        match = re.search(r'\d+', raw.replace(',', ''))
        return int(match.group()) if match else None
    except:
        return None

def normalize_beds(raw):
    try:
        if not raw:
            return None
        if "studio" in raw.lower():
            return 0
        match = re.search(r'\d+', raw)
        return int(match.group()) if match else None
    except:
        return None

def normalize_baths(raw):
    try:
        if not raw:
            return None
        match = re.search(r'\d+(\.\d+)?', raw)
        return float(match.group()) if match else None
    except:
        return None

def normalize_sqft(raw):
    try:
        if not raw:
            return None
        match = re.search(r'\d+', raw.replace(',', ''))
        return int(match.group()) if match else None
    except:
        return None

def normalize_zip(zipcode):
    match = re.search(r'\d{5}', zipcode) if zipcode else None
    return match.group() if match else None

def normalize_city(city):
    return city.strip().title() if city else None

def normalize_state(state):
    return state.strip().upper() if state else None

def get_neighborhood(zipcode):
    return ZIP_TO_NEIGHBORHOOD.get(zipcode, "General Area")

# --------------------
# Promote Bronze → Silver
# --------------------

def promote_bronze_to_silver():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get the most recent scrape_date
    cursor.execute('SELECT scrape_date FROM bronze_listings ORDER BY scrape_timestamp DESC LIMIT 1')
    latest_date = cursor.fetchone()['scrape_date']

    # Deduplicate by unit_id and get only the latest listing per unit
    cursor.execute('''
        SELECT * FROM bronze_listings 
        WHERE scrape_timestamp IN (
            SELECT MAX(scrape_timestamp)
            FROM bronze_listings
            WHERE scrape_date = ?
            GROUP BY unit_id
        )
    ''', (latest_date,))
    rows = cursor.fetchall()



    if not rows:
        logging.warning("No bronze listings to promote.")
        return

    scrape_date = rows[0]['scrape_date']
    create_silver_table()
    cursor.execute('DELETE FROM silver_listings WHERE scrape_date = ?', (scrape_date,))
    logging.info(f"Cleared existing Silver listings for {scrape_date}")

    cleaned_rows = []
    for row in rows:
        if not row['building_name'] or not row['price_raw']:
            logging.warning(f"Skipping row with missing building name or price: {row['building_name']}, {row['price_raw']}")
            continue

        zipcode = normalize_zip(row['zipcode'])
        neighborhood = get_neighborhood(zipcode)

        cleaned = (
            row['building_name'],
            normalize_address(row['address']),
            normalize_city(row['city']),
            normalize_state(row['state']),
            zipcode,
            neighborhood,
            normalize_price(row['price_raw']),
            normalize_beds(row['beds']),
            normalize_baths(row['baths']),
            normalize_sqft(row['sqft']),
            row['unit_name'],
            row['unit_id'],
            normalize_availability(row['available_move_in_date']),
            row['total_available_units'],
            row['listing_url'],
            row['scrape_date'],
            row['scrape_timestamp']
        )
        cleaned_rows.append(cleaned)

    for cleaned in cleaned_rows:
        unit_id = cleaned[11]  # index of unit_id in the cleaned tuple
        scrape_date = cleaned[15]  # index of scrape_date in the cleaned tuple

    # Check if unit_id already exists for this scrape_date in Silver
        cursor.execute('''
            SELECT 1 FROM silver_listings
            WHERE unit_id = ? AND scrape_date = ?
            LIMIT 1
        ''', (unit_id, scrape_date))

        if cursor.fetchone():
            logging.info(f"Skipping duplicate unit_id {unit_id} for {scrape_date}")
            continue

        cursor.execute('''
            INSERT INTO silver_listings (
                title, address, city, state, zipcode, neighborhood,
                price, beds, baths, sqft,
                unit_name, unit_id,
                available_move_in_date, total_available_units,
                listing_url, scrape_date, scrape_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', cleaned)


    conn.commit()
    conn.close()
    logging.info(f"Promoted {len(cleaned_rows)} listings into silver_listings table.")

# --------------------
# GOLD LAYER
# --------------------

def create_gold_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gold_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scrape_date DATE,
            median_price REAL,
            avg_price REAL,
            median_price_per_sqft REAL,
            avg_price_per_sqft REAL,
            avg_sqft REAL,
            avg_beds REAL,
            avg_baths REAL,
            listing_count INTEGER,
            min_price REAL,
            max_price REAL,
            price_std_dev REAL,
            studio_count INTEGER,
            one_bed_count INTEGER,
            two_plus_bed_count INTEGER
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_gold_date ON gold_metrics(scrape_date)')
    conn.commit()
    conn.close()
    logging.info("Gold table and index ensured.")


def promote_silver_to_gold():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get the most recent scrape_date
# Get all distinct scrape dates in Silver
    cursor.execute('SELECT DISTINCT scrape_date FROM silver_listings ORDER BY scrape_date ASC')
    scrape_dates = [row['scrape_date'] for row in cursor.fetchall()]

    data_by_date = {}

    for date in scrape_dates:
        cursor.execute('SELECT * FROM silver_listings WHERE scrape_date = ?', (date,))
        rows = cursor.fetchall()

        for row in rows:
            date = row['scrape_date']
            if date not in data_by_date:
                data_by_date[date] = {
                    'prices': [],
                    'price_per_sqft': [],
                    'sqfts': [],
                    'beds': [],
                    'baths': [],
                    'studio_count': 0,
                    'one_bed_count': 0,
                    'two_plus_bed_count': 0,
                    'count': 0
                }

            price = row['price']
            sqft = row['sqft']
            beds = row['beds']

            if price is not None:
                data_by_date[date]['prices'].append(price)
            if price and sqft and sqft != 0:
                data_by_date[date]['price_per_sqft'].append(price / sqft)
            if sqft:
                data_by_date[date]['sqfts'].append(sqft)
            if beds is not None:
                data_by_date[date]['beds'].append(beds)
                if beds == 0:
                    data_by_date[date]['studio_count'] += 1
                elif beds == 1:
                    data_by_date[date]['one_bed_count'] += 1
                elif beds >= 2:
                    data_by_date[date]['two_plus_bed_count'] += 1
            if row['baths'] is not None:
                data_by_date[date]['baths'].append(row['baths'])

            data_by_date[date]['count'] += 1


    create_gold_table()

    for date, values in data_by_date.items():
        count = values['count']
        if count == 0 or not values['prices']:
            continue

        avg_price = sum(values['prices']) / count
        median_price = statistics.median(values['prices'])
        min_price = min(values['prices'])
        max_price = max(values['prices'])
        price_std_dev = statistics.stdev(values['prices']) if len(values['prices']) > 1 else 0

        avg_price_per_sqft = sum(values['price_per_sqft']) / len(values['price_per_sqft']) if values['price_per_sqft'] else None
        median_price_per_sqft = statistics.median(values['price_per_sqft']) if values['price_per_sqft'] else None
        avg_sqft = sum(values['sqfts']) / len(values['sqfts']) if values['sqfts'] else None
        avg_beds = sum(values['beds']) / len(values['beds']) if values['beds'] else None
        avg_baths = sum(values['baths']) / len(values['baths']) if values['baths'] else None

        studio_count = values['studio_count']
        one_bed_count = values['one_bed_count']
        two_plus_bed_count = values['two_plus_bed_count']

        cursor.execute('DELETE FROM gold_metrics WHERE scrape_date = ?', (date,))
        cursor.execute('''
            INSERT INTO gold_metrics (
                scrape_date, median_price, avg_price,
                median_price_per_sqft, avg_price_per_sqft,
                avg_sqft, avg_beds, avg_baths, listing_count,
                min_price, max_price, price_std_dev,
                studio_count, one_bed_count, two_plus_bed_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            date, median_price, avg_price,
            median_price_per_sqft, avg_price_per_sqft,
            avg_sqft, avg_beds, avg_baths, count,
            min_price, max_price, price_std_dev,
            studio_count, one_bed_count, two_plus_bed_count
        ))

    conn.commit()
    conn.close()
    logging.info(f"Promoted {len(data_by_date)} scrape days into gold_metrics table.")


# --------------------
# CLI
# --------------------

if __name__ == "__main__":
    promote_bronze_to_silver()
    promote_silver_to_gold()
