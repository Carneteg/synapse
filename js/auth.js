/**
 * auth.js — Gate access behind a login screen.
 */
const Auth = (() => {
  const CREDS = {
    email: 'admin@simployer.com',
    pass: 'SimployerQA2026!'
  };

  function isAuthenticated() {
    return sessionStorage.getItem('synapse_auth') === '1';
  }

  function init() {
    const screen = document.getElementById('login-screen');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');

    if (isAuthenticated()) {
      screen.classList.add('hidden');
      sidebar.style.display = '';
      main.style.display = '';
      return;
    }

    // Hide app until login
    sidebar.style.display = 'none';
    main.style.display = 'none';

    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      const err = document.getElementById('login-error');

      if (email === CREDS.email && pass === CREDS.pass) {
        sessionStorage.setItem('synapse_auth', '1');
        screen.classList.add('hidden');
        sidebar.style.display = '';
        main.style.display = '';
        document.dispatchEvent(new Event('authSuccess'));
      } else {
        err.textContent = 'Invalid email or password';
        document.getElementById('login-password').value = '';
      }
    });
  }

  return { init, isAuthenticated };
})();
