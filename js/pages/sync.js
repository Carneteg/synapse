Router.register('sync', () => `
  ${UI.sectionHead('Data Sync', 'Pull fresh data from connected sources',
    `<button class="btn btn-primary" id="sync-all-btn">⟳ Sync All</button>`
  )}

  <div class="grid-2 mb-4">
    ${DATA.sources.map(s => `
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
          ${UI.badge('● Connected', 'badge-green')}
        </div>
        <button class="btn btn-ghost btn-sm sync-source-btn" data-name="${s.label}">
          Sync ${s.label}
        </button>
      </div>
    `).join('')}
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

  document.getElementById('sync-all-btn')?.addEventListener('click', () => {
    runSync(DATA.sources);
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
