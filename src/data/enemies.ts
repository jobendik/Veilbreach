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

  /* ---------------------- New enemies ---------------------- */

  choir_shade: {
    id: "choir_shade",
    name: "Choir Shade",
    maxHp: 32,
    archetype: "Status stacker",
    color: ["#2a2d60", "#b0a8ff"],
    chooseIntent(_enemy, combat) {
      const cycle = combat.turn % 3;
      if (cycle === 1) {
        return { type: "debuff", label: "Hymn", icon: "♪", status: "weak", amount: 2, text: "Apply 2 Weak" };
      }
      if (cycle === 2) {
        return { type: "debuff", label: "Dirge", icon: "♫", status: "frail", amount: 2, text: "Apply 2 Frail" };
      }
      return { type: "attack", label: "Wail", icon: "⚔", amount: 9, text: "Attack 9" };
    },
  },

  siege_automaton: {
    id: "siege_automaton",
    name: "Siege Automaton",
    maxHp: 58,
    archetype: "Heavy hitter",
    color: ["#4a4038", "#d9c48a"],
    chooseIntent(_enemy, combat) {
      const cycle = combat.turn % 3;
      if (cycle === 1) {
        return { type: "buff", label: "Calibrate", icon: "◆", status: "strength", amount: 2, text: "+2 Strength" };
      }
      if (cycle === 2) {
        return { type: "defend", label: "Brace", icon: "⬡", amount: 8, text: "Gain 8 Block" };
      }
      return { type: "attack", label: "Siege Cannon", icon: "⚔", amount: 16, text: "Attack 16" };
    },
  },

  flare_imp: {
    id: "flare_imp",
    name: "Flare Imp",
    maxHp: 24,
    archetype: "Burn spammer",
    color: ["#7a2f1b", "#ffb060"],
    chooseIntent(_enemy, combat) {
      if (combat.turn % 2 === 0) {
        return { type: "debuff", label: "Scald", icon: "☼", status: "burn", amount: 3, text: "Apply 3 Burn" };
      }
      return { type: "attack", label: "Ember Dart", icon: "⚔", amount: 6, text: "Attack 6" };
    },
  },

  furnace_saint: {
    id: "furnace_saint",
    name: "Furnace Saint",
    maxHp: 78,
    archetype: "Elite — burn & heavy attacks",
    color: ["#6a1f22", "#ff7a3a"],
    chooseIntent(enemy, combat) {
      const cycle = combat.turn % 4;
      if (cycle === 1) {
        return { type: "debuff", label: "Crucible", icon: "☼", status: "burn", amount: 4, text: "Apply 4 Burn" };
      }
      if (cycle === 2) {
        return {
          type: "attackDebuff", label: "Sear", icon: "⚔☼",
          amount: 10, status: "burn", statusAmount: 2, text: "Attack 10 + Burn",
        };
      }
      if (cycle === 3) {
        return {
          type: "defendBuff", label: "Sanctify", icon: "⬡✦",
          amount: 10, status: "strength", statusAmount: 1, text: "10 Block + STR",
        };
      }
      const amt = enemy.hp <= enemy.maxHp * 0.5 ? 18 : 14;
      return { type: "attack", label: "Pyre Hammer", icon: "⚔", amount: amt, text: `Attack ${amt}` };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Additional normal & elite enemies                                   */
  /* ------------------------------------------------------------------ */

  stone_golem: {
    id: "stone_golem",
    name: "Stone Golem",
    maxHp: 48,
    archetype: "Slow bruiser",
    color: ["#4a4b52", "#c2c5cf"],
    chooseIntent(_enemy, combat) {
      if (combat.turn % 3 === 0) {
        return { type: "defendBuff", label: "Harden", icon: "⬡✦", amount: 12, status: "strength", statusAmount: 1, text: "12 Block + STR" };
      }
      return { type: "attack", label: "Slam", icon: "⚔", amount: 12, text: "Attack 12" };
    },
  },

  void_minnow: {
    id: "void_minnow",
    name: "Void Minnow",
    maxHp: 18,
    archetype: "Nuisance swarm",
    color: ["#2a1f52", "#9a7cff"],
    chooseIntent(_enemy, combat) {
      if (combat.turn % 2 === 0) {
        return { type: "debuff", label: "Nip", icon: "✦", status: "weak", amount: 1, text: "Apply 1 Weak" };
      }
      return { type: "attack", label: "Bite", icon: "⚔", amount: 4, text: "Attack 4" };
    },
  },

  hex_priest: {
    id: "hex_priest",
    name: "Hex Priest",
    maxHp: 40,
    archetype: "Frail-stacker caster",
    color: ["#3b2262", "#c08bff"],
    chooseIntent(_enemy, combat) {
      const cycle = combat.turn % 3;
      if (cycle === 0) return { type: "debuff", label: "Wither", icon: "▽", status: "frail", amount: 2, text: "Apply 2 Frail" };
      if (cycle === 1) return { type: "attackDebuff", label: "Curse", icon: "⚔▽", amount: 6, status: "weak", statusAmount: 1, text: "Attack 6 + Weak" };
      return { type: "attack", label: "Hex Bolt", icon: "⚔", amount: 10, text: "Attack 10" };
    },
  },

  echo_warden: {
    id: "echo_warden",
    name: "Echo Warden",
    maxHp: 62,
    archetype: "Elite — counter & armor",
    color: ["#25415e", "#7fbcff"],
    chooseIntent(enemy, combat) {
      const cycle = combat.turn % 3;
      if (cycle === 0) {
        return { type: "defendBuff", label: "Echoing Guard", icon: "⬡✦", amount: 14, status: "plated", statusAmount: 2, text: "14 Block + Plated" };
      }
      if (cycle === 1) {
        return { type: "multiAttack", label: "Mirror Volley", icon: "⚔⚔", amount: 6, hits: 2, text: "Attack 6 x2" };
      }
      const amt = enemy.hp <= enemy.maxHp * 0.4 ? 16 : 11;
      return { type: "attack", label: "Resound", icon: "⚔", amount: amt, text: `Attack ${amt}` };
    },
  },

  /* ------------------------------------------------------------------ */
  /* Additional bosses                                                   */
  /* ------------------------------------------------------------------ */

  breach_wraith: {
    id: "breach_wraith",
    name: "Breach Wraith",
    maxHp: 118,
    archetype: "Boss — punishes full meters",
    color: ["#3a1f6d", "#c58aff"],
    chooseIntent(enemy, combat) {
      const phaseHalf = enemy.hp <= enemy.maxHp * 0.5;
      const cycle = combat.turn % 4;
      if (cycle === 0) {
        return { type: "debuff", label: "Veilbind", icon: "✦", status: "vulnerable", amount: 2, text: "Apply 2 Vulnerable" };
      }
      if (cycle === 1) {
        return { type: "attackDebuff", label: "Siphon", icon: "⚔✦", amount: phaseHalf ? 12 : 9, status: "weak", statusAmount: 2, text: `Attack ${phaseHalf ? 12 : 9} + Weak` };
      }
      if (cycle === 2) {
        return { type: "defendBuff", label: "Rift Ward", icon: "⬡✦", amount: 14, status: "strength", statusAmount: 1, text: "14 Block + STR" };
      }
      const amt = phaseHalf ? 22 : 16;
      return { type: "attack", label: "Rift Lance", icon: "⚔", amount: amt, text: `Attack ${amt}` };
    },
  },

  rust_titan: {
    id: "rust_titan",
    name: "Rust Titan",
    maxHp: 128,
    archetype: "Boss — armored juggernaut",
    color: ["#5a3a1d", "#e6b06a"],
    chooseIntent(enemy, combat) {
      const phaseHalf = enemy.hp <= enemy.maxHp * 0.5;
      const cycle = combat.turn % 5;
      if (cycle === 0) {
        return { type: "defendBuff", label: "Plate Up", icon: "⬡✦", amount: 16, status: "plated", statusAmount: 3, text: "16 Block + Plated" };
      }
      if (cycle === 1) {
        return { type: "attack", label: "Quake", icon: "⚔", amount: 14, text: "Attack 14" };
      }
      if (cycle === 2) {
        return { type: "multiAttack", label: "Gatling", icon: "⚔⚔", amount: phaseHalf ? 5 : 4, hits: 3, text: `Attack ${phaseHalf ? 5 : 4} x3` };
      }
      if (cycle === 3) {
        return { type: "debuff", label: "Pressure", icon: "▽", status: "frail", amount: 2, text: "Apply 2 Frail" };
      }
      const amt = phaseHalf ? 28 : 20;
      return { type: "attack", label: "Cleave", icon: "⚔", amount: amt, text: `Attack ${amt}` };
    },
  },
};

export function isValidEnemyId(id: string): id is EnemyId {
  return Object.prototype.hasOwnProperty.call(ENEMY_DB, id);
}
