import type { EventLog } from '@inkbreak/shared';
/** Original synthesized cues; no external audio downloads or fabricated audio files. */
export class Sound {
  private context: AudioContext | null = null;
  constructor(public volume: number) {}
  unlock(): void {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => { /* Muted browser audio does not stop gameplay. */ });
  }
  play(event: EventLog): void {
    if (!this.context || !this.volume || this.context.state !== 'running') return;
    const frequencies: Partial<Record<EventLog['type'], number>> = { hit: 110, blocked: 270, parried: 880, dash: 160, skillUsed: 390, ultimateUsed: 65, roundEnd: 440 };
    const frequency = frequencies[event.type]; if (!frequency) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    const time = ctx.currentTime, duration = event.type === 'ultimateUsed' ? 0.4 : 0.12;
    osc.type = event.type === 'parried' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(frequency, time); osc.frequency.exponentialRampToValueAtTime(frequency * 0.35, time + duration);
    gain.gain.setValueAtTime(this.volume * 0.22, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(time + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  destroy(): void { if (this.context) void this.context.close(); }
}
