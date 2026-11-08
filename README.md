# INKBREAK · Arena of the Folded World

A real playable Phaser 3 / TypeScript browser fighting vertical slice, with original
vector development art. **Every battle rewrites the arena.**

## Run locally

Use Node 22+ (verified on Node 24.19.0) and npm workspaces:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite binds to all interfaces for local phone testing:
open `http://<your-PC-LAN-IP>:5173` on the same network when the firewall permits it.

```sh
npm run dev:web      # web only; same as dev
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview -w apps/web
```

`npm run build` emits static files to `apps/web/dist`. Publish that directory to a static
host. No deployment has been performed. Multiplayer is not implemented; there is no
server command or production WebSocket endpoint yet.

## Play

- **Play versus AI:** choose Kaien/Mira, opponent and easy/normal/hard difficulty.
- **Arcade:** three-bout easy/normal/hard circuit, saved fighter/stage, retry and next-bout flow.
- **Training:** selectable dummy, reset, infinite meter, hitboxes/diagnostics, frame data.
- **Local versus:** two independent keyboard input channels; first to two round wins.
- Every match has actual collision, damage, rounds, victory/defeat and restart.

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | Left / Right arrows |
| Jump | W / Space | Up arrow |
| Light | J | Numpad 1 |
| Heavy | K | Numpad 2 |
| Skill | L | Numpad 3 |
| Guard / timed parry | U | Numpad 4 |
| Ultimate (100 meter) | I | Numpad 5 |
| Dash / directional backdash | Left Shift | Numpad 0 |
| Pause | Escape | Escape |

Tap attacks; holding does not auto-repeat. Chain J → J on hit, then K/L/I. Guard is
held; tapping it just before impact parries. Mira's skill is a real paper projectile.
Kaien's is a lunging strike. Touch buttons support simultaneous input and cancellation.
Both players' keys can be remapped under Settings. Choose an action, press a key, then
Save & return. The control legends update to your mapping. Duplicate bindings are rejected.

## Scope and continuation

This is the first playable development milestone, **not** the finished master-prompt
game. Final HD sprites/animation atlases, complete four-skill kits, online Colyseus,
additional fighters/arenas, Arena Rewrite, full progression and platform QA remain.
Unavailable menu entries are disabled. The roadmap and exact checkpoint are in
[`docs/progress.md`](docs/progress.md), with verified outcomes in
[`docs/testing.md`](docs/testing.md).

Architecture: [`docs/architecture.md`](docs/architecture.md).
Rules: [`docs/balance.md`](docs/balance.md).
Asset provenance/replacements: [`docs/asset-manifest.md`](docs/asset-manifest.md).

Settings, remapped keys, arcade progress and guest win/match counts use validated browser storage. No accounts,
tracking, remote assets, paid advantages or credentials. Audio cues are synthesized only
after a user gesture; music is pending. Reduced motion and low/medium/high presentation
presets are available. Low targets 30 Hz rendering while combat remains fixed 60 Hz.

The default Phaser distribution produces a large chunk warning; it is lazy-loaded on
entering combat. Physical-device performance and production readiness are unverified.
