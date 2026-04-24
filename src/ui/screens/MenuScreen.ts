export function renderMenuScreen(hasSave: boolean): string {
  return `
    <main class="screen menu-screen">
      <section class="logo">
        <div class="eyebrow">Single-player roguelike deckbuilder</div>
        <h1>Veilbreach<br>Relic Deck</h1>
        <p class="subtitle">
          Build a deck, read enemy intents, exploit statuses, collect relics,
          and breach the Seraph Engine. This prototype is fully playable,
          saveable, and designed for real card art replacement.
        </p>
        <div class="menu-actions">
          <button class="primary" data-action="new-run" type="button">Start New Run</button>
          <button ${hasSave ? "" : "disabled"} data-action="continue" type="button">Continue Saved Run</button>
          <button class="ghost" data-action="clear-save" ${hasSave ? "" : "disabled"} type="button">Clear Save</button>
        </div>
        <div class="menu-grid">
          <div class="feature-card">
            <strong>Data-driven cards</strong>
            <span>24+ cards use reusable effects, rarities, target rules, upgrade data, and PNG art slots.</span>
          </div>
          <div class="feature-card">
            <strong>Readable combat</strong>
            <span>Energy, block, draw/discard/exhaust piles, status tooltips, enemy intents, animated feedback.</span>
          </div>
          <div class="feature-card">
            <strong>Run progression</strong>
            <span>Three encounters, a camp event, card rewards, relics, deck editing, boss, win/loss, save.</span>
          </div>
        </div>
      </section>
    </main>
  `;
}
