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
      history.push({ html: body.innerHTML, type: panel.dataset.type });
    }

    panel.dataset.type = type;
    overlay.classList.add('visible');
    panel.classList.add('visible');

    if (type === 'company') renderCompany(body, data);
    else if (type === 'ticket') renderTicket(body, data);
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
    if (body) body.innerHTML = prev.html;
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
