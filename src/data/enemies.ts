import type { EnemyData, EnemyId } from "../core/Types";

/**
 * All enemies in the game. Intents are deterministic functions of the enemy's
 * current HP and the combat turn number — no randomness inside `chooseIntent`
 * so the combat engine stays reproducible via the run RNG.
 */
export const ENEMY_DB: Record<EnemyId, EnemyData> = {
  shardling: {
    id: "shardling",
    name: "Shardling",
    maxHp: 30,
    archetype: "Glass cannon attacker",
    color: ["#6b4cff", "#ff5f92"],
    chooseIntent(_enemy, combat) {
      const turn = combat.turn;
      if (turn % 3 === 0) {
        return {
          type: "multiAttack",
          label: "Flurry",
          icon: "⚔⚔",
          amount: 5,
          hits: 2,
          text: "Attack 5 x2",
        };
      }
      const dmg = 9 + Math.floor(turn / 3);
      return {
        type: "attack",
        label: "Slash",
        icon: "⚔",
        amount: dmg,
        text: `Attack ${dmg}`,
      };
    },
  },

  ironwarden: {
    id: "ironwarden",
    name: "Iron Warden",
    maxHp: 46,
    archetype: "Defender",
    color: ["#2c6291", "#70d7ff"],
    chooseIntent(enemy, combat) {
      if (enemy.hp < enemy.maxHp * 0.55 && combat.turn % 2 === 1) {
        return {
          type: "defend",
          label: "Fortify",
          icon: "⬡",
          amount: 12,
          text: "Gain 12 Block",
        };
      }
      if (combat.turn % 3 === 0) {
        return {
          type: "buff",
          label: "Plate Up",
          icon: "◆",
          status: "plated",
          amount: 3,
          text: "+3 Plated",
        };
      }
      return {
        type: "attack",
        label: "Shield Ram",
        icon: "⚔",
        amount: 8,
        text: "Attack 8",
      };
    },
  },

  venomist: {
    id: "venomist",
    name: "Venomist",
    maxHp: 36,
    archetype: "Poison enemy",
    color: ["#2e6b3f", "#7ef680"],
    chooseIntent(_enemy, combat) {
      if (combat.turn % 3 === 1) {
        return {
          type: "debuff",
          label: "Toxin",
          icon: "☠",
          status: "poison",
          amount: 4,
          text: "Apply 4 Poison",
        };
      }
      if (combat.turn % 3 === 2) {
        return {
          type: "attackDebuff",
          label: "Venom Bite",
          icon: "⚔☠",
          amount: 6,
          status: "weak",
          statusAmount: 1,
          text: "Attack 6 + Weak",
        };
      }
      return {
        type: "debuff",
        label: "Nerve Mist",
        icon: "▽",
        status: "frail",
        amount: 2,
        text: "Apply 2 Frail",
      };
    },
  },

  ritualist: {
    id: "ritualist",
    name: "Ritualist",
    maxHp: 40,
    archetype: "Scaling caster",
    color: ["#53306f", "#d76dff"],
    chooseIntent(enemy, combat) {
      if (combat.turn === 1) {
        return {
          type: "buff",
          label: "Ritual",
          icon: "◆",
          status: "ritual",
          amount: 1,
          text: "+1 Ritual",
        };
      }
      if (combat.turn % 4 === 0) {
        return {
          type: "attack",
          label: "Dark Pulse",
          icon: "⚔",
          amount: 15,
          text: "Attack 15",
        };
      }
      const str = enemy.statuses.strength ?? 0;
      const dmg = 7 + str;
      return {
        type: "attack",
        label: "Hex Bolt",
        icon: "⚔",
        amount: dmg,
        text: `Attack ${dmg}`,
      };
    },
  },

  rust_hound: {
    id: "rust_hound",
    name: "Rust Hound",
    maxHp: 34,
    archetype: "Aggressive debuffer",
    color: ["#7c4b2b", "#ff9c50"],
    chooseIntent(_enemy, combat) {
      if (combat.turn % 2 === 0) {
        return {
          type: "attackDebuff",
          label: "Rend",
          icon: "⚔◇",
          amount: 7,
          status: "vulnerable",
          statusAmount: 1,
          text: "Attack 7 + Vuln",
        };
      }
      return {
        type: "attack",
        label: "Lunge",
        icon: "⚔",
        amount: 11,
        text: "Attack 11",
      };
    },
  },

  void_seraph: {
    id: "void_seraph",
    name: "Void Seraph",
    maxHp: 112,
    boss: true,
    archetype: "Boss with rotating phases",
    color: ["#271e5f", "#ff58ae"],
    chooseIntent(enemy, combat) {
      const phaseTwo = enemy.hp <= enemy.maxHp * 0.5;
      const cycle = combat.turn % 5;

      if (phaseTwo && !enemy.phaseAnnounced) {
        // Don't mutate state inside chooseIntent. The engine will flip
        // phaseAnnounced when it executes the bossPhase intent.
        return {
          type: "bossPhase",
          label: "Awaken",
          icon: "✦",
          status: "strength",
          amount: 3,
          blockGain: 8,
          text: "+3 Strength, 8 Block",
        };
      }
      if (cycle === 1) {
        const amt = phaseTwo ? 7 : 5;
        return {
          type: "multiAttack",
          label: "Starfall",
          icon: "⚔⚔",
          amount: amt,
          hits: 3,
          text: `Attack ${amt} x3`,
        };
      }
      if (cycle === 2) {
        const amt = phaseTwo ? 3 : 2;
        return {
          type: "debuff",
          label: "Gravity Curse",
          icon: "◇",
          status: "vulnerable",
          amount: amt,
          text: `Apply ${amt} Vuln`,
        };
      }
      if (cycle === 3) {
        return {
          type: "defendBuff",
          label: "Astral Guard",
          icon: "⬡✦",
          amount: 14,
          status: "strength",
          statusAmount: 1,
          text: "14 Block + STR",
        };
      }
      if (cycle === 4) {
        const amt = phaseTwo ? 18 : 14;
        return {
          type: "attackDebuff",
          label: "Null Beam",
          icon: "⚔▽",
          amount: amt,
          status: "weak",
          statusAmount: 2,
          text: `Attack ${amt} + Weak`,
        };
      }
      const amt = phaseTwo ? 24 : 18;
      return {
        type: "attack",
        label: "Collapse",
        icon: "⚔",
        amount: amt,
        text: `Attack ${amt}`,
      };
    },
  },
};

export function isValidEnemyId(id: string): id is EnemyId {
  return Object.prototype.hasOwnProperty.call(ENEMY_DB, id);
}
