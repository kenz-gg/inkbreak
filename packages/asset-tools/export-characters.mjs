// Exports character source art into apps/web/public/assets/characters/ and
// writes a Phaser-style frames index (frames.json) per character. Verdict on
// stale/missing data is thrown, so a broken pipeline fails the build loudly.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { log } from 'node:console';

const root = new URL('../../', import.meta.url);
const charactersBase = new URL('assets-source/characters/', root);
const exportBase = new URL('apps/web/public/assets/characters/', root);

const manifest = JSON.parse(await readFile(new URL('manifest.json', charactersBase), 'utf8'));

for (const character of manifest.characters) {
  const out = new URL(`${character.id}/`, exportBase);
  await mkdir(out, { recursive: true });
  for (const asset of character.assets) {
    const src = new URL(`assets-source/${asset.source}`, root);
    const dst = new URL(asset.export.replace('assets/characters/', ''), exportBase);
    await mkdir(new URL('.', dst), { recursive: true });
    await copyFile(src, dst);
  }
  const frames = {};
  for (const asset of character.assets.filter((a) => a.kind === 'pose').sort((a, b) => a.name.localeCompare(b.name))) {
    frames[asset.animation] = frames[asset.animation] ?? [];
    frames[asset.animation].push(asset.source.split('/').pop());
  }
  const portrait = character.assets.find((a) => a.kind === 'portrait');
  await writeFile(new URL('frames.json', out), JSON.stringify({
    canvas: manifest.anchorStandards.pose.canvas,
    anchor: manifest.anchorStandards.pose.anchor,
    portrait: portrait ? portrait.source.split('/').pop() : null,
    frames,
  }, null, 2) + '\n');
  log(`exported ${character.assets.length} runtime assets + frames.json for ${character.id}`);
}
log('character export complete: apps/web/public/assets/characters/');
