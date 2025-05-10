@echo off
cd "C:\Users\firew\Desktop\GitHub Projects\housing-tracker"

:: 1️⃣ Run scraper and promote to gold
python run.py >> log.txt 2>&1

:: 2️⃣ Delete previous DB from Fly volume
fly ssh console -a redwing --command "rm /app/db_volume/housing_tracker.db"

:: 3️⃣ Upload new DB to Fly
(
    echo put housing_tracker.db /app/db_volume/housing_tracker.db
) | fly ssh sftp shell -a redwing

:: 4️⃣ Restart web app
fly machine restart d890122ae99418 -a redwing

echo Redwing update complete.
exit
