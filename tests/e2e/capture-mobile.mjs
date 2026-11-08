// One-off capture: after-mobile screenshot matching the before-mobile baseline context.
import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const p = await context.newPage();
await p.goto('http://127.0.0.1:5173/');
await p.locator('#training').click();
await p.locator('#start').click();
await p.waitForSelector('canvas', { timeout: 30_000 });
await p.waitForFunction(() => window.__inkbreak?.snapshot()?.phase === 'fighting', undefined, { timeout: 30_000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: 'docs/visuals/after-mobile.png', fullPage: true, animations: 'disabled' });
await b.close();
console.log('captured docs/visuals/after-mobile.png');
