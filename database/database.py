# database/database.py

import sqlite3
import os
import logging

# Use dynamic path to allow deployment to Fly.io or other servers
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = "housing_tracker.db"

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_bronze_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bronze_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_name TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zipcode TEXT,
            unit_name TEXT,
            unit_id TEXT,
            price_raw TEXT,
            beds TEXT,
            baths TEXT,
            sqft TEXT,
            available_move_in_date TEXT,
            total_available_units INTEGER,
            listing_url TEXT,
            scrape_date DATE,
            scrape_timestamp TEXT
        )
    ''')

    # Add index to help future date filtering / dashboard speed
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bronze_scrape_date ON bronze_listings(scrape_date)')

    conn.commit()
    conn.close()
    logging.info("Bronze table and index ensured.")

def clear_bronze_table():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM bronze_listings')

    conn.commit()
    conn.close()
    logging.info("Bronze table cleared.")

def insert_bronze_listing(listing):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO bronze_listings (
            building_name, address, city, state, zipcode,
            unit_name, unit_id, price_raw, beds, baths, sqft,
            available_move_in_date, total_available_units,
            listing_url, scrape_date, scrape_timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        listing['building_name'],
        listing['address'],
        listing['city'],
        listing['state'],
        listing['zipcode'],
        listing['unit_name'],
        listing['unit_id'],
        listing['price_raw'],
        listing['beds'],
        listing['baths'],
        listing['sqft'],
        listing['available_move_in_date'],
        listing['total_available_units'],
        listing['listing_url'],
        listing['scrape_date'],
        listing['scrape_timestamp']
    ))

    conn.commit()
    conn.close()
