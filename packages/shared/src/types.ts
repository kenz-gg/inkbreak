// Shared, framework-independent types. This module must never import
// Phaser or any browser API — it is reused by the offline sim and (Phase 6)
// the authoritative Colyseus server.

/** Per-frame command for one fighter. Produced by keyboard/touch/gamepad/AI. */
export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  light: boolean;
  heavy: boolean;
  skill: boolean;
  ultimate: boolean;
  guard: boolean;
  dash: boolean;
}

export const EMPTY_INPUT: InputFrame = {
  left: false,
  right: false,
  up: false,
  down: false,
  light: false,
  heavy: false,
  skill: false,
  ultimate: false,
  guard: false,
  dash: false,
};

export type FighterVState =
  | "idle"
  | "walk"
  | "walk_back"
  | "jump_squat"
  | "air"
  | "landing"
  | "dash"
  | "backdash"
  | "attack"
  | "guard"
  | "hitstun"
  | "blockstun"
  | "ko"
  | "victory";

export type AttackKind = "light" | "heavy" | "air" | "skill" | "ultimate";

export interface BoxDef {
  /** +x offset from fighter feet origin, in facing direction. Mirrored by facing. */
  ox: number;
  /** +y offset from fighter feet origin (negative = up). */
  oy: number;
  w: number;
  h: number;
}

export interface ProjectileDef {
  speed: number;
  ttl: number;
  damage: number;
  hitstun: number;
  knockback: number;
  box: BoxDef;
  /** Volleys of projectiles spawned during startup, e.g. Mira ultimate. */
  volleys?: number;
  /** Frames between volleys (default 6). */
  volleyInterval?: number;
}

export interface CancelRule {
  attackIds: string[];
  window: "active" | "recovery" | "both";
}

export interface AttackDef {
  id: string;
  name: string;
  kind: AttackKind;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  meterGain: number;
  /** Meter consumed (ultimate only). */
  meterCost?: number;
  hitbox: BoxDef;
  /** Fighter self-moves forward this many px/frame during startup+active. */
  selfAdvance?: number;
  projectile?: ProjectileDef;
  cooldown?: number;
  cancels?: CancelRule;
}

export interface CharacterStats {
  maxHealth: number;
  walkForward: number;
  walkBackward: number;
  jumpVelocity: number;
  /** Knockback resistance multiplier (1 = normal). */
  mass: number;
}

export interface CharacterVisual {
  main: number;
  accent: number;
  trim: number;
  skin: number;
  hair: number;
  signature: number; // dev-art signature prop color
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  archetype: string;
  stats: CharacterStats;
  visual: CharacterVisual;
  attacks: Record<
    "light1" | "light2" | "heavy" | "airLight" | "skill" | "ultimate",
    AttackDef
  >;
}

export type Phase =
  | "intro"
  | "fighting"
  | "roundOver"
  | "matchOver";

export type Side = 0 | 1;

export interface EventLog {
  type:
    | "roundStart"
    | "fight"
    | "hit"
    | "blocked"
    | "parried"
    | "projectileHit"
    | "ko"
    | "roundEnd"
    | "matchEnd"
    | "skillUsed"
    | "ultimateUsed"
    | "dash"
    | "landing";
  side?: Side;
  x?: number;
  y?: number;
  damage?: number;
  heavy?: boolean;
  comboCount?: number;
}

export interface FighterSnapshot {
  side: Side;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  vstate: FighterVState;
  health: number;
  maxHealth: number;
  meter: number;
  comboCount: number;
  comboDamage: number;
  attackId: string | null;
  attackFrame: number;
  attackPhase: "startup" | "active" | "recovery" | null;
  skillCooldown: number;
  guardFrames: number;
}

export interface ProjectileSnapshot {
  x: number;
  y: number;
  vx: number;
  side: Side;
}

export interface MatchSnapshot {
  phase: Phase;
  roundNumber: number;
  wins: [number, number];
  timerFrames: number;
  hitstop: number;
  winner: Side | "draw" | null;
  matchWinner: Side | null;
  events: EventLog[];
  fighters: [FighterSnapshot, FighterSnapshot];
  projectiles: ProjectileSnapshot[];
}

export interface MatchOptions {
  training: boolean;
  timerEnabled: boolean;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  training: false,
  timerEnabled: true,
};

/** AABB intersection for hit/hurt resolution. */
export function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
