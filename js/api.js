import * as storage from './storage.js';
import * as heuristics from './heuristics.js';
import { callGeminiJson } from './gemini-client.js';
import { parseCSV } from './csv.js';

function computeSummary(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const catMap = {};
  for (const t of expenses) {
    const c = t.category || 'Uncategorised';
    if (!catMap[c]) catMap[c] = { total: 0, count: 0 };
    catMap[c].total += t.amount;
    catMap[c].count += 1;
  }
  const byCategory = Object.entries(catMap)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  const monthMap = {};
  for (const t of expenses) {
    const m = (t.date || '').slice(0, 7);
    if (!m) continue;
    monthMap[m] = (monthMap[m] || 0) + t.amount;
  }
  const monthly = Object.entries(monthMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([month, tot]) => ({ month, total: tot }));

  return { total, byCategory, monthly };
}

const API = {
  async getTransactions(params = {}) {
    let rows = [...storage.getTransactions()];
    const { from, to, category, status, limit = 200 } = params;
    if (from) rows = rows.filter((t) => t.date >= from);
    if (to) rows = rows.filter((t) => t.date <= to);
    if (category) rows = rows.filter((t) => t.category === category);
    if (status) rows = rows.filter((t) => t.status === status);
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return rows.slice(0, Number(limit));
  },

  async getSummary() {
    return computeSummary(storage.getTransactions());
  },

  async addTransaction(data) {
    const t = storage.addTransaction(data);
    return { id: t.id };
  },

  async importCSV(file) {
    const text = await file.text();
    const records = parseCSV(text);
    const rows = [];
    for (const row of records) {
      const rawAmt = parseFloat(row.amount || row.Amount || row.debit || '0');
      const amt = Math.abs(rawAmt);
      const desc = row.description || row.Description || row.narration || row.Narration || '';
      const date = row.date || row.Date || '';
      if (!date || !desc) continue;
      rows.push({
        date,
        description: desc,
        amount: amt,
        type: rawAmt < 0 ? 'expense' : 'income',
        vendor: row.vendor || row.Merchant || row.merchant || null
      });
    }
    storage.importTransactions(rows);
    return { imported: rows.length };
  },

  async updateTransaction(id, data) {
    storage.updateTransaction(id, data);
    return { ok: true };
  },

  async deleteTransaction(id) {
    storage.deleteTransaction(id);
    return { ok: true };
  },

  async categorise(transactions) {
    const settings = storage.getSettings();
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
      transactions.map((t) => ({ id: t.id, description: t.description, amount: t.amount, vendor: t.vendor || '' }))
    );

    let result;
    if (settings.geminiApiKey) {
      try {
        result = await callGeminiJson(system, user, settings.geminiApiKey, settings.geminiModel || 'gemini-2.0-flash');
      } catch {
        result = heuristics.categoriseBatch(transactions);
      }
    } else {
      result = heuristics.categoriseBatch(transactions);
    }

    const list = Array.isArray(result) ? result : [result];
    for (const row of list) {
      storage.updateTransaction(row.id, {
        category: row.category,
        ai_confidence: row.confidence
      });
    }
    return list;
  },

  async detectAnomalies(transactions) {
    const settings = storage.getSettings();
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

    let result;
    if (settings.geminiApiKey) {
      try {
        result = await callGeminiJson(system, user, settings.geminiApiKey, settings.geminiModel || 'gemini-2.0-flash');
      } catch {
        result = heuristics.detectAnomaliesLocal(transactions);
      }
    } else {
      result = heuristics.detectAnomaliesLocal(transactions);
    }

    const flagged = result.flagged || [];
    for (const f of flagged) {
      storage.updateTransaction(f.id, { status: 'flagged' });
    }
    return result;
  },

  async getRecommendations(summary) {
    const settings = storage.getSettings();
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

    if (settings.geminiApiKey) {
      try {
        return await callGeminiJson(system, user, settings.geminiApiKey, settings.geminiModel || 'gemini-2.0-flash');
      } catch {
        return heuristics.recommendationsLocal(summary);
      }
    }
    return heuristics.recommendationsLocal(summary);
  },

  async generateReport(summary, month) {
    const settings = storage.getSettings();
    const system = `You are a senior finance analyst writing an executive expense summary for CFO review.
Write a concise professional narrative (3–4 paragraphs). Include:
- Total spend overview and comparison to prior period
- Top 2–3 categories and notable changes
- Any flagged anomalies worth leadership attention
- One forward-looking recommendation

Return ONLY this JSON: { "report": "<your markdown narrative here>" }`;

    const user = `Write the expense report for ${month || 'this month'}.\nData: ${JSON.stringify(summary)}`;

    if (settings.geminiApiKey) {
      try {
        return await callGeminiJson(system, user, settings.geminiApiKey, settings.geminiModel || 'gemini-2.0-flash');
      } catch {
        return heuristics.reportLocal(summary, month);
      }
    }
    return heuristics.reportLocal(summary, month);
  },

  async getSubscriptions() {
    return storage.getSubscriptions().sort((a, b) => b.amount - a.amount);
  },

  async addSubscription(data) {
    const s = storage.addSubscription(data);
    return { id: s.id };
  },

  async updateSubscription(id, data) {
    storage.updateSubscription(id, data);
    return { ok: true };
  },

  async deleteSubscription(id) {
    storage.deleteSubscription(id);
    return { ok: true };
  },

  async getMonthlyReport(month) {
    const prefix = month || new Date().toISOString().slice(0, 7);
    const transactions = storage.getTransactions().filter((t) => (t.date || '').startsWith(prefix));
    const byCategory = computeSummary(transactions.filter((t) => t.type === 'expense')).byCategory;
    const flagged = transactions.filter((t) => t.status === 'flagged');
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    return { month: prefix, transactions, byCategory, flagged, total };
  },

  async getBudgetStatus() {
    const prefix = new Date().toISOString().slice(0, 7);
    const expenses = storage.getTransactions().filter((t) => t.type === 'expense' && (t.date || '').startsWith(prefix));
    const actual = {};
    for (const t of expenses) {
      const c = t.category || 'Uncategorised';
      actual[c] = (actual[c] || 0) + t.amount;
    }
    const budgets = storage.getBudgets();
    return budgets.map((b) => ({
      ...b,
      spent: actual[b.category] || 0,
      over_budget: (actual[b.category] || 0) > b.limit_amount
    }));
  }
};

export default API;
