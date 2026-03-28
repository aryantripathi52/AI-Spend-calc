require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(express.json());

// ── Serve frontend ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limit: max 20 AI calls per IP per minute ───────────
const aiLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
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
                'x-api-key': process.env.ANTHROPIC_API_KEY,   // ← key only here, on server
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ SpendAI running → http://localhost:${PORT}`));