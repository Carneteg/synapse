/**
 * freshdesk.js — Authenticated Freshdesk API client
 * Handles auth, errors, pagination, rate limiting, and all ticket endpoints.
 */

// ── Rate-limit state ──
let rateLimitRemaining = null;
let rateLimitRetryAfter = 0;

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

/**
 * Sleep for ms. Used for rate-limit backoff.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticated GET request to Freshdesk API.
 * Handles rate limiting (429) with automatic retry.
 * Returns parsed JSON. Throws on HTTP errors.
 */
async function get(path) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Freshdesk credentials not configured');

  // If we know we're rate-limited, wait before making the request
  if (rateLimitRetryAfter > Date.now()) {
    const waitMs = rateLimitRetryAfter - Date.now();
    console.log(`[freshdesk] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }

  const url = `${cfg.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': cfg.auth,
      'Content-Type': 'application/json',
    },
  });

  // Track rate-limit headers
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) rateLimitRemaining = parseInt(remaining, 10);

  // Handle 429 Too Many Requests
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    rateLimitRetryAfter = Date.now() + retryAfter * 1000;
    console.warn(`[freshdesk] 429 rate limited. Retry after ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return get(path); // Retry once
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Freshdesk API ${res.status}: ${res.statusText}`);
    err.status = res.status;
    err.detail = body.slice(0, 500);
    throw err;
  }

  return res.json();
}

/**
 * Auto-paginate a list endpoint. Freshdesk max per_page is 100.
 * Returns all results concatenated.
 * @param {string} path - API path (may include query params)
 * @param {number} maxPages - Safety limit on pages to fetch
 */
async function paginate(path, maxPages = 10) {
  const sep = path.includes('?') ? '&' : '?';
  let all = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await get(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(data)) {
      // Search endpoint returns { total, results }
      if (data.results) return data.results;
      return [data];
    }
    all = all.concat(data);
    if (data.length < 100) break;
  }

  return all;
}

/**
 * Validate connection by fetching 1 agent.
 */
async function testConnection() {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: 'Credentials not configured' };

  try {
    await get('/agents?per_page=1');
    return { ok: true, domain: cfg.domain, rateLimitRemaining };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────
// TICKET ENDPOINTS
// ─────────────────────────────────────────────────────────────────────

/**
 * List tickets with optional query parameters.
 * @param {Object} opts
 * @param {string} opts.filter - Predefined filter: new_and_my_open, watching, spam, deleted
 * @param {string} opts.updated_since - ISO date string YYYY-MM-DDTHH:MM:SSZ
 * @param {string} opts.order_by - Field to order by: created_at, due_by, updated_at
 * @param {string} opts.order_type - asc or desc
 * @param {string} opts.include - Comma-separated: requester, stats, description, company
 * @param {number} opts.maxPages - Max pages to fetch (default 10)
 */
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

/**
 * Get a single ticket by ID.
 * @param {number} id - Ticket ID
 * @param {string} include - Optional: requester, stats, description, company
 */
async function getTicket(id, include) {
  const qs = include ? `?include=${include}` : '';
  return get(`/tickets/${id}${qs}`);
}

/**
 * Search tickets using Freshdesk query language.
 * Query examples:
 *   "status:2 OR status:3"
 *   "priority:4 AND created_at:>'2025-01-01'"
 *   "tag:'billing'"
 * @param {string} query - Freshdesk search query string
 */
async function searchTickets(query) {
  const encoded = encodeURIComponent(`"${query}"`);
  const data = await get(`/search/tickets?query=${encoded}`);
  // Search returns { total, results }
  return { total: data.total || 0, results: data.results || [] };
}

/**
 * List conversations on a ticket.
 * @param {number} ticketId
 */
async function getConversations(ticketId) {
  return paginate(`/tickets/${ticketId}/conversations`, 5);
}

/**
 * List time entries on a ticket.
 * @param {number} ticketId
 */
async function getTimeEntries(ticketId) {
  return get(`/tickets/${ticketId}/time_entries`);
}

/**
 * Get satisfaction ratings for a ticket.
 * @param {number} ticketId
 */
async function getSatisfactionRatings(ticketId) {
  return get(`/tickets/${ticketId}/satisfaction_ratings`);
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  // Core
  get,
  paginate,
  testConnection,
  isConfigured,
  getConfig,

  // Tickets
  listTickets,
  getTicket,
  searchTickets,
  getConversations,
  getTimeEntries,
  getSatisfactionRatings,

  // Rate-limit info
  getRateLimitRemaining: () => rateLimitRemaining,
};
