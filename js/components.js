/**
 * components.js — Reusable HTML fragment builders
 * All functions return HTML strings.
 */

const UI = {

  // ── SOURCE LABEL ──
  // Renders a subtle data-origin badge.
  // source: 'freshdesk_api' | 'cache' | 'ai_generated' | 'mock'
  // fetchedAt: ISO timestamp string (optional)
  sourceLabel(source, fetchedAt) {
    if (!source) return '';
    const labels = {
      freshdesk_api: { text: 'Live from Freshdesk', cls: 'source-live' },
      cache:         { text: '', cls: 'source-cache' }, // computed below
      ai_generated:  { text: 'AI-generated', cls: 'source-ai' },
      mock:          { text: 'Demo data', cls: 'source-mock' },
    };
    const info = labels[source] || { text: source, cls: 'source-mock' };
    let text = info.text;

    // For cache, show relative time
    if (source === 'cache' && fetchedAt) {
      const ago = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000);
      text = ago < 1 ? 'Cached — just now' : `Cached — ${ago} min ago`;
    } else if (source === 'cache') {
      text = 'Cached';
    }

    return `<span class="source-label ${info.cls}" title="${fetchedAt ? 'Fetched: ' + fetchedAt : ''}">${text}</span>`;
  },

  // ── STAT CARD ──
  statCard(title, value, label, delta, deltaDir, color) {
    return `
      <div class="card">
        <div class="card-title mb-2">${title}</div>
        <div class="stat-big"${color ? ` style="color:${color}"` : ''}>${value}</div>
        <div class="stat-label">${label}</div>
        ${delta ? `<div class="stat-delta ${deltaDir || ''}">${delta}</div>` : ''}
      </div>`;
  },

  // ── SECTION HEADER ──
  // dataKey: optional DATA key name — if provided and API is available,
  // a source label (Live/Cached/Demo) will be shown next to the title.
  sectionHead(title, sub, actionHtml = '', dataKey) {
    let sourceHtml = '';
    if (dataKey && typeof API !== 'undefined') {
      const meta = API.getSourceMeta(dataKey);
      if (meta) sourceHtml = UI.sourceLabel(meta.source, meta.fetchedAt);
    }
    return `
      <div class="section-head">
        <div>
          <h2>${title} ${sourceHtml}</h2>
          ${sub ? `<p>${sub}</p>` : ''}
        </div>
        ${actionHtml}
      </div>`;
  },

  // ── BAR CHART (enhanced: tooltips + click) ──
  barChart(id, data, labels, opts = {}) {
    if (typeof opts === 'string') opts = { color: opts }; // backward compat
    const color = opts.color || 'var(--accent)';
    const max = Math.max(...data);
    const clickable = opts.onClick ? ' bar-clickable' : '';
    const bars = data.map((v, i) => {
      const label = labels[Math.min(i, labels.length - 1)] || '';
      return `<div class="bar-chart-bar${clickable}" data-idx="${i}" data-value="${v}" data-label="${label}" style="height:${Math.round((v / max) * 100)}%;background:${color}"></div>`;
    }).join('');
    const labelHtml = labels.map(l => `<span>${l}</span>`).join('');
    return `
      <div class="bar-chart" id="${id}">${bars}</div>
      <div class="chart-labels">${labelHtml}</div>`;
  },

  // Post-render: attach chart click handlers
  barChartInit(id, onClick) {
    if (!onClick) return;
    const chart = document.getElementById(id);
    if (!chart) return;
    chart.addEventListener('click', e => {
      const bar = e.target.closest('.bar-chart-bar');
      if (!bar) return;
      chart.querySelectorAll('.bar-chart-bar').forEach(b => b.classList.remove('bar-selected'));
      bar.classList.add('bar-selected');
      onClick(parseInt(bar.dataset.idx), parseInt(bar.dataset.value), bar.dataset.label);
    });
  },

  // ── INTERACTIVE TABLE ──
  // Returns HTML string. Call UI.tableInit(id) in afterRender to wire up.
  _tableConfigs: {},
  _tableStates: {},

  table(cfg) {
    const { id, columns, data, pageSize = 10, filterable = true, onRowClick } = cfg;
    UI._tableConfigs[id] = cfg;

    const filterHtml = filterable
      ? `<div class="table-filter-row"><input class="input table-filter-input" id="${id}-filter" placeholder="Filter..." /></div>`
      : '';

    const ths = columns.map(c => {
      const sortable = c.sortable !== false;
      return `<th class="${sortable ? 'th-sortable' : ''}" data-key="${c.key}">${c.label}${sortable ? ' <span class="sort-arrow"></span>' : ''}</th>`;
    }).join('');

    const rows = data.map((row, ri) => {
      const cls = onRowClick ? ' class="tr-clickable"' : '';
      const tds = columns.map(c => {
        const val = c.render ? c.render(row) : (row[c.key] ?? '');
        return `<td>${val}</td>`;
      }).join('');
      return `<tr data-row-idx="${ri}"${cls}>${tds}</tr>`;
    }).join('');

    const paginationHtml = pageSize > 0 && data.length > pageSize
      ? `<div class="table-pagination" id="${id}-pagination"></div>`
      : '';

    return `${filterHtml}<table class="table table-interactive" id="${id}"><thead><tr>${ths}</tr></thead><tbody id="${id}-tbody">${rows}</tbody></table>${paginationHtml}`;
  },

  // Post-render: attach sorting, filtering, pagination, row clicks
  tableInit(id) {
    const cfg = UI._tableConfigs[id];
    if (!cfg) return;

    const { columns, pageSize = 10, onRowClick } = cfg;
    let data = [...cfg.data];
    let filtered = data;
    let sortKey = null, sortAsc = true;
    let page = 0;

    function renderRows() {
      const tbody = document.getElementById(`${id}-tbody`);
      if (!tbody) return;
      const start = pageSize > 0 ? page * pageSize : 0;
      const slice = pageSize > 0 ? filtered.slice(start, start + pageSize) : filtered;

      tbody.innerHTML = slice.map((row, ri) => {
        const cls = onRowClick ? ' class="tr-clickable"' : '';
        const tds = columns.map(c => {
          const val = c.render ? c.render(row) : (row[c.key] ?? '');
          return `<td>${val}</td>`;
        }).join('');
        return `<tr data-row-idx="${start + ri}"${cls}>${tds}</tr>`;
      }).join('');

      // Pagination
      const pagEl = document.getElementById(`${id}-pagination`);
      if (pagEl && pageSize > 0 && filtered.length > pageSize) {
        const totalPages = Math.ceil(filtered.length / pageSize);
        const showing = `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`;
        pagEl.innerHTML = `<span class="page-info">${showing}</span><button class="btn btn-ghost btn-sm page-prev" ${page === 0 ? 'disabled' : ''}>←</button><button class="btn btn-ghost btn-sm page-next" ${page >= totalPages - 1 ? 'disabled' : ''}>→</button>`;
        pagEl.querySelector('.page-prev')?.addEventListener('click', () => { if (page > 0) { page--; renderRows(); } });
        pagEl.querySelector('.page-next')?.addEventListener('click', () => { if (page < totalPages - 1) { page++; renderRows(); } });
      } else if (pagEl) {
        pagEl.innerHTML = '';
      }

      // Row clicks
      if (onRowClick) {
        tbody.querySelectorAll('.tr-clickable').forEach(tr => {
          tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.rowIdx);
            if (filtered[idx - (pageSize > 0 ? page * pageSize : 0)]) {
              onRowClick(filtered[idx - (pageSize > 0 ? page * pageSize : 0)]);
            } else {
              onRowClick(data[idx]);
            }
          });
        });
      }
    }

    // Sorting
    const table = document.getElementById(id);
    if (table) {
      table.querySelectorAll('.th-sortable').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (sortKey === key) { sortAsc = !sortAsc; } else { sortKey = key; sortAsc = true; }
          const col = columns.find(c => c.key === key);
          const isNum = col?.type === 'number' || (filtered.length > 0 && typeof filtered[0][key] === 'number');
          filtered.sort((a, b) => {
            let va = a[key], vb = b[key];
            if (isNum) { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
            else { va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase(); }
            return sortAsc ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
          });
          table.querySelectorAll('.sort-arrow').forEach(a => a.textContent = '');
          th.querySelector('.sort-arrow').textContent = sortAsc ? ' ▲' : ' ▼';
          page = 0;
          renderRows();
        });
      });
    }

    // Filtering
    const filterInput = document.getElementById(`${id}-filter`);
    if (filterInput) {
      let debounce;
      filterInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const q = filterInput.value.toLowerCase().trim();
          filtered = q ? data.filter(row => columns.some(c => {
            const val = String(row[c.key] ?? '');
            return val.toLowerCase().includes(q);
          })) : [...data];
          if (sortKey) {
            const col = columns.find(c => c.key === sortKey);
            const isNum = col?.type === 'number' || (filtered.length > 0 && typeof filtered[0][sortKey] === 'number');
            filtered.sort((a, b) => {
              let va = a[sortKey], vb = b[sortKey];
              if (isNum) { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
              else { va = String(va || '').toLowerCase(); vb = String(vb || '').toLowerCase(); }
              return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
            });
          }
          page = 0;
          renderRows();
        }, 200);
      });
    }

    // Expose filtered state for export system
    UI._tableStates[id] = { getFiltered: () => filtered };

    renderRows();
  },

  // ── PROGRESS ROW ──
  progressRow(label, pct, color) {
    return `
      <div class="source-row mt-2">
        <div class="source-dot" style="background:${color}"></div>
        <div class="source-name">${label}</div>
        <div class="source-count">${pct}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>`;
  },

  // ── TIMELINE ITEM ──
  timelineItem(title, time, active = false) {
    return `
      <div class="timeline-item">
        <div class="timeline-dot${active ? ' active' : ''}"></div>
        <div class="timeline-body">
          <div class="timeline-title">${title}</div>
          <div class="timeline-meta">${time}</div>
        </div>
      </div>`;
  },

  // ── BADGE ──
  badge(text, cls) {
    return `<span class="badge ${cls}">${text}</span>`;
  },

  // ── SCORE COLOR ──
  scoreColor(n) {
    if (n >= 80) return 'var(--green)';
    if (n >= 60) return 'var(--yellow)';
    return 'var(--red)';
  },

  // ── PRIORITY BADGE ──
  priorityBadge(p) {
    const map = { Urgent: 'badge-red', High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-gray', 'N/A': 'badge-gray' };
    return UI.badge(p, map[p] || 'badge-gray');
  },

  // ── SLA BADGE ──
  slaBadge(s) {
    const map = { Overdue: 'badge-red', 'At Risk': 'badge-yellow', 'N/A': 'badge-gray' };
    return UI.badge(s, map[s] || 'badge-green');
  },

  // ── HEALTH BADGE ──
  healthBadge(s) {
    const map = { 'At Risk': 'badge-red', Healthy: 'badge-green', Watch: 'badge-yellow' };
    return UI.badge(s, map[s] || 'badge-gray');
  },

  // ── AGENT CHIP ──
  agentChip(initials, name) {
    return `
      <div class="agent-chip">
        <div class="agent-avatar">${initials}</div>
        ${name}
      </div>`;
  },

  // ── DIMENSION BAR ──
  dimBar(label, score, color) {
    const pct = (score / 5) * 100;
    return `
      <div class="dim-row">
        <div class="dim-label-row">
          <span>${label}</span>
          <span class="dim-val">${score} / 5</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  },

  // ── INSIGHT CARD ──
  insightCard(icon, title, body, cls = '') {
    return `
      <div class="insight-card ${cls}">
        <h3>${icon} ${title}</h3>
        <p>${body}</p>
      </div>`;
  },

  // ── TOGGLE ──
  toggle(id, on = false) {
    return `<div class="toggle${on ? ' on' : ''}" id="${id}" onclick="this.classList.toggle('on')"></div>`;
  },

  // ── SLIDER ──
  slider(id, min, max, val, color = 'var(--text-dim)') {
    return `
      <div class="slider-row">
        <input type="range" id="${id}" min="${min}" max="${max}" value="${val}"
          oninput="document.getElementById('${id}-val').textContent = this.value">
        <span class="slider-val" id="${id}-val" style="color:${color}">${val}</span>
      </div>`;
  },

  // ── CONF COLOR ──
  confColor(c) {
    if (c >= 0.8) return 'var(--green)';
    if (c >= 0.5) return 'var(--yellow)';
    return 'var(--red)';
  },

  // ── KPI CARD ──
  kpiCard(title, value, delta, dir, label, color) {
    const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '';
    const dirCls = dir === 'down' ? 'down' : dir === 'up' ? 'up' : '';
    return `
      <div class="card kpi-card">
        <div class="card-title mb-2">${title}</div>
        <div class="stat-big" style="color:${color}">${value}</div>
        <div class="kpi-delta ${dirCls}">${arrow} ${delta} <span class="kpi-label">${label}</span></div>
      </div>`;
  },

  // ── ATTENTION ROW ──
  attentionRow(icon, text, badge, page) {
    return `
      <div class="attention-row" data-page="${page}">
        <span class="attention-icon">${icon}</span>
        <span class="attention-text">${text}</span>
        <span class="badge ${badge} attention-badge">→</span>
      </div>`;
  },

  // ── AT-RISK ROW ──
  atRiskRow(company, arr, tickets, repeats, status) {
    return `
      <div class="at-risk-row">
        <div class="at-risk-company">${company}</div>
        <div class="at-risk-meta">
          ${UI.healthBadge(status)}
          <span class="font-mono text-dim">${tickets} tickets</span>
          <span class="font-mono" style="color:var(--red)">${repeats} repeats</span>
        </div>
        <div class="at-risk-arr font-mono text-green">${arr} NOK</div>
      </div>`;
  },

  // ── AGENT CARD (for coaching page) ──
  agentCard(agent) {
    const delta = agent.score - agent.prevScore;
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
    const deltaCls = delta >= 0 ? 'up' : 'down';
    const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)';
    return `
      <div class="agent-card card" data-agent-id="${agent.id}">
        <div class="agent-card-top">
          <div class="agent-avatar agent-avatar-lg">${agent.initials}</div>
          <div class="agent-card-info">
            <div class="agent-card-name">${agent.name}</div>
            <div class="agent-card-meta">${agent.tickets} tickets scored</div>
          </div>
        </div>
        <div class="agent-card-score">
          <span class="score-gauge" style="color:${UI.scoreColor(agent.score)}">${agent.score}</span>
          <span class="score-gauge-label">/ 100</span>
          <span class="score-delta" style="color:${deltaColor}">${deltaStr}</span>
        </div>
        ${agent.flags > 0 ? `<div class="agent-card-flags">${UI.badge(agent.flags + ' flag' + (agent.flags !== 1 ? 's' : ''), agent.flags >= 3 ? 'badge-red' : 'badge-yellow')}</div>` : '<div class="agent-card-flags"></div>'}
        <button class="btn btn-ghost btn-sm agent-card-btn">View Profile</button>
      </div>`;
  },

  // ── SCORE GAUGE (large, with delta) ──
  scoreGauge(score, prev) {
    const delta = score - prev;
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
    const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)';
    return `
      <div class="score-gauge-block">
        <span class="score-gauge-big" style="color:${UI.scoreColor(score)}">${score}</span>
        <span class="score-gauge-sub">/ 100</span>
        <span class="score-gauge-delta" style="color:${deltaColor}">${deltaStr} vs last run</span>
      </div>`;
  },

  // ── COACHING ACTION (stop/start/continue) ──
  coachingAction(type, text) {
    const config = {
      stop:     { color: 'var(--red)',    icon: '✕', label: 'Stop' },
      start:    { color: 'var(--green)',  icon: '✓', label: 'Start' },
      continue: { color: 'var(--accent)', icon: '→', label: 'Continue' },
    };
    const c = config[type] || config.continue;
    return `
      <div class="coaching-action" style="border-left:3px solid ${c.color}">
        <span class="coaching-action-label" style="color:${c.color}">${c.icon} ${c.label}</span>
        <span class="coaching-action-text">${text}</span>
      </div>`;
  },

  // ── DIMENSION BAR WITH TEAM COMPARISON ──
  dimBarCompare(label, score, teamAvg, color) {
    const pct = (score / 5) * 100;
    const teamPct = (teamAvg / 5) * 100;
    return `
      <div class="dim-row">
        <div class="dim-label-row">
          <span>${label}</span>
          <span class="dim-val">${score} / 5 <span class="dim-team-avg">(team ${teamAvg})</span></span>
        </div>
        <div class="progress-bar dim-compare-bar">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
          <div class="dim-team-marker" style="left:${teamPct}%" title="Team avg: ${teamAvg}"></div>
        </div>
      </div>`;
  },

  // ── CHAT MESSAGE ──
  chatMsg(text, role) {
    const isUser = role === 'user';
    return `
      <div class="chat-msg${isUser ? ' user' : ''}">
        <div class="chat-msg-label">${isUser ? 'YOU' : 'SYNAPSE AI'}</div>
        <div class="chat-bubble${isUser ? ' user' : ''}">${text}</div>
      </div>`;
  },

  // ═══════════════════════════════════════════
  //  DATA TRUST & FRESHNESS COMPONENTS
  // ═══════════════════════════════════════════

  // ── STALENESS THRESHOLDS (ms) ──
  _staleThresholds: {
    tickets:   { fresh: 5*60000, normal: 30*60000, stale: 120*60000 },
    stats:     { fresh: 5*60000, normal: 30*60000, stale: 120*60000 },
    companies: { fresh: 15*60000, normal: 60*60000, stale: 240*60000 },
    qa:        { fresh: 60*60000, normal: 8*3600000, stale: 24*3600000 },
    briefing:  { fresh: 60*60000, normal: 12*3600000, stale: 24*3600000 },
    drafts:    { fresh: 30*60000, normal: 120*60000, stale: 8*3600000 },
    churn:     { fresh: 60*60000, normal: 8*3600000, stale: 24*3600000 },
    default:   { fresh: 5*60000, normal: 30*60000, stale: 120*60000 },
  },

  // ── RELATIVE TIME STRING ──
  _relativeTime(isoStr) {
    if (!isoStr) return 'unknown';
    const ms = Date.now() - new Date(isoStr).getTime();
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
    if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
    return Math.floor(ms / 86400000) + 'd ago';
  },

  // ── FRESHNESS LEVEL ──
  _freshLevel(isoStr, type) {
    if (!isoStr) return 'unknown';
    const ms = Date.now() - new Date(isoStr).getTime();
    const t = UI._staleThresholds[type] || UI._staleThresholds.default;
    if (ms <= t.fresh) return 'fresh';
    if (ms <= t.normal) return 'normal';
    if (ms <= t.stale) return 'stale';
    return 'critical';
  },

  _freshColor(level) {
    return { fresh: 'var(--green)', normal: 'var(--text-muted)', stale: 'var(--yellow)', critical: 'var(--red)', unknown: 'var(--text-dim)' }[level] || 'var(--text-dim)';
  },

  // ── FRESHNESS BADGE (inline) ──
  // Shows colored dot + "Updated Xm ago" or "Stale — Xm ago"
  freshBadge(freshnessKey) {
    const f = DATA.freshness?.[freshnessKey];
    if (!f) return '';
    const level = UI._freshLevel(f.fetchedAt, freshnessKey);
    const color = UI._freshColor(level);
    const time = UI._relativeTime(f.fetchedAt);
    const prefix = level === 'stale' ? 'Stale — ' : level === 'critical' ? 'Outdated — ' : '';
    const sourceLabel = f.source === 'ai_generated' ? 'AI' : f.source === 'cache' ? 'Cached' : f.source === 'freshdesk_api' ? 'Live' : 'Demo';
    return `<span class="fresh-badge" title="${f.fetchedAt ? 'Fetched: ' + new Date(f.fetchedAt).toLocaleString() : ''}"><span class="fresh-dot" style="background:${color}"></span>${prefix}${sourceLabel} ${time}</span>`;
  },

  // ── SOURCE ATTRIBUTION BAR (for AI content) ──
  sourceBar(freshnessKey, labelOverride) {
    const f = DATA.freshness?.[freshnessKey];
    if (!f) return '';
    const label = labelOverride || (f.source === 'ai_generated' ? 'AI Analysis' : 'Live Data');
    const model = f.model ? ` · ${f.model}` : '';
    const time = UI._relativeTime(f.fetchedAt);
    const isAI = f.source === 'ai_generated';
    return `<div class="source-bar ${isAI ? 'source-bar-ai' : 'source-bar-live'}"><span class="source-bar-label">${isAI ? '◈' : '●'} ${label}${model}</span><span class="source-bar-time">${time}</span></div>`;
  },

  // ── CARD FRESHNESS FOOTER ──
  // Subtle "● Xm ago" to embed inside stat cards
  cardFreshness(freshnessKey) {
    const f = DATA.freshness?.[freshnessKey];
    if (!f) return '';
    const level = UI._freshLevel(f.fetchedAt, freshnessKey);
    const color = UI._freshColor(level);
    const time = UI._relativeTime(f.fetchedAt);
    return `<div class="card-freshness"><span class="fresh-dot" style="background:${color}"></span>${time}</div>`;
  },

  // ── STALE DATA WARNING BANNER ──
  staleWarning(freshnessKey, message) {
    const f = DATA.freshness?.[freshnessKey];
    if (!f) return '';
    const level = UI._freshLevel(f.fetchedAt, freshnessKey);
    if (level !== 'stale' && level !== 'critical') return '';
    const time = UI._relativeTime(f.fetchedAt);
    const msg = message || `Data may be outdated — last updated ${time}`;
    const cls = level === 'critical' ? 'stale-warning-critical' : '';
    return `<div class="stale-warning ${cls}"><span class="stale-warning-icon">&#9888;</span><span class="stale-warning-text">${msg}</span><button class="btn btn-ghost btn-sm stale-warning-action" data-navigate="sync">Sync Now</button></div>`;
  },

  // ── ENHANCED STAT CARD WITH FRESHNESS ──
  statCardFresh(title, value, label, freshnessKey, delta, deltaDir, color) {
    return `
      <div class="card card-fresh">
        <div class="card-title mb-2">${title}</div>
        <div class="stat-big"${color ? ` style="color:${color}"` : ''}>${value}</div>
        <div class="stat-label">${label}</div>
        ${delta ? `<div class="stat-delta ${deltaDir || ''}">${delta}</div>` : ''}
        ${UI.cardFreshness(freshnessKey)}
      </div>`;
  },

  // ═══════════════════════════════════════════
  //  SKELETON / SHIMMER LOADING STATES
  // ═══════════════════════════════════════════

  /** Skeleton stat card */
  skelCard() {
    return `<div class="skel-card"><div class="skel skel-title"></div><div class="skel skel-big"></div><div class="skel skel-label"></div></div>`;
  },

  /** Skeleton table with N rows */
  skelTable(rows = 5, cols = 4) {
    const cells = Array.from({ length: cols }, (_, i) =>
      `<div class="skel skel-cell${i === 1 ? ' skel-cell-lg' : i === 0 ? ' skel-cell-sm' : ''}"></div>`
    ).join('');
    const rowsHtml = Array.from({ length: rows }, () =>
      `<div class="skel-row">${cells}</div>`
    ).join('');
    return `<div class="skel-table">${rowsHtml}</div>`;
  },

  /** Skeleton section header */
  skelHead() {
    return `<div class="skel-head"><div class="skel skel-h2"></div><div class="skel skel-sub"></div></div>`;
  },

  /** Skeleton bar chart */
  skelChart() {
    const bars = [65, 80, 55, 90, 70, 40, 60].map(h =>
      `<div class="skel skel-bar" style="height:${h}%"></div>`
    ).join('');
    return `<div class="skel-chart">${bars}</div>`;
  },

  /** Full page skeleton (mimics dashboard layout) */
  skelPage() {
    return `
      ${UI.skelHead()}
      <div class="grid-4 mb-4">${UI.skelCard()}${UI.skelCard()}${UI.skelCard()}${UI.skelCard()}</div>
      <div class="grid-2 mb-4">
        ${UI.skelTable(5, 3)}
        ${UI.skelTable(3, 2)}
      </div>
      ${UI.skelChart()}
    `;
  },

};
