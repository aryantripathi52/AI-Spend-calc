const KEY = 'spend_tracker_v1';

function defaultState() {
  return {
    transactions: [],
    subscriptions: [],
    budgets: [],
    aiCache: {},
    nextTxId: 1,
    nextSubId: 1,
    nextBudgetId: 1
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return {
      ...defaultState(),
      ...s,
      transactions: Array.isArray(s.transactions) ? s.transactions : [],
      subscriptions: Array.isArray(s.subscriptions) ? s.subscriptions : [],
      budgets: Array.isArray(s.budgets) ? s.budgets : [],
      aiCache: s.aiCache && typeof s.aiCache === 'object' ? s.aiCache : {}
    };
  } catch {
    return defaultState();
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getState() {
  return read();
}

export function getSettings() {
  try {
    const raw = localStorage.getItem('spend_tracker_settings');
    if (!raw) return { geminiApiKey: '', geminiModel: 'gemini-2.0-flash', geminiReferenceLink: '' };
    return { geminiApiKey: '', geminiModel: 'gemini-2.0-flash', geminiReferenceLink: '', ...JSON.parse(raw) };
  } catch {
    return { geminiApiKey: '', geminiModel: 'gemini-2.0-flash', geminiReferenceLink: '' };
  }
}

export function setSettings(partial) {
  const cur = getSettings();
  localStorage.setItem('spend_tracker_settings', JSON.stringify({ ...cur, ...partial }));
}

export function getTransactions() {
  return read().transactions;
}

export function addTransaction(row) {
  const s = read();
  const id = s.nextTxId++;
  const t = {
    id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    type: row.type || 'expense',
    category: row.category || 'Uncategorised',
    vendor: row.vendor || null,
    status: row.status || 'normal',
    is_recurring: row.is_recurring ? 1 : 0,
    ai_confidence: row.ai_confidence ?? null,
    created_at: new Date().toISOString()
  };
  s.transactions.push(t);
  save(s);
  return t;
}

export function updateTransaction(id, patch) {
  const s = read();
  const i = s.transactions.findIndex((x) => x.id === Number(id));
  if (i === -1) return false;
  s.transactions[i] = { ...s.transactions[i], ...patch };
  save(s);
  return true;
}

export function deleteTransaction(id) {
  const s = read();
  s.transactions = s.transactions.filter((x) => x.id !== Number(id));
  save(s);
}

export function getSubscriptions() {
  return read().subscriptions;
}

export function addSubscription(row) {
  const s = read();
  const id = s.nextSubId++;
  const sub = {
    id,
    name: row.name,
    amount: Number(row.amount),
    billing_cycle: row.billing_cycle || 'monthly',
    category: row.category || null,
    last_charged: row.last_charged || null,
    status: row.status || 'active',
    notes: row.notes || null
  };
  s.subscriptions.push(sub);
  save(s);
  return sub;
}

export function updateSubscription(id, patch) {
  const s = read();
  const i = s.subscriptions.findIndex((x) => x.id === Number(id));
  if (i === -1) return false;
  s.subscriptions[i] = { ...s.subscriptions[i], ...patch };
  save(s);
  return true;
}

export function deleteSubscription(id) {
  const s = read();
  s.subscriptions = s.subscriptions.filter((x) => x.id !== Number(id));
  save(s);
}

export function getBudgets() {
  return read().budgets;
}

export function addBudget({ category, limit_amount, period = 'monthly' }) {
  const s = read();
  const id = s.nextBudgetId++;
  const existing = s.budgets.findIndex((b) => b.category === category);
  if (existing >= 0) {
    s.budgets[existing].limit_amount = Number(limit_amount);
    s.budgets[existing].period = period;
    save(s);
    return s.budgets[existing];
  }
  const b = { id, category, limit_amount: Number(limit_amount), period };
  s.budgets.push(b);
  save(s);
  return b;
}

export function deleteBudget(id) {
  const s = read();
  s.budgets = s.budgets.filter((b) => b.id !== Number(id));
  save(s);
}

export function getAiCacheEntry(hash) {
  return read().aiCache[hash] || null;
}

export function setAiCacheEntry(hash, responseJsonString) {
  const s = read();
  s.aiCache[hash] = responseJsonString;
  save(s);
}

export function importTransactions(rows) {
  const s = read();
  for (const row of rows) {
    const id = s.nextTxId++;
    s.transactions.push({
      id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      type: row.type,
      category: 'Uncategorised',
      vendor: row.vendor || null,
      status: 'normal',
      is_recurring: 0,
      ai_confidence: null,
      created_at: new Date().toISOString()
    });
  }
  save(s);
}
