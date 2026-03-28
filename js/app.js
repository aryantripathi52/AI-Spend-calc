import { initDashboard, refreshDashboard } from './dashboard.js';
import { initTransactions } from './transactions.js';
import { initAnomalies } from './anomalies.js';
import { initSubscriptions } from './subscriptions.js';
import { initAdvisor } from './advisor.js';
import { initSettings } from './settings.js';
import API from './api.js';

function initNav() {
  const links = document.querySelectorAll('.nav a[data-section]');
  const sections = document.querySelectorAll('main section[id]');

  function show(id) {
    sections.forEach((s) => {
      s.hidden = s.id !== id;
    });
    links.forEach((a) => {
      a.classList.toggle('active', a.dataset.section === id);
    });
    history.replaceState(null, '', `#${id}`);
  }

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      show(a.dataset.section);
    });
  });

  const hash = (location.hash || '#overview').slice(1);
  const valid = [...links].some((l) => l.dataset.section === hash);
  show(valid ? hash : 'overview');
}

async function loadBudgetBanner() {
  const el = document.getElementById('budget-banner');
  if (!el) return;
  try {
    const rows = await API.getBudgetStatus();
    if (!rows.length) {
      el.hidden = true;
      return;
    }
    const over = rows.filter((r) => r.over_budget);
    if (!over.length) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = over
      .map(
        (r) =>
          `<span class="budget-chip">Over budget: <strong>${r.category}</strong> (${Number(r.spent).toFixed(0)} / ${Number(r.limit_amount).toFixed(0)})</span>`
      )
      .join('');
  } catch {
    el.hidden = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initDashboard();
  initTransactions();
  initAnomalies();
  initSubscriptions();
  initAdvisor();
  initSettings();
  loadBudgetBanner();

  document.getElementById('btn-refresh-all')?.addEventListener('click', async () => {
    await refreshDashboard();
    loadBudgetBanner();
  });

  window.addEventListener('spend-budgets-changed', () => loadBudgetBanner());
});
