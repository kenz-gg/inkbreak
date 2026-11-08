// Debug bust sheet: all expressions for one character, large (temporary).
import { writeFileSync } from 'node:fs';
import { BASE_POSES, svgBust, svgPose } from '../../packages/asset-tools/lib/figure.mjs';
void BASE_POSES;
const id = process.argv[2] ?? 'mira';
const { default: spec } = await import(`../../packages/asset-tools/character-specs/${id}.json`, { with: { type: 'json' } });
const cells = [];
for (const [i, expr] of ['neutral', 'focused', 'strained'].entries()) {
  cells.push(`<svg x="${i * 262}" y="36" width="240" height="240" viewBox="0 0 256 256">${svgBust(spec, expr).replace(/^[\s\S]*?-->\n/, '').replace(/<\/svg>\n$/, '')}</svg><text x="${i * 262 + 8}" y="24" font-size="16" font-family="Georgia" fill="#d8c69a">bust ${expr}</text>`);
}
const idle = svgPose(spec, { ...BASE_POSES.idle, pose: 'idle', wind: 0.4 }).replace(/^[\s\S]*?-->\n/, '').replace(/<\/svg>\n$/, '').replace('<rect width="512" height="640" fill="none"/>', '');
cells.push(`<svg x="0" y="300" width="300" height="375" viewBox="0 0 512 640">${idle}</svg><text x="8" y="292" font-size="16" font-family="Georgia" fill="#d8c69a">idle full</text>`);
writeFileSync(`apps/web/public/assets/tmp-${id}-bust.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="700" viewBox="0 0 800 700"><rect width="800" height="700" fill="#241f19"/>${cells.join('')}</svg>`);
console.log('bust sheet written');
