/**
 * router.js — Client-side page routing
 * Pages register themselves via Router.register(id, renderFn).
 * Navigate with Router.go(id).
 */

const Router = (() => {
  const registry = {};

  const pageMap = {
    'dashboard':           { title: 'Dashboard',              tag: '/' },
    'sync':                { title: 'Data Sync',              tag: '/sync' },
    'documents':           { title: 'Documents',              tag: '/documents' },
    'today':               { title: "Today's Insight",        tag: '/intelligence/today' },
    'intel-overview':      { title: 'Intelligence Overview',  tag: '/intelligence' },
    'trending':            { title: 'Trending Issues',        tag: '/intelligence/trending' },
    'pressing':            { title: 'Pressing Now',           tag: '/intelligence/pressing' },
    'health':              { title: 'Customer Health',        tag: '/intelligence/health' },
    'quality':             { title: 'Quality Assurance',      tag: '/intelligence/quality' },
    'analyses':            { title: 'AI Analyses',            tag: '/intelligence/analyses' },
    'qa-summary':          { title: 'QA Summary',             tag: '/intelligence/qa-summary' },
    'churn-risk':          { title: 'Churn Risk',             tag: '/intelligence/churn-risk' },
    'mastermind-search':   { title: 'Mastermind Search',      tag: '/mastermind' },
    'mastermind-chat':     { title: 'Mastermind Chat',        tag: '/mastermind/chat' },
    'mastermind-articles': { title: 'Articles',               tag: '/mastermind/articles' },
    'mastermind-agents':   { title: 'Agents',                 tag: '/mastermind/agents' },
    'mastermind-settings': { title: 'Mastermind Settings',    tag: '/mastermind/settings' },
    'ar-dashboard':        { title: 'Auto-Responder',         tag: '/auto-responder' },
    'ar-drafts':           { title: 'Draft Queue',            tag: '/auto-responder/drafts' },
    'ar-config':           { title: 'Configuration',          tag: '/auto-responder/config' },
    'stats-freshdesk':     { title: 'Freshdesk Analytics',    tag: '/stats/freshdesk' },
    'stats-jira':          { title: 'Jira Analytics',         tag: '/stats/jira' },
    'stats-attachments':   { title: 'Attachment Analytics',   tag: '/stats/attachments' },
  };

  function register(id, renderFn) {
    registry[id] = renderFn;
  }

  function go(id) {
    const container = document.getElementById('page-container');
    const renderFn  = registry[id];
    if (!renderFn) { console.warn('No page registered for:', id); return; }

    // Render page
    const div = document.createElement('div');
    div.className = 'page';
    div.innerHTML = renderFn();
    container.innerHTML = '';
    container.appendChild(div);

    // After DOM is in place, run any post-render hooks
    if (renderFn.afterRender) renderFn.afterRender();

    // Update topbar
    const info = pageMap[id] || { title: id, tag: '/' };
    document.getElementById('topbar-title').textContent = info.title;
    document.getElementById('topbar-tag').textContent   = info.tag;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === id);
    });

    // Dispatch event so pages can attach listeners after render
    document.dispatchEvent(new CustomEvent('pageRendered', { detail: { id } }));
  }

  return { register, go };
})();
