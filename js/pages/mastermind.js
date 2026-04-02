// ── MASTERMIND SEARCH ──
Router.register('mastermind-search', () => `
  ${UI.sectionHead('Mastermind Search', 'AI-powered knowledge retrieval')}

  <div class="card mb-4">
    <div class="mode-select" id="search-modes">
      ${['Vector','GraphRAG','Deep GraphRAG','Distilled','Distilled Deep'].map((m,i) =>
        `<div class="mode-btn${i===0?' active':''}" data-mode="${m}">${m}</div>`
      ).join('')}
    </div>
    <div style="display:flex;gap:10px">
      <input class="input" id="mm-query" placeholder="Ask a question across your support history…" style="flex:1">
      <button class="btn btn-primary" id="mm-search-btn">Search</button>
    </div>
  </div>

  <div id="mm-results">
    <div class="card mb-3">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:600">How do customers typically report API rate limit issues?</div>
        <span class="mono" style="color:var(--green);font-size:11px">0.94</span>
      </div>
      <p style="font-size:13px;color:var(--text-dim);line-height:1.7">
        Most customers report rate limit issues in the context of automated pipelines hitting the 1000 req/min threshold.
        Common patterns include batch processing scripts, overnight jobs, and third-party integrations with retry logic that
        amplifies the problem. 14 tickets in the past week match this pattern.
      </p>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${UI.badge('#FD-10401','badge-blue')} ${UI.badge('#FD-10388','badge-blue')} ${UI.badge('+11 more','badge-gray')}
      </div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:600">What's the recommended resolution for rate limit errors?</div>
        <span class="mono" style="color:var(--green);font-size:11px">0.88</span>
      </div>
      <p style="font-size:13px;color:var(--text-dim);line-height:1.7">
        Agents consistently recommend exponential backoff with jitter, or requesting a rate limit increase for enterprise
        accounts. Workaround for batch jobs: spread requests over time using a queue system.
      </p>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${UI.badge('#FD-9812','badge-blue')} ${UI.badge('#FD-9644','badge-blue')}
      </div>
    </div>
  </div>
`);

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
    document.getElementById('mm-results').innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div style="font-weight:600">${q}</div>
          <span class="mono" style="color:var(--green);font-size:11px">0.87</span>
        </div>
        <p style="font-size:13px;color:var(--text-dim);line-height:1.7">
          Demo result for "<strong>${q}</strong>". Connect your data sources and run a sync to see
          real results matched from your knowledge base.
        </p>
        <div style="margin-top:10px">${UI.badge('Connect your data to see real results','badge-gray')}</div>
      </div>`;
  });
});

// ── MASTERMIND CHAT ──
const chatHistory = [];

Router.register('mastermind-chat', () => `
  ${UI.sectionHead('Mastermind Chat', 'Conversational search with citations')}

  <div class="card">
    <div class="chat-wrap">
      <div class="chat-messages" id="chat-messages">
        ${UI.chatMsg('Hello! I can answer questions about your support history, customers, tickets, and knowledge base. What would you like to know?', 'ai')}
        ${chatHistory.map(m => UI.chatMsg(m.text, m.role)).join('')}
      </div>
      <div class="chat-input-row">
        <input class="input" id="chat-input" placeholder="Ask a follow-up…" style="flex:1">
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

    setTimeout(() => {
      const reply = `Based on your support data, here's what I found for "<em>${q}</em>". This is a demo — connect your data sources and run a sync to get live answers from your actual knowledge base.`;
      chatHistory.push({ role: 'ai', text: reply });
      msgs.innerHTML += UI.chatMsg(reply, 'ai');
      msgs.scrollTop = msgs.scrollHeight;
    }, 700);
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

// ── AGENTS ──
Router.register('mastermind-agents', () => `
  ${UI.sectionHead('AI Agents', 'Specialized knowledge agents',
    `<button class="btn btn-primary">+ New Agent</button>`)}

  <div class="grid-3">
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:40px;height:40px;background:rgba(79,142,247,0.2);border-radius:10px;
                    display:flex;align-items:center;justify-content:center;font-size:20px">💳</div>
        <div>
          <div style="font-weight:600;font-family:'Syne',sans-serif">Billing Agent</div>
          <div style="font-size:11px;color:var(--text-muted)">Billing & payments only</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Search: Vector · Temp: 0.3 · Threshold: 0.7</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm">Edit</button>
        <button class="btn btn-ghost btn-sm">Test</button>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:40px;height:40px;background:rgba(124,92,252,0.2);border-radius:10px;
                    display:flex;align-items:center;justify-content:center;font-size:20px">🔧</div>
        <div>
          <div style="font-weight:600;font-family:'Syne',sans-serif">Technical Agent</div>
          <div style="font-size:11px;color:var(--text-muted)">Deep product Q&A</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Search: Deep GraphRAG · Temp: 0.2 · Threshold: 0.8</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm">Edit</button>
        <button class="btn btn-ghost btn-sm">Test</button>
      </div>
    </div>
    <div class="card" style="border-style:dashed;display:flex;align-items:center;justify-content:center;
         cursor:pointer;color:var(--text-muted);gap:8px;min-height:140px">
      <span style="font-size:24px">+</span> New Agent
    </div>
  </div>
`);

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
