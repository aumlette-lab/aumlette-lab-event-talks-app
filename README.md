# BigQuery Release Pulse

A premium web application built using **Python Flask** and **Vanilla HTML/CSS/JavaScript** that parses and displays the latest Google Cloud BigQuery Release Notes. 

## Features

- **Automated XML Parsing**: Directly fetches and splits the official BigQuery Release Notes Atom Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) into individual updates by release categories.
- **Stats Dashboard**: Live metric widgets showing counts for Features, Announcements, Changes, Breaking Changes, and Issues. Clicking on any metric card dynamically filters the feed by that specific category.
- **Text Search & Filters**: Fuzzy filter through date, category, and update content in real-time.
- **Select to Tweet**: Select one or multiple updates to automatically compile a custom structured X/Twitter post. It includes a character count indicator with circular progress bar visual alerts.
- **Single Tweet Action**: Fast-share button on individual release cards to immediately compose a post for a single update.
- **Responsive & Premium UI**: Features glassmorphic cards, custom typography using Outfit & Inter Google fonts, dynamic animations, custom scrollbar styling, and full mobile optimization.

## Running Locally

1. Navigate to the project directory:
   ```bash
   cd bq-releases-notes
   ```

2. Activate the Python virtual environment:
   ```bash
   source venv/bin/activate
   ```

3. Run the development server:
   ```bash
   python3 app.py
   ```

4. Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)
