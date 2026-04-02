/**
 * dashboard.js — Decision-driven home page
 */

let dashboardRange = 'week';

function renderDashboard() {
  const kpis = DATA.dashboardKPIs[dashboardRange];
  const totalARR = DATA.atRiskAccounts.reduce((s, a) => {
    return s + parseFloat(a.arr);
  }, 0).toFixed(1);

  return `
  ${UI.sectionHead('Home', 'What needs your attention today',
    `<div class="dash-controls">
      <select class="select" id="dash-range">
        <option value="today"${dashboardRange === 'today' ? ' selected' : ''}>Today</option>
        <option value="week"${dashboardRange === 'week' ? ' selected' : ''}>This Week</option>
        <option value="month"${dashboardRange === 'month' ? ' selected' : ''}>This Month</option>
      </select>
    </div>`
  )}

  <div class="grid-4 mb-6" id="kpi-row">
    ${kpis.map(k => UI.kpiCard(k.title, k.value, k.delta, k.dir, k.label, k.color)).join('')}
  </div>

  <div class="grid-2-1 mb-4">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Needs Attention</span>
        <span class="badge badge-red">${DATA.attentionItems.length}</span>
      </div>
      <div class="attention-list" id="attention-list">
        ${DATA.attentionItems.map(a => UI.attentionRow(a.icon, a.text, a.badge, a.page)).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">At Risk Accounts</span>
        <span class="badge badge-red">${totalARR}M NOK</span>
      </div>
      ${DATA.atRiskAccounts.map(a => UI.atRiskRow(a.company, a.arr, a.tickets, a.repeats, a.status)).join('')}
    </div>
  </div>

  <div class="card mb-4">
    <div class="card-header">
      <span class="card-title">Weekly Volume</span>
      ${UI.badge('This week vs last', 'badge-gray')}
    </div>
    ${UI.barChart('dash-chart', DATA.weeklyChart, DATA.weeklyLabels)}
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Recent Activity</span></div>
    <div class="timeline">
      ${DATA.activity.map(a => UI.timelineItem(a.title, a.time, a.active)).join('')}
    </div>
  </div>
  `;
}

const dashRenderFn = () => renderDashboard();

dashRenderFn.afterRender = () => {
  // Time-range selector
  document.getElementById('dash-range')?.addEventListener('change', e => {
    dashboardRange = e.target.value;
    // Re-render just the KPI row
    const kpis = DATA.dashboardKPIs[dashboardRange];
    document.getElementById('kpi-row').innerHTML =
      kpis.map(k => UI.kpiCard(k.title, k.value, k.delta, k.dir, k.label, k.color)).join('');
  });

  // Attention row clicks
  document.querySelectorAll('.attention-row[data-page]').forEach(row => {
    row.addEventListener('click', () => Router.go(row.dataset.page));
  });
};

Router.register('dashboard', dashRenderFn);
