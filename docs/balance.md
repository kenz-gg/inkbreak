# First-playable combat rules

Initial, unbalanced numbers live in `packages/shared/src/characters/*.ts`.

- Simulation 60 Hz; first to two rounds, 75 seconds each. Five-round cap handles draws.
- Timeout compares HP percentage. Equal percentages draw. Draws award no win.
- Kaien: 230 HP, forward speed 5.6 units/tick. Mira: 240 HP, 4.5 units/tick.
- Light startup/active/recovery: Kaien 5/3/12, Mira 6/3/13.
- Heavy: Kaien 11/4/21, 68 damage; Mira 14/4/22, 62 damage.
- Two-light chain: new button press during confirmed active/recovery cancels to light2.
  Light2 cancels to heavy, skill or ultimate. No whiff/startup cancels; no cyclic chains.
- Air attack: once per airtime. Landing cancels the aerial attack into six-frame recovery.
- Guard requires grounded stance facing the attacker. Hold U; attacks do not override guard.
- Perfect Guard: first seven guard ticks, zero damage, 12 meter. A melee attacker receives
  20 stun ticks. Projectile parries consume the projectile, not stun its distant owner.
- After perfect guard or blockstun, holding guard does not reopen its parry window.
- Normal block does 12% chip, never below 1 HP, with blockstun and pushback.
- Combo scaling subtracts 12% per previous hit, minimum 35%. Combo ends on recovery.
- Skill cooldown: Kaien 120 simulation ticks, Mira 150. Cooldown freezes in hitstop.
- Ultimate costs 100 meter. Meter carries between rounds; health resets.
- Kaien skill lunges; Mira skill creates one paper projectile. Mira ultimate emits four.
- Hitstop: six ticks for light/air, ten for heavier attacks. Timer also freezes in hitstop.
- Body contact separates fighters by 44 units; hurtbox is centered and 56×138.
- Dash has no invulnerability or attack cancel. Backdash is directional, both have cooldown.

Remaining: counter-hit bonuses, third light, directional attacks, launchers, guard break,
knockdown/wakeup and full four-skill kits. No ranked balance or exploit-proof claim.
