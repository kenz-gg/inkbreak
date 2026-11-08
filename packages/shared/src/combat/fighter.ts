import {
  BACKDASH_FRAMES, BACKDASH_SPEED, COMBO_SCALE_MIN, COMBO_SCALE_STEP,
  DASH_COOLDOWN, DASH_FRAMES, DASH_SPEED, GRAVITY, GROUND_Y,
  GUARD_CHIP_FACTOR, INPUT_BUFFER_FRAMES, JUMP_SQUAT_FRAMES,
  LANDING_FRAMES, PARRY_WINDOW_FRAMES, WALL_LEFT, WALL_RIGHT,
} from '../constants.js';
import { EMPTY_INPUT, type AttackDef, type BoxDef, type CharacterDef,
  type FighterSnapshot, type FighterVState, type InputFrame, type Side } from '../types.js';

type Action = 'light' | 'heavy' | 'skill' | 'ultimate' | 'dash' | 'up';
const actions: Action[] = ['ultimate', 'skill', 'heavy', 'light', 'up', 'dash'];
export type WorldBox = { x: number; y: number; w: number; h: number };

/** All timing is integer simulation ticks. The renderer never mutates this state. */
export class Fighter {
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  onGround = true;
  vstate: FighterVState = 'idle';
  frame = 0;
  health: number;
  meter = 0;
  comboCount = 0;
  comboDamage = 0;
  skillCooldown = 0;
  dashCooldown = 0;
  guardFrames = 0;
  attack: AttackDef | null = null;
  attackFrame = 0;
  hitConfirmed = false;
  private previous: InputFrame = { ...EMPTY_INPUT };
  private buffer: { action: Action; ttl: number }[] = [];
  private stun = 0;
  private airAttackUsed = false;

  constructor(readonly side: Side, readonly char: CharacterDef, public x: number, public facing: 1 | -1) {
    this.health = char.stats.maxHealth;
  }

  get maxHealth(): number { return this.char.stats.maxHealth; }
  get attackPhase(): 'startup' | 'active' | 'recovery' | null {
    if (!this.attack) return null;
    if (this.attackFrame < this.attack.startup) return 'startup';
    if (this.attackFrame < this.attack.startup + this.attack.active) return 'active';
    return 'recovery';
  }
  hurtbox(): WorldBox { return { x: this.x - 28, y: this.y - 138, w: 56, h: 138 }; }
  boxWorld(b: BoxDef): WorldBox {
    return { x: this.facing === 1 ? this.x + b.ox : this.x - b.ox - b.w, y: this.y + b.oy, w: b.w, h: b.h };
  }
  currentHitbox(): WorldBox | null {
    return this.attack && this.attack.damage > 0 && this.attackPhase === 'active' && !this.hitConfirmed
      ? this.boxWorld(this.attack.hitbox) : null;
  }
  currentStunRemaining(): number { return this.stun; }
  private state(state: FighterVState): void { this.vstate = state; this.frame = 0; }
  private consume(action: Action): void { this.buffer = this.buffer.filter(b => b.action !== action); }
  private has(action: Action): boolean { return this.buffer.some(b => b.action === action); }
  private begin(def: AttackDef): boolean {
    if (this.health <= 0 || (def.kind === 'skill' && this.skillCooldown > 0) || this.meter < (def.meterCost ?? 0)) return false;
    if (!this.onGround && this.airAttackUsed) return false;
    this.attack = def;
    this.attackFrame = 0;
    this.hitConfirmed = false;
    this.meter -= def.meterCost ?? 0;
    if (def.cooldown) this.skillCooldown = def.cooldown;
    if (!this.onGround) this.airAttackUsed = true;
    else this.vx = 0;
    this.state('attack');
    return true;
  }

  /** Called even during hitstop so short button presses still enter the buffer. */
  capture(input: InputFrame, age = true): void {
    if (age) this.buffer = this.buffer.map(b => ({ ...b, ttl: b.ttl - 1 })).filter(b => b.ttl > 0);
    for (const action of actions) {
      if (input[action] && !this.previous[action]) {
        this.consume(action);
        this.buffer.push({ action, ttl: INPUT_BUFFER_FRAMES });
      }
    }
    this.previous = { ...input };
  }

  update(input: InputFrame, opponent: Fighter): void {
    if (this.health <= 0 || this.vstate === 'ko' || this.vstate === 'victory') return;
    this.frame++;
    this.skillCooldown = Math.max(0, this.skillCooldown - 1);
    this.dashCooldown = Math.max(0, this.dashCooldown - 1);
    const dir = Number(input.right) - Number(input.left);
    const speed = dir === this.facing ? this.char.stats.walkForward : this.char.stats.walkBackward;

    if (this.vstate === 'hitstun' || this.vstate === 'blockstun') {
      this.vx *= 0.84;
      if (--this.stun <= 0) {
        const blocking = this.vstate === 'blockstun' && input.guard && this.onGround;
        this.state(blocking ? 'guard' : this.onGround ? 'idle' : 'air');
        // Holding guard through blockstun never grants a new parry window.
        if (blocking) this.guardFrames = PARRY_WINDOW_FRAMES + 1;
      }
      return;
    }
    if (this.vstate === 'jump_squat') {
      if (this.frame >= JUMP_SQUAT_FRAMES) {
        this.onGround = false; this.vy = -this.char.stats.jumpVelocity;
        this.airAttackUsed = false; this.state('air');
      }
      return;
    }
    if (this.vstate === 'landing') {
      this.vx = 0;
      if (this.frame >= LANDING_FRAMES) this.state('idle');
      return;
    }
    if (this.vstate === 'dash' || this.vstate === 'backdash') {
      if (this.frame >= (this.vstate === 'dash' ? DASH_FRAMES : BACKDASH_FRAMES)) {
        this.vx = 0; this.state('idle');
      }
      return;
    }
    if (this.attack) {
      const def = this.attack;
      this.attackFrame++;
      if (def.selfAdvance && this.attackFrame < def.startup + def.active) this.vx = this.facing * def.selfAdvance;
      else if (this.onGround) this.vx *= 0.7;
      if (this.hitConfirmed && this.attackPhase !== 'startup' && def.cancels &&
          (def.cancels.window === 'both' || def.cancels.window === this.attackPhase)) {
        for (const next of Object.values(this.char.attacks)) {
          const key: Action = next.kind === 'air' ? 'light' : next.kind;
          if (def.cancels.attackIds.includes(next.id) && this.has(key) && this.begin(next)) {
            this.consume(key); return;
          }
        }
      }
      if (this.attackFrame >= def.startup + def.active + def.recovery) {
        this.attack = null; this.state(this.onGround ? 'idle' : 'air');
      }
      return;
    }

    if (this.onGround) this.facing = opponent.x >= this.x ? 1 : -1;
    if (this.vstate === 'guard') {
      this.guardFrames++;
      if (!input.guard) this.state('idle');
      else { this.vx = 0; return; }
    }
    if (input.guard && this.onGround) {
      this.guardFrames = 0; this.vx = 0; this.state('guard'); return;
    }
    for (const action of actions) {
      if (!this.has(action)) continue;
      if (action === 'up' && this.onGround) {
        this.consume(action); this.vx = dir * speed * 0.8; this.state('jump_squat'); return;
      }
      if (action === 'dash' && this.onGround && this.dashCooldown === 0) {
        this.consume(action);
        const direction = dir || this.facing;
        const forward = direction === this.facing;
        this.vx = direction * (forward ? DASH_SPEED : BACKDASH_SPEED);
        this.dashCooldown = DASH_COOLDOWN; this.state(forward ? 'dash' : 'backdash'); return;
      }
      if (action === 'up' || action === 'dash') continue;
      if (!this.onGround && action !== 'light' && action !== 'heavy') continue;
      const def = !this.onGround ? this.char.attacks.airLight : this.char.attacks[action === 'light' ? 'light1' : action];
      if (this.begin(def)) { this.consume(action); return; }
    }
    if (this.onGround) {
      this.vx = dir * speed;
      this.vstate = !dir ? 'idle' : dir === this.facing ? 'walk' : 'walk_back';
    } else {
      const target = dir * this.char.stats.walkForward * 0.65;
      this.vx += Math.max(-0.6, Math.min(0.6, target - this.vx));
    }
  }

  applyPhysics(): void {
    this.x = Math.max(WALL_LEFT, Math.min(WALL_RIGHT, this.x + this.vx));
    if (!this.onGround) {
      this.vy += GRAVITY; this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y; this.vy = 0; this.onGround = true;
        if (this.vstate === 'air' || this.vstate === 'attack') {
          this.attack = null; this.state('landing');
        }
      }
    }
  }

  receiveHit(attacker: Fighter, def: AttackDef, projectile = false): { type: 'hit' | 'blocked' | 'parried'; damage: number; hitstop: number } {
    const away = this.x >= attacker.x ? 1 : -1;
    const blocks = this.onGround && (this.vstate === 'guard' || this.vstate === 'blockstun') && this.facing === -away;
    if (!projectile) attacker.hitConfirmed = true;
    if (blocks && this.vstate === 'guard' && this.guardFrames < PARRY_WINDOW_FRAMES) {
      if (!projectile) { attacker.attack = null; attacker.stun = 20; attacker.state('hitstun'); attacker.vx = -away * 5; }
      this.meter = Math.min(100, this.meter + 12);
      this.guardFrames = PARRY_WINDOW_FRAMES;
      return { type: 'parried', damage: 0, hitstop: 8 };
    }
    this.attack = null;
    if (blocks) {
      const damage = Math.min(this.health - 1, Math.round(def.damage * GUARD_CHIP_FACTOR));
      this.health -= damage; this.stun = def.blockstun || 10;
      this.state('blockstun'); this.vx = away * 5;
      this.meter = Math.min(100, this.meter + 4);
      return { type: 'blocked', damage, hitstop: 5 };
    }
    const damage = Math.round(def.damage * Math.max(COMBO_SCALE_MIN, 1 - attacker.comboCount * COMBO_SCALE_STEP));
    this.health = Math.max(0, this.health - damage);
    this.stun = def.hitstun; this.state('hitstun');
    this.vx = away * def.knockback / this.char.stats.mass;
    attacker.comboCount++; attacker.comboDamage += damage;
    attacker.meter = Math.min(100, attacker.meter + def.meterGain);
    this.meter = Math.min(100, this.meter + Math.floor(damage / 3));
    return { type: 'hit', damage, hitstop: def.kind === 'light' || def.kind === 'air' ? 6 : 10 };
  }

  finish(won: boolean): void {
    this.attack = null; this.buffer = []; this.vx = 0; this.state(won ? 'victory' : 'ko');
  }
  snapshot(): FighterSnapshot {
    return { side: this.side, x: this.x, y: this.y, vx: this.vx, vy: this.vy, facing: this.facing,
      onGround: this.onGround, vstate: this.vstate, health: this.health, maxHealth: this.maxHealth,
      meter: this.meter, comboCount: this.comboCount, comboDamage: this.comboDamage,
      attackId: this.attack?.id ?? null, attackFrame: this.attackFrame, attackPhase: this.attackPhase,
      skillCooldown: this.skillCooldown, guardFrames: this.guardFrames };
  }
}
