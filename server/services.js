/**
 * services.js — High-level data service layer
 * Cache-first pattern: check cache → fetch from Freshdesk → cache result.
 * All dashboard components consume these functions.
 */

const freshdesk = require('./freshdesk');
const cache = require('./cache');

// ── TTL (seconds) ──
const TTL = {
  short:  5 * 60,   // 5 min  — frequently changing data
  medium: 15 * 60,  // 15 min — moderate
  long:   30 * 60,  // 30 min — slow-changing data
  hour:   60 * 60,  // 1 hour — config / metadata
};

/**
 * Cache-first helper. Returns cached data if fresh, otherwise calls fetchFn,
 * caches the result, and returns it.
 */
async function cached(key, ttl, fetchFn) {
  const hit = cache.get(key);
  if (hit) return { ...hit, _cached: true };

  const data = await fetchFn();
  cache.set(key, data, ttl);
  return { ...data, _cached: false };
}

// ═════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════

/**
 * getDashboardStats()
 * Tickets by status, priority, SLA breaches, avg response time.
 */
async function getDashboardStats() {
  return cached('svc:dashboard-stats', TTL.short, async () => {
    const tickets = await freshdesk.listTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' });
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
 * getActionableInsights()
 * Open tickets >24h, SLA at-risk, churn signals by company.
 */
async function getActionableInsights() {
  return cached('svc:actionable-insights', TTL.short, async () => {
    const tickets = await freshdesk.listTickets({ include: 'stats,company', order_by: 'created_at', order_type: 'desc' });
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
 * getTicketTrends(days)
 * Ticket volume per day for the last N days.
 */
async function getTicketTrends(days = 30) {
  return cached(`svc:ticket-trends:${days}`, TTL.short, async () => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const tickets = await freshdesk.listTickets({ updated_since: since, order_by: 'created_at', order_type: 'asc' });

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
  return cached('svc:top-issues', TTL.short, async () => {
    const tickets = await freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc' });

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
  return cached('svc:agent-performance', TTL.medium, async () => {
    const [agents, tickets] = await Promise.all([
      freshdesk.listAgents(),
      freshdesk.listTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' }),
    ]);

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
  return cached('svc:group-performance', TTL.medium, async () => {
    const [groups, tickets] = await Promise.all([
      freshdesk.listGroups(),
      freshdesk.listTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' }),
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

// ═════════════════════════════════════════════════════════════════════
// QA SCORING
// ═════════════════════════════════════════════════════════════════════

/**
 * getCSATByAgent()
 * CSAT ratings grouped by agent.
 */
async function getCSATByAgent() {
  return cached('svc:csat-by-agent', TTL.medium, async () => {
    // Get recent resolved tickets with responder info
    const tickets = await freshdesk.listTickets({ include: 'stats', order_by: 'updated_at', order_type: 'desc' });
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

    // Get agent names
    const agents = await freshdesk.listAgents();
    const nameMap = {};
    for (const a of agents) {
      if (a.contact?.name) nameMap[a.id] = a.contact.name;
    }

    const result = Object.entries(agentRatings).map(([agentId, r]) => ({
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
  return cached('svc:worst-scored', TTL.medium, async () => {
    const tickets = await freshdesk.listTickets({ include: 'stats', order_by: 'updated_at', order_type: 'desc' });
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
  return cached('svc:draft-queue', TTL.short, async () => {
    const tickets = await freshdesk.listTickets({ include: 'stats', order_by: 'created_at', order_type: 'desc' });

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
  return cached('svc:company-health', TTL.medium, async () => {
    const [companies, tickets] = await Promise.all([
      freshdesk.listCompanies(),
      freshdesk.listTickets({ order_by: 'created_at', order_type: 'desc' }),
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
  return cached(`svc:contacts-by-company:${companyId}`, TTL.medium, async () => {
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
  return cached(`svc:tickets-by-contact:${contactId}`, TTL.short, async () => {
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
  return cached(`svc:ticket-detail:${id}`, 2 * 60, async () => {
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
  return cached(`svc:agent-tickets:${agentId}`, TTL.short, async () => {
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
  getDashboardStats, getActionableInsights,
  // Intelligence / Trending
  getTicketTrends, getTopIssues, getAgentPerformance, getGroupPerformance,
  // QA
  getCSATByAgent, getWorstScoredTickets,
  // Auto-Responder
  getDraftQueue,
  // Contacts & Companies
  getCompanyHealth, getContactsByCompany, getTicketsByContact,
  // Drill-down
  getTicketDetail, getAgentTickets,
};
