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

  // ── BAR CHART ──
  barChart(id, data, labels, color = 'var(--accent)') {
    const max  = Math.max(...data);
    const bars = data.map(v =>
      `<div class="bar-chart-bar" style="height:${Math.round((v / max) * 100)}%;background:${color}"></div>`
    ).join('');
    // Evenly spaced labels
    const step = Math.ceil(data.length / labels.length);
    const labelHtml = labels.map(l => `<span>${l}</span>`).join('');
    return `
      <div class="bar-chart" id="${id}">${bars}</div>
      <div class="chart-labels">${labelHtml}</div>`;
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
