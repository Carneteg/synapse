// ── QA SUMMARY ──
const qaSummaryFn = () => `
  ${UI.sectionHead('QA Summary', 'AI-scored conversation quality',
    `${UI.freshBadge('qa')} ${UI.tableExportBtn('qa-agents-table', 'qa-agents')} <button class="btn btn-primary">▶ New Run</button>`)}

  ${UI.sourceBar('qa', 'QA Scoring Run')}
  ${UI.staleWarning('qa', 'QA scores may be outdated — consider running a new scoring pass')}

  <div class="grid-4 mb-4">
    ${UI.statCardFresh('Tickets Scored', '342',   'This run',       'qa')}
    ${UI.statCardFresh('Avg Score',      '78',    'Out of 100',     'qa', '', '', 'var(--green)')}
    ${UI.statCardFresh('Churn Flags',    '7',     'Tickets flagged','churn', '', '', 'var(--red)')}
    ${UI.statCardFresh('ARR at Risk',    '4.8M',  'NOK',           'churn', '', '', 'var(--red)')}
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><span class="card-title">Dimension Averages</span></div>
      ${DATA.qaDimensions.map(d => UI.dimBar(d.label, d.score, d.color)).join('')}
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Agent Leaderboard</span></div>
      ${UI.table({
        id: 'qa-agents-table',
        columns: [
          { key: 'name',    label: 'Agent',     render: r => UI.agentChip(r.initials, r.name) },
          { key: 'tickets', label: 'Tickets',   sortable: true, type: 'number' },
          { key: 'score',   label: 'Avg Score',  sortable: true, type: 'number', render: r => `<span class="mono" style="color:${UI.scoreColor(r.score)}">${r.score}</span>` },
          { key: 'flags',   label: 'Flags',     sortable: true, type: 'number' },
        ],
        data: DATA.qaAgents,
        pageSize: 0,
        filterable: false,
      })}
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.8">
        <strong style="color:var(--yellow)">Stop:</strong> Deflecting ownership on integration issues<br>
        <strong style="color:var(--green)">Start:</strong> Acknowledging account value before responding<br>
        <strong style="color:var(--accent)">Continue:</strong> Strong accuracy & tone scores across team
      </div>
    </div>
  </div>
`;

qaSummaryFn.afterRender = () => {
  UI.tableInit('qa-agents-table');
  UI.tableExportBtnInit('qa-agents-table', 'qa-agents', 'QA Agent Scores');
};

Router.register('qa-summary', qaSummaryFn);

// ── CHURN RISK ──
const churnRiskFn = () => `
  ${UI.sectionHead('Churn Risk', 'Tickets with detected cancellation signals',
    UI.tableExportBtn('churn-table', 'churn-risk'))}

  <div class="grid-2-1">
    <div class="card">
      <div class="card-header"><span class="card-title">Flagged Tickets</span></div>
      ${UI.table({
        id: 'churn-table',
        columns: [
          { key: 'id',      label: 'Ticket',  render: r => `<span class="mono">${r.id}</span>` },
          { key: 'company', label: 'Company', sortable: true },
          { key: 'score',   label: 'Score',   sortable: true, type: 'number', render: r => `<span class="mono" style="color:${UI.scoreColor(r.score)}">${r.score}</span>` },
          { key: 'csat',    label: 'CSAT Est.', render: r => `⭐ ${r.csat}` },
          { key: 'signal',  label: 'Signal',  render: r => `<span style="color:var(--text-muted);font-size:12px">${r.signal}</span>` },
        ],
        data: DATA.churnTickets,
        pageSize: 0,
        filterable: false,
        onRowClick: row => DrillDown.open('ticket', { id: row.id, title: row.signal, priority: 'High', sla: 'At Risk', age: '—', arr: '—' }),
      })}
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">By Agent</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${DATA.churnAgents.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            ${UI.agentChip(a.initials, a.name)}
            ${UI.badge(a.flags + ' flag' + (a.flags !== 1 ? 's' : ''), a.badge)}
          </div>
        `).join('')}
      </div>
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text-dim)">
        Total ARR at risk:
        <span style="color:var(--red);font-family:'DM Mono',monospace;font-weight:600"> NOK 4.8M</span>
      </div>
    </div>
  </div>
`;

churnRiskFn.afterRender = () => {
  UI.tableInit('churn-table');
  UI.tableExportBtnInit('churn-table', 'churn-risk', 'Churn Risk Tickets');
};

Router.register('churn-risk', churnRiskFn);

// ── QA COACHING ──
const qaCoachingFn = () => {
  const agents = [...(DATA.qaCoaching || [])].sort((a, b) => a.score - b.score);
  if (agents.length === 0) return '<div class="empty-state">No coaching data available</div>';
  const teamAvg = Math.round(agents.reduce((s, a) => s + a.score, 0) / agents.length);
  const totalFlags = agents.reduce((s, a) => s + a.flags, 0);
  const worst = agents[0];
  const bestDelta = [...agents].sort((a, b) => (b.score - b.prevScore) - (a.score - a.prevScore))[0];
  const bestDeltaVal = bestDelta.score - bestDelta.prevScore;

  return `
    ${UI.sectionHead('QA Coaching', 'Agent performance profiles with drill-down evaluations',
      `${UI.freshBadge('qa')} ${typeof Auth !== 'undefined' && Auth.hasRole('manager') ? UI.exportDropdown({ id: 'coaching', items: [{ label: 'JSON', icon: '{ }', action: 'json' }, { label: 'Print', icon: '\u2399', action: 'print' }] }) : ''}`)}

    <div class="grid-4 mb-4">
      ${UI.statCard('Team Average', teamAvg, 'Out of 100', '', '', 'var(--accent)')}
      ${UI.statCard('Needs Focus', worst.name, 'Score: ' + worst.score, '', '', 'var(--red)')}
      ${UI.statCard('Total Flags', totalFlags, 'Across team', '', '', totalFlags > 3 ? 'var(--red)' : 'var(--yellow)')}
      ${UI.statCard('Most Improved', bestDelta.name, '+' + bestDeltaVal + ' pts', '', '', 'var(--green)')}
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <span class="card-title">Current vs Redesign</span>
      </div>
      <table class="table" style="font-size:13px">
        <thead><tr><th>Feature</th><th>Current Issue</th><th>Redesign</th></tr></thead>
        <tbody>
          <tr><td>Score context</td><td style="color:var(--red)">Bare numbers, no tickets behind them</td><td style="color:var(--green)">Click-through: Agent &#8594; Ticket &#8594; Conversation + breakdown</td></tr>
          <tr><td>Coaching notes</td><td style="color:var(--red)">Static text, same for all agents</td><td style="color:var(--green)">Editable per agent, persisted with timestamps</td></tr>
          <tr><td>Worst tickets</td><td style="color:var(--red)">Not surfaced</td><td style="color:var(--green)">Sorted by score in agent drill-down, clickable</td></tr>
          <tr><td>Agent trends</td><td style="color:var(--red)">No trend data</td><td style="color:var(--green)">Delta vs last run shown on every card</td></tr>
          <tr><td>Dimension detail</td><td style="color:var(--red)">Only team-level averages</td><td style="color:var(--green)">Per-agent dimensions with team comparison</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card-header mb-2"><span class="card-title">Agent Profiles</span><span class="text-muted" style="font-size:12px;margin-left:8px">Sorted by score (needs focus first)</span></div>
    <div class="grid-4 mb-4" id="agent-cards">
      ${agents.map(a => UI.agentCard(a)).join('')}
    </div>
  `;
};

qaCoachingFn.afterRender = () => {
  document.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.agentId;
      const agent = DATA.qaCoaching.find(a => a.id === id);
      if (agent) DrillDown.open('qa-agent', agent);
    });
  });
  UI.exportDropdownInit('coaching', {
    json: () => UI.exportJSON(DATA.qaCoaching, 'qa-coaching'),
    print: () => UI.printPage('QA Coaching'),
  });
};

Router.register('qa-coaching', qaCoachingFn);
