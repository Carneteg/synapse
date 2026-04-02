/**
 * api.js — Frontend API client for Freshdesk proxy
 * Handles structured error responses, surfaces critical errors (401/403),
 * and falls back to mock data when proxy is unavailable.
 */

const API = (() => {
  let available = false;
  let domain = null;
  let lastError = null;

  /**
   * Fetch from proxy with structured error handling.
   * Returns { data, error } — never throws.
   */
  async function fetchJSON(endpoint) {
    try {
      const res = await fetch(`/api/freshdesk/${endpoint}`);
      const body = await res.json();

      if (!res.ok) {
        const err = { status: res.status, message: body.error, action: body.action, critical: body.critical };

        // 401: Invalid API key — surface immediately
        if (res.status === 401) {
          console.error('[API] 401 — Invalid API key:', body.action);
          surfaceError('Authentication Failed', body.action || 'Invalid API key. Check .env configuration.');
          available = false;
          updateIndicator(false);
        }

        // 403: Forbidden
        if (res.status === 403) {
          console.warn('[API] 403 — Forbidden:', body.action);
          surfaceError('Permission Denied', body.action || 'Insufficient API permissions for this resource.');
        }

        // 429: Rate limited (server handles retry, but inform UI)
        if (res.status === 429) {
          console.warn('[API] 429 — Rate limited. Server will retry.');
        }

        // 503: Not configured
        if (res.status === 503) {
          return { data: null, error: err };
        }

        lastError = err;
        return { data: null, error: err };
      }

      lastError = null;
      return { data: body, error: null };
    } catch (networkErr) {
      // Network failure — proxy unreachable
      return { data: null, error: { status: 0, message: networkErr.message } };
    }
  }

  /**
   * Surface a critical error to the user via a topbar notification.
   */
  function surfaceError(title, message) {
    const el = document.getElementById('data-source-indicator');
    if (!el) return;
    el.className = 'data-indicator error';
    el.innerHTML = `<span class="data-indicator-dot"></span> Error`;
    el.title = `${title}: ${message}`;
  }

  /**
   * Hydrate DATA object with live values.
   */
  function hydrate(liveData) {
    if (!liveData) return;
    const skip = ['_cached', '_cacheKey', '_raw_count'];
    for (const [key, value] of Object.entries(liveData)) {
      if (skip.includes(key)) continue;
      if (DATA.hasOwnProperty(key)) {
        DATA[key] = value;
      }
    }
  }

  /**
   * Check proxy availability and Freshdesk config.
   */
  async function init() {
    const { data: status } = await fetchJSON('status');

    if (status && status.ok) {
      available = true;
      domain = status.domain;
      updateIndicator(true, domain);
      await refreshAll();
    } else if (status && status.configured && !status.ok) {
      // Configured but connection failed (bad key, network, etc.)
      available = false;
      surfaceError('Connection Failed', status.error || 'Could not connect to Freshdesk');
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

    let anyFailed = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data) {
        hydrate(r.value.data);
      } else if (r.status === 'fulfilled' && r.value.error) {
        // If 401, init already handled it — don't double-surface
        if (r.value.error.status !== 401) anyFailed = true;
      }
    }

    if (anyFailed && available) {
      console.warn('[API] Some endpoints failed during refresh');
    }

    // Re-render current page
    const hash = location.hash;
    if (hash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  /**
   * Clear server cache and re-fetch.
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

  // ── Service helpers (cache-first, high-level) ──

  async function service(name) {
    const { data } = await fetchJSON(`../api/services/${name}`);
    return data;
  }

  return {
    get available() { return available; },
    get domain() { return domain; },
    get lastError() { return lastError; },
    init,
    refreshAll,
    clearCacheAndRefresh,
    fetchJSON,

    // Data services — each returns the service response or null
    getDashboardStats:      () => service('dashboard-stats'),
    getActionableInsights:  () => service('actionable-insights'),
    getTicketTrends:     (days) => service(`ticket-trends?days=${days || 30}`),
    getTopIssues:           () => service('top-issues'),
    getAgentPerformance:    () => service('agent-performance'),
    getGroupPerformance:    () => service('group-performance'),
    getCSATByAgent:         () => service('csat-by-agent'),
    getWorstScoredTickets:  () => service('worst-scored'),
    getDraftQueue:          () => service('draft-queue'),
    getCompanyHealth:       () => service('company-health'),
    getContactsByCompany: (id) => service(`companies/${id}/contacts`),
    getTicketsByContact:  (id) => service(`contacts/${id}/tickets`),
    getTicketDetail:      (id) => service(`tickets/${id}/detail`),
    getAgentTickets:      (id) => service(`agents/${id}/tickets`),
  };
})();
