import API from './api.js';
import { refreshDashboard } from './dashboard.js';
import { refreshTransactions } from './transactions.js';

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function initAnomalies() {
  document.getElementById('btn-detect-anomalies').addEventListener('click', async () => {
    const btn = document.getElementById('btn-detect-anomalies');
    const out = document.getElementById('anomaly-list');
    let rows;
    try {
      rows = await API.getTransactions({ limit: 200 });
    } catch {
      out.innerHTML = '<p class="muted">Could not load transactions.</p>';
      return;
    }
    if (!rows.length) {
      out.innerHTML = '<p class="muted">Add transactions first.</p>';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Analysing…';
    out.innerHTML = '';
    try {
      const result = await API.detectAnomalies(rows);
      const flagged = result.flagged || [];
      if (!flagged.length) {
        out.innerHTML = '<p class="ok">No anomalies detected.</p>';
      } else {
        out.innerHTML = flagged
          .map(
            (f) => `
          <div class="card card-tight anomaly-item severity-${escapeHtml(f.severity || 'low')}">
            <strong>ID ${f.id}</strong> <span class="badge badge-warn">${escapeHtml(f.severity || '')}</span>
            <p>${escapeHtml(f.reason || '')}</p>
          </div>`
          )
          .join('');
      }
      await refreshTransactions();
      await refreshDashboard();
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.error || err.message || 'Request failed')}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Detect anomalies';
    }
  });
}
