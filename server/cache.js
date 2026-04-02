/**
 * cache.js — File-based JSON cache with TTL and source metadata
 */
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'cache');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function filePath(key) {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

/**
 * Read cached value. Returns null if missing or expired.
 * Returns the stored data directly (compatible with spread: {...cached}).
 * Also exposes getMeta() for callers that need timing info.
 */
function get(key) {
  const fp = filePath(key);
  if (!fs.existsSync(fp)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (Date.now() > raw.expiresAt) {
      fs.unlinkSync(fp);
      return null;
    }
    return raw.data;
  } catch {
    return null;
  }
}

/**
 * Read cached value WITH metadata. Returns { data, meta } or null.
 */
function getWithMeta(key) {
  const fp = filePath(key);
  if (!fs.existsSync(fp)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (Date.now() > raw.expiresAt) {
      fs.unlinkSync(fp);
      return null;
    }
    return {
      data: raw.data,
      meta: {
        cachedAt: raw.cachedAt,
        fetchedAt: raw.fetchedAt || new Date(raw.cachedAt).toISOString(),
        expiresAt: raw.expiresAt,
        ageMs: Date.now() - raw.cachedAt,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Write value to cache with TTL in seconds.
 */
function set(key, data, ttlSeconds, fetchedAt) {
  ensureDir();
  const now = Date.now();
  const payload = {
    cachedAt: now,
    fetchedAt: fetchedAt || new Date(now).toISOString(),
    expiresAt: now + ttlSeconds * 1000,
    ttlSeconds,
    data,
  };
  fs.writeFileSync(filePath(key), JSON.stringify(payload), 'utf8');
}

/**
 * Clear one key or all keys.
 */
function clear(key) {
  if (key) {
    const fp = filePath(key);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    return;
  }
  ensureDir();
  for (const f of fs.readdirSync(CACHE_DIR)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(CACHE_DIR, f));
  }
}

/**
 * List all cache entries with metadata.
 */
function list() {
  ensureDir();
  return fs.readdirSync(CACHE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
        const key = f.replace('.json', '');
        const expired = Date.now() > raw.expiresAt;
        return { key, cachedAt: raw.cachedAt, fetchedAt: raw.fetchedAt, expiresAt: raw.expiresAt, expired, ageMs: Date.now() - raw.cachedAt };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function clearAll() {
  ensureDir();
  for (const f of fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'))) {
    try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch {}
  }
}

module.exports = { get, getWithMeta, set, clear, clearAll, list };
