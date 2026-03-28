# AI Spending Tracker (static)

Pure **HTML + CSS + JavaScript**. No Node.js server. Data is stored in the browser (`localStorage`).

## Structure

```
index.html
css/styles.css
js/
  app.js          — navigation, budget banner
  api.js          — app logic (wraps storage + optional Gemini)
  storage.js      — transactions, subscriptions, budgets, settings
  csv.js          — CSV parsing
  heuristics.js   — offline categorisation, anomalies, tips, report
  gemini-client.js — optional Gemini REST from the browser
  dashboard.js, transactions.js, anomalies.js, subscriptions.js, advisor.js, settings.js
```

## Run

Open `index.html` in a browser, or serve the folder (recommended for Gemini API calls):

```bash
npx --yes serve . -p 5500
```

Then open `http://localhost:5500`.

## Features

- **Offline rules** always work: categorise, anomaly checks, generic recommendations, text report.
- **Gemini** (optional): add an API key in **Settings**. Calls go from your browser to Google; the key is stored only in `localStorage`. If the request fails (e.g. CORS on `file://`), the app falls back to heuristics.

## Old Node backend

The previous Express/SQLite backend was removed in favour of this static stack. If you still need it, restore it from version control.
