/**
 * server.js — Express server for Synapse
 * Serves static files and proxies Freshdesk API calls with caching.
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const freshdesk = require('./server/freshdesk');
const cache = require('./server/cache');
const transform = require('./server/transform');
const services = require('./server/services');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Static files ──
app.use(express.static(path.join(__dirname)));

// ── CORS for local dev ──
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Not-configured guard middleware ──
function requireConfig(req, res, next) {
  if (!freshdesk.isConfigured()) {
    return res.status(503).json({ error: 'Freshdesk credentials not configured. Copy .env.example to .env and add your API key.' });
  }
  next();
}

// ── TTL constants (seconds) ──
const TTL = {
  tickets:        5 * 60,    // 5 min
  ticket_single:  2 * 60,    // 2 min
  search:         3 * 60,    // 3 min
  conversations:  2 * 60,    // 2 min
  time_entries:   5 * 60,    // 5 min
  satisfaction:   10 * 60,   // 10 min
  companies:      15 * 60,   // 15 min
  agents:         30 * 60,   // 30 min
  stats:          5 * 60,    // 5 min
};

// ── Source tagging middleware ──
// Intercepts res.json() on /api/ routes to automatically add _source metadata.
app.use('/api', (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && !body.error) {
      // Tag source based on _cached flag
      if (body._cached === true && !body._source) {
        body._source = 'cache';
      } else if (body._cached === false && !body._source) {
        body._source = 'freshdesk_api';
        if (!body._fetched_at) body._fetched_at = new Date().toISOString();
      }
      // Mock data source when not configured
      if (!freshdesk.isConfigured() && !body._source) {
        body._source = 'mock';
      }
    }
    return originalJson(body);
  };
  next();
});

// ── Structured error response helper ──
function handleError(res, err, cacheKeyToRemove) {
  const status = err.status || 500;
  const body = {
    error: err.message,
    status,
    retryable: err.retryable || false,
  };

  // 400: Bad request — include detail for debugging
  if (status === 400) {
    body.detail = err.detail;
    body.action = 'Check request parameters';
  }
  // 401: Invalid API key — critical alert
  if (status === 401) {
    body.action = 'API key is invalid. Check FRESHDESK_API_KEY in .env';
    body.critical = true;
  }
  // 403: Insufficient permissions
  if (status === 403) {
    body.action = 'API key lacks permissions for this resource';
    body.detail = err.detail;
  }
  // 404: Not found — remove from cache if present
  if (status === 404) {
    if (cacheKeyToRemove) cache.clear(cacheKeyToRemove);
    body.action = 'Resource not found';
  }
  // 429: Rate limited — include retry info
  if (status === 429) {
    const rl = freshdesk.getRateLimit();
    body.rateLimit = rl;
    body.action = 'Rate limited — request will be retried automatically';
  }
  // 5xx: Server error
  if (status >= 500) {
    body.action = 'Freshdesk server error — retried with backoff';
    body.detail = err.detail;
  }

  res.status(status === 0 ? 502 : status).json(body);
}

// ─────────────────────────────────────────────────────────────────────
// HEALTH / STATUS
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/status', async (req, res) => {
  if (!freshdesk.isConfigured()) {
    return res.json({ ok: false, configured: false, error: 'Freshdesk credentials not set. Copy .env.example to .env and add your API key.' });
  }
  const result = await freshdesk.testConnection();
  res.json({ ...result, configured: true, rateLimit: freshdesk.getRateLimit(), cache: cache.list() });
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — LIST (with filters, ordering, includes, updated_since)
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets
 * Query params (all optional, forwarded to Freshdesk):
 *   filter       — new_and_my_open, watching, spam, deleted
 *   updated_since — YYYY-MM-DDTHH:MM:SSZ
 *   order_by     — created_at, due_by, updated_at
 *   order_type   — asc, desc
 *   include      — requester, stats, description, company (comma-separated)
 */
app.get('/api/freshdesk/tickets', requireConfig, async (req, res) => {
  try {
    // Build cache key from query params so different filters are cached separately
    const { filter, updated_since, order_by, order_type, include } = req.query;
    const cacheKey = `tickets:${filter || 'all'}:${order_by || 'default'}:${order_type || 'desc'}:${include || 'none'}:${updated_since || 'none'}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true, _cacheKey: cacheKey });

    const tickets = await freshdesk.listTickets({
      filter, updated_since, order_by, order_type, include,
    });
    const data = transform.transformTickets(tickets);
    data._raw_count = tickets.length;
    cache.set(cacheKey, data, TTL.tickets);
    res.json({ ...data, _cached: false, _cacheKey: cacheKey });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — RAW LIST (untransformed, for advanced use)
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets/raw
 * Same query params as /tickets but returns raw Freshdesk objects.
 */
app.get('/api/freshdesk/tickets/raw', requireConfig, async (req, res) => {
  try {
    const { filter, updated_since, order_by, order_type, include } = req.query;
    const cacheKey = `tickets_raw:${filter || 'all'}:${order_by || 'default'}:${include || 'none'}:${updated_since || 'none'}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ tickets: cached, _cached: true, count: cached.length });

    const tickets = await freshdesk.listTickets({
      filter, updated_since, order_by, order_type, include,
    });
    cache.set(cacheKey, tickets, TTL.tickets);
    res.json({ tickets, _cached: false, count: tickets.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — SINGLE TICKET
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets/:id
 * Query params: include — requester, stats, description, company
 */
app.get('/api/freshdesk/tickets/:id(\\d+)', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;
    const cacheKey = `ticket:${id}:${include || 'none'}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ticket: cached, _cached: true });

    const ticket = await freshdesk.getTicket(id, include);
    cache.set(cacheKey, ticket, TTL.ticket_single);
    res.json({ ticket, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — SEARCH
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/search/tickets?query=...
 * Query: Freshdesk query language string (without outer quotes).
 * Examples:
 *   ?query=status:2 OR status:3
 *   ?query=priority:4 AND created_at:>'2025-01-01'
 *   ?query=tag:'billing'
 */
app.get('/api/freshdesk/search/tickets', requireConfig, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query parameter required' });

    const cacheKey = `search:${Buffer.from(query).toString('base64').slice(0, 64)}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true });

    const data = await freshdesk.searchTickets(query);
    cache.set(cacheKey, data, TTL.search);
    res.json({ ...data, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets/:id/conversations
 */
app.get('/api/freshdesk/tickets/:id(\\d+)/conversations', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `conversations:${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ conversations: cached, _cached: true, count: cached.length });

    const conversations = await freshdesk.getConversations(id);
    cache.set(cacheKey, conversations, TTL.conversations);
    res.json({ conversations, _cached: false, count: conversations.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — TIME ENTRIES
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets/:id/time_entries
 */
app.get('/api/freshdesk/tickets/:id(\\d+)/time_entries', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `time_entries:${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ time_entries: cached, _cached: true, count: Array.isArray(cached) ? cached.length : 0 });

    const entries = await freshdesk.getTimeEntries(id);
    const data = Array.isArray(entries) ? entries : [];
    cache.set(cacheKey, data, TTL.time_entries);
    res.json({ time_entries: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// TICKETS — SATISFACTION RATINGS (CSAT)
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/freshdesk/tickets/:id/satisfaction_ratings
 */
app.get('/api/freshdesk/tickets/:id(\\d+)/satisfaction_ratings', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `satisfaction:${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json({ satisfaction_ratings: cached, _cached: true });

    const ratings = await freshdesk.getSatisfactionRatings(id);
    const data = Array.isArray(ratings) ? ratings : [ratings].filter(Boolean);
    cache.set(cacheKey, data, TTL.satisfaction);
    res.json({ satisfaction_ratings: data, _cached: false, count: data.length });
  } catch (err) {
    // 404 is normal — ticket may not have a CSAT survey
    if (err.status === 404) {
      return res.json({ satisfaction_ratings: [], _cached: false, count: 0 });
    }
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/agents — List all agents (transformed for DATA) */
app.get('/api/freshdesk/agents', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('agents');
    if (cached) return res.json({ ...cached, _cached: true });

    const agents = await freshdesk.listAgents();
    const data = transform.transformAgents(agents);
    cache.set('agents', data, TTL.agents);
    res.json({ ...data, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/agents/raw — Raw agent list */
app.get('/api/freshdesk/agents/raw', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('agents_raw');
    if (cached) return res.json({ agents: cached, _cached: true, count: cached.length });

    const agents = await freshdesk.listAgents();
    cache.set('agents_raw', agents, TTL.agents);
    res.json({ agents, _cached: false, count: agents.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/agents/me — Currently authenticated agent */
app.get('/api/freshdesk/agents/me', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('agent_me');
    if (cached) return res.json({ agent: cached, _cached: true });

    const agent = await freshdesk.getMe();
    cache.set('agent_me', agent, TTL.agents);
    res.json({ agent, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/agents/autocomplete?term=... */
app.get('/api/freshdesk/agents/autocomplete', requireConfig, async (req, res) => {
  try {
    const { term } = req.query;
    if (!term) return res.status(400).json({ error: 'term parameter required' });
    const agents = await freshdesk.autocompleteAgents(term);
    res.json({ agents, count: Array.isArray(agents) ? agents.length : 0 });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/agents/:id — Single agent */
app.get('/api/freshdesk/agents/:id(\\d+)', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `agent:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ agent: cached, _cached: true });

    const agent = await freshdesk.getAgent(id);
    cache.set(cacheKey, agent, TTL.agents);
    res.json({ agent, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/groups — List all groups */
app.get('/api/freshdesk/groups', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('groups');
    if (cached) return res.json({ groups: cached, _cached: true, count: cached.length });

    const groups = await freshdesk.listGroups();
    cache.set('groups', groups, TTL.agents); // same TTL as agents
    res.json({ groups, _cached: false, count: groups.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/groups/:id — Single group */
app.get('/api/freshdesk/groups/:id(\\d+)', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `group:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ group: cached, _cached: true });

    const group = await freshdesk.getGroup(id);
    cache.set(cacheKey, group, TTL.agents);
    res.json({ group, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/companies — List all (transformed for DATA) */
app.get('/api/freshdesk/companies', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('companies');
    if (cached) return res.json({ ...cached, _cached: true });

    const companies = await freshdesk.listCompanies();
    const rawTickets = await freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc', include: 'stats' });
    const data = transform.transformCompanies(companies, rawTickets);
    cache.set('companies', data, TTL.companies);
    res.json({ ...data, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/companies/raw — Raw company list */
app.get('/api/freshdesk/companies/raw', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('companies_raw');
    if (cached) return res.json({ companies: cached, _cached: true, count: cached.length });

    const companies = await freshdesk.listCompanies();
    cache.set('companies_raw', companies, TTL.companies);
    res.json({ companies, _cached: false, count: companies.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/companies/:id — Single company */
app.get('/api/freshdesk/companies/:id(\\d+)', requireConfig, async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `company:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ company: cached, _cached: true });

    const company = await freshdesk.getCompany(id);
    cache.set(cacheKey, company, TTL.companies);
    res.json({ company, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/companies/autocomplete?name=... */
app.get('/api/freshdesk/companies/autocomplete', requireConfig, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name parameter required' });
    const companies = await freshdesk.autocompleteCompanies(name);
    res.json({ companies, count: Array.isArray(companies) ? companies.length : 0 });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/search/companies?query=... */
app.get('/api/freshdesk/search/companies', requireConfig, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query parameter required' });

    const cacheKey = `search_co:${Buffer.from(query).toString('base64').slice(0, 64)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true });

    const data = await freshdesk.searchCompanies(query);
    cache.set(cacheKey, data, TTL.search);
    res.json({ ...data, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// CSAT SURVEYS
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/csat/surveys — List CSAT surveys */
app.get('/api/freshdesk/csat/surveys', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('csat_surveys');
    if (cached) return res.json({ surveys: cached, _cached: true });

    const surveys = await freshdesk.listCSATSurveys();
    const data = Array.isArray(surveys) ? surveys : [surveys].filter(Boolean);
    cache.set('csat_surveys', data, TTL.satisfaction);
    res.json({ surveys: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// SLA POLICIES
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/sla_policies */
app.get('/api/freshdesk/sla_policies', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('sla_policies');
    if (cached) return res.json({ sla_policies: cached, _cached: true });

    const policies = await freshdesk.listSLAPolicies();
    const data = Array.isArray(policies) ? policies : policies?.sla_policies || [policies].filter(Boolean);
    cache.set('sla_policies', data, 60 * 60); // 1 hour — rarely changes
    res.json({ sla_policies: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// SUPPORTING DATA
// ─────────────────────────────────────────────────────────────────────

/** GET /api/freshdesk/ticket_fields */
app.get('/api/freshdesk/ticket_fields', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('ticket_fields');
    if (cached) return res.json({ ticket_fields: cached, _cached: true, count: cached.length });

    const fields = await freshdesk.listTicketFields();
    cache.set('ticket_fields', fields, 60 * 60); // 1 hour
    res.json({ ticket_fields: fields, _cached: false, count: fields.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/time_entries — Global time entries */
app.get('/api/freshdesk/time_entries', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('all_time_entries');
    if (cached) return res.json({ time_entries: cached, _cached: true, count: cached.length });

    const entries = await freshdesk.listAllTimeEntries();
    cache.set('all_time_entries', entries, TTL.time_entries);
    res.json({ time_entries: entries, _cached: false, count: entries.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/products */
app.get('/api/freshdesk/products', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('products');
    if (cached) return res.json({ products: cached, _cached: true, count: cached.length });

    const products = await freshdesk.listProducts();
    const data = Array.isArray(products) ? products : [products].filter(Boolean);
    cache.set('products', data, 60 * 60);
    res.json({ products: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/business_hours */
app.get('/api/freshdesk/business_hours', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('business_hours');
    if (cached) return res.json({ business_hours: cached, _cached: true });

    const hours = await freshdesk.listBusinessHours();
    const data = Array.isArray(hours) ? hours : hours?.business_hours || [hours].filter(Boolean);
    cache.set('business_hours', data, 60 * 60);
    res.json({ business_hours: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/email_configs */
app.get('/api/freshdesk/email_configs', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('email_configs');
    if (cached) return res.json({ email_configs: cached, _cached: true });

    const configs = await freshdesk.listEmailConfigs();
    const data = Array.isArray(configs) ? configs : [configs].filter(Boolean);
    cache.set('email_configs', data, 60 * 60);
    res.json({ email_configs: data, _cached: false, count: data.length });
  } catch (err) {
    handleError(res, err);
  }
});

/** GET /api/freshdesk/settings/helpdesk */
app.get('/api/freshdesk/settings/helpdesk', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('helpdesk_settings');
    if (cached) return res.json({ settings: cached, _cached: true });

    const settings = await freshdesk.getHelpdeskSettings();
    cache.set('helpdesk_settings', settings, 60 * 60);
    res.json({ settings, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// AGGREGATED STATS
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/stats', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('stats');
    if (cached) return res.json({ ...cached, _cached: true });

    let ticketData = cache.get('tickets:all:default:desc:stats:none');
    if (!ticketData) {
      const tickets = await freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc', include: 'stats' });
      ticketData = transform.transformTickets(tickets);
      cache.set('tickets:all:default:desc:stats:none', ticketData, TTL.tickets);
    }

    const data = transform.transformDashboardKPIs(
      ticketData.freshdeskStats,
      ticketData.pressingStats,
      0,
      5,
      ticketData.qualityStats,
    );
    cache.set('stats', data, TTL.stats);
    res.json({ ...data, _cached: false });
  } catch (err) {
    handleError(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// DATA SERVICES (high-level, cache-first)
// ─────────────────────────────────────────────────────────────────────

// Helper: wrap a service call with error handling
function svcRoute(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { handleError(res, err); }
  };
}

// Dashboard
app.get('/api/services/dashboard-stats',      requireConfig, svcRoute(() => services.getDashboardStats()));
app.get('/api/services/dashboard-comparison', requireConfig, svcRoute(() => services.getDashboardComparison()));
app.get('/api/services/actionable-insights',  requireConfig, svcRoute(() => services.getActionableInsights()));

// Intelligence / Trending
app.get('/api/services/todays-issues',        requireConfig, svcRoute(() => services.getTodaysIssues()));
app.get('/api/services/ticket-trends',        requireConfig, svcRoute(req => services.getTicketTrends(parseInt(req.query.days) || 30)));
app.get('/api/services/top-issues',           requireConfig, svcRoute(() => services.getTopIssues()));
app.get('/api/services/agent-performance',    requireConfig, svcRoute(() => services.getAgentPerformance()));
app.get('/api/services/group-performance',    requireConfig, svcRoute(() => services.getGroupPerformance()));
app.get('/api/services/agent-list',           requireConfig, svcRoute(() => services.getAgentList()));

// QA
app.get('/api/services/csat-by-agent',        requireConfig, svcRoute(() => services.getCSATByAgent()));
app.get('/api/services/worst-scored',         requireConfig, svcRoute(() => services.getWorstScoredTickets()));

// Auto-Responder
app.get('/api/services/draft-queue',          requireConfig, svcRoute(() => services.getDraftQueue()));

// Contacts & Companies
app.get('/api/services/company-health',       requireConfig, svcRoute(() => services.getCompanyHealth()));
app.get('/api/services/companies/:id/contacts', requireConfig, svcRoute(req => services.getContactsByCompany(req.params.id)));
app.get('/api/services/contacts/:id/tickets', requireConfig, svcRoute(req => services.getTicketsByContact(req.params.id)));

// Drill-down
app.get('/api/services/tickets/:id/detail',   requireConfig, svcRoute(req => services.getTicketDetail(req.params.id)));
app.get('/api/services/agents/:id/tickets',   requireConfig, svcRoute(req => services.getAgentTickets(req.params.id)));

// ─────────────────────────────────────────────────────────────────────
// GROUP FILTER
// ─────────────────────────────────────────────────────────────────────

app.get('/api/services/group-filter', (req, res) => {
  res.json({ groupId: services.getGroupFilter(), configured: !!services.getGroupFilter() });
});

app.post('/api/services/group-filter', requireConfig, express.json(), async (req, res) => {
  const { groupName } = req.body || {};
  if (!groupName) {
    services.setGroupFilter(null);
    return res.json({ ok: true, groupId: null, message: 'Group filter cleared' });
  }
  try {
    const groupId = await freshdesk.resolveGroupName(groupName);
    if (!groupId) return res.status(404).json({ ok: false, error: `Group "${groupName}" not found` });
    services.setGroupFilter(groupId);
    cache.clearAll();
    res.json({ ok: true, groupId, groupName, message: `Filter set to "${groupName}" (ID ${groupId})` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DATE RANGE FILTER
// ─────────────────────────────────────────────────────────────────────

app.get('/api/services/date-range', (req, res) => {
  res.json(services.getDateRange());
});

app.post('/api/services/date-range', express.json(), (req, res) => {
  const { from, to } = req.body || {};
  services.setDateRange(from || null, to || null);
  cache.clearAll();
  res.json({ ok: true, from: from || null, to: to || null });
});

// ─────────────────────────────────────────────────────────────────────
// CACHE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

app.post('/api/freshdesk/cache/clear', (req, res) => {
  cache.clear();
  res.json({ ok: true, message: 'All cache cleared' });
});

app.get('/api/freshdesk/cache', (req, res) => {
  res.json({ entries: cache.list() });
});

app.delete('/api/freshdesk/cache/:key', (req, res) => {
  cache.clear(req.params.key);
  res.json({ ok: true, message: `Cache key '${req.params.key}' cleared` });
});

// ─────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`Synapse server running at http://localhost:${PORT}`);
  if (freshdesk.isConfigured()) {
    const cfg = freshdesk.getConfig();
    console.log(`Freshdesk: ${cfg.domain}.freshdesk.com (API key configured)`);

    // Initialize group filter from FRESHDESK_GROUP env var
    const groupId = await freshdesk.initGroupFilter();
    if (groupId) services.setGroupFilter(groupId);
  } else {
    console.log('Freshdesk: Not configured — serving mock data only');
    console.log('  → Copy .env.example to .env and add your credentials');
  }
  console.log('\nProxy routes:');
  console.log('  Tickets:');
  console.log('    GET  /api/freshdesk/tickets[?filter=&order_by=&include=&updated_since=]');
  console.log('    GET  /api/freshdesk/tickets/raw');
  console.log('    GET  /api/freshdesk/tickets/:id[?include=]');
  console.log('    GET  /api/freshdesk/search/tickets?query=...');
  console.log('    GET  /api/freshdesk/tickets/:id/conversations');
  console.log('    GET  /api/freshdesk/tickets/:id/time_entries');
  console.log('    GET  /api/freshdesk/tickets/:id/satisfaction_ratings');
  console.log('  Agents:');
  console.log('    GET  /api/freshdesk/agents         (transformed)');
  console.log('    GET  /api/freshdesk/agents/raw');
  console.log('    GET  /api/freshdesk/agents/me');
  console.log('    GET  /api/freshdesk/agents/autocomplete?term=...');
  console.log('    GET  /api/freshdesk/agents/:id');
  console.log('  Groups:');
  console.log('    GET  /api/freshdesk/groups');
  console.log('    GET  /api/freshdesk/groups/:id');
  console.log('  Companies:');
  console.log('    GET  /api/freshdesk/companies       (transformed)');
  console.log('    GET  /api/freshdesk/companies/raw');
  console.log('    GET  /api/freshdesk/companies/:id');
  console.log('    GET  /api/freshdesk/companies/autocomplete?name=...');
  console.log('    GET  /api/freshdesk/search/companies?query=...');
  console.log('  CSAT & SLA:');
  console.log('    GET  /api/freshdesk/csat/surveys');
  console.log('    GET  /api/freshdesk/sla_policies');
  console.log('  Supporting:');
  console.log('    GET  /api/freshdesk/ticket_fields');
  console.log('    GET  /api/freshdesk/time_entries');
  console.log('    GET  /api/freshdesk/products');
  console.log('    GET  /api/freshdesk/business_hours');
  console.log('    GET  /api/freshdesk/email_configs');
  console.log('    GET  /api/freshdesk/settings/helpdesk');
  console.log('  Aggregated:');
  console.log('    GET  /api/freshdesk/stats');
  console.log('    GET  /api/freshdesk/status');
  console.log('  Data Services:');
  console.log('    GET  /api/services/dashboard-stats');
  console.log('    GET  /api/services/dashboard-comparison');
  console.log('    GET  /api/services/actionable-insights');
  console.log('    GET  /api/services/todays-issues');
  console.log('    GET  /api/services/ticket-trends[?days=30]');
  console.log('    GET  /api/services/top-issues');
  console.log('    GET  /api/services/agent-performance');
  console.log('    GET  /api/services/group-performance');
  console.log('    GET  /api/services/agent-list');
  console.log('    GET  /api/services/csat-by-agent');
  console.log('    GET  /api/services/worst-scored');
  console.log('    GET  /api/services/draft-queue');
  console.log('    GET  /api/services/company-health');
  console.log('    GET  /api/services/companies/:id/contacts');
  console.log('    GET  /api/services/contacts/:id/tickets');
  console.log('    GET  /api/services/tickets/:id/detail');
  console.log('    GET  /api/services/agents/:id/tickets');
  console.log('  Cache:');
  console.log('    GET  /api/freshdesk/cache');
  console.log('    POST /api/freshdesk/cache/clear');
  console.log('    DEL  /api/freshdesk/cache/:key');
});
