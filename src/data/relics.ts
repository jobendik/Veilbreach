import type { RelicData, RelicId } from "../core/Types";

/**
 * Relic effects are implemented as hook listeners. The combat engine
 * fires named events and every relic listening on that event gets a chance
 * to react. This replaces the old object-literal `onCombatStart` / `onTurnStart`
 * methods with a typed event model that can be extended to many more hook
 * points without touching the engine itself.
 */
export const RELIC_DB: Record<RelicId, RelicData> = {
  cracked_core: {
    id: "cracked_core",
    name: "Cracked Core",
    icon: "◈",
    description: "Start each combat with +1 Strength.",
    hooks: {
      onCombatStart: (ctx) => {
        if (ctx.state.run) {
          ctx.engine.addStatus(ctx.state.run, "strength", 1);
        }
      },
    },
  },

  azure_battery: {
    id: "azure_battery",
    name: "Azure Battery",
    icon: "⚡",
    description: "Gain +1 Energy on turn 1 of each combat.",
    hooks: {
      onTurnStart: (ctx) => {
        const combat = ctx.state.combat;
        if (combat && combat.turn === 1) combat.energy += 1;
      },
    },
  },

  mirror_seed: {
    id: "mirror_seed",
    name: "Mirror Seed",
    icon: "✹",
    description: "Start each combat with 2 Thorns.",
    hooks: {
      onCombatStart: (ctx) => {
        if (ctx.state.run) {
          ctx.engine.addStatus(ctx.state.run, "thorns", 2);
        }
      },
    },
  },

  brass_lung: {
    id: "brass_lung",
    name: "Brass Lung",
    icon: "✚",
    description: "Heal 5 HP after every combat.",
    hooks: {
      onCombatReward: (ctx) => {
        ctx.engine.healPlayer(5);
      },
    },
  },

  paper_moon: {
    id: "paper_moon",
    name: "Paper Moon",
    icon: "☾",
    description: "Draw 1 extra card on the first turn of combat.",
    hooks: {
      // Fire AFTER the auto draw-to-handsize, otherwise the extra card is
      // simply absorbed and the relic effectively does nothing.
      onAfterTurnDraw: (ctx) => {
        if (ctx.state.combat && ctx.state.combat.turn === 1) {
          ctx.engine.drawCards(1);
        }
      },
    },
  },

  obsidian_scale: {
    id: "obsidian_scale",
    name: "Obsidian Scale",
    icon: "⬢",
    description: "Gain 3 block at the start of each combat.",
    hooks: {
      onCombatStart: (ctx) => {
        if (ctx.state.run) {
          ctx.engine.gainBlock(ctx.state.run, 3);
        }
      },
    },
  },

  /* ---------------------- New relics ---------------------- */

  velvet_fang: {
    id: "velvet_fang",
    name: "Velvet Fang",
    icon: "⌖",
    description: "The first Attack you play each turn applies 2 Mark.",
    hooks: {
      onTurnStart: (ctx) => {
        // Reset per-turn flag stored on the relic's own transient memo via state.
        (ctx.state as any).__velvetFired = false;
      },
      onAfterCardPlayed: (ctx) => {
        if ((ctx.state as any).__velvetFired) return;
        if (ctx.cardData?.type !== "Attack") return;
        const combat = ctx.state.combat;
        if (!combat) return;
        // Apply mark to the first living enemy (reasonable default).
        const enemy = combat.enemies.find((e) => !e.dead && e.hp > 0);
        if (!enemy) return;
        ctx.engine.addStatus(enemy, "mark", 2);
        (ctx.state as any).__velvetFired = true;
      },
    },
  },

  thorn_crown: {
    id: "thorn_crown",
    name: "Thorn Crown",
    icon: "✹",
    description: "Whenever Poison or Burn ticks on an enemy, gain 1 Block.",
    hooks: {
      // Listens to the dedicated status-tick hook so it isn't affected by
      // whether onAfterDamage fires for non-attack damage.
      onStatusTickDamage: (ctx) => {
        if (!ctx.damage) return;
        if (!ctx.state.run) return;
        if (ctx.damage.target === ctx.state.run) return;
        ctx.engine.gainBlock(ctx.state.run, 1);
      },
    },
  },

  stasis_coil: {
    id: "stasis_coil",
    name: "Stasis Coil",
    icon: "◎",
    description: "At the start of combat, upgrade a random card in hand for this combat.",
    hooks: {
      // Must fire AFTER the opening draw, not in onCombatStart (when the hand
      // is empty except for innate cards and will be overwritten by the
      // auto-draw in startPlayerTurn).
      onAfterTurnDraw: (ctx) => {
        if (ctx.state.combat && ctx.state.combat.turn === 1) {
          ctx.engine.upgradeRandomInHand(1);
        }
      },
    },
  },

  hollow_bell: {
    id: "hollow_bell",
    name: "Hollow Bell",
    icon: "☼",
    description: "Whenever you Exhaust a card, deal 2 damage to a random enemy.",
    hooks: {
      onCardExhausted: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        const living = combat.enemies.filter((e) => !e.dead && e.hp > 0);
        if (!living.length) return;
        // First living enemy is the deterministic pick.
        ctx.engine.dealPureDamage(living[0], 2, ctx.state.run ?? null);
      },
    },
  },

  ember_core: {
    id: "ember_core",
    name: "Ember Core",
    icon: "🔥",
    description: "Start each combat with 3 Burn applied to each enemy.",
    hooks: {
      onCombatStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        for (const e of combat.enemies) ctx.engine.addStatus(e, "burn", 3);
      },
    },
  },

  cleric_vial: {
    id: "cleric_vial",
    name: "Cleric's Vial",
    icon: "✚",
    description: "After each combat, heal 3 HP and remove 1 Weak/Frail.",
    hooks: {
      onCombatReward: (ctx) => {
        ctx.engine.healPlayer(3);
        if (ctx.state.run) {
          if ((ctx.state.run.statuses.weak ?? 0) > 0) ctx.state.run.statuses.weak!--;
          if ((ctx.state.run.statuses.frail ?? 0) > 0) ctx.state.run.statuses.frail!--;
        }
      },
    },
  },

  iron_will: {
    id: "iron_will",
    name: "Iron Will",
    icon: "⬟",
    description: "Your first card played each combat costs 0.",
    hooks: {
      onCombatStart: (ctx) => {
        (ctx.state as any).__ironWillArmed = true;
      },
      // Fires on both canPlayCard (so the energy check passes) and playCard
      // (so the subtraction uses the zeroed cost) — both call sites trigger
      // the same hook.
      onCalculateCardCost: (ctx) => {
        if (!(ctx.state as any).__ironWillArmed) return;
        if (!ctx.card) return;
        ctx.card.tempCost = 0;
      },
      onAfterCardPlayed: (ctx) => {
        (ctx.state as any).__ironWillArmed = false;
        void ctx;
      },
    },
  },

  vein_pendant: {
    id: "vein_pendant",
    name: "Vein Pendant",
    icon: "♥",
    description: "Increase max HP by 8 when acquired.",
    hooks: {
      // Using onCombatStart as a guaranteed trigger after pickup. Only applies once.
      onCombatStart: (ctx) => {
        if (!ctx.state.run) return;
        if ((ctx.state as any).__veinApplied) return;
        ctx.state.run.maxHp += 8;
        ctx.state.run.hp = Math.min(ctx.state.run.maxHp, ctx.state.run.hp + 8);
        (ctx.state as any).__veinApplied = true;
      },
    },
  },

  cracked_lens: {
    id: "cracked_lens",
    name: "Cracked Lens",
    icon: "◐",
    description: "Draw 1 additional card at the start of each turn.",
    hooks: {
      // Fire AFTER the auto draw-to-handsize so the extra card sticks.
      onAfterTurnDraw: (ctx) => {
        ctx.engine.drawCards(1);
      },
    },
  },

  void_mantle: {
    id: "void_mantle",
    name: "Void Mantle",
    icon: "◈",
    description: "Take 3 less damage from every attack.",
    hooks: {
      onBeforeDamage: (ctx) => {
        if (!ctx.damage) return;
        if (ctx.damage.target !== ctx.state.run) return;
        ctx.damage.amount = Math.max(0, ctx.damage.amount - 3);
      },
    },
  },

  grave_ember: {
    id: "grave_ember",
    name: "Grave Ember",
    icon: "✦",
    description: "When an enemy dies, apply 2 Burn to all other enemies.",
    hooks: {
      onEnemyKilled: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        for (const e of combat.enemies) {
          if (e === ctx.target) continue;
          if (e.dead || e.hp <= 0) continue;
          ctx.engine.addStatus(e, "burn", 2);
        }
      },
    },
  },

  /* ----------------- Breach-synergy relics ----------------- */

  rift_catalyst: {
    id: "rift_catalyst",
    name: "Rift Catalyst",
    icon: "✺",
    description: "At the start of each combat, gain 3 Breach.",
    hooks: {
      onCombatStart: (ctx) => {
        ctx.engine.gainBreach(3, "relic");
      },
    },
  },

  veilroot: {
    id: "veilroot",
    name: "Veilroot",
    icon: "⚘",
    description: "Your Breach Meter maximum is reduced by 2 (easier to fill).",
    hooks: {
      onCombatStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        combat.breachMax = Math.max(4, combat.breachMax - 2);
      },
    },
  },

  breach_horn: {
    id: "breach_horn",
    name: "Breach Horn",
    icon: "✧",
    description: "When you Open the Veil, also apply 2 Vulnerable to all enemies.",
    hooks: {
      onVeilOpened: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        for (const e of combat.enemies) {
          if (e.dead || e.hp <= 0) continue;
          ctx.engine.addStatus(e, "vulnerable", 2);
        }
      },
    },
  },

  veil_lattice: {
    id: "veil_lattice",
    name: "Veil Lattice",
    icon: "◈",
    description: "Every 2nd card played each turn grants 1 extra Breach.",
    hooks: {
      onTurnStart: (ctx) => {
        (ctx.state as any).__veilLatticeCount = 0;
      },
      onAfterCardPlayed: (ctx) => {
        const s = ctx.state as any;
        s.__veilLatticeCount = (s.__veilLatticeCount ?? 0) + 1;
        if (s.__veilLatticeCount % 2 === 0) {
          ctx.engine.gainBreach(1, "relic");
        }
      },
    },
  },

  /* ----------------- More general relics ----------------- */

  shard_reservoir: {
    id: "shard_reservoir",
    name: "Shard Reservoir",
    icon: "◇",
    description: "Gain 15 max HP when acquired.",
    hooks: {
      onCombatStart: (ctx) => {
        if (!ctx.state.run) return;
        if ((ctx.state as any).__shardReservoirApplied) return;
        ctx.state.run.maxHp += 15;
        ctx.state.run.hp = Math.min(ctx.state.run.maxHp, ctx.state.run.hp + 15);
        (ctx.state as any).__shardReservoirApplied = true;
      },
    },
  },

  prism_lens: {
    id: "prism_lens",
    name: "Prism Lens",
    icon: "◎",
    description: "The first card you draw each turn is upgraded for this combat.",
    hooks: {
      onTurnStart: (ctx) => {
        (ctx.state as any).__prismArmed = true;
      },
      onCardDrawn: (ctx) => {
        const s = ctx.state as any;
        if (!s.__prismArmed) return;
        if (ctx.card && !ctx.card.upgraded) {
          ctx.card.upgraded = true;
        }
        s.__prismArmed = false;
      },
    },
  },

  warding_sigil: {
    id: "warding_sigil",
    name: "Warding Sigil",
    icon: "⬢",
    description: "Gain 5 Block at the start of every turn.",
    hooks: {
      onTurnStart: (ctx) => {
        if (ctx.state.run) ctx.engine.gainBlock(ctx.state.run, 5);
      },
    },
  },

  bitter_chalice: {
    id: "bitter_chalice",
    name: "Bitter Chalice",
    icon: "⚱",
    description: "Gain +1 Energy per turn. Take 1 damage at the start of each turn.",
    hooks: {
      onTurnStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        combat.energy += 1;
        if (ctx.state.run) ctx.state.run.hp = Math.max(1, ctx.state.run.hp - 1);
      },
    },
  },

  ember_ring: {
    id: "ember_ring",
    name: "Ember Ring",
    icon: "◯",
    description: "At the start of each turn, apply 1 Burn to a random enemy.",
    hooks: {
      onTurnStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        const alive = combat.enemies.filter((e) => !e.dead && e.hp > 0);
        if (alive.length === 0) return;
        // Deterministic: pick the lowest-HP alive enemy to avoid RNG here.
        alive.sort((a, b) => a.hp - b.hp);
        ctx.engine.addStatus(alive[0], "burn", 1);
      },
    },
  },

  cracked_hourglass: {
    id: "cracked_hourglass",
    name: "Cracked Hourglass",
    icon: "⧗",
    description: "Every 3rd turn, gain 1 extra Energy.",
    hooks: {
      onTurnStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        if (combat.turn > 0 && combat.turn % 3 === 0) combat.energy += 1;
      },
    },
  },

  serpent_tooth: {
    id: "serpent_tooth",
    name: "Serpent Tooth",
    icon: "☠",
    description: "At the start of each combat, apply 3 Poison to each enemy.",
    hooks: {
      onCombatStart: (ctx) => {
        const combat = ctx.state.combat;
        if (!combat) return;
        for (const e of combat.enemies) ctx.engine.addStatus(e, "poison", 3);
      },
    },
  },

  gilded_skull: {
    id: "gilded_skull",
    name: "Gilded Skull",
    icon: "✦",
    description: "Gain 8 extra gold at the end of every combat.",
    hooks: {
      onCombatReward: (ctx) => {
        if (ctx.state.run) ctx.state.run.gold += 8;
      },
    },
  },

  martyrs_locket: {
    id: "martyrs_locket",
    name: "Martyr's Locket",
    icon: "♰",
    description: "The first time you would drop below 25% HP each combat, heal 10 HP.",
    hooks: {
      onAfterDamage: (ctx) => {
        if (!ctx.state.run) return;
        if ((ctx.state as any).__locketUsed) return;
        const hpFraction = ctx.state.run.hp / Math.max(1, ctx.state.run.maxHp);
        if (hpFraction > 0 && hpFraction < 0.25) {
          ctx.engine.healPlayer(10);
          (ctx.state as any).__locketUsed = true;
        }
      },
      onCombatStart: (ctx) => {
        (ctx.state as any).__locketUsed = false;
      },
    },
  },
};

export function isValidRelicId(id: string): id is RelicId {
  return Object.prototype.hasOwnProperty.call(RELIC_DB, id);
}

/**
 * Relic rarity classification. Kept in a single table rather than inlined on
 * each entry so balance passes stay readable. Any relic missing from this
 * table defaults to "Common" via {@link RelicData.rarity}.
 *
 * Rarity guide:
 *   Common   — modest, unconditional, per-combat utility
 *   Uncommon — stronger conditional effects, situational synergies
 *   Rare     — build-defining passives or dramatic risk/reward
 *   Boss     — reserved for future final-encounter rewards
 */
const RELIC_RARITY: Record<RelicId, "Common" | "Uncommon" | "Rare" | "Boss"> = {
  // Common
  cracked_core: "Common",
  azure_battery: "Common",
  mirror_seed: "Common",
  brass_lung: "Common",
  paper_moon: "Common",
  obsidian_scale: "Common",
  cleric_vial: "Common",
  cracked_lens: "Common",
  warding_sigil: "Common",
  gilded_skull: "Common",
  ember_ring: "Common",

  // Uncommon
  velvet_fang: "Uncommon",
  thorn_crown: "Uncommon",
  stasis_coil: "Uncommon",
  hollow_bell: "Uncommon",
  ember_core: "Uncommon",
  iron_will: "Uncommon",
  vein_pendant: "Uncommon",
  grave_ember: "Uncommon",
  rift_catalyst: "Uncommon",
  veilroot: "Uncommon",
  serpent_tooth: "Uncommon",
  cracked_hourglass: "Uncommon",
  shard_reservoir: "Uncommon",

  // Rare
  prism_lens: "Rare",
  void_mantle: "Rare",
  breach_horn: "Rare",
  veil_lattice: "Rare",
  bitter_chalice: "Rare",
  martyrs_locket: "Rare",
};

// Apply rarities to the canonical RELIC_DB so renderers and systems see a
// single source of truth.
for (const [id, rarity] of Object.entries(RELIC_RARITY)) {
  const relic = RELIC_DB[id as RelicId];
  if (relic) relic.rarity = rarity;
}
