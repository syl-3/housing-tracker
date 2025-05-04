# 🪶 Redwing: Des Moines Nest Tracker

**Redwing** is a full-stack data platform and dashboard that scrapes, cleans, and analyzes daily rental listings from Apartments.com — helping Des Moines residents find housing faster, smarter, and with historical context.

Built as a portfolio project to showcase production-grade **ETL pipelines**, **React dashboards**, and real-world **data product thinking**.

---

## 🚀 Key Features

### 📦 ETL Pipeline (Bronze → Silver → Gold)
- **Bronze Layer:** Scrapes 200+ buildings daily from Apartments.com (with Selenium)
- **Silver Layer:** Cleans data, maps ZIP codes to neighborhoods, deduplicates by unit signature
- **Gold Layer:** Computes daily medians, $/sqft, price standard deviation, and unit mix

### 🧭 Dashboard & Explorer (React + Tailwind)
- **Interactive Explore Table**
  - Search, filter, and sort listings with price badges (↑↓ $X or "New")
  - Supports scrape date selection + CSV download
- **Dashboard Tab**
  - Snapshot card: daily medians, deltas, unit mix
  - Chart.js trendline: median rent over time
- **Smart Features**
  - "Movers Today" badge logic (based on unit signature and price delta)
  - Debounced search + filter UX
  - Dynamic scrape comparison API (e.g., `/api/gold-compare?start=...&end=...`)

---

## 🧰 Tech Stack

| Layer         | Tools Used                                          |
|---------------|-----------------------------------------------------|
| Scraping      | Python, Selenium (Undetected Chromedriver), BS4     |
| Cleaning      | Pandas, Regex, SQLite, Signature Matching           |
| API Backend   | Flask (REST API)                                    |
| Frontend      | React, Vite, Tailwind CSS                           |
| Data Viz      | Chart.js (via react-chartjs-2)                      |
| Exporting     | CSV (via Blob + file-saver)                         |
| Deployment    | Fly.io (planned), GitHub Actions (CI/CD pipeline)   |

---

## 📸 Screenshots

<img src="screenshots/explore_table.png" width="100%" />
<img src="screenshots/dashboard_snapshot.png" width="100%" />

---

## 🧪 Run Locally

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
