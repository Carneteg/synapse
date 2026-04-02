/**
 * freshdesk.js — Authenticated Freshdesk API client
 * Handles auth, errors, pagination, rate limiting with exponential backoff.
 * Covers: tickets, agents, groups, companies, conversations,
 *         CSAT, SLA policies, and supporting data endpoints.
 */

// ── Rate-limit tracking ──
const rateLimit = {
  remaining: null,
  used: null,
  total: null,
  retryAfter: 0,  // timestamp (ms) when we can retry
};

// ── Exponential backoff config ──
const BACKOFF = {
  initial: 1000,   // 1s
  max: 32000,      // 32s
  factor: 2,
  maxRetries: 5,
};

// ── Custom error class ──
class FreshdeskError extends Error {
  constructor(status, statusText, detail, path) {
    super(`Freshdesk API ${status}: ${statusText}`);
    this.name = 'FreshdeskError';
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
    this.path = path;
    this.retryable = status === 429 || status >= 500;
  }
}

function getConfig() {
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!domain || !apiKey) return null;
  return {
    baseUrl: `https://${domain}.freshdesk.com/api/v2`,
    auth: 'Basic ' + Buffer.from(`${apiKey}:X`).toString('base64'),
    domain,
  };
}

function isConfigured() {
  return !!getConfig();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Core fetch with rate-limit header tracking.
 * Does NOT retry — that's handled by getWithRetry().
 * Returns { data, status } on success. Throws FreshdeskError on failure.
 */
async function rawGet(path) {
  const cfg = getConfig();
  if (!cfg) throw new FreshdeskError(0, 'Not Configured', 'Freshdesk credentials not configured', path);

  // Pre-flight: wait if we know we're rate-limited
  if (rateLimit.retryAfter > Date.now()) {
    const waitMs = rateLimit.retryAfter - Date.now();
    console.log(`[freshdesk] Pre-flight rate-limit wait: ${Math.ceil(waitMs / 1000)}s`);
    await sleep(waitMs);
  }

  const url = `${cfg.baseUrl}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'Authorization': cfg.auth,
        'Content-Type': 'application/json',
      },
    });
  } catch (networkErr) {
    throw new FreshdeskError(0, 'Network Error', networkErr.message, path);
  }

  // ── Track rate-limit headers on every response ──
  const rlRemaining = res.headers.get('x-ratelimit-remaining');
  const rlUsed = res.headers.get('x-ratelimit-used-currentrequest') || res.headers.get('x-ratelimit-used');
  const rlTotal = res.headers.get('x-ratelimit-total');

  if (rlRemaining !== null) rateLimit.remaining = parseInt(rlRemaining, 10);
  if (rlUsed !== null)      rateLimit.used = parseInt(rlUsed, 10);
  if (rlTotal !== null)     rateLimit.total = parseInt(rlTotal, 10);

  // ── Log when running low ──
  if (rateLimit.remaining !== null && rateLimit.remaining < 20) {
    console.warn(`[freshdesk] Rate limit low: ${rateLimit.remaining} remaining of ${rateLimit.total || '?'}`);
  }

  // ── Handle error statuses ──
  if (!res.ok) {
    const body = await res.text().catch(() => '');

    // 429: set retryAfter from header
    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get('retry-after') || '60', 10);
      rateLimit.retryAfter = Date.now() + retryAfterSec * 1000;
      console.warn(`[freshdesk] 429 rate limited on ${path}. Retry-After: ${retryAfterSec}s`);
    }

    throw new FreshdeskError(res.status, res.statusText, body.slice(0, 500), path);
  }

  return res.json();
}

/**
 * GET with exponential backoff for retryable errors (429, 5xx).
 * Non-retryable errors (400, 401, 403, 404) throw immediately.
 */
async function get(path) {
  let lastErr;
  let delay = BACKOFF.initial;

  for (let attempt = 0; attempt <= BACKOFF.maxRetries; attempt++) {
    try {
      return await rawGet(path);
    } catch (err) {
      lastErr = err;

      // ── Non-retryable errors: throw immediately ──
      if (!err.retryable) {
        // 400: Bad request — log and throw
        if (err.status === 400) {
          console.error(`[freshdesk] 400 Bad Request on ${path}: ${err.detail}`);
        }
        // 401: Invalid API key
        if (err.status === 401) {
          console.error(`[freshdesk] 401 Unauthorized — API key is invalid`);
        }
        // 403: Insufficient permissions
        if (err.status === 403) {
          console.error(`[freshdesk] 403 Forbidden on ${path} — insufficient permissions`);
        }
        // 404: Not found
        if (err.status === 404) {
          console.warn(`[freshdesk] 404 Not Found: ${path}`);
        }
        throw err;
      }

      // ── Retryable: backoff ──
      if (attempt < BACKOFF.maxRetries) {
        // For 429, use retry-after if available (already set in rawGet)
        const waitMs = err.status === 429
          ? Math.max(delay, (rateLimit.retryAfter - Date.now()))
          : delay;

        console.warn(`[freshdesk] ${err.status} on ${path} — retry ${attempt + 1}/${BACKOFF.maxRetries} in ${Math.ceil(waitMs / 1000)}s`);
        await sleep(Math.max(waitMs, 100));
        delay = Math.min(delay * BACKOFF.factor, BACKOFF.max);
      }
    }
  }

  // All retries exhausted
  console.error(`[freshdesk] All ${BACKOFF.maxRetries} retries exhausted for ${path}`);
  throw lastErr;
}

/**
 * Auto-paginate a list endpoint (max 100 per page).
 */
async function paginate(path, maxPages = 10) {
  const sep = path.includes('?') ? '&' : '?';
  let all = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await get(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(data)) {
      if (data.results) return data.results;
      return [data];
    }
    all = all.concat(data);
    if (data.length < 100) break;
  }

  return all;
}

/**
 * Validate connection.
 */
async function testConnection() {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: 'Credentials not configured' };

  try {
    await get('/agents?per_page=1');
    return { ok: true, domain: cfg.domain, rateLimit: { ...rateLimit, retryAfter: undefined } };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      status: err.status,
      hint: err.status === 401 ? 'Check your FRESHDESK_API_KEY in .env'
          : err.status === 403 ? 'API key lacks required permissions'
          : undefined,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────────────────────────────

async function listTickets(opts = {}) {
  const params = [];
  if (opts.filter)        params.push(`filter=${opts.filter}`);
  if (opts.updated_since) params.push(`updated_since=${opts.updated_since}`);
  if (opts.order_by)      params.push(`order_by=${opts.order_by}`);
  if (opts.order_type)    params.push(`order_type=${opts.order_type}`);
  if (opts.include)       params.push(`include=${opts.include}`);
  const qs = params.length > 0 ? '?' + params.join('&') : '';
  return paginate(`/tickets${qs}`, opts.maxPages || 10);
}

async function getTicket(id, include) {
  const qs = include ? `?include=${include}` : '';
  return get(`/tickets/${id}${qs}`);
}

async function searchTickets(query) {
  const encoded = encodeURIComponent(`"${query}"`);
  const data = await get(`/search/tickets?query=${encoded}`);
  return { total: data.total || 0, results: data.results || [] };
}

async function getConversations(ticketId) {
  return paginate(`/tickets/${ticketId}/conversations`, 5);
}

async function getTimeEntries(ticketId) {
  return get(`/tickets/${ticketId}/time_entries`);
}

async function getSatisfactionRatings(ticketId) {
  return get(`/tickets/${ticketId}/satisfaction_ratings`);
}

// ─────────────────────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────────────────────

async function listAgents()              { return paginate('/agents'); }
async function getAgent(id)              { return get(`/agents/${id}`); }
async function getMe()                   { return get('/agents/me'); }
async function autocompleteAgents(term)  { return get(`/agents/autocomplete?term=${encodeURIComponent(term)}`); }

// ─────────────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────────────

async function listGroups()  { return paginate('/groups'); }
async function getGroup(id)  { return get(`/groups/${id}`); }

// ─────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────

async function listCompanies()                { return paginate('/companies'); }
async function getCompany(id)                 { return get(`/companies/${id}`); }
async function autocompleteCompanies(name)    { return get(`/companies/autocomplete?name=${encodeURIComponent(name)}`); }
async function searchCompanies(query) {
  const encoded = encodeURIComponent(`"${query}"`);
  const data = await get(`/search/companies?query=${encoded}`);
  return { total: data.total || 0, results: data.results || [] };
}

// ─────────────────────────────────────────────────────────────────────
// CSAT / SLA / SUPPORTING
// ─────────────────────────────────────────────────────────────────────

async function listCSATSurveys()     { return get('/customer-satisfaction/surveys'); }
async function listSLAPolicies()     { return get('/sla_policies'); }
async function listTicketFields()    { return get('/ticket_fields'); }
async function listAllTimeEntries()  { return paginate('/time_entries'); }
async function listProducts()        { return get('/products'); }
async function listBusinessHours()   { return get('/business_hours'); }
async function listEmailConfigs()    { return get('/email_configs'); }
async function getHelpdeskSettings() { return get('/settings/helpdesk'); }

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  // Core
  get, paginate, testConnection, isConfigured, getConfig,
  FreshdeskError,
  getRateLimit: () => ({ ...rateLimit, retryAfter: rateLimit.retryAfter > Date.now() ? rateLimit.retryAfter : null }),

  // Tickets
  listTickets, getTicket, searchTickets,
  getConversations, getTimeEntries, getSatisfactionRatings,

  // Agents
  listAgents, getAgent, getMe, autocompleteAgents,

  // Groups
  listGroups, getGroup,

  // Companies
  listCompanies, getCompany, autocompleteCompanies, searchCompanies,

  // CSAT / SLA / Supporting
  listCSATSurveys, listSLAPolicies, listTicketFields,
  listAllTimeEntries, listProducts, listBusinessHours,
  listEmailConfigs, getHelpdeskSettings,
};
