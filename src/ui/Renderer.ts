import type { GameState, Unit } from "../core/Types";
import { renderMenuScreen } from "./screens/MenuScreen";
import { renderCombatScreen } from "./screens/CombatScreen";
import { renderRewardScreen } from "./screens/RewardScreen";
import { renderEventScreen } from "./screens/EventScreen";
import { renderResultScreen } from "./screens/ResultScreen";
import { renderMapScreen } from "./screens/MapScreen";
import { renderShopScreen } from "./screens/ShopScreen";
import { renderRestScreen } from "./screens/RestScreen";
import { renderTreasureScreen } from "./screens/TreasureScreen";
import { renderStatuses } from "./components/StatusView";
import { renderEnemy } from "./components/EnemyView";
import { renderLogPanel } from "./components/CombatLog";
import { getCardData } from "../data/cards";
import { renderCardElement } from "./components/CardView";

/**
 * The Renderer owns the main DOM mount point and is responsible for both
 * full-screen renders (on screen transitions) and partial updates that
 * avoid destroying in-flight animations.
 */
export class Renderer {
  private app: HTMLElement;
  private lastScreen: GameState["screen"] | "" = "";

  constructor(app: HTMLElement) {
    this.app = app;
  }

  /**
   * Renders the current screen from scratch. Call this on screen
   * transitions and at stable checkpoints. During combat action
   * resolution, prefer `updateCombat` instead.
   */
  renderScreen(state: GameState, hasSave: boolean): void {
    switch (state.screen) {
      case "menu":
        this.app.innerHTML = renderMenuScreen(hasSave);
        break;
      case "combat":
        if (!state.run || !state.combat) {
          this.app.innerHTML = renderMenuScreen(hasSave);
        } else {
          this.app.innerHTML = renderCombatScreen(state);
        }
        break;
      case "reward":
        this.app.innerHTML = renderRewardScreen(state);
        break;
      case "event":
        this.app.innerHTML = renderEventScreen(state);
        break;
      case "win":
        this.app.innerHTML = renderResultScreen(state, true);
        break;
      case "lose":
        this.app.innerHTML = renderResultScreen(state, false);
        break;
      case "map":
        if (!state.run) {
          this.app.innerHTML = renderMenuScreen(hasSave);
        } else {
          this.app.innerHTML = renderMapScreen(state);
        }
        break;
      case "shop":
        if (!state.run || !state.shop) {
          this.app.innerHTML = renderMenuScreen(hasSave);
        } else {
          this.app.innerHTML = renderShopScreen(state);
        }
        break;
      case "rest":
        if (!state.run || !state.rest) {
          this.app.innerHTML = renderMenuScreen(hasSave);
        } else {
          this.app.innerHTML = renderRestScreen(state);
        }
        break;
      case "treasure":
        if (!state.run || !state.treasure) {
          this.app.innerHTML = renderMenuScreen(hasSave);
        } else {
          this.app.innerHTML = renderTreasureScreen(state);
        }
        break;
    }
    this.lastScreen = state.screen;
  }

  /**
   * Partial update during combat: refresh HP bars, energy, block, statuses,
   * piles, enemies, and log without replacing the whole combat DOM. This
   * keeps card-play animations alive through mid-action effect resolution.
   */
  updateCombat(state: GameState): void {
    if (state.screen !== "combat" || !state.combat || !state.run) return;
    // If the screen isn't combat right now, fall back to full render.
    if (this.lastScreen !== "combat") {
      this.renderScreen(state, false);
      return;
    }

    const combat = state.combat;
    const run = state.run;

    // Energy / HP / block pills in the topbar.
    const energyEl = this.app.querySelector("[data-energy]");
    if (energyEl) energyEl.textContent = String(combat.energy);
    const hpEl = this.app.querySelector("[data-hp]");
    if (hpEl) hpEl.textContent = `${run.hp}/${run.maxHp}`;
    const blockEl = this.app.querySelector("[data-block]");
    if (blockEl) blockEl.textContent = String(run.block || 0);

    // Player panel HP bar.
    const hpLabel = this.app.querySelector("[data-hp-label]");
    if (hpLabel) hpLabel.textContent = `${run.hp}/${run.maxHp}`;
    const hpBar = this.app.querySelector<HTMLElement>("[data-hp-bar]");
    if (hpBar) hpBar.style.width = `${percent(run.hp, run.maxHp)}%`;
    const blockLabel = this.app.querySelector("[data-block-label]");
    if (blockLabel) blockLabel.textContent = String(run.block || 0);
    const hpInline = this.app.querySelector("[data-hp-inline]");
    if (hpInline) hpInline.textContent = `${run.hp}/${run.maxHp}`;
    const hpInlineBar = this.app.querySelector<HTMLElement>("[data-hp-inline-bar]");
    if (hpInlineBar) hpInlineBar.style.width = `${percent(run.hp, run.maxHp)}%`;

    // Player statuses.
    const playerStatuses = this.app.querySelector("[data-player-statuses]");
    if (playerStatuses) playerStatuses.innerHTML = renderStatuses(run.statuses);

    // Turn banner & End Turn button.
    const banner = this.app.querySelector("[data-turn-banner]");
    if (banner) {
      banner.textContent =
        combat.phase === "player" ? `Your Turn ${combat.turn}` : "Enemy Turn";
    }
    const endTurnBtn = this.app.querySelector<HTMLButtonElement>(
      '[data-action="end-turn"]'
    );
    if (endTurnBtn) {
      const canEndTurn = combat.phase === "player" && !state.isResolving;
      endTurnBtn.disabled = !canEndTurn;
    }

    // Enemies — full rerender of enemy area only, so individual cards can
    // still get hit flashes applied after this update.
    const enemiesEl = this.app.querySelector("[data-enemies]");
    if (enemiesEl) {
      const targeting = !!state.selectedCardUid || state.selectedPotionSlot !== null;
      enemiesEl.innerHTML = combat.enemies
        .map((e) => renderEnemy(e, targeting, run))
        .join("");
    }

    // Piles.
    const pileEls = this.app.querySelectorAll(".pile-stats .pile b");
    if (pileEls.length >= 3) {
      pileEls[0].textContent = String(combat.drawPile.length);
      pileEls[1].textContent = String(combat.discardPile.length);
      pileEls[2].textContent = String(combat.exhaustPile.length);
    }

    // Hand — partial update. Only re-render the hand container since
    // card animations are independent DOM animations.
    const handEl = this.app.querySelector("[data-hand]");
    if (handEl) {
      handEl.innerHTML = combat.hand
        .map((card) => {
          const data = getCardData(card);
          const cost = card.tempCost !== null ? card.tempCost : data.cost;
          const playable =
            combat.phase === "player" &&
            !state.isResolving &&
            combat.energy >= cost;
          return renderCardElement(card, {
            zone: "hand",
            playable,
            selected: state.selectedCardUid === card.uid,
          });
        })
        .join("");
    }

    // Body resolving class.
    const mainEl = this.app.querySelector(".combat-screen");
    if (mainEl) {
      mainEl.classList.toggle("is-resolving", state.isResolving);
    }

    // Notice area.
    const notice = this.app.querySelector("[data-notice]");
    if (notice) {
      notice.textContent = state.isResolving
        ? "Resolving…"
        : state.selectedPotionSlot !== null
          ? "Target an enemy to use the selected potion."
          : state.selectedCardUid
            ? "Target an enemy to play the selected card."
            : "Hover cards and statuses for details. Enemy intents show their next action.";
    }

    // Log.
    const logWrapper = this.app.querySelector(".log")?.parentElement?.parentElement;
    // Simpler: find the log container and refresh it with latest lines.
    const logContainer = this.app.querySelector("[data-log]");
    if (logContainer) {
      // Rebuild the log from state; capped by maxLogLines in Game.log.
      const panel = renderLogPanel(state.log);
      // Extract just the log element content from the panel string.
      const m = panel.match(/<div class="log" data-log>([\s\S]*?)<\/div>/);
      if (m) logContainer.innerHTML = m[1];
    }
    void logWrapper; // unused, silence TS
  }

  /**
   * Apply a short CSS class to flash a unit after taking damage.
   */
  flashUnit(unit: Unit): void {
    const selector = unit.uid
      ? `[data-unit="${unit.uid}"]`
      : `[data-unit="player"], .player-panel`;
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.remove("hit");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("hit");
    });
  }

  animateCardPlay(cardUid: string): void {
    const el = document.querySelector(`[data-card="${cardUid}"]`);
    if (el) el.classList.add("playing");
  }

  shakeCard(cardUid: string): void {
    const el = document.querySelector(`[data-card="${cardUid}"]`);
    if (el) {
      el.classList.remove("shake");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("shake");
    }
  }
}

function percent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
