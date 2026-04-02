/**
 * intelligence.js — Unified Intelligence Hub
 * Single page with 4 tabs: Briefing, Urgent, Accounts, Analyses
 */

let intelTab = 'briefing';

// ── TAB CONTENT RENDERERS ──

function renderBriefing() {
  return `
    ${UI.insightCard('🔴', 'Urgent: API Rate Limiting Spike',
      '14 tickets tagged <strong>api-rate-limit</strong> opened in the past 24 hours — 3.1× the weekly average. Most are from enterprise accounts. Engineering has Jira issue JR-4401 open but unresolved. Recommend proactive outreach to affected accounts.')}

    ${UI.insightCard('📈', 'Trending Pattern: CSV Export',
      '8 tickets this week mention CSV export failures on datasets above 50k rows. All resolved individually but no root-cause fix. Mastermind search shows this pattern recurs quarterly — likely tied to memory limits on the export service.', 'good')}

    ${UI.insightCard('⚠️', 'Churn Signal: Acme Corp',
      'Acme Corp (NOK 3.2M ARR) has submitted 6 tickets this month, 2 flagged for churn signals. Average resolution time: 52h vs team average of 18h. Immediate escalation recommended.', 'warn')}

    <div class="grid-4 mt-4 mb-4">
      ${UI.statCard('Avg QA Score', '78', 'Out of 100', '', '', 'var(--green)')}
      ${UI.statCard('SLA Compliance', '84%', 'This week', '', '', 'var(--yellow)')}
      ${UI.statCard('Open Tickets', '241', '12 overdue')}
      ${UI.statCard('ARR at Risk', '4.8M', 'NOK — 7 flags', '', '', 'var(--red)')}
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Weekly Ticket Volume</span></div>
      ${UI.barChart('intel-weekly-chart', DATA.weeklyChart, DATA.weeklyLabels, 'var(--accent2)')}
    </div>`;
}

function renderUrgent() {
  return `
    <div class="grid-3 mb-4">
      ${UI.statCard('Overdue SLA', DATA.pressingStats.overdue, 'Tickets past deadline', '', '', 'var(--red)')}
      ${UI.statCard('Stale Tickets', DATA.pressingStats.stale, 'No touch in 48h+', '', '', 'var(--yellow)')}
      ${UI.statCard('Blocking Jira', DATA.pressingStats.blocking, 'Open issues blocking customers')}
    </div>

    <div class="card mb-4">
      <div class="card-header"><span class="card-title">Priority Queue</span></div>
      <table class="table">
        <thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Age</th><th>SLA</th><th>ARR</th></tr></thead>
        <tbody>
          ${DATA.pressingTickets.map(t => `
            <tr>
              <td class="mono">${t.id}</td>
              <td>${t.title}</td>
              <td>${UI.priorityBadge(t.priority)}</td>
              <td>${t.age}</td>
              <td>${UI.slaBadge(t.sla)}</td>
              <td class="mono" style="color:${t.arr !== '—' ? 'var(--green)' : 'var(--text-muted)'}">${t.arr}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="divider"></div>

    <div class="grid-2 mb-4">
      <div class="card">
        <div class="card-header"><span class="card-title">Spiking Tags</span></div>
        <table class="table">
          <thead><tr><th>Tag</th><th>This Week</th><th>Last Week</th><th>Change</th></tr></thead>
          <tbody>
            ${DATA.trendingTags.map(t => `
              <tr>
                <td><span class="tag ${t.cls}">${t.tag}</span></td>
                <td>${t.thisWeek}</td>
                <td>${t.lastWeek}</td>
                <td>${UI.badge(t.change, t.changeBadge)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Keyword Frequency</span></div>
        <div>${DATA.trendingKeywords.map(k => `<span class="tag ${k.cls}">${k.word}</span>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Hourly Volume Peaks (Today)</span></div>
      ${UI.barChart('intel-hourly-chart', DATA.hourlyChart, DATA.hourlyLabels)}
    </div>`;
}

function renderAccounts() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">All Accounts — Health &amp; Quality</span></div>
      <table class="table">
        <thead>
          <tr><th>Company</th><th>Tickets (30d)</th><th>Resolution Rate</th><th>Avg Resolution</th><th>Repeat Issues</th><th>ARR (NOK)</th><th>SLA</th><th>Health</th></tr>
        </thead>
        <tbody>
          ${DATA.accountsUnified.map(a => `
            <tr>
              <td style="font-weight:500">${a.company}</td>
              <td>${a.tickets}</td>
              <td>${a.resRate}</td>
              <td style="color:${parseInt(a.avgRes) > 24 ? 'var(--red)' : 'inherit'}">${a.avgRes}</td>
              <td>${a.repeats > 0
                ? `<span style="color:${a.repeats >= 4 ? 'var(--red)' : 'var(--yellow)'}">● ${a.repeats}</span>`
                : '0'
              }</td>
              <td class="mono" style="color:var(--green)">${a.arr}</td>
              <td>${UI.badge(a.sla, a.slaBadge)}</td>
              <td>${UI.healthBadge(a.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderAnalyses() {
  return `
    <div id="analysis-config" class="analysis-config mb-4" style="display:none">
      <div class="card">
        <div class="card-header"><span class="card-title">New Analysis</span></div>
        <div class="grid-3 mb-4">
          <div>
            <label class="config-label">Scope</label>
            <select class="select" id="analysis-scope" style="width:100%;margin-top:6px">
              ${DATA.analysisScopes.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="config-label">Model</label>
            <select class="select" id="analysis-model" style="width:100%;margin-top:6px">
              <option value="claude-sonnet-4">claude-sonnet-4</option>
              <option value="claude-haiku-4">claude-haiku-4</option>
            </select>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn btn-primary" id="run-analysis-btn" style="width:100%">Run Analysis</button>
          </div>
        </div>
        <div id="analysis-status"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Analysis Archive</span></div>
      <table class="table" id="analyses-table">
        <thead><tr><th>Date</th><th>Type</th><th>Model</th><th>Summary</th><th></th></tr></thead>
        <tbody id="analyses-tbody">
          ${DATA.analyses.map(a => `
            <tr>
              <td class="mono">${a.date}</td>
              <td>${UI.badge(a.type, a.typeBadge)}</td>
              <td class="mono" style="color:var(--text-muted)">${a.model}</td>
              <td>${a.summary}</td>
              <td><button class="btn btn-ghost btn-sm">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── TAB RENDERER MAP ──
const tabRenderers = {
  briefing: renderBriefing,
  urgent: renderUrgent,
  accounts: renderAccounts,
  analyses: renderAnalyses,
};

// ── MAIN HUB RENDER ──
function renderIntelHub() {
  const overdueCount = DATA.pressingStats.overdue;
  const tabs = [
    { id: 'briefing',  label: 'Briefing' },
    { id: 'urgent',    label: 'Urgent',   badge: overdueCount > 0 ? `<span class="intel-tab-badge">${overdueCount}</span>` : '' },
    { id: 'accounts',  label: 'Accounts' },
    { id: 'analyses',  label: 'Analyses' },
  ];

  return `
    ${UI.sectionHead('Intelligence Hub', 'Unified intelligence across all sources',
      intelTab === 'analyses' ? '<button class="btn btn-primary btn-sm" id="new-analysis-btn">+ New Analysis</button>' : '',
      'pressingStats'
    )}

    <div class="intel-tabs mb-4">
      ${tabs.map(t => `
        <button class="intel-tab${t.id === intelTab ? ' active' : ''}" data-tab="${t.id}">
          ${t.label}${t.badge || ''}
        </button>
      `).join('')}
    </div>

    <div id="intel-tab-content">
      ${tabRenderers[intelTab]()}
    </div>`;
}

const intelRenderFn = () => renderIntelHub();

intelRenderFn.afterRender = () => {
  // Tab switching
  document.querySelectorAll('.intel-tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      intelTab = btn.dataset.tab;
      // Re-render the entire page content (tabs + content)
      const container = document.getElementById('page-container');
      const div = container.querySelector('.page');
      if (div) {
        div.innerHTML = renderIntelHub();
        intelRenderFn.afterRender();
      }
    });
  });

  // "New Analysis" button (in section header)
  document.getElementById('new-analysis-btn')?.addEventListener('click', () => {
    const cfg = document.getElementById('analysis-config');
    if (cfg) cfg.style.display = cfg.style.display === 'none' ? 'block' : 'none';
  });

  // "Run Analysis" button
  document.getElementById('run-analysis-btn')?.addEventListener('click', () => {
    const scope = document.getElementById('analysis-scope');
    const model = document.getElementById('analysis-model');
    const status = document.getElementById('analysis-status');
    const btn = document.getElementById('run-analysis-btn');
    if (!scope || !model || !status || !btn) return;

    btn.disabled = true;
    btn.textContent = 'Running...';
    status.innerHTML = '<span class="badge badge-blue">Running analysis...</span>';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Run Analysis';
      status.innerHTML = '<span class="badge badge-green">Complete</span>';

      // Prepend new row to table
      const tbody = document.getElementById('analyses-tbody');
      if (tbody) {
        const scopeLabel = scope.options[scope.selectedIndex].text;
        const badgeMap = { 'Daily Briefing': 'badge-blue', 'Churn Analysis': 'badge-purple', 'Quality Report': 'badge-green', 'Trending Issues': 'badge-yellow' };
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="mono">Just now</td>
          <td>${UI.badge(scopeLabel, badgeMap[scopeLabel] || 'badge-gray')}</td>
          <td class="mono" style="color:var(--text-muted)">${model.value}</td>
          <td>Analysis complete — review results</td>
          <td><button class="btn btn-ghost btn-sm">View</button></td>`;
        tbody.insertBefore(row, tbody.firstChild);
      }

      // Hide config after 1s
      setTimeout(() => {
        const cfg = document.getElementById('analysis-config');
        if (cfg) cfg.style.display = 'none';
        status.innerHTML = '';
      }, 1000);
    }, 1500);
  });
};

Router.register('intel-hub', intelRenderFn);
