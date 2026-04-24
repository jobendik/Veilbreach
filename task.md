You are an expert senior game developer, JavaScript/TypeScript engineer, UI architect, and roguelike deckbuilder systems designer.

Your task is to take my existing single-file HTML game prototype, `game.html`, and refactor/improve it into a professional, modular, maintainable TypeScript project.

The game is called:

**Veilbreach: Relic Deck**

It is a single-player roguelike deckbuilder inspired by games like Slay the Spire, Monster Train, Balatro, Inscryption, and Across the Obelisk.

The existing version already works and includes:
- main menu
- start new run
- continue saved run
- localStorage save/load
- turn-based combat
- energy system
- draw pile, hand, discard pile, exhaust pile
- card rewards
- upgrades
- removals
- relics
- enemy intents
- statuses
- multiple encounters
- event branch
- final boss
- procedural audio
- CSS-based card visuals
- placeholder art pipeline through `imagePath`

Your job is **not** to replace the game with a new concept. Your job is to preserve the current game, fix its serious issues, improve the architecture, split the code into proper modules, and make the game more robust, polished, extensible, and portfolio-quality.

---

# IMPORTANT: Preserve the existing game

Do not throw away the game and create a different one.

Preserve:
- the title and core concept
- the existing cards, enemies, relics, encounters, statuses, and progression
- the current visual identity: dark sci-fi / mystical / neon / relic-deck atmosphere
- the same basic gameplay loop
- the same card data-driven design
- the same enemy intent design
- the same run structure
- the same save/load concept
- the same asset-ready card rendering idea

You may improve, reorganize, clean up, and expand where useful, but do not remove important existing functionality.

---

# Main objective

Refactor the single-file prototype into a clean TypeScript project with a professional modular structure.

Use:

- TypeScript
- Vite
- vanilla DOM rendering unless there is a strong reason to do otherwise
- no React
- no Vue
- no Svelte
- no heavy framework
- no backend
- no npm packages unless absolutely necessary
- no external art or audio assets required
- the game must run locally with `npm install` and `npm run dev`
- the project must build with `npm run build`

The result should feel like a proper small game project, not a pasted single-file demo.

---

# Suggested project structure

Create a structure similar to this:

```txt
veilbreach-relic-deck/
  index.html
  package.json
  tsconfig.json
  vite.config.ts

  src/
    main.ts

    data/
      cards.ts
      enemies.ts
      relics.ts
      encounters.ts
      statuses.ts
      config.ts

    core/
      Game.ts
      GameState.ts
      CombatEngine.ts
      EffectResolver.ts
      RewardSystem.ts
      EventSystem.ts
      SaveSystem.ts
      RNG.ts
      Rules.ts
      Hooks.ts
      Types.ts

    ui/
      UI.ts
      Renderer.ts
      screens/
        MenuScreen.ts
        CombatScreen.ts
        RewardScreen.ts
        EventScreen.ts
        ResultScreen.ts
      components/
        CardView.ts
        EnemyView.ts
        PlayerPanel.ts
        StatusView.ts
        RelicView.ts
        Modal.ts
        Toast.ts
        CombatLog.ts

    audio/
      AudioSystem.ts

    styles/
      main.css
      layout.css
      cards.css
      combat.css
      screens.css
      responsive.css


You may adjust the exact structure if needed, but keep the architecture clean and understandable.

Critical fixes that must be implemented
1. Remove broken CSS Markdown fences

The original game.html accidentally contains literal Markdown code fences inside the CSS media queries:

.hand-zone {
grid-template-columns: 1fr;
}

These must be removed.

The responsive CSS should be valid CSS.

Fix all media queries properly.

2. Add a strict input/action lock

The current game has async combat resolution but no strict lock. This is dangerous.

Example problem:

player plays a card
card resolution awaits animations/timing
during that wait, player can click another card or press End Turn
this can cause overlapping game logic, negative energy, skipped turns, broken targeting, or corrupted state

Implement a strict action lock.

Add something like:

state.isResolving = true;

or:

engine.beginAction();
engine.endAction();

Every gameplay input must check this lock before doing anything.

The lock must block:

clicking cards
clicking enemies
pressing End Turn
keyboard shortcuts
reward buttons
continue reward
modal card upgrade/remove actions
event choices
save/load-sensitive transitions
abandon/new run during resolution unless handled safely

Use a try/finally pattern so the lock is always released even if an error occurs:

if (state.isResolving) return;

state.isResolving = true;

try {
  await resolveAction();
} finally {
  state.isResolving = false;
  UI.render();
}

The UI should visually reflect locked state:

cards should not be clickable
End Turn should be disabled
buttons should be disabled where appropriate
show a subtle “Resolving…” indicator if useful
3. Save only at stable checkpoints

The current game can save during unstable async phases. This can produce broken reloads.

Example:

player refreshes during enemy turn
save stores combat.phase = "enemy"
async enemy turn is gone after reload
player reloads into enemy phase with no running enemy action
game is soft-locked

Fix this.

Rules:

do not save while isResolving === true
do not save during enemy turn unless you can reliably resume enemy turn
preferably save only at stable checkpoints:
main menu
start of player turn
reward screen
event screen
after reward choice
after deck edit
after combat victory
after starting a new encounter once the first player turn is ready

Implement:

SaveSystem.canSave(state): boolean

Example:

canSave(state) {
  if (state.isResolving) return false;
  if (state.screen === "win" || state.screen === "lose") return false;
  if (state.screen === "combat" && state.combat?.phase !== "player") return false;
  return true;
}

Also make beforeunload use this guard.

If the game is in a non-saveable phase, skip saving instead of writing an unsafe state.

4. Add save validation and recovery

The current save loading is too trusting.

Implement schema validation for saved data.

Validate at minimum:

save version exists
run exists
run.hp is a valid number
run.maxHp is a valid number
run.deck is an array
every card in deck has a known cardId
every relic ID exists in RELIC_DB
screen is one of the allowed screens
if screen is combat, combat must exist and must be internally valid
combat piles must be arrays
hand/draw/discard/exhaust cards must reference valid cards
enemies must reference valid enemies
statuses must be valid object maps
reward data must reference valid cards/relics
event state must be valid if screen is event

If validation fails:

do not crash
clear the bad save or quarantine it
show the player a clear message:
“Saved run could not be loaded because it was corrupted or from an older version.”
“Start a new run”
never produce a white screen

Use a safe result type:

type LoadResult =
  | { ok: true; data: SaveData }
  | { ok: false; reason: string };
5. Fix player status timing

The current status timing is mechanically wrong.

Problem:

tickStartOfTurn(player) is called at the start of player turn
then tickStartOfTurn(player) is also called in enemy turn
therefore player poison/burn can tick twice per round
player debuffs like Weak/Frail/Vulnerable may also expire too early

Create a formal turn phase model.

Recommended phases:

type CombatPhase =
  | "playerStart"
  | "playerAction"
  | "playerEnd"
  | "enemyStart"
  | "enemyAction"
  | "enemyEnd";

At minimum, clearly separate:

PLAYER_TURN_START
PLAYER_ACTION
PLAYER_TURN_END
ENEMY_TURN_START
ENEMY_ACTION
ENEMY_TURN_END

Define exactly when each status ticks and decays.

Suggested behavior:

player poison/burn ticks once at start of player turn
enemy poison/burn ticks once at start of each enemy’s own turn
Weak/Vulnerable/Frail should last through the affected unit’s meaningful action window
Mark should decay at a clearly defined time, probably end of affected unit’s turn or after being triggered, depending on design
Ritual should trigger at end of enemy turn
Plated should grant block at start of owner’s turn
Thorns should trigger when attacked

Create helper functions:

processStartOfTurnStatuses(unit)
processEndOfTurnStatuses(unit)
decayTemporaryStatuses(unit)

Do not scatter status rules randomly across combat functions.

6. Fix reward flow double-advance risk

Current reward flow can call advance() directly while also scheduling advance() through maybeContinue().

Make reward progression deterministic.

Rules:

choosing/skipping card marks card reward resolved
choosing relic marks relic reward resolved
optional services can be used independently
Continue button should advance exactly once
automatic advance should either be removed or carefully controlled
no double setTimeout(() => advance())
no duplicate encounter starts

Add a guard:

reward.isAdvancing = true;

or use the global isResolving lock.

7. Prevent animation destruction from full re-rendering

The current game calls UI.render() inside effect resolution. Since render() replaces innerHTML, it can destroy card animations before they finish.

Improve this.

Possible approaches:

Option A: Keep full render but avoid rendering during animations
collect state changes
play animation
then render once after the action resolves
Option B: Partial updates
update HP bars, block numbers, energy, piles, statuses, and log without replacing the entire DOM
only re-render full screen on screen transitions
Option C: Lightweight keyed renderer
implement a simple render/update layer without using a framework

Do not use React unless explicitly necessary. Prefer vanilla TypeScript.

At minimum:

do not destroy the card being animated before the animation finishes
do not repeatedly re-render the full combat screen after every tiny effect
preserve floating text and hit flashes
8. Replace repeated event listener rebinding with event delegation

The current UI binds new listeners after every render.

Refactor to event delegation where possible.

Instead of:

querySelectorAll(".card").forEach(el => {
  el.addEventListener("click", ...)
});

Use one central click handler:

app.addEventListener("click", (event) => {
  const actionEl = (event.target as HTMLElement).closest("[data-action]");
  const cardEl = (event.target as HTMLElement).closest("[data-card]");
  const enemyEl = (event.target as HTMLElement).closest("[data-enemy]");
});

Benefits:

less listener churn
fewer accidental duplicate handlers
easier input locking
cleaner UI architecture
9. Add seeded RNG

The current state stores a seed but still uses Math.random() everywhere.

Implement a deterministic seeded RNG.

Create:

class RNG {
  constructor(seed: number)
  next(): number
  int(min: number, max: number): number
  choice<T>(items: T[]): T
  shuffle<T>(items: T[]): T[]
  weightedChoice<T>(entries: { item: T; weight: number }[]): T
}

All game randomness must go through the run RNG:

shuffling draw pile
card rewards
relic rewards
enemy/random targeting if added
random discard retrieval
random upgrades

This makes runs reproducible and debugging easier.

The save file should store:

original seed
current RNG state

Do not just store initial seed if the generator state cannot resume correctly.

10. Improve the effect system

The current applyEffect() switch works, but it will become hard to maintain.

Create an effect handler registry.

Example:

const EFFECT_HANDLERS: Record<EffectType, EffectHandler> = {
  damage: async (ctx, effect) => {},
  block: async (ctx, effect) => {},
  draw: async (ctx, effect) => {},
  gainEnergy: async (ctx, effect) => {},
  applyStatus: async (ctx, effect) => {},
};

Create a clear EffectContext:

interface EffectContext {
  state: GameState;
  engine: CombatEngine;
  sourceCard: CardInstance;
  cardData: CardData;
  sourceUnit: Unit;
  targets: Unit[];
  rng: RNG;
}

The goal is:

cards remain data-driven
effect logic is centralized
adding a new effect is easy
effect resolution is testable
relic/power hooks can interact with effects
11. Add a hook/event system for relics and powers

The current relic hook system is good but limited.

Expand it into a cleaner event/hook system.

Support events like:

onCombatStart
onTurnStart
onTurnEnd
onBeforeCardPlayed
onAfterCardPlayed
onBeforeDamage
onAfterDamage
onBeforeBlock
onAfterBlock
onEnemyKilled
onCardDrawn
onCardExhausted
onRewardGenerated
onCombatReward

Damage should use a mutable calculation context:

interface DamageContext {
  source: Unit;
  target: Unit;
  card?: CardInstance;
  baseAmount: number;
  amount: number;
  damageType: "attack" | "status" | "thorns" | "pure";
  hits: number;
}

This allows future relics like:

first attack each turn deals +5 damage
gain 1 block whenever you draw a skill
poison deals +1 damage
attacks against Marked enemies deal +2
whenever an enemy dies, draw 1 card

Do not hardcode every future relic into calculateDamage().

Gameplay improvements to implement

After the critical fixes are done, improve the game feel and design.

1. Improve combat feedback

Add or improve:

card play animation
target impact feedback
enemy attack animation
player hit feedback
block impact feedback
poison/burn tick feedback
thorns feedback
boss phase transition feedback
reward reveal feedback
relic acquisition feedback

Keep it lightweight and CSS/DOM based.

No external assets required.

2. Improve UI clarity

The UI should clearly communicate:

current phase
whether input is locked
selected card target requirement
card cannot be played because of energy
card requires target
enemy is targetable
enemy intent
exact draw/discard/exhaust counts
player statuses and enemy statuses
relic tooltips
upgraded cards
temporary card costs

Add better tooltips if needed.

3. Improve card rendering

Keep the current DOM card design, but make it cleaner and more asset-ready.

Requirements:

card art area should support real PNGs through imagePath
missing image should gracefully fall back to procedural sigil art
upgraded cards should be visually distinct
unplayable cards should be visually distinct
selected cards should be visually distinct
card tooltip should show type, rarity, target type, and rules text
cards should remain readable on smaller screens
4. Improve responsive layout

Fix responsive CSS and test:

desktop
laptop
tablet width
narrow mobile width

At minimum:

no horizontal page overflow except card hand scrolling
hand remains usable
enemy cards remain readable
topbar stacks cleanly
reward screen remains usable
modal deck view remains usable
5. Improve combat balance only carefully

Do not wildly rebalance everything.

But review:

starting deck
enemy HP
enemy attack numbers
boss HP
reward frequency
relic power
healing amount
upgrade/remove availability

Make small improvements if obvious.

Keep the game beatable but not trivial.

TypeScript requirements

Define strong types for:

CardId
EnemyId
RelicId
StatusId
CardType
Rarity
TargetType
Effect
CardData
CardInstance
EnemyData
EnemyInstance
RelicData
Unit
PlayerRunState
CombatState
RewardState
EventState
GameScreen
GameState
SaveData

Avoid any unless absolutely necessary.

Use discriminated unions for card effects.

Example:

type Effect =
  | { type: "damage"; amount: number; hits?: number; target?: TargetType }
  | { type: "block"; amount: number }
  | { type: "draw"; amount: number }
  | { type: "gainEnergy"; amount: number }
  | { type: "applyStatus"; status: StatusId; amount: number; target: "self" | "enemy" }
  | { type: "heal"; amount: number; target: "self" }
  | { type: "cleanse"; statuses: StatusId[]; target: "self" | "enemy" }
  | { type: "doubleStatus"; status: StatusId; target: "enemy" }
  | { type: "gainPower"; power: PowerId; amount: number }
  | { type: "returnDiscardToHand"; amount: number; temporaryCost: number }
  | { type: "upgradeRandomInHand"; amount: number }
  | { type: "loseHp"; amount: number };

Make invalid card data hard to write.

Error handling requirements

The game should not crash to a blank screen.

Add a simple global error boundary:

window.addEventListener("error", ...)
window.addEventListener("unhandledrejection", ...)

If something fatal happens:

show an error overlay
explain that the game encountered an error
provide buttons:
return to main menu
clear save
reload page
log useful debug info to console

During development, keep detailed console errors.

Save/load requirements

Implement a save version:

const SAVE_VERSION = 2;

The save system must support:

save
load
validate
clear
hasSave
canSave
migrate old saves if simple
reject incompatible saves safely

When loading an old save from the previous single-file version:

either migrate it if feasible
or reject it gracefully with a clear message

No white screen.

Rendering/UI architecture requirements

Avoid full-screen re-rendering after every micro-effect.

A practical approach:

full render on screen changes
partial render/update during combat actions
event delegation for clicks
Toast system independent from main render
Modal system independent from main render
animations should not be destroyed mid-action

Create clear UI methods:

UI.renderScreen()
UI.renderCombat()
UI.updateCombatStats()
UI.updateHand()
UI.updateEnemies()
UI.updatePlayer()
UI.updatePiles()
UI.updateLog()
UI.showToast()
UI.showFloatingText()
UI.openDeckModal()
UI.closeModal()

Do not over-engineer. But separate responsibilities.

Audio requirements

Preserve the procedural Web Audio system.

Improve it if easy:

avoid creating audio context before user interaction
gracefully disable if Web Audio unsupported
add simple sound methods:
click
card
hit
block
poison
victory
defeat
relic
bossPhase
error

No external audio files.

Accessibility and UX

Add small but meaningful improvements:

buttons should have disabled states
keyboard shortcut E for End Turn should respect input lock
Escape should close modal or cancel selected card, but should not break resolving state
card selection should be clear
target prompt should be clear
tooltips should not overflow badly
text should remain readable
avoid relying only on color for important information
Testing / validation checklist

After implementing, verify:

Startup
game loads without console errors
main menu renders
Start New Run works
Continue button disabled if no save
Clear Save disabled if no save
Combat
cards can be played
targeted cards require target
all-enemy cards work
self cards work
energy cost is enforced
cards move to discard/exhaust correctly
draw pile reshuffles discard correctly
player can end turn
enemies execute intents
enemies die correctly
combat victory transitions to reward
player death transitions to defeat
Input lock
rapid card clicking cannot break state
pressing End Turn while card resolves does nothing
pressing E while resolving does nothing
clicking reward buttons repeatedly does not duplicate rewards
clicking Continue repeatedly does not start multiple encounters
Save/load
save on stable player turn
reload on player turn works
reload on reward screen works
reload on event screen works
corrupted save does not crash game
invalid card ID in save does not crash game
old save version is handled safely
Statuses
poison ticks once per appropriate turn
burn ticks once per appropriate turn
weak reduces attack damage correctly
vulnerable increases received damage correctly
frail reduces block correctly
strength increases attack damage correctly
dexterity increases block correctly
thorns retaliates correctly
plated grants block correctly
ritual grants strength at correct timing
mark behaves consistently and decays correctly
Rewards
choosing card works
skipping card works
relic choice works
heal works once
upgrade works once
remove works once
Continue advances exactly once
event appears at correct point
event rest/upgrade/remove works
boss appears after event path
victory works
Build
npm run dev works
npm run build works
no TypeScript errors
no broken imports
no missing CSS files
no runtime errors
Deliverables

Produce the full refactored project.

Include:

package.json
index.html
vite.config.ts
tsconfig.json
all files in src/
all CSS files
clear instructions for running the game
a short summary of what was changed
a list of the critical bugs fixed
any remaining limitations or TODOs

The code should be complete, not pseudocode.

Do not leave stubs like:

// TODO implement later

Every imported file must exist.

Every exported function/class/type must compile.

Important implementation order

Work in this order:

Analyze the original game.html.
Extract data objects first:
cards
enemies
relics
statuses
encounters
config
Create TypeScript types.
Create seeded RNG.
Create game state model.
Create save/load with validation.
Create combat engine.
Create effect resolver.
Create status timing rules.
Create hook system.
Create reward/event systems.
Create UI renderer.
Create delegated input controller.
Create audio system.
Move CSS into proper files and fix invalid CSS.
Test full game flow.
Fix TypeScript/build errors.
Polish UI and feedback.

Do not add large new features until the critical bugs are fixed.

Design philosophy

This project should demonstrate:

strong game-system thinking
clean TypeScript architecture
data-driven design
clear separation of content and engine logic
robust state transitions
safe save/load behavior
readable UI
expandable card/relic/effect system
polished small-game feel

The final result should feel like a serious portfolio prototype that could be shown to a game studio or used as the foundation for a real roguelike deckbuilder.

The most important thing is not adding more content.

The most important thing is making the existing game clean, stable, modular, extensible, and hard to break.
