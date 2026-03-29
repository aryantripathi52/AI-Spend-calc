require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(express.json());
app.set('trust proxy', 1);
// ── Serve frontend ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Config endpoint: safely serve Supabase public vars ──────
// The anon key is safe to expose to the browser (RLS protects your data),
// but keeping it in .env means it never appears in git history.
app.get('/api/config', (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(503).json({
      error: 'Supabase credentials not configured on the server.',
      hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.'
    });
  }
  res.json({ supabaseUrl: url, supabaseAnonKey: key });
});

// ── Rate limit: max 20 AI calls per IP per minute ───────────
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests — please wait a moment.' }
});

// ── Proxy route: frontend calls this, key never leaves server ─
app.post('/api/ai', aiLimiter, async (req, res) => {
  const { prompt, system } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system || 'You are SpendAI, a financial analysis assistant. Be concise and return only what is asked.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const text = data.content?.map(b => b.text || '').join('') || '';
    res.json({ result: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Local dev ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ SpendAI running → http://localhost:${PORT}`));
}

// ── Vercel serverless export ────────────────────────────────
module.exports = app;
