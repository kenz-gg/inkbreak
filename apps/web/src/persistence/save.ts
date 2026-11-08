import { ARCADE_ROUTE, type ArcadeRun } from '@inkbreak/shared';
import { bindingActions, defaultBindings, validBinding, type Bindings } from '../config/bindings';
export interface Settings { quality: 'low' | 'medium' | 'high'; reducedMotion: boolean; volume: number; touchScale: number; touch: boolean; bindings: [Bindings,Bindings] }
export interface Save { version: 1; settings: Settings; matches: number; wins: number; arcade: ArcadeRun | null; circuits: number }
const defaults: Settings = { quality: 'medium', reducedMotion: false, volume: 0.25, touchScale: 1, touch: false, bindings: defaultBindings() };
export function loadSave(): Save {
  const clean: Save = { version: 1, settings: { ...defaults, bindings: defaultBindings() }, matches: 0, wins: 0, arcade: null, circuits: 0 };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem('inkbreak.v1') ?? 'null');
    if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1) return clean;
    const d = raw as Record<string, unknown>;
    if (typeof d.matches === 'number' && Number.isSafeInteger(d.matches) && d.matches >= 0) clean.matches = d.matches;
    if (typeof d.wins === 'number' && Number.isSafeInteger(d.wins) && d.wins >= 0 && d.wins <= clean.matches) clean.wins = d.wins;
    if (typeof d.circuits === 'number' && Number.isSafeInteger(d.circuits) && d.circuits >= 0) clean.circuits = d.circuits;
    if (d.arcade && typeof d.arcade === 'object') {
      const run = d.arcade as Record<string,unknown>;
      if ((run.fighter === 'kaien' || run.fighter === 'mira') && typeof run.stage === 'number' && Number.isInteger(run.stage) && run.stage >= 0 && run.stage < ARCADE_ROUTE.length) {
        clean.arcade = { fighter: run.fighter, stage: run.stage };
      }
    }
    if (d.settings && typeof d.settings === 'object') {
      const s = d.settings as Record<string, unknown>;
      if (s.quality === 'low' || s.quality === 'medium' || s.quality === 'high') clean.settings.quality = s.quality;
      if (typeof s.reducedMotion === 'boolean') clean.settings.reducedMotion = s.reducedMotion;
      if (typeof s.touch === 'boolean') clean.settings.touch = s.touch;
      if (typeof s.volume === 'number' && Number.isFinite(s.volume)) clean.settings.volume = Math.max(0, Math.min(1, s.volume));
      if (typeof s.touchScale === 'number' && Number.isFinite(s.touchScale)) clean.settings.touchScale = Math.max(0.7, Math.min(1.4, s.touchScale));
      if (Array.isArray(s.bindings) && s.bindings.length === 2) {
        const proposed = defaultBindings(); const used = new Set<string>(); let valid = true;
        for (const side of [0,1] as const) for (const action of bindingActions) {
          const source: unknown = s.bindings[side];
          const code = source && typeof source === 'object' ? (source as Record<string,unknown>)[action] : null;
          if (!validBinding(code) || used.has(code)) valid = false;
          else { proposed[side][action] = code; used.add(code); }
        }
        if (valid) clean.settings.bindings = proposed;
      }
    }
  } catch { /* Invalid/blocked storage falls back to safe guest defaults. */ }
  return clean;
}
export function saveData(save: Save): boolean {
  try { localStorage.setItem('inkbreak.v1', JSON.stringify(save)); return true; }
  catch { return false; }
}
