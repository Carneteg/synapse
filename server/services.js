/**
 * services.js — High-level data service layer
 * Cache-first pattern: check cache → fetch from Freshdesk → cache result.
 * All dashboard components consume these functions.
 */

const freshdesk = require('./freshdesk');
const cache = require('./cache');

// ── GROUP FILTER ──
// When set, all ticket/agent queries are scoped to this group.
let _activeGroupId = null;

function setGroupFilter(groupId) { _activeGroupId = groupId; }
function getGroupFilter() { return _activeGroupId; }

// ── DATE RANGE FILTER ──
let _dateFrom = null;
let _dateTo = null;

function setDateRange(from, to) { _dateFrom = from || null; _dateTo = to || null; }
function getDateRange() { return { from: _dateFrom, to: _dateTo }; }

/** Fetch tickets with automatic group + date range filters applied. */
async function fetchTickets(opts = {}) {
  // Apply module-level date range if no explicit updated_since is set
  if (_dateFrom && !opts.updated_since) {
    opts.updated_since = _dateFrom;
  }

  let tickets = await freshdesk.listTickets(opts);

  // Client-side group filter
  const gid = getGroupFilter();
  if (gid) {
    tickets = tickets.filter(t => t.group_id === gid);
  }

  // Client-side "to" date filter (Freshdesk API only supports updated_since, not until)
  if (_dateTo) {
    const toMs = new Date(_dateTo).getTime();
    tickets = tickets.filter(t => new Date(t.created_at).getTime() <= toMs);
  }

  return tickets;
}

/** Filter an agents array to only those belonging to the active group. */
function filterAgentsByGroup(agents) {
  const gid = getGroupFilter();
  if (!gid) return agents;
  return agents.filter(a => (a.group_ids || []).includes(gid));
}

/** Cache key suffix for group + date-range scoped caching. */
function gk(base) {
  let key = base;
  const gid = getGroupFilter();
  if (gid) key += `:g${gid}`;
  if (_dateFrom) key += `:f${_dateFrom.slice(0,10)}`;
  if (_dateTo) key += `:t${_dateTo.slice(0,10)}`;
  return key;
}

// ── TTL (seconds) ──
const TTL = {
  short:  5 * 60,   // 5 min  — frequently changing data
  medium: 15 * 60,  // 15 min — moderate
  long:   30 * 60,  // 30 min — slow-changing data
  hour:   60 * 60,  // 1 hour — config / metadata
};

/**
 * Cache-first helper. Tags every response with source metadata.
 * Returns data + _source + _fetched_at + _cached.
 */
async function cached(key, ttl, fetchFn) {
  const hit = cache.getWithMeta(key);
  if (hit) {
    return {
      ...hit.data,
      _source: 'cache',
      _fetched_at: hit.meta.fetchedAt,
      _cached_at: new Date(hit.meta.cachedAt).toISOString(),
      _age_ms: hit.meta.ageMs,
      _cached: true,
    };
  }

  const fetchedAt = new Date().toISOString();
  const data = await fetchFn();
  cache.set(key, data, ttl, fetchedAt);
  return {
    ...data,
    _source: 'freshdesk_api',
    _fetched_at: fetchedAt,
    _cached: false,
  };
}

// ═════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════

/**
 * getDashboardStats()
 * Tickets by status, priority, SLA breaches, avg response time.
 */
async function getDashboardStats() {
  return cached(gk('svc:dashboard-stats'), TTL.short, async () => {
    const tickets = await fetchTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' });
    const now = Date.now();

    const byStatus = { open: 0, pending: 0, resolved: 0, closed: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    let slaBreaches = 0;
    let totalFirstResponse = 0;
    let firstResponseCount = 0;

    for (const t of tickets) {
      // Status
      if (t.status === 2) byStatus.open++;
      else if (t.status === 3) byStatus.pending++;
      else if (t.status === 4) byStatus.resolved++;
      else if (t.status === 5) byStatus.closed++;

      // Priority
      if (t.priority === 1) byPriority.low++;
      else if (t.priority === 2) byPriority.medium++;
      else if (t.priority === 3) byPriority.high++;
      else if (t.priority === 4) byPriority.urgent++;

      // SLA breaches: open/pending with due_by in the past
      if ((t.status === 2 || t.status === 3) && t.due_by && new Date(t.due_by).getTime() < now) {
        slaBreaches++;
      }

      // Avg first response (from stats)
      if (t.stats && t.stats.first_responded_at) {
        const fr = (new Date(t.stats.first_responded_at) - new Date(t.created_at)) / 3600000;
        totalFirstResponse += fr;
        firstResponseCount++;
      }
    }

    const avgFirstResponseHours = firstResponseCount > 0
      ? Math.round(totalFirstResponse / firstResponseCount * 10) / 10
      : null;

    return {
      totalTickets: tickets.length,
      byStatus,
      byPriority,
      slaBreaches,
      avgFirstResponseHours,
    };
  });
}

/**
 * getDashboardComparison()
 * This week vs last week ticket stats for time comparison.
 */
async function getDashboardComparison() {
  return cached(gk('svc:dashboard-comparison'), TTL.short, async () => {
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const tickets = await fetchTickets({
      updated_since: startOfLastWeek.toISOString(),
      include: 'stats',
      order_by: 'created_at',
      order_type: 'asc',
    });

    const thisWeek = { created: 0, resolved: 0, slaBreaches: 0, firstResponseTotal: 0, frCount: 0 };
    const lastWeek = { created: 0, resolved: 0, slaBreaches: 0, firstResponseTotal: 0, frCount: 0 };

    for (const t of tickets) {
      const created = new Date(t.created_at);
      const bucket = created >= startOfWeek ? thisWeek : lastWeek;

      bucket.created++;
      if (t.status === 4 || t.status === 5) bucket.resolved++;
      if ((t.status === 2 || t.status === 3) && t.due_by && new Date(t.due_by) < now) bucket.slaBreaches++;
      if (t.stats?.first_responded_at) {
        bucket.firstResponseTotal += (new Date(t.stats.first_responded_at) - created) / 3600000;
        bucket.frCount++;
      }
    }

    const avgFR = (b) => b.frCount > 0 ? Math.round(b.firstResponseTotal / b.frCount * 10) / 10 : null;

    const pctChange = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;

    return {
      thisWeek: { ...thisWeek, avgFirstResponseHours: avgFR(thisWeek) },
      lastWeek: { ...lastWeek, avgFirstResponseHours: avgFR(lastWeek) },
      changes: {
        created: pctChange(thisWeek.created, lastWeek.created),
        resolved: pctChange(thisWeek.resolved, lastWeek.resolved),
        slaBreaches: pctChange(thisWeek.slaBreaches, lastWeek.slaBreaches),
      },
    };
  });
}

/**
 * getActionableInsights()
 * Open tickets >24h, SLA at-risk, churn signals by company.
 */
async function getActionableInsights() {
  return cached(gk('svc:actionable-insights'), TTL.short, async () => {
    const tickets = await fetchTickets({ include: 'stats,company', order_by: 'created_at', order_type: 'desc' });
    const now = Date.now();
    const h24 = 24 * 3600000;

    // Open tickets older than 24h
    const staleOpen = tickets
      .filter(t => (t.status === 2 || t.status === 3) && (now - new Date(t.created_at).getTime()) > h24)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 20)
      .map(t => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority,
        age_hours: Math.round((now - new Date(t.created_at).getTime()) / 3600000),
        company_id: t.company_id,
      }));

    // SLA at-risk: due within next 4 hours
    const slaAtRisk = tickets
      .filter(t => {
        if (t.status !== 2 && t.status !== 3) return false;
        if (!t.due_by) return false;
        const due = new Date(t.due_by).getTime();
        return due > now && (due - now) < 4 * 3600000;
      })
      .map(t => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority,
        due_by: t.due_by,
        minutes_remaining: Math.round((new Date(t.due_by).getTime() - now) / 60000),
        company_id: t.company_id,
      }));

    // Churn signals: companies with many recent high-priority tickets
    const companyTickets = {};
    for (const t of tickets) {
      if (!t.company_id) continue;
      if (!companyTickets[t.company_id]) companyTickets[t.company_id] = { total: 0, highPri: 0, tags: [] };
      companyTickets[t.company_id].total++;
      if (t.priority >= 3) companyTickets[t.company_id].highPri++;
      for (const tag of (t.tags || [])) {
        if (tag.includes('churn') || tag.includes('cancel') || tag.includes('competitor')) {
          companyTickets[t.company_id].tags.push(tag);
        }
      }
    }

    const churnSignals = Object.entries(companyTickets)
      .filter(([, v]) => v.highPri >= 3 || v.tags.length > 0)
      .map(([companyId, v]) => ({
        company_id: parseInt(companyId),
        total_tickets: v.total,
        high_priority: v.highPri,
        churn_tags: [...new Set(v.tags)],
      }))
      .sort((a, b) => b.high_priority - a.high_priority);

    return {
      staleOpen,
      slaAtRisk,
      churnSignals,
      summary: {
        stale_count: staleOpen.length,
        sla_at_risk_count: slaAtRisk.length,
        churn_signal_count: churnSignals.length,
      },
    };
  });
}

// ═════════════════════════════════════════════════════════════════════
// INTELLIGENCE / TRENDING
// ═════════════════════════════════════════════════════════════════════

/**
 * getTodaysIssues()
 * Today's tickets aggregated by tag, type, and group.
 */
async function getTodaysIssues() {
  return cached(gk('svc:todays-issues'), TTL.short, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tickets = await fetchTickets({
      updated_since: today.toISOString(),
      include: 'stats',
      order_by: 'created_at',
      order_type: 'desc',
    });

    const byTag = {};
    const byType = {};
    const byGroup = {};
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };

    for (const t of tickets) {
      for (const tag of (t.tags || [])) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
      const type = t.type || 'Unclassified';
      byType[type] = (byType[type] || 0) + 1;
      const gid = t.group_id || 'Unassigned';
      byGroup[gid] = (byGroup[gid] || 0) + 1;
      if (t.priority === 4) byPriority.urgent++;
      else if (t.priority === 3) byPriority.high++;
      else if (t.priority === 2) byPriority.medium++;
      else byPriority.low++;
    }

    // Resolve group names
    let groupNames = {};
    try {
      const groups = await freshdesk.listGroups();
      for (const g of groups) groupNames[g.id] = g.name;
    } catch { /* skip */ }

    const topTags = Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
    const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([type, count]) => ({ type, count }));
    const topGroups = Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([gid, count]) => ({
      group_id: gid,
      group_name: groupNames[gid] || (gid === 'Unassigned' ? 'Unassigned' : `Group #${gid}`),
      count,
    }));

    return {
      total: tickets.length,
      byPriority,
      topTags,
      topTypes,
      topGroups,
    };
  });
}

/**
 * getTicketTrends(days)
 * Ticket volume per day for the last N days.
 */
async function getTicketTrends(days = 30) {
  return cached(gk(`svc:ticket-trends:${days}`), TTL.short, async () => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const tickets = await fetchTickets({ updated_since: since, order_by: 'created_at', order_type: 'asc' });

    // Bucket by date
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
      buckets[d] = 0;
    }
    for (const t of tickets) {
      const d = t.created_at?.slice(0, 10);
      if (d && buckets.hasOwnProperty(d)) buckets[d]++;
    }

    const dates = Object.keys(buckets);
    const counts = Object.values(buckets);
    return { dates, counts, total: tickets.length, days };
  });
}

/**
 * getTopIssues()
 * Most frequent tags and ticket types.
 */
async function getTopIssues() {
  return cached(gk('svc:top-issues'), TTL.short, async () => {
    const tickets = await fetchTickets({ order_by: 'created_at', order_type: 'desc' });

    const tagCounts = {};
    const typeCounts = {};
    for (const t of tickets) {
      for (const tag of (t.tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
      const type = t.type || 'Unclassified';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    return { topTags, topTypes, totalTickets: tickets.length };
  });
}

/**
 * getAgentPerformance()
 * Resolved count and avg first response time per agent.
 */
async function getAgentPerformance() {
  return cached(gk('svc:agent-performance'), TTL.medium, async () => {
    const [allAgents, tickets] = await Promise.all([
      freshdesk.listAgents(),
      fetchTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' }),
    ]);
    const agents = filterAgentsByGroup(allAgents);

    const agentMap = {};
    for (const a of agents) {
      if (!a.active || !a.contact?.name) continue;
      agentMap[a.id] = { id: a.id, name: a.contact.name, email: a.contact.email, resolved: 0, frTotal: 0, frCount: 0, assigned: 0 };
    }

    for (const t of tickets) {
      const aid = t.responder_id;
      if (!aid || !agentMap[aid]) continue;
      agentMap[aid].assigned++;
      if (t.status === 4 || t.status === 5) agentMap[aid].resolved++;
      if (t.stats?.first_responded_at) {
        const hours = (new Date(t.stats.first_responded_at) - new Date(t.created_at)) / 3600000;
        agentMap[aid].frTotal += hours;
        agentMap[aid].frCount++;
      }
    }

    const performance = Object.values(agentMap).map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      assigned: a.assigned,
      resolved: a.resolved,
      avgFirstResponseHours: a.frCount > 0 ? Math.round(a.frTotal / a.frCount * 10) / 10 : null,
    })).sort((a, b) => b.resolved - a.resolved);

    return { agents: performance };
  });
}

/**
 * getGroupPerformance()
 * Same metrics per group.
 */
async function getGroupPerformance() {
  return cached(gk('svc:group-performance'), TTL.medium, async () => {
    const [groups, tickets] = await Promise.all([
      freshdesk.listGroups(),
      fetchTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' }),
    ]);

    const groupMap = {};
    for (const g of groups) {
      groupMap[g.id] = { id: g.id, name: g.name, resolved: 0, frTotal: 0, frCount: 0, assigned: 0 };
    }

    for (const t of tickets) {
      const gid = t.group_id;
      if (!gid || !groupMap[gid]) continue;
      groupMap[gid].assigned++;
      if (t.status === 4 || t.status === 5) groupMap[gid].resolved++;
      if (t.stats?.first_responded_at) {
        const hours = (new Date(t.stats.first_responded_at) - new Date(t.created_at)) / 3600000;
        groupMap[gid].frTotal += hours;
        groupMap[gid].frCount++;
      }
    }

    const performance = Object.values(groupMap).map(g => ({
      id: g.id,
      name: g.name,
      assigned: g.assigned,
      resolved: g.resolved,
      avgFirstResponseHours: g.frCount > 0 ? Math.round(g.frTotal / g.frCount * 10) / 10 : null,
    })).sort((a, b) => b.resolved - a.resolved);

    return { groups: performance };
  });
}

/**
 * getAgentList()
 * Full agent list with group names and availability status.
 */
async function getAgentList() {
  return cached(gk('svc:agent-list'), TTL.long, async () => {
    const [allAgents, groups] = await Promise.all([
      freshdesk.listAgents(),
      freshdesk.listGroups(),
    ]);
    const agents = filterAgentsByGroup(allAgents);

    const groupNames = {};
    for (const g of groups) groupNames[g.id] = g.name;

    const result = agents
      .filter(a => a.contact?.name)
      .map(a => ({
        id: a.id,
        name: a.contact.name,
        email: a.contact.email,
        available: a.available || false,
        occasional: a.occasional || false,
        active: a.active !== false,
        scope: a.ticket_scope,
        scope_label: { 1: 'Global', 2: 'Group', 3: 'Restricted' }[a.ticket_scope] || 'Unknown',
        groups: (a.group_ids || []).map(gid => ({ id: gid, name: groupNames[gid] || `Group #${gid}` })),
        role_ids: a.role_ids || [],
      }));

    return { agents: result, count: result.length };
  });
}

// ═════════════════════════════════════════════════════════════════════
// QA SCORING
// ═════════════════════════════════════════════════════════════════════

/**
 * getCSATByAgent()
 * CSAT ratings grouped by agent.
 */
async function getCSATByAgent() {
  return cached(gk('svc:csat-by-agent'), TTL.medium, async () => {
    // Get recent resolved tickets with responder info
    const tickets = await fetchTickets({ include: 'stats', order_by: 'updated_at', order_type: 'desc' });
    const resolved = tickets.filter(t => (t.status === 4 || t.status === 5) && t.responder_id);

    // Fetch CSAT for a sample of resolved tickets (limit API calls)
    const sample = resolved.slice(0, 50);
    const agentRatings = {};

    for (const t of sample) {
      try {
        const ratings = await freshdesk.getSatisfactionRatings(t.id);
        const list = Array.isArray(ratings) ? ratings : [ratings].filter(Boolean);
        for (const r of list) {
          const aid = t.responder_id;
          if (!agentRatings[aid]) agentRatings[aid] = { happy: 0, neutral: 0, unhappy: 0, total: 0 };
          const val = r.ratings?.default_question;
          if (val === 3 || val === 'happy') agentRatings[aid].happy++;
          else if (val === 2 || val === 'neutral') agentRatings[aid].neutral++;
          else if (val === 1 || val === 'unhappy') agentRatings[aid].unhappy++;
          agentRatings[aid].total++;
        }
      } catch {
        // 404 or error — skip
      }
    }

    // Get agent names (filtered by group)
    const allAgents = await freshdesk.listAgents();
    const agents = filterAgentsByGroup(allAgents);
    const nameMap = {};
    const agentIds = new Set();
    for (const a of agents) {
      if (a.contact?.name) { nameMap[a.id] = a.contact.name; agentIds.add(a.id); }
    }

    const result = Object.entries(agentRatings)
      .filter(([agentId]) => agentIds.size === 0 || agentIds.has(parseInt(agentId)))
      .map(([agentId, r]) => ({
        agent_id: parseInt(agentId),
        agent_name: nameMap[agentId] || `Agent #${agentId}`,
        ...r,
        satisfaction_pct: r.total > 0 ? Math.round((r.happy / r.total) * 100) : null,
      })).sort((a, b) => (b.satisfaction_pct || 0) - (a.satisfaction_pct || 0));

    return { agents: result, sample_size: sample.length };
  });
}

/**
 * getWorstScoredTickets()
 * Low CSAT tickets + their conversations.
 */
async function getWorstScoredTickets() {
  return cached(gk('svc:worst-scored'), TTL.medium, async () => {
    const tickets = await fetchTickets({ include: 'stats', order_by: 'updated_at', order_type: 'desc' });
    const resolved = tickets.filter(t => (t.status === 4 || t.status === 5)).slice(0, 30);

    const worst = [];
    for (const t of resolved) {
      try {
        const ratings = await freshdesk.getSatisfactionRatings(t.id);
        const list = Array.isArray(ratings) ? ratings : [ratings].filter(Boolean);
        for (const r of list) {
          const val = r.ratings?.default_question;
          if (val === 1 || val === 'unhappy') {
            // Fetch conversations for context
            let conversations = [];
            try {
              conversations = await freshdesk.getConversations(t.id);
              conversations = conversations.slice(0, 5).map(c => ({
                body_text: (c.body_text || '').slice(0, 300),
                incoming: c.incoming,
                created_at: c.created_at,
              }));
            } catch { /* skip */ }

            worst.push({
              ticket_id: t.id,
              subject: t.subject,
              rating: val,
              feedback: r.feedback || null,
              responder_id: t.responder_id,
              company_id: t.company_id,
              created_at: t.created_at,
              conversations,
            });
          }
        }
      } catch { /* skip */ }
    }

    return { tickets: worst.slice(0, 10), total_scanned: resolved.length };
  });
}

// ═════════════════════════════════════════════════════════════════════
// AUTO-RESPONDER
// ═════════════════════════════════════════════════════════════════════

/**
 * getDraftQueue()
 * Open tickets with no first reply yet — candidates for auto-response.
 */
async function getDraftQueue() {
  return cached(gk('svc:draft-queue'), TTL.short, async () => {
    const tickets = await fetchTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' });

    const noReply = tickets
      .filter(t => t.status === 2 && (!t.stats || !t.stats.first_responded_at))
      .map(t => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority,
        source: t.source,
        created_at: t.created_at,
        age_hours: Math.round((Date.now() - new Date(t.created_at).getTime()) / 3600000),
        company_id: t.company_id,
        requester_id: t.requester_id,
        tags: t.tags || [],
      }))
      .sort((a, b) => b.age_hours - a.age_hours);

    return { tickets: noReply, count: noReply.length };
  });
}

// ═════════════════════════════════════════════════════════════════════
// CONTACTS & COMPANIES
// ═════════════════════════════════════════════════════════════════════

/**
 * getCompanyHealth()
 * Companies with health_score + open ticket count.
 */
async function getCompanyHealth() {
  return cached(gk('svc:company-health'), TTL.medium, async () => {
    const [companies, tickets] = await Promise.all([
      freshdesk.listCompanies(),
      fetchTickets({ order_by: 'created_at', order_type: 'desc' }),
    ]);

    const openByCompany = {};
    for (const t of tickets) {
      if ((t.status === 2 || t.status === 3) && t.company_id) {
        openByCompany[t.company_id] = (openByCompany[t.company_id] || 0) + 1;
      }
    }

    const result = companies
      .filter(c => c.name)
      .map(c => ({
        id: c.id,
        name: c.name,
        health_score: c.health_score || null,
        account_tier: c.account_tier || null,
        renewal_date: c.renewal_date || null,
        industry: c.industry || null,
        domains: c.domains || [],
        open_tickets: openByCompany[c.id] || 0,
        custom_fields: c.custom_fields || {},
      }))
      .sort((a, b) => b.open_tickets - a.open_tickets);

    return { companies: result };
  });
}

/**
 * getContactsByCompany(companyId)
 * All contacts for a given company.
 */
async function getContactsByCompany(companyId) {
  return cached(gk(`svc:contacts-by-company:${companyId}`), TTL.medium, async () => {
    const contacts = await freshdesk.paginate(`/companies/${companyId}/contacts`);
    return {
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        active: c.active,
        created_at: c.created_at,
      })),
      count: contacts.length,
    };
  });
}

/**
 * getTicketsByContact(contactId)
 * All tickets for a given contact (requester).
 */
async function getTicketsByContact(contactId) {
  return cached(gk(`svc:tickets-by-contact:${contactId}`), TTL.short, async () => {
    const data = await freshdesk.searchTickets(`requester_id:${contactId}`);
    return {
      tickets: (data.results || []).map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total: data.total || 0,
    };
  });
}

// ═════════════════════════════════════════════════════════════════════
// DRILL-DOWN
// ═════════════════════════════════════════════════════════════════════

/**
 * getTicketDetail(id)
 * Single ticket + requester + stats + conversations.
 */
async function getTicketDetail(id) {
  return cached(gk(`svc:ticket-detail:${id}`), 2 * 60, async () => {
    const [ticket, conversations] = await Promise.all([
      freshdesk.getTicket(id, 'requester,stats,company'),
      freshdesk.getConversations(id),
    ]);

    // Try CSAT
    let satisfaction = null;
    try {
      const ratings = await freshdesk.getSatisfactionRatings(id);
      satisfaction = Array.isArray(ratings) ? ratings : [ratings].filter(Boolean);
    } catch { /* no CSAT */ }

    // Try time entries
    let timeEntries = [];
    try {
      const entries = await freshdesk.getTimeEntries(id);
      timeEntries = Array.isArray(entries) ? entries : [];
    } catch { /* no time entries */ }

    return {
      ticket,
      conversations: conversations.map(c => ({
        id: c.id,
        body_text: (c.body_text || '').slice(0, 1000),
        incoming: c.incoming,
        private: c.private,
        from_email: c.from_email,
        created_at: c.created_at,
        attachments: (c.attachments || []).length,
      })),
      satisfaction,
      timeEntries,
      conversation_count: conversations.length,
    };
  });
}

/**
 * getAgentTickets(agentId)
 * All tickets assigned to an agent.
 */
async function getAgentTickets(agentId) {
  return cached(gk(`svc:agent-tickets:${agentId}`), TTL.short, async () => {
    const data = await freshdesk.searchTickets(`responder_id:${agentId}`);
    const tickets = (data.results || []).map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      created_at: t.created_at,
      updated_at: t.updated_at,
      due_by: t.due_by,
      company_id: t.company_id,
    }));

    const open = tickets.filter(t => t.status === 2 || t.status === 3).length;
    const resolved = tickets.filter(t => t.status === 4 || t.status === 5).length;

    return { tickets, total: data.total || 0, open, resolved };
  });
}

module.exports = {
  // Dashboard
  getDashboardStats, getDashboardComparison, getActionableInsights,
  // Intelligence / Trending
  getTodaysIssues, getTicketTrends, getTopIssues, getAgentPerformance, getGroupPerformance, getAgentList,
  // QA
  getCSATByAgent, getWorstScoredTickets,
  // Auto-Responder
  getDraftQueue,
  // Contacts & Companies
  getCompanyHealth, getContactsByCompany, getTicketsByContact,
  // Drill-down
  getTicketDetail, getAgentTickets,
  // Filters
  setGroupFilter, getGroupFilter,
  setDateRange, getDateRange,
};
