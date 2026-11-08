// Debug: strip hairFront shapes from a fresh Mira bust (temporary).
import { writeFileSync } from 'node:fs';
import { svgBust } from '../../packages/asset-tools/lib/figure.mjs';
import mira from '../../packages/asset-tools/character-specs/mira.json' with { type: 'json' };
const svg = svgBust(mira, 'neutral');
writeFileSync('apps/web/public/assets/tmp-mira-no-bangs2.svg', svg.replace(/<path d="M70 104\.4[\s\S]*?\/>\n/g, ''));
writeFileSync('apps/web/public/assets/tmp-mira-no-bangs3.svg', svg.replace(/<path d="M83\.4[\s\S]*?\/>\n/g, ''));
console.log('stripped variants written');
