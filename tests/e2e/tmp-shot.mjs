// Rasterize any tmp sheet passed as argv[2] for art QC (temporary tooling).
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 882, height: 742 } });
const file = process.argv[2] ?? 'tmp-kaien-sheet';
const target = resolve(`apps/web/public/assets/${file}.svg`);
await p.goto(`file:///${target.replace(/\\/g, '/')}`);
await p.waitForTimeout(400);
await p.screenshot({ path: `docs/visuals/qc-${file}.png` });
await b.close();
console.log(`captured docs/visuals/qc-${file}.png`);
