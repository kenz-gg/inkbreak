import { test, expect, type Page } from '@playwright/test';
import type { MatchSnapshot } from '../../packages/shared/src/types';

async function snapshot(page: Page): Promise<MatchSnapshot> {
  return page.evaluate(() => {
    const w=window as unknown as { __inkbreak: { snapshot: () => MatchSnapshot } };
    return w.__inkbreak.snapshot();
  });
}
async function start(page: Page, mode: string): Promise<void> {
  await page.goto('/'); await page.locator(mode).click(); await page.locator('#start').click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async()=>(await snapshot(page)).phase).toBe('fighting');
}

test('menu, fighter selection, movement, attacks, pause and training tools',async({page})=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'); await expect(page).toHaveTitle(/INKBREAK/);
  await page.screenshot({path:'test-results/main-menu.png',fullPage:true});
  await page.locator('#training').click(); await page.locator('[data-fighter="1"]').click();
  await expect(page.locator('[data-fighter="1"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#start').click(); await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async()=>(await snapshot(page)).phase).toBe('fighting');
  const x=(await snapshot(page)).fighters[0].x;
  await page.keyboard.down('d'); await page.waitForTimeout(400); await page.keyboard.up('d');
  expect((await snapshot(page)).fighters[0].x).toBeGreaterThan(x+30);
  // Observe the short airborne state inside the page, before dispatching the tap.
  // Cross-process polling can miss an entire jump when software rendering stalls.
  const airborne=page.waitForFunction(()=>window.__inkbreak!.snapshot()!.fighters[0].y<810);
  await page.keyboard.press('w');
  await airborne;
  await expect.poll(async()=>(await snapshot(page)).fighters[0].vstate).toBe('idle');
  await page.keyboard.press('l');
  await expect.poll(async()=>(await snapshot(page)).fighters[1].health).toBeLessThan(240);
  await page.keyboard.press('Escape'); await expect(page.locator('#resume')).toBeVisible();
  const paused=await snapshot(page); await page.waitForTimeout(300); expect(await snapshot(page)).toEqual(paused);
  await page.locator('#resume').click(); await page.locator('#reset').click();
  await page.locator('#infinite').check();
  await expect.poll(async()=>(await snapshot(page)).fighters[0].meter).toBe(100);
  await page.locator('#dummy').selectOption('guard');
  await expect.poll(async()=>(await snapshot(page)).fighters[1].vstate).toBe('guard');
  await page.locator('#debug').click(); await expect(page.locator('#diagnostics')).toBeVisible();
  await page.screenshot({path:'test-results/training.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('a real keyboard-only local match completes two rounds and restarts',async({page})=>{
  await start(page,'#local');
  // Player two is an independent, idle human input channel. No state manipulation.
  const deadline=Date.now()+75_000;
  while(Date.now()<deadline) {
    const s=await snapshot(page);
    if(s.phase==='matchOver') break;
    if(s.phase!=='fighting') { await page.waitForTimeout(200); continue; }
    const distance=s.fighters[1].x-s.fighters[0].x;
    if(Math.abs(distance)>65) {
      await page.keyboard.down(distance>0?'d':'a'); await page.waitForTimeout(100);
      await page.keyboard.up('d'); await page.keyboard.up('a');
    } else { await page.keyboard.press('k'); await page.waitForTimeout(720); }
  }
  const result=await snapshot(page);
  expect(result.phase).toBe('matchOver'); expect(result.wins).toEqual([2,0]);
  await expect(page.locator('.result')).toContainText('Player 1 wins.');
  await page.screenshot({path:'test-results/result.png',fullPage:true});
  await page.locator('#restart').click();
  await expect.poll(async()=>(await snapshot(page)).phase).toBe('intro');
  expect((await snapshot(page)).wins).toEqual([0,0]);
});

test('AI applies real damage and corrupted saves recover',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('inkbreak.v1','{broken'));
  await start(page,'#play');
  await expect.poll(async()=>(await snapshot(page)).fighters[0].health,{timeout:20_000}).toBeLessThan(230);
  await page.keyboard.press('Escape'); await page.locator('#exit').click();
  await expect(page.locator('#play')).toBeVisible();
});

test('landscape mobile accepts simultaneous movement and jump; touch release clears',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:5173'); await page.locator('#training').tap(); await page.locator('#start').tap();
  await expect.poll(async()=>(await snapshot(page)).phase).toBe('fighting');
  const cdp=await context.newCDPSession(page);
  const right=await page.locator('[data-action="right"]').boundingBox();
  const jump=await page.locator('[data-action="up"]').boundingBox();
  if(!right || !jump) throw new Error('Touch controls missing');
  const points=[{x:right.x+right.width/2,y:right.y+right.height/2,id:1},{x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2}];
  const before=await snapshot(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await page.waitForTimeout(220);
  const during=await snapshot(page);
  expect(during.fighters[0].x).toBeGreaterThan(before.fighters[0].x);
  expect(during.fighters[0].y).toBeLessThan(810);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForTimeout(1000);
  expect((await snapshot(page)).fighters[0].vx).toBe(0);
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await context.close();
});
