// Debug: render idle with each layer skipped to isolate a stray shape (temporary).
import { writeFileSync } from 'node:fs';
import { BASE_POSES, svgPose } from '../../packages/asset-tools/lib/figure.mjs';
import kaien from '../../packages/asset-tools/character-specs/kaien.json' with { type: 'json' };

void BASE_POSES;
const layers = ['none', 'costume', 'head', 'trailing', 'weapon', 'finale'];
const cells = layers.map((l, i) => {
  const skip = l === 'none' ? undefined : undefined;
  void skip;
  const params = { ...BASE_POSES.idle, pose: 'idle', wind: 0.4 };
  if (l !== 'none') params._skip = [l];
  const inner = svgPose(kaien, params).replace(/^[\s\S]*?-->\n/, '').replace(/<\/svg>\n$/, '').replace('<rect width="512" height="640" fill="none"/>', '');
  return `<svg x="${(i % 3) * 290}" y="${Math.floor(i / 3) * 350 + 40}" width="260" height="330" viewBox="0 0 512 640">${inner}</svg><text x="${(i % 3) * 290 + 8}" y="${Math.floor(i / 3) * 350 + 24}" font-size="18" font-family="Georgia" fill="#d8c69a">skip: ${l}</text>`;
});
writeFileSync('apps/web/public/assets/tmp-debug-layers.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="740" viewBox="0 0 880 740"><rect width="880" height="740" fill="#241f19"/>${cells.join('')}</svg>`);
console.log('layers sheet written');
