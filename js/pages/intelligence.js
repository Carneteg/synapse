// ── TODAY'S INSIGHT ──
Router.register('today', () => `
  ${UI.sectionHead("Today's Insight", 'AI briefing generated at 08:30 UTC',
    `<button class="btn btn-ghost btn-sm">View Previous</button>`)}

  ${UI.insightCard('🔴', 'Urgent: API Rate Limiting Spike',
    `14 tickets tagged <strong>api-rate-limit</strong> opened in the past 24 hours — 3.1× the weekly average.
     Most are from enterprise accounts. Engineering has Jira issue JR-4401 open but unresolved.
     Recommend proactive outreach to affected accounts.`)}

  ${UI.insightCard('📈', 'Trending Pattern: CSV Export',
    `8 tickets this week mention CSV export failures on datasets above 50k rows. All resolved individually
     but no root-cause fix. Mastermind search shows this pattern recurs quarterly — likely tied to memory
     limits on the export service.`, 'good')}

  ${UI.insightCard('⚠️', 'Churn Signal: Acme Corp',
    `Acme Corp (NOK 3.2M ARR) has submitted 6 tickets this month, 2 flagged for churn signals.
     Average resolution time: 52h vs team average of 18h. Immediate escalation recommended.`, 'warn')}

  <div class="grid-4 mt-4">
    ${UI.statCard('Avg QA Score',    '78',   'Out of 100',    '', '', 'var(--green)')}
    ${UI.statCard('SLA Compliance',  '84%',  'This week',     '', '', 'var(--yellow)')}
    ${UI.statCard('Open Tickets',    '241',  '12 overdue')}
    ${UI.statCard('ARR at Risk',     '4.8M', 'NOK — 7 flags', '', '', 'var(--red)')}
  </div>
`);

// ── INTELLIGENCE OVERVIEW ──
Router.register('intel-overview', () => `
  ${UI.sectionHead('Intelligence Overview', 'Volume metrics across all sources')}

  <div class="grid-3 mb-6">
    <div class="card">
      <div class="card-title mb-2">Tickets</div>
      <div style="display:flex;gap:16px">
        <div><div class="stat-big">48</div><div class="stat-label">Today</div></div>
        <div><div class="stat-big">312</div><div class="stat-label">This Week</div></div>
        <div><div class="stat-big">1,204</div><div class="stat-label">This Month</div></div>
      </div>
      <div class="stat-delta up mt-2">↑ 8% week-over-week</div>
    </div>
    <div class="card">
      <div class="card-title mb-2">Chat Sessions</div>
      <div style="display:flex;gap:16px">
        <div><div class="stat-big">19</div><div class="stat-label">Today</div></div>
        <div><div class="stat-big">143</div><div class="stat-label">This Week</div></div>
        <div><div class="stat-big">581</div><div class="stat-label">This Month</div></div>
      </div>
      <div class="stat-delta down mt-2">↓ 3% week-over-week</div>
    </div>
    <div class="card">
      <div class="card-title mb-2">CRM Pipeline</div>
      <div class="stat-big" style="color:var(--green)">NOK 42M</div>
      <div class="stat-label">Active deal value</div>
      <div class="stat-delta up mt-2">↑ 12% MoM</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Weekly Ticket Volume</span></div>
    ${UI.barChart('weekly-chart', DATA.weeklyChart, DATA.weeklyLabels, 'var(--accent2)')}
  </div>
`);

// ── TRENDING ISSUES ──
Router.register('trending', () => `
  ${UI.sectionHead('Trending Issues', 'Patterns spiking this week vs last')}

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
      <div>
        ${DATA.trendingKeywords.map(k => `<span class="tag ${k.cls}">${k.word}</span>`).join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Hourly Volume Peaks (Today)</span></div>
    ${UI.barChart('hourly-chart', DATA.hourlyChart, DATA.hourlyLabels)}
  </div>
`);

// ── PRESSING NOW ──
Router.register('pressing', () => `
  ${UI.sectionHead('Pressing Now', 'Immediate attention required')}

  <div class="grid-3 mb-4">
    ${UI.statCard('Overdue SLA',    DATA.pressingStats.overdue,   'Tickets past deadline', '', '', 'var(--red)')}
    ${UI.statCard('Stale Tickets',  DATA.pressingStats.stale,     'No touch in 48h+',      '', '', 'var(--yellow)')}
    ${UI.statCard('Blocking Jira',  DATA.pressingStats.blocking,  'Open issues blocking customers')}
  </div>

  <div class="card">
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
`);

// ── CUSTOMER HEALTH ──
Router.register('health', () => `
  ${UI.sectionHead('Customer Health', 'Account-level risk overview')}

  <div class="card">
    <table class="table">
      <thead>
        <tr><th>Company</th><th>Tickets (30d)</th><th>Resolution Rate</th><th>Repeat Issues</th><th>ARR (NOK)</th><th>Health</th></tr>
      </thead>
      <tbody>
        ${DATA.health.map(h => `
          <tr>
            <td style="font-weight:500">${h.company}</td>
            <td>${h.tickets}</td>
            <td>${h.resRate}</td>
            <td>${h.repeats > 0
              ? `<span style="color:${h.repeats >= 4 ? 'var(--red)' : 'var(--yellow)'}">● ${h.repeats}</span>`
              : '0'
            }</td>
            <td class="mono" style="color:var(--green)">${h.arr}</td>
            <td>${UI.healthBadge(h.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`);

// ── QUALITY ASSURANCE ──
Router.register('quality', () => `
  ${UI.sectionHead('Quality Assurance', 'Speed, SLA compliance & ARR context')}

  <div class="grid-4 mb-4">
    ${UI.statCard('First Response', DATA.qualityStats.firstResponse, 'Avg time')}
    ${UI.statCard('Resolution Time', DATA.qualityStats.resolution, 'Avg time')}
    ${UI.statCard('SLA Compliance', DATA.qualityStats.sla, 'Across all priorities', '', '', 'var(--yellow)')}
    ${UI.statCard('Customer Effort', DATA.qualityStats.effort, 'Avg messages/resolution')}
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">ARR-Connected — Top Accounts</span></div>
    <table class="table">
      <thead><tr><th>Company</th><th>ARR (NOK)</th><th>Open Tickets</th><th>Avg Resolution</th><th>SLA</th></tr></thead>
      <tbody>
        ${DATA.qualityArr.map(r => `
          <tr>
            <td>${r.company}</td>
            <td class="mono" style="color:var(--green)">${r.arr}</td>
            <td>${r.open}</td>
            <td style="color:${parseInt(r.avgRes) > 24 ? 'var(--red)' : 'inherit'}">${r.avgRes}</td>
            <td>${UI.badge(r.sla, r.slaBadge)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`);

// ── AI ANALYSES ──
Router.register('analyses', () => `
  ${UI.sectionHead('AI Analyses', 'Saved analysis archive')}

  <div class="card">
    <table class="table">
      <thead><tr><th>Date</th><th>Type</th><th>Model</th><th>Summary</th><th></th></tr></thead>
      <tbody>
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
  </div>
`);
