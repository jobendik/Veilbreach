export function renderLogPanel(logLines: readonly string[]): string {
  const body =
    logLines.length === 0
      ? `<div>The breach is quiet.</div>`
      : logLines.map((m) => `<div>${escapeHtml(m)}</div>`).join("");
  return `
    <aside class="panel">
      <div class="panel-header">
        <h3>Combat Log</h3>
        <span class="pill">Recent</span>
      </div>
      <div class="panel-body">
        <div class="log" data-log>${body}</div>
      </div>
    </aside>
  `;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
