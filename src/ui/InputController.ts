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

    // Enemy click during combat (to play targeted card OR use an armed potion).
    const enemyEl = target.closest<HTMLElement>(".enemy");
    if (enemyEl && enemyEl.dataset.enemy) {
      const armedPotion = this.game.state.selectedPotionSlot;
      if (armedPotion !== null) {
        const slot = armedPotion;
        this.game.state.selectedPotionSlot = null;
        void this.game.potion.use(slot, enemyEl.dataset.enemy);
        return;
      }
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

      case "open-veil":
        audio.play("relic");
        triggerVeilFlash();
        this.game.engine.openVeil();
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
        // Healing moved to rest sites; action kept as a no-op for stale UIs.
        break;

      case "reward-upgrade":
        // Upgrades are no longer offered as post-combat rewards.
        break;

      case "reward-remove":
        // Card removal moved to shops.
        break;

      case "reward-claim-gold":
        this.game.reward.claimGold();
        break;

      case "reward-claim-potion":
        this.game.reward.claimPotion();
        break;

      case "continue-reward":
        this.game.reward.continueReward();
        break;

      case "event-choice": {
        const choiceId = el.dataset.choice;
        if (choiceId) this.game.event.choose(choiceId);
        break;
      }

      case "event-leave":
        this.game.event.leave();
        break;

      case "visit-node": {
        const nodeId = el.dataset.node;
        if (nodeId) this.game.visitNode(nodeId);
        break;
      }

      case "shop-buy-card": {
        const id = el.dataset.id;
        if (id) this.game.shop.buyCard(id);
        break;
      }

      case "shop-buy-relic": {
        const id = el.dataset.id;
        if (id) this.game.shop.buyRelic(id);
        break;
      }

      case "shop-buy-potion": {
        const id = el.dataset.id;
        if (id) this.game.shop.buyPotion(id);
        break;
      }

      case "shop-remove":
        this.ui.openDeckModal("Choose a card to remove", "remove-shop");
        break;

      case "shop-leave":
        this.game.shop.close();
        break;

      case "rest-heal":
        this.game.rest.heal();
        break;

      case "rest-upgrade":
        this.ui.openDeckModal("Choose a card to upgrade", "upgrade-rest");
        break;

      case "rest-leave":
        this.game.rest.leave();
        break;

      case "treasure-take":
        this.game.treasure.take();
        break;

      case "treasure-leave":
        this.game.treasure.leave();
        break;

      case "use-potion": {
        const slot = Number(el.dataset.slot);
        const enemyUid = el.dataset.enemy;
        // Clear any prior armed potion — the explicit button click wins.
        this.game.state.selectedPotionSlot = null;
        if (!Number.isNaN(slot)) void this.game.potion.use(slot, enemyUid);
        break;
      }

      case "arm-potion": {
        const slot = Number(el.dataset.slot);
        if (Number.isNaN(slot)) break;
        // Toggle: clicking an already-armed potion cancels the selection.
        this.game.state.selectedPotionSlot =
          this.game.state.selectedPotionSlot === slot ? null : slot;
        // Arming a potion cancels any selected card so the two target flows
        // don't fight each other.
        if (this.game.state.selectedPotionSlot !== null) {
          this.game.state.selectedCardUid = null;
        }
        audio.play("click");
        this.ui.render();
        break;
      }

      case "discard-potion": {
        const slot = Number(el.dataset.slot);
        if (!Number.isNaN(slot)) this.game.potion.discard(slot);
        break;
      }

      case "back-to-map":
        this.game.returnToMap();
        this.ui.render();
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
      if (this.game.state.selectedPotionSlot !== null) {
        this.game.state.selectedPotionSlot = null;
        this.ui.render();
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

/**
 * Briefly flash a full-screen veil overlay to sell the "Open the Veil"
 * signature ability. Pure DOM — the engine stays headless.
 */
function triggerVeilFlash(): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector<HTMLDivElement>(".veil-flash");
  if (existing) existing.remove();
  const flash = document.createElement("div");
  flash.className = "veil-flash";
  document.body.appendChild(flash);
  // Remove after the animation completes so the DOM stays tidy.
  window.setTimeout(() => {
    flash.remove();
  }, 900);
}
