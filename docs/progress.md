# Development checkpoint

## Plan and acceptance gates
1. Repair the interrupted shared simulation; test movement, frame timing and rounds.
2. Integrate Phaser, original vector development visuals, selection, HUD and results.
3. Add legal AI, local versus, training, touch input, settings and combat feedback.
4. Run typecheck, lint, unit tests, production build and browser regression tests.
5. Continue advanced combat and online work only from a verified playable checkpoint.

## Current status
- Inspection: TESTED — Windows, Node 24.19.0, npm 11.17.0, Git 2.55.0.
- Foundation / first playable: TESTED — strict TypeScript, Phaser/Vite, menu, selection,
  Kaien/Mira, Sunspire Court, movement/jumps, attacks, AI, health/timer,
  first-to-two rounds, results, pause and restart.
- Core advanced subset: TESTED — ground/air attacks, two-light cancel chain,
  guard/perfect guard, dash, input buffer, cooldowns, one skill and ultimate per fighter,
  hitstop, projectiles and combo scaling. Remaining advanced mechanics below.
- AI versus / local versus / training: TESTED. Three AI difficulties; six dummy modes.
- Original vector development art: IMPLEMENTED and browser inspected. Not final HD art.
- Touch: TESTED in Chromium emulation with simultaneous move/jump and touch cancel.
- Arcade progression: IMPLEMENTED — three-bout route, win-gated advancement, loss retry,
  final circuit result, local saved resume and circuit count. Advancement logic and browser
  start/resume are TESTED; a full three-bout browser playthrough remains unverified.
- Keyboard remapping: TESTED — both players, conflict rejection, saved bindings,
  restore defaults, and live control legends. Browser verifies an actual remapped move.
- Online Colyseus, extra fighters/arenas, mastery/cosmetics, production release: NOT STARTED.

This is development artwork and an incremental vertical slice, not the finished HD-2D release.

## Verified first checkpoint
- `npm run test`: 29 passed (2 files).
- `npm run test:e2e`: 4 passed, Chromium; real keyboard-only full match, AI damage,
  pause/resume, selection, training tools, corrupted save and multitouch.
- `npm run build`: passed; Phaser chunk warning remains (lazy loaded).
- `npm run typecheck`: passed before browser tests; subsequent concurrent rerun timed out,
  so final checks will be run serially on this resource-constrained environment.
- Fixes: truncated fighter source, incorrect imports/color type, nonadvancing aerial
  attack, unbounded air velocity, stale interrupted attacks, parry reset abuse,
  startup cancel loophole, short keyboard taps missed between fixed ticks.

## Remaining roadmap
- Advanced: third light, directional attacks, counter-hit, launchers, knockdown/wakeup,
  guard-break resource, complete four-skill kits, animation validation/atlas pipeline.
- AI: expanded spacing, verified combo tactics and corner escapes.
- Polish: final animation sets, frame atlases, music/ambience; three additional arenas
  with distinct identities (visual identity for Sunspire delivered).
- Online: Colyseus authoritative private rooms, synchronization/interpolation,
  room readiness/rematch/disconnect/cleanup, two-client regression suite. NOT STARTED.
- Content: Orun, Selka, other three arenas, Rewrite rulesets. NOT STARTED.
- Progression: mastery, achievements, cosmetics and server persistence. NOT STARTED.
- Mobile: configurable control positions, physical Android/iOS/tablet verification.
- Performance: adaptive render resolution SHIPPED (tier budget + Canvas low mode);
  hardware measurements on the specified GPUs, deployment QA remain open.

## Continuation checkpoint (2026-11-07)
- `npm run typecheck`: TESTED (serial rerun passed).
- `npm run lint`: TESTED (no errors).
- `npm run test`: TESTED — 30 passed in 3 files.
- `npm run test:e2e`: TESTED — 5 passed in 2.9 minutes.
- Mobile landscape screenshots inspected: controls now occupy side margins.
- `npm run build`: TESTED — final continuation build passed (27 modules).
  Phaser remains a lazy 1,478.51 kB chunk; warning documented, not suppressed.
- `npm run dev:web`: running at checkpoint; HTTP 200 and INKBREAK HTML verified.
- Desktop Review browser was disconnected; inspection used actual Playwright screenshots
  instead. No desktop Review tab or deployment was claimed.

Next work: finish Kaien/Mira's full move kits and explicit counter/knockdown/guard-break
states with regression tests; add animation metadata and distinct poses. Then add a
Colyseus workspace/private-room authoritative adapter with two-client tests before
unlocking the Online menu. Do not add Orun/Selka until this pipeline is validated.

## Visual overhaul checkpoint (2026-11-08)
- Direction executed on the existing slice (no rebuild): "The Sunlit Manuscript" —
  sunspire limestone/brass/dusty-olive identity. Sunspire Court now composes five
  exported parallax strata, per-strata parallax factors, light shafts, ambient motes
  and cropped texture regions; three other arenas still need distinct identities.
- Portraits and fighter rigs enriched: layered cloth shading, contact-shadow trio,
  thinner ink outlines, contextual VFX kinds (spark/paper/dust/ring) and layered
  slash arcs. HUD redesigned with ink panels, serif hierarchy, loading overlay,
  reduced-motion transitions; touch controls styled.
- Adaptive quality: `apps/web/src/config/visual-quality.ts` graduates presentation
  tier from measured raw frame time; low tier also switches to the Canvas renderer
  and 30 fps presentation. Combat simulation remains 60 Hz fixed-step and untouched.
- Verified: `npm run typecheck`, `npm run lint`, `npm run test` (34), `npm run build`,
  `npm run test:e2e` (7 including 2 dedicated visual gates). Before/after screenshots
  in `docs/visuals/`; capture script `tests/e2e/capture-mobile.mjs`.
- Development art disclaimer still applies: vector/procedural illustrations, not
  final painted HD art or finished frame-by-frame animation.
