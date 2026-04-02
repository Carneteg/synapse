// ── ADMIN CONFIG PANEL (rendered only for admin role) ──
function renderAdminConfigPanel() {
  if (typeof Auth === 'undefined' || !Auth.hasRole('admin')) return '';

  const services = DATA.sources.map(s => {
    const fields = DATA.serviceConfig.fields[s.id];
    if (!fields) return '';
    const saved = DATA.serviceConfig.get(s.id) || {};
    const configured = DATA.serviceConfig.isConfigured(s.id);
    const statusBadge = configured
      ? '<span class="badge badge-green">Saved</span>'
      : '<span class="badge badge-gray">Not configured</span>';

    return `
      <div class="config-service" data-service="${s.id}">
        <div class="config-service-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">${s.icon}</span>
            <span class="config-service-name">${s.label}</span>
          </div>
          ${statusBadge}
        </div>
        <div class="config-fields">
          ${fields.map(f => `
            <div class="config-field">
              <label class="config-label">${f.label}</label>
              <input class="input config-input" type="${f.type}" placeholder="${f.placeholder}"
                     data-service="${s.id}" data-key="${f.key}"
                     value="${saved[f.key] || ''}">
            </div>
          `).join('')}
        </div>
        <div class="config-actions">
          <button class="btn btn-primary btn-sm config-save-btn" data-service="${s.id}">Save</button>
          <button class="btn btn-ghost btn-sm config-test-btn" data-service="${s.id}">Test Connection</button>
          <button class="btn btn-ghost btn-sm config-clear-btn" data-service="${s.id}" style="color:var(--red)">Clear</button>
          <span class="config-status" id="config-status-${s.id}"></span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="admin-config-panel card mb-4">
      <div class="admin-config-header" id="admin-config-toggle">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="admin-config-icon">&#9881;</span>
          <span class="card-title">API Configuration</span>
          <span class="badge badge-purple">Admin</span>
        </div>
        <span class="nav-chevron admin-config-chevron" id="admin-config-chevron">&#8250;</span>
      </div>
      <div class="admin-config-body" id="admin-config-body" style="display:none">
        <div class="admin-config-hint">
          Configure API credentials for each integration. Keys are stored locally in your browser and never sent to third parties.
        </div>
        ${services}
      </div>
    </div>`;
}

// ── SOURCE CARD (updated with config status) ──
function renderSourceCard(s) {
  const configured = DATA.serviceConfig.isConfigured(s.id);
  const badge = configured
    ? UI.badge('● Configured', 'badge-green')
    : UI.badge('● Not configured', 'badge-gray');

  return `
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:${s.color}22;border-radius:8px;
                      display:flex;align-items:center;justify-content:center;font-size:18px">${s.icon}</div>
          <div>
            <div style="font-weight:600;font-family:'Syne',sans-serif">${s.label}</div>
            <div style="font-size:11px;color:var(--text-muted)">Last: ${s.lastSync} · ${s.newSince} new</div>
          </div>
        </div>
        ${badge}
      </div>
      <button class="btn btn-ghost btn-sm sync-source-btn" data-name="${s.label}">
        Sync ${s.label}
      </button>
    </div>`;
}

// ── MAIN SYNC PAGE ──
Router.register('sync', () => `
  ${UI.sectionHead('Data Sync', 'Pull fresh data from connected sources',
    `<button class="btn btn-primary" id="sync-all-btn">⟳ Sync All</button>`
  )}

  ${renderAdminConfigPanel()}

  <div class="grid-2 mb-4">
    ${DATA.sources.map(s => renderSourceCard(s)).join('')}
  </div>

  <div class="card" id="sync-log-card" style="display:none">
    <div class="card-header">
      <span class="card-title">Sync Log</span>
      <span class="badge badge-blue" id="sync-status-badge">Running…</span>
    </div>
    <div class="sync-log" id="sync-log-lines"></div>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'sync') return;

  // ── ADMIN CONFIG PANEL WIRING ──
  const toggle = document.getElementById('admin-config-toggle');
  const body = document.getElementById('admin-config-body');
  const chevron = document.getElementById('admin-config-chevron');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (chevron) chevron.style.transform = open ? 'rotate(90deg)' : '';
    });
  }

  // Save buttons
  document.querySelectorAll('.config-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.service;
      const inputs = document.querySelectorAll(`.config-input[data-service="${sid}"]`);
      const config = {};
      inputs.forEach(inp => { config[inp.dataset.key] = inp.value.trim(); });
      DATA.serviceConfig.set(sid, config);

      const status = document.getElementById(`config-status-${sid}`);
      if (status) {
        status.innerHTML = '<span class="badge badge-green">Saved</span>';
        setTimeout(() => { status.innerHTML = ''; }, 2000);
      }
      // Re-render page to update badges
      Router.go('sync');
    });
  });

  // Clear buttons
  document.querySelectorAll('.config-clear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.service;
      DATA.serviceConfig.clear(sid);
      // Clear input fields
      document.querySelectorAll(`.config-input[data-service="${sid}"]`).forEach(inp => {
        inp.value = '';
      });
      const status = document.getElementById(`config-status-${sid}`);
      if (status) {
        status.innerHTML = '<span class="badge badge-gray">Cleared</span>';
        setTimeout(() => { status.innerHTML = ''; }, 2000);
      }
      // Re-render page to update badges
      Router.go('sync');
    });
  });

  // Test Connection buttons
  document.querySelectorAll('.config-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.service;
      const status = document.getElementById(`config-status-${sid}`);
      if (!DATA.serviceConfig.isConfigured(sid)) {
        if (status) status.innerHTML = '<span class="badge badge-red">Fill all fields first</span>';
        setTimeout(() => { if (status) status.innerHTML = ''; }, 2000);
        return;
      }
      if (status) status.innerHTML = '<span class="badge badge-blue">Testing…</span>';
      btn.disabled = true;
      // Simulated test (real implementation would hit the API)
      setTimeout(() => {
        if (status) status.innerHTML = '<span class="badge badge-green">Connection OK</span>';
        btn.disabled = false;
        setTimeout(() => { if (status) status.innerHTML = ''; }, 3000);
      }, 1200);
    });
  });

  // ── SYNC LOGIC (unchanged) ──
  function runSync(sources) {
    const card   = document.getElementById('sync-log-card');
    const lines  = document.getElementById('sync-log-lines');
    const status = document.getElementById('sync-status-badge');
    card.style.display = 'block';
    lines.innerHTML = '';
    status.textContent = 'Running…';
    status.className = 'badge badge-blue';

    const msgs = sources.flatMap(s => [
      `→ Connecting to ${s.label}…`,
      `✓ ${s.label}: fetched ${s.newSince} new records`,
    ]).concat([
      '→ Updating vector index…',
      `✓ Index updated — ${sources.reduce((a,s)=>a+s.newSince,0)} documents processed`,
      '✓ Sync complete',
    ]);

    let i = 0;
    const iv = setInterval(() => {
      if (i < msgs.length) {
        lines.innerHTML += msgs[i++] + '<br>';
      } else {
        clearInterval(iv);
        status.textContent = '✓ Done';
        status.className = 'badge badge-green';
      }
    }, 280);
  }

  document.getElementById('sync-all-btn')?.addEventListener('click', async () => {
    if (typeof API !== 'undefined' && API.available) {
      const card   = document.getElementById('sync-log-card');
      const lines  = document.getElementById('sync-log-lines');
      const status = document.getElementById('sync-status-badge');
      card.style.display = 'block';
      lines.innerHTML = '→ Clearing cache…<br>';
      status.textContent = 'Running…';
      status.className = 'badge badge-blue';

      const ok = await API.clearCacheAndRefresh();
      lines.innerHTML += ok
        ? '✓ Cache cleared & data refreshed from Freshdesk<br>✓ Sync complete<br>'
        : '✗ Sync failed — check server logs<br>';
      status.textContent = ok ? '✓ Done' : '✗ Failed';
      status.className = ok ? 'badge badge-green' : 'badge badge-red';
    } else {
      runSync(DATA.sources);
    }
  });

  document.querySelectorAll('.sync-source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = DATA.sources.find(s => s.label === btn.dataset.name);
      if (!src) return;
      btn.textContent = 'Syncing…';
      btn.disabled = true;
      runSync([src]);
      setTimeout(() => {
        btn.textContent = `Sync ${src.label}`;
        btn.disabled = false;
      }, src.newSince * 15 + 1500);
    });
  });
});
