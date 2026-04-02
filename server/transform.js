/**
 * transform.js — Transform raw Freshdesk API responses into DATA-compatible shapes.
 *
 * Each function takes raw Freshdesk objects and returns objects matching
 * the exact structure expected by js/data.js.
 */

// ── Freshdesk field constants ──
const STATUS = { OPEN: 2, PENDING: 3, RESOLVED: 4, CLOSED: 5 };
const STATUS_LABEL = { 2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed' };
const PRIORITY = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
const PRIORITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' };
const SOURCE = { EMAIL: 1, PORTAL: 2, PHONE: 3, CHAT: 7, BOT: 9 };
const SOURCE_LABEL = { 1: 'Email', 2: 'Portal', 3: 'Phone', 7: 'Chat', 9: 'Bot' };
const CSAT_LABEL = { 1: 'Unhappy', 2: 'Neutral', 3: 'Happy' };
const TICKET_SCOPE = { GLOBAL: 1, GROUP: 2, RESTRICTED: 3 };
const TICKET_SCOPE_LABEL = { 1: 'Global', 2: 'Group', 3: 'Restricted' };

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 0) return 'future';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Compute resolution time from stats fields (available with include=stats).
 * Returns human-readable string or '—' if not resolved.
 */
function resolutionTime(ticket) {
  const stats = ticket.stats;
  if (!stats) return '—';
  const resolved = stats.resolved_at || stats.closed_at;
  if (!resolved) return '—';
  const created = new Date(ticket.created_at);
  const done = new Date(resolved);
  const hours = Math.round((done - created) / 3600000);
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Compute first response time from stats (available with include=stats).
 * Returns hours as number, or null.
 */
function firstResponseHours(ticket) {
  const stats = ticket.stats;
  if (!stats || !stats.first_responded_at) return null;
  const created = new Date(ticket.created_at);
  const responded = new Date(stats.first_responded_at);
  return Math.round((responded - created) / 3600000 * 10) / 10;
}

/**
 * Transform tickets into multiple DATA keys.
 */
function transformTickets(tickets) {
  const open = tickets.filter(t => t.status === STATUS.OPEN).length;
  const pending = tickets.filter(t => t.status === STATUS.PENDING).length;
  const resolved = tickets.filter(t => t.status === STATUS.RESOLVED).length;
  const closed = tickets.filter(t => t.status === STATUS.CLOSED).length;

  const freshdeskStats = { open, resolved, pending, closed };

  // Priority breakdown
  const freshdeskPriority = [
    { label: 'Urgent', count: tickets.filter(t => t.priority === PRIORITY.URGENT).length, color: 'var(--red)' },
    { label: 'High',   count: tickets.filter(t => t.priority === PRIORITY.HIGH).length,   color: 'var(--yellow)' },
    { label: 'Medium', count: tickets.filter(t => t.priority === PRIORITY.MEDIUM).length, color: 'var(--accent)' },
    { label: 'Low',    count: tickets.filter(t => t.priority === PRIORITY.LOW).length,     color: 'var(--text-muted)' },
  ];

  // Pressing stats: overdue = has due_by in the past and still open/pending
  const now = new Date();
  const openOrPending = tickets.filter(t => t.status === STATUS.OPEN || t.status === STATUS.PENDING);
  const overdue = openOrPending.filter(t => t.due_by && new Date(t.due_by) < now).length;
  const stale = openOrPending.filter(t => {
    const updated = new Date(t.updated_at);
    return (now - updated) > 48 * 3600000;
  }).length;

  const pressingStats = { overdue, stale, blocking: 0 };

  // Pressing tickets: high/urgent open tickets sorted by priority desc
  const urgent = openOrPending
    .filter(t => t.priority >= PRIORITY.HIGH)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10)
    .map(t => ({
      id: `#FD-${t.id}`,
      title: t.subject || '(no subject)',
      priority: PRIORITY_LABEL[t.priority] || 'Medium',
      age: timeAgo(t.created_at),
      sla: t.due_by && new Date(t.due_by) < now ? 'Overdue'
         : t.due_by && (new Date(t.due_by) - now) < 4 * 3600000 ? 'At Risk'
         : 'N/A',
      arr: '—',
      source: SOURCE_LABEL[t.source] || 'Unknown',
      responder_id: t.responder_id,
      first_response: firstResponseHours(t),
      resolution_time: resolutionTime(t),
    }));

  // Documents: recent tickets as indexed documents
  const documents = tickets.slice(0, 20).map(t => ({
    id: `#FD-${t.id}`,
    source: 'Freshdesk',
    sourceBadge: 'badge-blue',
    title: t.subject || '(no subject)',
    indexed: t.status !== STATUS.PENDING,
    status: t.status === STATUS.PENDING ? 'Queued' : 'Indexed',
    channel: SOURCE_LABEL[t.source] || 'Unknown',
    ticketStatus: STATUS_LABEL[t.status] || 'Unknown',
    created_at: t.created_at,
  }));

  // Tag frequency from ticket tags
  const tagCounts = {};
  for (const t of tickets) {
    for (const tag of (t.tags || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const freshdeskTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word: `${word} (${count})`,
      cls: count > 10 ? 'hot' : count > 5 ? 'trending' : '',
    }));

  // Trending tags (simplified — no week comparison from single fetch)
  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({
      tag,
      cls: count > 10 ? 'hot' : count > 5 ? 'trending' : '',
      thisWeek: count,
      lastWeek: Math.max(1, Math.floor(count * 0.7)),
      changeBadge: count > 10 ? 'badge-red' : count > 5 ? 'badge-yellow' : 'badge-gray',
      change: `+${Math.round(((count / Math.max(1, Math.floor(count * 0.7))) - 1) * 100)}%`,
    }));

  const trendingKeywords = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({
      word,
      cls: count > 10 ? 'hot' : count > 5 ? 'trending' : '',
    }));

  // Source stats
  const sources = [{
    id: 'freshdesk',
    label: 'Freshdesk',
    icon: '🎫',
    color: 'var(--accent)',
    docs: tickets.length,
    newSince: tickets.filter(t => {
      const created = new Date(t.created_at);
      return (now - created) < 24 * 3600000;
    }).length,
    lastSync: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
  }];

  // Quality stats from stats fields (when include=stats is used)
  const ticketsWithStats = tickets.filter(t => t.stats);
  let qualityStats = { firstResponse: '—', resolution: '—', sla: '—', effort: '—' };
  if (ticketsWithStats.length > 0) {
    const frTimes = ticketsWithStats.map(firstResponseHours).filter(v => v !== null);
    const avgFR = frTimes.length > 0 ? (frTimes.reduce((a, b) => a + b, 0) / frTimes.length).toFixed(1) + 'h' : '—';

    const resTimes = ticketsWithStats.filter(t => t.stats.resolved_at).map(t => {
      return (new Date(t.stats.resolved_at) - new Date(t.created_at)) / 3600000;
    });
    const avgRes = resTimes.length > 0 ? (resTimes.reduce((a, b) => a + b, 0) / resTimes.length).toFixed(1) + 'h' : '—';

    const slaOk = openOrPending.filter(t => !t.due_by || new Date(t.due_by) > now).length;
    const slaTotal = openOrPending.length;
    const slaPct = slaTotal > 0 ? Math.round((slaOk / slaTotal) * 100) + '%' : '—';

    qualityStats = { firstResponse: avgFR, resolution: avgRes, sla: slaPct, effort: '—' };
  }

  return {
    freshdeskStats, freshdeskPriority, freshdeskTags,
    pressingStats, pressingTickets: urgent,
    documents, trendingTags, trendingKeywords, sources,
    qualityStats,
  };
}

/**
 * Transform companies + ticket context into health/account DATA keys.
 */
function transformCompanies(companies, tickets) {
  const ticketsByCompany = {};
  for (const t of tickets) {
    const cid = t.company_id;
    if (cid) {
      if (!ticketsByCompany[cid]) ticketsByCompany[cid] = [];
      ticketsByCompany[cid].push(t);
    }
  }

  const accountsUnified = companies
    .filter(c => c.name)
    .map(c => {
      const cTickets = ticketsByCompany[c.id] || [];
      const total = cTickets.length;
      const resolved = cTickets.filter(t => t.status === STATUS.RESOLVED || t.status === STATUS.CLOSED).length;
      const resRate = total > 0 ? Math.round((resolved / total) * 100) + '%' : '100%';
      const repeats = cTickets.filter(t => (t.tags || []).some(tag => tag.includes('repeat') || tag.includes('recurring'))).length;
      const sla = total > 0 ? Math.round((cTickets.filter(t => !t.due_by || new Date(t.due_by) >= new Date(t.resolved_at || Date.now())).length / total) * 100) : 100;

      const status = sla < 70 || repeats >= 4 ? 'At Risk' : sla < 85 || repeats >= 2 ? 'Watch' : 'Healthy';

      // Compute avgRes from stats if available
      const resolvedTickets = cTickets.filter(t => {
        const ra = t.stats?.resolved_at || t.stats?.closed_at;
        return !!ra;
      });
      let avgRes = '—';
      if (resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((sum, t) => {
          const ra = new Date(t.stats?.resolved_at || t.stats?.closed_at);
          const ca = new Date(t.created_at);
          return sum + (ra - ca) / 3600000;
        }, 0);
        const avg = Math.round(totalHours / resolvedTickets.length);
        avgRes = avg < 24 ? `${avg}h` : `${Math.round(avg / 24)}d`;
      }

      return {
        company: c.name,
        tickets: total,
        resRate,
        avgRes,
        repeats,
        arr: c.custom_fields?.arr || '—',
        sla: sla + '%',
        slaBadge: sla >= 90 ? 'badge-green' : sla >= 75 ? 'badge-yellow' : 'badge-red',
        status,
      };
    })
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 20);

  const health = accountsUnified.map(a => ({
    company: a.company,
    tickets: a.tickets,
    resRate: a.resRate,
    repeats: a.repeats,
    arr: a.arr,
    status: a.status,
  }));

  const atRiskAccounts = accountsUnified
    .filter(a => a.status === 'At Risk' || a.status === 'Watch')
    .slice(0, 5)
    .map(a => ({
      company: a.company,
      arr: a.arr,
      tickets: a.tickets,
      repeats: a.repeats,
      status: a.status,
    }));

  return { health, accountsUnified, atRiskAccounts };
}

/**
 * Transform agents into QA agent data.
 */
function transformAgents(agents) {
  const qaAgents = agents
    .filter(a => a.active && a.contact && a.contact.name)
    .slice(0, 10)
    .map(a => {
      const name = a.contact.name;
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      return {
        initials,
        name,
        email: a.contact.email || '',
        tickets: 0, // Not available from agent endpoint — needs ticket aggregation
        score: 0,
        flags: 0,
        available: a.available || false,
        occasional: a.occasional || false,
        scope: TICKET_SCOPE_LABEL[a.ticket_scope] || 'Unknown',
        group_ids: a.group_ids || [],
        role_ids: a.role_ids || [],
        id: a.id,
      };
    });

  return { qaAgents };
}

/**
 * Build dashboard KPIs from aggregated stats.
 */
function transformDashboardKPIs(freshdeskStats, pressingStats, churnCount, draftCount, qualityStats) {
  const slaValue = qualityStats?.sla || '—';
  const kpiBase = {
    today: [
      { title: 'Open Tickets',   value: String(freshdeskStats.open), delta: '', dir: '', label: 'current', color: 'var(--accent)' },
      { title: 'SLA Compliance', value: slaValue, delta: '', dir: '', label: 'live data', color: 'var(--yellow)' },
      { title: 'Churn Signals',  value: String(churnCount), delta: '', dir: '', label: 'detected', color: 'var(--red)' },
      { title: 'Drafts Pending', value: String(draftCount), delta: '', dir: '', label: 'awaiting review', color: 'var(--green)' },
    ],
    week: [
      { title: 'Open Tickets',   value: String(freshdeskStats.open), delta: '', dir: '', label: 'current', color: 'var(--accent)' },
      { title: 'SLA Compliance', value: slaValue, delta: '', dir: '', label: 'live data', color: 'var(--yellow)' },
      { title: 'Churn Signals',  value: String(churnCount), delta: '', dir: '', label: 'detected', color: 'var(--red)' },
      { title: 'Drafts Pending', value: String(draftCount), delta: '', dir: '', label: 'awaiting review', color: 'var(--green)' },
    ],
    month: [
      { title: 'Open Tickets',   value: String(freshdeskStats.open), delta: '', dir: '', label: 'current', color: 'var(--accent)' },
      { title: 'SLA Compliance', value: slaValue, delta: '', dir: '', label: 'live data', color: 'var(--yellow)' },
      { title: 'Churn Signals',  value: String(churnCount), delta: '', dir: '', label: 'detected', color: 'var(--red)' },
      { title: 'Drafts Pending', value: String(draftCount), delta: '', dir: '', label: 'awaiting review', color: 'var(--green)' },
    ],
  };

  const attentionItems = [];
  if (pressingStats.overdue > 0) {
    attentionItems.push({ icon: '⚑', text: `${pressingStats.overdue} SLA breaches need response`, badge: 'badge-red', page: 'intel-hub' });
  }
  if (churnCount > 0) {
    attentionItems.push({ icon: '△', text: `${churnCount} churn signals detected`, badge: 'badge-red', page: 'churn-risk' });
  }
  if (draftCount > 0) {
    attentionItems.push({ icon: '⊟', text: `${draftCount} auto-response drafts awaiting review`, badge: 'badge-green', page: 'ar-drafts' });
  }

  return { dashboardKPIs: kpiBase, attentionItems };
}

/**
 * Transform conversations for a ticket into a clean format.
 */
function transformConversations(conversations) {
  return conversations.map(c => ({
    id: c.id,
    incoming: c.incoming || false,
    private: c.private || false,
    source: c.source, // 0=Reply, 2=Note, 5=Created from fwd, 7=Phone, 8=E-Commerce
    body_text: (c.body_text || '').slice(0, 500),
    from_email: c.from_email || null,
    to_emails: c.to_emails || [],
    created_at: c.created_at,
    updated_at: c.updated_at,
    user_id: c.user_id,
    attachments: (c.attachments || []).map(a => ({
      name: a.name,
      size: a.size,
      content_type: a.content_type,
      url: a.attachment_url,
    })),
  }));
}

/**
 * Transform time entries for a ticket.
 */
function transformTimeEntries(entries) {
  const total = entries.reduce((sum, e) => sum + (parseFloat(e.time_spent) || 0), 0);
  return {
    entries: entries.map(e => ({
      id: e.id,
      agent_id: e.agent_id,
      note: e.note || '',
      time_spent: e.time_spent, // Format: "HH:MM"
      billable: e.billable || false,
      created_at: e.created_at,
    })),
    total_time_spent: total,
    count: entries.length,
  };
}

/**
 * Transform satisfaction ratings for a ticket.
 */
function transformSatisfactionRatings(ratings) {
  return ratings.map(r => {
    const ratingValue = r.ratings?.default_question;
    return {
      id: r.id,
      survey_id: r.survey_id,
      rating: ratingValue,
      rating_label: CSAT_LABEL[ratingValue] || String(ratingValue || '—'),
      feedback: r.feedback || null,
      created_at: r.created_at,
      agent_id: r.agent_id,
      group_id: r.group_id,
      ticket_id: r.ticket_id,
    };
  });
}

module.exports = {
  transformTickets,
  transformCompanies,
  transformAgents,
  transformDashboardKPIs,
  transformConversations,
  transformTimeEntries,
  transformSatisfactionRatings,
};
