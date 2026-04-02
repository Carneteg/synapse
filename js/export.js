/**
 * export.js — Export engine for Synapse
 *
 * Extends the UI object with:
 *   - CSV export (any data array or table)
 *   - JSON export (complex nested data)
 *   - Export dropdown component (HTML + wiring)
 *   - Print helper (sets print metadata, calls window.print)
 *   - Table-aware export (reads filtered/sorted state)
 *
 * Role-gated: export buttons only render for manager/admin.
 * Loaded after components.js and auth.js.
 */

(() => {

  // ── HELPERS ──

  function exportDate() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
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

  // ── CSV EXPORT ──

  UI.exportCSV = function(data, columns, filenameBase) {
    if (!data || !data.length) return;
    const header = columns.map(c => escapeCSV(c.label)).join(',');
    const rows = data.map(row =>
      columns.map(c => escapeCSV(row[c.key])).join(',')
    );
    const csv = '\uFEFF' + header + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `synapse_${filenameBase}_${exportDate()}.csv`);
  };

  // ── JSON EXPORT ──

  UI.exportJSON = function(data, filenameBase) {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `synapse_${filenameBase}_${exportDate()}.json`);
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

  // ── PRINT HELPER ──

  UI.printPage = function(title) {
    const container = document.getElementById('page-container');
    if (container) {
      container.setAttribute('data-print-title', title || 'Report');
      container.setAttribute('data-print-date', exportDate());
    }
    window.print();
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
      // Close any other open dropdowns
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

  // Close dropdowns on outside click (single global listener)
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

  // ── INJECT DROPDOWN STYLES (avoids a separate CSS file) ──

  const style = document.createElement('style');
  style.textContent = `
    .export-dd { position: relative; display: inline-block; }
    .export-dd-trigger { cursor: pointer; font-size: 12px; }
    .export-dd-menu {
      display: none; position: absolute; right: 0; top: 100%; margin-top: 4px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 6px; min-width: 120px; z-index: 300;
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
