const RULES = [
  { re: /aws|gcp|azure|google cloud|hosting|vercel|netlify|digitalocean|heroku|github|gitlab|slack|notion|figma|zoom/i, cat: 'SaaS', conf: 0.85 },
  { re: /uber|lyft|ola|flight|hotel|airbnb|booking|train|taxi|travel/i, cat: 'Travel', conf: 0.8 },
  { re: /salary|payroll|contractor|wages|benefits/i, cat: 'Payroll', conf: 0.85 },
  { re: /ads?|facebook ads|google ads|marketing|campaign|semrush|mailchimp/i, cat: 'Marketing', conf: 0.8 },
  { re: /office|staples|supplies|printer|paper/i, cat: 'Office Supplies', conf: 0.7 },
  { re: /electric|utility|water|internet|telecom|phone/i, cat: 'Utilities', conf: 0.75 },
  { re: /restaurant|food|meal|coffee|lunch|catering|entertainment/i, cat: 'Food & Entertainment', conf: 0.72 },
  { re: /subscription|netflix|spotify|saas license/i, cat: 'Subscriptions', conf: 0.72 },
  { re: /legal|lawyer|compliance|tax advisor|audit/i, cat: 'Legal & Compliance', conf: 0.78 }
];

export function categoriseRow({ id, description, amount, vendor }) {
  const blob = `${description || ''} ${vendor || ''}`.toLowerCase();
  for (const r of RULES) {
    if (r.re.test(blob)) {
      return { id, category: r.cat, confidence: r.conf };
    }
  }
  return { id, category: 'Other', confidence: 0.45 };
}

export function categoriseBatch(transactions) {
  return transactions.map((t) => categoriseRow(t));
}

function hoursBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

export function detectAnomaliesLocal(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const byCat = {};
  for (const t of expenses) {
    const c = t.category || 'Uncategorised';
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(t);
  }
  const catAvg = {};
  for (const c of Object.keys(byCat)) {
    const arr = byCat[c];
    const sum = arr.reduce((s, x) => s + x.amount, 0);
    catAvg[c] = sum / arr.length;
  }

  const flagged = [];
  const seen = new Map();

  for (const t of expenses) {
    const key = `${(t.vendor || '').toLowerCase()}|${Math.round(t.amount * 100)}`;
    const prev = seen.get(key);
    if (prev && hoursBetween(t.date, prev.date) <= 48) {
      flagged.push({
        id: t.id,
        reason: `Possible duplicate: same vendor and amount within 48h of another charge.`,
        severity: 'medium'
      });
    }
    seen.set(key, t);

    const c = t.category || 'Uncategorised';
    const avg = catAvg[c] || 0;
    if (avg > 0 && t.amount >= avg * 3 && t.amount > 100) {
      flagged.push({
        id: t.id,
        reason: `Amount is ${(t.amount / avg).toFixed(1)}× the average for category "${c}".`,
        severity: t.amount >= avg * 5 ? 'high' : 'medium'
      });
    }

    if (t.amount >= 5000 && t.amount % 1000 === 0) {
      flagged.push({
        id: t.id,
        reason: 'Large round-number amount — worth a manual review.',
        severity: 'low'
      });
    }
  }

  const byId = new Map();
  for (const f of flagged) {
    const ex = byId.get(f.id);
    if (!ex || f.severity === 'high') byId.set(f.id, f);
  }
  return { flagged: [...byId.values()] };
}

export function recommendationsLocal(summary) {
  const by = [...(summary.byCategory || [])].sort((a, b) => b.total - a.total);
  const top = by.slice(0, 3).map((x) => x.category);
  const recs = [
    {
      title: 'Review top spend categories',
      detail: `Your largest buckets are ${top.join(', ') || 'n/a'}. Negotiate annual contracts or volume discounts where usage is predictable.`,
      estimated_saving: 'Varies',
      effort: 'medium'
    },
    {
      title: 'Consolidate overlapping SaaS tools',
      detail: 'Map each subscription to an owner and cancel duplicate analytics, chat, or storage products.',
      estimated_saving: '10–20% of SaaS line',
      effort: 'low'
    },
    {
      title: 'Set category budgets and alerts',
      detail: 'Define monthly caps per category and review variances weekly — works without any cloud backend.',
      estimated_saving: 'Prevents overspend',
      effort: 'low'
    },
    {
      title: 'Travel policy & per-diem',
      detail: 'Standardize flight/hotel class and use corporate cards with built-in controls.',
      estimated_saving: '5–15% travel',
      effort: 'medium'
    },
    {
      title: 'Revisit infrequent vendors',
      detail: 'Flag one-off high amounts and require a second approver above a threshold.',
      estimated_saving: 'Risk reduction',
      effort: 'low'
    }
  ];
  return { recommendations: recs };
}

export function reportLocal(summary, month) {
  const total = summary.total || 0;
  const cats = (summary.byCategory || []).slice(0, 3);
  const catLine = cats.map((c) => `${c.category} (${c.total.toFixed(0)})`).join(', ');
  const text = `**Spend overview (${month || 'period'})**

Total recorded expense is **${total.toFixed(2)}**. Use this as a baseline for next month.

**Category focus**

Top areas: ${catLine || 'add more categorized expenses for detail'}. Prioritize the largest lines for vendor talks or policy checks.

**Anomalies and controls**

Review flagged items in the Anomalies tab. Combine duplicate detection with approval rules for large round amounts.

**Next step**

Add budgets in Settings and keep categorising imports so trends stay trustworthy.`;
  return { report: text };
}
