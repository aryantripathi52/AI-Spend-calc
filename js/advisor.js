import API from './api.js';

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function initAdvisor() {
  document.getElementById('btn-recommendations').addEventListener('click', async () => {
    const btn = document.getElementById('btn-recommendations');
    const out = document.getElementById('advisor-list');
    btn.disabled = true;
    btn.textContent = 'Loading…';
    out.innerHTML = '';
    try {
      const summary = await API.getSummary();
      const result = await API.getRecommendations(summary);
      const recs = result.recommendations || [];
      if (!recs.length) {
        out.innerHTML = '<p class="muted">No recommendations returned.</p>';
        return;
      }
      out.innerHTML = recs
        .map(
          (r) => `
        <div class="card card-tight">
          <h4>${escapeHtml(r.title || '')}</h4>
          <p>${escapeHtml(r.detail || '')}</p>
          <p class="meta">
            <span class="badge">${escapeHtml(r.estimated_saving || '')}</span>
            <span class="badge">effort: ${escapeHtml(r.effort || '')}</span>
          </p>
        </div>`
        )
        .join('');
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.error || err.message || 'Failed')}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Get recommendations';
    }
  });

  document.getElementById('btn-ai-report').addEventListener('click', async () => {
    const btn = document.getElementById('btn-ai-report');
    const out = document.getElementById('report-out');
    const monthInput = document.getElementById('report-month');
    const month = monthInput.value || new Date().toISOString().slice(0, 7);
    btn.disabled = true;
    btn.textContent = 'Generating…';
    out.innerHTML = '';
    try {
      const summary = await API.getSummary();
      const result = await API.generateReport(summary, month);
      const text = result.report || '';
      out.innerHTML = `<div class="report-md">${simpleMarkdown(text)}</div>`;
    } catch (err) {
      out.innerHTML = `<p class="err">${escapeHtml(err.error || err.message || 'Failed')}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate narrative report';
    }
  });

  document.getElementById('btn-download-report').addEventListener('click', () => {
    const el = document.querySelector('#report-out .report-md');
    if (!el) return;
    const blob = new Blob([el.innerText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expense-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const rm = document.getElementById('report-month');
  if (rm) rm.value = new Date().toISOString().slice(0, 7);
}

function simpleMarkdown(md) {
  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  };
  return md
    .split(/\n\n+/)
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
}
