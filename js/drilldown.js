/**
 * drilldown.js — Slide-in panel system for data exploration
 * Supports: company drill-down, ticket drill-down, back navigation.
 */

const DrillDown = (() => {
  const history = []; // stack for back navigation

  function getOverlay() { return document.getElementById('drilldown-overlay'); }
  function getPanel()   { return document.getElementById('drilldown-panel'); }
  function getBody()    { return document.getElementById('drilldown-body'); }

  /**
   * Open a drill-down panel.
   * @param {string} type - 'company' or 'ticket'
   * @param {object} data - row data to render
   * @param {boolean} pushHistory - whether to push current state to history
   */
  function open(type, data, pushHistory = true) {
    const overlay = getOverlay();
    const panel = getPanel();
    const body = getBody();
    if (!overlay || !panel || !body) return;

    if (pushHistory && body.innerHTML.trim()) {
      history.push({ html: body.innerHTML, type: panel.dataset.type, data: panel._lastData });
    }
    panel._lastData = data;

    panel.dataset.type = type;
    overlay.classList.add('visible');
    panel.classList.add('visible');

    if (type === 'company') renderCompany(body, data);
    else if (type === 'ticket') renderTicket(body, data);
    else if (type === 'qa-agent') renderQAAgent(body, data);
    else if (type === 'qa-eval') renderQAEval(body, data);
    else { body.innerHTML = `<div class="empty-state">Unknown drill-down type: ${type}</div>`; }

    updateBackButton();
  }

  function close() {
    const overlay = getOverlay();
    const panel = getPanel();
    if (overlay) overlay.classList.remove('visible');
    if (panel) panel.classList.remove('visible');
    history.length = 0;
  }

  function back() {
    if (history.length === 0) { close(); return; }
    const prev = history.pop();
    const body = getBody();
    // Re-render panels that need live event listeners (qa-agent, qa-eval)
    if (prev.type && prev.data && (prev.type === 'qa-agent' || prev.type === 'qa-eval')) {
      open(prev.type, prev.data, false);
    } else {
      if (body) body.innerHTML = prev.html;
    }
    updateBackButton();
  }

  function updateBackButton() {
    const btn = document.getElementById('drilldown-back');
    if (btn) btn.style.display = history.length > 0 ? '' : 'none';
  }

  // ── COMPANY PANEL ──
  function renderCompany(container, data) {
    const tickets = DATA.pressingTickets || [];
    // Find related tickets (mock: filter by company name match if available)
    const companyTickets = tickets.filter(t =>
      t.title && data.company && (t.arr !== '—' || true)
    );

    container.innerHTML = `
      <div class="dd-header">
        <h3>${data.company || 'Company'}</h3>
        ${UI.healthBadge(data.status || 'Watch')}
      </div>
      <div class="dd-stats">
        <div class="dd-stat"><span class="dd-stat-val">${data.tickets || 0}</span><span class="dd-stat-label">Tickets</span></div>
        <div class="dd-stat"><span class="dd-stat-val">${data.resRate || '—'}</span><span class="dd-stat-label">Resolution</span></div>
        <div class="dd-stat"><span class="dd-stat-val">${data.arr || '—'}</span><span class="dd-stat-label">ARR (NOK)</span></div>
        <div class="dd-stat"><span class="dd-stat-val">${data.repeats || 0}</span><span class="dd-stat-label">Repeats</span></div>
      </div>
      ${data.avgRes ? `<div class="dd-meta">Avg Resolution: <span class="font-mono">${data.avgRes}</span> · SLA: ${UI.badge(data.sla || '—', data.slaBadge || 'badge-gray')}</div>` : ''}
      <div class="divider"></div>
      <div class="dd-section-title">Recent Tickets</div>
      <div class="dd-ticket-list">
        ${(DATA.pressingTickets || []).slice(0, 8).map(t => `
          <div class="dd-ticket-row" data-ticket='${JSON.stringify(t).replace(/'/g, "&#39;")}'>
            <span class="font-mono">${t.id}</span>
            <span class="dd-ticket-subject">${t.title}</span>
            ${UI.priorityBadge(t.priority)}
            <span class="text-muted">${t.age}</span>
          </div>
        `).join('')}
      </div>`;

    // Wire ticket row clicks
    container.querySelectorAll('.dd-ticket-row').forEach(row => {
      row.addEventListener('click', () => {
        try {
          const t = JSON.parse(row.dataset.ticket);
          open('ticket', t);
        } catch {}
      });
    });
  }

  // ── TICKET PANEL ──
  function renderTicket(container, data) {
    // Mock conversations for demo
    const conversations = [
      { incoming: true, body: 'Hi, we are experiencing this issue and it is blocking our operations. Please help urgently.', time: '08:12', from: 'Customer' },
      { incoming: false, body: 'Thank you for reaching out. We are investigating this issue and will update you shortly.', time: '08:45', from: 'Agent' },
      { incoming: true, body: 'It has been over an hour and the issue persists. This is critical for us.', time: '09:30', from: 'Customer' },
    ];

    container.innerHTML = `
      <div class="dd-header">
        <h3><span class="font-mono">${data.id || '#—'}</span></h3>
        <div style="display:flex;gap:6px">
          ${UI.priorityBadge(data.priority || 'Medium')}
          ${UI.slaBadge(data.sla || 'N/A')}
        </div>
      </div>
      <div class="dd-subject">${data.title || data.subject || '(no subject)'}</div>
      <div class="dd-meta-grid">
        <div>Source: <span class="text-dim">${data.source || 'Email'}</span></div>
        <div>Age: <span class="text-dim">${data.age || '—'}</span></div>
        <div>ARR: <span class="text-green font-mono">${data.arr || '—'}</span></div>
      </div>
      <div class="divider"></div>
      <div class="dd-section-title">Conversation</div>
      <div class="dd-conversations">
        ${conversations.map(c => `
          <div class="dd-conv ${c.incoming ? 'incoming' : 'outgoing'}">
            <div class="dd-conv-meta">${c.from} · ${c.time}</div>
            <div class="dd-conv-body">${c.body}</div>
          </div>
        `).join('')}
      </div>
      <div class="divider"></div>
      <div class="dd-section-title">CSAT</div>
      <div class="text-muted" style="font-size:12px">Not yet rated</div>`;
  }

  // ── QA AGENT PROFILE PANEL ──
  function renderQAAgent(container, agent) {
    // Load coaching notes from localStorage
    const storageKey = 'coaching-' + agent.id;
    let coachingData = { entries: [] };
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) coachingData = JSON.parse(stored);
    } catch {}

    const historyHtml = coachingData.entries.length > 0
      ? coachingData.entries.slice(-5).reverse().map(e =>
          `<div class="coaching-history-entry">
            <span class="coaching-history-time">${e.date}</span>
            <span class="coaching-history-text">${e.text}</span>
          </div>`
        ).join('')
      : '<div class="text-muted" style="font-size:12px">No coaching notes yet</div>';

    const latestNote = coachingData.entries.length > 0
      ? coachingData.entries[coachingData.entries.length - 1].text
      : '';

    container.innerHTML = `
      <div class="dd-header">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="agent-avatar agent-avatar-lg">${agent.initials}</div>
          <div>
            <h3 style="margin:0">${agent.name}</h3>
            <span class="text-muted">${agent.tickets} tickets scored</span>
          </div>
        </div>
        ${UI.scoreGauge(agent.score, agent.prevScore)}
      </div>

      ${agent.flags > 0 ? `<div style="margin-bottom:12px">${UI.badge(agent.flags + ' churn flag' + (agent.flags !== 1 ? 's' : ''), agent.flags >= 3 ? 'badge-red' : 'badge-yellow')}</div>` : ''}

      <div class="divider"></div>
      <div class="dd-section-title">Coaching Notes</div>
      <div class="coaching-note-box">
        <textarea class="coaching-textarea" id="coaching-note-input" placeholder="Write coaching feedback for ${agent.name}...">${latestNote}</textarea>
        <div class="coaching-note-actions">
          <button class="btn btn-primary btn-sm" id="save-coaching-note">Save Note</button>
          <span class="coaching-save-status" id="coaching-save-status"></span>
        </div>
      </div>
      <div class="coaching-history" id="coaching-history">
        <div class="dd-section-title" style="font-size:11px;margin-top:8px">Note History</div>
        ${historyHtml}
      </div>

      <div class="divider"></div>
      <div class="dd-section-title">Dimensions <span class="text-muted" style="font-size:11px">(markers show team avg)</span></div>
      ${agent.dimensions.map(d => UI.dimBarCompare(d.label, d.score, d.teamAvg, d.color)).join('')}

      <div class="divider"></div>
      <div class="dd-section-title">Worst Tickets</div>
      <div class="dd-ticket-list" id="qa-worst-tickets">
        ${agent.worstTickets.map(t => `
          <div class="dd-ticket-row tr-clickable" data-ticket-id="${t.id}">
            <span class="font-mono">${t.id}</span>
            <span class="dd-ticket-subject">${t.title}</span>
            <span class="mono" style="color:${UI.scoreColor(t.score)};font-size:12px;min-width:28px;text-align:right">${t.score}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Wire save coaching note
    const saveBtn = container.querySelector('#save-coaching-note');
    const textarea = container.querySelector('#coaching-note-input');
    const status = container.querySelector('#coaching-save-status');

    if (saveBtn && textarea) {
      saveBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        coachingData.entries.push({ text, date: dateStr });
        localStorage.setItem(storageKey, JSON.stringify(coachingData));
        if (status) {
          status.textContent = 'Saved';
          status.style.color = 'var(--green)';
          setTimeout(() => { status.textContent = ''; }, 2000);
        }
        // Re-render history
        const historyEl = container.querySelector('#coaching-history');
        if (historyEl) {
          historyEl.innerHTML = `
            <div class="dd-section-title" style="font-size:11px;margin-top:8px">Note History</div>
            ${coachingData.entries.slice(-5).reverse().map(e =>
              `<div class="coaching-history-entry">
                <span class="coaching-history-time">${e.date}</span>
                <span class="coaching-history-text">${e.text}</span>
              </div>`
            ).join('')}
          `;
        }
      });
    }

    // Wire worst ticket clicks
    container.querySelectorAll('#qa-worst-tickets .dd-ticket-row').forEach(row => {
      row.addEventListener('click', () => {
        const ticketId = row.dataset.ticketId;
        const ticket = agent.worstTickets.find(t => t.id === ticketId);
        if (ticket) open('qa-eval', { ...ticket, agentName: agent.name });
      });
    });
  }

  // ── QA TICKET EVALUATION PANEL ──
  function renderQAEval(container, data) {
    const overallScore = data.score;

    // Derive coaching actions from dimensions
    const sorted = [...data.dimensions].sort((a, b) => a.score - b.score);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const mid = sorted[Math.floor(sorted.length / 2)];

    container.innerHTML = `
      <div class="dd-header">
        <div>
          <h3><span class="font-mono">${data.id}</span></h3>
          <div class="text-muted" style="font-size:12px">${data.company}${data.agentName ? ' &middot; ' + data.agentName : ''}</div>
        </div>
        <div class="score-gauge-block">
          <span class="score-gauge-big" style="color:${UI.scoreColor(overallScore)}">${overallScore}</span>
          <span class="score-gauge-sub">/ 100</span>
        </div>
      </div>
      <div class="dd-subject">${data.title}</div>

      <div class="divider"></div>
      <div class="dd-section-title">Conversation</div>
      <div class="dd-conversations">
        ${data.conversation.map(c => `
          <div class="dd-conv ${c.incoming ? 'incoming' : 'outgoing'}">
            <div class="dd-conv-meta">${c.from} &middot; ${c.time}</div>
            <div class="dd-conv-body">${c.body}</div>
          </div>
        `).join('')}
      </div>

      <div class="divider"></div>
      <div class="dd-section-title">Dimension Scores</div>
      ${data.dimensions.map(d => `
        <div class="dim-row">
          <div class="dim-label-row">
            <span>${d.label}</span>
            <span class="dim-val">${d.score} / 5</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${(d.score / 5) * 100}%;background:${UI.scoreColor(d.score * 20)}"></div>
          </div>
          <div class="dim-feedback">${d.feedback}</div>
        </div>
      `).join('')}

      <div class="divider"></div>
      <div class="dd-section-title">AI Insight</div>
      <div class="eval-insight">
        ${data.insight}
      </div>

      <div class="divider"></div>
      <div class="dd-section-title">Coaching Actions</div>
      ${UI.coachingAction('stop', worst.feedback)}
      ${UI.coachingAction('start', mid.feedback)}
      ${UI.coachingAction('continue', best.feedback)}
    `;
  }

  // ── INIT: wire overlay close + escape ──
  function init() {
    const overlay = getOverlay();
    if (overlay) overlay.addEventListener('click', close);

    document.getElementById('drilldown-close')?.addEventListener('click', close);
    document.getElementById('drilldown-back')?.addEventListener('click', back);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  return { open, close, back };
})();
