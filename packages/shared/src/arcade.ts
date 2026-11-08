import type { Difficulty } from './ai.js';
export type CharacterId = 'kaien' | 'mira';
export interface ArcadeRun { fighter: CharacterId; stage: number }
export const ARCADE_ROUTE: ReadonlyArray<{ opponent: CharacterId; difficulty: Difficulty; title: string }> = [
  { opponent: 'mira', difficulty: 'easy', title: 'The opening page' },
  { opponent: 'kaien', difficulty: 'normal', title: 'A familiar flame' },
  { opponent: 'mira', difficulty: 'hard', title: 'The final fold' },
];
/** Only a player-one match win advances the guest circuit. Losses retain the stage. */
export function advanceArcade(run: ArcadeRun, won: boolean): ArcadeRun | null {
  if (!won) return { ...run };
  return run.stage + 1 >= ARCADE_ROUTE.length ? null : { ...run, stage: run.stage + 1 };
}
