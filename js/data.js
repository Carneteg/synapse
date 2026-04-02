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

};
