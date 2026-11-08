# Verification record

Environment: Windows tool host; Node 24.19.0, npm 11.17.0. Browser tests use Playwright
Chromium 141 with SwiftShader. These are not measurements on the specified GT 610/AMD A9.

## First checkpoint
| Command | Actual outcome |
|---|---|
| `npm install --no-audit --no-fund` | Passed after esbuild compatibility pin |
| `npm run typecheck` | Passed before browser tests |
| `npm run build` | Passed; lazy Phaser chunk is 1,478.51 kB minified / 339.66 kB gzip |
| `npm run test` | 29 passed in 2 files |
| `npm run test:e2e` | 4 passed, 2.9 minutes on rerun |

Browser tests: menu/selection, keyboard movement/jump/projectile, actual full local
two-round match and restart, pause/resume, training tools, AI damage, corrupted saves,
landscape multitouch and cancel. Screenshots are under ignored `test-results/`.

First browser run: 3 passed / 1 failed. A short keyboard jump tap was dropped between
fixed ticks. Added pending-press latches and separated input sampling from HUD reads;
rerun passed all 4. A concurrent typecheck/lint run exceeded its 120-second time budget;
run final tooling serially to avoid unnecessary contention on this host.

## Installation issue
Newer native esbuild executables failed with `EFTYPE` / invalid OS application.
`overrides` pins compatible esbuild 0.25.0 and Vite 6.4.1; clean install then succeeded.
Do not remove the override without checking this Windows environment.

## Not verified
Physical Android, iPhone/iPad Safari, Firefox/WebKit, gamepads, specified old hardware,
long-session memory stability, production deployment, network play (not implemented).
No fabricated FPS targets: overlay displays measured live values. No benchmark claim.

## Continuation checkpoint
- `npm run typecheck`: passed serially after the earlier resource timeout.
- `npm run lint`: passed, no errors.
- `npm run test`: **30 passed**, 3 files (including arcade win/loss/complete semantics).
- `npm run test:e2e`: **5 passed**, 2.9 minutes. Added persisted remapping with real movement,
  arcade start and resume, fighter retention and locked circuit opponent.
- Mobile layout inspected again: buttons sit outside the stage in landscape side margins.
- Full three-bout arcade browser playthrough and physical mobile use are still unverified.
- Final `npm run build`: passed (27 modules). Main application 44.82 kB minified /
  16.33 kB gzip; Phaser 1,478.51 kB / 339.66 kB gzip; renderer 6.09 kB / 2.85 kB gzip.
  These are build output sizes, not runtime performance measurements.
- Development server HTTP check: `http://127.0.0.1:5173` returned 200 and the expected
  INKBREAK document. Desktop browser tool was disconnected; Playwright screenshots
  supplied visual inspection independently.

## Visual overhaul checkpoint (2026-11-08)
| Command | Actual outcome |
|---|---|
| `npm run assets:export` | Exported 5 Sunspire layers + manifest; paths match scene preload URLs |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed (after adding `node:url/console` imports to the .mjs exporter) |
| `npm run test` | **34 passed**, 4 files (3 new `visual-quality` unit tests, exporter manifest test) |
| `npm run build` | Passed; Phaser 1,478.51 kB / 339.66 kB gzip, renderer 12.77 kB / 5.29 kB (lazy) |
| `npm run test:e2e` | **7 passed**, 3.3 minutes (5 original + 2 visual gates) |

- Rendering pipeline fixes verified in-browser: five strata load and draw, cropped
  blank texture regions cut overdraw, framebuffer sized by quality tier (960/1280/1600),
  quality budget samples `game.loop.rawDelta` (smoothed steps off), low quality uses the
  Canvas renderer at 30 fps, loading overlay while layer SVGs stream in.
- Visual gate e2e: all five layer requests HTTP 200, phase reaches `fighting`,
  diagnostics show `FX low` with 0 ambient particles under low + reduced motion, and
  `data-reduced-motion` disables the menu entrance animation.
- First e2e run flakiness addressed by in-page `waitForFunction` on the snapshot
  instead of polling `expect.poll` across the devtools boundary (which can miss a
  full jump when SwiftShader stalls the frame loop).
- Screenshots: `docs/visuals/after-{menu,selection,battle,mobile}.png` reviewed against
  `before-*.png`; mobile captured in the same touch context as the baseline.
- Still unverified: physical-device GPU performance, Firefox/WebKit, production
  deployment, and a full three-bout arcade browser playthrough. The frame budget
  claims above are from build/test tooling, not hardware benchmarks.
