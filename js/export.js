/**
 * export.js — Export engine for Synapse
 *
 * Extends the UI object with:
 *   - CSV export with date range metadata + filename suffix
 *   - JSON export with date range metadata
 *   - Print helper with date range in header
 *   - Export dropdown component (HTML + wiring)
 *   - Table-aware export (reads filtered/sorted state)
 *   - Full report export (multi-section CSV)
 *
 * All exports automatically include the active date range from the
 * topbar DateRange picker when set.
 *
 * Role-gated: export buttons only render for manager/admin.
 * Loaded after components.js, auth.js, and data.js (for DateRange).
 */

(() => {

  // ── HELPERS ──

  function exportDate() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /** Build filename suffix including date range if active. */
  function fileSuffix() {
    const range = typeof DateRange !== 'undefined' ? DateRange.get() : {};
    if (range.from && range.to) {
      return `${range.from}_to_${range.to}`;
    }
    return exportDate();
  }

  /** Human-readable date range string, or "All time". */
  function rangeLabel() {
    const range = typeof DateRange !== 'undefined' ? DateRange.get() : {};
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Until ${range.to}`;
    return 'All time';
  }

  function stripHTML(str) {
    if (str == null) return '';
    return String(str).replace(/<[^>]*>/g, '');
  }

  function escapeCSV(val) {
    const s = stripHTML(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  // ── CSV EXPORT (with date range metadata) ──

  UI.exportCSV = function(data, columns, filenameBase) {
    if (!data || !data.length) return;

    const lines = [];
    // Metadata header
    lines.push(`# Synapse Report: ${filenameBase}`);
    lines.push(`# Exported: ${new Date().toLocaleString()}`);
    lines.push(`# Date Range: ${rangeLabel()}`);
    lines.push(`# Rows: ${data.length}`);
    lines.push('');

    // Column header
    lines.push(columns.map(c => escapeCSV(c.label)).join(','));

    // Data rows
    for (const row of data) {
      lines.push(columns.map(c => escapeCSV(row[c.key])).join(','));
    }

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `synapse_${filenameBase}_${fileSuffix()}.csv`);
  };

  // ── JSON EXPORT (with date range metadata) ──

  UI.exportJSON = function(data, filenameBase) {
    if (!data) return;
    const envelope = {
      _meta: {
        report: filenameBase,
        exported: new Date().toISOString(),
        dateRange: rangeLabel(),
        rows: Array.isArray(data) ? data.length : 1,
      },
      data,
    };
    const json = JSON.stringify(envelope, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `synapse_${filenameBase}_${fileSuffix()}.json`);
  };

  // ── TABLE-AWARE CSV EXPORT ──

  UI.tableExportCSV = function(tableId, filenameBase) {
    const cfg = UI._tableConfigs[tableId];
    if (!cfg) return;
    const state = UI._tableStates[tableId];
    const data = state ? state.getFiltered() : cfg.data;
    const columns = cfg.columns.map(c => ({ key: c.key, label: c.label }));
    UI.exportCSV(data, columns, filenameBase);
  };

  // ── PRINT HELPER (with date range in header) ──

  UI.printPage = function(title) {
    const container = document.getElementById('page-container');
    if (container) {
      container.setAttribute('data-print-title', title || 'Report');
      container.setAttribute('data-print-date', exportDate());
      container.setAttribute('data-print-range', rangeLabel());
    }
    window.print();
  };

  // ── FULL REPORT EXPORT (multi-section CSV) ──

  UI.exportFullReport = function() {
    const lines = [];
    const range = rangeLabel();

    lines.push('# ═══════════════════════════════════════');
    lines.push('# SYNAPSE FULL REPORT');
    lines.push(`# Exported: ${new Date().toLocaleString()}`);
    lines.push(`# Date Range: ${range}`);
    lines.push('# ═══════════════════════════════════════');
    lines.push('');

    // Section 1: QA Agent Scores
    lines.push('# ── QA AGENT SCORES ──');
    lines.push('Agent,Tickets,Avg Score,Flags');
    for (const a of (DATA.qaAgents || [])) {
      lines.push([escapeCSV(a.name), a.tickets, a.score, a.flags].join(','));
    }
    lines.push('');

    // Section 2: QA Dimensions
    lines.push('# ── QA DIMENSIONS ──');
    lines.push('Dimension,Score (out of 5)');
    for (const d of (DATA.qaDimensions || [])) {
      lines.push([escapeCSV(d.label), d.score].join(','));
    }
    lines.push('');

    // Section 3: Churn Risk
    lines.push('# ── CHURN RISK TICKETS ──');
    lines.push('Ticket,Company,Score,CSAT Est,Signal');
    for (const t of (DATA.churnTickets || [])) {
      lines.push([t.id, escapeCSV(t.company), t.score, t.csat, escapeCSV(t.signal)].join(','));
    }
    lines.push('');

    // Section 4: Company Health
    lines.push('# ── COMPANY HEALTH ──');
    lines.push('Company,Tickets,Resolution Rate,Avg Resolution,Repeats,ARR (NOK),SLA,Status');
    for (const c of (DATA.accountsUnified || [])) {
      lines.push([escapeCSV(c.company), c.tickets, c.resRate, c.avgRes, c.repeats, c.arr, c.sla, c.status].join(','));
    }
    lines.push('');

    // Section 5: At-Risk Accounts
    lines.push('# ── AT-RISK ACCOUNTS ──');
    lines.push('Company,ARR (NOK),Tickets,Repeats,Status');
    for (const a of (DATA.atRiskAccounts || [])) {
      lines.push([escapeCSV(a.company), a.arr, a.tickets, a.repeats, a.status].join(','));
    }
    lines.push('');

    // Section 6: Priority Queue
    lines.push('# ── URGENT TICKETS ──');
    lines.push('Ticket,Subject,Priority,Age,SLA,ARR');
    for (const t of (DATA.pressingTickets || [])) {
      lines.push([t.id, escapeCSV(t.title), t.priority, t.age, t.sla, t.arr].join(','));
    }
    lines.push('');

    // Section 7: Coaching Summary
    lines.push('# ── COACHING SUMMARY ──');
    lines.push('Agent,Score,Previous,Delta,Tickets,Flags');
    for (const a of (DATA.qaCoaching || [])) {
      lines.push([escapeCSV(a.name), a.score, a.prevScore, a.score - a.prevScore, a.tickets, a.flags].join(','));
    }
    lines.push('');

    // Section 8: Auto-Responder Drafts
    lines.push('# ── AUTO-RESPONDER DRAFTS ──');
    lines.push('Ticket,Subject,Confidence,Status');
    for (const d of (DATA.drafts || [])) {
      lines.push([d.id, escapeCSV(d.title), d.conf, d.status].join(','));
    }

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `synapse_full-report_${fileSuffix()}.csv`);
  };

  // ── EXPORT DROPDOWN (HTML generator) ──

  UI.exportDropdown = function(opts) {
    const { id, items } = opts;
    if (!items || !items.length) return '';
    const menuItems = items.map(item =>
      `<div class="export-dd-item" data-action="${item.action}">${item.icon || ''} ${item.label}</div>`
    ).join('');
    return `<div class="export-dd" id="export-dd-${id}"><button class="btn btn-ghost btn-sm export-dd-trigger" type="button">\u2193 Export</button><div class="export-dd-menu">${menuItems}</div></div>`;
  };

  // ── EXPORT DROPDOWN (post-render wiring) ──

  UI.exportDropdownInit = function(id, handlers) {
    const dd = document.getElementById('export-dd-' + id);
    if (!dd) return;
    const trigger = dd.querySelector('.export-dd-trigger');
    const menu = dd.querySelector('.export-dd-menu');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.export-dd.open').forEach(d => {
        if (d !== dd) d.classList.remove('open');
      });
      dd.classList.toggle('open');
    });

    menu.querySelectorAll('.export-dd-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const action = item.dataset.action;
        dd.classList.remove('open');
        if (handlers[action]) handlers[action]();
      });
    });
  };

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.export-dd.open').forEach(d => d.classList.remove('open'));
  });

  // ── TABLE EXPORT BUTTON (convenience) ──

  UI.tableExportBtn = function(tableId, filenameBase) {
    if (typeof Auth !== 'undefined' && !Auth.hasRole('manager')) return '';
    return UI.exportDropdown({
      id: tableId,
      items: [
        { label: 'CSV', icon: '\u229E', action: 'csv' },
        { label: 'Print', icon: '\u2399', action: 'print' },
      ]
    });
  };

  UI.tableExportBtnInit = function(tableId, filenameBase, printTitle) {
    UI.exportDropdownInit(tableId, {
      csv: () => UI.tableExportCSV(tableId, filenameBase),
      print: () => UI.printPage(printTitle || filenameBase),
    });
  };

  /** Full report export button (for dashboard). */
  UI.fullReportBtn = function() {
    if (typeof Auth !== 'undefined' && !Auth.hasRole('manager')) return '';
    return UI.exportDropdown({
      id: 'full-report',
      items: [
        { label: 'Full Report (CSV)', icon: '\u229E', action: 'csv' },
        { label: 'Print Page', icon: '\u2399', action: 'print' },
      ]
    });
  };

  UI.fullReportBtnInit = function(printTitle) {
    UI.exportDropdownInit('full-report', {
      csv: () => UI.exportFullReport(),
      print: () => UI.printPage(printTitle || 'Synapse Dashboard'),
    });
  };

  // ── INJECT DROPDOWN STYLES ──

  const style = document.createElement('style');
  style.textContent = `
    .export-dd { position: relative; display: inline-block; }
    .export-dd-trigger { cursor: pointer; font-size: 12px; }
    .export-dd-menu {
      display: none; position: absolute; right: 0; top: 100%; margin-top: 4px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 6px; min-width: 160px; z-index: 300;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      overflow: hidden;
    }
    .export-dd.open .export-dd-menu { display: block; }
    .export-dd-item {
      padding: 8px 14px; font-size: 12px; cursor: pointer;
      color: var(--text-dim); transition: background 0.12s, color 0.12s;
      font-family: 'DM Mono', monospace;
      white-space: nowrap;
    }
    .export-dd-item:hover {
      background: rgba(255,255,255,0.06); color: var(--text);
    }
    @media print { .export-dd { display: none !important; } }
  `;
  document.head.appendChild(style);

})();
