// vision.js — the light. Marches a ray through the grid so a lamp's cone stops at steel and fades
// inside a smoke cloud, and answers the one question every guard and camera asks: can I see that
// point? One job: line of sight.

import { blocksSight } from './level.js';

const STEP = 6;

/** Whether a point lies inside any live smoke cloud. */
export function inSmoke(smokes, x, y) {
  for (const s of smokes) {
    const r = s.radius * Math.min(1, s.life * 1.6);
    if (r > 4 && Math.hypot(s.x - x, s.y - y) < r) return true;
  }
  return false;
}

/**
 * How far a ray travels from (ox,oy) along a unit direction before steel stops it, capped at
 * maxDist. The first 24 px are ignored so a lamp mounted against a wall still lights the room.
 */
export function rayDistance(level, smokes, ox, oy, dx, dy, maxDist) {
  for (let d = 24; d < maxDist; d += STEP) {
    const x = ox + dx * d;
    const y = oy + dy * d;
    if (blocksSight(level, x, y)) return d;
    if (smokes.length && inSmoke(smokes, x, y)) return d * 0.55;
  }
  return maxDist;
}

/** The fan of ray angles across a cone, from one edge to the other. */
export function coneAngles(angle, half, rays) {
  const out = new Array(rays + 1);
  for (let i = 0; i <= rays; i++) out[i] = angle - half + (2 * half * i) / rays;
  return out;
}

/** The stray distances for that fan, so a cone polygon bends around cover and smoke. */
export function coneFan(level, smokes, ox, oy, angle, half, range, rays) {
  const angles = coneAngles(angle, half, rays);
  const fan = new Array(rays + 1);
  for (let i = 0; i <= rays; i++) {
    const a = angles[i];
    fan[i] = rayDistance(level, smokes, ox, oy, Math.cos(a), Math.sin(a), range);
  }
  return fan;
}

/** Whether a light source at (ox,oy) facing `angle` can see the point (tx,ty) with radius tr. */
export function canSee(level, smokes, ox, oy, angle, half, range, tx, ty, tr = 0) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range + tr) return false;
  if (inSmoke(smokes, tx, ty)) return false;
  if (dist > 26) {
    // Angular test, widened slightly by the target's size so a body at the cone's edge counts.
    let diff = Math.atan2(dy, dx) - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const pad = Math.atan2(tr, Math.max(1, dist));
    if (Math.abs(diff) > half + pad) return false;
  }
  const ux = dx / (dist || 1);
  const uy = dy / (dist || 1);
  return rayDistance(level, smokes, ox, oy, ux, uy, dist) >= dist - tr - STEP;
}
