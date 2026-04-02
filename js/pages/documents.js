Router.register('documents', () => `
  ${UI.sectionHead('Documents', 'All ingested records across sources')}

  <div class="card mb-4">
    <div style="display:flex;gap:10px">
      <input class="input" id="doc-search" placeholder="Search by content, source, or ID…" style="flex:1">
      <button class="btn btn-ghost">Filter</button>
    </div>
  </div>

  <div class="card">
    <table class="table" id="doc-table">
      <thead>
        <tr>
          <th>ID</th><th>Source</th><th>Subject / Title</th><th>Indexed</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${DATA.documents.map(d => `
          <tr>
            <td class="mono">${d.id}</td>
            <td>${UI.badge(d.source, d.sourceBadge)}</td>
            <td>${d.title}</td>
            <td>${d.indexed ? '✓' : '✗'}</td>
            <td>${d.indexed
              ? UI.badge('Indexed', 'badge-green')
              : UI.badge(d.status || 'Pending', d.status === 'Queued' ? 'badge-yellow' : 'badge-gray')
            }</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`);

document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'documents') return;

  const input = document.getElementById('doc-search');
  input?.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll('#doc-table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
});
