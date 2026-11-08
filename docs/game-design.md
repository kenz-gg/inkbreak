# INKBREAK: Arena of the Folded World

**Every battle rewrites the arena.** Fighters from living worlds called Folios gather
at the Grand Convergence. The first playable folio is warm sandstone Sunspire Court.

Kaien is a terracotta-clad rushdown wanderer with an asymmetric scarf. Mira is a cream
and burgundy paper dancer focused on midrange and projectiles. Their playable move data
shares one engine; future Orun (bronze defensive sentinel) and Selka (moss/ivory aerial
runner) must reuse this architecture after the first pair's full kits are validated.

Planned arenas: Mossbound Sanctuary (olive forest temple), Clockwork Atrium
(copper mechanical hall), Stormwake Harbor (slate coastal harbor).

Arena Rewrite is a planned signature mechanic. The current court has static, fair
collision and no hazards. Future deterministic warning/transition/active phases will
use shared simulation ticks and server authority, with separate competitive/chaos data.

Current modes: single AI match, three-bout arcade circuit, training, two-player shared keyboard. Training includes
dummy choice, reset, infinite meter, debug boxes, current move timing and last input.
Input history is only the most recent nonempty input, not a scrolling replay log yet.

Arcade: easy Mira, normal Kaien, hard Mira; all on Sunspire Court. This small development
circuit exercises the match/progression loop using the two available fighters. A win
advances, a loss retains the current stage, and three wins complete the circuit. Resume
stores the stage/fighter (not an in-progress round). Changing fighter starts at bout one.
