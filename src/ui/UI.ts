import type { Game, GameHost } from "../core/Game";
import type { Unit } from "../core/Types";
import { audio } from "../audio/AudioSystem";
import { Renderer } from "./Renderer";
import { ToastSystem } from "./Toast";
import { ModalSystem, type DeckModalMode } from "./Modal";
import { FloatingTextSystem } from "./FloatingText";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * The UI facade. Implements the `GameHost` contract that the core expects,
 * and exposes simple methods the InputController calls. The Renderer and
 * Modal/Toast/FloatingText subsystems live inside and are driven by this
 * class.
 *
 * Everything the Game needs from the outside world flows through here,
 * which means Game has no direct DOM knowledge.
 */
export class UI implements GameHost {
  private game: Game;
  private renderer: Renderer;
  private toast: ToastSystem;
  private modal: ModalSystem;
  private floats: FloatingTextSystem;
  private errorBoundary: ErrorBoundary;

  // GameHost supports being patched once with a wrapped log function.
  log: (msg: string) => void;
  __logPatched = false;

  constructor(opts: {
    game: Game;
    appRoot: HTMLElement;
    toastZone: HTMLElement;
    modalRoot: HTMLElement;
    errorRoot: HTMLElement;
  }) {
    this.game = opts.game;
    this.renderer = new Renderer(opts.appRoot);
    this.toast = new ToastSystem(opts.toastZone);
    this.modal = new ModalSystem(opts.modalRoot);
    this.floats = new FloatingTextSystem(opts.toastZone);
    this.errorBoundary = new ErrorBoundary(opts.errorRoot, {
      onReturnToMenu: () => {
        this.game.state.screen = "menu";
        this.render();
      },
      onClearSave: () => this.game.clearSave(),
    });
    // Default log just writes to console — the Game.attachHost replaces it
    // with its own line-capture function.
    this.log = (msg: string) => console.log("[log]", msg);
  }

  attachErrorBoundary(): void {
    this.errorBoundary.attach();
  }

  showRecoverableError(message: string): void {
    this.errorBoundary.showRecoverable(message);
  }

  /* -------------------------------------------------------------------- */
  /* High-level flow methods                                              */
  /* -------------------------------------------------------------------- */

  render(): void {
    this.renderer.renderScreen(this.game.state, this.game.hasSave());
  }

  updateCombat(): void {
    this.renderer.updateCombat(this.game.state);
  }

  newRun(): void {
    this.game.newRun();
    this.render();
  }

  continueRun(): void {
    const result = this.game.continueRun();
    if (!result.ok) {
      // Bad save — clear it and show a friendly error.
      this.game.clearSave();
      this.showRecoverableError(
        `${result.reason} The saved run has been cleared. Start a new run to continue.`
      );
      return;
    }
    this.render();
  }

  /* -------------------------------------------------------------------- */
  /* Modal helpers                                                        */
  /* -------------------------------------------------------------------- */

  openDeckModal(title: string, mode: DeckModalMode): void {
    const deck = this.game.state.run?.deck ?? [];
    this.modal.openDeckModal(title, mode, deck, {
      onCardSelected: (uid, mode) => {
        switch (mode) {
          case "upgrade-reward":
            this.game.reward.upgradeDeckCard(uid);
            break;
          case "remove-reward":
            this.game.reward.removeDeckCard(uid);
            break;
          case "upgrade-event":
            this.game.event.finishUpgrade(uid);
            break;
          case "remove-event":
            this.game.event.finishRemove(uid);
            break;
        }
      },
    });
  }

  isModalOpen(): boolean {
    return this.modal.isOpen;
  }

  closeModal(): void {
    this.modal.close();
  }

  /* -------------------------------------------------------------------- */
  /* GameHost interface methods                                           */
  /* -------------------------------------------------------------------- */

  toastMessage(msg: string): void {
    this.toast.show(msg);
  }

  floatAtCenter(msg: string, color?: string): void {
    this.floats.atCenter(msg, color);
  }

  floatNearUnit(unit: Unit, msg: string, color?: string): void {
    this.floats.nearUnit(unit, msg, color);
  }

  flashUnit(unit: Unit): void {
    this.renderer.flashUnit(unit);
  }

  animateCardPlay(uid: string): void {
    this.renderer.animateCardPlay(uid);
  }

  shakeCard(uid: string): void {
    this.renderer.shakeCard(uid);
  }

  playSound(
    name:
      | "click"
      | "card"
      | "hit"
      | "block"
      | "poison"
      | "victory"
      | "defeat"
      | "relic"
      | "bossPhase"
  ): void {
    audio.play(name);
  }

  onWin(): void {
    // Clear save on final victory; the run is complete.
    this.game.clearSave();
  }

  onLose(): void {
    this.game.clearSave();
  }

  onReward(): void {
    this.game.reward.createReward();
  }

  saveStable(): void {
    this.game.saveIfStable();
  }

  advanceReward(): void {
    this.game.advanceReward();
    this.render();
  }

  startEncounter(index: number): void {
    this.game.engine.startEncounter(index);
    this.render();
  }
}
