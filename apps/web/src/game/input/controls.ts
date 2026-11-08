import { EMPTY_INPUT, type InputFrame } from '@inkbreak/shared';
import { defaultBindings, type Bindings } from '../../config/bindings';
export class Controls {
  private readonly bindings: Record<string,keyof InputFrame>[];
  private keys = new Set<string>();
  private pendingKeys = new Set<string>();
  private pendingTouch = new Set<keyof InputFrame>();
  readonly latest: [InputFrame, InputFrame] = [{ ...EMPTY_INPUT }, { ...EMPTY_INPUT }];
  private touch = new Map<number, keyof InputFrame>();
  private abort = new AbortController();
  constructor(onPause: () => void, mapping: [Bindings,Bindings] = defaultBindings()) {
    this.bindings = mapping.map(player => Object.fromEntries(Object.entries(player).map(([action,code])=>[code,action as keyof InputFrame])));
    // Space is an optional default jump alias only when nobody has explicitly bound it.
    if (mapping[0].up === 'KeyW' && !mapping.some(p=>Object.values(p).includes('Space'))) this.bindings[0]!.Space = 'up';
    const signal = this.abort.signal;
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Escape' && !e.repeat) onPause();
      if (this.bindings.some(b => b[e.code])) {
        e.preventDefault(); this.keys.add(e.code);
        if (!e.repeat) this.pendingKeys.add(e.code);
      }
    }, { signal });
    window.addEventListener('keyup', e => this.keys.delete(e.code), { signal });
    window.addEventListener('blur', () => this.clear(), { signal });
  }
  bindTouch(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
      const action = button.dataset.action as keyof InputFrame;
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); button.setPointerCapture(e.pointerId); this.touch.set(e.pointerId, action);
        this.pendingTouch.add(action); button.classList.add('held');
      }, { signal: this.abort.signal });
      const release = (e: PointerEvent) => {
        this.touch.delete(e.pointerId); button.classList.remove('held');
      };
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(event, release, { signal: this.abort.signal });
    });
  }
  read(side: 0 | 1): InputFrame {
    const input = { ...EMPTY_INPUT };
    for (const key of this.keys) { const action = this.bindings[side]?.[key]; if (action) input[action] = true; }
    for (const key of this.pendingKeys) {
      const action = this.bindings[side]?.[key];
      if (action) { input[action] = true; this.pendingKeys.delete(key); }
    }
    if (side === 0) {
      for (const action of this.touch.values()) input[action] = true;
      for (const action of this.pendingTouch) input[action] = true;
      this.pendingTouch.clear();
    }
    this.latest[side] = input;
    return input;
  }
  clear(): void {
    this.keys.clear(); this.touch.clear(); this.pendingKeys.clear(); this.pendingTouch.clear();
    this.latest[0] = { ...EMPTY_INPUT }; this.latest[1] = { ...EMPTY_INPUT };
    document.querySelectorAll('.held').forEach(el => el.classList.remove('held'));
  }
  destroy(): void { this.clear(); this.abort.abort(); }
}
