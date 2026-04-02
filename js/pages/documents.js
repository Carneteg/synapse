const docsFn = () => `
  ${UI.sectionHead('Documents', 'All ingested records across sources')}

  <div class="card">
    ${UI.table({
      id: 'docs-table',
      columns: [
        { key: 'id',      label: 'ID',            render: r => `<span class="mono">${r.id}</span>` },
        { key: 'source',  label: 'Source',         sortable: true, render: r => UI.badge(r.source, r.sourceBadge) },
        { key: 'title',   label: 'Subject / Title', sortable: true },
        { key: 'indexed', label: 'Indexed',        sortable: true, render: r => r.indexed ? '✓' : '✗' },
        { key: 'status',  label: 'Status',         sortable: true, render: r => r.indexed ? UI.badge('Indexed', 'badge-green') : UI.badge(r.status || 'Pending', r.status === 'Queued' ? 'badge-yellow' : 'badge-gray') },
      ],
      data: DATA.documents,
      pageSize: 10,
      filterable: true,
    })}
  </div>
`;

docsFn.afterRender = () => {
  UI.tableInit('docs-table');
};

Router.register('documents', docsFn);
