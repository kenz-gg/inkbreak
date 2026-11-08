import { expect, it } from 'vitest';
import { VisualBudget } from './visual-quality';
it('reduces quality under sustained slow raw frames, including severe stalls',()=>{
  const budget=new VisualBudget({quality:'high'});
  for(let i=0;i<40;i++) budget.sample(200,false);
  expect(budget.tier).toBe(0);
  for(let i=0;i<500;i++) budget.sample(16,false);
  expect(budget.tier).toBe(0); // no disruptive mid-match upgrade oscillation
});
it('keeps the chosen high ceiling when frames are healthy or isolated stalls occur',()=>{
  const budget=new VisualBudget({quality:'high'});
  for(let i=0;i<500;i++) budget.sample(i%120===0 ? 250 : 16,false);
  expect(budget.tier).toBe(2);
});
it('ignores paused or invalid samples and never exceeds the selected ceiling',()=>{
  const budget=new VisualBudget({quality:'medium'});
  for(let i=0;i<100;i++) { budget.sample(250,true); budget.sample(NaN,false); }
  expect(budget.tier).toBe(1);
  const low=new VisualBudget({quality:'low'}); low.sample(16,false); expect(low.label).toBe('low');
});
