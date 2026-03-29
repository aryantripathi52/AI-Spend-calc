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
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI service not configured. Missing GEMINI_API_KEY.' });
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: system || 'You are SpendAI, an expert Indian corporate finance assistant. Always use ₹ for currency. Be concise.' }]
                    },
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );
        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error.message });
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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