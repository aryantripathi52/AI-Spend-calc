# 🧾 AI-Powered Company Spending Tracker
## Complete Build Reference for AI Coder
> **Stack:** HTML + CSS + JS (Frontend) · Node.js + Express + SQLite (Backend) · Google Gemini API (AI Layer — Free)
> **Timeline:** 2 Days · **Deployment:** localhost → GitHub Pages (frontend) + Render.com (backend)
> **Cost:** $0 — All tools used are free tier

---

## 🛠️ Your Free Toolset (How to Use Each)

| Tool | Role | How to Use |
|------|------|------------|
| **Claude.ai** (this chat) | Code generator | Paste this MD file → ask "write me `routes/ai.js`" → copy output into Cursor |
| **Cursor (free tier)** | Code editor + autocomplete | Open project folder here; use Tab autocomplete while typing |
| **GitHub Copilot (free)** | Inline suggestions | Enable in Cursor via Extensions → Copilot fills in boilerplate fast |
| **ChatGPT (free)** | Debugging partner | Paste error messages here when Claude.ai is busy or you want a second opinion |
| **Gemini API (free)** | AI brain inside the app | Powers categorisation, anomaly detection, recommendations — 1500 req/day free |

### 📋 Recommended Workflow Per File
```
1. Open Claude.ai → paste this MD file
2. Say: "Using this reference, write backend/routes/ai.js completely"
3. Copy the output → paste into Cursor
4. Cursor/Copilot autocompletes as you tweak
5. If it breaks → paste error into ChatGPT → fix → done
```

---

## 🔑 Getting Your Free Gemini API Key

```
1. Go to → https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key" → select "Create in new project"
4. Copy the key → paste into backend/.env as GEMINI_API_KEY
Free limits: 15 requests/minute · 1,500 requests/day · 0 cost
```

---

## 📁 Project Structure

```
spending-tracker/
├── backend/
│   ├── server.js               # Express app entry point
│   ├── db.js                   # SQLite connection + schema init
│   ├── routes/
│   │   ├── transactions.js     # CRUD for expenses
│   │   ├── subscriptions.js    # Recurring charge tracking
│   │   ├── ai.js               # Proxy to Gemini API  ← free
│   │   └── reports.js          # Summary report generation
│   ├── middleware/
│   │   └── validate.js         # Input validation
│   ├── data/
│   │   └── spending.db         # SQLite file (auto-created)
│   └── package.json
│
├── frontend/
│   ├── index.html              # Main dashboard
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js              # All fetch calls to backend
│   │   ├── dashboard.js        # Summary cards + charts
│   │   ├── transactions.js     # Table + CSV import
│   │   ├── anomalies.js        # Anomaly panel logic
│   │   ├── subscriptions.js    # Subscription tracker
│   │   └── advisor.js          # Cost-saving panel
│   └── assets/
│
└── README.md
```

---

## 🗄️ Database Schema (SQLite)

```sql
-- Run once at startup via db.js

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT    NOT NULL,             -- ISO 8601: "2025-01-15"
  description   TEXT    NOT NULL,
  amount        REAL    NOT NULL,             -- Always positive; type determines direction
  type          TEXT    DEFAULT 'expense',    -- 'expense' | 'income'
  category      TEXT    DEFAULT 'Uncategorised', -- AI-assigned by Gemini
  vendor        TEXT,
  status        TEXT    DEFAULT 'normal',     -- 'normal' | 'flagged' | 'reviewed'
  is_recurring  INTEGER DEFAULT 0,            -- 0 or 1
  ai_confidence REAL    DEFAULT NULL,         -- 0.0–1.0 from Gemini response
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  amount        REAL    NOT NULL,
  billing_cycle TEXT    DEFAULT 'monthly',    -- 'monthly' | 'annual' | 'quarterly'
  category      TEXT,
  last_charged  TEXT,
  status        TEXT    DEFAULT 'active',     -- 'active' | 'unused' | 'cancelled'
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category     TEXT    NOT NULL UNIQUE,
  limit_amount REAL    NOT NULL,
  period       TEXT    DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS ai_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  input_hash  TEXT    UNIQUE NOT NULL,  -- SHA256 of prompt (saves Gemini quota)
  response    TEXT    NOT NULL,         -- Cached JSON response
  created_at  TEXT    DEFAULT (datetime('now'))
);
```

---

## ⚙️ Backend Setup

### `backend/package.json`
```json
{
  "name": "spending-tracker-api",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express-rate-limit": "^7.2.0",
    "multer": "^1.4.5-lts.1",
    "csv-parse": "^5.5.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

### `backend/.env`
```env
PORT=3001
GEMINI_API_KEY=AIzaSy-your-free-key-here
NODE_ENV=development
```

> ⚠️ Add `.env` and `data/` to `.gitignore` — never commit these.

---

## 🚀 `backend/server.js`

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');

const app = express();

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit AI routes to protect free Gemini quota
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 15, // stay under Gemini's 15 req/min free limit
  message: { error: 'AI rate limit reached — wait 60 seconds' }
});

app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/ai',            aiLimiter, require('./routes/ai'));
app.use('/api/reports',       require('./routes/reports'));

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
initDB();
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
```

---

## 🗃️ `backend/db.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'spending.db');
let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'expense',
      category TEXT DEFAULT 'Uncategorised',
      vendor TEXT,
      status TEXT DEFAULT 'normal',
      is_recurring INTEGER DEFAULT 0,
      ai_confidence REAL DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT DEFAULT 'monthly',
      category TEXT,
      last_charged TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      limit_amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly'
    );
    CREATE TABLE IF NOT EXISTS ai_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input_hash TEXT UNIQUE NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('✅ Database initialised');
}

module.exports = { getDB, initDB };
```

---

## 🤖 `backend/routes/ai.js` — Gemini Version

```javascript
const router = require('express').Router();
const { getDB } = require('../db');
const crypto = require('crypto');

// Gemini 1.5 Flash — free tier, fast, great at structured JSON
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

// ── Internal helper: call Gemini with caching ─────────────────────────────
async function callGemini(systemInstruction, userPrompt) {
  const db = getDB();
  const hash = crypto.createHash('sha256').update(systemInstruction + userPrompt).digest('hex');

  // Return cached result if exists (saves free quota)
  const cached = db.prepare('SELECT response FROM ai_cache WHERE input_hash = ?').get(hash);
  if (cached) return JSON.parse(cached.response);

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,          // Low = consistent, deterministic JSON
        responseMimeType: 'application/json'  // Forces pure JSON output — no markdown fences
      }
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  // responseMimeType:application/json means text is already clean JSON
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: strip any stray markdown fences just in case
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  }

  // Cache the result
  db.prepare('INSERT OR REPLACE INTO ai_cache (input_hash, response) VALUES (?, ?)').run(hash, JSON.stringify(parsed));

  return parsed;
}

// ── POST /api/ai/categorise ───────────────────────────────────────────────
// Body: { transactions: [{ id, description, amount, vendor }] }
router.post('/categorise', async (req, res) => {
  const { transactions } = req.body;
  if (!transactions?.length) return res.status(400).json({ error: 'transactions array required' });

  const system = `You are a financial transaction categorisation engine for a company expense tracker.
Categorise each transaction into exactly one of these categories:
SaaS, Travel, Payroll, Marketing, Office Supplies, Utilities, Food & Entertainment, Subscriptions, Legal & Compliance, Other.

Rules:
- AWS/GCP/Azure/hosting → SaaS
- Flights/hotels/Uber/Ola → Travel
- Salary/contractor payments → Payroll
- Ads/design/content tools → Marketing
- Return a confidence score between 0.0 and 1.0

Return ONLY a JSON array. No explanation. Example:
[{ "id": 1, "category": "SaaS", "confidence": 0.95 }]`;

  const user = JSON.stringify(
    transactions.map(t => ({ id: t.id, description: t.description, amount: t.amount, vendor: t.vendor || '' }))
  );

  try {
    const result = await callGemini(system, user);

    // Persist AI categories to DB
    const db = getDB();
    const update = db.prepare('UPDATE transactions SET category = ?, ai_confidence = ? WHERE id = ?');
    const updateMany = db.transaction((rows) => {
      for (const row of rows) update.run(row.category, row.confidence, row.id);
    });
    if (Array.isArray(result)) updateMany(result);

    res.json(Array.isArray(result) ? result : [result]);
  } catch (e) {
    console.error('Categorise error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/anomalies ────────────────────────────────────────────────
// Body: { transactions: [...] }
router.post('/anomalies', async (req, res) => {
  const { transactions } = req.body;
  if (!transactions?.length) return res.status(400).json({ error: 'transactions array required' });

  const system = `You are a spend anomaly and fraud detection engine for company expenses.
Analyse the transactions and flag any that match these patterns:
- Duplicate: same vendor + similar amount within 48 hours
- Unusually large: amount is 3x or more the average for that category
- Suspicious vendor: unrecognised, misspelled, or inconsistent with company activity
- Round number: large round-number amounts (e.g. exactly 50000) can indicate manual fraud

Return ONLY JSON in this exact format:
{ "flagged": [{ "id": <number>, "reason": "<clear explanation>", "severity": "low|medium|high" }] }
If no anomalies found, return: { "flagged": [] }`;

  const user = `Analyse these transactions:\n${JSON.stringify(transactions)}`;

  try {
    const result = await callGemini(system, user);

    // Persist flagged status to DB
    if (result.flagged?.length) {
      const db = getDB();
      const flag = db.prepare('UPDATE transactions SET status = ? WHERE id = ?');
      db.transaction(() => result.flagged.forEach(f => flag.run('flagged', f.id)))();
    }

    res.json(result);
  } catch (e) {
    console.error('Anomaly error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/recommendations ─────────────────────────────────────────
// Body: { summary: { byCategory, monthly, total } }
router.post('/recommendations', async (req, res) => {
  const { summary } = req.body;
  if (!summary) return res.status(400).json({ error: 'summary object required' });

  const system = `You are a CFO-level cost optimisation advisor.
Given company spend data, generate exactly 5 specific and actionable cost-reduction recommendations.
Be precise: name actual vendor categories, suggest real alternatives (e.g. "switch from Slack paid to Discord free").
Prioritise recommendations by estimated monthly savings.

Return ONLY this JSON:
{
  "recommendations": [
    {
      "title": "Short action title",
      "detail": "Specific explanation of what to do and why",
      "estimated_saving": "₹X/month or $X/month",
      "effort": "low|medium|high"
    }
  ]
}`;

  const user = `Company spend breakdown:\n${JSON.stringify(summary)}`;

  try {
    const result = await callGemini(system, user);
    res.json(result);
  } catch (e) {
    console.error('Recommendations error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/report ───────────────────────────────────────────────────
// Body: { summary, month }
router.post('/report', async (req, res) => {
  const { summary, month } = req.body;
  if (!summary) return res.status(400).json({ error: 'summary required' });

  const system = `You are a senior finance analyst writing an executive expense summary for CFO review.
Write a concise professional narrative (3–4 paragraphs). Include:
- Total spend overview and comparison to prior period
- Top 2–3 categories and notable changes
- Any flagged anomalies worth leadership attention
- One forward-looking recommendation

Return ONLY this JSON: { "report": "<your markdown narrative here>" }`;

  const user = `Write the expense report for ${month || 'this month'}.\nData: ${JSON.stringify(summary)}`;

  try {
    const result = await callGemini(system, user);
    res.json(result);
  } catch (e) {
    console.error('Report error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
```

---

## 🔌 `backend/routes/transactions.js`

```javascript
const router = require('express').Router();
const { getDB } = require('../db');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/transactions?from=2025-01-01&to=2025-01-31&category=SaaS&status=flagged
router.get('/', (req, res) => {
  const db = getDB();
  const { from, to, category, status, limit = 200 } = req.query;
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (from)     { sql += ' AND date >= ?'; params.push(from); }
  if (to)       { sql += ' AND date <= ?'; params.push(to); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (status)   { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY date DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(sql).all(...params));
});

// GET /api/transactions/summary
router.get('/summary', (req, res) => {
  const db = getDB();
  const total      = db.prepare(`SELECT SUM(amount) as total FROM transactions WHERE type='expense'`).get();
  const byCategory = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE type='expense' GROUP BY category ORDER BY total DESC`).all();
  const monthly    = db.prepare(`SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM transactions WHERE type='expense' GROUP BY month ORDER BY month DESC LIMIT 6`).all();
  res.json({ total: total.total || 0, byCategory, monthly });
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { date, description, amount, type = 'expense', category, vendor } = req.body;
  if (!date || !description || amount == null) return res.status(400).json({ error: 'date, description, amount required' });
  const result = getDB().prepare(`INSERT INTO transactions (date, description, amount, type, category, vendor) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(date, description, Number(amount), type, category || 'Uncategorised', vendor || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// POST /api/transactions/import — CSV upload
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let records;
  try {
    records = parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    return res.status(422).json({ error: 'CSV parse error: ' + e.message });
  }
  const db = getDB();
  const insert = db.prepare(`INSERT INTO transactions (date, description, amount, type, vendor) VALUES (?, ?, ?, ?, ?)`);
  db.transaction((rows) => {
    for (const row of rows) {
      insert.run(
        row.date || row.Date,
        row.description || row.Description || row.narration || row.Narration,
        Math.abs(parseFloat(row.amount || row.Amount || row.debit || 0)),
        parseFloat(row.amount || row.Amount || 0) < 0 ? 'expense' : 'income',
        row.vendor || row.Merchant || row.merchant || null
      );
    }
  })(records);
  res.json({ imported: records.length });
});

// PATCH /api/transactions/:id
router.patch('/:id', (req, res) => {
  const { status, category } = req.body;
  const sets = []; const params = [];
  if (status)   { sets.push('status = ?');   params.push(status); }
  if (category) { sets.push('category = ?'); params.push(category); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  getDB().prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`).run(...params, Number(req.params.id));
  res.json({ ok: true });
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  getDB().prepare('DELETE FROM transactions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
```

---

## 🔌 `backend/routes/subscriptions.js`

```javascript
const router = require('express').Router();
const { getDB } = require('../db');

router.get('/',    (_, res) => res.json(getDB().prepare('SELECT * FROM subscriptions ORDER BY amount DESC').all()));
router.post('/',   (req, res) => {
  const { name, amount, billing_cycle = 'monthly', category, last_charged, notes } = req.body;
  if (!name || amount == null) return res.status(400).json({ error: 'name and amount required' });
  const r = getDB().prepare(`INSERT INTO subscriptions (name, amount, billing_cycle, category, last_charged, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, Number(amount), billing_cycle, category || null, last_charged || null, notes || null);
  res.status(201).json({ id: r.lastInsertRowid });
});
router.patch('/:id', (req, res) => {
  const { status, notes } = req.body;
  getDB().prepare('UPDATE subscriptions SET status = ?, notes = ? WHERE id = ?').run(status, notes, Number(req.params.id));
  res.json({ ok: true });
});
router.delete('/:id', (req, res) => {
  getDB().prepare('DELETE FROM subscriptions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
```

---

## 🔌 `backend/routes/reports.js`

```javascript
const router = require('express').Router();
const { getDB } = require('../db');

router.get('/monthly', (req, res) => {
  const db = getDB();
  const prefix = req.query.month || new Date().toISOString().slice(0, 7);
  const transactions = db.prepare(`SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC`).all(`${prefix}%`);
  const byCategory   = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE date LIKE ? AND type='expense' GROUP BY category`).all(`${prefix}%`);
  const flagged      = db.prepare(`SELECT * FROM transactions WHERE date LIKE ? AND status = 'flagged'`).all(`${prefix}%`);
  res.json({ month: prefix, transactions, byCategory, flagged, total: transactions.reduce((s, t) => s + t.amount, 0) });
});

router.get('/budgets', (req, res) => {
  const db = getDB();
  const prefix  = new Date().toISOString().slice(0, 7);
  const actual  = db.prepare(`SELECT category, SUM(amount) as spent FROM transactions WHERE date LIKE ? AND type='expense' GROUP BY category`).all(`${prefix}%`);
  const budgets = db.prepare('SELECT * FROM budgets').all();
  const merged  = budgets.map(b => ({
    ...b,
    spent: actual.find(a => a.category === b.category)?.spent || 0,
    over_budget: (actual.find(a => a.category === b.category)?.spent || 0) > b.limit_amount
  }));
  res.json(merged);
});

module.exports = router;
```

---

## 🖥️ `frontend/js/api.js`

```javascript
const BASE_URL = 'http://localhost:3001/api';
// ⚠️ Before deploying: change to your Render URL
// const BASE_URL = 'https://your-app.onrender.com/api';

const API = {
  async getTransactions(params = {}) {
    const res = await fetch(`${BASE_URL}/transactions?${new URLSearchParams(params)}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async getSummary() {
    return (await fetch(`${BASE_URL}/transactions/summary`)).json();
  },
  async addTransaction(data) {
    const res = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async importCSV(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}/transactions/import`, { method: 'POST', body: fd });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async updateTransaction(id, data) {
    return (await fetch(`${BASE_URL}/transactions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    })).json();
  },

  // ── AI (proxied through backend → Gemini) ──────────────────
  async categorise(transactions) {
    const res = await fetch(`${BASE_URL}/ai/categorise`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactions })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async detectAnomalies(transactions) {
    const res = await fetch(`${BASE_URL}/ai/anomalies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactions })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async getRecommendations(summary) {
    const res = await fetch(`${BASE_URL}/ai/recommendations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async generateReport(summary, month) {
    const res = await fetch(`${BASE_URL}/ai/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, month })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ── Subscriptions ──────────────────────────────────────────
  async getSubscriptions() { return (await fetch(`${BASE_URL}/subscriptions`)).json(); },
  async addSubscription(data) {
    return (await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    })).json();
  },
  async updateSubscription(id, data) {
    return (await fetch(`${BASE_URL}/subscriptions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    })).json();
  },

  // ── Reports ────────────────────────────────────────────────
  async getMonthlyReport(month) { return (await fetch(`${BASE_URL}/reports/monthly?month=${month}`)).json(); },
  async getBudgetStatus()       { return (await fetch(`${BASE_URL}/reports/budgets`)).json(); }
};

export default API;
```

---

## 📅 2-Day Sprint Plan

### ✅ Day 1 — Backend Core + Data Pipeline

| Time | Task | Who | Tool | Output |
|------|------|-----|------|--------|
| 0–1h | Init repo, `npm init`, install deps, `.env` setup | Backend Dev | Terminal + Cursor | Repo boots |
| 1–3h | Write `db.js` + `server.js` using this MD | Backend Dev | Claude.ai → Cursor | Server starts, DB created |
| 3–5h | Write `routes/transactions.js` (GET, POST, CSV import) | Backend Dev | Claude.ai → Cursor | Transactions API live |
| 3–5h | HTML skeleton + CSS design tokens + `api.js` | Frontend Dev | Cursor + Copilot | UI shell renders |
| 5–7h | Write `routes/ai.js` (Gemini categorise endpoint) | Backend Dev | Claude.ai → Cursor | AI categorise works |
| 5–7h | Dashboard summary cards pulling from `/summary` | Frontend Dev | Cursor + Copilot | Cards show real data |
| 7–8h | Wire CSV upload UI → `/import` → `/ai/categorise` | Both | Cursor | Full import pipeline ✅ |

### ✅ Day 2 — AI Intelligence + Full UI + Ship

| Time | Task | Who | Tool | Output |
|------|------|-----|------|--------|
| 0–2h | Anomaly detection endpoint in `routes/ai.js` | Backend Dev | Claude.ai → Cursor | Flags persist to DB |
| 0–2h | Chart.js donut + bar charts from `/summary` | Frontend Dev | Cursor + Copilot | Charts functional |
| 2–4h | `routes/subscriptions.js` + Subscription tracker UI | Both | Claude.ai → Cursor | Subs page works |
| 2–4h | Recommendations endpoint + Cost Advisor panel | Backend Dev | Claude.ai → Cursor | Advisor renders 5 tips |
| 4–5h | `routes/reports.js` + over-budget alert banners | Backend Dev | Claude.ai → Cursor | Budget alerts fire |
| 5–6h | AI narrative report + export button | Both | Claude.ai → Cursor | Downloadable report |
| 6–7h | Stakeholder review with real CSV data | Finance | Browser | Validated & fixed |
| 7–8h | Deploy backend → Render, frontend → GitHub Pages | Both | Git + Render dashboard | Live URL 🚀 |

---

## 🧠 Gemini Prompt Reference

### Categorisation
```
SYSTEM: You are a financial transaction categorisation engine.
Categorise each into one of: SaaS, Travel, Payroll, Marketing, Office Supplies,
Utilities, Food & Entertainment, Subscriptions, Legal & Compliance, Other.
Return ONLY a JSON array: [{ "id": <number>, "category": "<string>", "confidence": <0.0-1.0> }]

USER: [{ "id": 1, "description": "AWS invoice Oct", "amount": 4200, "vendor": "Amazon Web Services" }]
```

### Anomaly Detection
```
SYSTEM: You are a fraud and spend anomaly detection engine.
Flag: duplicates, unusually large amounts (3x+ category average), suspicious vendors.
Return ONLY JSON: { "flagged": [{ "id": <number>, "reason": "<string>", "severity": "low|medium|high" }] }

USER: [last 30 days of transactions as JSON array]
```

### Recommendations
```
SYSTEM: You are a CFO-level cost advisor. Give exactly 5 actionable recommendations.
Name specific vendors. Suggest real free/cheaper alternatives.
Return ONLY JSON: { "recommendations": [{ "title":"...", "detail":"...", "estimated_saving":"₹X/month", "effort":"low|medium|high" }] }

USER: { SaaS: 124000, Travel: 32000, Subscriptions: 8900 ... }
```

---

## ⚠️ Pitfalls & Fixes

| Problem | Fix |
|---------|-----|
| Gemini returns markdown JSON despite `responseMimeType` | Add fallback: `.replace(/\`\`\`json\|\`\`\`/g, '').trim()` before `JSON.parse()` |
| Gemini 429 rate limit hit | Caching in `ai_cache` table means same prompt = 0 API calls. Works automatically. |
| CSV columns don't match expected names | The import route tries multiple column name variants (`date/Date`, `amount/Amount/debit`) |
| CORS error on CSV upload | `multer` must be declared before route handlers in `server.js` |
| API key leaked to frontend | `GEMINI_API_KEY` lives only in `.env` on backend — frontend never sees it |
| Duplicate rows on re-upload | Add a unique index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_tx ON transactions(date, description, amount)` |
| Gemini free quota runs out (1500/day) | Cache handles repeated calls; batch imports in groups of 20 max |

---

## 🚢 Deployment (Both Free)

### Backend → Render.com
```bash
cd backend
echo "node server.js" > Procfile
git init && git add . && git commit -m "init backend"
# Push to GitHub → Connect to render.com → New Web Service
# Build: npm install  |  Start: node server.js
# Add env var in Render dashboard: GEMINI_API_KEY = your key
```

### Frontend → GitHub Pages
```bash
# 1. Update api.js BASE_URL to your Render URL first:
#    const BASE_URL = 'https://your-app.onrender.com/api';
cd frontend
git add . && git commit -m "update api url"
git subtree push --prefix frontend origin gh-pages
```

---

## 🔒 Security Checklist

- [ ] `GEMINI_API_KEY` in `.env` only — never in frontend JS
- [ ] `.env` and `data/` added to `.gitignore`
- [ ] Rate limiter on `/api/ai/*` set to 15 req/min (matches Gemini free limit)
- [ ] `ai_cache` table active — prevents quota burnout on repeated calls
- [ ] CORS origin updated to production frontend URL before deploy
- [ ] Input validation: `amount` is a number, `date` is valid format

---

## 📦 Quick Start

```bash
# 1. Get Gemini key → https://aistudio.google.com/app/apikey

# 2. Backend
cd backend
npm install
mkdir -p data
echo "PORT=3001\nGEMINI_API_KEY=your_key_here\nNODE_ENV=development" > .env
npm run dev
# ✅ http://localhost:3001/health should return {"status":"ok"}

# 3. Frontend
cd frontend
# Open with VS Code Live Server extension on port 5500
# Or: npx serve . -p 5500
```

---

## 💬 How to Use Claude.ai to Write Each File

```
Prompt template to use in Claude.ai:

"I am building an AI Spending Tracker. Here is my full project reference: [paste this MD]

Now write the complete code for [filename] exactly as described.
Use Gemini API (not Anthropic). Do not explain, just write the full file."
```

Repeat for each file in this order:
1. `backend/package.json` + `.env`
2. `backend/db.js`
3. `backend/server.js`
4. `backend/routes/transactions.js`
5. `backend/routes/ai.js` ← most important
6. `backend/routes/subscriptions.js`
7. `backend/routes/reports.js`
8. `frontend/js/api.js`
9. `frontend/index.html`
10. `frontend/css/styles.css`
11. `frontend/js/dashboard.js`

---

*AI Spending Tracker — Free Stack Reference v2.0 | Gemini API + Node.js + SQLite*