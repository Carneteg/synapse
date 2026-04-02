/**
 * app.js — Bootstrap
 * Wires up navigation and loads the default page.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── AUTH GATE ──
  Auth.init();

  function bootApp() {
    // ── NAV CLICKS ──
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => Router.go(item.dataset.page));
    });

    // ── TOPBAR SYNC BUTTON ──
    document.getElementById('topbar-sync-btn')?.addEventListener('click', () => {
      Router.go('sync');
    });

    // ── INITIAL PAGE ──
    Router.go('dashboard');
  }

  if (Auth.isAuthenticated()) {
    bootApp();
  } else {
    document.addEventListener('authSuccess', bootApp, { once: true });
  }

});
