import API from './api.js';
import { refreshDashboard } from './dashboard.js';

function formatCurrency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

async function loadTable() {
  const tbody = document.querySelector('#tx-table tbody');
  tbody.innerHTML = '';
  let rows;
  try {
    rows = await API.getTransactions({ limit: 100 });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">Failed to load transactions.</td></tr>`;
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">No transactions yet. Add one or import CSV.</td></tr>`;
    return;
  }
  for (const t of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${escapeHtml(t.description)}</td>
      <td>${formatCurrency(t.amount)}</td>
      <td><span class="badge">${escapeHtml(t.type)}</span></td>
      <td>${escapeHtml(t.category)}</td>
      <td>${t.vendor ? escapeHtml(t.vendor) : '—'}</td>
      <td><span class="badge ${t.status === 'flagged' ? 'badge-warn' : ''}">${escapeHtml(t.status)}</span></td>
      <td class="actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="delete">Delete</button>
      </td>`;
    tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this transaction?')) return;
      await API.deleteTransaction(t.id);
      await loadTable();
      await refreshDashboard();
    });
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export async function refreshTransactions() {
  await loadTable();
}

export function initTransactions() {
  document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      date: fd.get('date'),
      description: fd.get('description'),
      amount: Number(fd.get('amount')),
      type: fd.get('type') || 'expense',
      category: fd.get('category') || 'Uncategorised',
      vendor: fd.get('vendor') || ''
    };
    try {
      await API.addTransaction(data);
      e.target.reset();
      document.querySelector('#tx-form [name="date"]').valueAsDate = new Date();
      await loadTable();
      await refreshDashboard();
    } catch (err) {
      alert(err.error || err.message || 'Failed to add');
    }
  });

  document.getElementById('tx-csv').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await API.importCSV(file);
      alert(`Imported ${r.imported} rows.`);
      e.target.value = '';
      await loadTable();
      await refreshDashboard();
    } catch (err) {
      alert(err.error || err.message || 'Import failed');
    }
  });

  document.getElementById('btn-ai-categorise').addEventListener('click', async () => {
    const btn = document.getElementById('btn-ai-categorise');
    let rows;
    try {
      rows = await API.getTransactions({ limit: 50 });
    } catch {
      alert('Could not load transactions');
      return;
    }
    const uncategorised = rows.filter((t) => t.category === 'Uncategorised' || !t.category);
    const payload = uncategorised.length ? uncategorised : rows.slice(0, 20);
    if (!payload.length) {
      alert('No transactions to categorise.');
      return;
    }
    const batch = payload.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      vendor: t.vendor
    }));
    btn.disabled = true;
    btn.textContent = 'Categorising…';
    try {
      await API.categorise(batch);
      await loadTable();
      await refreshDashboard();
    } catch (err) {
      alert(err.error || err.message || 'Categorisation failed.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'AI categorise';
    }
  });

  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.querySelector('#tx-form [name="date"]');
  if (dateInput) dateInput.value = today;

  loadTable();
}
