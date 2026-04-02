/**
 * freshdesk.js — Authenticated Freshdesk API client
 * Handles auth, errors, pagination, rate limiting.
 * Covers: tickets, agents, groups, companies, conversations,
 *         CSAT, SLA policies, and supporting data endpoints.
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticated GET request with rate-limit handling.
 */
async function get(path) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Freshdesk credentials not configured');

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

  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) rateLimitRemaining = parseInt(remaining, 10);

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    rateLimitRetryAfter = Date.now() + retryAfter * 1000;
    console.warn(`[freshdesk] 429 rate limited. Retry after ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return get(path);
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

/** List all agents (paginated). */
async function listAgents() {
  return paginate('/agents');
}

/** Get a single agent by ID. */
async function getAgent(id) {
  return get(`/agents/${id}`);
}

/** Get the currently authenticated agent. */
async function getMe() {
  return get('/agents/me');
}

/** Autocomplete agents by search term. */
async function autocompleteAgents(term) {
  return get(`/agents/autocomplete?term=${encodeURIComponent(term)}`);
}

// ─────────────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────────────

/** List all groups (paginated). */
async function listGroups() {
  return paginate('/groups');
}

/** Get a single group by ID. */
async function getGroup(id) {
  return get(`/groups/${id}`);
}

// ─────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────

/** List all companies (paginated). */
async function listCompanies() {
  return paginate('/companies');
}

/** Get a single company by ID. */
async function getCompany(id) {
  return get(`/companies/${id}`);
}

/** Autocomplete companies by name. */
async function autocompleteCompanies(name) {
  return get(`/companies/autocomplete?name=${encodeURIComponent(name)}`);
}

/** Search companies using Freshdesk query language. */
async function searchCompanies(query) {
  const encoded = encodeURIComponent(`"${query}"`);
  const data = await get(`/search/companies?query=${encoded}`);
  return { total: data.total || 0, results: data.results || [] };
}

// ─────────────────────────────────────────────────────────────────────
// CSAT
// ─────────────────────────────────────────────────────────────────────

/** List CSAT surveys. */
async function listCSATSurveys() {
  return get('/customer-satisfaction/surveys');
}

// ─────────────────────────────────────────────────────────────────────
// SLA POLICIES
// ─────────────────────────────────────────────────────────────────────

/** List all SLA policies. */
async function listSLAPolicies() {
  return get('/sla_policies');
}

// ─────────────────────────────────────────────────────────────────────
// SUPPORTING DATA
// ─────────────────────────────────────────────────────────────────────

/** List all ticket fields including custom fields. */
async function listTicketFields() {
  return get('/ticket_fields');
}

/** List all time entries (global, not per-ticket). */
async function listAllTimeEntries() {
  return paginate('/time_entries');
}

/** List products. */
async function listProducts() {
  return get('/products');
}

/** Get business hours configuration. */
async function listBusinessHours() {
  return get('/business_hours');
}

/** Get email configurations. */
async function listEmailConfigs() {
  return get('/email_configs');
}

/** Get helpdesk settings. */
async function getHelpdeskSettings() {
  return get('/settings/helpdesk');
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  // Core
  get, paginate, testConnection, isConfigured, getConfig,
  getRateLimitRemaining: () => rateLimitRemaining,

  // Tickets
  listTickets, getTicket, searchTickets,
  getConversations, getTimeEntries, getSatisfactionRatings,

  // Agents
  listAgents, getAgent, getMe, autocompleteAgents,

  // Groups
  listGroups, getGroup,

  // Companies
  listCompanies, getCompany, autocompleteCompanies, searchCompanies,

  // CSAT
  listCSATSurveys,

  // SLA
  listSLAPolicies,

  // Supporting
  listTicketFields, listAllTimeEntries, listProducts,
  listBusinessHours, listEmailConfigs, getHelpdeskSettings,
};
