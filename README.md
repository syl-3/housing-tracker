# Redwing: Des Moines Nest Tracker

**Redwing** is a full-stack data pipeline and analytics platform tracking Des Moines rental listings daily. It scrapes live data from Apartments.com, cleans and aggregates it, and visualizes insights via a React dashboard.

Built solo to showcase production-style **ETL pipelines**, **API design**, and **interactive data visualization.**  
Deployed frontend via **Docker → Fly.io**; backend API + scraper run locally with daily automation.

---

## Live Demo

👉 [https://redwing.fly.dev](https://redwing.fly.dev)

---

## Key Features

### ETL Pipeline (Bronze → Silver → Gold)
- **Bronze Layer:** Scrapes 200+ buildings daily from Apartments.com (with Selenium)
- **Silver Layer:** Cleans data, maps ZIP codes to neighborhoods, deduplicates by unit signature
- **Gold Layer:** Computes daily medians, $/sqft, price standard deviation, and unit mix

### Dashboard & Data Explorer (React + Tailwind + Chart.js)
- **Daily Brief:** Snapshot card (medians, deltas, unit mix), trendline chart, top price drops
- **Market Watch:** Volatility tracker, unit trendlines, turnover metrics
- **Explore Nests:**
  - Sort, filter, search listings by building, unit type, beds, price, sqft
  - Price-change & “New” badges (↑↓ $X or “New” since last scrape)
  - Scrape date selector + **CSV export of filtered results**
  - Pagination, debounced search UX

---

## Tech Stack

| Layer         | Tools Used                                          |
|---------------|-----------------------------------------------------|
| Scraping      | Python, Selenium (Undetected Chromedriver), BS4     |
| Cleaning      | Regex, SQLite, Signature Matching                   |
| API Backend   | Flask (REST API), CORS                              |
| Frontend      | React, Vite, Tailwind CSS                           |
| Data Viz      | Chart.js (via react-chartjs-2)                      |
| Exporting     | CSV (via Blob + file-saver)                         |
| Deployment    | Docker (frontend) Fly.io (frontend hosting)         |
| Automation    | Windows Task Scheduler (backend scraping)           |

---

## 📸 Screenshots

### Daily Brief
<img src="https://github.com/syl-3/redwing-nest-tracker/blob/main/app/static/images/dailybrief.png?raw=true" width="100%" />

### Market Watch
<img src="https://github.com/syl-3/redwing-nest-tracker/blob/main/app/static/images/marketwatch.png?raw=true" width="100%" />

### Explore Nests
<img src="https://github.com/syl-3/redwing-nest-tracker/blob/main/app/static/images/explorenests.png?raw=true" width="100%" />

### Scraper Running Headless
<img src="https://github.com/syl-3/redwing-nest-tracker/blob/main/app/static/images/scraper_running_headless.png?raw=true" width="100%" />

---

## Project Goals
Redwing was designed to mirror real-world data workflows:
✔️ Modular ETL → API → React dashboard
✔️ Built without no-code/BI tools → manual data cleaning + SQL optimization
✔️ Fully deployed frontend (Docker → Fly.io)
✔️ Backend scraper automated via Windows Task Scheduler

✅ Built solo as a production-grade portfolio project.

---

## Run Locally
I highly recommend using the commit that states it's the final update before I changed things for deployment!

```bash
git clone https://github.com/syl-3/redwing-nest-tracker.git
cd redwing-nest-tracker

# Backend
cd backend
pip install -r requirements.txt
python run.py

# Frontend
cd ../frontend
npm install
npm run dev
bash
