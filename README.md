# Veilbreach

A single-player roguelike deckbuilder prototype. Built with TypeScript, Vite,
and vanilla DOM rendering — no React, no Vue, no heavy framework, no external
art or audio assets required.

The run is structured as a branching Act-1 map (Slay-the-Spire style) with
combats, elite encounters, shops, rest sites, treasures, random events, and
a final boss. Relics hook into a typed event system so new content is added
by editing data files rather than the engine.

---

## Running

Requires Node.js 18+ and npm.

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # production build into dist/
npm run preview    # preview the production build
npm run typecheck  # tsc --noEmit
npm test           # Vitest (RNG, save round-trip, status timing, hooks)
```

---

## How to play

1. **New Run** from the main menu. A procedurally generated map is rolled
   from the seed.
2. Click any highlighted node on the map to travel there. You can only reach
   nodes in the next row that are connected to your current node.
3. Node types:
   - **⚔ Combat** — a normal encounter.
   - **☠ Elite** — tougher fight, better rewards.
   - **♞ Boss** — final node of the act.
   - **☗ Shop** — buy cards, relics, potions; pay to remove a card.
   - **☍ Rest** — heal 30% max HP *or* upgrade one card (single use).
   - **◈ Treasure** — a free relic.
   - **❓ Event** — a narrative choice node.
4. Combat basics:
   - Click cards in hand to play them. Energy cost must be met.
   - Targeted (Attack) cards need an enemy click; self cards resolve
     immediately; all-enemies cards hit every living enemy.
   - **End Turn** button or press `E`.
5. Post-combat rewards: claim gold, a card pick (or skip), and sometimes a
   potion drop. Elites always drop a relic; the boss ends the run.
6. **Potions** sit in the top-bar slot(s). Self/AoE potions use on click;
   single-target potions *arm* on click — then click an enemy to use.
   Press `Escape` to cancel an armed potion.
7. Win by defeating the boss. A "lose" screen is shown if HP drops to 0 —
   including from event tolls.

**Keyboard:** `E` ends turn · `Escape` deselects/cancels · `Enter`/`Space`
activates the focused card/enemy.

---

## Project structure

```
src/
  main.ts                 # bootstrap
  core/                   # engine (pure, no DOM)
    Game.ts               # orchestrator, run lifecycle, save/load
    GameState.ts          # canonical empty state
    CombatEngine.ts       # turn flow, playCard, damage, hooks
    EffectResolver.ts     # card effect registry
    EventSystem.ts        # event node resolution
    ShopSystem.ts         # shop stock + purchases
    RestSystem.ts         # heal/upgrade camp
    TreasureSystem.ts     # relic chest
    PotionSystem.ts       # potion use/discard
    RewardSystem.ts       # post-combat reward flow
    MapGenerator.ts       # branching Act-1 map
    RNG.ts                # seeded Mulberry32
    Rules.ts              # damage math, status modifiers
    Hooks.ts              # fireHook dispatch
    SaveSystem.ts         # versioned localStorage save
    Types.ts              # all shared types
    __tests__/            # vitest specs
  data/                   # pure content
    cards.ts              # card database
    relics.ts             # relic database + hooks
    enemies.ts            # enemy database + intents
    encounters.ts         # encounter pools
    events.ts             # event database
    potions.ts            # potion database
    statuses.ts           # status metadata
    config.ts             # tunable numbers
  ui/                     # DOM rendering
    UI.ts                 # host facade
    Renderer.ts           # screen dispatcher
    InputController.ts    # single delegated click/key handler
    FloatingText.ts
    Toast.ts
    Modal.ts
    ErrorBoundary.ts
    components/           # CardView, EnemyView, StatusView, ...
    screens/              # MenuScreen, CombatScreen, MapScreen, ...
  styles/                 # plain CSS, one file per concern
```

---

## Systems

### Hook-based relics

Relics register listeners on named hooks fired by `CombatEngine`:

| Hook                    | When                                           |
|-------------------------|------------------------------------------------|
| `onCombatStart`         | Enemies instantiated, before turn 1            |
| `onTurnStart`           | After intents, before auto draw                |
| `onAfterTurnDraw`       | After the auto draw-to-handsize                |
| `onCalculateCardCost`   | During `canPlayCard` and at play-time          |
| `onBeforeCardPlayed`    | After energy subtract, before effects          |
| `onAfterCardPlayed`     | After effects, includes `target` in ctx        |
| `onBeforeDamage`        | Attack damage only, relics may mutate `amount` |
| `onAfterDamage`         | Fires for all damage types after block         |
| `onStatusTickDamage`    | Dedicated poison/burn tick hook                |
| `onBeforeBlock` / `onAfterBlock` | Block gain                             |
| `onEnemyKilled`         | HP reached 0                                   |
| `onCardDrawn` / `onCardExhausted` | Pile transitions                     |
| `onTurnEnd`             | After player end-of-turn statuses             |
| `onRewardGenerated` / `onCombatReward` | Post-combat                    |

Adding a relic means appending one object to `data/relics.ts` — no engine
changes required.

### Effect system

Cards and events compose from typed `Effect` records resolved by
`EffectResolver.ts`. Supported effects include `damage`, `block`, `draw`,
`drawIf`, `gainEnergy`, `applyStatus`, `heal`, `cleanse`, `doubleStatus`,
`gainPower`, `returnDiscardToHand`, `upgradeRandomInHand`, `loseHp`,
`scalingDamage`, `scalingBlock`, `exhaustHand`, `discardHand`, `scry`.

### Save/load

`SaveSystem` writes a versioned JSON blob to `localStorage`. Saves capture
the full run (deck, relics, potions, map topology, current node) and the
seeded RNG state so reloading mid-run is deterministic.

### RNG

Single seeded Mulberry32 instance. `Game.captureRngState()` is called at
every stable checkpoint so reloading never desynchronises from the live run.

---

## Content

- **72+ cards** across Attack / Skill / Power with upgrade variants.
- **18 relics**, each attached via hooks.
- **Multiple enemy archetypes** with distinct intent scripts and a boss.
- **8 events** with branching outcomes.
- **6 potions** covering self / enemy / allEnemies targeting.
- **Branching Act-1 maps** of 14 rows including a fixed start and boss row.

---

## Tests

```
npx vitest run
```

The suite covers:
- RNG determinism and shuffle stability.
- Save/load round-trip across every subsystem.
- Status tick / decay ordering.
- Damage pipeline hook firing (attack vs. status, before/after).

All tests must pass before a commit.

---

## Roadmap

- Act 2 and Act 3 maps with new enemies and a second/third boss.
- Curse and status-card designs.
- Meta progression (ascension tiers, persistent unlocks).
- Asset pipeline for card/relic art.
- More potions and a potion-belt upgrade.

---

## License

Prototype — all rights reserved to the author. Not yet licensed for reuse.
