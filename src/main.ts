/**
 * Veilbreach: Relic Deck — boot entry.
 *
 * Wires together Game, UI, and InputController and kicks off the first
 * render. The three top-level DOM mount points (#app, #toastZone, #modalRoot,
 * #errorRoot) come from index.html.
 */

import "./styles/main.css";
import { Game } from "./core/Game";
import { UI } from "./ui/UI";
import { InputController } from "./ui/InputController";

function boot(): void {
  const app = document.getElementById("app");
  const toastZone = document.getElementById("toastZone");
  const modalRoot = document.getElementById("modalRoot");
  const errorRoot = document.getElementById("errorRoot");

  if (!app || !toastZone || !modalRoot || !errorRoot) {
    document.body.innerHTML =
      "<p style='color:#eef; font-family:system-ui; padding:30px'>" +
      "Boot error: missing DOM anchors. Check index.html for #app, #toastZone, #modalRoot, and #errorRoot." +
      "</p>";
    return;
  }

  const game = new Game();
  const ui = new UI({ game, appRoot: app, toastZone, modalRoot, errorRoot });

  // Wire Game -> UI (so engine/reward/event can call host methods).
  game.attachHost(ui);

  // Global error boundary replaces the app with an overlay on crash.
  ui.attachErrorBoundary();

  // One delegated input controller covers menu, combat, reward, event
  // screens, as well as keyboard shortcuts.
  const input = new InputController(app, game, ui);
  input.attach();

  // Best-effort save on tab close — but only if the state is at a stable
  // checkpoint. canSave returns false mid-resolution so we won't persist a
  // broken mid-action state.
  window.addEventListener("beforeunload", () => {
    game.saveIfStable();
  });

  // Initial render.
  ui.render();
}

// Wait for DOMContentLoaded if the script happens to run before body parses.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
