// Debug: dump shapes of a pose SVG with fill + coords near a region (temporary).
import { readFileSync } from 'node:fs';
const [id, name] = (process.argv[2] ?? 'selka@victory').split('@');
const svg = readFileSync(`assets-source/characters/${id}/animations/${name}.svg`, 'utf8');
svg.split('\n').forEach((l, i) => {
  if (!/<path|<polyline|<line/.test(l)) return;
  const fill = l.match(/fill="([^"]+)"/)?.[1] ?? '-';
  const nums = [...l.matchAll(/[\d.]+/g)].map(m => +m[0]);
  const ys = nums.filter(n => n > 100 && n < 640);
  console.log(i, fill, '|', l.slice(0, 68).replace(/fill="[^"]*" /, '').slice(0, 60));
});
