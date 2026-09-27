(() => {
  function labelTable(table) {
    const headerRow = table.tHead && table.tHead.rows[0];
    if (!headerRow) return;
    const labels = Array.from(headerRow.cells).map(th => (th.innerText || th.textContent || '').replace(/[↑↓]/g,'').trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      Array.from(row.cells).forEach((cell, i) => {
        if (labels[i]) cell.dataset.label = labels[i];
      });
    });
  }
  function refresh() { document.querySelectorAll('.table-scroll table').forEach(labelTable); }
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    const observer = new MutationObserver(refresh);
    document.querySelectorAll('.table-scroll tbody').forEach(tbody => observer.observe(tbody,{childList:true,subtree:true}));
  });
})();
