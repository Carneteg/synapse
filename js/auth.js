/**
 * auth.js — Authentication, session management, role-based access.
 *
 * Features:
 *   - Multi-user credential map with roles (agent / manager / admin)
 *   - Persistent sessions via localStorage (survives browser close)
 *   - Configurable idle timeout with warning toast
 *   - Failed-login lockout (5 attempts → 60 s cooldown)
 *   - Logout flow (button + auto on expiry)
 */

const Auth = (() => {

  // ── CONFIG ──
  const TIMEOUT_MS      = 30 * 60 * 1000;   // 30 min idle timeout
  const WARNING_MS      = 2  * 60 * 1000;   // show warning 2 min before expiry
  const TICK_MS         = 30 * 1000;         // check every 30 s
  const TOUCH_THROTTLE  = 60 * 1000;         // update lastActivity at most every 60 s
  const MAX_ATTEMPTS    = 5;
  const LOCKOUT_MS      = 60 * 1000;         // 60 s lockout after MAX_ATTEMPTS

  const STORAGE_KEY     = 'synapse_session';
  const LOCKOUT_KEY     = 'synapse_lockout';

  // ── ROLE HIERARCHY ──
  const ROLE_LEVEL = { agent: 0, manager: 1, admin: 2 };

  // ── USER DIRECTORY (demo — production would hit an API) ──
  const USERS = {
    'admin@simployer.com':   { pass: 'SimployerQA2026!', name: 'Admin User', role: 'admin',   initials: 'AU' },
    'manager@simployer.com': { pass: 'SimployerQA2026!', name: 'Team Lead',  role: 'manager', initials: 'TL' },
    'sara@simployer.com':    { pass: 'SimployerQA2026!', name: 'Sara L.',    role: 'agent',   initials: 'SL' },
    'jonas@simployer.com':   { pass: 'SimployerQA2026!', name: 'Jonas P.',   role: 'agent',   initials: 'JP' },
  };

  let _timerId   = null;
  let _lastTouch = 0;
  let _warningShown = false;

  // ── SESSION HELPERS ──
  function _saveSession(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function _loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch { return null; }
  }

  function _clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── LOCKOUT HELPERS ──
  function _getLockout() {
    try { return JSON.parse(sessionStorage.getItem(LOCKOUT_KEY)) || { attempts: 0, lockedUntil: 0 }; }
    catch { return { attempts: 0, lockedUntil: 0 }; }
  }

  function _setLockout(obj) {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(obj));
  }

  function _clearLockout() {
    sessionStorage.removeItem(LOCKOUT_KEY);
  }

  // ── PUBLIC API ──

  function getUser() {
    const s = _loadSession();
    if (!s) return null;
    return { email: s.email, name: s.name, role: s.role, initials: s.initials };
  }

  function isAuthenticated() {
    const s = _loadSession();
    if (!s) return false;
    if (Date.now() > s.expiresAt) { _clearSession(); return false; }
    return true;
  }

  /** Returns true if current user meets the minimum role requirement. */
  function hasRole(minRole) {
    if (!minRole) return true;             // no restriction
    const user = getUser();
    if (!user) return false;
    return (ROLE_LEVEL[user.role] ?? -1) >= (ROLE_LEVEL[minRole] ?? 99);
  }

  /** Attempt login. Returns { ok, error }. */
  function login(email, pass) {
    const lock = _getLockout();
    if (lock.lockedUntil && Date.now() < lock.lockedUntil) {
      const secs = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
      return { ok: false, error: `Too many attempts. Try again in ${secs}s.` };
    }

    const user = USERS[email.toLowerCase().trim()];
    if (!user || user.pass !== pass) {
      lock.attempts = (lock.attempts || 0) + 1;
      if (lock.attempts >= MAX_ATTEMPTS) {
        lock.lockedUntil = Date.now() + LOCKOUT_MS;
        lock.attempts = 0;
        _setLockout(lock);
        return { ok: false, error: `Too many attempts. Locked for 60 seconds.` };
      }
      _setLockout(lock);
      const remaining = MAX_ATTEMPTS - lock.attempts;
      return { ok: false, error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

    // Success — create session
    _clearLockout();
    const now = Date.now();
    _saveSession({
      email:        email.toLowerCase().trim(),
      name:         user.name,
      role:         user.role,
      initials:     user.initials,
      loginAt:      now,
      lastActivity: now,
      expiresAt:    now + TIMEOUT_MS,
    });
    return { ok: true };
  }

  function logout(reason) {
    _stopTimer();
    _clearSession();
    _hideApp();
    _showLogin(reason);
    document.dispatchEvent(new CustomEvent('authLogout', { detail: { reason } }));
  }

  /** Reset idle timer on user activity (throttled). */
  function touch() {
    const now = Date.now();
    if (now - _lastTouch < TOUCH_THROTTLE) return;
    _lastTouch = now;
    const s = _loadSession();
    if (!s) return;
    s.lastActivity = now;
    s.expiresAt    = now + TIMEOUT_MS;
    _saveSession(s);
    _warningShown = false;
    _hideToast();
  }

  // ── IDLE TIMER ──
  function _startTimer() {
    if (_timerId) return;
    _timerId = setInterval(_tick, TICK_MS);
  }

  function _stopTimer() {
    if (_timerId) { clearInterval(_timerId); _timerId = null; }
    _warningShown = false;
    _hideToast();
  }

  function _tick() {
    const s = _loadSession();
    if (!s) { logout('expired'); return; }
    const remaining = s.expiresAt - Date.now();
    if (remaining <= 0) { logout('expired'); return; }
    if (remaining <= WARNING_MS && !_warningShown) {
      _warningShown = true;
      _showToast(Math.ceil(remaining / 60000));
    }
  }

  // ── TOAST ──
  function _showToast(mins) {
    const el = document.getElementById('session-toast');
    if (!el) return;
    el.querySelector('.session-toast-text').textContent =
      `Session expires in ${mins} min`;
    el.classList.add('visible');
  }

  function _hideToast() {
    const el = document.getElementById('session-toast');
    if (el) el.classList.remove('visible');
  }

  // ── UI SHOW/HIDE ──
  function _hideApp() {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    if (sidebar) sidebar.style.display = 'none';
    if (main)    main.style.display    = 'none';
  }

  function _showApp() {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    if (sidebar) sidebar.style.display = '';
    if (main)    main.style.display    = '';
  }

  function _showLogin(reason) {
    const screen = document.getElementById('login-screen');
    if (screen) screen.classList.remove('hidden');
    // Reset form
    const form  = document.getElementById('login-form');
    const email = document.getElementById('login-email');
    const pass  = document.getElementById('login-password');
    const err   = document.getElementById('login-error');
    if (form)  form.reset();
    if (email) email.value = '';
    if (pass)  pass.value  = '';
    if (err)   err.textContent = reason === 'expired' ? 'Session expired — please sign in again.' : '';
  }

  function _hideLogin() {
    const screen = document.getElementById('login-screen');
    if (screen) screen.classList.add('hidden');
  }

  /** Populate sidebar user block with current user info. */
  function _renderUserBlock() {
    const user = getUser();
    if (!user) return;
    const nameEl     = document.getElementById('sidebar-user-name');
    const initialsEl = document.getElementById('sidebar-user-initials');
    const badgeEl    = document.getElementById('sidebar-user-role');
    if (nameEl)     nameEl.textContent = user.name;
    if (initialsEl) initialsEl.textContent = user.initials;
    if (badgeEl) {
      badgeEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      badgeEl.className = 'badge badge-' + ({ admin: 'purple', manager: 'blue', agent: 'green' }[user.role] || 'gray');
    }
  }

  // ── INIT ──
  function init() {
    const screen  = document.getElementById('login-screen');
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');

    // Wire login form
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-password').value;
      const err   = document.getElementById('login-error');

      const result = login(email, pass);
      if (result.ok) {
        _hideLogin();
        _showApp();
        _renderUserBlock();
        _startTimer();
        document.dispatchEvent(new Event('authSuccess'));
      } else {
        err.textContent = result.error;
        document.getElementById('login-password').value = '';
      }
    });

    // Wire password toggle
    const toggle = document.getElementById('login-pass-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const inp = document.getElementById('login-password');
        const isHidden = inp.type === 'password';
        inp.type = isHidden ? 'text' : 'password';
        toggle.textContent = isHidden ? '◡' : '⊙';
      });
    }

    // Wire session toast "Stay signed in"
    document.getElementById('session-toast-stay')?.addEventListener('click', () => {
      touch();
    });

    // Check existing session
    if (isAuthenticated()) {
      screen.classList.add('hidden');
      sidebar.style.display = '';
      main.style.display = '';
      _renderUserBlock();
      _startTimer();
      return true; // already authed
    }

    // Not authenticated — show login
    sidebar.style.display = 'none';
    main.style.display = 'none';
    return false;
  }

  // ── ACTIVITY TRACKING (wired by app.js) ──
  function startActivityTracking() {
    const handler = () => touch();
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt =>
      document.addEventListener(evt, handler, { passive: true })
    );
  }

  return {
    init,
    isAuthenticated,
    getUser,
    hasRole,
    login,
    logout,
    touch,
    startActivityTracking,
    renderUserBlock: _renderUserBlock,
    ROLE_LEVEL,
  };
})();
