# Base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl git

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy backend code
COPY app/app.py ./app.py

# Copy React frontend
COPY frontend ./frontend

COPY . .

COPY housing_tracker.db /app/db_volume/housing_tracker.db

# Build React
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    cd frontend && npm install && npm run build && cd ..

# Move React build into /dist (Flask static_folder="dist")
RUN cp -r frontend/dist ./dist

# Expose port for Fly.io/Gunicorn
EXPOSE 8080




# Launch Flask app via Gunicorn (for Redwing app)
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:create_app()"]
# FOR SCRAPER: 
#CMD ["python", "daily_scraper.py"]