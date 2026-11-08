import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('illustrated menu, selection and layered battle load without missing assets',async({page})=>{
  const errors:string[]=[];
  const layers=new Set<string>();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.url().includes('/assets/arenas/sunspire/') && response.url().endsWith('.svg')) {
      if(response.ok()) layers.add(response.url().split('/').pop()!);
      else errors.push(`Asset HTTP ${response.status()}: ${response.url()}`);
    }
  });
  await mkdir('docs/visuals',{recursive:true});
  await page.goto('/');
  await page.screenshot({path:'docs/visuals/after-menu.png',fullPage:true,animations:'disabled'});
  await page.locator('#training').click();
  await page.screenshot({path:'docs/visuals/after-selection.png',fullPage:true,animations:'disabled'});
  await page.locator('#start').click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#arena-loading')).toHaveCount(0,{timeout:20_000});
  await page.waitForFunction(()=>window.__inkbreak?.snapshot()?.phase==='fighting',undefined,{timeout:20_000});
  expect([...layers].sort()).toEqual(['city.svg','court.svg','floor.svg','foreground.svg','sky.svg']);
  await page.screenshot({path:'docs/visuals/after-battle.png',fullPage:true,animations:'disabled'});
  await page.locator('#debug').click();
  await expect(page.locator('#diagnostics')).toContainText('FX');
  expect(errors).toEqual([]);
});

test('low quality and reduced motion disable ambient work and CSS entrance motion',async({page})=>{
  await page.goto('/'); await page.locator('#settings').click();
  await page.locator('#quality').selectOption('low'); await page.locator('#motion').check();
  await page.locator('#save-settings').click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  expect(await page.locator('.home').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.locator('#training').click(); await page.locator('#start').click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#arena-loading')).toHaveCount(0,{timeout:20_000});
  await page.waitForFunction(()=>window.__inkbreak?.snapshot()?.phase==='fighting',undefined,{timeout:20_000});
  await page.locator('#debug').click();
  await expect(page.locator('#diagnostics')).toContainText('0 particles · FX low');
  const airborne=page.waitForFunction(()=>window.__inkbreak!.snapshot()!.fighters[0].y<810);
  await page.keyboard.press('w');
  await airborne;
});
