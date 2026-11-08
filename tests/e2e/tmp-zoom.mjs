// Zoom QC: single pose at high scale for art review (temporary).
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
const pose = process.argv[2] ?? '@';
const [id, name] = pose.split('@');
import { readFileSync } from 'node:fs';
const svg = readFileSync(`assets-source/characters/${id}/animations/${name}.svg`, 'utf8');
const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 772, height: 962 } });
const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
await p.goto(url);
await p.waitForTimeout(300);
await p.screenshot({ path: `docs/visuals/qc-${id}-${name}-zoom.png` });
await b.close();
console.log(`captured docs/visuals/qc-${id}-${name}-zoom.png`);
