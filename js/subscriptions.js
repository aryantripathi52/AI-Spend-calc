import API from './api.js';

function formatCurrency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function render() {
  const root = document.getElementById('subs-list');
  let subs;
  try {
    subs = await API.getSubscriptions();
  } catch {
    root.innerHTML = '<p class="muted">Could not load subscriptions.</p>';
    return;
  }
  if (!subs.length) {
    root.innerHTML = '<p class="muted">No subscriptions yet.</p>';
    return;
  }
  root.innerHTML = subs
    .map(
      (s) => `
    <div class="card card-tight sub-row" data-id="${s.id}">
      <div class="sub-main">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="muted">${formatCurrency(s.amount)} / ${escapeHtml(s.billing_cycle)}</span>
        <span class="badge">${escapeHtml(s.status)}</span>
      </div>
      <div class="sub-actions">
        <select class="sub-status" aria-label="Status">
          <option value="active" ${s.status === 'active' ? 'selected' : ''}>active</option>
          <option value="unused" ${s.status === 'unused' ? 'selected' : ''}>unused</option>
          <option value="cancelled" ${s.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
        </select>
        <button type="button" class="btn btn-ghost btn-sm sub-del">Remove</button>
      </div>
    </div>`
    )
    .join('');

  root.querySelectorAll('.sub-row').forEach((row) => {
    const id = Number(row.dataset.id);
    row.querySelector('.sub-status').addEventListener('change', async (e) => {
      await API.updateSubscription(id, { status: e.target.value });
    });
    row.querySelector('.sub-del').addEventListener('click', async () => {
      if (!confirm('Remove this subscription?')) return;
      try {
        await API.deleteSubscription(id);
        await render();
      } catch (err) {
        alert(err.error || err.message || 'Failed to delete');
      }
    });
  });
}

export function initSubscriptions() {
  document.getElementById('sub-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.addSubscription({
        name: fd.get('name'),
        amount: Number(fd.get('amount')),
        billing_cycle: fd.get('billing_cycle') || 'monthly',
        category: fd.get('category') || '',
        last_charged: fd.get('last_charged') || '',
        notes: fd.get('notes') || ''
      });
      e.target.reset();
      await render();
    } catch (err) {
      alert(err.error || err.message || 'Failed');
    }
  });

  render();
}
