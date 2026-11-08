import type { Settings } from '../persistence/save';
const qualityRank = { low:0, medium:1, high:2 } as const;
export type VisualTier = 0 | 1 | 2;
export const RENDER_WIDTHS = [960,1280,1600] as const;

/** Downshifts presentation only. No simulation timing or collision lives here. */
export class VisualBudget {
  tier: VisualTier;
  private elapsed = 0;
  private slow = 0;
  private warmup = 750;
  constructor(settings: Pick<Settings,'quality'>) { this.tier = qualityRank[settings.quality]; }
  sample(delta: number, paused: boolean): void {
    if (paused || this.tier === 0 || delta <= 0 || !Number.isFinite(delta)) return;
    const elapsed = Math.min(delta,250);
    if (this.warmup > 0) { this.warmup -= elapsed; return; }
    this.elapsed += elapsed;
    if (delta > (this.tier === 2 ? 25 : 38)) this.slow += elapsed;
    if (this.elapsed >= 2000) {
      if (this.slow / this.elapsed > 0.65) this.tier = (this.tier - 1) as VisualTier;
      this.elapsed = 0; this.slow = 0;
    }
  }
  get label(): string { return ['low','medium','high'][this.tier]!; }
}
