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
  | { type: "loseHp"; amount: number };

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
  | "onTurnEnd"
  | "onBeforeCardPlayed"
  | "onAfterCardPlayed"
  | "onBeforeDamage"
  | "onAfterDamage"
  | "onBeforeBlock"
  | "onAfterBlock"
  | "onEnemyKilled"
  | "onCardDrawn"
  | "onCardExhausted"
  | "onRewardGenerated"
  | "onCombatReward";

export interface RelicData {
  id: RelicId;
  name: string;
  icon: string;
  description: string;
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
  source: Unit;
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
}

export interface EventState {
  title: string;
  text: string;
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
  | "lose";

export interface GameState {
  screen: GameScreen;
  run: RunState | null;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventState | null;
  selectedCardUid: string | null;
  log: string[];
  /** Hard lock shared by combat, reward, and event flows. */
  isResolving: boolean;
}

/* -------------------------------------------------------------------------- */
/* Save data                                                                  */
/* -------------------------------------------------------------------------- */

export const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  timestamp: number;
  run: RunState;
  screen: GameScreen;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventState | null;
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
  type: "normal" | "boss";
  enemies: EnemyId[];
}
