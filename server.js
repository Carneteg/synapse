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

// ─────────────────────────────────────────────────────────────────────
// HEALTH / STATUS
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/status', async (req, res) => {
  if (!freshdesk.isConfigured()) {
    return res.json({ ok: false, configured: false, error: 'Freshdesk credentials not set. Copy .env.example to .env and add your API key.' });
  }
  const result = await freshdesk.testConnection();
  res.json({ ...result, configured: true, rateLimitRemaining: freshdesk.getRateLimitRemaining(), cache: cache.list() });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
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
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
  }
});

// ─────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/companies', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('companies');
    if (cached) return res.json({ ...cached, _cached: true });

    const companies = await freshdesk.paginate('/companies');
    const rawTickets = await freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc' });
    const data = transform.transformCompanies(companies, rawTickets);
    cache.set('companies', data, TTL.companies);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
  }
});

// ─────────────────────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/agents', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('agents');
    if (cached) return res.json({ ...cached, _cached: true });

    const agents = await freshdesk.paginate('/agents');
    const data = transform.transformAgents(agents);
    cache.set('agents', data, TTL.agents);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
  }
});

// ─────────────────────────────────────────────────────────────────────
// AGGREGATED STATS
// ─────────────────────────────────────────────────────────────────────

app.get('/api/freshdesk/stats', requireConfig, async (req, res) => {
  try {
    const cached = cache.get('stats');
    if (cached) return res.json({ ...cached, _cached: true });

    let ticketData = cache.get('tickets:all:default:desc:none:none');
    if (!ticketData) {
      const tickets = await freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc' });
      ticketData = transform.transformTickets(tickets);
      cache.set('tickets:all:default:desc:none:none', ticketData, TTL.tickets);
    }

    const data = transform.transformDashboardKPIs(
      ticketData.freshdeskStats,
      ticketData.pressingStats,
      0,
      5,
    );
    cache.set('stats', data, TTL.stats);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, detail: err.detail });
  }
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

app.listen(PORT, () => {
  console.log(`Synapse server running at http://localhost:${PORT}`);
  if (freshdesk.isConfigured()) {
    const cfg = freshdesk.getConfig();
    console.log(`Freshdesk: ${cfg.domain}.freshdesk.com (API key configured)`);
  } else {
    console.log('Freshdesk: Not configured — serving mock data only');
    console.log('  → Copy .env.example to .env and add your credentials');
  }
  console.log('\nProxy routes:');
  console.log('  GET  /api/freshdesk/status');
  console.log('  GET  /api/freshdesk/tickets[?filter=&order_by=&include=&updated_since=]');
  console.log('  GET  /api/freshdesk/tickets/raw');
  console.log('  GET  /api/freshdesk/tickets/:id[?include=]');
  console.log('  GET  /api/freshdesk/search/tickets?query=...');
  console.log('  GET  /api/freshdesk/tickets/:id/conversations');
  console.log('  GET  /api/freshdesk/tickets/:id/time_entries');
  console.log('  GET  /api/freshdesk/tickets/:id/satisfaction_ratings');
  console.log('  GET  /api/freshdesk/companies');
  console.log('  GET  /api/freshdesk/agents');
  console.log('  GET  /api/freshdesk/stats');
  console.log('  GET  /api/freshdesk/cache');
  console.log('  POST /api/freshdesk/cache/clear');
  console.log('  DEL  /api/freshdesk/cache/:key');
});
