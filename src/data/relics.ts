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
      onTurnStart: (ctx) => {
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
};

export function isValidRelicId(id: string): id is RelicId {
  return Object.prototype.hasOwnProperty.call(RELIC_DB, id);
}
