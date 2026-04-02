// ── AR DASHBOARD ──
Router.register('ar-dashboard', () => `
  ${UI.sectionHead('Auto-Responder', 'Drafts generated from your knowledge base',
    `${UI.freshBadge('drafts')} <button class="btn btn-primary" id="ar-run-btn">▶ Run Now</button>`)}

  ${UI.sourceBar('drafts', 'AI Draft Generation')}
  ${UI.staleWarning('drafts')}

  <div class="grid-4 mb-4">
    ${UI.statCardFresh('Drafts Generated', '143', 'All time',          'drafts')}
    ${UI.statCardFresh('Pending Review',   '5',   'Awaiting approval', 'drafts', '', '', 'var(--yellow)')}
    ${UI.statCardFresh('Approval Rate',    '78%', 'Last 30 days',      'drafts', '', '', 'var(--green)')}
    ${UI.statCardFresh('Avg Confidence',   '0.74','Score',             'drafts')}
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><span class="card-title">Drafts by Confidence</span></div>
      <div style="display:flex;align-items:flex-end;gap:12px;height:100px;padding-bottom:4px">
        ${[['High','var(--green)',55,48],['Med','var(--yellow)',38,33],['Skip','var(--red)',18,17]].map(([label,color,h,count])=>`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
            <div style="width:100%;background:${color};border-radius:4px 4px 0 0;height:${h}px;opacity:0.8"></div>
            <div style="font-size:11px;color:var(--text-muted)">${label}</div>
            <div class="mono" style="font-size:11px">${count}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Status Breakdown</span></div>
      ${[
        ['var(--green)','Sent',62],
        ['var(--accent)','Approved',19],
        ['var(--yellow)','Draft',5],
        ['var(--red)','Rejected',22],
      ].map(([color,label,count]) => `
        <div class="source-row">
          <div class="source-dot" style="background:${color}"></div>
          <div class="source-name">${label}</div>
          <div class="source-count">${count}</div>
        </div>
      `).join('')}
    </div>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'ar-dashboard') return;
  document.getElementById('ar-run-btn')?.addEventListener('click', () => Router.go('ar-drafts'));
});

// ── DRAFT QUEUE ──
Router.register('ar-drafts', () => `
  ${UI.sectionHead('Draft Queue', 'Review and approve AI-generated responses',
    typeof Auth !== 'undefined' && Auth.hasRole('manager') ? UI.exportDropdown({ id: 'drafts', items: [{ label: 'CSV', icon: '\u229E', action: 'csv' }] }) : '')}

  <div class="card mb-4">
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" style="border-color:var(--accent);color:var(--accent)">All</button>
      <button class="btn btn-ghost btn-sm">Draft (5)</button>
      <button class="btn btn-ghost btn-sm">Approved</button>
      <button class="btn btn-ghost btn-sm">Sent</button>
      <button class="btn btn-ghost btn-sm">Rejected</button>
    </div>
  </div>

  <div class="card">
    <table class="table">
      <thead><tr><th>Ticket</th><th>Subject</th><th>Confidence</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${DATA.drafts.map(d => `
          <tr>
            <td class="mono">${d.id}</td>
            <td>${d.title}</td>
            <td class="mono" style="color:${UI.confColor(d.conf)}">${d.conf}</td>
            <td>${UI.badge(d.status, 'badge-yellow')}</td>
            <td><button class="btn btn-primary btn-sm">Review</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'ar-drafts') return;
  UI.exportDropdownInit('drafts', {
    csv: () => UI.exportCSV(DATA.drafts, [
      { key: 'id', label: 'Ticket' },
      { key: 'title', label: 'Subject' },
      { key: 'conf', label: 'Confidence' },
      { key: 'status', label: 'Status' },
    ], 'ar-drafts'),
  });
});

// ── AR CONFIG ──
Router.register('ar-config', () => `
  ${UI.sectionHead('Auto-Responder Config', 'Control how drafts are generated')}

  <div class="grid-2 mb-4">
    <div class="card">
      <div class="card-header"><span class="card-title">Controls</span></div>

      <div class="config-row">
        <div>
          <div class="config-label">Enabled</div>
          <div class="config-desc">Master switch — off means nothing runs</div>
        </div>
        ${UI.toggle('toggle-enabled', true)}
      </div>

      <div class="config-row">
        <div>
          <div class="config-label">Auto-Send</div>
          <div class="config-desc">Send high-confidence drafts without review</div>
        </div>
        ${UI.toggle('toggle-autosend', false)}
      </div>

      <div class="config-row" style="flex-direction:column;align-items:flex-start">
        <div class="config-label">High Confidence Threshold</div>
        ${UI.slider('slider-high', 50, 100, 80, 'var(--accent)')}
      </div>

      <div class="config-row" style="flex-direction:column;align-items:flex-start">
        <div class="config-label">Medium Confidence Threshold</div>
        ${UI.slider('slider-med', 20, 80, 50, 'var(--yellow)')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Model Settings</span></div>

      <div class="config-row">
        <div class="config-label">Search Mode</div>
        <select class="select">
          <option>Deep GraphRAG</option>
          <option>GraphRAG</option>
          <option>Vector</option>
          <option>Distilled</option>
        </select>
      </div>

      <div class="config-row">
        <div class="config-label">Model</div>
        <select class="select">
          <option>claude-sonnet-4</option>
          <option>claude-haiku-4</option>
        </select>
      </div>

      <div class="config-row" style="flex-direction:column;align-items:flex-start">
        <div class="config-label">Temperature</div>
        ${UI.slider('slider-temp', 0, 100, 30)}
      </div>

      <div class="config-row" style="flex-direction:column;align-items:flex-start">
        <div class="config-label">Concurrency</div>
        ${UI.slider('slider-conc', 1, 20, 5)}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Disclaimer</span></div>
    <textarea class="input" rows="3" placeholder="Text appended to every generated response…">This response was drafted by AI and reviewed by a human agent. Contact support@example.com for further help.</textarea>
  </div>
`);
