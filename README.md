# Housing Tracker

This project is a data pipeline and dashboard for tracking real estate rental listings.

## Current Status

✅ Web scraper (Bronze layer): extracts price, address, beds, baths, and more from Apartments.com  
✅ Data cleaning (Silver layer): normalizes price formats, fills missing data  
✅ Aggregation (Gold layer): calculates metrics like median rent and $/sqft by city and date  
🛠 Dashboard frontend: currently in development  
🧠 Predictive modeling: planned (scikit-learn linear regression)

## Tech Stack

- Python (Requests, BeautifulSoup, Pandas)
- SQLite
- Flask
- Chart.js or Plotly (for graphs — pending)
