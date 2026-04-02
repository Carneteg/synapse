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
  next();
});

// ── TTL constants (seconds) ──
const TTL = {
  tickets: 5 * 60,
  companies: 15 * 60,
  agents: 30 * 60,
  stats: 5 * 60,
};

// ── Health check / status ──
app.get('/api/freshdesk/status', async (req, res) => {
  if (!freshdesk.isConfigured()) {
    return res.json({ ok: false, configured: false, error: 'Freshdesk credentials not set. Copy .env.example to .env and add your API key.' });
  }
  const result = await freshdesk.testConnection();
  res.json({ ...result, configured: true, cache: cache.list() });
});

// ── Tickets ──
app.get('/api/freshdesk/tickets', async (req, res) => {
  try {
    const cached = cache.get('tickets');
    if (cached) return res.json({ ...cached, _cached: true });

    if (!freshdesk.isConfigured()) return res.status(503).json({ error: 'Not configured' });

    const tickets = await freshdesk.paginate('/tickets?order_by=created_at&order_type=desc');
    const data = transform.transformTickets(tickets);
    cache.set('tickets', data, TTL.tickets);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Companies ──
app.get('/api/freshdesk/companies', async (req, res) => {
  try {
    const cached = cache.get('companies');
    if (cached) return res.json({ ...cached, _cached: true });

    if (!freshdesk.isConfigured()) return res.status(503).json({ error: 'Not configured' });

    const companies = await freshdesk.paginate('/companies');
    // Also fetch tickets to correlate
    let tickets = cache.get('tickets');
    if (!tickets) {
      const raw = await freshdesk.paginate('/tickets?order_by=created_at&order_type=desc');
      tickets = transform.transformTickets(raw);
      cache.set('tickets', tickets, TTL.tickets);
    }
    // We need raw tickets for company correlation — re-fetch if only transformed
    const rawTickets = await freshdesk.paginate('/tickets?order_by=created_at&order_type=desc');
    const data = transform.transformCompanies(companies, rawTickets);
    cache.set('companies', data, TTL.companies);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Agents ──
app.get('/api/freshdesk/agents', async (req, res) => {
  try {
    const cached = cache.get('agents');
    if (cached) return res.json({ ...cached, _cached: true });

    if (!freshdesk.isConfigured()) return res.status(503).json({ error: 'Not configured' });

    const agents = await freshdesk.paginate('/agents');
    const data = transform.transformAgents(agents);
    cache.set('agents', data, TTL.agents);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Aggregated stats (combines all sources) ──
app.get('/api/freshdesk/stats', async (req, res) => {
  try {
    const cached = cache.get('stats');
    if (cached) return res.json({ ...cached, _cached: true });

    if (!freshdesk.isConfigured()) return res.status(503).json({ error: 'Not configured' });

    // Ensure tickets are fetched
    let ticketData = cache.get('tickets');
    if (!ticketData) {
      const tickets = await freshdesk.paginate('/tickets?order_by=created_at&order_type=desc');
      ticketData = transform.transformTickets(tickets);
      cache.set('tickets', ticketData, TTL.tickets);
    }

    const data = transform.transformDashboardKPIs(
      ticketData.freshdeskStats,
      ticketData.pressingStats,
      0, // churn count — not available from Freshdesk API directly
      5, // draft count — mock, auto-responder is internal
    );
    cache.set('stats', data, TTL.stats);
    res.json({ ...data, _cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cache management ──
app.post('/api/freshdesk/cache/clear', (req, res) => {
  cache.clear();
  res.json({ ok: true, message: 'All cache cleared' });
});

app.get('/api/freshdesk/cache', (req, res) => {
  res.json({ entries: cache.list() });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`Synapse server running at http://localhost:${PORT}`);
  if (freshdesk.isConfigured()) {
    const cfg = freshdesk.getConfig();
    console.log(`Freshdesk: ${cfg.domain}.freshdesk.com (API key configured)`);
  } else {
    console.log('Freshdesk: Not configured — serving mock data only');
    console.log('  → Copy .env.example to .env and add your credentials');
  }
});
