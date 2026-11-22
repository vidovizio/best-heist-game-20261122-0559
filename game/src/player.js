// player.js — the thief: walking with WASD, creeping with Shift (slower but a smaller silhouette
// and quieter), facing, and the step bob the renderer uses. One job: move the thief, nothing else.

import { TUNING } from './config.js';
import { moveCircle } from './level.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    r: TUNING.playerRadius,
    vx: 0,
    vy: 0,
    facing: 0,
    sneak: false,
    stepPhase: 0,
    carrying: 0,
    still: 0,
    alive: true,
  };
}

/** Moves the thief from this frame's input intent. */
export function updatePlayer(p, intent, level, dt) {
  let ix = intent.x;
  let iy = intent.y;
  const len = Math.hypot(ix, iy);
  if (len > 0) { ix /= len; iy /= len; }
  p.sneak = !!intent.sneak;
  const speed = p.sneak ? TUNING.playerSneakSpeed : TUNING.playerSpeed;
  const vx = ix * speed;
  const vy = iy * speed;
  const before = { x: p.x, y: p.y };
  moveCircle(level, p, vx * dt, vy * dt);
  p.vx = (p.x - before.x) / Math.max(dt, 0.0001);
  p.vy = (p.y - before.y) / Math.max(dt, 0.0001);
  const moving = Math.hypot(p.vx, p.vy) > 8;
  if (moving) {
    p.facing = Math.atan2(p.vy, p.vx);
    p.stepPhase += dt * (p.sneak ? 7 : 13);
    p.still = 0;
  } else {
    p.still += dt;
  }
  return moving;
}
