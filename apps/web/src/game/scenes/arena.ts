import Phaser from 'phaser';
import { Match, type EventLog, type InputFrame } from '@inkbreak/shared';
import { FighterRig } from '../fighters/rig';
import type { Settings } from '../../persistence/save';
import { SUNSPIRE_LAYERS, SunspirePresentation } from '../arenas/sunspire';
import { RENDER_WIDTHS, VisualBudget } from '../../config/visual-quality';

export interface ArenaBridge {
  match: Match;
  paused: boolean;
  settings: Settings;
  input: () => [InputFrame, InputFrame];
  onTick: (events: EventLog[]) => void;
  onError: (message: string) => void;
  onLoading: (progress: number | null) => void;
  debug: boolean;
  fps: number;
  particles: number;
  visualQuality: string;
}
type Spark = { x: number; y: number; vx: number; vy: number; life: number; total: number; color: number; kind: 'spark' | 'paper' | 'dust' | 'ring' };
export class ArenaScene extends Phaser.Scene {
  private accumulator = 0;
  private rigs: FighterRig[] = [];
  private effects!: Phaser.GameObjects.Graphics;
  private boxes!: Phaser.GameObjects.Graphics;
  private scenery!: SunspirePresentation;
  private budget!: VisualBudget;
  private poseTick = 0;
  private framingX = 800;
  private framingZoom = 1;
  private sparks: Spark[] = Array.from({ length: 80 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, total: 1, color: 0, kind: 'spark' }));
  constructor(private readonly bridge: ArenaBridge) { super('SunspireCourt'); }
  preload(): void {
    this.bridge.onLoading(0);
    const width = {low:960,medium:1280,high:1600}[this.bridge.settings.quality];
    for (const layer of SUNSPIRE_LAYERS) this.load.svg(`sunspire-${layer}`, `${import.meta.env.BASE_URL}assets/arenas/sunspire/${layer}.svg`, { width, height: width*9/16 });
    this.load.on('loaderror', () => this.bridge.onError('The Sunspire arena asset could not be loaded. Reload to retry.'));
    this.load.on('progress', (progress:number) => this.bridge.onLoading(progress));
  }
  create(): void {
    this.budget = new VisualBudget(this.bridge.settings);
    this.scenery = new SunspirePresentation(this,this.bridge.settings);
    this.rigs = [new FighterRig(this), new FighterRig(this)];
    this.effects = this.add.graphics().setDepth(16); this.boxes = this.add.graphics().setDepth(30);
    this.cameras.main.setZoom(this.scale.width/1600);
    if (!this.bridge.settings.reducedMotion) this.cameras.main.fadeIn(450,31,39,32);
    this.bridge.onLoading(null);
  }
  override update(_time: number, delta: number): void {
    const b = this.bridge;
    if (!b.paused) {
      this.accumulator += Math.min(delta, 100);
      while (this.accumulator >= 1000 / 60) {
        const events = b.match.step(b.input());
        if (b.match.hitstop === 0) this.poseTick++;
        for (const event of events) this.burst(event);
        b.onTick(events);
        this.accumulator -= 1000 / 60;
      }
    } else this.accumulator = 0;
    b.fps = this.game.loop.actualFps;
    this.budget.sample(this.game.loop.rawDelta,b.paused);
    b.visualQuality = this.budget.label;
    const renderWidth = RENDER_WIDTHS[this.budget.tier];
    if (this.scale.width !== renderWidth) this.scale.resize(renderWidth,renderWidth*9/16);
    const [left,right] = b.match.fighters;
    // Keep feet near the lower fifth; zoom out when spacing widens, never crop a fighter.
    const cameraMotion = !b.settings.reducedMotion;
    const targetZoom = cameraMotion ? Phaser.Math.Clamp(1330/(Math.abs(left.x-right.x)+560),1,1.3) : 1;
    const targetX = Phaser.Math.Clamp((left.x+right.x)/2,800/targetZoom,1600-800/targetZoom);
    if (!b.paused && b.match.hitstop === 0) {
      const ease = 1-Math.exp(-Math.min(delta,100)/220);
      this.framingZoom += (targetZoom-this.framingZoom)*ease;
      this.framingX += ((cameraMotion?targetX:800)-this.framingX)*ease;
      this.cameras.main.setZoom(this.framingZoom*(this.scale.width/1600));
      this.cameras.main.centerOn(this.framingX,810-350/this.framingZoom);
    }
    const ambientCount = this.scenery.update(delta,b.paused,this.budget.tier,this.framingX);
    this.rigs.forEach((rig, i) => rig.draw(b.match.fighters[i as 0 | 1], this.poseTick, b.settings.reducedMotion));
    const g = this.effects; g.clear();
    for (const p of b.match.projectiles) {
      const direction = Math.sign(p.vx);
      g.lineStyle(1,0xeee0ba,0.25); g.lineBetween(p.x-direction*50,p.y+2,p.x,p.y);
      g.fillStyle(0xf6e7bb); g.lineStyle(1.5,0x873c4e);
      g.fillTriangle(p.x-22,p.y,p.x+15,p.y-12,p.x+6,p.y+13); g.strokeTriangle(p.x-22,p.y,p.x+15,p.y-12,p.x+6,p.y+13);
      g.fillStyle(0xbf9890); g.fillTriangle(p.x-22,p.y,p.x+4,p.y,p.x+6,p.y+13);
    }
    b.particles = ambientCount;
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      b.particles++;
      const dt = Math.min(delta,50);
      if (!b.paused) { s.life -= dt; s.x += s.vx * dt / 16.67; s.y += s.vy * dt / 16.67; if(s.kind!=='ring') s.vy += dt * 0.006; }
      const alpha = Math.max(0,s.life/s.total);
      if (s.kind==='ring') {
        g.lineStyle(1+alpha*2,s.color,alpha*0.7); g.strokeCircle(s.x,s.y,9+(1-alpha)*42);
      } else if (s.kind==='dust') {
        g.fillStyle(s.color,alpha*0.22); g.fillEllipse(s.x,s.y,16*(2-alpha),5*(2-alpha));
      } else if (s.kind==='paper') {
        g.fillStyle(s.color,alpha); g.fillTriangle(s.x-4,s.y,s.x+4,s.y-3,s.x+2,s.y+5);
      } else {
        g.lineStyle(1+alpha*2,s.color,alpha); g.lineBetween(s.x,s.y,s.x-s.vx*2.8,s.y-s.vy*2.8);
      }
    }
    this.boxes.clear();
    if (b.debug) for (const f of b.match.fighters) {
      const hurt = f.hurtbox(); this.boxes.lineStyle(2,0x95d49b); this.boxes.strokeRect(hurt.x,hurt.y,hurt.w,hurt.h);
      const hit = f.currentHitbox(); if (hit) { this.boxes.fillStyle(0xee6843,0.25); this.boxes.fillRect(hit.x,hit.y,hit.w,hit.h); }
    }
    if (b.debug) for (const p of b.match.projectiles) {
      this.boxes.lineStyle(2,0xee6843); this.boxes.strokeRect(p.x-p.w/2,p.y-p.h/2,p.w,p.h);
    }
  }
  private burst(e: EventLog): void {
    if (e.x === undefined || e.y === undefined) return;
    const settings = this.bridge.settings;
    const tier = this.budget?.tier ?? 0;
    const ground = e.type === 'landing' || e.type === 'dash';
    const defensive = e.type === 'blocked' || e.type === 'parried';
    const mira = e.side !== undefined && this.bridge.match.fighters[e.side].char.id === 'mira';
    const count = settings.reducedMotion ? 2 : ground ? [3,7,10][tier]! : [5,14,24][tier]!;
    let used = 0;
    for (const spark of this.sparks) {
      if (spark.life > 0) continue;
      const angle = used * 2.399;
      const ring = !ground && used === 0;
      const life = ground ? 350 : 220+used*7;
      Object.assign(spark, { x: e.x, y: e.y+(ground?3:0), vx: ring?0:Math.cos(angle)*(ground?2:7), vy: ring?0:Math.sin(angle)*(ground?0.7:6)-1,
        life, total:life, kind:ring?'ring':ground?'dust':mira&&!defensive?'paper':'spark',
        color:ground?0xc4b184:defensive?0xf5eac6:mira?0xecd6b8:0xf4af63 });
      if (++used >= count) break;
    }
    if (!settings.reducedMotion && tier > 0 && e.type === 'hit') this.cameras.main.shake(e.heavy ? 75 : 35, e.heavy ? 0.002 : 0.001);
  }
}

export function createGame(parent: HTMLElement, bridge: ArenaBridge): Phaser.Game {
  const width = { low:960, medium:1280, high:1600 }[bridge.settings.quality];
  return new Phaser.Game({
    type: bridge.settings.quality === 'low' ? Phaser.CANVAS : Phaser.AUTO,
    parent, width, height:width*9/16, backgroundColor: '#272e2b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'low-power' },
    fps: { target: bridge.settings.quality === 'low' ? 30 : 60, forceSetTimeOut: bridge.settings.quality === 'low', smoothStep: false },
    audio: { noAudio: true }, scene: new ArenaScene(bridge),
  });
}
