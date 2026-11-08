import Phaser from 'phaser';
import type { Settings } from '../../persistence/save';
import type { VisualTier } from '../../config/visual-quality';

export const SUNSPIRE_LAYERS = ['sky','city','court','floor','foreground'] as const;

/** Five separately rasterized original SVG strata. No expensive postprocessing. */
export class SunspirePresentation {
  private readonly layers: { image:Phaser.GameObjects.Image; factor:number }[] = [];
  private readonly beams: Phaser.GameObjects.Graphics;
  private readonly ambient: Phaser.GameObjects.Graphics;
  private time = 0;
  private readonly motes = Array.from({length:36},(_,i)=>({
    x: (i * 233 + 127) % 1540 + 30, y: (i * 137 + 201) % 590 + 170,
    speed: 2 + i % 5, phase: i * 2.399, leaf: i % 9 === 0,
  }));
  constructor(scene: Phaser.Scene, private readonly settings: Settings) {
    const add = (name:typeof SUNSPIRE_LAYERS[number],factor:number,depth:number,regions:number[][],overscan=1) => {
      for (const [x=0,y=0,w=1600,h=900] of regions) {
        const image=scene.add.image(800,450,`sunspire-${name}`).setDisplaySize(1600*overscan,900*overscan).setDepth(depth);
        const ratio=image.width/1600;
        image.setCrop(x*ratio,y*ratio,w*ratio,h*ratio);
        this.layers.push({image,factor});
      }
    };
    // Crop transparent regions: five strata cost ~2.3 screen fills rather than five.
    add('sky',0.08,0,[[0,0,1600,900]],1.1);
    add('city',0.32,1,[[0,280,1600,475]],1.04);
    add('court',0.85,2,[[0,0,1600,450],[0,450,405,320],[1195,450,405,320]]);
    add('floor',1,3,[[0,750,1600,150]]);
    add('foreground',1.12,20,[[0,740,400,160],[1200,740,400,160]]);
    this.beams = scene.add.graphics().setDepth(5);
    this.beams.fillStyle(0xffebbd,0.035);
    this.beams.fillTriangle(1190,120,734,763,959,763);
    this.beams.fillStyle(0xffefca,0.025);
    this.beams.fillTriangle(1160,100,462,765,703,765);
    this.ambient = scene.add.graphics().setDepth(15);
  }
  update(delta: number, paused: boolean, tier: VisualTier, centerX: number): number {
    if (!paused && !this.settings.reducedMotion) this.time += Math.min(delta,50) / 1000;
    const move = tier > 0 && !this.settings.reducedMotion;
    const offset = centerX - 800;
    this.layers.forEach(({image,factor})=>image.x=800+(move ? offset * (1-factor) : 0));
    this.beams.setVisible(tier > 0);
    const g = this.ambient; g.clear();
    if (this.settings.reducedMotion) return 0;
    const count = [4,18,36][tier]!;
    for(let i=0;i<count;i++) {
      const m = this.motes[i]!;
      const x = (m.x + this.time*m.speed*2) % 1600;
      const y = m.y + Math.sin(this.time*0.4+m.phase)*18;
      const alpha = 0.12+0.18*(0.5+0.5*Math.sin(this.time+m.phase));
      if (m.leaf && tier > 0) {
        const sway = Math.sin(this.time*1.7+m.phase)*5;
        g.fillStyle(0xb8a36b,alpha+0.1); g.fillTriangle(x-5,y,x+5,y+sway,x,y+4);
      } else {
        g.fillStyle(0xf9dfac,alpha); g.fillCircle(x,y,i%3===0?1.8:1);
      }
    }
    return count;
  }
}
