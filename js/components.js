/**
 * components.js — Reusable HTML fragment builders
 * All functions return HTML strings.
 */

const UI = {

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
  sectionHead(title, sub, actionHtml = '') {
    return `
      <div class="section-head">
        <div>
          <h2>${title}</h2>
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
