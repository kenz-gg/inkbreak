import { Fighter } from './fighter.js';
import { KAIEN } from '../characters/kaien.js';
import { MIRA } from '../characters/mira.js';
import { BODY_PUSH_GAP, INTRO_FRAMES, MAX_ROUNDS, ROUND_END_FRAMES, ROUND_TIME_SECONDS, ROUNDS_TO_WIN, WALL_LEFT, WALL_RIGHT } from '../constants.js';
import { boxesOverlap, DEFAULT_MATCH_OPTIONS, type AttackDef, type CharacterDef, type EventLog, type InputFrame, type MatchOptions, type MatchSnapshot, type Phase, type Side } from '../types.js';

export interface Projectile { x: number; y: number; vx: number; side: Side; ttl: number; w: number; h: number; attack: AttackDef }

export class Match {
  fighters: [Fighter, Fighter];
  phase: Phase = 'intro';
  phaseFrame = 0;
  tick = 0;
  roundNumber = 1;
  wins: [number, number] = [0, 0];
  timerFrames = ROUND_TIME_SECONDS * 60;
  hitstop = 0;
  winner: Side | 'draw' | null = null;
  matchWinner: Side | null = null;
  projectiles: Projectile[] = [];
  events: EventLog[] = [];
  infiniteMeter = false;
  readonly options: MatchOptions;

  constructor(readonly characters: [CharacterDef, CharacterDef] = [KAIEN, MIRA], options: Partial<MatchOptions> = {}) {
    this.options = { ...DEFAULT_MATCH_OPTIONS, ...options };
    this.fighters = [new Fighter(0, characters[0], 620, 1), new Fighter(1, characters[1], 980, -1)];
  }

  resetPositions(): void {
    const meters = this.fighters.map(f => f.meter);
    this.fighters = [new Fighter(0, this.characters[0], 620, 1), new Fighter(1, this.characters[1], 980, -1)];
    this.fighters.forEach((f, i) => { f.meter = meters[i] ?? 0; });
    this.projectiles = []; this.hitstop = 0; this.phaseFrame = 0;
    this.timerFrames = ROUND_TIME_SECONDS * 60; this.winner = null;
    this.phase = this.options.training ? 'fighting' : 'intro';
  }

  step(inputs: [InputFrame, InputFrame]): EventLog[] {
    this.events = []; this.tick++;
    if (this.phase === 'matchOver') return this.events;
    if (this.phase === 'intro') {
      if (++this.phaseFrame >= INTRO_FRAMES) { this.phase = 'fighting'; this.events.push({ type: 'fight' }); }
      return this.events;
    }
    if (this.phase === 'roundOver') {
      this.fighters.forEach(f => f.applyPhysics());
      if (++this.phaseFrame >= ROUND_END_FRAMES) {
        if (!this.options.training && (Math.max(...this.wins) >= ROUNDS_TO_WIN || this.roundNumber >= MAX_ROUNDS)) {
          this.phase = 'matchOver';
          this.matchWinner = this.wins[0] === this.wins[1] ? null : this.wins[0] > this.wins[1] ? 0 : 1;
          this.events.push({ type: 'matchEnd' });
        } else { this.roundNumber++; this.resetPositions(); this.events.push({ type: 'roundStart' }); }
      }
      return this.events;
    }
    this.fighters.forEach((f, i) => f.capture(inputs[i as Side], this.hitstop === 0));
    if (this.hitstop > 0) { this.hitstop--; return this.events; }
    if (this.options.timerEnabled && !this.options.training) this.timerFrames--;
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      const other = this.fighters[f.side === 0 ? 1 : 0];
      if (other.vstate !== 'hitstun') { f.comboCount = 0; f.comboDamage = 0; }
      if (this.infiniteMeter) f.meter = 100;
      const previous = f.vstate;
      f.update(inputs[f.side], other);
      f.applyPhysics();
      if (f.vstate !== previous && (f.vstate === 'dash' || f.vstate === 'landing')) {
        this.events.push({ type: f.vstate, side: f.side, x: f.x, y: f.y });
      }
      if (f.attack && f.attackFrame === 0 && (f.attack.kind === 'skill' || f.attack.kind === 'ultimate')) {
        this.events.push({ type: f.attack.kind === 'skill' ? 'skillUsed' : 'ultimateUsed', side: f.side, x: f.x, y: f.y - 70 });
      }
      this.spawnProjectiles(f);
    }
    if (Math.abs(a.y - b.y) < 110 && Math.abs(a.x - b.x) < BODY_PUSH_GAP) {
      const sign = a.x <= b.x ? 1 : -1;
      const push = (BODY_PUSH_GAP - Math.abs(a.x - b.x)) / 2;
      a.x = Math.max(WALL_LEFT, Math.min(WALL_RIGHT, a.x - sign * push));
      b.x = Math.max(WALL_LEFT, Math.min(WALL_RIGHT, b.x + sign * push));
    }
    // Gather contacts before applying either side: simultaneous attacks can trade.
    const contacts = this.fighters.flatMap(f => {
      const hit = f.currentHitbox(); const target = this.fighters[f.side === 0 ? 1 : 0];
      return hit && f.attack && boxesOverlap(hit, target.hurtbox()) ? [{ f, target, attack: f.attack }] : [];
    });
    for (const { f, target, attack } of contacts) this.hit(f, target, attack);
    for (const p of this.projectiles) {
      p.x += p.vx; p.ttl--;
      const target = this.fighters[p.side === 0 ? 1 : 0];
      if (boxesOverlap({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }, target.hurtbox())) {
        this.hit(this.fighters[p.side], target, p.attack, true); p.ttl = 0;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.ttl > 0 && p.x > -80 && p.x < 1680);
    if (a.health <= 0 || b.health <= 0 || this.timerFrames <= 0) {
      // Timeouts compare remaining health ratio because maximum health differs.
      const ah = a.health / a.maxHealth, bh = b.health / b.maxHealth;
      this.endRound(ah === bh ? 'draw' : ah > bh ? 0 : 1);
    }
    return this.events;
  }

  private spawnProjectiles(f: Fighter): void {
    const attack = f.attack; const def = attack?.projectile;
    if (!attack || !def) return;
    const elapsed = f.attackFrame - attack.startup;
    const interval = def.volleyInterval ?? 6;
    if (elapsed < 0 || elapsed % interval || elapsed / interval >= (def.volleys ?? 1)) return;
    this.projectiles.push({ x: f.x + f.facing * 55, y: f.y - 85, vx: def.speed * f.facing,
      side: f.side, ttl: def.ttl, w: def.box.w, h: def.box.h,
      attack: { ...attack, damage: def.damage, hitstun: def.hitstun, knockback: def.knockback, blockstun: 10 } });
  }
  private hit(source: Fighter, target: Fighter, attack: AttackDef, projectile = false): void {
    const result = target.receiveHit(source, attack, projectile);
    this.hitstop = Math.max(this.hitstop, result.hitstop);
    this.events.push({ type: result.type, side: source.side, x: target.x, y: target.y - 85,
      damage: result.damage, comboCount: source.comboCount, heavy: attack.kind !== 'light' });
  }
  private endRound(winner: Side | 'draw'): void {
    this.winner = winner; this.phase = 'roundOver'; this.phaseFrame = 0;
    if (winner !== 'draw' && !this.options.training) this.wins[winner]++;
    this.fighters.forEach(f => f.finish(f.side === winner)); this.projectiles = [];
    this.events.push({ type: 'roundEnd' });
  }
  snapshot(): MatchSnapshot {
    return { phase: this.phase, roundNumber: this.roundNumber, wins: [...this.wins], timerFrames: this.timerFrames,
      hitstop: this.hitstop, winner: this.winner, matchWinner: this.matchWinner,
      events: this.events.map(e => ({ ...e })), fighters: [this.fighters[0].snapshot(), this.fighters[1].snapshot()],
      projectiles: this.projectiles.map(p => ({ x: p.x, y: p.y, vx: p.vx, side: p.side })) };
  }
}
