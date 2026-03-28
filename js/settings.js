import * as storage from './storage.js';
import { refreshDashboard } from './dashboard.js';
import { MY_GEMINI_REFERENCE_LINK, DEFAULT_GEMINI_KEY_PAGE } from './user-links.js';

/** Order: in-memory field (unsaved) → saved Settings → paste in user-links.js → public default. */
function resolvedReferenceUrl() {
  const typed = document.getElementById('setting-ref-link')?.value?.trim() || '';
  if (typed) return typed;
  const s = storage.getSettings();
  const fromSettings = (s.geminiReferenceLink || '').trim();
  if (fromSettings) return fromSettings;
  const fromFile = (MY_GEMINI_REFERENCE_LINK || '').trim();
  if (fromFile) return fromFile;
  return DEFAULT_GEMINI_KEY_PAGE;
}

function syncOpenKeyPageHref() {
  const openLink = document.getElementById('setting-open-key-page');
  if (openLink) openLink.href = resolvedReferenceUrl();
}

function loadForm() {
  const s = storage.getSettings();
  const keyEl = document.getElementById('setting-api-key');
  const modelEl = document.getElementById('setting-model');
  const refEl = document.getElementById('setting-ref-link');
  const openLink = document.getElementById('setting-open-key-page');
  if (keyEl) keyEl.value = s.geminiApiKey || '';
  if (modelEl) modelEl.value = s.geminiModel || 'gemini-2.0-flash';
  if (refEl) refEl.value = s.geminiReferenceLink || '';
  syncOpenKeyPageHref();
}

async function renderBudgets() {
  const list = document.getElementById('budget-list');
  if (!list) return;
  const rows = storage.getBudgets();
  if (!rows.length) {
    list.innerHTML = '<p class="muted">No budgets yet. Add one below.</p>';
    return;
  }
  list.innerHTML = rows
    .map(
      (b) => `
    <div class="budget-row card card-tight" data-id="${b.id}">
      <span><strong>${escapeHtml(b.category)}</strong> — limit ${Number(b.limit_amount).toFixed(0)} / ${escapeHtml(b.period)}</span>
      <button type="button" class="btn btn-ghost btn-sm budget-del">Remove</button>
    </div>`
    )
    .join('');

  list.querySelectorAll('.budget-row').forEach((row) => {
    const id = Number(row.dataset.id);
    row.querySelector('.budget-del').addEventListener('click', () => {
      storage.deleteBudget(id);
      renderBudgets();
      refreshDashboard().catch(() => {});
      window.dispatchEvent(new Event('spend-budgets-changed'));
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function initSettings() {
  loadForm();
  renderBudgets();

  document.getElementById('setting-ref-link')?.addEventListener('input', () => syncOpenKeyPageHref());

  document.getElementById('settings-save')?.addEventListener('click', () => {
    const key = document.getElementById('setting-api-key')?.value?.trim() || '';
    const model = document.getElementById('setting-model')?.value || 'gemini-2.0-flash';
    const refLink = document.getElementById('setting-ref-link')?.value?.trim() || '';
    storage.setSettings({ geminiApiKey: key, geminiModel: model, geminiReferenceLink: refLink });
    syncOpenKeyPageHref();
    const el = document.getElementById('settings-msg');
    if (el) {
      el.textContent = 'Saved. Data stays in this browser only.';
      el.hidden = false;
      setTimeout(() => { el.hidden = true; }, 4000);
    }
  });

  document.getElementById('budget-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const category = (fd.get('budget_category') || '').trim();
    const limit = Number(fd.get('budget_limit'));
    if (!category || !limit) return;
    storage.addBudget({ category, limit_amount: limit, period: 'monthly' });
    e.target.reset();
    renderBudgets();
    refreshDashboard().catch(() => {});
    window.dispatchEvent(new Event('spend-budgets-changed'));
  });

}
