/**
 * cache.js — File-based JSON cache with TTL
 */
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'cache');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function filePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

/**
 * Read cached value. Returns null if missing or expired.
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
 * Write value to cache with TTL in seconds.
 */
function set(key, data, ttlSeconds) {
  ensureDir();
  const payload = {
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlSeconds * 1000,
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
  // Clear all
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
        return { key, cachedAt: raw.cachedAt, expiresAt: raw.expiresAt, expired };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { get, set, clear, list };
