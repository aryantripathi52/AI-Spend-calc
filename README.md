# AI Spending Tracker

**HTML + CSS + JavaScript** with data in the browser (`localStorage`).

## Hosted Gemini (recommended for a real product)

Your **API key stays on the server** only — users never paste their own key; models are allowlisted in `server.js` / `GEMINI_ALLOWED_MODELS`.

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. `npm install` then `npm start`.
3. Open `http://localhost:3000` (or your `PORT`).

`js/ai-config.js` uses `AI_PROVIDER_MODE = 'hosted'` by default.

## Bring-your-own key (dev / static hosting)

Set `AI_PROVIDER_MODE = 'byo'` in `js/ai-config.js`. Users paste a key in **Settings**; calls go from the browser to Google (same origin or `npx serve`).

## Structure

```
server.js         — Express: static files + POST /api/ai/gemini (proxy)
index.html
css/styles.css
js/
  ai-config.js    — hosted vs BYO
  app.js
  api.js
  gemini-client.js — hosted proxy or browser Gemini
  storage.js, heuristics.js, csv.js, …
```

## Static preview only

```bash
npx --yes serve . -p 5500
```

Hosted AI features need `npm start` (the proxy). Without it, the app falls back to heuristics.

## Features

- **Offline rules** always work: categorise, anomaly checks, generic recommendations, text report.
- **Gemini**: hosted proxy (your key in `.env`) or BYO key in Settings.
