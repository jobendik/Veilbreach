import type { Encounter, EncounterPools } from "../core/Types";

/**
 * Encounter pools — the map generator picks encounters from here when it
 * builds a run's map. Each entry is a concrete fight, not a single enemy id,
 * so composition (e.g. "two choir shades") is explicit and deterministic.
 */
export const ENCOUNTER_POOLS: EncounterPools = {
  normal: [
    { name: "Outer Gate",         type: "normal", enemies: ["shardling", "flare_imp"] },
    { name: "Scorched Walk",      type: "normal", enemies: ["flare_imp", "flare_imp", "rust_hound"] },
    { name: "Toxic Reliquary",    type: "normal", enemies: ["venomist", "rust_hound"] },
    { name: "Chapel of Wires",    type: "normal", enemies: ["ritualist", "shardling"] },
    { name: "Hymn of Ash",        type: "normal", enemies: ["choir_shade", "choir_shade"] },
    { name: "Siege Yard",         type: "normal", enemies: ["siege_automaton", "shardling"] },
    { name: "Iron Passage",       type: "normal", enemies: ["ironwarden", "flare_imp"] },
    { name: "Hollow Choir",       type: "normal", enemies: ["choir_shade", "ritualist"] },
    { name: "Rust Pack",          type: "normal", enemies: ["rust_hound", "rust_hound"] },
    { name: "Toxic Pit",          type: "normal", enemies: ["venomist", "venomist"] },
    { name: "The Prowling Shard", type: "normal", enemies: ["shardling", "shardling", "flare_imp"] },
    { name: "Golem Watch",        type: "normal", enemies: ["stone_golem"] },
    { name: "Void Shoal",         type: "normal", enemies: ["void_minnow", "void_minnow", "void_minnow"] },
    { name: "Hex Cloister",       type: "normal", enemies: ["hex_priest", "shardling"] },
    { name: "Grey Quarry",        type: "normal", enemies: ["stone_golem", "rust_hound"] },
    { name: "Null Minnows",       type: "normal", enemies: ["void_minnow", "choir_shade"] },
    { name: "Rite of Frailty",    type: "normal", enemies: ["hex_priest", "venomist"] },
  ],
  elite: [
    { name: "The Pyre Altar",     type: "elite",  enemies: ["furnace_saint"] },
    { name: "Iron Procession",    type: "elite",  enemies: ["ironwarden", "siege_automaton"] },
    { name: "Ritual Converge",    type: "elite",  enemies: ["ritualist", "venomist"] },
    { name: "Echo Chamber",       type: "elite",  enemies: ["echo_warden"] },
    { name: "Stone & Bone",       type: "elite",  enemies: ["stone_golem", "hex_priest"] },
  ],
  boss: [
    { name: "The Seraph Engine",  type: "boss",   enemies: ["void_seraph"] },
    { name: "The Breach Wraith",  type: "boss",   enemies: ["breach_wraith"] },
    { name: "Rust Titan",         type: "boss",   enemies: ["rust_titan"] },
  ],
};

/**
 * Legacy flat list; kept for any code path that still indexes encounters
 * linearly. The map-driven run builds its own encounter names per node.
 */
export const ENCOUNTERS: Encounter[] = [
  ...ENCOUNTER_POOLS.normal,
  ...ENCOUNTER_POOLS.elite,
  ...ENCOUNTER_POOLS.boss,
];
