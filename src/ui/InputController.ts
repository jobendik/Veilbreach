import type { Game } from "../core/Game";
import type { UI } from "./UI";
import { audio } from "../audio/AudioSystem";

/**
 * A single delegated click/keyboard handler on the app root. Instead of
 * rebinding handlers after every render, we attach once and dispatch based
 * on data-attributes on the clicked element.
 *
 * This eliminates listener churn and means full re-renders don't leak
 * stale handlers.
 */
export class InputController {
  private app: HTMLElement;
  private game: Game;
  private ui: UI;

  constructor(app: HTMLElement, game: Game, ui: UI) {
    this.app = app;
    this.game = game;
    this.ui = ui;
  }

  attach(): void {
    this.app.addEventListener("click", this.onClick);
    this.app.addEventListener("keydown", this.onAppKeyDown);
    document.addEventListener("keydown", this.onGlobalKeyDown);
  }

  private onClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Warm up audio context on first user gesture.
    audio.ensure();

    // Action buttons (menu, combat, reward, event actions).
    const actionEl = target.closest<HTMLElement>("[data-action]");
    if (actionEl) {
      this.handleAction(actionEl);
      return;
    }

    // Reward card pick.
    const rewardCardEl = target.closest<HTMLElement>("[data-reward-card]");
    if (rewardCardEl && rewardCardEl.dataset.rewardCard) {
      this.game.reward.chooseCard(rewardCardEl.dataset.rewardCard);
      return;
    }

    // Hand card click during combat.
    const handEl = target.closest<HTMLElement>(".hand .card");
    if (handEl && handEl.dataset.card) {
      void this.game.engine.selectOrPlayCard(handEl.dataset.card);
      return;
    }

    // Enemy click during combat (to play targeted card).
    const enemyEl = target.closest<HTMLElement>(".enemy");
    if (enemyEl && enemyEl.dataset.enemy) {
      if (this.game.state.selectedCardUid) {
        void this.game.engine.playSelectedCardOnEnemy(enemyEl.dataset.enemy);
      }
      return;
    }
  };

  private handleAction(el: HTMLElement): void {
    const action = el.dataset.action;
    if (!action) return;

    // Hard gate: block almost all actions during resolving state. A couple
    // of safety actions (menu, reload, clear) are handled by the error
    // overlay which has its own handlers anyway.
    if (
      this.game.state.isResolving &&
      !isSafeDuringResolving(action)
    ) {
      return;
    }

    switch (action) {
      case "new-run":
        if (this.game.hasSave() && this.game.state.screen === "menu") {
          if (!confirm("Start a new run and overwrite the saved run?")) return;
        }
        audio.play("click");
        this.ui.newRun();
        break;

      case "continue":
        audio.play("click");
        this.ui.continueRun();
        break;

      case "clear-save":
        if (confirm("Delete the saved run? This cannot be undone.")) {
          audio.play("click");
          this.game.clearSave();
          this.ui.render();
        }
        break;

      case "menu":
        audio.play("click");
        this.game.state.screen = "menu";
        this.ui.render();
        break;

      case "save-now":
        audio.play("click");
        if (this.game.saveIfStable()) {
          this.ui.toastMessage("Run saved.");
        } else {
          this.ui.toastMessage("Can't save right now — try on your turn.");
        }
        break;

      case "view-deck":
        audio.play("click");
        this.ui.openDeckModal("Current Deck", "view");
        break;

      case "abandon":
        if (confirm("Abandon this run and return to the main menu?")) {
          this.game.abandonRun();
          this.ui.render();
        }
        break;

      case "end-turn":
        void this.game.engine.endTurn();
        break;

      case "skip-card":
        this.game.reward.skipCard();
        break;

      case "choose-relic": {
        const relicId = el.dataset.relic;
        if (relicId) this.game.reward.chooseRelic(relicId);
        break;
      }

      case "reward-heal":
        this.game.reward.heal();
        break;

      case "reward-upgrade":
        this.ui.openDeckModal("Choose a card to upgrade", "upgrade-reward");
        break;

      case "reward-remove":
        this.ui.openDeckModal("Choose a card to remove", "remove-reward");
        break;

      case "continue-reward":
        this.game.reward.continueReward();
        break;

      case "event-rest":
        this.game.event.rest();
        break;

      case "event-upgrade":
        this.ui.openDeckModal("Choose a card to permanently upgrade", "upgrade-event");
        break;

      case "event-remove":
        this.ui.openDeckModal("Choose a card to remove from your deck", "remove-event");
        break;
    }
  }

  /** Handle Enter/Space on focused card/enemy elements for accessibility. */
  private onAppKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target as HTMLElement;
    if (!target) return;
    const handEl = target.closest<HTMLElement>(".hand .card");
    if (handEl && handEl.dataset.card) {
      event.preventDefault();
      void this.game.engine.selectOrPlayCard(handEl.dataset.card);
      return;
    }
    const enemyEl = target.closest<HTMLElement>(".enemy");
    if (enemyEl && enemyEl.dataset.enemy && this.game.state.selectedCardUid) {
      event.preventDefault();
      void this.game.engine.playSelectedCardOnEnemy(enemyEl.dataset.enemy);
    }
  };

  /** Escape cancels selection / closes modal. E ends the turn. */
  private onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (this.ui.isModalOpen()) {
        this.ui.closeModal();
        return;
      }
      if (this.game.state.selectedCardUid) {
        this.game.state.selectedCardUid = null;
        this.ui.render();
      }
      return;
    }
    if (event.key.toLowerCase() === "e" && !event.repeat) {
      if (this.game.state.screen === "combat" && !this.game.state.isResolving) {
        void this.game.engine.endTurn();
      }
    }
  };
}

function isSafeDuringResolving(action: string): boolean {
  // Navigation away and save prompts are fine during async; interactive
  // gameplay actions are not. We're conservative here.
  return action === "view-deck" || action === "abandon" || action === "menu";
}
