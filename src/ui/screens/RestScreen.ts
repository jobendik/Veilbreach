import type { GameState } from "../../core/Types";

/**
 * Rest site screen. The player picks one of two camp services (heal or
 * upgrade a card) and the rest site is consumed. Both buttons become
 * disabled once `rest.used` is true.
 */
export function renderRestScreen(state: GameState): string {
  const run = state.run!;
  const rest = state.rest!;
  const used = rest.used;

  return `
    <main class="screen rest-screen">
      <section class="rest-box">
        <div class="eyebrow">Rest Site</div>
        <h2>Campfire</h2>
        <p class="subtitle left-aligned">
          HP ${run.hp}/${run.maxHp}. Choose one camp service — the fire will
          burn out after.
        </p>
        <div class="rest-actions">
          <button class="primary"
                  data-action="rest-heal"
                  ${used ? "disabled" : ""}
                  type="button">
            Rest: Heal ${rest.healAmount} HP
          </button>
          <button data-action="rest-upgrade"
                  ${used || !rest.canUpgrade ? "disabled" : ""}
                  type="button">
            Smith: Upgrade a Card
          </button>
          <button class="ghost" data-action="rest-leave" type="button">
            Leave
          </button>
        </div>
      </section>
    </main>
  `;
}
