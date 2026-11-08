// Debug: bisect which head sub-shape darkens Mira's face (temporary).
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { svgBust } from '../../packages/asset-tools/lib/figure.mjs';
import kaien from '../../packages/asset-tools/character-specs/kaien.json' with { type: 'json' };
import mira from '../../packages/asset-tools/character-specs/mira.json' with { type: 'json' };
void kaien;
const strip = (label, svg, re, rep = '') => {
  writeFileSync(`apps/web/public/assets/tmp-mira-${label}.svg`, svg.replace(re, rep));
  console.log(label, 'ok', re.test(svg));
};
const base = svgBust(mira, 'focused');
strip('no-hairback', base, /<path d="M81\.5[^/]*?\/>\n?/);
strip('no-skinshade', base, /<path d="M173\.9[^/]*?\/>\n?/);
strip('no-bangs', base, /<path d="M83\.4[^/]*?\/>\n?<path d="M71[^/]*?\/>\n?/);
void readFileSync;
