import type { GameState } from "./Types";

/** The canonical "nothing is happening" state. */
export function createInitialState(): GameState {
  return {
    screen: "menu",
    run: null,
    combat: null,
    reward: null,
    event: null,
    selectedCardUid: null,
    log: [],
    isResolving: false,
  };
}
