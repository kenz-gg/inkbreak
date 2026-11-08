// One-off QC contact sheet (temporary, regenerated at will).
import { readFileSync, writeFileSync } from 'node:fs';
const ids = ['kaien', 'mira', 'orun', 'selka'];
for (const id of ids) {
  const poses = ['idle', 'walk-1', 'walk-2', 'run-1', 'run-2', 'jump', 'dash', 'light-attack-1', 'light-attack-2', 'heavy-attack-1', 'heavy-attack-2', 'guard', 'hit-reaction', 'skill', 'ultimate', 'victory', 'defeat'];
  const cells = poses.map((p, i) => {
    const s = readFileSync(`assets-source/characters/${id}/animations/${p}.svg`, 'utf8');
    const inner = s.replace(/^[\s\S]*?-->\n/, '').replace(/<\/svg>\n$/, '').replace('<rect width="512" height="640" fill="none"/>', '');
    return `<svg x="${(i % 6) * 140}" y="${Math.floor(i / 6) * 196 + 44}" width="122" height="185" viewBox="0 0 512 640">${inner}</svg>`;
  });
  writeFileSync(`apps/web/public/assets/tmp-${id}-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="640" viewBox="0 0 860 640"><rect width="860" height="640" fill="#241f19"/><text x="14" y="30" font-size="20" fill="#d8c69a" font-family="Georgia">${id} pose QC</text>${cells.join('')}</svg>`);
}
console.log('sheets written');
