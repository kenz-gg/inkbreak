import Phaser from 'phaser';
import type { Fighter } from '@inkbreak/shared';

/** Original articulated vector development rig, drawn in Phaser only.
 * Feet = (0,0). Attack pose uses simulation phase, never wall-clock attack timing.
 */
export class FighterRig {
  private readonly root: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly softShadow: Phaser.GameObjects.Ellipse;
  private readonly contact: Phaser.GameObjects.Ellipse;
  constructor(scene: Phaser.Scene) {
    this.softShadow = scene.add.ellipse(0,815,132,23,0x29352a,0.08).setDepth(7);
    this.shadow = scene.add.ellipse(0, 813, 97, 13, 0x29352a, 0.21).setDepth(8);
    this.contact = scene.add.ellipse(0,812,65,6,0x252d25,0.36).setDepth(9);
    this.g = scene.add.graphics(); this.root = scene.add.container(0, 0, this.g).setDepth(10);
  }
  draw(f: Fighter, tick: number, reduced: boolean): void {
    const g = this.g, c = f.char.visual, mira = f.char.id === 'mira';
    const walk = f.vstate === 'walk' || f.vstate === 'walk_back';
    const stride = walk ? Math.sin(tick * 0.28) * 19 : 0;
    const breath = reduced ? 0 : Math.sin(tick * 0.055) * 2;
    const attack = f.attack;
    const phase = f.attackPhase;
    const strike = phase === 'active' ? 1 : phase === 'startup' ? -0.25 : attack ? Math.max(0, 1 - (f.attackFrame - attack.startup - attack.active) / attack.recovery) : 0;
    const guard = f.vstate === 'guard' || f.vstate === 'blockstun';
    const hurt = f.vstate === 'hitstun';
    const crouch = f.vstate === 'jump_squat' || f.vstate === 'landing' ? 12 : 0;
    const outline = 0x38312b;
    const altitude = Math.max(0,810-f.y);
    const contactScale = Math.max(0.4,1-altitude/380);
    this.softShadow.setPosition(f.x-12,817).setScale(1+altitude/550).setAlpha(Math.max(0.03,0.1-altitude/2200));
    this.shadow.setPosition(f.x-7, 814).setScale(contactScale).setAlpha(Math.max(0.07,0.24-altitude/1300));
    this.contact.setPosition(f.x,812).setScale(contactScale).setAlpha(Math.max(0,0.35-altitude/140));
    this.root.setPosition(f.x, f.y).setScale(f.facing, 1);
    this.root.setRotation(f.vstate === 'ko' ? -1.36 : hurt ? -0.14 : 0);
    if (f.vstate === 'ko') this.root.y -= 18;
    g.clear();
    const poly = (pts: number[], color: number) => { g.fillStyle(color); g.lineStyle(1.8, outline); g.beginPath(); g.moveTo(pts[0] ?? 0, pts[1] ?? 0); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0); g.closePath(); g.fillPath(); g.strokePath(); };
    const limb = (x: number, y: number, ex: number, ey: number, width: number, color: number) => {
      g.lineStyle(width + 3, outline); g.lineBetween(x, y, ex, ey); g.lineStyle(width, color); g.lineBetween(x, y, ex, ey);
      g.fillStyle(color); g.fillCircle(ex, ey, width / 2);
      g.lineStyle(2,0xf8d4a1,0.25); g.lineBetween(x-3,y-2,ex-3,ey-2);
    };
    const hip = -59 + crouch;
    // Back cloth / scarf follow-through.
    const flutter = reduced ? 0 : Math.sin(tick * 0.11) * 9;
    if (!mira) poly([-9,-127+crouch,-53,-126+flutter,-84,-108+flutter,-58,-105+flutter,-75,-90+flutter,-28,-111+crouch,12,-117+crouch], c.main);
    else {
      poly([-25,-133, -39,-80, -29,-67, 13,-85, 21,-132], c.hair);
      poly([10,-76,35,-64,49+flutter,-43,30+flutter,-49,40+flutter,-25,12,-54],c.main);
    }
    limb(-13,hip,-25-stride,-25,20,c.trim); limb(-25-stride,-25,-31-stride,-8,17,c.trim);
    limb(13,hip,23+stride,-29,21,mira ? c.main : 0x4b4540);
    const kick = attack?.kind === 'heavy' && !mira ? strike * 63 : 0;
    limb(23+stride,-29,30+stride+kick,-8-kick*0.9,18,c.trim);
    poly([-43-stride,-14,-21-stride,-14,-12-stride,0,-46-stride,0],c.hair);
    poly([20+stride+kick,-15-kick*.9,38+stride+kick,-15-kick*.9,49+stride+kick,-1-kick*.9,18+stride+kick,-1-kick*.9],c.hair);
    g.lineStyle(2,0xb1976e); g.lineBetween(-38-stride,-16,-23-stride,-14); g.lineBetween(23+stride+kick,-17-kick*.9,36+stride+kick,-17-kick*.9);
    g.lineStyle(1,0xc4ac85,0.8); g.lineBetween(-37-stride,-5,-14-stride,-3); g.lineBetween(22+stride+kick,-4-kick*.9,44+stride+kick,-4-kick*.9);
    // Coat panels and contrasting wrap.
    const torsoY = crouch + breath;
    poly([-23,-122+torsoY,7,-134+torsoY,28,-119+torsoY,21,hip,35,-35+crouch,7,-44+crouch,-1,hip,-16,-36+crouch,-36,-42+crouch,-23,hip],mira ? c.accent : c.main);
    // Cloth planes: lit lapel, shaded side, seam and embroidery (no texture shader).
    g.fillStyle(mira?0xb6aa8b:0x793e2f,0.65);
    g.fillTriangle(-23,-116+torsoY,-8,-77+crouch,-28,-43+crouch);
    g.fillTriangle(12,-72+crouch,34,-36+crouch,10,-45+crouch);
    g.lineStyle(1.5,mira?0x995467:0xe8b078,0.7);
    g.lineBetween(-22,-60+crouch,-29,-44+crouch); g.lineBetween(-29,-44+crouch,-17,-42+crouch);
    g.lineBetween(16,-60+crouch,27,-40+crouch); g.lineBetween(27,-40+crouch,14,-43+crouch);
    g.lineStyle(1,0x514235,0.45); g.lineBetween(-15,-110+torsoY,-9,-87+crouch); g.lineBetween(17,-100+torsoY,11,-81+crouch);
    if (mira) {
      g.lineStyle(0.8,c.main,0.65);
      for (const [x,y] of [[-19,-52],[19,-50],[-16,-91]]) { g.strokeTriangle(x!,y!-4,x!+3,y!+2,x!-3,y!+2); }
    } else {
      g.lineStyle(7,0x70543a); g.lineBetween(13,-122+torsoY,-9,-78+crouch);
      g.lineStyle(1,0xd4b17b); g.lineBetween(15,-121+torsoY,-7,-77+crouch);
    }
    g.lineStyle(5,mira ? c.main : c.accent); g.lineBetween(-17,-121+torsoY,6,-83+crouch); g.lineBetween(6,-83+crouch,22,-117+torsoY);
    poly([-24,-78+crouch,25,-78+crouch,24,-65+crouch,-24,-65+crouch], c.trim);
    g.fillStyle(c.accent); g.fillRect(-4,-77+crouch,11,11);
    g.fillStyle(c.trim); g.fillRect(-1,-74+crouch,5,5);
    if(!mira) { poly([-20,-74+crouch,-7,-71+crouch,-8,-57+crouch,-23,-59+crouch],0x8c6542); g.fillStyle(0xd1b07a); g.fillCircle(-15,-67+crouch,1.5); }
    // Back arm, then head and striking arm.
    limb(-20,-116+torsoY,-37,-84+crouch, mira ? 20 : 15, mira ? c.accent : c.main);
    limb(-37,-84+crouch,-18,-79+crouch,12,c.skin);
    g.fillStyle(c.skin); g.fillRect(-3,-140+torsoY,17,20);
    g.lineStyle(1.8,outline); g.fillEllipse(7,-151+torsoY,37,43); g.strokeEllipse(7,-151+torsoY,37,43);
    g.fillStyle(0xb47759,0.3); g.fillTriangle(-10,-158+torsoY,-5,-136+torsoY,7,-132+torsoY);
    poly([-12,-145+torsoY,-18,-166+torsoY,-5,-177+torsoY,0,-182+torsoY,13,-176+torsoY,25,-177+torsoY,29,-158+torsoY,20,-145+torsoY,18,-164+torsoY,6,-155+torsoY,-1,-164+torsoY,-5,-143+torsoY],c.hair);
    g.lineStyle(1.5,0x80634b,0.6); g.lineBetween(-9,-167+torsoY,1,-173+torsoY); g.lineBetween(6,-168+torsoY,17,-171+torsoY);
    g.lineStyle(2,outline); g.lineBetween(12,-153+torsoY,22,-154+torsoY);
    g.lineStyle(2,0xffe3b9); g.lineBetween(14,-150+torsoY,21,-151+torsoY);
    g.lineStyle(1.8,outline); g.lineBetween(19,-151+torsoY,19,-148+torsoY);
    g.lineStyle(1,0x9b654d); g.lineBetween(21,-148+torsoY,24,-143+torsoY); g.lineBetween(24,-143+torsoY,21,-142+torsoY); g.lineBetween(14,-138+torsoY,20,-139+torsoY);
    if (mira) poly([-15,-164+torsoY,-31,-177+torsoY,-29,-157+torsoY,-13,-154+torsoY,-6,-170+torsoY],c.accent);
    else poly([-12,-132+torsoY,10,-127+torsoY,28,-135+torsoY,27,-120+torsoY,5,-114+torsoY,-17,-120+torsoY],c.accent);
    g.lineStyle(1,0xfbe0aa,0.6); g.lineBetween(-10,-127+torsoY,8,-122+torsoY); g.lineBetween(8,-122+torsoY,22,-127+torsoY);
    const handX = guard ? 41 : 30 + strike * 66;
    const handY = guard ? -146 : f.vstate === 'victory' ? -186 : -100 - strike * 12;
    limb(23,-116+torsoY,37+strike*22,-88+torsoY, mira ? 24 : 17, mira ? c.accent : c.main);
    limb(37+strike*22,-88+torsoY,handX,handY+crouch,13,c.skin);
    if(!mira) {
      limb(37+strike*15,-90+torsoY,(handX+37+strike*22)/2,(handY+crouch-88+torsoY)/2,15,c.trim);
      g.lineStyle(2,c.accent,0.7); g.lineBetween(handX-8,handY-5+crouch,handX-8,handY+6+crouch);
    }
    g.fillStyle(c.skin); g.lineStyle(2,outline); g.fillCircle(handX,handY+crouch,8); g.strokeCircle(handX,handY+crouch,8);
    if (mira) {
      poly([handX,handY+4,handX-17,handY-33,handX+8,handY-46,handX+30,handY-28,handX+28,handY-3],c.accent);
      g.lineStyle(1,c.main); g.lineBetween(handX,handY,handX+8,handY-42); g.lineBetween(handX,handY,handX+26,handY-25); g.lineBetween(handX,handY,handX-13,handY-30);
      g.lineStyle(2,0xc09585); g.lineBetween(handX-13,handY-28,handX+6,handY-35); g.lineBetween(handX+6,handY-35,handX+23,handY-23);
    }
    if (guard) { g.lineStyle(1.5,0xe9d496,0.55); g.beginPath(); g.arc(11,-95,73,-1.2,1.1); g.strokePath(); }
    if (phase === 'active') {
      const radius = attack?.kind === 'heavy' ? 95 : 72;
      g.lineStyle(attack?.kind === 'ultimate' ? 13 : 8,c.signature,0.16); g.beginPath(); g.arc(35,-94,radius,-1.05,0.85); g.strokePath();
      g.lineStyle(3,c.accent,0.9); g.beginPath(); g.arc(35,-94,radius,-0.95,0.6); g.strokePath();
      g.lineStyle(1,0xffedc9,0.8); g.beginPath(); g.arc(39,-94,radius+5,-0.8,0.45); g.strokePath();
    }
  }
}
