import { EMPTY_INPUT, type InputFrame, type Side } from './types.js';
import type { Match } from './combat/match.js';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type DummyBehavior = 'stand' | 'guard' | 'jump' | 'attack' | 'counter' | 'random';

/** Seeded decision cadence; AI produces ordinary inputs, never edits fighter state. */
export class FighterAI {
  private seed: number;
  private until = 0;
  private input = { ...EMPTY_INPUT };
  constructor(readonly difficulty: Difficulty = 'normal', seed = 43) { this.seed = seed; }
  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  step(match: Match, side: Side): InputFrame {
    if (match.phase !== 'fighting' || match.fighters[side].health <= 0) return { ...EMPTY_INPUT };
    if (this.until-- > 0) {
      // Attack commands are pulses, movement/guard persist until next decision.
      return { ...this.input, light: false, heavy: false, skill: false, ultimate: false, dash: false, up: false };
    }
    this.until = { easy: 27, normal: 17, hard: 11 }[this.difficulty];
    const f = match.fighters[side], other = match.fighters[side === 0 ? 1 : 0];
    const distance = Math.abs(f.x - other.x), direction = other.x > f.x;
    const r = this.random();
    const next = { ...EMPTY_INPUT };
    if (other.attack && distance < 150 && this.difficulty !== 'easy' && r < 0.55) next.guard = true;
    else if (f.meter >= 100 && distance < 210) next.ultimate = true;
    else if (f.skillCooldown === 0 && distance < 600 && distance > 95 && r < 0.45) next.skill = true;
    else if (distance > 85) {
      next.right = direction; next.left = !direction;
      next.dash = distance > 280 && r < 0.2;
    } else if (r < (this.difficulty === 'easy' ? 0.7 : 0.9)) {
      next.heavy = other.attackPhase === 'recovery' || r > 0.55; next.light = !next.heavy;
    } else next.up = true;
    this.input = next;
    return next;
  }
}

export function dummyInput(match: Match, behavior: DummyBehavior, ai: FighterAI): InputFrame {
  const t = match.tick;
  return { ...EMPTY_INPUT,
    ...(behavior === 'random' ? ai.step(match, 1) : {}),
    guard: behavior === 'guard' || (behavior === 'counter' && match.fighters[0].attack !== null),
    up: behavior === 'jump' && t % 65 === 0,
    light: (behavior === 'attack' && t % 35 === 0) || (behavior === 'counter' && match.fighters[0].attackPhase === 'recovery' && t % 20 === 0),
  };
}
