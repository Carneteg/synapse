// ── SEARCH MODE MAPPING (technical → outcome-based) ──
const SEARCH_MODES = [
  { id: 'quick',      label: 'Quick Search',    desc: 'Fast keyword + vector match', old: 'Vector' },
  { id: 'deep',       label: 'Deep Search',     desc: 'Cross-references related tickets', old: 'GraphRAG' },
  { id: 'thorough',   label: 'Thorough Search', desc: 'Full graph traversal, highest accuracy', old: 'Deep GraphRAG' },
  { id: 'summary',    label: 'Summary',         desc: 'Returns a distilled answer', old: 'Distilled' },
  { id: 'deep-summary', label: 'Deep Summary',  desc: 'Thorough search + distilled answer', old: 'Distilled Deep' },
];

// ── SIMULATED SEARCH RESULTS (varied by query keywords) ──
const SEARCH_RESPONSES = {
  _default: {
    q: 'your query',
    score: 0.82,
    body: 'Based on your support data, we found relevant matches across multiple sources. Results are ranked by relevance to your question.',
    tickets: ['#FD-10401', '#FD-10388'],
  },
  billing: {
    q: 'billing-related issues',
    score: 0.94,
    body: 'Billing inquiries account for 12% of total ticket volume. Most common: incorrect charges (34%), upgrade/downgrade requests (28%), invoice questions (22%), refund requests (16%). Average resolution: 14h. Pattern: billing spikes on the 1st and 15th of each month.',
    tickets: ['#FD-10420', '#FC-8821', '#FD-10360'],
  },
  api: {
    q: 'API issues and rate limiting',
    score: 0.96,
    body: 'API rate limit tickets spiked 250% this week (14 tickets). Root cause: enterprise batch jobs hitting 1000 req/min threshold. Affected accounts: Acme Corp, Stormcloud Ltd. Engineering has JR-4401 open. Recommend proactive outreach + temporary limit increase for affected accounts.',
    tickets: ['#FD-10401', '#FD-10388', '#JR-4401'],
  },
  login: {
    q: 'login and authentication problems',
    score: 0.91,
    body: 'Login issues up 57% this week (11 tickets). Three root causes identified: (1) SSO certificate expired for 3 enterprise accounts, (2) MFA token sync issues on mobile, (3) Password reset emails delayed by 15+ minutes. SSO is the highest-impact — affects entire organizations.',
    tickets: ['#FD-10372', '#FD-10431'],
  },
  export: {
    q: 'CSV export failures',
    score: 0.89,
    body: 'CSV export failures concentrated on datasets above 50K rows. Memory limit on export service causes timeout. Pattern recurs quarterly during reporting periods. Workaround: paginate exports below 50K. Permanent fix requires infrastructure change (JR-4401 related).',
    tickets: ['#JR-4401', '#FD-10429'],
  },
  churn: {
    q: 'churn signals and at-risk accounts',
    score: 0.93,
    body: 'Currently 7 tickets flagged with churn signals across 3 accounts. Acme Corp (NOK 3.2M ARR): 2 flags including competitor mentions. Stormcloud Ltd (NOK 2.1M ARR): severe frustration noted. Total ARR at risk: NOK 4.8M. Immediate escalation recommended for Acme Corp.',
    tickets: ['#FD-10401', '#FD-10388', '#FD-10351'],
  },
};

function findSearchResponse(query) {
  const q = query.toLowerCase();
  for (const [keyword, resp] of Object.entries(SEARCH_RESPONSES)) {
    if (keyword === '_default') continue;
    if (q.includes(keyword)) return resp;
  }
  return SEARCH_RESPONSES._default;
}

// ── MASTERMIND SEARCH ──
Router.register('mastermind-search', () => `
  ${UI.sectionHead('Mastermind Search', 'AI-powered knowledge retrieval')}

  <div class="card mb-4">
    <div class="mode-select" id="search-modes">
      ${SEARCH_MODES.map((m, i) =>
        `<div class="mode-btn${i === 0 ? ' active' : ''}" data-mode="${m.id}" title="${m.desc}">${m.label}</div>`
      ).join('')}
    </div>
    <div style="display:flex;gap:10px">
      <input class="input" id="mm-query" placeholder="Ask a question across your support history…" style="flex:1">
      <button class="btn btn-primary" id="mm-search-btn">Search</button>
    </div>
  </div>

  <div id="mm-results">
    ${renderSearchResult(SEARCH_RESPONSES.api)}
    ${renderSearchResult(SEARCH_RESPONSES.export)}
  </div>
`);

function renderSearchResult(r) {
  return `
    <div class="card mb-3">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:600">${r.q}</div>
        <span class="mono" style="color:var(--green);font-size:11px">${r.score.toFixed(2)}</span>
      </div>
      <p style="font-size:13px;color:var(--text-dim);line-height:1.7">${r.body}</p>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${r.tickets.map(t => UI.badge(t, 'badge-blue')).join(' ')}
      </div>
    </div>`;
}

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'mastermind-search') return;

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('mm-search-btn')?.addEventListener('click', () => {
    const q = document.getElementById('mm-query').value.trim();
    if (!q) return;
    const resp = findSearchResponse(q);
    document.getElementById('mm-results').innerHTML = renderSearchResult({
      ...resp,
      q: q,
      score: resp.score - (Math.random() * 0.05),
    });
  });
});

// ── CHAT (simulated variability) ──
const chatHistory = [];

const CHAT_RESPONSES = [
  { keywords: ['billing', 'charge', 'invoice', 'payment', 'refund'],
    response: 'Looking at billing data across your support history:\n\n- <strong>12% of all tickets</strong> are billing-related\n- Most common: incorrect charges (34%), upgrade requests (28%)\n- Average resolution time: <strong>14 hours</strong>\n- Billing spikes occur on the 1st and 15th of each month\n\nWould you like me to drill into a specific billing pattern?' },
  { keywords: ['api', 'rate limit', 'timeout', 'endpoint'],
    response: 'API issues are trending upward this week:\n\n- <strong>14 tickets</strong> tagged api-rate-limit (+250% vs last week)\n- Most affected: Acme Corp, Stormcloud Ltd (enterprise batch jobs)\n- Engineering tracking in <strong>JR-4401</strong> (In Progress)\n- Recommendation: proactive outreach to affected accounts\n\nShould I show the affected accounts or the Jira correlation?' },
  { keywords: ['churn', 'cancel', 'competitor', 'risk', 'leaving'],
    response: 'Churn analysis from recent tickets:\n\n- <strong>7 tickets</strong> flagged with churn signals across 3 accounts\n- <strong>Acme Corp</strong> (3.2M NOK): mentions cancelling, competitor comparisons\n- <strong>Stormcloud Ltd</strong> (2.1M NOK): severe frustration, 7 repeat issues\n- Total ARR at risk: <strong>NOK 4.8M</strong>\n\nI recommend immediate escalation for Acme Corp. Want me to pull their full ticket history?' },
  { keywords: ['sla', 'overdue', 'breach', 'response time'],
    response: 'SLA performance summary:\n\n- Current compliance: <strong>84%</strong> (down 3% from last week)\n- <strong>12 tickets</strong> currently past SLA deadline\n- <strong>27 stale tickets</strong> with no agent touch in 48h+\n- Worst performing: Urgent tickets (avg first response: 3.2h vs 1h target)\n\nWould you like to see the overdue tickets or the agent breakdown?' },
  { keywords: ['agent', 'team', 'performance', 'score', 'quality'],
    response: 'Team performance snapshot:\n\n- <strong>Sara L.</strong>: 89 avg score, 78 tickets, 0 flags (top performer)\n- <strong>Marcus K.</strong>: 82 avg score, 92 tickets, 1 flag\n- <strong>Anna H.</strong>: 74 avg score, 64 tickets, 2 flags\n- <strong>Jonas P.</strong>: 71 avg score, 108 tickets, 4 flags (needs coaching)\n\nTeam gap: <strong>empathy</strong> scored lowest at 3.4/5. Want details on a specific agent?' },
];

const FALLBACK_RESPONSES = [
  'I found several relevant patterns in your support data. Here are the key insights:\n\n- Ticket volume is <strong>up 8%</strong> week-over-week (312 this week)\n- Top trending tag: <strong>api-rate-limit</strong> (+250%)\n- 3 accounts flagged as at-risk\n\nCan you be more specific about what you\'d like to explore?',
  'Based on your knowledge base, here\'s what I can tell you:\n\n- Your team handles ~48 tickets/day across 4 sources\n- Average first response: <strong>1.8 hours</strong>\n- Resolution time: <strong>18.2 hours</strong>\n- CSAT trend: stable at ~78%\n\nWhat aspect would you like me to dive deeper into?',
  'I\'ve searched across Freshdesk, Jira, and your CRM data. Here\'s a summary:\n\n- <strong>241 open tickets</strong> (12 overdue)\n- <strong>83 Jira issues</strong> linked to customer reports\n- <strong>5 auto-response drafts</strong> pending review\n\nAsk me about a specific topic, company, or agent to get more targeted results.',
];

function findChatResponse(query) {
  const q = query.toLowerCase();
  for (const cr of CHAT_RESPONSES) {
    if (cr.keywords.some(kw => q.includes(kw))) return cr.response;
  }
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

Router.register('mastermind-chat', () => `
  ${UI.sectionHead('Mastermind Chat', 'Conversational AI with citations')}

  <div class="card">
    <div class="chat-wrap">
      <div class="chat-messages" id="chat-messages">
        ${UI.chatMsg('Hello! I can answer questions about your support data — tickets, customers, agents, trends, and more. Try asking about <em>billing trends</em>, <em>churn risk</em>, <em>SLA performance</em>, or <em>agent quality scores</em>.', 'ai')}
        ${chatHistory.map(m => UI.chatMsg(m.text, m.role)).join('')}
      </div>
      <div class="chat-input-row">
        <input class="input" id="chat-input" placeholder="Ask about tickets, agents, trends, companies…" style="flex:1">
        <button class="btn btn-primary" id="chat-send-btn">Send</button>
      </div>
    </div>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'mastermind-chat') return;

  function sendChat() {
    const input = document.getElementById('chat-input');
    const msgs  = document.getElementById('chat-messages');
    const q = input.value.trim();
    if (!q) return;

    chatHistory.push({ role: 'user', text: q });
    msgs.innerHTML += UI.chatMsg(q, 'user');
    input.value = '';
    msgs.scrollTop = msgs.scrollHeight;

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    msgs.innerHTML += `<div id="${typingId}" class="chat-msg"><div class="chat-msg-label">SYNAPSE AI</div><div class="chat-bubble" style="color:var(--text-muted)">Thinking…</div></div>`;
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(() => {
      const reply = findChatResponse(q);
      chatHistory.push({ role: 'ai', text: reply });
      const el = document.getElementById(typingId);
      if (el) el.remove();
      msgs.innerHTML += UI.chatMsg(reply, 'ai');
      msgs.scrollTop = msgs.scrollHeight;
    }, 800 + Math.random() * 600);
  }

  document.getElementById('chat-send-btn')?.addEventListener('click', sendChat);
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });
});

// ── ARTICLES ──
Router.register('mastermind-articles', () => `
  ${UI.sectionHead('Articles', 'AI-generated docs from your knowledge base')}

  <div class="card mb-4">
    <div style="display:flex;gap:10px">
      <input class="input" placeholder="Enter a topic to generate an article (e.g. 'API rate limits')…" style="flex:1">
      <button class="btn btn-primary">Generate</button>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Generated Articles</span></div>
    <table class="table">
      <thead><tr><th>Title</th><th>Sections</th><th>Sources</th><th>Created</th><th></th></tr></thead>
      <tbody>
        <tr><td style="font-weight:500">Troubleshooting API Rate Limit Errors</td><td>6</td><td>14</td><td>Today</td><td><button class="btn btn-ghost btn-sm">View</button></td></tr>
        <tr><td style="font-weight:500">CSV Export: Common Issues & Fixes</td><td>4</td><td>8</td><td>Yesterday</td><td><button class="btn btn-ghost btn-sm">View</button></td></tr>
        <tr><td style="font-weight:500">SSO Configuration Guide</td><td>8</td><td>22</td><td>3 days ago</td><td><button class="btn btn-ghost btn-sm">View</button></td></tr>
        <tr><td style="font-weight:500">GDPR Data Export Requests</td><td>5</td><td>11</td><td>5 days ago</td><td><button class="btn btn-ghost btn-sm">View</button></td></tr>
      </tbody>
    </table>
  </div>
`);

// ── AGENTS (with test/preview flow) ──
const AGENT_CONFIGS = [
  { id: 'billing',   icon: '💳', name: 'Billing Agent',    desc: 'Billing & payments only',   color: 'rgba(79,142,247,0.2)',  mode: 'Quick Search',    temp: 0.3, threshold: 0.7 },
  { id: 'technical',  icon: '🔧', name: 'Technical Agent',  desc: 'Deep product Q&A',          color: 'rgba(124,92,252,0.2)',  mode: 'Thorough Search', temp: 0.2, threshold: 0.8 },
];

const AGENT_TEST_RESPONSES = {
  billing: [
    { q: 'How do I get a refund?', answer: 'Based on 34 resolved refund tickets: Refunds are processed within 5-7 business days once approved by the billing team. Customers should submit a request via the support portal with their invoice number. Partial refunds available for mid-cycle cancellations.', sources: 3, confidence: 0.92 },
    { q: 'Why was I double charged?', answer: 'Double charges typically occur during: (1) plan upgrades processed at month boundary, (2) failed payment retries, (3) simultaneous portal + API subscription updates. Resolution: verify in billing dashboard, issue credit within 24h. 28 similar tickets resolved this quarter.', sources: 5, confidence: 0.88 },
  ],
  technical: [
    { q: 'API returns 429 errors', answer: 'Rate limit errors (429) indicate exceeding 1000 req/min. Solutions by priority: (1) Implement exponential backoff with jitter, (2) Batch requests using bulk endpoints, (3) Request limit increase for enterprise accounts. Current spike: 14 tickets this week, linked to JR-4401.', sources: 8, confidence: 0.95 },
    { q: 'Webhook payloads are empty', answer: 'Empty webhook payloads traced to: (1) Content-Type header mismatch (expect application/json), (2) Payload size exceeding 5MB limit — body silently dropped, (3) Auth token expired causing 401 with empty body. Verify webhook URL is HTTPS and returns 200 within 10s.', sources: 4, confidence: 0.87 },
  ],
};

let testingAgent = null;

Router.register('mastermind-agents', () => `
  ${UI.sectionHead('AI Agents', 'Specialized knowledge agents',
    `<button class="btn btn-primary">+ New Agent</button>`)}

  <div class="grid-3" id="agents-grid">
    ${AGENT_CONFIGS.map(a => `
      <div class="card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:40px;height:40px;background:${a.color};border-radius:10px;
                      display:flex;align-items:center;justify-content:center;font-size:20px">${a.icon}</div>
          <div>
            <div style="font-weight:600;font-family:'Syne',sans-serif">${a.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${a.desc}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Mode: ${a.mode} · Temp: ${a.temp} · Threshold: ${a.threshold}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm">Edit</button>
          <button class="btn btn-primary btn-sm agent-test-btn" data-agent="${a.id}">Test</button>
        </div>
      </div>
    `).join('')}
    <div class="card" style="border-style:dashed;display:flex;align-items:center;justify-content:center;
         cursor:pointer;color:var(--text-muted);gap:8px;min-height:140px">
      <span style="font-size:24px">+</span> New Agent
    </div>
  </div>

  <div id="agent-test-panel" style="display:none" class="mt-4">
    <div class="card">
      <div class="card-header">
        <span class="card-title" id="test-agent-title">Testing Agent</span>
        <button class="btn btn-ghost btn-sm" id="close-test-panel">Close</button>
      </div>
      <div style="margin-bottom:12px">
        <div style="display:flex;gap:10px">
          <input class="input" id="agent-test-input" placeholder="Type a test question…" style="flex:1">
          <button class="btn btn-primary" id="agent-test-send">Send</button>
        </div>
      </div>
      <div id="agent-test-results">
        <div class="empty-state" style="padding:20px"><div class="empty-icon">◌</div>Send a test question to see how this agent responds</div>
      </div>
    </div>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'mastermind-agents') return;

  // Test button clicks
  document.querySelectorAll('.agent-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      testingAgent = btn.dataset.agent;
      const cfg = AGENT_CONFIGS.find(a => a.id === testingAgent);
      document.getElementById('agent-test-panel').style.display = 'block';
      document.getElementById('test-agent-title').textContent = `Testing: ${cfg.name}`;
      document.getElementById('agent-test-results').innerHTML =
        `<div class="empty-state" style="padding:20px"><div class="empty-icon">◌</div>Send a test question to see how this agent responds</div>`;
      document.getElementById('agent-test-input').focus();
    });
  });

  // Close test panel
  document.getElementById('close-test-panel')?.addEventListener('click', () => {
    document.getElementById('agent-test-panel').style.display = 'none';
    testingAgent = null;
  });

  // Send test question
  function sendTest() {
    const input = document.getElementById('agent-test-input');
    const results = document.getElementById('agent-test-results');
    const q = input.value.trim();
    if (!q || !testingAgent) return;

    results.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:12px">Processing query with ${AGENT_CONFIGS.find(a => a.id === testingAgent)?.name}…</div>`;
    input.value = '';

    setTimeout(() => {
      // Find matching test response or generate a generic one
      const agentResponses = AGENT_TEST_RESPONSES[testingAgent] || [];
      const match = agentResponses.find(r => q.toLowerCase().includes(r.q.split(' ')[0].toLowerCase()));
      const resp = match || {
        q: q,
        answer: `The ${AGENT_CONFIGS.find(a => a.id === testingAgent)?.name} analyzed your question across the knowledge base. Results would appear here with real data connected. Try one of the suggested questions below for a demo preview.`,
        sources: Math.floor(Math.random() * 8) + 1,
        confidence: 0.7 + Math.random() * 0.25,
      };

      results.innerHTML = `
        <div style="padding:12px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-weight:500;font-size:13px">${q}</span>
            <span class="mono" style="color:${resp.confidence >= 0.85 ? 'var(--green)' : resp.confidence >= 0.7 ? 'var(--yellow)' : 'var(--red)'};font-size:11px">${resp.confidence.toFixed(2)}</span>
          </div>
          <div style="font-size:13px;color:var(--text-dim);line-height:1.7;margin-bottom:10px">${resp.answer}</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${UI.badge(resp.sources + ' sources', 'badge-blue')}
            ${resp.confidence >= 0.8 ? UI.badge('High confidence', 'badge-green') : UI.badge('Medium confidence', 'badge-yellow')}
          </div>
        </div>
        <div class="divider"></div>
        <div style="font-size:11px;color:var(--text-muted)">
          Suggested test questions:
          ${agentResponses.map(r => `<div style="margin-top:4px;cursor:pointer;color:var(--accent)" class="suggested-q">${r.q}</div>`).join('')}
        </div>`;

      // Wire suggested question clicks
      results.querySelectorAll('.suggested-q').forEach(sq => {
        sq.addEventListener('click', () => {
          document.getElementById('agent-test-input').value = sq.textContent;
          sendTest();
        });
      });
    }, 600 + Math.random() * 400);
  }

  document.getElementById('agent-test-send')?.addEventListener('click', sendTest);
  document.getElementById('agent-test-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendTest();
  });
});

// ── MASTERMIND SETTINGS ──
Router.register('mastermind-settings', () => `
  ${UI.sectionHead('Mastermind Settings', 'Pipeline configuration & status')}

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><span class="card-title">Pipeline Status</span></div>
      ${[
        ['Vector Indexing',    'badge-green', '● Running'],
        ['Knowledge Graph',    'badge-green', '● Running'],
        ['Distillation',       'badge-yellow','● Partial'],
        ['PII Scanner',        'badge-green', '● Done'],
      ].map(([label, cls, text]) => `
        <div class="config-row">
          <div class="config-label">${label}</div>
          ${UI.badge(text, cls)}
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Controls</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${['Trigger Ingestion','Re-index Vectors','Run Distillation','Run PII Scan'].map(label =>
          `<button class="btn btn-ghost">▶ ${label}</button>`
        ).join('')}
      </div>
    </div>
  </div>
`);
