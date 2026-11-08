import { describe, expect, it } from 'vitest';
import { Match } from './match.js';
import { Fighter } from './fighter.js';
import { KAIEN } from '../characters/kaien.js';
import { MIRA } from '../characters/mira.js';
import { EMPTY_INPUT, boxesOverlap, type InputFrame } from '../types.js';
import { GROUND_Y, INTRO_FRAMES, ROUND_END_FRAMES } from '../constants.js';
import { FighterAI } from '../ai.js';

const input = (patch: Partial<InputFrame> = {}): InputFrame => ({ ...EMPTY_INPUT, ...patch });
function active(training = true): Match { const m = new Match([KAIEN,MIRA], { training }); for(let i=0;i<INTRO_FRAMES;i++) m.step([input(),input()]); return m; }
function advance(m: Match, frames: number, a = input(), b = input()): void { for(let i=0;i<frames;i++) m.step([a,b]); }
function close(m: Match): void { m.fighters[0].x=700; m.fighters[1].x=775; }

describe('fixed-step combat', () => {
  it('runs intro before accepting combat input', () => {
    const m = new Match(); advance(m,INTRO_FRAMES-1,input({right:true}));
    expect(m.phase).toBe('intro'); expect(m.fighters[0].x).toBe(620);
    advance(m,1); expect(m.phase).toBe('fighting');
  });
  it('moves at character speed, clamps at stage walls', () => {
    const m=active(); advance(m,10,input({left:true})); expect(m.fighters[0].x).toBe(580);
    advance(m,500,input({left:true})); expect(m.fighters[0].x).toBe(60);
  });
  it('has jump startup, an airborne arc, and landing recovery', () => {
    const m=active(); advance(m,1,input({up:true})); expect(m.fighters[0].vstate).toBe('jump_squat');
    advance(m,8); expect(m.fighters[0].y).toBeLessThan(GROUND_Y);
    advance(m,70); expect(m.fighters[0].y).toBe(GROUND_Y); expect(m.fighters[0].vstate).toBe('idle');
  });
  it('air control is bounded instead of accelerating exponentially', () => {
    const m=active(); advance(m,1,input({up:true,right:true})); advance(m,20,input({right:true}));
    expect(Math.abs(m.fighters[0].vx)).toBeLessThanOrEqual(KAIEN.stats.walkForward);
  });
  it('separates startup, active and recovery; a swing hits only once', () => {
    const m=active(); close(m); advance(m,1,input({light:true}));
    advance(m,KAIEN.attacks.light1.startup-1); expect(m.fighters[1].health).toBe(MIRA.stats.maxHealth);
    advance(m,1); expect(m.fighters[1].health).toBe(MIRA.stats.maxHealth-KAIEN.attacks.light1.damage);
    advance(m,40); expect(m.fighters[1].health).toBe(MIRA.stats.maxHealth-KAIEN.attacks.light1.damage);
  });
  it('holding attack does not auto-repeat and whiff cannot cancel startup', () => {
    const m=active(); advance(m,80,input({light:true})); expect(m.fighters[0].attack).toBeNull();
    advance(m,1); advance(m,1,input({light:true})); advance(m,1); advance(m,1,input({light:true}));
    expect(m.fighters[0].attack?.id).toBe('kaien_light_1');
  });
  it('air attacks actually advance and produce active frames', () => {
    const m=active(); advance(m,1,input({up:true})); advance(m,8); advance(m,1,input({light:true}));
    advance(m,KAIEN.attacks.airLight.startup);
    expect(m.fighters[0].attackPhase).toBe('active'); expect(m.fighters[0].currentHitbox()).not.toBeNull();
  });
  it('guard chips but cannot KO; fresh guard parries only in its timing window', () => {
    const m=active(); close(m); advance(m,12,input(),input({guard:true})); advance(m,1,input({light:true}),input({guard:true}));
    advance(m,7,input(),input({guard:true})); expect(m.fighters[1].health).toBe(236);
    const a=new Fighter(0,KAIEN,700,1),b=new Fighter(1,MIRA,775,-1);
    b.vstate='guard'; b.guardFrames=12; b.health=2;
    expect(b.receiveHit(a,KAIEN.attacks.heavy).type).toBe('blocked'); expect(b.health).toBe(1);
    b.guardFrames=0; b.vstate='guard'; expect(b.receiveHit(a,KAIEN.attacks.heavy).type).toBe('parried'); expect(b.health).toBe(1);
  });
  it('holding guard after blockstun does not reopen perfect guard', () => {
    const m=active(); close(m); advance(m,12,input(),input({guard:true}));
    advance(m,1,input({light:true}),input({guard:true})); advance(m,35,input(),input({guard:true}));
    expect(m.fighters[1].vstate).toBe('guard'); expect(m.fighters[1].guardFrames).toBeGreaterThan(7);
  });
  it('interruption removes an active attack', () => {
    const m=active(); close(m); advance(m,1,input({heavy:true}),input({light:true})); advance(m,7);
    expect(m.fighters[0].vstate).toBe('hitstun'); expect(m.fighters[0].attack).toBeNull();
  });
  it('simultaneous active attacks trade without player-one priority', () => {
    const m=new Match([KAIEN,KAIEN],{training:true}); m.phase='fighting'; close(m);
    advance(m,1,input({light:true}),input({light:true})); advance(m,5);
    expect(m.fighters[0].health).toBe(196); expect(m.fighters[1].health).toBe(196);
  });
  it('skill cooldown cannot be bypassed by new presses', () => {
    const m=active(); advance(m,1,input({skill:true}));
    expect(m.fighters[0].skillCooldown).toBe(120);
    advance(m,50); advance(m,1,input({skill:true}));
    expect(m.fighters[0].attack).toBeNull(); expect(m.fighters[0].skillCooldown).toBeGreaterThan(0);
  });
  it('ultimate requires and consumes 100 meter', () => {
    const m=active(); advance(m,1,input({ultimate:true})); expect(m.fighters[0].attack).toBeNull();
    advance(m,10); m.fighters[0].meter=100; advance(m,1,input({ultimate:true}));
    expect(m.fighters[0].attack?.kind).toBe('ultimate'); expect(m.fighters[0].meter).toBe(0);
  });
  it('combo damage scales, and recovers when stun ends', () => {
    const a=new Fighter(0,KAIEN,700,1),b=new Fighter(1,MIRA,775,-1);
    const first=b.receiveHit(a,KAIEN.attacks.light1).damage;
    const second=b.receiveHit(a,KAIEN.attacks.light2).damage;
    expect(first).toBe(34); expect(second).toBe(26); expect(a.comboCount).toBe(2);
    const m=active(); m.fighters=[a,b]; advance(m,60); expect(a.comboCount).toBe(0);
  });
  it('chains confirmed lights through the buffer including hitstop', () => {
    const m=active(); close(m); advance(m,1,input({light:true})); advance(m,5);
    expect(m.hitstop).toBeGreaterThan(0);
    advance(m,1,input({light:true})); advance(m,8);
    expect(m.fighters[0].attack?.id).toBe('kaien_light_2');
  });
  it('Mira projectile spawns once and resolves real damage', () => {
    const m=new Match([MIRA,KAIEN],{training:true}); m.phase='fighting';
    advance(m,1,input({skill:true})); advance(m,10); expect(m.projectiles).toHaveLength(1);
    advance(m,60); expect(m.fighters[1].health).toBe(KAIEN.stats.maxHealth-44); expect(m.projectiles).toHaveLength(0);
  });
  it('mirror matches preserve centered hurtboxes', () => {
    const a=new Fighter(0,KAIEN,500,1); const box=a.hurtbox(); a.facing=-1;
    expect(a.hurtbox()).toEqual(box);
    expect(boxesOverlap({x:0,y:0,w:10,h:10},{x:10,y:0,w:10,h:10})).toBe(false);
    expect(boxesOverlap({x:0,y:0,w:10,h:10},{x:9,y:9,w:10,h:10})).toBe(true);
  });
  it('timeout compares health percentage; two wins completes the match', () => {
    const m=active(false);
    for(let round=0;round<2;round++) {
      m.fighters[1].health=100; m.timerFrames=1; advance(m,1);
      expect(m.winner).toBe(0); advance(m,ROUND_END_FRAMES);
      if (round===0) advance(m,INTRO_FRAMES);
    }
    expect(m.phase).toBe('matchOver'); expect(m.matchWinner).toBe(0); expect(m.wins).toEqual([2,0]);
  });
  it('draws do not award wins and cap at five rounds', () => {
    const m=active(false);
    for(let round=0;round<5;round++) {
      m.timerFrames=1; advance(m,1); expect(m.winner).toBe('draw'); advance(m,ROUND_END_FRAMES);
      if(round<4) advance(m,INTRO_FRAMES);
    }
    expect(m.phase).toBe('matchOver'); expect(m.matchWinner).toBeNull();
  });
  it('defeated fighters cannot attack or move', () => {
    const m=active(false); close(m); m.fighters[1].health=1;
    advance(m,1,input({heavy:true})); advance(m,12); expect(m.phase).toBe('roundOver');
    const f=m.fighters[1],x=f.x; advance(m,20,input(),input({light:true,left:true}));
    expect(f.attack).toBeNull(); expect(f.x).toBe(x); expect(f.vstate).toBe('ko');
  });
  it('training resets after KO without awarding wins', () => {
    const m=active(); m.fighters[1].health=0; advance(m,1); advance(m,ROUND_END_FRAMES);
    expect(m.phase).toBe('fighting'); expect(m.fighters[1].health).toBe(240); expect(m.wins).toEqual([0,0]);
  });
  it('replaying identical inputs produces identical snapshots', () => {
    const a=active(),b=active();
    for(let t=0;t<900;t++) {
      const ins: [InputFrame,InputFrame]=[input({right:t%100<25,light:t%23===0,skill:t%125===0}),input({left:t%100<25,heavy:t%40===0})];
      a.step(ins); b.step(ins);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
  });
});

describe('legal AI',()=>{
  it.each(['easy','normal','hard'] as const)('%s AI completes matches through ordinary inputs',difficulty=>{
    const m=new Match(); const ai0=new FighterAI(difficulty,42), ai1=new FighterAI('normal',21);
    for(let t=0;t<30000 && m.phase!=='matchOver';t++) {
      m.step([ai0.step(m,0),ai1.step(m,1)]);
      for(const f of m.fighters) { expect(f.health).toBeGreaterThanOrEqual(0); expect(f.meter).toBeLessThanOrEqual(100); expect(f.x).toBeGreaterThanOrEqual(60); expect(f.x).toBeLessThanOrEqual(1540); }
    }
    expect(m.phase).toBe('matchOver'); expect(ai0.step(m,0)).toEqual(EMPTY_INPUT);
  });
});
