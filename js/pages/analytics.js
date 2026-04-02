// ── FRESHDESK ANALYTICS ──
Router.register('stats-freshdesk', () => `
  ${UI.sectionHead('Freshdesk Analytics', 'Raw ticket operational data',
    typeof Auth !== 'undefined' && Auth.hasRole('manager') ? UI.exportDropdown({ id: 'fd-stats', items: [{ label: 'CSV', icon: '\u229E', action: 'csv' }, { label: 'Print', icon: '\u2399', action: 'print' }] }) : '')}

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

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'stats-freshdesk') return;
  UI.exportDropdownInit('fd-stats', {
    csv: () => {
      const data = [
        { label: 'Open', count: DATA.freshdeskStats.open },
        { label: 'Resolved', count: DATA.freshdeskStats.resolved },
        { label: 'Pending', count: DATA.freshdeskStats.pending },
        { label: 'Closed', count: DATA.freshdeskStats.closed },
      ];
      UI.exportCSV(data, [{ key: 'label', label: 'Status' }, { key: 'count', label: 'Count' }], 'freshdesk-stats');
    },
    print: () => UI.printPage('Freshdesk Analytics'),
  });
});

// ── JIRA ANALYTICS ──
Router.register('stats-jira', () => `
  ${UI.sectionHead('Jira Analytics', "Engineering backlog from support's perspective",
    typeof Auth !== 'undefined' && Auth.hasRole('manager') ? UI.exportDropdown({ id: 'jira-stats', items: [{ label: 'CSV', icon: '\u229E', action: 'csv' }, { label: 'Print', icon: '\u2399', action: 'print' }] }) : '')}

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

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'stats-jira') return;
  UI.exportDropdownInit('jira-stats', {
    csv: () => UI.exportCSV(DATA.jiraCorrelation, [
      { key: 'tag', label: 'Customer Tag' },
      { key: 'issue', label: 'Jira Issue' },
      { key: 'status', label: 'Status' },
      { key: 'tickets', label: 'Customer Tickets' },
    ], 'jira-correlation'),
    print: () => UI.printPage('Jira Analytics'),
  });
});

// ── ATTACHMENT ANALYTICS ──
Router.register('stats-attachments', () => `
  ${UI.sectionHead('Attachment Analytics', 'File processing status',
    typeof Auth !== 'undefined' && Auth.hasRole('manager') ? UI.exportDropdown({ id: 'att-stats', items: [{ label: 'CSV', icon: '\u229E', action: 'csv' }, { label: 'Print', icon: '\u2399', action: 'print' }] }) : '')}

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

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'stats-attachments') return;
  UI.exportDropdownInit('att-stats', {
    csv: () => UI.exportCSV(DATA.attachmentTypes, [
      { key: 'label', label: 'Content Type' },
      { key: 'count', label: 'Count' },
      { key: 'pct', label: 'Extracted %' },
    ], 'attachment-stats'),
    print: () => UI.printPage('Attachment Analytics'),
  });
});
