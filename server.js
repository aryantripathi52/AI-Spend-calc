require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        return res.status(503).json({ error: 'Supabase credentials not configured.' });
    }
    res.json({ supabaseUrl: url, supabaseAnonKey: key });
});

const aiLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many requests — please wait a moment.' }
});

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
                model: 'claude-sonnet-4-5',
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

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`SpendAI running on http://localhost:${PORT}`));
}

module.exports = app;
