/**
 * app.js — Bootstrap
 * Wires up collapsible navigation, breadcrumb, hash routing, and loads the initial page.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── AUTH GATE ──
  Auth.init();

  function bootApp() {

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

    // ── HASH-BASED ROUTING ──
    Router.initHashListener();

    // ── INITIAL PAGE from hash or default ──
    Router.go(Router.getInitialPage());
  }

  if (Auth.isAuthenticated()) {
    bootApp();
  } else {
    document.addEventListener('authSuccess', bootApp, { once: true });
  }

});
