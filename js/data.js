/**
 * data.js — Central data store
 * Replace these with real API calls when connecting to your backend.
 * Each object corresponds to a page or feature area.
 */

const DATA = {

  sources: [
    { id: 'freshdesk', label: 'Freshdesk',      icon: '🎫', color: 'var(--accent)',  docs: 14832, newSince: 128, lastSync: 'Today 08:31 UTC' },
    { id: 'freshchat', label: 'Freshchat',      icon: '💬', color: 'var(--cyan)',    docs: 3241,  newSince: 43,  lastSync: 'Today 08:31 UTC' },
    { id: 'crm',       label: 'Freshworks CRM', icon: '💰', color: 'var(--green)',   docs: 892,   newSince: 6,   lastSync: 'Today 08:31 UTC' },
    { id: 'jira',      label: 'Jira',           icon: '🐞', color: 'var(--yellow)',  docs: 1104,  newSince: 17,  lastSync: 'Today 08:31 UTC' },
  ],

  pipeline: [
    { label: 'Vector Index',    pct: 98, color: 'var(--accent)' },
    { label: 'Knowledge Graph', pct: 91, color: 'var(--accent2)' },
    { label: 'Distillation',    pct: 77, color: 'var(--green)' },
    { label: 'PII Scan',        pct: 100, color: 'var(--yellow)' },
  ],

  activity: [
    { title: 'Freshdesk sync completed — 128 new records',          time: 'Today, 08:31 UTC', active: true },
    { title: "Today's AI briefing generated",                        time: 'Today, 08:30 UTC', active: true },
    { title: 'QA run completed — 342 tickets scored',               time: 'Yesterday, 23:14 UTC' },
    { title: 'Auto-responder: 18 drafts generated, 12 approved',    time: 'Yesterday, 17:02 UTC' },
    { title: 'Jira sync — 17 new issues tracked',                   time: 'Yesterday, 14:45 UTC' },
  ],

  ingestChart: [82, 120, 95, 140, 110, 38, 55],
  ingestLabels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],

  weeklyChart:  [210, 280, 260, 312, 295, 140, 180],
  weeklyLabels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],

  hourlyChart:  [2,1,1,3,5,8,12,18,22,16,14,19,24,21,18,16,14,12,10,9,8,6,4,3],
  hourlyLabels: ['00','03','06','09','12','15','18','21'],

  documents: [
    { id: '#FD-10432', source: 'Freshdesk', sourceBadge: 'badge-blue',   title: 'Cannot login after password reset',       indexed: true },
    { id: '#FD-10431', source: 'Freshdesk', sourceBadge: 'badge-blue',   title: 'API rate limits hitting production',       indexed: true },
    { id: '#FC-8821',  source: 'Freshchat', sourceBadge: 'badge-purple', title: 'Billing question — upgrade path',          indexed: true },
    { id: '#JR-4401',  source: 'Jira',      sourceBadge: 'badge-yellow', title: '[BUG] Export CSV fails for large datasets',indexed: true },
    { id: '#FD-10429', source: 'Freshdesk', sourceBadge: 'badge-blue',   title: 'Integration broken after v3.2 update',     indexed: false, status: 'Queued' },
    { id: '#CRM-2211', source: 'CRM',       sourceBadge: 'badge-green',  title: 'Acme Corp — renewal note Q1',              indexed: true },
    { id: '#FD-10428', source: 'Freshdesk', sourceBadge: 'badge-blue',   title: 'GDPR data export request',                 indexed: true },
    { id: '#JR-4400',  source: 'Jira',      sourceBadge: 'badge-yellow', title: '[FEAT] Webhook support for v4 API',        indexed: false, status: 'Pending' },
  ],

  pressingStats: { overdue: 12, stale: 27, blocking: 8 },

  pressingTickets: [
    { id: '#FD-10401', title: 'API completely down — cannot access data',         priority: 'Urgent', age: '3h',  sla: 'Overdue', arr: '3.2M' },
    { id: '#FD-10388', title: 'Data export corrupted — urgent compliance issue',  priority: 'Urgent', age: '7h',  sla: 'Overdue', arr: '1.8M' },
    { id: '#FD-10372', title: 'SSO broken for entire organisation',               priority: 'High',   age: '12h', sla: 'At Risk', arr: '950K' },
    { id: '#FD-10360', title: 'Billing charge incorrect — requesting refund',     priority: 'Medium', age: '2d',  sla: 'Overdue', arr: '120K' },
    { id: '#JR-4401',  title: '[Jira] CSV export memory overflow',               priority: 'High',   age: '5d',  sla: 'N/A',     arr: '—' },
  ],

  health: [
    { company: 'Acme Corp',        tickets: 18, resRate: '72%',  repeats: 4, arr: '3.2M', status: 'At Risk' },
    { company: 'Nordic Fintech AS',tickets: 6,  resRate: '100%', repeats: 0, arr: '2.8M', status: 'Healthy' },
    { company: 'Stormcloud Ltd',   tickets: 24, resRate: '58%',  repeats: 7, arr: '2.1M', status: 'At Risk' },
    { company: 'Borealis Systems', tickets: 3,  resRate: '100%', repeats: 0, arr: '1.6M', status: 'Healthy' },
    { company: 'DataPilot GmbH',   tickets: 11, resRate: '82%',  repeats: 2, arr: '1.4M', status: 'Watch' },
    { company: 'Vega Analytics',   tickets: 8,  resRate: '88%',  repeats: 1, arr: '900K', status: 'Watch' },
    { company: 'Helio Retail AB',  tickets: 2,  resRate: '100%', repeats: 0, arr: '450K', status: 'Healthy' },
  ],

  qualityStats: { firstResponse: '1.8h', resolution: '18.2h', sla: '84%', effort: '3.2' },

  qualityArr: [
    { company: 'Acme Corp',         arr: '3.2M', open: 6,  avgRes: '52h', sla: '68%', slaBadge: 'badge-red' },
    { company: 'Nordic Fintech AS', arr: '2.8M', open: 1,  avgRes: '14h', sla: '97%', slaBadge: 'badge-green' },
    { company: 'Stormcloud Ltd',    arr: '2.1M', open: 9,  avgRes: '48h', sla: '74%', slaBadge: 'badge-yellow' },
    { company: 'DataPilot GmbH',    arr: '1.4M', open: 3,  avgRes: '21h', sla: '82%', slaBadge: 'badge-yellow' },
  ],

  analyses: [
    { date: 'Today 08:30',  type: 'Daily Briefing',  typeBadge: 'badge-blue',   model: 'claude-sonnet-4', summary: 'API spike, CSV pattern, Acme churn risk' },
    { date: 'Yesterday',    type: 'Churn Analysis',  typeBadge: 'badge-purple', model: 'claude-sonnet-4', summary: '7 accounts flagged, NOK 4.8M ARR at risk' },
    { date: '2 days ago',   type: 'Quality Report',  typeBadge: 'badge-green',  model: 'claude-sonnet-4', summary: 'Team avg 78/100, empathy gap identified' },
    { date: '3 days ago',   type: 'Trending',        typeBadge: 'badge-yellow', model: 'claude-sonnet-4', summary: 'Login issues 2× spike, root cause unclear' },
  ],

  qaDimensions: [
    { label: 'Clarity',              score: 4.1, color: 'var(--accent)' },
    { label: 'Tone',                 score: 4.3, color: 'var(--cyan)' },
    { label: 'Empathy',              score: 3.4, color: 'var(--yellow)' },
    { label: 'Accuracy',             score: 4.5, color: 'var(--green)' },
    { label: 'Resolution',           score: 3.8, color: 'var(--accent2)' },
    { label: 'Efficiency',           score: 3.6, color: 'var(--accent)' },
    { label: 'Ownership',            score: 4.0, color: 'var(--green)' },
    { label: 'Commercial Awareness', score: 2.8, color: 'var(--red)' },
  ],

  qaAgents: [
    { initials: 'SL', name: 'Sara L.',   tickets: 78,  score: 89, flags: 0 },
    { initials: 'MK', name: 'Marcus K.', tickets: 92,  score: 82, flags: 1 },
    { initials: 'AH', name: 'Anna H.',   tickets: 64,  score: 74, flags: 2 },
    { initials: 'JP', name: 'Jonas P.',  tickets: 108, score: 71, flags: 4 },
  ],

  churnTickets: [
    { id: '#FD-10401', company: 'Acme Corp',      score: 38, csat: '1.5', signal: 'Mentions cancelling' },
    { id: '#FD-10388', company: 'Acme Corp',      score: 44, csat: '2.0', signal: 'Competitor mentioned' },
    { id: '#FD-10351', company: 'Stormcloud Ltd', score: 52, csat: '2.5', signal: 'Severe frustration' },
    { id: '#FD-10312', company: 'DataPilot GmbH', score: 58, csat: '2.8', signal: 'Repeated unresolved' },
  ],

  churnAgents: [
    { initials: 'JP', name: 'Jonas P.',  flags: 4, badge: 'badge-red' },
    { initials: 'AH', name: 'Anna H.',   flags: 2, badge: 'badge-yellow' },
    { initials: 'MK', name: 'Marcus K.', flags: 1, badge: 'badge-gray' },
  ],

  drafts: [
    { id: '#FD-10432', title: 'Cannot login after password reset', conf: 0.91, status: 'Draft' },
    { id: '#FD-10430', title: 'How to export data to CSV',         conf: 0.86, status: 'Draft' },
    { id: '#FD-10427', title: 'Webhook setup documentation',       conf: 0.64, status: 'Draft' },
    { id: '#FD-10420', title: 'GDPR data deletion request',        conf: 0.72, status: 'Draft' },
    { id: '#FD-10418', title: 'MFA not working on mobile app',     conf: 0.83, status: 'Draft' },
  ],

  trendingTags: [
    { tag: 'api-rate-limit', cls: 'hot',      thisWeek: 14, lastWeek: 4,  changeBadge: 'badge-red',    change: '+250%' },
    { tag: 'csv-export',     cls: 'trending', thisWeek: 8,  lastWeek: 3,  changeBadge: 'badge-yellow', change: '+167%' },
    { tag: 'login-issue',    cls: 'trending', thisWeek: 11, lastWeek: 7,  changeBadge: 'badge-yellow', change: '+57%' },
    { tag: 'billing',        cls: '',         thisWeek: 6,  lastWeek: 5,  changeBadge: 'badge-gray',   change: '+20%' },
    { tag: 'integration',    cls: '',         thisWeek: 9,  lastWeek: 8,  changeBadge: 'badge-gray',   change: '+13%' },
  ],

  trendingKeywords: [
    { word: 'timeout',       cls: 'hot' },
    { word: 'rate limit',    cls: 'hot' },
    { word: 'export',        cls: 'trending' },
    { word: 'CSV',           cls: 'trending' },
    { word: 'cannot login',  cls: 'trending' },
    { word: 'password',      cls: '' },
    { word: 'webhook',       cls: '' },
    { word: 'API v3',        cls: '' },
    { word: 'GDPR',          cls: '' },
    { word: 'slow',          cls: '' },
    { word: 'down',          cls: '' },
    { word: 'billing cycle', cls: '' },
  ],

  freshdeskStats: { open: 241, resolved: 963, pending: 84, closed: 4312 },

  freshdeskPriority: [
    { label: 'Urgent', count: 18,  color: 'var(--red)' },
    { label: 'High',   count: 67,  color: 'var(--yellow)' },
    { label: 'Medium', count: 124, color: 'var(--accent)' },
    { label: 'Low',    count: 32,  color: 'var(--text-muted)' },
  ],

  freshdeskTags: [
    { word: 'api-rate-limit (14)', cls: 'hot' },
    { word: 'csv-export (8)',      cls: 'trending' },
    { word: 'login (11)',          cls: '' },
    { word: 'billing (6)',         cls: '' },
    { word: 'sso (9)',             cls: '' },
    { word: 'webhook (7)',         cls: '' },
    { word: 'gdpr (5)',            cls: '' },
    { word: 'integration (9)',     cls: '' },
  ],

  jiraStats: { open: 83, inProgress: 41, resolved: 118, avgRes: '6.2d' },

  jiraCorrelation: [
    { tag: 'csv-export',    issue: 'JR-4401', status: 'In Progress', statusBadge: 'badge-yellow', tickets: 8 },
    { tag: 'api-rate-limit',issue: 'JR-4388', status: 'Open',        statusBadge: 'badge-blue',   tickets: 14 },
    { tag: 'webhook',       issue: 'JR-4340', status: 'Done',        statusBadge: 'badge-green',  tickets: 7 },
    { tag: 'sso',           issue: 'JR-4298', status: 'In Progress', statusBadge: 'badge-yellow', tickets: 9 },
  ],

  attachmentStats: { total: 2841, extracted: 2609, pending: 232 },

  attachmentTypes: [
    { label: 'PDF',         count: 984,  pct: 72, color: 'var(--accent)' },
    { label: 'Images (PNG/JPG)', count: 1124, pct: 88, color: 'var(--green)' },
    { label: 'XLSX / CSV',  count: 441,  pct: 55, color: 'var(--yellow)' },
    { label: 'Other',       count: 292,  pct: 30, color: 'var(--text-muted)' },
  ],

  // ── DASHBOARD KPIs (per time range) ──
  dashboardKPIs: {
    today: [
      { title: 'Open Tickets',    value: '241', delta: '+18',  dir: 'up',   label: 'vs yesterday', color: 'var(--accent)' },
      { title: 'SLA Compliance',  value: '84%', delta: '-2%',  dir: 'down', label: 'vs yesterday', color: 'var(--yellow)' },
      { title: 'Churn Signals',   value: '7',   delta: '+1',   dir: 'up',   label: 'vs yesterday', color: 'var(--red)' },
      { title: 'Drafts Pending',  value: '5',   delta: '+3',   dir: 'up',   label: 'vs yesterday', color: 'var(--green)' },
    ],
    week: [
      { title: 'Open Tickets',    value: '241', delta: '+8%',  dir: 'up',   label: 'vs last week', color: 'var(--accent)' },
      { title: 'SLA Compliance',  value: '84%', delta: '-3%',  dir: 'down', label: 'vs last week', color: 'var(--yellow)' },
      { title: 'Churn Signals',   value: '7',   delta: '+2',   dir: 'up',   label: 'vs last week', color: 'var(--red)' },
      { title: 'Drafts Pending',  value: '5',   delta: 'new',  dir: '',     label: 'awaiting review', color: 'var(--green)' },
    ],
    month: [
      { title: 'Open Tickets',    value: '241', delta: '+12%', dir: 'up',   label: 'vs last month', color: 'var(--accent)' },
      { title: 'SLA Compliance',  value: '84%', delta: '-5%',  dir: 'down', label: 'vs last month', color: 'var(--yellow)' },
      { title: 'Churn Signals',   value: '7',   delta: '+4',   dir: 'up',   label: 'vs last month', color: 'var(--red)' },
      { title: 'Drafts Pending',  value: '5',   delta: '+12',  dir: 'up',   label: 'vs last month', color: 'var(--green)' },
    ],
  },

  attentionItems: [
    { icon: '⚑', text: '12 SLA breaches need response',               badge: 'badge-red',    page: 'intel-hub' },
    { icon: '△', text: '7 churn signals — 4.8M NOK at risk',          badge: 'badge-red',    page: 'churn-risk' },
    { icon: '⊟', text: '5 auto-response drafts awaiting review',       badge: 'badge-green',  page: 'ar-drafts' },
    { icon: '⬆', text: 'API rate limit +250% this week',              badge: 'badge-yellow', page: 'intel-hub' },
    { icon: '◎', text: 'QA: Commercial Awareness scored 2.8 / 5',     badge: 'badge-yellow', page: 'qa-summary' },
  ],

  accountsUnified: [
    { company: 'Acme Corp',        tickets: 18, resRate: '72%',  avgRes: '52h', repeats: 4, arr: '3.2M', sla: '68%', slaBadge: 'badge-red',    status: 'At Risk' },
    { company: 'Stormcloud Ltd',   tickets: 24, resRate: '58%',  avgRes: '48h', repeats: 7, arr: '2.1M', sla: '74%', slaBadge: 'badge-yellow', status: 'At Risk' },
    { company: 'Nordic Fintech AS',tickets: 6,  resRate: '100%', avgRes: '14h', repeats: 0, arr: '2.8M', sla: '97%', slaBadge: 'badge-green',  status: 'Healthy' },
    { company: 'Borealis Systems', tickets: 3,  resRate: '100%', avgRes: '8h',  repeats: 0, arr: '1.6M', sla: '100%',slaBadge: 'badge-green',  status: 'Healthy' },
    { company: 'DataPilot GmbH',   tickets: 11, resRate: '82%',  avgRes: '21h', repeats: 2, arr: '1.4M', sla: '82%', slaBadge: 'badge-yellow', status: 'Watch' },
    { company: 'Vega Analytics',   tickets: 8,  resRate: '88%',  avgRes: '16h', repeats: 1, arr: '900K', sla: '90%', slaBadge: 'badge-green',  status: 'Watch' },
    { company: 'Helio Retail AB',  tickets: 2,  resRate: '100%', avgRes: '6h',  repeats: 0, arr: '450K', sla: '100%',slaBadge: 'badge-green',  status: 'Healthy' },
  ],

  analysisScopes: [
    { value: 'daily-briefing', label: 'Daily Briefing' },
    { value: 'churn-analysis', label: 'Churn Analysis' },
    { value: 'quality-report', label: 'Quality Report' },
    { value: 'trending',       label: 'Trending Issues' },
  ],

  atRiskAccounts: [
    { company: 'Acme Corp',      arr: '3.2M', tickets: 18, repeats: 4, status: 'At Risk' },
    { company: 'Stormcloud Ltd', arr: '2.1M', tickets: 24, repeats: 7, status: 'At Risk' },
    { company: 'DataPilot GmbH', arr: '1.4M', tickets: 11, repeats: 2, status: 'Watch' },
  ],

  // ── QA COACHING ──
  qaCoaching: [
    {
      id: 'jp', initials: 'JP', name: 'Jonas P.',
      score: 71, prevScore: 68, tickets: 108, flags: 4,
      dimensions: [
        { label: 'Clarity',              score: 3.6, teamAvg: 4.1, color: 'var(--accent)' },
        { label: 'Tone',                 score: 3.9, teamAvg: 4.3, color: 'var(--cyan)' },
        { label: 'Empathy',              score: 2.8, teamAvg: 3.4, color: 'var(--yellow)' },
        { label: 'Accuracy',             score: 4.0, teamAvg: 4.5, color: 'var(--green)' },
        { label: 'Resolution',           score: 3.2, teamAvg: 3.8, color: 'var(--accent2)' },
        { label: 'Efficiency',           score: 3.0, teamAvg: 3.6, color: 'var(--accent)' },
        { label: 'Ownership',            score: 2.9, teamAvg: 4.0, color: 'var(--green)' },
        { label: 'Commercial Awareness', score: 2.2, teamAvg: 2.8, color: 'var(--red)' },
      ],
      worstTickets: [
        {
          id: '#FD-10401', title: 'API completely down — cannot access data', company: 'Acme Corp', score: 38,
          dimensions: [
            { label: 'Clarity', score: 2.1, feedback: 'Response was vague about root cause and timeline' },
            { label: 'Tone', score: 3.0, feedback: 'Professional but lacked urgency matching the severity' },
            { label: 'Empathy', score: 1.5, feedback: 'Did not acknowledge business impact of total outage' },
            { label: 'Accuracy', score: 3.8, feedback: 'Technical details were correct but incomplete' },
            { label: 'Resolution', score: 1.8, feedback: 'No concrete steps offered, ticket left open' },
            { label: 'Efficiency', score: 2.0, feedback: 'Multiple back-and-forth messages for basic info' },
            { label: 'Ownership', score: 1.2, feedback: 'Deflected to engineering without follow-up plan' },
            { label: 'Commercial Awareness', score: 1.0, feedback: 'No recognition of 3.2M ARR account severity' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '08:12', body: 'Our entire API integration is down. Nothing works. This is blocking all operations across 3 departments.' },
            { incoming: false, from: 'Jonas P.', time: '09:45', body: 'Hi, we are looking into this. It might be related to a recent update. I will check with the engineering team.' },
            { incoming: true, from: 'Customer', time: '10:02', body: 'It has been almost 2 hours. We are losing revenue every minute. Can you escalate this immediately?' },
            { incoming: false, from: 'Jonas P.', time: '11:30', body: 'Engineering is aware. They are working on it. I will update you when I hear back.' },
          ],
          insight: 'Critical failure in ownership and commercial awareness. A 3.2M ARR account experienced total API downtime and the agent responded with 1.5-hour gaps, no escalation, and no acknowledgement of business impact. This ticket should have triggered immediate P1 escalation with proactive 30-minute status updates.',
        },
        {
          id: '#FD-10360', title: 'Billing charge incorrect — requesting refund', company: 'DataPilot GmbH', score: 52,
          dimensions: [
            { label: 'Clarity', score: 3.2, feedback: 'Explanation of billing was adequate but could be clearer' },
            { label: 'Tone', score: 3.5, feedback: 'Slightly defensive when customer pushed back' },
            { label: 'Empathy', score: 2.8, feedback: 'Acknowledged frustration but minimized the impact' },
            { label: 'Accuracy', score: 4.2, feedback: 'Billing details were correct' },
            { label: 'Resolution', score: 2.5, feedback: 'Refund process started but no timeline given' },
            { label: 'Efficiency', score: 3.0, feedback: 'Took 2 messages to get to the actual issue' },
            { label: 'Ownership', score: 2.8, feedback: 'Passed to billing team without personal follow-up' },
            { label: 'Commercial Awareness', score: 2.0, feedback: 'Missed opportunity to discuss renewal coming up' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '14:20', body: 'We were charged twice for March. This needs to be corrected immediately — our finance team is flagging this.' },
            { incoming: false, from: 'Jonas P.', time: '15:10', body: 'Looking at your account, I see the duplicate charge. Let me forward this to our billing department.' },
            { incoming: true, from: 'Customer', time: '15:45', body: 'When will the refund be processed? We need a timeline for our finance records.' },
            { incoming: false, from: 'Jonas P.', time: '16:30', body: 'The billing team will handle the refund. You should hear from them soon.' },
          ],
          insight: 'Billing issues require immediate ownership. The agent correctly identified the duplicate charge but handed off without providing a refund timeline or proactively offering a credit. With renewal in Q2, this was a missed opportunity to strengthen the relationship.',
        },
        {
          id: '#FD-10388', title: 'Data export corrupted — urgent compliance issue', company: 'Acme Corp', score: 44,
          dimensions: [
            { label: 'Clarity', score: 3.0, feedback: 'Initial response was unclear about export format requirements' },
            { label: 'Tone', score: 3.8, feedback: 'Appropriate tone for the urgency' },
            { label: 'Empathy', score: 2.2, feedback: 'Failed to recognize compliance deadline pressure' },
            { label: 'Accuracy', score: 3.5, feedback: 'Workaround suggested was partially correct' },
            { label: 'Resolution', score: 2.0, feedback: 'Issue unresolved after 3 exchanges' },
            { label: 'Efficiency', score: 2.5, feedback: 'Asked for information already in the ticket' },
            { label: 'Ownership', score: 2.0, feedback: 'No escalation despite compliance urgency' },
            { label: 'Commercial Awareness', score: 1.8, feedback: 'Compliance failure risk not flagged internally' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '09:00', body: 'Our data export is producing corrupted files. We have a compliance deadline in 48 hours and need this fixed urgently.' },
            { incoming: false, from: 'Jonas P.', time: '10:15', body: 'Can you share which export format you are using and the file size? We have seen some issues with large exports.' },
            { incoming: true, from: 'Customer', time: '10:22', body: 'CSV format, as specified in the ticket description. Files are around 500MB. Please escalate this — we cannot miss our compliance deadline.' },
          ],
          insight: 'Compliance-related tickets demand immediate priority and cross-functional escalation. The agent asked for information already provided in the ticket, adding unnecessary delay. A 48-hour compliance deadline should have triggered P1 handling with engineering involvement.',
        },
      ],
    },
    {
      id: 'ah', initials: 'AH', name: 'Anna H.',
      score: 74, prevScore: 76, tickets: 64, flags: 2,
      dimensions: [
        { label: 'Clarity',              score: 4.0, teamAvg: 4.1, color: 'var(--accent)' },
        { label: 'Tone',                 score: 4.2, teamAvg: 4.3, color: 'var(--cyan)' },
        { label: 'Empathy',              score: 3.5, teamAvg: 3.4, color: 'var(--yellow)' },
        { label: 'Accuracy',             score: 4.3, teamAvg: 4.5, color: 'var(--green)' },
        { label: 'Resolution',           score: 3.4, teamAvg: 3.8, color: 'var(--accent2)' },
        { label: 'Efficiency',           score: 3.2, teamAvg: 3.6, color: 'var(--accent)' },
        { label: 'Ownership',            score: 3.8, teamAvg: 4.0, color: 'var(--green)' },
        { label: 'Commercial Awareness', score: 2.5, teamAvg: 2.8, color: 'var(--red)' },
      ],
      worstTickets: [
        {
          id: '#FD-10351', title: 'Integration broken after v3.2 update', company: 'Stormcloud Ltd', score: 48,
          dimensions: [
            { label: 'Clarity', score: 3.0, feedback: 'Could have been more specific about the breaking change' },
            { label: 'Tone', score: 3.5, feedback: 'Appropriate but could show more concern' },
            { label: 'Empathy', score: 2.5, feedback: 'Did not acknowledge the integration downtime impact' },
            { label: 'Accuracy', score: 4.0, feedback: 'Correctly identified the v3.2 breaking change' },
            { label: 'Resolution', score: 2.2, feedback: 'Workaround provided but not a proper fix' },
            { label: 'Efficiency', score: 2.8, feedback: 'Slow initial response for a breaking change' },
            { label: 'Ownership', score: 3.0, feedback: 'Followed up once but did not see it through' },
            { label: 'Commercial Awareness', score: 2.0, feedback: 'High-value account impact not escalated' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '07:30', body: 'Since the v3.2 update our webhook integration is completely broken. All automated workflows have stopped.' },
            { incoming: false, from: 'Anna H.', time: '09:00', body: 'I see — the v3.2 update changed the webhook payload format. You will need to update your endpoint to accept the new schema.' },
            { incoming: true, from: 'Customer', time: '09:15', body: 'This was not in the release notes. We have 50+ workflows depending on this. Can you revert or provide a compatibility layer?' },
          ],
          insight: 'Breaking changes in integrations require proactive communication before release. The agent correctly diagnosed the issue but the response shifted burden to the customer without offering migration support. For a 2.1M ARR account with 50+ dependent workflows, engineering should have been pulled in immediately.',
        },
        {
          id: '#FD-10312', title: 'Repeated login failures across team', company: 'DataPilot GmbH', score: 55,
          dimensions: [
            { label: 'Clarity', score: 3.5, feedback: 'Steps were clear but missed the root cause' },
            { label: 'Tone', score: 4.0, feedback: 'Friendly and professional' },
            { label: 'Empathy', score: 3.0, feedback: 'Acknowledged frustration adequately' },
            { label: 'Accuracy', score: 3.8, feedback: 'Initial diagnosis was correct' },
            { label: 'Resolution', score: 2.5, feedback: 'Password reset was a band-aid, not a fix' },
            { label: 'Efficiency', score: 3.0, feedback: 'Resolved in 2 exchanges but root cause unaddressed' },
            { label: 'Ownership', score: 3.5, feedback: 'Good follow-up but stopped short of escalation' },
            { label: 'Commercial Awareness', score: 2.2, feedback: 'Multiple users affected — should flag as systemic' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '11:00', body: 'Multiple team members cannot log in since this morning. We have tried password resets but the issue persists.' },
            { incoming: false, from: 'Anna H.', time: '11:30', body: 'I am sorry to hear that. Let me check your account settings. It looks like there may be an SSO configuration issue. Can you try clearing your browser cache and logging in again?' },
            { incoming: true, from: 'Customer', time: '11:45', body: 'Clearing cache did not help. This is affecting 12 people now. We need this fixed not worked around.' },
          ],
          insight: 'When multiple users report the same login failure, this indicates a systemic issue rather than individual account problems. The agent should have escalated to engineering after the first report showed a pattern, rather than suggesting individual workarounds.',
        },
      ],
    },
    {
      id: 'mk', initials: 'MK', name: 'Marcus K.',
      score: 82, prevScore: 79, tickets: 92, flags: 1,
      dimensions: [
        { label: 'Clarity',              score: 4.3, teamAvg: 4.1, color: 'var(--accent)' },
        { label: 'Tone',                 score: 4.5, teamAvg: 4.3, color: 'var(--cyan)' },
        { label: 'Empathy',              score: 3.8, teamAvg: 3.4, color: 'var(--yellow)' },
        { label: 'Accuracy',             score: 4.6, teamAvg: 4.5, color: 'var(--green)' },
        { label: 'Resolution',           score: 4.0, teamAvg: 3.8, color: 'var(--accent2)' },
        { label: 'Efficiency',           score: 4.1, teamAvg: 3.6, color: 'var(--accent)' },
        { label: 'Ownership',            score: 4.2, teamAvg: 4.0, color: 'var(--green)' },
        { label: 'Commercial Awareness', score: 3.0, teamAvg: 2.8, color: 'var(--red)' },
      ],
      worstTickets: [
        {
          id: '#FD-10415', title: 'Webhook delivery delays — 30min+ lag', company: 'Nordic Fintech AS', score: 62,
          dimensions: [
            { label: 'Clarity', score: 3.8, feedback: 'Good explanation of the delivery queue' },
            { label: 'Tone', score: 4.2, feedback: 'Confident and reassuring' },
            { label: 'Empathy', score: 3.2, feedback: 'Could have acknowledged real-time requirements more' },
            { label: 'Accuracy', score: 4.5, feedback: 'Correct diagnosis of queue backlog' },
            { label: 'Resolution', score: 3.0, feedback: 'Temporary fix applied but permanent solution pending' },
            { label: 'Efficiency', score: 3.5, feedback: 'Quick initial response, resolution took longer' },
            { label: 'Ownership', score: 3.8, feedback: 'Kept customer updated through resolution' },
            { label: 'Commercial Awareness', score: 2.5, feedback: 'Fintech real-time requirements underestimated' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '13:00', body: 'Our webhook deliveries are delayed by 30+ minutes. For a fintech platform this is unacceptable — we process real-time transactions.' },
            { incoming: false, from: 'Marcus K.', time: '13:15', body: 'I understand the urgency. I can see a delivery queue backlog on your account. Let me apply a priority boost to your webhook endpoint while we investigate the root cause.' },
            { incoming: true, from: 'Customer', time: '14:00', body: 'The priority boost helped — delays are down to 2 minutes. But we need a permanent fix. What is the timeline?' },
          ],
          insight: 'Good initial response and temporary mitigation. The gap is in providing a concrete timeline for the permanent fix and fully acknowledging the fintech real-time requirements. Consider proactive SLA review for financial services customers.',
        },
      ],
    },
    {
      id: 'sl', initials: 'SL', name: 'Sara L.',
      score: 89, prevScore: 86, tickets: 78, flags: 0,
      dimensions: [
        { label: 'Clarity',              score: 4.5, teamAvg: 4.1, color: 'var(--accent)' },
        { label: 'Tone',                 score: 4.7, teamAvg: 4.3, color: 'var(--cyan)' },
        { label: 'Empathy',              score: 4.2, teamAvg: 3.4, color: 'var(--yellow)' },
        { label: 'Accuracy',             score: 4.8, teamAvg: 4.5, color: 'var(--green)' },
        { label: 'Resolution',           score: 4.5, teamAvg: 3.8, color: 'var(--accent2)' },
        { label: 'Efficiency',           score: 4.3, teamAvg: 3.6, color: 'var(--accent)' },
        { label: 'Ownership',            score: 4.6, teamAvg: 4.0, color: 'var(--green)' },
        { label: 'Commercial Awareness', score: 3.5, teamAvg: 2.8, color: 'var(--red)' },
      ],
      worstTickets: [
        {
          id: '#FD-10422', title: 'Custom report not generating — missing fields', company: 'Vega Analytics', score: 72,
          dimensions: [
            { label: 'Clarity', score: 4.0, feedback: 'Clear explanation of the missing fields issue' },
            { label: 'Tone', score: 4.5, feedback: 'Empathetic and proactive' },
            { label: 'Empathy', score: 3.8, feedback: 'Good understanding of reporting needs' },
            { label: 'Accuracy', score: 4.2, feedback: 'Correct identification of the configuration gap' },
            { label: 'Resolution', score: 3.5, feedback: 'Workaround provided, permanent fix in next release' },
            { label: 'Efficiency', score: 4.0, feedback: 'Resolved in single exchange with workaround' },
            { label: 'Ownership', score: 4.2, feedback: 'Proactively filed the feature request' },
            { label: 'Commercial Awareness', score: 3.0, feedback: 'Could have connected to upsell for advanced reporting' },
          ],
          conversation: [
            { incoming: true, from: 'Customer', time: '10:00', body: 'Our custom report is missing the "revenue by segment" field. We need this for our quarterly board presentation next week.' },
            { incoming: false, from: 'Sara L.', time: '10:20', body: 'I see the issue — the custom field mapping was not included in the latest report template update. I have added it manually to your account and the report should now generate correctly. I have also filed a request to include this in the default template for the next release.' },
          ],
          insight: 'Solid handling overall — quick resolution with a workaround and proactive feature request. The only gap is missing the commercial angle: an analytics company needing advanced reporting is a natural fit for the Enterprise reporting add-on.',
        },
      ],
    },
  ],

  // ── DATA FRESHNESS (trust layer) ──
  // Timestamps for when each data category was last refreshed.
  // In production these update via API.hydrate(); here they are demo values.
  freshness: {
    tickets:   { source: 'cache',          fetchedAt: new Date(Date.now() - 8  * 60000).toISOString() },   // 8 min ago
    stats:     { source: 'cache',          fetchedAt: new Date(Date.now() - 8  * 60000).toISOString() },   // 8 min ago
    qa:        { source: 'ai_generated',   fetchedAt: new Date(Date.now() - 540 * 60000).toISOString(), model: 'claude-sonnet-4' }, // ~9h ago (yesterday 23:14)
    briefing:  { source: 'ai_generated',   fetchedAt: new Date(Date.now() - 2  * 60000).toISOString(), model: 'claude-sonnet-4' }, // 2 min ago
    drafts:    { source: 'ai_generated',   fetchedAt: new Date(Date.now() - 135 * 60000).toISOString(), model: 'claude-sonnet-4' }, // ~2.25h ago
    companies: { source: 'freshdesk_api',  fetchedAt: new Date(Date.now() - 8  * 60000).toISOString() },   // 8 min ago
    churn:     { source: 'ai_generated',   fetchedAt: new Date(Date.now() - 540 * 60000).toISOString(), model: 'claude-sonnet-4' }, // ~9h ago
    sync:      { source: 'freshdesk_api',  fetchedAt: new Date(Date.now() - 1  * 60000).toISOString() },   // 1 min ago
  },

  // ── SERVICE CONFIG (localStorage-backed) ──
  // Admin-configurable API keys & endpoints for each integration.
  serviceConfig: {
    _prefix: 'synapse_config_',

    // Field definitions per service
    fields: {
      freshdesk:  [
        { key: 'domain',  label: 'Subdomain',  placeholder: 'yourcompany (for yourcompany.freshdesk.com)', type: 'text' },
        { key: 'apiKey',  label: 'API Key',     placeholder: 'Freshdesk API key from Profile Settings',    type: 'password' },
      ],
      freshchat:  [
        { key: 'domain',  label: 'Domain',      placeholder: 'yourcompany.freshchat.com',                  type: 'text' },
        { key: 'apiKey',  label: 'API Key',     placeholder: 'Freshchat API key',                          type: 'password' },
      ],
      crm:        [
        { key: 'domain',  label: 'Domain',      placeholder: 'yourcompany.myfreshworks.com',               type: 'text' },
        { key: 'apiKey',  label: 'API Key',     placeholder: 'Freshworks CRM API key',                     type: 'password' },
      ],
      jira:       [
        { key: 'baseUrl', label: 'Base URL',    placeholder: 'https://yourcompany.atlassian.net',          type: 'text' },
        { key: 'email',   label: 'Email',       placeholder: 'you@company.com',                            type: 'email' },
        { key: 'apiToken',label: 'API Token',   placeholder: 'Atlassian API token',                        type: 'password' },
      ],
    },

    get(serviceId) {
      try { return JSON.parse(localStorage.getItem(this._prefix + serviceId)) || null; }
      catch { return null; }
    },
    set(serviceId, config) {
      try { localStorage.setItem(this._prefix + serviceId, JSON.stringify(config)); }
      catch (e) { console.warn('Failed to save config for', serviceId, e); }
    },
    clear(serviceId) {
      localStorage.removeItem(this._prefix + serviceId);
    },
    isConfigured(serviceId) {
      const c = this.get(serviceId);
      if (!c) return false;
      const fields = this.fields[serviceId];
      return fields ? fields.every(f => c[f.key]?.trim()) : false;
    },
    getAll() {
      return Object.keys(this.fields).map(id => ({
        id,
        config: this.get(id),
        configured: this.isConfigured(id),
      }));
    },
  },

};
