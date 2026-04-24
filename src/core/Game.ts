import type { CardId, GameState, RunState } from "./Types";
import { CONFIG, STARTING_DECK } from "../data/config";
import { createCardInstance } from "../data/cards";
import { createInitialState } from "./GameState";
import { RNG, randomSeed } from "./RNG";
import { CombatEngine, type CombatEngineHost } from "./CombatEngine";
import { RewardSystem } from "./RewardSystem";
import { EventSystem } from "./EventSystem";
import {
  canSave as savesCanSave,
  clearSave as savesClearSave,
  hasSave as savesHasSave,
  loadSave,
  saveIfStable as savesSaveIfStable,
} from "./SaveSystem";

/**
 * Full host interface required by Game. Extends CombatEngineHost with the
 * callbacks needed by the reward and event sub-systems, plus the modal
 * control used when deck-edit dialogs resolve.
 */
export interface GameHost extends CombatEngineHost {
  closeModal(): void;
  advanceReward(): void;
  startEncounter(index: number): void;
  /** Internal flag set by Game when it patches host.log once. */
  __logPatched?: boolean;
}

/**
 * Game is the top-level controller. It owns GameState, the RNG, and the
 * concrete instances of the sub-systems (combat, reward, event). The UI
 * layer calls into Game methods; Game in turn calls into the sub-systems.
 */
export class Game {
  public state: GameState;
  private rng: RNG;
  public engine!: CombatEngine;
  public reward!: RewardSystem;
  public event!: EventSystem;

  private host: GameHost | null = null;
  private log = (msg: string): void => {
    this.state.log.unshift(msg);
    this.state.log = this.state.log.slice(0, CONFIG.maxLogLines);
  };

  constructor() {
    this.state = createInitialState();
    this.rng = new RNG(randomSeed());
  }

  /**
   * Wires up the host (UI callbacks). Called once after the UI has been
   * constructed. The UI needs the Game reference for callbacks, and Game
   * needs the UI reference for rendering, so we resolve the cycle with
   * a two-step construction.
   */
  attachHost(host: GameHost): void {
    this.host = host;
    this.engine = new CombatEngine(this.state, this.rng, host);
    this.attachHostInternal(host);
  }

  private attachHostInternal(host: GameHost): void {
    this.reward = new RewardSystem(this.state, this.engine, this.rng, {
      render: () => host.render(),
      playSound: (n) => host.playSound(n),
      log: (m) => this.log(m),
      toastMessage: (m) => host.toastMessage(m),
      closeModal: () => host.closeModal(),
      saveStable: () => host.saveStable(),
      advance: () => host.advanceReward(),
    });

    this.event = new EventSystem(this.state, this.engine, {
      render: () => host.render(),
      closeModal: () => host.closeModal(),
      log: (m) => this.log(m),
      toastMessage: (m) => host.toastMessage(m),
      saveStable: () => host.saveStable(),
      startEncounter: (i) => host.startEncounter(i),
      playSound: (n) => host.playSound(n),
    });

    // Route combat engine log calls through our log handler. We do this
    // once and only once per host attach.
    if (!host.__logPatched) {
      const originalLog = host.log;
      host.log = (msg: string) => {
        this.log(msg);
        originalLog?.(msg);
      };
      host.__logPatched = true;
    }
  }

  /* -------------------------------------------------------------------- */
  /* Run lifecycle                                                        */
  /* -------------------------------------------------------------------- */

  newRun(): void {
    const seed = randomSeed();
    this.rng = new RNG(seed);
    this.engine.setRng(this.rng);

    const deck = STARTING_DECK.map((id: CardId) => createCardInstance(id));
    const run: RunState = {
      id: `run_${Date.now().toString(36)}`,
      encounterIndex: 0,
      maxHp: CONFIG.startingMaxHp,
      hp: CONFIG.startingMaxHp,
      block: 0,
      statuses: {},
      deck,
      relics: [],
      defeated: 0,
      upgradedThisRun: 0,
      removedThisRun: 0,
      seed,
      rngState: this.rng.getState(),
    };
    this.state.screen = "combat";
    this.state.run = run;
    this.state.combat = null;
    this.state.reward = null;
    this.state.event = null;
    this.state.selectedCardUid = null;
    this.state.log = [];
    this.state.isResolving = false;

    this.engine.startEncounter(0);
    this.captureRngState();
  }

  /** Save the RNG's current state into the run so it survives reloads. */
  captureRngState(): void {
    if (this.state.run) this.state.run.rngState = this.rng.getState();
  }

  /**
   * Continues the most recent saved run. Returns true on success, false
   * when the save is missing or invalid. The caller is responsible for
   * showing an error overlay on failure.
   */
  continueRun(): { ok: true } | { ok: false; reason: string } {
    const result = loadSave();
    if (!result.ok) return { ok: false, reason: result.reason };

    const data = result.data;
    this.state.screen = data.screen;
    this.state.run = data.run;
    this.state.combat = data.combat;
    this.state.reward = data.reward;
    this.state.event = data.event;
    this.state.selectedCardUid = null;
    this.state.log = data.log ?? [];
    this.state.isResolving = false;

    // Restore RNG at the exact saved state.
    this.rng = new RNG(data.run.seed, data.run.rngState);
    this.engine.setRng(this.rng);

    // If we reload into combat, make sure enemies have intents.
    if (this.state.screen === "combat" && this.state.combat) {
      this.engine.ensureEnemyIntents();
    }
    return { ok: true };
  }

  clearSave(): void {
    savesClearSave();
  }

  hasSave(): boolean {
    return savesHasSave();
  }

  canSave(): boolean {
    return savesCanSave(this.state);
  }

  saveIfStable(): boolean {
    const ok = savesSaveIfStable(this.state);
    if (ok) this.captureRngState();
    return ok;
  }

  abandonRun(): void {
    savesClearSave();
    this.state = createInitialState();
    // Rebuild engine and sub-systems against the new state object so their
    // closures don't point at the old one. The host is cached on the Game
    // instance so we can re-attach cleanly.
    if (this.host) {
      this.engine = new CombatEngine(this.state, this.rng, this.host);
      this.attachHostInternal(this.host);
    }
  }

  /**
   * Called by UI after reward is fully resolved. Advances to next encounter,
   * or shows the mid-run event when appropriate.
   */
  advanceReward(): void {
    const reward = this.state.reward;
    if (!reward) return;

    if (reward.nextIndex === 2) {
      // The event happens before encounter 2 (the Chapel of Wires).
      this.state.reward = null;
      this.event.show();
      return;
    }

    this.state.run!.encounterIndex = reward.nextIndex;
    this.state.reward = null;
    this.state.screen = "combat";
    this.engine.startEncounter(reward.nextIndex);
    this.captureRngState();
  }
}
