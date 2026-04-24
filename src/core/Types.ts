/**
 * Core type definitions for Veilbreach: Relic Deck.
 *
 * These types are the single source of truth for game data and state.
 * Discriminated unions are used for effects and intents to make the
 * effect resolver and intent executor exhaustive.
 */

/* -------------------------------------------------------------------------- */
/* IDs and enums                                                              */
/* -------------------------------------------------------------------------- */

export type CardId = string;
export type EnemyId = string;
export type RelicId = string;
export type PowerId = "stormEngine";

export type CardType = "Attack" | "Skill" | "Power" | "Status";
export type Rarity = "Common" | "Uncommon" | "Rare";

/** Where a card's effects are directed when no explicit target is given. */
export type TargetType = "enemy" | "allEnemies" | "self" | "randomEnemy" | "none";

/** The set of statuses supported by the game. Add new ones here first. */
export type StatusId =
  | "strength"
  | "dexterity"
  | "weak"
  | "vulnerable"
  | "frail"
  | "poison"
  | "burn"
  | "thorns"
  | "mark"
  | "plated"
  | "ritual";

/* -------------------------------------------------------------------------- */
/* Effects (discriminated union)                                              */
/* -------------------------------------------------------------------------- */

export type EffectTargetOverride = "self" | "enemy" | "allEnemies" | "randomEnemy";

/** A dynamic quantity derived from combat state, used for scaling effects. */
export type ScalingSource =
  | "cardsPlayed"      // combat.cardsPlayedThisTurn
  | "exhaustSize"      // combat.exhaustPile.length
  | "discardSize"      // combat.discardPile.length
  | "handSize"         // combat.hand.length (AFTER this card is removed)
  | "playerBlock"      // run.block
  | "enemyPoison"      // target.statuses.poison ?? 0
  | "enemyBurn"        // target.statuses.burn ?? 0
  | "missingHpTen";    // floor((maxHp - hp) / 10)

export type Effect =
  | { type: "damage"; amount: number; hits?: number; target?: EffectTargetOverride }
  | { type: "block"; amount: number; target?: EffectTargetOverride }
  | { type: "draw"; amount: number }
  | { type: "gainEnergy"; amount: number }
  | {
      type: "applyStatus";
      status: StatusId;
      amount: number;
      target: EffectTargetOverride;
    }
  | { type: "heal"; amount: number; target?: "self" }
  | {
      type: "cleanse";
      statuses: StatusId[];
      target: "self" | "enemy";
    }
  | { type: "doubleStatus"; status: StatusId; target: "enemy" }
  | { type: "gainPower"; power: PowerId; amount: number }
  | { type: "returnDiscardToHand"; amount: number; temporaryCost: number }
  | { type: "upgradeRandomInHand"; amount: number }
  | { type: "loseHp"; amount: number }
  | {
      /** Deal (base + perUnit * <scaling>) damage. Honors normal attack pipeline. */
      type: "scalingDamage";
      base: number;
      perUnit: number;
      scaling: ScalingSource;
      target?: EffectTargetOverride;
    }
  | {
      /** Gain (base + perUnit * <scaling>) block. */
      type: "scalingBlock";
      base: number;
      perUnit: number;
      scaling: ScalingSource;
      target?: EffectTargetOverride;
    }
  | { type: "exhaustHand"; exceptThis?: boolean }
  | { type: "discardHand" }
  | { type: "scry"; amount: number }
  | {
      type: "drawIf";
      amount: number;
      condition:
        | "targetHasBurn"
        | "targetHasPoison"
        | "targetHasMark"
        | "targetHasVulnerable"
        | "targetHasWeak";
    }
  | { type: "gainBreach"; amount: number };

export type EffectType = Effect["type"];

/* -------------------------------------------------------------------------- */
/* Card data (static) and card instance (runtime)                             */
/* -------------------------------------------------------------------------- */

export interface CardUpgradeData {
  name?: string;
  cost?: number;
  description?: string;
  effects?: Effect[];
  exhaustSelf?: boolean;
  retain?: boolean;
  innate?: boolean;
}

export interface CardData {
  id: CardId;
  name: string;
  cost: number;
  type: CardType;
  rarity: Rarity;
  targetType: TargetType;
  description: string;
  effects: Effect[];
  exhaustSelf?: boolean;
  /** When true, the card stays in hand at end of turn instead of being discarded. */
  retain?: boolean;
  /** When true, the card is placed into the opening hand at combat start. */
  innate?: boolean;
  fallbackColor: [string, string];
  imagePath?: string;
  assetKey?: string;
  upgrade?: CardUpgradeData;
}

/** The data-driven view of a card after applying upgrade if present. */
export interface ResolvedCardData extends CardData {
  upgraded?: boolean;
}

/** A card instance in a player's deck or pile. */
export interface CardInstance {
  uid: string;
  cardId: CardId;
  upgraded: boolean;
  /** When set, overrides the card's energy cost for this combat only. */
  tempCost: number | null;
}

/* -------------------------------------------------------------------------- */
/* Units (player and enemy)                                                   */
/* -------------------------------------------------------------------------- */

export type StatusMap = Partial<Record<StatusId, number>>;

/** A unit is anything that can take damage and carry statuses. */
export interface Unit {
  uid?: string;
  name?: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusMap;
  dead?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Enemy intents (discriminated union)                                        */
/* -------------------------------------------------------------------------- */

export type EnemyIntent =
  | { type: "attack"; label: string; icon: string; amount: number; text: string }
  | {
      type: "multiAttack";
      label: string;
      icon: string;
      amount: number;
      hits: number;
      text: string;
    }
  | { type: "defend"; label: string; icon: string; amount: number; text: string }
  | {
      type: "buff";
      label: string;
      icon: string;
      status: StatusId;
      amount: number;
      text: string;
    }
  | {
      type: "debuff";
      label: string;
      icon: string;
      status: StatusId;
      amount: number;
      text: string;
    }
  | {
      type: "attackDebuff";
      label: string;
      icon: string;
      amount: number;
      status: StatusId;
      statusAmount: number;
      text: string;
    }
  | {
      type: "defendBuff";
      label: string;
      icon: string;
      amount: number;
      status: StatusId;
      statusAmount: number;
      text: string;
    }
  | {
      type: "bossPhase";
      label: string;
      icon: string;
      status: StatusId;
      amount: number;
      blockGain: number;
      text: string;
    };

export type EnemyIntentType = EnemyIntent["type"];

/* -------------------------------------------------------------------------- */
/* Enemies                                                                    */
/* -------------------------------------------------------------------------- */

export interface EnemyData {
  id: EnemyId;
  name: string;
  maxHp: number;
  archetype: string;
  color: [string, string];
  boss?: boolean;
  /** Called each time the engine needs to decide/refresh an intent. */
  chooseIntent(enemy: EnemyInstance, combat: CombatState, turn: number): EnemyIntent;
}

export interface EnemyInstance extends Unit {
  uid: string;
  id: EnemyId;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusMap;
  intent: EnemyIntent | null;
  dead: boolean;
  boss: boolean;
  phaseAnnounced: boolean;
}

/* -------------------------------------------------------------------------- */
/* Relics                                                                     */
/* -------------------------------------------------------------------------- */

export type HookName =
  | "onCombatStart"
  | "onTurnStart"
  | "onAfterTurnDraw"
  | "onTurnEnd"
  | "onCalculateCardCost"
  | "onBeforeCardPlayed"
  | "onAfterCardPlayed"
  | "onBeforeDamage"
  | "onAfterDamage"
  | "onStatusTickDamage"
  | "onBeforeBlock"
  | "onAfterBlock"
  | "onEnemyKilled"
  | "onCardDrawn"
  | "onCardExhausted"
  | "onRewardGenerated"
  | "onCombatReward"
  | "onBreachGained"
  | "onVeilOpened";

export type RelicRarity = "Common" | "Uncommon" | "Rare" | "Boss";

export interface RelicData {
  id: RelicId;
  name: string;
  icon: string;
  description: string;
  /** Visual/loot tier. Defaults to "Common" when omitted. */
  rarity?: RelicRarity;
  hooks: Partial<Record<HookName, HookListener>>;
}

/* -------------------------------------------------------------------------- */
/* Hook system                                                                */
/* -------------------------------------------------------------------------- */

/** Provided to hook listeners so they can mutate combat state safely. */
export interface HookContext {
  state: GameState;
  /** Forward declared to avoid a circular import of CombatEngine. */
  engine: CombatEngineLike;
  damage?: DamageContext;
  card?: CardInstance;
  cardData?: ResolvedCardData;
  source?: Unit;
  target?: Unit;
}

export type HookListener = (ctx: HookContext) => void;

export interface DamageContext {
  /** May be null for tick damage (poison/burn) that has no attacker. */
  source: Unit | null;
  target: Unit;
  card?: CardInstance;
  cardData?: ResolvedCardData;
  baseAmount: number;
  amount: number;
  damageType: "attack" | "status" | "thorns" | "pure";
  hits: number;
}

/* A minimal contract the hooks can use without importing the full engine. */
export interface CombatEngineLike {
  addStatus(unit: Unit, status: StatusId, amount: number): void;
  gainBlock(unit: Unit, amount: number): void;
  drawCards(amount: number): void;
  healPlayer(amount: number): void;
  upgradeRandomInHand(amount: number): void;
  /** Direct pure damage (bypasses strength/weak/vulnerable). */
  dealPureDamage(target: Unit, amount: number, source?: Unit | null): void;
  /** Grant Breach (signature mechanic). Source is for flavor/logging. */
  gainBreach(amount: number, source?: "card" | "status" | "exhaust" | "relic" | "manual"): void;
  readonly state: GameState;
}

/* -------------------------------------------------------------------------- */
/* Combat state                                                               */
/* -------------------------------------------------------------------------- */

export type CombatPhase =
  | "playerStart"
  | "playerAction"
  | "playerEnd"
  | "enemyStart"
  | "enemyAction"
  | "enemyEnd";

/**
 * A simplified phase flag that the UI can render quickly.
 * The engine walks through the detailed CombatPhase internally
 * but stores this simpler phase for the UI.
 */
export type CombatUIPhase = "player" | "enemy";

export interface CombatState {
  encounterIndex: number;
  encounterName: string;
  turn: number;
  /** UI-facing phase. The engine uses internal phase tracking + isResolving. */
  phase: CombatUIPhase;
  energy: number;
  handSize: number;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  enemies: EnemyInstance[];
  powers: {
    stormEngine: number;
  };
  cardsPlayedThisTurn: number;
  firstTurn: boolean;
  /** Breach Meter — Veilbreach's signature mechanic. Fills from card plays,
   *  applied statuses and exhausts. When full, the player may Open the Veil. */
  breach: number;
  breachMax: number;
  /** Number of times Open the Veil has been triggered this combat. */
  veilOpenings: number;
  /** When > 0, the next N cards played this turn deal +50% damage. */
  veilEmpoweredStacks: number;
}

/* -------------------------------------------------------------------------- */
/* Run, reward, event                                                         */
/* -------------------------------------------------------------------------- */

export interface RunState {
  id: string;
  encounterIndex: number;
  maxHp: number;
  hp: number;
  block: number;
  statuses: StatusMap;
  deck: CardInstance[];
  relics: RelicId[];
  defeated: number;
  upgradedThisRun: number;
  removedThisRun: number;
  seed: number;
  /** The last RNG internal state so runs are reproducible across save/load. */
  rngState: number;
  /** Gold currency used in shops. Earned from combats. */
  gold: number;
  /** Active potion slots held by the player. Fixed-length array with null = empty. */
  potions: (PotionId | null)[];
  /** Maximum number of potion slots the player may carry. */
  maxPotionSlots: number;
  /** The generated map for this run. */
  map: MapState;
  /** ID of the node currently being resolved (null when on the map screen). */
  currentNodeId: string | null;
  /** Encounter pools used for deterministic enemy picks at map generation. */
  actIndex: number;
  /** Count of elites defeated this run (used for some relic gating). */
  elitesKilled: number;
}

/* -------------------------------------------------------------------------- */
/* Map / nodes                                                                */
/* -------------------------------------------------------------------------- */

export type NodeType =
  | "monster"
  | "elite"
  | "event"
  | "shop"
  | "rest"
  | "treasure"
  | "boss"
  | "start";

export interface MapNode {
  id: string;
  type: NodeType;
  /** 0-based row in the map grid. Row 0 = start, last row = boss. */
  row: number;
  /** Column (horizontal position) in the map grid. */
  col: number;
  /** IDs of nodes reachable from this node in the next row. */
  next: string[];
  /** For monster/elite/boss nodes: the exact enemies picked at generation time. */
  enemies?: EnemyId[];
  /** For event nodes: the specific event id picked at generation. */
  eventId?: string;
  /** True when the player has already resolved this node. */
  cleared?: boolean;
  /** Friendly display name (e.g. encounter name). */
  name?: string;
}

export interface MapState {
  nodes: Record<string, MapNode>;
  /** Ordered list of rows; each row contains the node ids on that row. */
  rows: string[][];
  /** Node id where the player currently stands (start node, or last cleared). */
  playerNodeId: string;
  /** Node ids the player is allowed to click next. */
  availableNodeIds: string[];
  /** Number of rows including start and boss. */
  totalRows: number;
  /** The act number this map represents. */
  act: number;
}

/* -------------------------------------------------------------------------- */
/* Potions                                                                    */
/* -------------------------------------------------------------------------- */

export type PotionId = string;

export type PotionTarget = "self" | "enemy" | "allEnemies";

export interface PotionData {
  id: PotionId;
  name: string;
  rarity: Rarity;
  description: string;
  /** Where this potion must be used. "combat" = only in combat, "map" = only out of combat, "any" = either. */
  scope: "combat" | "map" | "any";
  target: PotionTarget;
  icon: string;
  color: [string, string];
  effects: Effect[];
}

/* -------------------------------------------------------------------------- */
/* Shop                                                                       */
/* -------------------------------------------------------------------------- */

export interface ShopCardItem {
  kind: "card";
  cardId: CardId;
  price: number;
  sold?: boolean;
}

export interface ShopRelicItem {
  kind: "relic";
  relicId: RelicId;
  price: number;
  sold?: boolean;
}

export interface ShopPotionItem {
  kind: "potion";
  potionId: PotionId;
  price: number;
  sold?: boolean;
}

export type ShopItem = ShopCardItem | ShopRelicItem | ShopPotionItem;

export interface ShopState {
  cards: ShopCardItem[];
  relics: ShopRelicItem[];
  potions: ShopPotionItem[];
  removeServicePrice: number;
  removeUsed: boolean;
}

/* -------------------------------------------------------------------------- */
/* Rest site                                                                  */
/* -------------------------------------------------------------------------- */

export interface RestState {
  used: boolean;
  healAmount: number;
  canUpgrade: boolean;
}

/* -------------------------------------------------------------------------- */
/* Treasure                                                                   */
/* -------------------------------------------------------------------------- */

export interface TreasureState {
  opened: boolean;
  relicId: RelicId | null;
  goldAmount: number;
}

export interface RewardState {
  cardChoices: CardId[];
  relicOffer: RelicId[];
  pickedCard: boolean;
  pickedRelic: boolean;
  nextIndex: number;
  canUpgrade: boolean;
  canHeal: boolean;
  canRemove: boolean;
  /** Guards to prevent double-advance from concurrent clicks / timers. */
  isAdvancing: boolean;
  /** Gold awarded for this combat (shown until claimed). */
  goldReward: number;
  goldClaimed: boolean;
  /** If a potion dropped, the player may claim it once. */
  potionDrop: PotionId | null;
  potionClaimed: boolean;
  /** Whether this reward came from an elite (affects relic offer). */
  wasElite: boolean;
  /** Whether this reward came from the boss (shows end-run summary). */
  wasBoss: boolean;
}

export interface EventChoice {
  id: string;
  label: string;
  /** Short flavor shown beside the button describing the consequence. */
  effectText: string;
  /** True when this option is not usable (deck too small, no gold, etc.). */
  disabled?: boolean;
  /** Reason displayed to the player when the option is disabled. */
  disabledReason?: string;
}

export interface EventState {
  /** Pool event id. When null, the event is the legacy Mirror Camp. */
  eventId: string | null;
  title: string;
  text: string;
  /** The choices currently offered. Populated from the event definition. */
  choices: EventChoice[];
  /** True when the player has picked a choice and the event is showing its outcome. */
  resolved: boolean;
  /** Text shown after a choice is picked. */
  outcomeText: string;
  /** Legacy compatibility flag. */
  used: boolean;
}

/* -------------------------------------------------------------------------- */
/* Screens and top-level game state                                           */
/* -------------------------------------------------------------------------- */

export type GameScreen =
  | "menu"
  | "combat"
  | "reward"
  | "event"
  | "win"
  | "lose"
  | "map"
  | "shop"
  | "rest"
  | "treasure";

export interface GameState {
  screen: GameScreen;
  run: RunState | null;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventState | null;
  shop: ShopState | null;
  rest: RestState | null;
  treasure: TreasureState | null;
  selectedCardUid: string | null;
  /** When set, the player has armed a potion that needs a target — the next enemy click uses it. */
  selectedPotionSlot: number | null;
  log: string[];
  /** Hard lock shared by combat, reward, and event flows. */
  isResolving: boolean;
}

/* -------------------------------------------------------------------------- */
/* Save data                                                                  */
/* -------------------------------------------------------------------------- */

export const SAVE_VERSION = 3;

export interface SaveData {
  version: number;
  timestamp: number;
  run: RunState;
  screen: GameScreen;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventState | null;
  shop: ShopState | null;
  rest: RestState | null;
  treasure: TreasureState | null;
  log: string[];
}

export type LoadResult =
  | { ok: true; data: SaveData }
  | { ok: false; reason: string };

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export interface StatusMeta {
  label: string;
  icon: string;
  tip: string;
}

export interface Encounter {
  name: string;
  type: "normal" | "elite" | "boss";
  enemies: EnemyId[];
}

/** A pool of encounters the map generator may pick from for a given node type. */
export interface EncounterPools {
  normal: Encounter[];
  elite: Encounter[];
  boss: Encounter[];
}
