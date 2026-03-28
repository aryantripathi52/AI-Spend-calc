import API from './api.js';

let donutChart;
let barChart;

function formatCurrency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export async function refreshDashboard() {
  const summary = await API.getSummary();

  document.getElementById('stat-total').textContent = formatCurrency(summary.total || 0);
  document.getElementById('stat-categories').textContent = String(summary.byCategory?.length || 0);
  const lastMonth = summary.monthly?.[0];
  document.getElementById('stat-last-month').textContent = lastMonth
    ? `${lastMonth.month}: ${formatCurrency(lastMonth.total)}`
    : '—';

  const byCat = summary.byCategory || [];
  const labels = byCat.map((c) => c.category);
  const values = byCat.map((c) => c.total);

  const donutCtx = document.getElementById('chart-donut');
  const barCtx = document.getElementById('chart-bar');

  if (donutChart) donutChart.destroy();
  if (barChart) barChart.destroy();

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b'
  ];

  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: labels.length ? colors : ['#334155'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });

  const monthly = [...(summary.monthly || [])].reverse();
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: monthly.length ? monthly.map((m) => m.month) : ['—'],
      datasets: [{
        label: 'Spend',
        data: monthly.length ? monthly.map((m) => m.total) : [0],
        backgroundColor: '#6366f1',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } }
      },
      plugins: { legend: { display: false } }
    }
  });

  return summary;
}

export function initDashboard() {
  const errEl = document.getElementById('dashboard-error');
  if (errEl) errEl.hidden = true;
  refreshDashboard().catch((e) => {
    console.error(e);
    document.getElementById('stat-total').textContent = '—';
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = 'Could not load dashboard data.';
    }
  });
}
