// ── QA SUMMARY ──
Router.register('qa-summary', () => `
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
      <table class="table">
        <thead><tr><th>Agent</th><th>Tickets</th><th>Avg Score</th><th>Flags</th></tr></thead>
        <tbody>
          ${DATA.qaAgents.map(a => `
            <tr>
              <td>${UI.agentChip(a.initials, a.name)}</td>
              <td>${a.tickets}</td>
              <td class="mono" style="color:${UI.scoreColor(a.score)}">${a.score}</td>
              <td>${a.flags}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.8">
        <strong style="color:var(--yellow)">Stop:</strong> Deflecting ownership on integration issues<br>
        <strong style="color:var(--green)">Start:</strong> Acknowledging account value before responding<br>
        <strong style="color:var(--accent)">Continue:</strong> Strong accuracy & tone scores across team
      </div>
    </div>
  </div>
`);

// ── CHURN RISK ──
Router.register('churn-risk', () => `
  ${UI.sectionHead('Churn Risk', 'Tickets with detected cancellation signals')}

  <div class="grid-2-1">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Flagged Tickets</span>
        <button class="btn btn-ghost btn-sm">Filter</button>
      </div>
      <table class="table">
        <thead><tr><th>Ticket</th><th>Company</th><th>Score</th><th>CSAT Est.</th><th>Signal</th></tr></thead>
        <tbody>
          ${DATA.churnTickets.map(t => `
            <tr>
              <td class="mono">${t.id}</td>
              <td>${t.company}</td>
              <td class="mono" style="color:${UI.scoreColor(t.score)}">${t.score}</td>
              <td>⭐ ${t.csat}</td>
              <td style="color:var(--text-muted);font-size:12px">${t.signal}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
`);
