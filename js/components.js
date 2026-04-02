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

  // ── CHAT MESSAGE ──
  chatMsg(text, role) {
    const isUser = role === 'user';
    return `
      <div class="chat-msg${isUser ? ' user' : ''}">
        <div class="chat-msg-label">${isUser ? 'YOU' : 'SYNAPSE AI'}</div>
        <div class="chat-bubble${isUser ? ' user' : ''}">${text}</div>
      </div>`;
  },

};
