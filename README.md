# Veilbreach: Relic Deck

A single-player roguelike deckbuilder prototype. Built with TypeScript, Vite,
and vanilla DOM rendering — no React, no Vue, no heavy framework, no external
art or audio assets required.

This project is a refactor of an earlier single-file HTML prototype into a
modular TypeScript codebase suitable as a portfolio piece or foundation for
a real roguelike deckbuilder. The gameplay, card set, enemies, relics, event,
and progression from the original have all been preserved.

---

## Running

Requires Node.js 18+ and npm.

```bash
npm install
npm run dev      # local dev server on http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
npm run typecheck
```

---

## How to play

- **Start New Run** from the main menu.
- Click cards in hand to play them. Energy cost must be met (top-left).
- Targeted cards (Attack) require clicking an enemy; self cards resolve
  immediately; all-enemies cards hit every living enemy.
- **End Turn** (button, or press **E**) ends your turn. Enemies then act
  according to their visible intents.
- After each combat: pick a card reward (or skip), and optionally use camp
  services to heal, upgrade, or remove a card. Click **Continue** to advance.
- Between encounters 2 and 3, the Mirror Camp event offers rest / upgrade /
  sacrifice.
- Clear three normal encounters and the final boss to win.

**Keyboard:** `E` ends the turn, `Escape` closes a modal or deselects a card,
`Enter`/`Space` clicks the focused card or enemy.

---

## Project structure

```
veilbreach-relic-deck/
├── index.html                    # Mount points for #app, #toastZone, #modalRoot, #errorRoot
├── package.json
├── tsconfig.json                 # Strict TS, target ES2021
├── vite.config.ts
└── src/
    ├── main.ts                   # Boot file
    ├── audio/
    │   └── AudioSystem.ts        # Procedural Web Audio
    ├── core/
    │   ├── Types.ts              # All discriminated unions and interfaces
    │   ├── RNG.ts                # Seeded mulberry32 PRNG with save-ready state
    │   ├── Rules.ts              # Damage/block math
    │   ├── Hooks.ts              # Relic hook dispatcher
    │   ├── GameState.ts          # Initial-state factory
    │   ├── Game.ts               # Top-level controller
    │   ├── CombatEngine.ts       # Turn structure, play loop, enemy AI
    │   ├── EffectResolver.ts     # Registry-based effect handlers
    │   ├── SaveSystem.ts         # Validated save/load with recovery
    │   ├── RewardSystem.ts       # Post-combat rewards (single-advance)
    │   └── EventSystem.ts        # Mid-run Mirror Camp event
    ├── data/
    │   ├── config.ts             # Knob constants + starting deck
    │   ├── statuses.ts           # Status metadata
    │   ├── cards.ts              # 28-card database
    │   ├── enemies.ts            # 6 enemies including boss
    │   ├── relics.ts             # 6 relics
    │   └── encounters.ts         # The 4-encounter run
    ├── ui/
    │   ├── UI.ts                 # Facade (implements GameHost)
    │   ├── Renderer.ts           # Full + partial DOM rendering
    │   ├── InputController.ts    # Single delegated click + keyboard handler
    │   ├── Toast.ts
    │   ├── FloatingText.ts
    │   ├── Modal.ts
    │   ├── ErrorBoundary.ts
    │   ├── screens/              # MenuScreen, CombatScreen, RewardScreen,
    │   │                         # EventScreen, ResultScreen
    │   └── components/           # CardView, PlayerPanel, EnemyView,
    │                             # StatusView, RelicView, CombatLog
    └── styles/
        ├── main.css              # Design tokens + imports
        ├── layout.css
        ├── cards.css
        ├── combat.css
        ├── screens.css
        └── responsive.css        # Fixed media queries
```

---

## Critical bugs fixed (from the original prototype)

1. **Broken CSS markdown fences.** The original had literal ```` ``` ```` fences
   inside the `@media` queries, so responsive layout silently broke at
   narrower viewports. All CSS is now well-formed and validated.

2. **Strict input/action lock.** A `state.isResolving` flag now guards every
   gameplay action. Cards, End Turn, enemies, reward buttons, event choices,
   and keyboard shortcuts all check this lock. It's set with `try/finally`
   so a thrown error always releases it. The UI visually reflects the
   lock via the `.is-resolving` class on the combat screen.

3. **Save only at stable checkpoints.** `SaveSystem.canSave(state)` refuses
   to save during enemy turns or mid-resolution. `beforeunload` uses the
   same guard, so refreshing during async flows no longer produces a
   corrupted resume state.

4. **Save validation with safe recovery.** Loads go through a full schema
   validator (card IDs, enemy IDs, relic IDs, numeric fields, screen enum,
   combat internal validity). On any failure the save is cleared and an
   error overlay explains the situation — no more white screen.

5. **Correct phase-based status timing.** Poison and burn only tick on
   their own unit's turn start; Weak/Vuln/Frail/Mark decay at the end of
   the affected unit's turn; Ritual triggers at enemy turn end; Plated
   grants block at turn start; Thorns retaliates on attack damage only.
   Before the fix, player poison/burn could tick twice per round.

6. **Deterministic reward advance.** `RewardState.isAdvancing` guards
   against double clicks on Continue. No more `setTimeout(() => advance())`
   racing a direct `advance()` call.

7. **Animation-safe rendering.** A full `renderScreen()` happens on screen
   transitions; during combat action resolution, `updateCombat()` performs
   partial DOM updates (HP bars, energy, statuses, piles, hand, enemies)
   without replacing the whole combat screen. Card-play animations, hit
   flashes, and floating text are no longer destroyed mid-effect.

8. **Event delegation.** A single delegated click handler on `#app`
   dispatches based on `data-action`, `data-card`, and `data-enemy`. No
   more rebinding listeners after every render.

9. **Seeded RNG.** A mulberry32 PRNG backs every source of randomness —
   shuffles, card rewards, relic offers, random-discard-to-hand, random
   in-hand upgrades. Its internal state is serialized into saves, so a
   reloaded run reproduces exactly the sequence the original would have
   produced.

10. **Effect handler registry.** Effects are a discriminated union
    (`Effect` in `Types.ts`) and each type maps to one handler in
    `EFFECT_HANDLERS`. Adding a new effect is one union entry + one
    handler. Damage and block have specialized dispatch paths for
    multi-hit pacing and source resolution.

11. **Proper hook/event system.** Relics now declare `hooks` that listen
    on named events (`onCombatStart`, `onTurnStart`, `onCombatReward`,
    `onCardDrawn`, `onEnemyKilled`, etc). The dispatcher fires them in
    acquisition order and isolates exceptions so a bad relic can't crash
    combat.

12. **Global error boundary.** `window.error` and
    `unhandledrejection` are caught and replaced with an overlay that
    offers Return to Menu, Reload, or Clear Save. The game never produces
    a blank white screen.

---

## Adding content

### Adding a card
In `src/data/cards.ts`, add a new entry to `CARD_DB`:

```ts
my_new_card: {
  id: "my_new_card",
  name: "My New Card",
  cost: 1,
  type: "Attack",
  rarity: "Common",
  targetType: "enemy",
  fallbackColor: ["#303853", "#7777ff"],
  imagePath: "",      // add a PNG path later to replace procedural art
  description: "Deal 8 damage. Draw 1.",
  effects: [
    { type: "damage", amount: 8 },
    { type: "draw", amount: 1 },
  ],
  upgrade: {
    description: "Deal 11 damage. Draw 1.",
    effects: [
      { type: "damage", amount: 11 },
      { type: "draw", amount: 1 },
    ],
  },
},
```

The rarity weight in `src/data/config.ts` automatically picks it up in card
rewards.

### Adding an effect type
1. Add a new variant to the `Effect` union in `src/core/Types.ts`.
2. Add a matching handler in `EFFECT_HANDLERS` in
   `src/core/EffectResolver.ts`.

### Adding a relic
In `src/data/relics.ts`:

```ts
my_relic: {
  id: "my_relic",
  name: "My Relic",
  icon: "◆",
  description: "Draw an extra card on turn 1.",
  hooks: {
    onTurnStart: (ctx) => {
      if (ctx.state.combat?.turn === 1) ctx.engine.drawCards(1);
    },
  },
},
```

### Replacing procedural card art
Set `imagePath` on any card to a PNG URL (e.g. `"/art/void_strike.png"`).
The renderer uses the image in the card art area and falls back to the
procedural sigil if the image fails to load.

---

## Known limitations / TODOs

- **No migration for v1 saves.** The save schema changed; v1 saves from
  the original single-file prototype are rejected with a clear message
  and cleared, not migrated. A migrator could be added in
  `SaveSystem.validateSaveData`.
- **Minimal unit tests.** The core logic is pure-functional enough to
  test, but the project doesn't ship a test runner yet. A Vitest setup
  against the `core/` modules would be a natural next step.
- **Visual polish is intentional but minimal.** The project prioritizes
  architecture over art direction; landing real card PNGs via `imagePath`
  is the first step toward a production look.
- **Enemy AI is deterministic from turn number.** `chooseIntent` doesn't
  use the run RNG today. That's intentional (makes behavior predictable
  for testing) but means there's no variety across identical encounters.
  Adding `rng` to the `chooseIntent` signature would be straightforward.
- **`onBeforeDamage` / `onAfterDamage` hooks exist in the type system
  but aren't fired yet.** Adding them in `applyDamage` is a few lines;
  they're reserved for future relics that modify damage calculations.
- **No i18n.** All strings are English literals in the screen modules.

---

## License

Prototype / portfolio code. Use at your own risk.
