/**
 * A minimal error overlay that replaces the app when something unrecoverable
 * happens. Provides the player with options to return to the menu, clear the
 * save, or reload the page — avoiding a blank white screen of death.
 */

interface ErrorBoundaryCallbacks {
  onReturnToMenu(): void;
  onClearSave(): void;
}

export class ErrorBoundary {
  private root: HTMLElement;
  private callbacks: ErrorBoundaryCallbacks;
  private active = false;

  constructor(root: HTMLElement, callbacks: ErrorBoundaryCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
  }

  attach(): void {
    window.addEventListener("error", (e) => {
      console.error("[ErrorBoundary] error:", e.error || e.message);
      this.show(e.error?.message || e.message || "Unknown error");
    });
    window.addEventListener("unhandledrejection", (e) => {
      console.error("[ErrorBoundary] unhandled rejection:", e.reason);
      this.show(e.reason?.message || String(e.reason) || "Unknown promise rejection");
    });
  }

  show(message: string): void {
    if (this.active) return;
    this.active = true;
    this.root.innerHTML = `
      <div class="error-overlay">
        <div class="error-box">
          <div class="eyebrow">Runtime Error</div>
          <h2>Something broke.</h2>
          <p class="subtitle">The game ran into an unexpected error. Your run may be recoverable from the last stable save.</p>
          <pre class="error-message">${escapeHtml(message)}</pre>
          <div class="error-actions">
            <button class="primary" data-err-action="menu" type="button">Return to Main Menu</button>
            <button data-err-action="reload" type="button">Reload Page</button>
            <button class="danger" data-err-action="clear" type="button">Clear Save</button>
          </div>
        </div>
      </div>
    `;
    this.root.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest("[data-err-action]") as HTMLElement | null;
      if (!target) return;
      const action = target.dataset.errAction;
      if (action === "menu") {
        this.dismiss();
        this.callbacks.onReturnToMenu();
      } else if (action === "reload") {
        location.reload();
      } else if (action === "clear") {
        this.callbacks.onClearSave();
        this.dismiss();
        this.callbacks.onReturnToMenu();
      }
    });
  }

  /**
   * Manually display a non-fatal error (e.g., save load failed).
   * Caller can dismiss it.
   */
  showRecoverable(message: string): void {
    this.show(message);
  }

  dismiss(): void {
    this.active = false;
    this.root.innerHTML = "";
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
