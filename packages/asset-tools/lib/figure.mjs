// Parametric figure library for INKBREAK character development art.
// Output: one standalone editable SVG per pose frame. Universal pose anchor:
// ground point (256,560) on a 512×640 canvas, character facing +x (right).
// Lighting convention for every asset: single key light from the upper-left,
// shadow band on the lower-right, rim highlight along the upper-left edge.
// This is high-quality temporary vector art; prompts for final painted art
// live in docs/character-art-prompts.md.

export const VIEW = { width: 512, height: 640 };
export const POSE_ANCHOR = { x: 256, y: 560 };
export const BUST_VIEW = { width: 256, height: 256 };
export const BUST_ANCHOR = { x: 128, y: 222 };
export const EFFECT_VIEW = { width: 512, height: 512 };
export const EFFECT_ANCHOR = { x: 256, y: 300 };

const rad = (d) => (d * Math.PI) / 180;
const P = (n) => Math.round(n * 10) / 10;
const dir = (a) => ({ x: Math.sin(rad(a)), y: Math.cos(rad(a)) });
const add = (p, q, s = 1) => ({ x: p.x + q.x * s, y: p.y + q.y * s });
const rot = (p, a, o) => {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return { x: o.x + (p.x - o.x) * c - (p.y - o.y) * s, y: o.y + (p.x - o.x) * s + (p.y - o.y) * c };
};
const line = (pts) => pts.map(([x, y]) => `${P(x)} ${P(y)}`).join('L');
const poly = (pts) => `M${line(pts)}Z`;

// Sample a tapered curved limb once; return centerline + both boundaries.
function tube(j0, j1, w0, w1, bow, n = 9) {
  const cx = (j0.x + j1.x) / 2;
  const cy = (j0.y + j1.y) / 2;
  const dl = Math.hypot(j1.x - j0.x, j1.y - j0.y) || 1;
  const qx = cx + (-(j1.y - j0.y) / dl) * bow;
  const qy = cy + ((j1.x - j0.x) / dl) * bow;
  const center = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * j0.x + 2 * (1 - t) * t * qx + t * t * j1.x;
    const y = (1 - t) * (1 - t) * j0.y + 2 * (1 - t) * t * qy + t * t * j1.y;
    const ex = 2 * (1 - t) * (qx - j0.x) + 2 * t * (j1.x - qx);
    const ey = 2 * (1 - t) * (qy - j0.y) + 2 * t * (j1.y - qy);
    const el = Math.hypot(ex, ey) || 1;
    center.push({ x, y, nx: -ey / el, ny: ex / el, w: (w0 + (w1 - w0) * t) / 2 });
  }
  const side = (sign, shrink = 1) => center.map((c) => [c.x + c.nx * sign * c.w * shrink, c.y + c.ny * sign * c.w * shrink]);
  // pick the shaded side: away from the upper-left key light
  const mid = center[Math.floor(n / 2)];
  const shadeSign = Math.abs(mid.nx) > 0.25 ? Math.sign(mid.nx) : mid.ny > 0 ? 1 : -1;
  return {
    center, n,
    right: side(1), left: side(-1),
    shadeSign,
    band: side(shadeSign, 1).concat(side(shadeSign, 0.42).slice().reverse()),
    rim: side(-shadeSign, 1),
  };
}

// Base fill + shadow band (lower-right) + rim highlight (upper-left).
function limb(B, j0, j1, w0, w1, bow, C) {
  const t = tube(j0, j1, w0, w1, bow);
  B.add(`<path d="${poly([...t.right, ...t.left.slice().reverse()])}" fill="${C.fill}" stroke="${C.outline}" stroke-opacity=".45" stroke-width="1.1"/>`);
  B.add(`<path d="${poly(t.band)}" fill="${C.shade}" fill-opacity=".38"/>`);
  B.add(`<polyline points="${t.rim.slice(0, 5).map(([x, y]) => `${P(x)},${P(y)}`).join(' ')}" fill="none" stroke="${C.rim}" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>`);
}

function shape(B, pts, fill, opts = {}) {
  B.add(`<path d="${poly(pts)}" fill="${fill}"${opts.opacity !== undefined ? ` fill-opacity="${opts.opacity}"` : ''}${opts.outline ? ` stroke="${opts.outline}" stroke-width="1.1" stroke-linejoin="round"` : ''}/>`);
}

function dot(B, cx, cy, rx, ry, fill, opts = {}) {
  B.add(`<ellipse cx="${P(cx)}" cy="${P(cy)}" rx="${P(rx)}" ry="${P(ry)}" fill="${fill}"${opts.rot ? ` transform="rotate(${P(opts.rot)} ${P(cx)} ${P(cy)})"` : ''}${opts.opacity !== undefined ? ` fill-opacity="${opts.opacity}"` : ''}${opts.outline ? ` stroke="${opts.outline}" stroke-width="1"` : ''}/>`);
}

function zone(pts) {
  return pts.map((pt) => (Array.isArray(pt) ? [P(pt[0]), P(pt[1])] : [P(pt.x), P(pt.y)]));
}

// class buffer
const makeB = () => {
  const parts = [];
  return { add: (s) => parts.push(s), text: () => parts.join('\n') };
};

// ---- shared anatomical constants -------------------------------------------
function anatomy(spec) {
  const H = spec.prop.height;
  const bulk = spec.prop.bulk ?? 1;
  return {
    H, bulk, headR: H / (2 * spec.prop.heads),
    thigh: 0.245 * H, shin: 0.235 * H, footH: 14,
    uArm: 0.185 * H, fArm: 0.17 * H,
    torsoH: 0.31 * H,
    shHalf: 0.132 * H * (spec.prop.shoulder ?? 1) * bulk,
    hipHalf: 0.105 * H * (spec.prop.hipW ?? 1) * bulk,
    waHalf: 0.086 * H * (spec.prop.waist ?? 1) * bulk,
    armW: 15.5 * bulk * (spec.prop.armWidth ?? 1),
    legW: 21 * bulk * (spec.prop.legWidth ?? 1),
  };
}

const WEAPON_POSES = { jump: 'act', dash: 'act', 'light-attack': 'act', 'heavy-attack': 'act', guard: 'act', skill: 'act', ultimate: 'act' };

// ---- one full pose frame ----------------------------------------------------
function drawFigure(spec, params) {
  const B = makeB();
  const C = spec.palette;
  const A = anatomy(spec);
  const ground = POSE_ANCHOR.y;
  const air = params.air ?? 0;
  const lean = params.lean ?? 0;
  const shiftX = params.shiftX ?? 0;

// Ground contact shadow shrinks with air time; light is upper-left so the
// shadow sits slightly to the lower-right of the feet
  const shScale = Math.max(0.35, 1 - air / 300);
  B.add(`<ellipse cx="${256 + shiftX * 0.4 + 10}" cy="${ground}" rx="${P(64 * shScale * (spec.prop.footPrint ?? 1))}" ry="${P(10 * shScale)}" fill="${C.shadowGround}" fill-opacity=".26"/>`);

  const pivot = { x: 256 + shiftX, y: ground - (A.thigh + A.shin + A.footH) + (params.crouch ?? 0) - air };
  const T = (x, y) => rot({ x: pivot.x + x, y: pivot.y + y }, lean, pivot);
  const shY = -A.torsoH;
  const local = (x, y) => ({ x: pivot.x + x, y: pivot.y + y });

  // back arm's shoulder node for later costume use
  const shBack = T(-A.shHalf * 0.55, shY + 3);
  const shFront = T(A.shHalf * 0.6, shY + 1);

  // cloth that lives behind the body (scarf knot, half-cape) paints before the
  // limbs so the silhouette stays clean
  if (!params._skip?.includes('trailing')) behindCloth(B, spec, C, { px: pivot.x, pivotY: pivot.y, shY, wind: params.wind ?? 0.5, lean, params });

  legs: {
    const drawLeg = (isFront, leg, lift) => {
      const hip = T((isFront ? 1 : -1) * A.hipHalf * 0.5, -3);
      const knee = add(hip, dir(leg.hip), A.thigh);
      const shinA = leg.hip - leg.knee;
      const ankle = add(knee, dir(shinA), A.shin);
      ankle.y -= lift;
      const w0 = A.legW * (isFront ? 1 : 0.94);
      limb(B, hip, knee, w0 * 1.14, w0 * 0.96, isFront ? -3 : 2, { fill: C.main, shade: C.mainShade, rim: C.mainLit, outline: C.outline });
      limb(B, knee, ankle, w0 * 0.98, w0 * 0.74, isFront ? 1 : -1, { fill: C.main, shade: C.mainShade, rim: C.mainLit, outline: C.outline });
      dot(B, knee.x, knee.y, w0 * 0.6, w0 * 0.54, C.main, {});
      drawBoot(B, spec, C, ankle, shinA, !isFront);
      return ankle;
    };
    drawLeg(false, params.legs.back, params.lift?.back ?? 0);
    drawLeg(true, params.legs.front, params.lift?.front ?? 0);
  }

  // back arm + weapon in the ready hand
  let hands = {};
  const drawArm = (isFront, a) => {
    const sh = isFront ? shFront : shBack;
    const elbow = add(sh, dir(a.sh), A.uArm);
    const foreA = a.sh + (a.el ?? 20);
    const wrist = add(elbow, dir(foreA), A.fArm);
    limb(B, sh, elbow, A.armW * (isFront ? 1 : 0.9), A.armW * 0.88, isFront ? -2 : 2, { fill: C.main, shade: C.mainShade, rim: C.mainLit, outline: C.outline });
    limb(B, elbow, wrist, A.armW * 0.86, A.armW * 0.68, foreA > 60 ? 3 : -1, { fill: C.main, shade: C.mainShade, rim: C.mainLit, outline: C.outline });
    dot(B, elbow.x, elbow.y, A.armW * 0.55, A.armW * 0.5, C.main, {});
    dot(B, wrist.x, wrist.y, 9.4 * A.bulk, 8.4 * A.bulk, C.accent, { outline: C.outline });
    B.add(`<line x1="${P(wrist.x - 3.4)}" y1="${P(wrist.y - 2.4)}" x2="${P(wrist.x + 3)}" y2="${P(wrist.y + 2.2)}" stroke="${C.trim}" stroke-width="1.5" stroke-linecap="round"/>`);
    hands[isFront ? 'front' : 'back'] = { wrist, foreA, elbow };
  };
  drawArm(false, params.arms.back);

  // torso leaning around the hip pivot
  const waistY = -A.torsoH * 0.46;
  shape(B, zone([
    T(A.shHalf * 0.92, shY - 2), T(A.shHalf * 0.3, shY + 9), T(-A.shHalf * 0.86, shY + 1),
    T(-A.shHalf * 0.6, waistY + 4), T(-A.hipHalf * 0.86, 2), T(-A.hipHalf * 0.28, 10),
    T(A.hipHalf * 0.8, 2), T(A.waHalf + 4, waistY), T(shFront.x - pivot.x - 6, shY + 6),
  ]), C.main, { outline: C.outline });
  shape(B, zone([
    T(A.hipHalf * 0.8, 2), T(A.waHalf + 4, waistY), T(shFront.x - pivot.x - 6, shY + 6),
    T(A.shHalf * 0.92, shY - 2), T(A.shHalf * 0.5, 4),
  ]), C.mainShade, { opacity: 0.38 });
  B.add(`<polyline points="${zone([
    T(A.shHalf * 0.3, shY + 9), T(-A.shHalf * 0.86, shY + 1), T(-A.shHalf * 0.6, waistY + 4),
  ]).map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" stroke="${C.mainLit}" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>`);
  // waist belt wraps the lowered waistline
  shape(B, zone([T(-A.hipHalf * 0.9, -1), T(A.hipHalf * 0.9, 0), T(A.hipHalf * 0.85, 9), T(-A.hipHalf * 0.85, 10)]), C.trim, { outline: C.outline });

  if (!params._skip?.includes('costume')) costumeFront(B, spec, C, { T, A, torso: -A.torsoH, shBack });

  // shoulder caps so a raised arm never opens a background gap at the armpit
  shape(B, zone([
    T(A.shHalf * 0.3, shY - 13), T(A.shHalf * 1.24, shY + 9),
    T(A.shHalf * 1.06, shY + 27), T(A.shHalf * 0.6, shY + 20),
  ]), C.main, { outline: C.outline });
  shape(B, zone([
    T(-A.shHalf * 0.9, shY + 2), T(-A.shHalf * 1.2, shY + 10),
    T(-A.shHalf * 0.98, shY + 28), T(-A.shHalf * 0.48, shY + 19),
  ]), C.main, { outline: C.outline });

  drawArm(true, params.arms.front);

  if (!params._skip?.includes('head')) headHairFace(B, spec, C, A, { T, lean, params, shY, neckTop: T(0, shY - A.headR * 0.32) });

  if (!params._skip?.includes('trailing')) trailingLayers(B, spec, C, { wind: params.wind ?? 0.5, x: pivot.x, shY: pivot.y + shY, hipY: pivot.y, lean, params });
  if (!params._skip?.includes('weapon')) weapon(B, spec, C, params, hands, lean);

  if (!params._skip?.includes('finale')) charFinale(B, spec, C, params, hands);

  return { svg: wrapFigure(B.text(), spec, params), hands };
}

function drawBoot(B, spec, C, ankle, shinA, back) {
  const tilt = shinA * 0.35;
  const s = back ? -0.1 : 1;
  const raw = spec.boots === 'greaves'
    ? [[-12, -7], [9, -8], [21, 14], [-14, 14]]
    : [[-12, -6], [10, -7], [24, 12], [-14, 12]];
  const lifted = spec.boots === 'greaves' ? 12 : 10;
  const pts = raw.map(([dx, dy]) => {
    const c = Math.cos(rad(tilt));
    const sn = Math.sin(rad(tilt));
    return [ankle.x + dx * c - dy * sn, ankle.y + dx * sn + dy * c + (lifted - 10) * 0];
  });
  const fill = spec.boots === 'greaves' ? (C.plate ?? C.main) : C.under;
  shape(B, zone(pts), fill, { outline: C.outline });
  shape(B, zone([
    [ankle.x - 11, ankle.y + lifted - 3], [ankle.x + 12 * s + 5, ankle.y + lifted - 3],
    [ankle.x + 10 * s + 4, ankle.y + lifted + 2], [ankle.x - 9, ankle.y + lifted + 2],
  ]), C.trim, {});
  if (spec.boots === 'greaves') {
    B.add(`<line x1="${P(ankle.x - 5)}" y1="${P(ankle.y - 2)}" x2="${P(ankle.x + 6)}" y2="${P(ankle.y - 3)}" stroke="${C.trim}" stroke-width="2" stroke-linecap="round"/>`);
  }
}

// ---- hair / head / face -----------------------------------------------------
function headHairFace(B, spec, C, A, ctx) {
  const ch = A.headR;
  const neckTop = ctx.neckTop;
  const hc = rot({ x: neckTop.x, y: neckTop.y - ch * 0.92 }, ctx.params.headTilt ?? 0, neckTop);
  const ink = C.outline;
  hairBack(B, spec, C, hc, ch);
  facePlate(B, spec, C, hc, ch, ctx.params.expr ?? 'focused');
  faceInk(B, spec, C, hc, ch, ctx.params.expr ?? 'focused');
  hairFront(B, spec, C, hc, ch);
  void ink;
}

function hairBack(B, spec, C, hc, ch) {
  if (spec.hair === 'ember-mane') {
    shape(B, [
      [hc.x - 0.66 * ch, hc.y - 1.06 * ch], [hc.x - 1.55 * ch, hc.y - 0.12 * ch],
      [hc.x - 1.35 * ch, hc.y + 1.66 * ch], [hc.x - 0.5 * ch, hc.y + 0.88 * ch],
      [hc.x + 0.3 * ch, hc.y + 1.36 * ch], [hc.x + 0.68 * ch, hc.y + 0.52 * ch],
      [hc.x + 0.62 * ch, hc.y - 1.0 * ch],
    ], C.hair, { outline: C.outline });
    shape(B, [
      [hc.x - 1.25 * ch, hc.y + 1.5 * ch], [hc.x - 0.6 * ch, hc.y + 0.6 * ch],
      [hc.x - 0.18 * ch, hc.y + 1.22 * ch],
    ], C.hairShade ?? C.hair);
    B.add(`<polyline points="${P(hc.x - 0.55 * ch)},${P(hc.y - 0.9 * ch)} ${P(hc.x - 1.2 * ch)},${P(hc.y - 0.12 * ch)} ${P(hc.x - 0.95 * ch)},${P(hc.y + 0.72 * ch)}" fill="none" stroke="${C.hairLit ?? C.hair}" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/>`);
  } else if (spec.hair === 'paper-fall') {
    // long hair swept to the far side: a curtain left of the jaw, tips over the shoulder — never under the mouth
    shape(B, [
      [hc.x - 0.78 * ch, hc.y - 0.6 * ch], [hc.x - 1.2 * ch, hc.y + 2.6 * ch],
      [hc.x - 0.72 * ch, hc.y + 2.25 * ch], [hc.x - 0.12 * ch, hc.y + 2.6 * ch],
      [hc.x - 0.12 * ch, hc.y + 1.45 * ch], [hc.x - 0.62 * ch, hc.y + 0.3 * ch],
      [hc.x - 0.52 * ch, hc.y - 0.35 * ch], [hc.x - 0.62 * ch, hc.y - 0.5 * ch],
    ], C.hair, { outline: C.outline });
    shape(B, [
      [hc.x - 0.9 * ch, hc.y + 1.7 * ch], [hc.x - 1.05 * ch, hc.y + 2.3 * ch],
      [hc.x - 0.5 * ch, hc.y + 2.15 * ch], [hc.x - 0.55 * ch, hc.y + 1.25 * ch],
    ], C.hairShade ?? C.hair);
    B.add(`<polyline points="${P(hc.x - 0.72 * ch)},${P(hc.y - 0.3 * ch)} ${P(hc.x - 0.86 * ch)},${P(hc.y + 1.75 * ch)}" fill="none" stroke="${C.hairLit ?? C.hair}" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`);
  } else if (spec.hair === 'sentinel-crop') {
    shape(B, [
      [hc.x - 0.85 * ch, hc.y - 0.3 * ch], [hc.x + 0.8 * ch, hc.y - 0.55 * ch],
      [hc.x + 0.5 * ch, hc.y - 1.15 * ch], [hc.x - 0.6 * ch, hc.y - 1.1 * ch],
    ], C.hair, { outline: C.outline });
    B.add(`<line x1="${P(hc.x - 0.5 * ch)}" y1="${P(hc.y + 0.12 * ch)}" x2="${P(hc.x - 0.05 * ch)}" y2="${P(hc.y - 0.55 * ch)}" stroke="${C.hairShade ?? C.hair}" stroke-width="2.2" stroke-linecap="round"/>`);
  } else if (spec.hair === 'gale-ponytail') {
    shape(B, [
      [hc.x + 0.28 * ch, hc.y - 1.12 * ch], [hc.x - 0.95 * ch, hc.y - 0.62 * ch],
      [hc.x - 1.85 * ch, hc.y + 0.14 * ch], [hc.x - 2.42 * ch, hc.y + 0.7 * ch],
      [hc.x - 1.65 * ch, hc.y + 0.55 * ch], [hc.x - 1.02 * ch, hc.y + 0.02 * ch],
      [hc.x - 0.55 * ch, hc.y - 0.38 * ch], [hc.x - 0.12 * ch, hc.y - 0.9 * ch],
    ], C.hair, { outline: C.outline });
    shape(B, [
      [hc.x - 1.75 * ch, hc.y + 0.36 * ch], [hc.x - 1.32 * ch, hc.y + 0.08 * ch],
      [hc.x - 0.78 * ch, hc.y - 0.28 * ch],
    ], C.hairShade ?? C.hair);
    B.add(`<polyline points="${P(hc.x - 0.42 * ch)},${P(hc.y - 0.94 * ch)} ${P(hc.x - 1.5 * ch)},${P(hc.y - 0.18 * ch)} ${P(hc.x - 2.0 * ch)},${P(hc.y + 0.46 * ch)}" fill="none" stroke="${C.hairLit ?? C.hair}" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/>`);
  }
}

function facePlate(B, spec, C, hc, ch) {
  shape(B, [
    [hc.x - 0.62 * ch, hc.y - 0.78 * ch], [hc.x + 0.52 * ch, hc.y - 0.85 * ch],
    [hc.x + 0.74 * ch, hc.y + 0.1 * ch], [hc.x + 0.4 * ch, hc.y + 0.75 * ch],
    [hc.x - 0.28 * ch, hc.y + 0.85 * ch], [hc.x - 0.7 * ch, hc.y + 0.18 * ch],
  ], C.skin, { outline: C.outline });
  shape(B, [
    [hc.x + 0.74 * ch, hc.y + 0.05 * ch], [hc.x + 0.45 * ch, hc.y + 0.7 * ch],
    [hc.x + 0.15 * ch, hc.y + 0.8 * ch], [hc.x + 0.34 * ch, hc.y + 0.2 * ch],
  ], C.skinShade, { opacity: 0.45 });
}

function faceInk(B, spec, C, hc, ch, expr) {
  const ink = C.outline;
  if (spec.face === 'visor') {
    shape(B, [
      [hc.x - 0.62 * ch, hc.y - 0.52 * ch], [hc.x + 0.64 * ch, hc.y - 0.56 * ch],
      [hc.x + 0.52 * ch, hc.y + 0.12 * ch], [hc.x - 0.56 * ch, hc.y + 0.16 * ch],
    ], C.accent, { outline: C.outline });
    B.add(`<line x1="${P(hc.x - 0.42 * ch)}" y1="${P(hc.y + 0.02 * ch)}" x2="${P(hc.x + 0.44 * ch)}" y2="${P(hc.y - 0.02 * ch)}" stroke="${C.accentLit ?? '#e2b56e'}" stroke-opacity=".85" stroke-width="${P(ch * 0.1)}" stroke-linecap="round"/>`);
    B.add(`<path d="M${P(hc.x + 0.02 * ch)} ${P(hc.y + 0.44 * ch)} q ${P(ch * 0.18)} ${P(ch * 0.14)} ${P(ch * 0.36)} 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`);
    return;
  }
  const closed = expr === 'strained';
  if (closed) {
    B.add(`<path d="M${P(hc.x + 0.42 * ch)} ${P(hc.y + 0.08 * ch)} q ${P(-ch * 0.14)} ${P(ch * 0.16)} ${P(-ch * 0.3)} 0" fill="none" stroke="${ink}" stroke-width="${P(ch * 0.1)}" stroke-linecap="round"/>`);
    B.add(`<path d="M${P(hc.x + 0.02 * ch)} ${P(hc.y + 0.12 * ch)} q ${P(-ch * 0.12)} ${P(ch * 0.15)} ${P(-ch * 0.24)} 0" fill="none" stroke="${ink}" stroke-width="${P(ch * 0.09)}" stroke-linecap="round"/>`);
  } else {
    const slant = expr === 'focused' ? 0.1 : 0.02;
    B.add(`<line x1="${P(hc.x + 0.44 * ch)}" y1="${P(hc.y + (slant - 0.02) * ch)}" x2="${P(hc.x + 0.18 * ch)}" y2="${P(hc.y + (slant + 0.02) * ch)}" stroke="${ink}" stroke-width="${P(ch * 0.085)}" stroke-linecap="round"/>`);
    B.add(`<line x1="${P(hc.x + 0.0 * ch)}" y1="${P(hc.y + (slant + 0.02) * ch)}" x2="${P(hc.x - 0.2 * ch)}" y2="${P(hc.y + (slant * 1.35 + 0.03) * ch)}" stroke="${ink}" stroke-width="${P(ch * 0.075)}" stroke-linecap="round"/>`);
  }
  B.add(`<line x1="${P(hc.x + 0.12 * ch)}" y1="${P(hc.y + 0.46 * ch)}" x2="${P(hc.x + 0.32 * ch)}" y2="${P(hc.y + 0.48 * ch)}" stroke="${ink}" stroke-opacity=".85" stroke-width="${P(ch * 0.08)}" stroke-linecap="round"/>`);
}

function hairFront(B, spec, C, hc, ch) {
  const sets = {
    'ember-mane': [[hc.x - 0.7 * ch, hc.y - 0.5 * ch], [hc.x + 0.3 * ch, hc.y - 1.0 * ch], [hc.x + 0.68 * ch, hc.y - 0.42 * ch], [hc.x + 0.26 * ch, hc.y - 0.3 * ch], [hc.x - 0.05 * ch, hc.y - 0.66 * ch]],
    'paper-fall': [[hc.x - 0.72 * ch, hc.y - 0.5 * ch], [hc.x + 0.28 * ch, hc.y - 0.95 * ch], [hc.x + 0.68 * ch, hc.y - 0.4 * ch], [hc.x + 0.3 * ch, hc.y - 0.5 * ch], [hc.x - 0.1 * ch, hc.y - 0.64 * ch]],
    'sentinel-crop': [[hc.x - 0.72 * ch, hc.y - 0.42 * ch], [hc.x + 0.55 * ch, hc.y - 0.5 * ch], [hc.x + 0.28 * ch, hc.y - 0.16 * ch], [hc.x - 0.42 * ch, hc.y - 0.12 * ch]],
    'gale-ponytail': [[hc.x - 0.7 * ch, hc.y - 0.44 * ch], [hc.x + 0.28 * ch, hc.y - 1.0 * ch], [hc.x + 0.66 * ch, hc.y - 0.38 * ch], [hc.x + 0.44 * ch, hc.y - 0.08 * ch], [hc.x + 0.06 * ch, hc.y - 0.24 * ch]],
  };
  const pts = sets[spec.hair];
  if (pts) shape(B, pts, C.hair, { outline: C.outline });
  // thin skull-top rim behind the bangs — never dips low enough to cover the brow
  shape(B, [
    [hc.x - 0.92 * ch, hc.y - 0.44 * ch], [hc.x - 0.38 * ch, hc.y - 1.12 * ch],
    [hc.x + 0.55 * ch, hc.y - 1.02 * ch], [hc.x + 0.42 * ch, hc.y - 0.84 * ch],
    [hc.x - 0.42 * ch, hc.y - 0.86 * ch],
  ], C.hairShade ?? C.hair);
}

// ---- costume overlays -------------------------------------------------------
const costumeFront = (B, spec, C, ctx) => {
  const { T, A, torso } = ctx;
  const chn = spec.costume?.chest ?? spec.chestKind;
  if (chn === 'wrap') {
    // one diagonal wrap across the chest, hugging the torso silhouette
    shape(B, zone([
      T(4, torso * 0.52), T(A.shHalf * 0.6, torso * 0.86), T(A.shHalf * 0.26, torso * 0.78),
      T(-6, torso * 0.4),
    ]), C.mainShade, { opacity: 0.32 });
    B.add(`<line x1="${P(T(2, torso * 0.5).x)}" y1="${P(T(2, torso * 0.5).y)}" x2="${P(T(A.shHalf * 0.5, torso * 0.84).x)}" y2="${P(T(A.shHalf * 0.5, torso * 0.84).y)}" stroke="${C.accent}" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`);
  }
  if (chn === 'chestplate') {
    // breastplate covers the chest only — the cloth torso stays visible below
    shape(B, zone([
      T(-A.shHalf * 0.7, torso * 0.9), T(A.shHalf * 0.72, torso * 0.92),
      T(A.shHalf * 0.52, torso * 0.4), T(-A.shHalf * 0.46, torso * 0.36),
    ]), C.plate, { outline: C.outline });
    B.add(`<line x1="${P(T(0.5, torso * 0.9).x)}" y1="${P(T(0.5, torso * 0.9).y)}" x2="${P(T(0.5, torso * 0.38).x)}" y2="${P(T(0.5, torso * 0.38).y)}" stroke="${C.plateLit ?? C.mainLit}" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/>`);
    shape(B, zone([
      T(A.shHalf * 0.72, torso * 0.92), T(A.shHalf * 0.52, torso * 0.4),
      T(A.shHalf * 0.2, torso * 0.4), T(A.shHalf * 0.3, torso * 0.84),
    ]), C.plateShade ?? C.mainShade, { opacity: 0.7 });
  }
  if (spec.costume?.sash || spec.costume?.sash !== false && false) void 0;
  if (spec.costume?.sash) {
    shape(B, zone([T(-13, torso * 0.18), T(13, torso * 0.14), T(13, torso * 0.04), T(-13, torso * 0.08)]), C.accent, { outline: C.outline });
    shape(B, zone([T(5, torso * 0.18), T(13, torso * 0.14), T(13, torso * 0.04), T(5, torso * 0.08)]), C.accentLit ?? C.accent, { opacity: 0.7 });
  }
};

// ---- weapons ----------------------------------------------------------------
function weapon(B, spec, C, params, hands, lean) {
  const state = weaponState(params);
  if (spec.weapon === 'twin-blades' && state === 'act') {
    blade(B, C, hands.front.wrist, hands.front.foreA - 6);
    blade(B, C, hands.back.wrist, hands.back.foreA - 6);
  } else if (spec.weapon === 'twin-blades' && state === 'ready') {
    // blades rest along the back; gripped only during combat poses
    void lean;
  }
  if (spec.weapon === 'paper-fan' && state === 'act') {
    fan(B, C, hands.front.wrist, Math.min(60, Math.max(30, hands.front.foreA)) + 20);
  }
  if (spec.weapon === 'tower-shield' && state === 'act') {
    const hh = hands.front;
    const off = params.pose === 'guard' ? { x: -6, y: 10 } : { x: 6, y: -44 };
    const pos = { x: hh.wrist.x + off.x, y: hh.wrist.y + off.y };
    const tilt = params.pose === 'guard' ? -2 : -lean * 0.5 - 4;
    shield(B, C, pos, tilt);
  }
}

const weaponState = (params) => params.weapon ?? WEAPON_POSES[params.pose] ?? 'ready';

function blade(B, C, wrist, angle) {
  const d = dir(angle);
  const p = { x: wrist.x + d.x * 12, y: wrist.y + d.y * 12 };
  const t = dir(angle - 180);
  const n = { x: -d.y, y: d.x };
  shape(B, [
    [p.x + n.x * 3.2, p.y + n.y * 3.2], [p.x + d.x * 58 + n.x * 2.6, p.y + d.y * 58 + n.y * 2.6],
    [p.x + d.x * 70, p.y + d.y * 70], [p.x + d.x * 58 - n.x * 2.6, p.y + d.y * 58 - n.y * 2.6],
    [p.x - n.x * 3.2, p.y - n.y * 3.2],
  ], '#cdd6da', { outline: C.outline });
  B.add(`<line x1="${P(p.x + n.x * 1.6)}" y1="${P(p.y + n.y * 1.6)}" x2="${P(p.x + d.x * 60)}" y2="${P(p.y + d.y * 60)}" stroke="#eef1f0" stroke-opacity=".9" stroke-width="1.6" stroke-linecap="round"/>`);
  const grip = { x: wrist.x + t.x * 6, y: wrist.y + t.y * 6 };
  shape(B, [[grip.x - 2, grip.y - 2], [grip.x + 2, grip.y - 2], [grip.x + 2, grip.y + 2], [grip.x - 2, grip.y + 2]], C.trim, { outline: C.outline });
  B.add(`<line x1="${P(p.x - n.x * 7)}" y1="${P(p.y - n.y * 7)}" x2="${P(p.x + n.x * 7)}" y2="${P(p.y + n.y * 7)}" stroke="${C.accent}" stroke-width="3" stroke-linecap="round"/>`);
}

function fan(B, C, wrist, angle) {
  const a0 = angle - 44;
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const a = a0 + i * 16;
    const t = dir(a);
    const e = { x: wrist.x + t.x * 46, y: wrist.y + t.y * 46 };
    const n = { x: -t.y, y: t.x };
    petals.push([e, n]);
  }
  for (let i = 0; i < petals.length; i++) {
    const [e, n] = petals[i];
    shape(B, [
      [wrist.x, wrist.y], [e.x + n.x * 7, e.y + n.y * 7], [e.x - n.x * 7, e.y - n.y * 7],
    ], i % 2 ? '#f6efdf' : '#e9dfc8', { outline: C.outline });
  }
  dot(B, wrist.x, wrist.y, 6, 6, C.accent, { outline: C.outline });
}

function shield(B, C, pos, tilt) {
  {
    const w = 30, h = 62;
    const ptsRaw = [[-w, -h + 8], [w, -h], [w * 0.98, h - 6], [-w, h - 2]];
    const c = Math.cos(rad(tilt));
    const s = Math.sin(rad(tilt));
    const pts = ptsRaw.map(([dx, dy]) => [pos.x + dx * c - dy * s, pos.y + dx * s + dy * c]);
    shape(B, zone(pts), C.plate, { outline: C.outline });
    const band = [pts[0], pts[3], pts[2]].map((p) => [p[0], p[1]]);
    const inner = [pts[0], pts[2], pts[3]].map((p) => [p[0] * 0.7 + pos.x * 0.3, p[1] * 0.7 + pos.y * 0.3]);
    shape(B, zone([...band, ...inner.slice().reverse()]), C.plateShade ?? C.mainShade, { opacity: 0.55 });
    B.add(`<line x1="${P(pos.x - w * 0.7 + tilt)}" y1="${P(pos.y - h + 6)}" x2="${P(pos.x - w * 0.7)}" y2="${P(pos.y + h - 8)}" stroke="${C.accent}" stroke-width="3.4" stroke-linecap="round"/>`);
    for (const [dx, dy] of [[-18, -34], [18, -30], [-16, 34], [16, 30]]) {
      dot(B, pos.x + dx, pos.y + dy, 2.1, 2.1, C.accent, {});
    }
    B.add(`<line x1="${P(pos.x - 14)}" y1="${P(pos.y - 6)}" x2="${P(pos.x - 4)}" y2="${P(pos.y + 4)}" stroke="${C.outline}" stroke-opacity=".5" stroke-width="1.4"/>`);
  }
}

// small per-character accents that sell the pose without implying glow
function charFinale(B, spec, C, params, hands) {
  if (spec.id === 'kaien' && (WEAPON_POSES[params.pose] === 'act')) {
    const w = hands.front.wrist;
    for (let i = 0; i < 3; i++) {
      const fx = w.x + 14 + i * 9;
      const fy = w.y + 2 - i * 5;
      shape(B, [[fx, fy + 7], [fx + 5, fy - 2], [fx + 1.5, fy + 1], [fx + 3, fy - 7], [fx - 2, fy + 1]], i === 1 ? C.signature : C.accent, { opacity: 0.85 });
    }
  }
  if (spec.id === 'selka' && params.pose === 'dash') {
    const w = hands.back.wrist;
    B.add(`<line x1="${P(w.x - 30)}" y1="${P(w.y + 8)}" x2="${P(w.x - 96)}" y2="${P(w.y + 18)}" stroke="${C.signature}" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`);
  }
}

// Cloth worn behind the body: drawn before torso/limbs, hangs down and back.
// A heavy sentinel's tower shield is strapped across the back while the hands
// are free, so it belongs to this pass too.
function behindCloth(B, spec, C, ctx) {
  const { px, pivotY, shY: shLocal, wind, lean, params } = ctx;
  const pivot = { x: px, y: pivotY };
  // follow the torso rotation so leaning poses never detach the cloth
  const shoulder = rot({ x: px, y: pivotY + shLocal }, lean, pivot);
  const shoulderY = shoulder.y;
  const knotX = shoulder.x - 4;
  const knotY = shoulderY - 6;
  const drapeY = shoulderY + 158;
  const sway = wind * 34;
  if (spec.cloth === 'ember-scarf') {
    shape(B, [
      [knotX + 9, knotY - 4], [knotX - 14, knotY + 34 + sway * 0.2], [knotX - 25, knotY + 92 - sway * 0.3],
      [knotX - 19, drapeY - sway * 0.5], [knotX + 1, drapeY + 7 - sway * 0.5],
      [knotX + 6, knotY + 96 - sway * 0.25], [knotX + 8, knotY + 2],
    ], C.main, { outline: C.outline });
    shape(B, [
      [knotX - 19, drapeY - sway * 0.5], [knotX - 38, drapeY + 12 - sway * 0.7],
      [knotX - 14, drapeY + 20 - sway * 0.7], [knotX + 1, drapeY + 7 - sway * 0.5],
    ], C.signature, { outline: C.outline });
    B.add(`<polyline points="${zone([
      [knotX + 7, knotY - 3], [knotX - 12, knotY + 36], [knotX - 22, knotY + 94 - sway * 0.3],
    ]).map(([a, b]) => `${a},${b}`).join(' ')}" fill="none" stroke="${C.mainLit}" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>`);
  }
  if (spec.cloth === 'gale-cape') {
    shape(B, [
      [knotX + 15, knotY - 2], [knotX - 16, knotY + 6], [knotX - 40, knotY + 42 - sway * 0.25],
      [knotX - 37, knotY + 106 - sway * 0.4], [knotX - 13, knotY + 112 - sway * 0.4],
      [knotX + 1, knotY + 64 - sway * 0.2], [knotX + 12, knotY + 10],
    ], C.mainShade, { outline: C.outline });
    shape(B, [
      [knotX - 37, knotY + 106 - sway * 0.4], [knotX - 52, knotY + 116 - sway * 0.55],
      [knotX - 30, knotY + 120 - sway * 0.55], [knotX - 13, knotY + 112 - sway * 0.4],
    ], C.signature, { outline: C.outline, opacity: 0.9 });
    B.add(`<polyline points="${zone([
      [knotX + 13, knotY - 1], [knotX - 15, knotY + 8], [knotX - 38, knotY + 44 - sway * 0.25],
    ]).map(([a, b]) => `${a},${b}`).join(' ')}" fill="none" stroke="${C.mainLit}" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>`);
  }
  if (spec.weapon === 'tower-shield' && weaponState(params ?? {}) !== 'act') {
    // strapped shield rides high on the back, its edge breaking the silhouette
    const cx = shoulder.x - 44;
    const top = shoulderY - 16;
    const h = 158;
    const w = 27;
    const tilt = lean - 5;
    const c = Math.cos(rad(tilt));
    const s = Math.sin(rad(tilt));
    const raw = [[-w, 8], [w, 0], [w - 3, h], [-w, h - 12]];
    const pts = raw.map(([dx, dy]) => [cx + dx * c - dy * s, top + dx * s + dy * c]);
    shape(B, zone(pts), C.plate, { outline: C.outline });
    shape(B, zone([
      [cx - w, top + 10], [cx - w * 0.55, top + 8 - 6 * s], [cx - w * 0.4, top + h - 14], [cx - w, top + h - 12],
    ]), C.plateShade ?? C.mainShade, { opacity: 0.6 });
    B.add(`<line x1="${P(cx + w - 7)}" y1="${P(top + 4)}" x2="${P(cx + w - 7)}" y2="${P(top + h - 4)}" stroke="${C.accent}" stroke-width="3.2" stroke-linecap="round"/>`);
    for (const [dx, dy] of [[-14, 26], [12, 22], [-12, 112], [12, 108]]) {
      dot(B, cx + dx, top + dy, 2.1, 2.1, C.accent, {});
    }
    B.add(`<line x1="${P(cx - 10)}" y1="${P(top + 62)}" x2="${P(cx - 2)}" y2="${P(top + 74)}" stroke="${C.outline}" stroke-opacity=".5" stroke-width="1.4"/>`);
  }
}

function trailingLayers(B, spec, C, ctx) {
  const { wind, x, hipY } = ctx;
  if (spec.cloth === 'paper-hem') {
    for (let i = 0; i < 4; i++) {
      const px = x - 22 - i * 20;
      const py = hipY - 8 - wind * (6 + i * 7);
      shape(B, [
        [px, py - 9], [px + 8, py], [px, py + 10], [px - 7, py],
      ], i % 2 ? C.accent : '#f4ecdc', { outline: C.outline, opacity: 0.94 });
    }
  }
}

function wrapFigure(inner, spec, params) {
  const frameTxt = params.frame ? ` frame ${params.frame}` : '';
  const meta = `<!-- ${spec.name} (${spec.id}) — ${params.pose}${frameTxt} · standalone editable development SVG. Generated by packages/asset-tools/compile-characters.mjs; regenerate freely, edit freely. Key light upper-left; shadow band lower-right; anchor = ground point (256,560) on the 512×640 canvas. -->`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW.width}" height="${VIEW.height}" viewBox="0 0 ${VIEW.width} ${VIEW.height}" data-anchor="${POSE_ANCHOR.x},${POSE_ANCHOR.y}" data-pose="${params.pose}"${params.frame ? ` data-frame="${params.frame}"` : ''} data-asset="pose">\n${meta}\n${inner}\n</svg>\n`;
}

// ---- pose table -------------------------------------------------------------
// Angles: 0° points straight down, positive rotates toward facing (+x).
// `sh` moves the whole limb away from the torso; `el`/`knee` bend onward.
// Silhouette-first values: readable at a glance from ~60px up in the UI.
export const BASE_POSES = {
  idle: { lean: -2, crouch: 2, wind: 0.4, expr: 'neutral',
    arms: { front: { sh: 24, el: 58 }, back: { sh: 16, el: 62 } },
    legs: { front: { hip: 6, knee: 4 }, back: { hip: -8, knee: 8 } } },
  walk: [
    { lean: 2, crouch: 3, wind: 0.6, expr: 'focused',
      arms: { front: { sh: -14, el: 42 }, back: { sh: 36, el: 48 } },
      legs: { front: { hip: 30, knee: 12 }, back: { hip: -18, knee: 8 } }, lift: { back: 2 } },
    { lean: 3, crouch: 2, wind: 0.6, expr: 'focused',
      arms: { front: { sh: 26, el: 46 }, back: { sh: -10, el: 40 } },
      legs: { front: { hip: 2, knee: 6 }, back: { hip: -28, knee: 26 } }, lift: { back: 12 } },
  ],
  run: [
    { lean: 14, crouch: 5, wind: 0.9, expr: 'focused',
      arms: { front: { sh: -36, el: 76 }, back: { sh: 54, el: 66 } },
      legs: { front: { hip: 42, knee: 26 }, back: { hip: -32, knee: 30 } }, lift: { back: 8 } },
    { lean: 16, crouch: 4, wind: 0.9, expr: 'focused',
      arms: { front: { sh: 44, el: 70 }, back: { sh: -30, el: 60 } },
      legs: { front: { hip: 10, knee: 30 }, back: { hip: -16, knee: 48 } }, lift: { back: 22, front: 2 } },
  ],
  jump: { lean: 4, air: 128, wind: 0.9, expr: 'focused',
    arms: { front: { sh: 150, el: 24 }, back: { sh: 130, el: 36 } },
    legs: { front: { hip: 32, knee: 64 }, back: { hip: 16, knee: 54 } }, lift: { front: 60, back: 50 } },
  dash: { lean: 28, crouch: 12, wind: 1.0, expr: 'focused',
    arms: { front: { sh: -44, el: 22 }, back: { sh: 56, el: 14 } },
    legs: { front: { hip: 47, knee: 22 }, back: { hip: -55, knee: 8 } }, lift: { back: 14 }, shiftX: -6 },
  'light-attack': [
    { lean: -10, crouch: 5, wind: 0.5, expr: 'focused',
      arms: { front: { sh: 34, el: 124 }, back: { sh: -10, el: 76 } },
      legs: { front: { hip: 14, knee: 12 }, back: { hip: -16, knee: 12 } } },
    { lean: 15, crouch: 4, wind: 0.9, expr: 'focused',
      arms: { front: { sh: 78, el: 8 }, back: { sh: -28, el: 58 } },
      legs: { front: { hip: 34, knee: 10 }, back: { hip: -24, knee: 14 } } },
  ],
  'heavy-attack': [
    { lean: -16, crouch: 16, wind: 0.4, expr: 'focused',
      arms: { front: { sh: 98, el: 108 }, back: { sh: 58, el: 98 } },
      legs: { front: { hip: 56, knee: 76 }, back: { hip: -14, knee: 18 } }, lift: { front: 4 } },
    { lean: 8, crouch: 6, wind: 1.0, expr: 'focused',
      arms: { front: { sh: 64, el: 20 }, back: { sh: -42, el: 34 } },
      legs: { front: { hip: 88, knee: 8 }, back: { hip: -30, knee: 20 } }, lift: { front: 42 } },
  ],
  guard: { lean: 8, crouch: 14, wind: 0.3, expr: 'focused',
    arms: { front: { sh: 60, el: 112 }, back: { sh: 52, el: 118 } },
    legs: { front: { hip: 16, knee: 16 }, back: { hip: -12, knee: 16 } } },
  'hit-reaction': { lean: -34, headTilt: -20, crouch: 0, wind: 0.7, expr: 'strained',
    arms: { front: { sh: -46, el: 26 }, back: { sh: -54, el: 18 } },
    legs: { front: { hip: 26, knee: 18 }, back: { hip: -10, knee: 6 } }, shiftX: 10 },
  skill: { lean: 24, crouch: 22, wind: 1.0, expr: 'focused',
    arms: { front: { sh: 86, el: 14 }, back: { sh: -30, el: 42 } },
    legs: { front: { hip: 44, knee: 22 }, back: { hip: -48, knee: 18 } }, lift: { back: 10 }, shiftX: -6 },
  ultimate: { lean: -8, air: 44, wind: 1.0, expr: 'focused',
    arms: { front: { sh: 124, el: 16 }, back: { sh: -36, el: 26 } },
    legs: { front: { hip: 26, knee: 16 }, back: { hip: -34, knee: 26 } }, lift: { back: 16 } },
  victory: { lean: -4, wind: 0.7, expr: 'focused',
    arms: { front: { sh: 168, el: 8 }, back: { sh: 12, el: 94 } },
    legs: { front: { hip: 8, knee: 6 }, back: { hip: -10, knee: 10 } } },
  defeat: { lean: 10, headTilt: 16, crouch: 62, wind: 0.25, expr: 'strained',
    arms: { front: { sh: 12, el: 18 }, back: { sh: 8, el: 12 } },
    legs: { front: { hip: 44, knee: 104 }, back: { hip: -6, knee: 26 } } },
};

export const FRAME_COUNTS = {
  idle: 1, walk: 2, run: 2, jump: 1, dash: 1,
  'light-attack': 2, 'heavy-attack': 2, guard: 1, 'hit-reaction': 1,
  skill: 1, ultimate: 1, victory: 1, defeat: 1,
};

export const POSE_SPECIALS = { jump: 'airborne', defeat: 'kneeling' };

export function poseFrames(spec) {
  const frames = [];
  for (const [pose, count] of Object.entries(FRAME_COUNTS)) {
    const override = spec.poses?.[pose];
    for (let i = 0; i < count; i++) {
      const base = Array.isArray(BASE_POSES[pose]) ? { ...BASE_POSES[pose][i] } : { ...BASE_POSES[pose] };
      Object.assign(base, override?.base ?? {}, override?.frames?.[i] ?? {});
      base.pose = pose;
      base.frame = count > 1 ? i + 1 : null;
      frames.push(base);
    }
  }
  return frames;
}

export function svgPose(spec, params) {
  return drawFigure(spec, params).svg;
}

// ---- expressions (bust closeups) --------------------------------------------
export function svgBust(spec, expr) {
  const B = makeB();
  const ch = 62;
  const hc = { x: 128, y: 128 };
  hairBack(B, spec, spec.palette, hc, ch);
  facePlate(B, spec, spec.palette, hc, ch, expr);
  faceInk(B, spec, spec.palette, hc, ch, expr);
  hairFront(B, spec, spec.palette, hc, ch);
  // shoulders hint
  shape(B, [[70, 214], [128, 196], [186, 214], [186, 256], [70, 256]], spec.palette.main, { outline: spec.palette.outline });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BUST_VIEW.width}" height="${BUST_VIEW.height}" viewBox="0 0 ${BUST_VIEW.width} ${BUST_VIEW.height}" data-anchor="${BUST_ANCHOR.x},${BUST_ANCHOR.y}" data-asset="expression" data-expression="${expr}">\n<!-- ${spec.name} (${spec.id}) ${expr} expression bust · generated development art; key light upper-left -->\n${B.text()}\n</svg>\n`;
}

// ---- construction sheet -----------------------------------------------------
export function svgBuildSheet(spec) {
  const body = drawFigure(spec, { ...BASE_POSES.idle, pose: 'construction', wind: 0.3 }).svg
    .replace(/^<svg[^>]*>\n/, '').replace(/<\/svg>\n$/, '');
  const H = spec.prop.height;
  const headR = H / (2 * spec.prop.heads);
  let guides = '';
  for (let i = 0; i <= 8; i++) {
    const y = POSE_ANCHOR.y - i * headR * 2;
    guides += `<line x1="40" y1="${P(y)}" x2="410" y2="${P(y)}" stroke="#87755a" stroke-opacity=".4" stroke-width="1" stroke-dasharray="3 5"/>\n<text x="414" y="${P(y + 4)}" font-family="Georgia,serif" font-size="12" fill="#87755a">${i}</text>\n`;
  }
  const label = (x, y) => `<text x="${P(x)}" y="${P(y)}" font-family="Georgia,serif" font-style="italic" font-size="13" fill="#cbb98c">${y}</text>`;
  void label;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="640" viewBox="0 0 560 640" data-anchor="256,560" data-asset="construction">\n<!-- ${spec.name} (${spec.id}) construction reference: head-count guides, side view; generated development art -->\n<rect width="560" height="640" fill="#241f19"/>\n${guides}<g transform="translate(0,0)">${body}</g>\n</svg>\n`;
}

// ---- silhouette exploration -------------------------------------------------
export function svgSilhouettes(spec, variants) {
  const mono = {};
  for (const key of Object.keys(spec.palette)) mono[key] = key === 'shadowGround' ? '#141017' : '#4a4433';
  const cells = variants.map((v, i) => {
    const pose = BASE_POSES[v.pose === undefined ? 'idle' : v.pose];
    const merged = typeof pose === 'object' && !Array.isArray(pose) ? { ...pose, ...(v.tweaks ?? {}) } : { ...pose, ...(v.tweaks ?? {}) };
    const fig = drawFigure({ ...spec, palette: mono }, { ...merged, pose: `silhouette-${i + 1}` }).svg
      .replace(/^<svg[^>]*>\n/, '').replace(/<\/svg>\n$/, '').replace(/data-asset="pose"/, 'data-asset="silhouette"');
    return `<g transform="translate(${i * 330},0)">${fig}</g>\n<text x="${i * 330 + 256}" y="238" font-family="Georgia,serif" font-size="14" fill="#9a8c68" text-anchor="middle">${v.label ?? `variant ${i + 1}`}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="640" viewBox="0 0 1180 640" data-anchor="256,560" data-asset="silhouette-sheet">\n<!-- ${spec.name} (${spec.id}) silhouette exploration sheet · generated development art -->\n<rect width="1060" height="640" fill="#241f19"/>\n<text x="28" y="46" font-family="Georgia,serif" font-size="22" fill="#d8c69a">${spec.name} — silhouette directions</text>\n<text x="28" y="70" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#9a8c68">distinct reads: hair mass, drape trail, limb rhythm. Approved-family only.</text>\n${cells.join('\n')}\n</svg>\n`;
}

// ---- effect stamps ----------------------------------------------------------
export function svgEffect(spec, kind) {
  const C = spec.palette;
  const B = makeB();
  const cx = EFFECT_ANCHOR.x;
  const cy = EFFECT_ANCHOR.y;
  const stroke = (pts, color, width, opacity = 0.9) =>
    B.add(`<polyline points="${pts.map(([x, y]) => `${P(x)},${P(y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-opacity="${opacity}"/>`);
  const shapeFx = (pts, fill, opacity = 0.85) => B.add(`<path d="${poly(pts)}" fill="${fill}" fill-opacity="${opacity}"/>`);
  if (spec.id === 'kaien' && kind === 'trail') {
    stroke([[70, 330], [150, 250], [260, 210]], C.signature, 10, 0.8);
    stroke([[92, 380], [190, 306], [306, 262]], C.mainLit, 6, 0.75);
    shapeFx([[262, 208], [286, 196], [274, 222]], C.signature);
    shapeFx([[306, 262], [330, 252], [318, 276]], C.accent, 0.8);
    dot(B, 120, 232, 3.4, 3.4, C.signature, { opacity: 0.9 });
    dot(B, 200, 280, 2.6, 2.6, C.accent, { opacity: 0.75 });
    dot(B, 96, 300, 2.2, 2.2, C.mainLit, { opacity: 0.6 });
  } else if (spec.id === 'kaien' && kind === 'impact') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r0 = 46 + (i % 2) * 10;
      const r1 = 96 + (i % 3) * 18;
      stroke([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a + 0.12) * r1, cy + Math.sin(a + 0.12) * r1]], i % 2 ? C.signature : C.mainLit, 8 - (i % 3) * 2, 0.8);
    }
    shapeFx([[cx - 34, cy - 18], [cx + 10, cy - 34], [cx + 40, cy], [cx + 4, cy + 30], [cx - 30, cy + 16]], C.signature, 0.35);
  } else if (spec.id === 'mira' && kind === 'fold') {
    const sheet = (x, y, r, fill) => {
      const c = Math.cos(rad(r));
      const s = Math.sin(rad(r));
      const pts = [[x - 16, y - 10], [x + 12, y - 16], [x + 18, y + 10], [x - 12, y + 15]].map(([dx, dy]) => [x + dx * c - dy * s, y + dx * s + dy * c]);
      shapeFx(pts, fill);
      B.add(`<line x1="${P(pts[0][0])}" y1="${P(pts[0][1])}" x2="${P(pts[2][0])}" y2="${P(pts[2][1])}" stroke="${C.accent}" stroke-opacity=".7" stroke-width="1.6"/>`);
    };
    sheet(cx - 70, cy - 40, -12, '#f6efdf');
    sheet(cx + 30, cy - 66, 18, '#efe6cf');
    sheet(cx - 16, cy + 26, -30, '#f6efdf');
    stroke([[cx - 110, cy + 60], [cx - 40, cy + 40], [cx + 60, cy + 66]], C.accent, 2.4, 0.7);
  } else if (spec.id === 'mira' && kind === 'bloom') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = cx + Math.cos(a) * 74;
      const py = cy + Math.sin(a) * 60;
      shapeFx([[px, py - 10], [px + 9, py], [px, py + 11], [px - 9, py]], i % 2 ? C.mainLit : '#f6efdf', 0.8);
      stroke([[cx, cy], [px * 0.55 + cx * 0.45, py * 0.55 + cy * 0.45]], C.accent, 1.6, 0.6);
    }
  } else if (spec.id === 'orun' && kind === 'shock') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - Math.PI / 2 + Math.PI * 0.08 * i;
      stroke([[cx, cy + 40], [cx + Math.cos(a) * 60, cy + 40 - Math.abs(Math.sin(a)) * 34], [cx + Math.cos(a) * 88, cy + 40 + Math.cos(i) * 6]], C.accent, 4, 0.85);
    }
    shapeFx([[cx - 42, cy + 38], [cx + 44, cy + 40], [cx + 30, cy + 58], [cx - 26, cy + 56]], C.plate, 0.5);
    for (let i = 0; i < 4; i++) dot(B, cx - 50 + i * 32, cy + 52 + (i % 2) * 8, 4 + (i % 2) * 2.4, 3.4, C.mainShade, { opacity: 0.8 });
  } else if (spec.id === 'orun' && kind === 'dust') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      shapeFx([[cx + Math.cos(a) * 60, cy + Math.sin(a) * 44], [cx + Math.cos(a) * 60 + 12, cy + Math.sin(a) * 44 - 6], [cx + Math.cos(a) * 60 + 4, cy + Math.sin(a) * 44 + 10]], C.mainLit, 0.35 + (i % 2) * 0.15);
    }
  } else if (spec.id === 'selka' && kind === 'swirl') {
    for (let i = 0; i < 3; i++) {
      const r = 44 + i * 26;
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const a = (k / 7) * Math.PI * 1.5 + i * 0.7;
        pts.push([cx + Math.cos(a) * r, cy - i * 6 + Math.sin(a) * r * 0.8]);
      }
      stroke(pts, i % 2 ? C.mainLit : C.signature, 4 - i, 0.7 - i * 0.12);
    }
    shapeFx([[cx + 30, cy - 54], [cx + 48, cy - 46], [cx + 34, cy - 34]], C.signature, 0.8);
  } else if (spec.id === 'selka' && kind === 'cut') {
    stroke([[110, 320], [190, 160], [250, 220]], C.signature, 8, 0.85);
    stroke([[150, 350], [236, 206], [286, 258]], C.mainLit, 5, 0.75);
    shapeFx([[250, 218], [268, 232], [252, 246]], C.mainLit, 0.9);
    shapeFx([[286, 256], [302, 274], [284, 282]], C.signature, 0.7);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EFFECT_VIEW.width}" height="${EFFECT_VIEW.height}" viewBox="0 0 ${EFFECT_VIEW.width} ${EFFECT_VIEW.height}" data-anchor="${EFFECT_ANCHOR.x},${EFFECT_ANCHOR.y}" data-asset="effect" data-effect="${spec.id}-${kind}">\n<!-- ${spec.name} (${spec.id}) ${kind} effect stamp · generated development art; anchor (256,300) approximates the fighter's chest -->\n${B.text()}\n</svg>\n`;
}
