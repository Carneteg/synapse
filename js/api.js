/**
 * api.js — Frontend API client for Freshdesk proxy
 * Attempts to connect to the backend proxy. If unavailable or unconfigured,
 * falls back silently to mock data in DATA.
 */

const API = (() => {
  let available = false;
  let domain = null;

  /**
   * Fetch from proxy. Returns null on failure.
   */
  async function fetchJSON(endpoint) {
    try {
      const res = await fetch(`/api/freshdesk/${endpoint}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  /**
   * Hydrate DATA object with live values from an API response.
   * Only overwrites keys that exist in the response.
   */
  function hydrate(liveData) {
    if (!liveData) return;
    const skip = ['_cached'];
    for (const [key, value] of Object.entries(liveData)) {
      if (skip.includes(key)) continue;
      if (DATA.hasOwnProperty(key)) {
        DATA[key] = value;
      }
    }
  }

  /**
   * Check if proxy is available and Freshdesk is configured.
   * Updates the data source indicator.
   */
  async function init() {
    const status = await fetchJSON('status');
    if (status && status.ok) {
      available = true;
      domain = status.domain;
      updateIndicator(true, domain);
      await refreshAll();
    } else {
      available = false;
      updateIndicator(false);
    }
    return available;
  }

  /**
   * Fetch all endpoints and hydrate DATA.
   */
  async function refreshAll() {
    if (!available) return;

    const results = await Promise.allSettled([
      fetchJSON('tickets'),
      fetchJSON('companies'),
      fetchJSON('agents'),
      fetchJSON('stats'),
    ]);

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        hydrate(r.value);
      }
    }

    // Re-render current page to show live data
    const hash = location.hash;
    if (hash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  /**
   * Clear server cache and re-fetch everything.
   */
  async function clearCacheAndRefresh() {
    if (!available) return false;
    try {
      await fetch('/api/freshdesk/cache/clear', { method: 'POST' });
      await refreshAll();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update the topbar data source indicator.
   */
  function updateIndicator(live, domainName) {
    const el = document.getElementById('data-source-indicator');
    if (!el) return;
    if (live) {
      el.className = 'data-indicator live';
      el.innerHTML = `<span class="data-indicator-dot"></span> Live`;
      el.title = `Connected to ${domainName}.freshdesk.com`;
    } else {
      el.className = 'data-indicator demo';
      el.innerHTML = `<span class="data-indicator-dot"></span> Demo`;
      el.title = 'Using mock data — configure .env for live Freshdesk data';
    }
  }

  return {
    get available() { return available; },
    get domain() { return domain; },
    init,
    refreshAll,
    clearCacheAndRefresh,
    fetchJSON,
  };
})();
