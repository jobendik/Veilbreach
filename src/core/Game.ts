import type { CardId, GameState, MapNode, NodeType, RunState } from "./Types";
import { CONFIG, STARTING_DECK } from "../data/config";
import { createCardInstance } from "../data/cards";
import { createInitialState } from "./GameState";
import { RNG, randomSeed } from "./RNG";
import { CombatEngine, type CombatEngineHost } from "./CombatEngine";
import { RewardSystem } from "./RewardSystem";
import { EventSystem } from "./EventSystem";
import { PotionSystem } from "./PotionSystem";
import { ShopSystem } from "./ShopSystem";
import { RestSystem } from "./RestSystem";
import { TreasureSystem } from "./TreasureSystem";
import { generateMap, computeAvailableNodes } from "./MapGenerator";
import {
  canSave as savesCanSave,
  clearSave as savesClearSave,
  hasSave as savesHasSave,
  loadSave,
  saveIfStable as savesSaveIfStable,
} from "./SaveSystem";

/**
 * Full host interface required by Game. Extends CombatEngineHost with the
 * callbacks needed by the reward, event, map, shop, rest, and treasure
 * sub-systems, plus modal control for deck-edit dialogs.
 */
export interface GameHost extends CombatEngineHost {
  closeModal(): void;
  advanceReward(): void;
  returnToMap(): void;
  __logPatched?: boolean;
}

/**
 * Game is the top-level controller. It owns GameState, the RNG, and the
 * concrete instances of the sub-systems. The UI layer calls into Game
 * methods; Game in turn dispatches to the appropriate sub-system.
 */
export class Game {
  public state: GameState;
  private rng: RNG;
  public engine!: CombatEngine;
  public reward!: RewardSystem;
  public event!: EventSystem;
  public potion!: PotionSystem;
  public shop!: ShopSystem;
  public rest!: RestSystem;
  public treasure!: TreasureSystem;

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
   * needs the UI reference for rendering.
   */
  attachHost(host: GameHost): void {
    this.host = host;
    this.engine = new CombatEngine(this.state, this.rng, host);
    this.attachHostInternal(host);
  }

  private attachHostInternal(host: GameHost): void {
    const log = (m: string) => this.log(m);
    const baseHost = {
      render: () => host.render(),
      log,
      toastMessage: (m: string) => host.toastMessage(m),
      playSound: host.playSound.bind(host),
      saveStable: () => host.saveStable(),
      closeModal: () => host.closeModal(),
      returnToMap: () => host.returnToMap(),
    };

    this.reward = new RewardSystem(this.state, this.engine, this.rng, {
      render: baseHost.render,
      playSound: baseHost.playSound,
      log,
      toastMessage: baseHost.toastMessage,
      closeModal: baseHost.closeModal,
      saveStable: baseHost.saveStable,
      advance: () => host.advanceReward(),
    });

    this.potion = new PotionSystem(this.state, this.engine, this.rng, {
      render: baseHost.render,
      log,
      toastMessage: baseHost.toastMessage,
      playSound: baseHost.playSound,
      saveStable: baseHost.saveStable,
    });

    this.reward.setPotionSystem(this.potion);

    this.event = new EventSystem(this.state, this.engine, this.rng, {
      render: baseHost.render,
      closeModal: baseHost.closeModal,
      log,
      toastMessage: baseHost.toastMessage,
      saveStable: baseHost.saveStable,
      playSound: baseHost.playSound,
      returnToMap: baseHost.returnToMap,
    });

    this.shop = new ShopSystem(this.state, this.rng, {
      render: baseHost.render,
      log,
      toastMessage: baseHost.toastMessage,
      playSound: baseHost.playSound,
      saveStable: baseHost.saveStable,
      returnToMap: baseHost.returnToMap,
      addPotion: (id: string) => this.potion.add(id),
    });

    this.rest = new RestSystem(this.state, this.engine, {
      render: baseHost.render,
      log,
      toastMessage: baseHost.toastMessage,
      playSound: baseHost.playSound,
      saveStable: baseHost.saveStable,
      returnToMap: baseHost.returnToMap,
    });

    this.treasure = new TreasureSystem(this.state, this.rng, {
      render: baseHost.render,
      log,
      playSound: baseHost.playSound,
      saveStable: baseHost.saveStable,
      returnToMap: baseHost.returnToMap,
    });

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
    const map = generateMap(this.rng, { act: 1 });
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
      gold: 0,
      potions: [null, null, null],
      maxPotionSlots: 3,
      map,
      currentNodeId: map.playerNodeId,
      actIndex: 0,
      elitesKilled: 0,
    };
    this.state.screen = "map";
    this.state.run = run;
    this.state.combat = null;
    this.state.reward = null;
    this.state.event = null;
    this.state.shop = null;
    this.state.rest = null;
    this.state.treasure = null;
    this.state.selectedCardUid = null;
    this.state.selectedPotionSlot = null;
    this.state.log = [];
    this.state.isResolving = false;

    this.log("A new run begins. Choose your path.");
    this.captureRngState();
  }

  /* -------------------------------------------------------------------- */
  /* Map traversal                                                        */
  /* -------------------------------------------------------------------- */

  /**
   * Player clicks a node on the map. Validates availability, advances the
   * player token, and dispatches to the appropriate sub-system.
   */
  visitNode(nodeId: string): void {
    const run = this.state.run;
    if (!run || this.state.screen !== "map") return;
    const map = run.map;
    if (!map.availableNodeIds.includes(nodeId)) return;
    const node = map.nodes[nodeId];
    if (!node) return;

    // Advance the player token and recompute availability for after the
    // encounter (used when returning to the map from rest/shop/event).
    map.playerNodeId = nodeId;
    run.currentNodeId = nodeId;

    this.dispatchNode(node);
    this.captureRngState();
  }

  private dispatchNode(node: MapNode): void {
    switch (node.type) {
      case "monster":
      case "elite":
      case "boss":
        this.startCombatForNode(node);
        break;
      case "event":
        this.event.show(node.eventId ?? null);
        break;
      case "shop":
        this.shop.open();
        break;
      case "rest":
        this.rest.open();
        break;
      case "treasure":
        this.treasure.open();
        break;
      case "start":
        // Starting node can't be revisited; shouldn't happen.
        this.returnToMap();
        break;
    }
  }

  private startCombatForNode(node: MapNode): void {
    const tier: NodeType = node.type === "elite" ? "elite" : node.type === "boss" ? "boss" : "monster";
    const enemies = node.enemies ?? [];
    if (enemies.length === 0) {
      // Fallback: if the node somehow has no enemies, skip it.
      this.returnToMap();
      return;
    }
    this.state.screen = "combat";
    this.engine.startEncounterFromNode(node.name ?? "Combat", enemies, tier);
  }

  /**
   * Called by sub-systems (shop/rest/treasure/event) when the player
   * returns to the map, and by advanceReward after combat rewards.
   */
  returnToMap(): void {
    const run = this.state.run;
    if (!run) return;
    const map = run.map;
    // Mark the node we just left as cleared and recompute availability.
    if (run.currentNodeId) {
      const node = map.nodes[run.currentNodeId];
      if (node) node.cleared = true;
    }
    map.availableNodeIds = computeAvailableNodes(map);
    this.state.screen = "map";
    this.state.reward = null;
    this.state.shop = null;
    this.state.rest = null;
    this.state.treasure = null;
    this.state.event = null;
    this.host?.render();
    this.host?.saveStable();
    this.captureRngState();
  }

  /** Called by UI after reward is fully resolved. */
  advanceReward(): void {
    // Boss reward already handled inline; for normal/elite rewards we just
    // go back to the map.
    this.state.reward = null;
    this.returnToMap();
  }

  captureRngState(): void {
    if (this.state.run) this.state.run.rngState = this.rng.getState();
  }

  /**
   * Continues the most recent saved run. Returns true on success, false
   * when the save is missing or invalid.
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
    this.state.shop = data.shop ?? null;
    this.state.rest = data.rest ?? null;
    this.state.treasure = data.treasure ?? null;
    this.state.selectedCardUid = null;
    this.state.selectedPotionSlot = null;
    this.state.log = data.log ?? [];
    this.state.isResolving = false;

    this.rng = new RNG(data.run.seed, data.run.rngState);
    this.engine.setRng(this.rng);

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
    this.captureRngState();
    return savesSaveIfStable(this.state);
  }

  abandonRun(): void {
    savesClearSave();
    this.state = createInitialState();
    if (this.host) {
      this.engine = new CombatEngine(this.state, this.rng, this.host);
      this.attachHostInternal(this.host);
    }
  }
}
