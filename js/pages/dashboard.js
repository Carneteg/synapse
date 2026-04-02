Router.register('dashboard', () => `
  ${UI.sectionHead('Dashboard', 'Data pipeline health & ingestion status')}

  <div class="grid-4 mb-6">
    ${DATA.sources.map(s => UI.statCard(
      s.label, s.docs.toLocaleString(), 'Documents indexed',
      `↑ ${s.newSince} since last sync`, 'up', s.color
    )).join('')}
  </div>

  <div class="grid-2-1 mb-4">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Ingestion Timeline</span>
        ${UI.badge('● Live', 'badge-green')}
      </div>
      ${UI.barChart('ingest-chart', DATA.ingestChart, DATA.ingestLabels)}
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Processing Status</span></div>
      ${DATA.pipeline.map(p => UI.progressRow(p.label, p.pct, p.color)).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header"><span class="card-title">Recent Activity</span></div>
    <div class="timeline">
      ${DATA.activity.map(a => UI.timelineItem(a.title, a.time, a.active)).join('')}
    </div>
  </div>
`);
