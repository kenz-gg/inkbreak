// Compiles parametric character specs into standalone editable SVG sources
// under assets-source/characters/<id>/ and writes the characters manifest.
// The manifest is the single source of truth for the export pipeline.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { URL } from 'node:url';
import { log } from 'node:console';
import { svgPose, svgBust, svgBuildSheet, svgSilhouettes, svgEffect, poseFrames } from './lib/figure.mjs';

const root = new URL('../../', import.meta.url);
const charactersBase = new URL('assets-source/characters/', root);
const specsBase = new URL('packages/asset-tools/character-specs/', root);

const POSE_NAMES = {
  idle: 'Idle stance', walk: 'Walk cycle', run: 'Run cycle', jump: 'Jump tuck', dash: 'Dash burst',
  'light-attack': 'Light attack', 'heavy-attack': 'Heavy attack', guard: 'Guard stance',
  'hit-reaction': 'Hit reaction', skill: 'Skill pose', ultimate: 'Ultimate pose',
  victory: 'Victory pose', defeat: 'Defeat pose',
};

const SILHOUETTE_VARIANTS = [
  { pose: 'idle', label: 'A — baseline stance' },
  { pose: 'dash', label: 'B — motion read' },
  { pose: 'victory', label: 'C — hero read' },
];

const LICENSE_PARAMETRIC = 'original parametric development art, authored in this workspace';
const LICENSE_HAND = 'original hand-authored vector art, authored in this workspace';

const CHARACTER_IDS = ['kaien', 'mira', 'orun', 'selka'];

const entry = (characterId, kind, name, source, folder, file, dimensions, animation, license, status) => ({
  characterId, kind, name, source, export: `assets/characters/${characterId}/${folder}/${file}`,
  dimensions, animation, license, status,
});

const manifest = {
  version: 1,
  license: 'original in-workspace development art; see per-asset license fields',
  note: 'Parametric/hand-authored development art. Final painted production art would replace these files one-for-one without changing the manifest contract (docs/character-art-prompts.md).',
  anchorStandards: {
    pose: { canvas: [512, 640], anchor: [256, 560] },
    expression: { canvas: [256, 256], anchor: [128, 222] },
    portrait: { canvas: [300, 400], anchor: [150, 400] },
    effect: { canvas: [512, 512], anchor: [256, 300] },
    construction: { canvas: [560, 640], anchor: [256, 560] },
    'silhouette-sheet': { canvas: [1180, 640], anchor: [256, 560] },
  },
  lighting: 'key light upper-left; shadow band lower-right; rim highlight upper-left',
  characters: [],
};

for (const id of CHARACTER_IDS) {
  const spec = JSON.parse(await readFile(new URL(`${id}.json`, specsBase), 'utf8'));
  const dir = new URL(`${id}/`, charactersBase);
  for (const sub of ['animations', 'expressions', 'effects', 'concept', 'source', 'portraits']) {
    await mkdir(new URL(`${sub}/`, dir), { recursive: true });
  }
  const assets = [];
  if (id !== 'orun' && id !== 'selka' || existsSync(new URL(`${id}/portraits/${id}-portrait.svg`, charactersBase))) {
    assets.push(entry(id, 'portrait', 'Portrait', `characters/${id}/portraits/${id}-portrait.svg`,
      'portraits', `${id}-portrait.svg`, [300, 400], null, LICENSE_HAND, 'development'));
  }
  for (const p of poseFrames(spec)) {
    const file = `${p.pose}${p.frame ? `-${p.frame}` : ''}.svg`;
    await writeFile(new URL(`${id}/animations/${file}`, charactersBase), svgPose(spec, p));
    assets.push(entry(id, 'pose', `${POSE_NAMES[p.pose]}${p.frame ? ` · frame ${p.frame}` : ''}`,
      `characters/${id}/animations/${file}`, 'animations', file, [512, 640], p.pose, LICENSE_PARAMETRIC, 'development'));
  }
  for (const expr of ['neutral', 'focused', 'strained']) {
    await writeFile(new URL(`${id}/expressions/${expr}.svg`, charactersBase), svgBust(spec, expr));
    assets.push(entry(id, 'expression', `${expr[0].toUpperCase()}${expr.slice(1)} expression`,
      `characters/${id}/expressions/${expr}.svg`, 'expressions', `${expr}.svg`, [256, 256], null, LICENSE_PARAMETRIC, 'development'));
  }
  for (const kind of spec.effects) {
    const file = `${id}-${kind}.svg`;
    await writeFile(new URL(`${id}/effects/${file}`, charactersBase), svgEffect(spec, kind));
    assets.push(entry(id, 'effect', `${kind[0].toUpperCase()}${kind.slice(1)} effect stamp`,
      `characters/${id}/effects/${file}`, 'effects', file, [512, 512], null, LICENSE_PARAMETRIC, 'development'));
  }
  await writeFile(new URL(`${id}/source/${id}-construction.svg`, charactersBase), svgBuildSheet(spec));
  assets.push(entry(id, 'construction', 'Construction reference',
    `characters/${id}/source/${id}-construction.svg`, 'source', `${id}-construction.svg`, [560, 640], null, LICENSE_PARAMETRIC, 'development'));
  await writeFile(new URL(`${id}/concept/${id}-silhouettes.svg`, charactersBase), svgSilhouettes(spec, SILHOUETTE_VARIANTS));
  assets.push(entry(id, 'concept', 'Silhouette exploration sheet',
    `characters/${id}/concept/${id}-silhouettes.svg`, 'concept', `${id}-silhouettes.svg`, [1180, 640], null, LICENSE_PARAMETRIC, 'development'));

  manifest.characters.push({
    id, name: spec.name, title: spec.title,
    spec: `packages/asset-tools/character-specs/${id}.json`,
    completion: {
      portrait: 'development',
      poses: 'development', expressions: 'development', effects: 'development',
      construction: 'development', concept: 'development',
    },
    assets,
  });

  log(`compiled ${assets.length} source assets for ${spec.name} (${id})`);
}

await writeFile(new URL('manifest.json', charactersBase), JSON.stringify(manifest, null, 2) + '\n');
log('wrote assets-source/characters/manifest.json');
