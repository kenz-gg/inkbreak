# Visual direction / implementation plan

## Inspection
The playable game uses a single 1600×900 SVG backdrop, blunt polygon portraits,
minimally shaded procedural fighter rigs, identical spark bursts for most events,
and transparent HUD bars directly over detailed architecture. Existing controls,
combat, AI, arcade and saves are integrated and tested.

## Direction: The Sunlit Manuscript
- Sunspire: honey limestone, deep umber, aged brass, dusty olive, warm ivory light.
- Kaien: tapered traveler silhouette, asymmetric ember scarf, leather and woven trim.
- Mira: flowing ivory sleeve silhouette, burgundy sash, folded-paper ornamentation.
- Interface: ink-dark panels, fine engraved borders, editorial serif hierarchy,
  restrained vermilion highlights. No new external fonts or stock assets.

## Implementation gates
1. Preserve baseline screenshots under `docs/visuals/before-*.png`.
2. Author editable arena strata, export reproducibly, connect to Phaser parallax.
3. Refine character portraits/rig presentation and ground-contact shadows.
4. Add pooled contextual VFX, ambient dust/petals, restrained lighting and framing.
5. Refine menu, selection, battle HUD and reduced-motion-aware transitions.
6. Verify quality/reduced effects, browser regressions and production build;
   save after screenshots and update provenance/performance limitations.

Status: IMPLEMENTED (gates 1–6 complete; verified). What shipped:
1. Baselines preserved: `docs/visuals/before-menu.png`, `before-battle.png`, `before-mobile.png`.
2. Arena re-authored as five commented strata, exported reproducibly by
   `packages/asset-tools/export-visuals.mjs` and connected to a Phaser parallax
   presentation with cropped transparent regions and depth ordering.
3. Portraits/Kaien and Mira rigs refined (clothing shading, contact shadow trio,
   thinner outlines, signature-colored effects).
4. Pooled contextual VFX (spark/paper/dust/ring), ambient motes/dust, restrained
   framing zoom, camera shake softened, 450 ms fade-in.
5. Menu/selection/battle HUD restyled via `apps/web/src/ui/visual.css` with
   `data-reduced-motion` aware transitions and a battle loading overlay.
6. Adaptive visual budget (`apps/web/src/config/visual-quality.ts`) downgrades
   presentation tier (render resolution/ambience) on sustained slow raw frames; low quality uses
   the Canvas renderer and 30 fps. Tests: 3 unit + 2 dedicated e2e gates.

After screenshots: `docs/visuals/after-menu.png`, `after-selection.png`,
`after-battle.png`, `after-mobile.png` (mobile captured with the same 844×390
touch context as the baseline via `tests/e2e/capture-mobile.mjs`).

Limitations kept explicit: the stage runs on a schedule that fit 60 Hz fixed-step
simulation; on software WebGL (SwiftShader) frames run slow and the budget
downgrades — presentation only, never combat timing. Sunspire is the only themed
arena; the other three arenas still need their own identity. These remain
original vector/procedural illustrations, not painted production sprites or a
completed hand-drawn animation set.
