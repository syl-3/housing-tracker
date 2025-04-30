# scraper/scraper.py

import time
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def fetch_listings(url):
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    driver = webdriver.Chrome(options=options)

    driver.get(url)

    # Scroll down to load more listings
    scroll_pause_time = 1
    screen_height = driver.execute_script("return window.screen.height;")   # get the screen height of the web
    i = 1

    while True:
        driver.execute_script(f"window.scrollTo(0, {screen_height}*{i});")
        i += 1
        time.sleep(scroll_pause_time)
        # Check if we've reached the bottom
        scroll_height = driver.execute_script("return document.body.scrollHeight;")
        if (screen_height) * i > scroll_height:
            break


    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CLASS_NAME, "mortar-wrapper"))
        )
    except:
        print("Timeout waiting for listings to load.")

    time.sleep(3)  # Just in case

    html = driver.page_source
    driver.quit()

    soup = BeautifulSoup(html, 'html.parser')
    listings = []

    for card in soup.find_all('li', class_='mortar-wrapper'):
        title = card.find('span', class_='js-placardTitle')
        address = card.find('div', class_='property-address')
        price = card.find('p', class_='property-pricing')
        beds = card.find('p', class_='property-beds')
        link_tag = card.find('a', class_='property-link', href=True)

        listing = {
            "title": title.get_text(strip=True) if title else None,
            "address": address.get_text(strip=True) if address else None,
            "price_raw": price.get_text(strip=True) if price else None,
            "beds_raw": beds.get_text(strip=True) if beds else None,
            "listing_url": link_tag['href'] if link_tag else None,
            "scrape_date": datetime.now().date()
        }
        listings.append(listing)

    return listings

if __name__ == "__main__":
    test_url = "https://www.apartments.com/ankeny-ia/"
    data = fetch_listings(test_url)
    for d in data:
        print(d)
