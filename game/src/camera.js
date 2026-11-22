// camera.js — the wall lenses: a housing with a violet cone on a slow sine sweep, faster when the
// alarm is screaming, and an EMP that guts them for a handful of seconds. One job: a camera's aim
// and what it can see.

import { TUNING, TILE } from './config.js';
import { canSee } from './vision.js';

export const CAMERA_HALF = 0.30;

export function createCamera(def, index) {
  return {
    id: index,
    // Plans list a lens by tile; the world speaks pixels.
    x: def.x * TILE + TILE / 2,
    y: def.y * TILE + TILE / 2,
    base: def.angle,
    sweep: def.sweep ?? 0.45,
    period: def.period ?? 6.5,
    phase: def.phase ?? 0,
    range: def.range ?? 300,
    half: CAMERA_HALF,
    angle: def.angle,
    deadFor: 0,
    sees: false,
  };
}

/** The angle the camera points at a given time. Panic shortens the period and widens the arc. */
export function cameraAngle(c, time, alarmValue) {
  const panic = alarmValue >= 100 ? 1 : alarmValue / 100;
  const period = c.period * (1 - 0.35 * panic);
  const width = c.sweep * (1 + 0.3 * panic);
  return c.base + Math.sin((time / period) * Math.PI * 2 + c.phase) * width;
}

export function updateCamera(c, dt, ctx) {
  if (c.deadFor > 0) {
    c.deadFor = Math.max(0, c.deadFor - dt);
    c.sees = false;
    return { sees: false, x: c.x, y: c.y, angle: c.angle };
  }
  c.angle = cameraAngle(c, ctx.time, ctx.alarmValue);
  c.sees = canSee(ctx.level, ctx.smokes, c.x, c.y, c.angle, c.half, c.range,
    ctx.player.x, ctx.player.y, ctx.player.r + 2);
  return { sees: c.sees, x: c.x, y: c.y, angle: c.angle };
}

/** The EMP: every lens goes blind and dark for a few seconds. */
export function empCameras(cameras, seconds = TUNING.empSeconds) {
  for (const c of cameras) c.deadFor = Math.max(c.deadFor, seconds);
  return cameras;
}
