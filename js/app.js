/**
 * app.js — Bootstrap
 * Wires up collapsible navigation, breadcrumb, hash routing,
 * logout, activity tracking, and loads the initial page.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── AUTH GATE ──
  Auth.init();

  function bootApp() {

    // ── UPDATE USER BLOCK ──
    Auth.renderUserBlock();

    // ── ROLE-BASED SIDEBAR FILTERING ──
    filterSidebarByRole();

    // ── COLLAPSIBLE NAV: category header clicks ──
    document.querySelectorAll('.nav-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest('.nav-group');
        const cat = group.dataset.category;

        if (cat === 'home') {
          // Home has no children, navigate directly
          Router.go('dashboard');
          return;
        }

        // If this category is already expanded, just navigate to its default
        if (group.classList.contains('expanded')) {
          Router.go(Router.getCategoryDefault(cat));
        } else {
          // Expand and navigate to default child
          Router.go(Router.getCategoryDefault(cat));
        }
      });
    });

    // ── NAV CHILD CLICKS ──
    document.querySelectorAll('.nav-child[data-page]').forEach(item => {
      item.addEventListener('click', () => Router.go(item.dataset.page));
    });

    // ── BREADCRUMB CLICKS (delegated) ──
    document.getElementById('breadcrumb').addEventListener('click', e => {
      const link = e.target.closest('.breadcrumb-link');
      if (link) Router.go(link.dataset.page);
    });

    // ── BACK BUTTON ──
    document.getElementById('back-btn').addEventListener('click', () => {
      const cat = Router.getCategoryForPage(Router.getInitialPage());
      // Navigate to category default (which is effectively "up one level")
      const currentHash = location.hash;
      const currentId = Object.entries(Router.pageMap).find(([, v]) => v.hash === currentHash)?.[0];
      if (currentId) {
        const pageCat = Router.getCategoryForPage(currentId);
        Router.go(Router.getCategoryDefault(pageCat));
      } else {
        Router.go('dashboard');
      }
    });

    // ── LOGOUT BUTTON ──
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
      Auth.logout('manual');
    });

    // ── DELEGATED NAVIGATION (for data-navigate buttons in stale warnings etc.) ──
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-navigate]');
      if (btn) Router.go(btn.dataset.navigate);
    });

    // ── DATE RANGE PICKER ──
    initDateRangePicker();

    // ── ACTIVITY TRACKING (idle timeout) ──
    Auth.startActivityTracking();

    // ── HASH-BASED ROUTING ──
    Router.initHashListener();

    // ── INITIAL PAGE from hash or default ──
    Router.go(Router.getInitialPage());

    // ── LIVE DATA: attempt to connect to Freshdesk proxy ──
    API.init();
  }

  /**
   * Hide sidebar items the current user's role cannot access.
   * Uses Router.pageMap minRole + Auth.hasRole() to filter.
   */
  function filterSidebarByRole() {
    // Filter individual nav-child items
    document.querySelectorAll('.nav-child[data-page]').forEach(child => {
      const pageId = child.dataset.page;
      const info = Router.pageMap[pageId];
      if (info && info.minRole && !Auth.hasRole(info.minRole)) {
        child.style.display = 'none';
      } else {
        child.style.display = '';
      }
    });

    // Hide nav-groups where the header page itself is restricted
    document.querySelectorAll('.nav-group-header[data-page]').forEach(header => {
      const pageId = header.dataset.page;
      const info = Router.pageMap[pageId];
      if (info && info.minRole && !Auth.hasRole(info.minRole)) {
        const group = header.closest('.nav-group');
        if (group) group.style.display = 'none';
      }
    });

    // Hide nav-groups that have children but ALL children are hidden
    document.querySelectorAll('.nav-group').forEach(group => {
      const children = group.querySelector('.nav-children');
      if (!children) return; // no children = standalone group, already handled
      const visibleChildren = [...children.querySelectorAll('.nav-child')].filter(
        c => c.style.display !== 'none'
      );
      if (visibleChildren.length === 0) {
        group.style.display = 'none';
      }
    });
  }

  // ── HANDLE AUTH LOGOUT (full page reload for clean state) ──
  document.addEventListener('authLogout', () => {
    location.hash = '#/';
    location.reload();
  });

  if (Auth.isAuthenticated()) {
    bootApp();
  } else {
    document.addEventListener('authSuccess', bootApp, { once: true });
  }

  // ═══════════════════════════════════════════
  //  DATE RANGE PICKER
  // ═══════════════════════════════════════════

  function initDateRangePicker() {
    const fromInput = document.getElementById('date-from');
    const toInput   = document.getElementById('date-to');
    const applyBtn  = document.getElementById('date-range-apply');
    const clearBtn  = document.getElementById('date-range-clear');
    if (!fromInput || !toInput || !applyBtn || !clearBtn) return;

    // Restore from sessionStorage
    const saved = DateRange.get();
    if (saved.from) { fromInput.value = saved.from; fromInput.classList.add('date-range-active'); }
    if (saved.to)   { toInput.value = saved.to; toInput.classList.add('date-range-active'); }
    if (saved.from || saved.to) clearBtn.style.display = '';

    // Set sensible defaults (last 30 days) if empty
    if (!fromInput.value) {
      const d = new Date(); d.setDate(d.getDate() - 30);
      fromInput.value = d.toISOString().slice(0, 10);
    }
    if (!toInput.value) {
      toInput.value = new Date().toISOString().slice(0, 10);
    }

    applyBtn.addEventListener('click', async () => {
      const from = fromInput.value;
      const to   = toInput.value;
      if (!from || !to) return;
      if (from > to) { fromInput.value = to; toInput.value = from; }
      DateRange.set(fromInput.value, toInput.value);
      fromInput.classList.add('date-range-active');
      toInput.classList.add('date-range-active');
      clearBtn.style.display = '';
      // Push to server if API is available
      if (typeof API !== 'undefined' && API.available) {
        try {
          await fetch('/api/services/date-range', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: DateRange.fromISO(), to: DateRange.toISO() }),
          });
        } catch {}
      }
      Router.go(Router.getInitialPage());
    });

    clearBtn.addEventListener('click', async () => {
      DateRange.clear();
      fromInput.value = '';
      toInput.value = '';
      fromInput.classList.remove('date-range-active');
      toInput.classList.remove('date-range-active');
      clearBtn.style.display = 'none';
      if (typeof API !== 'undefined' && API.available) {
        try {
          await fetch('/api/services/date-range', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: null, to: null }),
          });
        } catch {}
      }
      Router.go(Router.getInitialPage());
    });
  }

});
