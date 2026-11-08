# Architecture

## Workspaces
- `packages/shared`: framework-independent TypeScript simulation, characters and AI.
- `apps/web`: Vite, Phaser 3 presentation, accessible HTML menus/HUD, input and saves.
- `assets-source`: original editable SVG arena and portraits. Vite exports hashed assets.

No renderer API is imported by shared logic. A future authoritative Colyseus room can
call `Match.step([input0, input1])`; online networking is not implemented yet.

## Simulation
`ArenaScene` accumulates elapsed time and advances integer 60 Hz steps. Low presentation
runs at 30 Hz and executes two simulation steps per display frame. Long stalls are
clamped to 100 ms to avoid a spiral of death; real time may slow on severely overloaded
hardware. Hiding the tab pauses offline play and clears held input.

Each tick: capture inputs, freeze during hitstop, tick cooldowns and state machine,
integrate physics, resolve body separation, collect simultaneous melee contacts,
resolve projectiles, determine round result. Attack timers never read render time.
Both fighters' melee contacts are collected before hits apply so attacks can trade.

`Fighter` is an explicit finite-state switch with guarded transitions. Attacks and
cancel graph are character data. Each melee swing lands once. Projectiles are consumed
on first collision. Cancel chains have no cycles (validated in tests).

## Input
Keyboard and pointer controls produce the same boolean `InputFrame` consumed by AI and
humans. Pending key/pointer presses survive between simulation ticks, including very
short taps. Simulation edge detection creates a 7-tick action buffer; buffer TTL freezes
during hitstop. Pointer capture supports multiple touches; cancel/blur clears input.

## Presentation
Phaser is lazy-loaded on entering combat. SVG backdrop is rasterized once by Phaser's
asset loader; articulated vector fighter rigs draw readable state-dependent poses.
Pooled sparks are cosmetic. Effects never modify collision or timing. HUD refresh is
limited to 20 Hz. Audio uses short original Web Audio oscillator cues unlocked on click.

## Persistence
Versioned validated guest JSON in localStorage: settings, both players' bindings,
guest match/win totals, arcade stage/fighter and completed circuit count. Unknown optional
fields in older version-1 saves fall back to defaults. Missing, invalid or inaccessible storage
falls back safely; save failure is surfaced by Settings. No credentials or online stats.

## Tests
Vitest covers shared rules/determinism/AI/assets. Playwright uses normal browser keyboard
and touch events. A development-only read-only snapshot hook supports assertions;
there is no health/winner mutation endpoint and no test hook in the production build.

Arcade route/progression is a pure shared module, exercised separately from browser
storage. UI only calls progression after the shared match resolves a player-one victory.
