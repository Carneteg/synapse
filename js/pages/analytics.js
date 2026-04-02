// ── FRESHDESK ANALYTICS ──
Router.register('stats-freshdesk', () => `
  ${UI.sectionHead('Freshdesk Analytics', 'Raw ticket operational data')}

  <div class="grid-4 mb-4">
    ${UI.statCard('Open',     DATA.freshdeskStats.open,     '', '', '', 'var(--yellow)')}
    ${UI.statCard('Resolved', DATA.freshdeskStats.resolved, '', '', '', 'var(--green)')}
    ${UI.statCard('Pending',  DATA.freshdeskStats.pending)}
    ${UI.statCard('Closed',   DATA.freshdeskStats.closed)}
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><span class="card-title">By Priority</span></div>
      ${DATA.freshdeskPriority.map(p => `
        <div class="source-row">
          <div class="source-dot" style="background:${p.color}"></div>
          <div class="source-name">${p.label}</div>
          <div class="source-count">${p.count}</div>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Top Tags</span></div>
      <div>
        ${DATA.freshdeskTags.map(t => `<span class="tag ${t.cls}">${t.word}</span>`).join('')}
      </div>
    </div>
  </div>
`);

// ── JIRA ANALYTICS ──
Router.register('stats-jira', () => `
  ${UI.sectionHead('Jira Analytics', "Engineering backlog from support's perspective")}

  <div class="grid-4 mb-4">
    ${UI.statCard('Open Issues',      DATA.jiraStats.open,       '', '', '', 'var(--yellow)')}
    ${UI.statCard('In Progress',      DATA.jiraStats.inProgress, '', '', '', 'var(--accent)')}
    ${UI.statCard('Resolved (30d)',   DATA.jiraStats.resolved,   '', '', '', 'var(--green)')}
    ${UI.statCard('Avg Resolution',   DATA.jiraStats.avgRes)}
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Freshdesk ↔ Jira Correlation</span></div>
    <table class="table">
      <thead><tr><th>Customer Tag</th><th>Linked Jira Issue</th><th>Status</th><th>Customer Tickets</th></tr></thead>
      <tbody>
        ${DATA.jiraCorrelation.map(r => `
          <tr>
            <td><span class="tag">${r.tag}</span></td>
            <td class="mono">${r.issue}</td>
            <td>${UI.badge(r.status, r.statusBadge)}</td>
            <td>${r.tickets}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`);

// ── ATTACHMENT ANALYTICS ──
Router.register('stats-attachments', () => `
  ${UI.sectionHead('Attachment Analytics', 'File processing status')}

  <div class="grid-3 mb-4">
    ${UI.statCard('Total Attachments', DATA.attachmentStats.total.toLocaleString())}
    ${UI.statCard('Text Extracted',    DATA.attachmentStats.extracted.toLocaleString(), '', '', '', 'var(--green)')}
    ${UI.statCard('Pending',           DATA.attachmentStats.pending, '', '', '', 'var(--yellow)')}
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">By Content Type</span></div>
    ${DATA.attachmentTypes.map(t => UI.progressRow(
      `${t.label} (${t.count.toLocaleString()})`, t.pct, t.color
    )).join('')}
  </div>
`);
