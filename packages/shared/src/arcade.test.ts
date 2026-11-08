import { expect, it } from 'vitest';
import { advanceArcade, ARCADE_ROUTE, type ArcadeRun } from './arcade.js';
it('arcade preserves a lost stage and completes exactly after three wins',()=>{
  const run:ArcadeRun={fighter:'kaien',stage:0};
  expect(advanceArcade(run,false)).toEqual(run); expect(run.stage).toBe(0);
  const next=advanceArcade(run,true)!; expect(next.stage).toBe(1);
  expect(advanceArcade(next,false)?.stage).toBe(1);
  const final=advanceArcade(next,true)!; expect(final.stage).toBe(2);
  expect(advanceArcade(final,true)).toBeNull(); expect(ARCADE_ROUTE).toHaveLength(3);
});
