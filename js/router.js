/**
 * router.js — Client-side hash-based routing with category support.
 * Pages register via Router.register(id, renderFn).
 * Navigate with Router.go(id). URLs update automatically.
 */

const Router = (() => {
  const registry = {};

  // ── Category definitions ──
  // topbarAction: HTML string for action button, or '' for none
  const categories = {
    home:         { label: 'Home',         icon: '◈', default: 'dashboard',          topbarAction: '<button class="sync-btn" id="topbar-refresh-btn">⟳ Refresh</button>' },
    intelligence: { label: 'Intelligence', icon: '◉', default: 'intel-hub',           topbarAction: '' },
    qa:           { label: 'QA',           icon: '▣', default: 'qa-summary',         topbarAction: '' },
    mastermind:   { label: 'Mastermind',   icon: '◌', default: 'mastermind-search',  topbarAction: '' },
    operations:   { label: 'Operations',   icon: '⟳', default: 'ar-dashboard',      topbarAction: '<button class="sync-btn" id="topbar-sync-btn">⟳ Sync Now</button>' },
  };

  // ── Page map: id → { title, hash, category, badges? } ──
  const pageMap = {
    'dashboard':           { title: 'Home',                   hash: '#/',                         category: 'home' },
    'intel-hub':           { title: 'Intelligence Hub',       hash: '#/intelligence',             category: 'intelligence' },
    'qa-summary':          { title: 'Summary',                hash: '#/qa',                       category: 'qa' },
    'churn-risk':          { title: 'Churn Risk',             hash: '#/qa/churn-risk',            category: 'qa' },
    'mastermind-search':   { title: 'Search',                 hash: '#/mastermind',               category: 'mastermind' },
    'mastermind-chat':     { title: 'Chat',                   hash: '#/mastermind/chat',          category: 'mastermind' },
    'mastermind-articles': { title: 'Articles',               hash: '#/mastermind/articles',      category: 'mastermind' },
    'mastermind-agents':   { title: 'Agents',                 hash: '#/mastermind/agents',        category: 'mastermind' },
    'ar-dashboard':        { title: 'Auto-Responder',         hash: '#/operations',               category: 'operations' },
    'ar-drafts':           { title: 'Draft Queue',            hash: '#/operations/drafts',        category: 'operations' },
    'ar-config':           { title: 'Configuration',          hash: '#/operations/config',        category: 'operations' },
    'mastermind-settings': { title: 'Pipeline Settings',      hash: '#/operations/pipeline',      category: 'operations' },
    'sync':                { title: 'Data Sync',              hash: '#/operations/sync',          category: 'operations' },
    'documents':           { title: 'Documents',              hash: '#/operations/documents',     category: 'operations' },
    'stats-freshdesk':     { title: 'Freshdesk',              hash: '#/operations/freshdesk',     category: 'operations' },
    'stats-jira':          { title: 'Jira',                   hash: '#/operations/jira',          category: 'operations' },
    'stats-attachments':   { title: 'Attachments',            hash: '#/operations/attachments',   category: 'operations' },
  };

  // ── Reverse lookup: hash → pageId ──
  const hashToId = {};
  for (const [id, info] of Object.entries(pageMap)) {
    hashToId[info.hash] = id;
  }

  // ── Internal state ──
  let currentId = null;
  let updatingHash = false;

  function register(id, renderFn) {
    registry[id] = renderFn;
  }

  function go(id, opts = {}) {
    const renderFn = registry[id];
    if (!renderFn) { console.warn('No page registered for:', id); return; }

    currentId = id;
    const info = pageMap[id] || { title: id, hash: '#/', category: 'home' };

    // Update hash without triggering hashchange loop
    if (!opts._fromHash && location.hash !== info.hash) {
      updatingHash = true;
      location.hash = info.hash;
      updatingHash = false;
    }

    // Render page
    const container = document.getElementById('page-container');
    const div = document.createElement('div');
    div.className = 'page';
    div.innerHTML = renderFn();
    container.innerHTML = '';
    container.appendChild(div);
    if (renderFn.afterRender) renderFn.afterRender();

    // Update topbar breadcrumb + action
    updateBreadcrumb(id, info);
    updateTopbarAction(info);

    // Update sidebar active state
    updateSidebar(id, info);

    // Dispatch event so pages can attach listeners after render
    document.dispatchEvent(new CustomEvent('pageRendered', { detail: { id } }));
  }

  function updateBreadcrumb(id, info) {
    const bc = document.getElementById('breadcrumb');
    const backBtn = document.getElementById('back-btn');
    if (!bc) return;

    if (info.category === 'home') {
      bc.innerHTML = '<span class="breadcrumb-current">Home</span>';
      if (backBtn) backBtn.style.display = 'none';
    } else {
      const cat = categories[info.category];
      const catDefault = cat.default;
      bc.innerHTML =
        `<a class="breadcrumb-link" data-page="${catDefault}">${cat.label}</a>` +
        `<span class="breadcrumb-sep">/</span>` +
        `<span class="breadcrumb-current">${info.title}</span>`;
      if (backBtn) backBtn.style.display = '';
    }
  }

  function updateTopbarAction(info) {
    const el = document.getElementById('topbar-action');
    if (!el) return;
    const cat = categories[info.category];
    el.innerHTML = cat?.topbarAction || '';

    // Wire action buttons
    const syncBtn = document.getElementById('topbar-sync-btn');
    if (syncBtn) syncBtn.addEventListener('click', () => go('sync'));

    const refreshBtn = document.getElementById('topbar-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => go('dashboard'));
  }

  function updateSidebar(id, info) {
    // Highlight active nav item
    document.querySelectorAll('.nav-child').forEach(n => {
      n.classList.toggle('active', n.dataset.page === id);
    });

    // Expand active category, collapse others
    document.querySelectorAll('.nav-group').forEach(g => {
      const isCurrent = g.dataset.category === info.category;
      g.classList.toggle('expanded', isCurrent);
    });

    // Highlight active category header
    document.querySelectorAll('.nav-group-header').forEach(h => {
      h.classList.toggle('active', h.closest('.nav-group')?.dataset.category === info.category);
    });
  }

  function resolveHash(hash) {
    if (!hash || hash === '#' || hash === '#/') return 'dashboard';
    // Exact match
    if (hashToId[hash]) return hashToId[hash];
    // Try with trailing slash stripped
    const clean = hash.replace(/\/$/, '');
    if (hashToId[clean]) return hashToId[clean];
    // Fallback: any #/intelligence/* route → intel-hub
    if (clean.startsWith('#/intelligence')) return 'intel-hub';
    return 'dashboard';
  }

  function initHashListener() {
    window.addEventListener('hashchange', () => {
      if (updatingHash) return;
      const id = resolveHash(location.hash);
      if (id !== currentId) go(id, { _fromHash: true });
    });
  }

  function getInitialPage() {
    return resolveHash(location.hash);
  }

  function getCategoryForPage(id) {
    return pageMap[id]?.category || 'home';
  }

  function getCategoryDefault(cat) {
    return categories[cat]?.default || 'dashboard';
  }

  return {
    register, go, initHashListener, getInitialPage,
    categories, pageMap, getCategoryForPage, getCategoryDefault
  };
})();
