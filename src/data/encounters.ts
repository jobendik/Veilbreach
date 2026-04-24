import type { Encounter } from "../core/Types";

export const ENCOUNTERS: Encounter[] = [
  { name: "Outer Gate", type: "normal", enemies: ["shardling", "ironwarden"] },
  { name: "Toxic Reliquary", type: "normal", enemies: ["venomist", "rust_hound"] },
  { name: "Chapel of Wires", type: "normal", enemies: ["ritualist", "shardling"] },
  { name: "The Seraph Engine", type: "boss", enemies: ["void_seraph"] },
];
