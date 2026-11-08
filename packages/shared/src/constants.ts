// Fixed-step simulation constants. The simulation ALWAYS runs at 60 Hz,
// independent of the browser display refresh rate.
export const TICK_RATE = 60;

/** Logical stage width in simulation pixels. */
export const STAGE_WIDTH = 1600;
/** Y coordinate of the ground line (fighter feet position when grounded). */
export const GROUND_Y = 810;
/** Stage collision walls (fighters cannot pass these). */
export const WALL_LEFT = 60;
export const WALL_RIGHT = 1540;

export const ROUND_TIME_SECONDS = 75;
export const ROUNDS_TO_WIN = 2;
export const MAX_ROUNDS = 5;

export const INTRO_FRAMES = 90;
export const ROUND_END_FRAMES = 160;

/** Gravity in px/frame^2 (applied per 60 Hz tick). */
export const GRAVITY = 0.62;
export const JUMP_VY = 15.2;
export const JUMP_TOLERANCE = 0.25; // air control bucket
export const JUMP_SQUAT_FRAMES = 5;
export const LANDING_FRAMES = 6;
export const MAX_AIRSPEED_FACTOR = 0.55;

export const DASH_FRAMES = 12;
export const BACKDASH_FRAMES = 10;
export const DASH_SPEED = 13;
export const BACKDASH_SPEED = 9;
export const DASH_COOLDOWN = 34;

export const GUARD_PUSHBACK = 5;
export const ATTACKER_BLOCK_PUSHBACK = 2;
export const PARRY_WINDOW_FRAMES = 7; // guard started within N frames of impact = Perfect Guard
export const PARRY_STUN_FRAMES = 20;
export const GUARD_CHIP_FACTOR = 0.12;
/** Chip damage can never KO (defender stays at >= 1 HP). */
export const MIN_HEALTH_AFTER_CHIP = 1;

export const HITSTOP_LIGHT = 6;
export const HITSTOP_HEAVY = 10;
export const HITSTOP_SKILL = 9;
export const HITSTOP_ULTIMATE = 14;

/** Damage scaling per already-landed combo hit. */
export const COMBO_SCALE_STEP = 0.12;
export const COMBO_SCALE_MIN = 0.35;

/** Minimum horizontal gap before fighters overlap-push. */
export const BODY_PUSH_GAP = 44;
/** Input buffer lifetime in frames. */
export const INPUT_BUFFER_FRAMES = 7;

export const SKILL_COOLDOWN_DEFAULT = 120;

export const FRAMES_PER_SECOND = TICK_RATE;
