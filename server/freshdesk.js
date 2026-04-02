/**
 * freshdesk.js — Authenticated Freshdesk API client
 * Uses built-in Node fetch (Node 18+). Falls back to https module.
 */

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
 * Authenticated GET request to Freshdesk API.
 * Returns parsed JSON. Throws on HTTP errors.
 */
async function get(path) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Freshdesk credentials not configured');

  const url = `${cfg.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': cfg.auth,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Freshdesk API ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Auto-paginate a list endpoint. Freshdesk paginates at per_page (max 100).
 * Returns all results concatenated.
 */
async function paginate(path, maxPages = 5) {
  const sep = path.includes('?') ? '&' : '?';
  let all = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await get(`${path}${sep}per_page=100&page=${page}`);
    all = all.concat(data);
    if (data.length < 100) break; // Last page
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
    return { ok: true, domain: cfg.domain };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { get, paginate, testConnection, isConfigured, getConfig };
