// ── QA SUMMARY ──
const qaSummaryFn = () => `
  ${UI.sectionHead('QA Summary', 'AI-scored conversation quality',
    `<button class="btn btn-primary">▶ New Run</button>`)}

  <div class="grid-4 mb-4">
    ${UI.statCard('Tickets Scored', '342',   'This run')}
    ${UI.statCard('Avg Score',      '78',    'Out of 100',    '', '', 'var(--green)')}
    ${UI.statCard('Churn Flags',    '7',     'Tickets flagged', '', '', 'var(--red)')}
    ${UI.statCard('ARR at Risk',    '4.8M',  'NOK',           '', '', 'var(--red)')}
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
};

Router.register('qa-summary', qaSummaryFn);

// ── CHURN RISK ──
const churnRiskFn = () => `
  ${UI.sectionHead('Churn Risk', 'Tickets with detected cancellation signals')}

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
};

Router.register('churn-risk', churnRiskFn);
