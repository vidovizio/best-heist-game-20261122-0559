// guard.js — one guard's behaviour: walk the route, pause and sweep the lamp at each corner, notice
// a lit thief and grow suspicious, walk over to check, give chase when the alarm is loud, and go
// back to the route when the heat dies. One job: a guard's state machine and his lamp.

import { TILE, TUNING } from './config.js';
import { tileCenter, moveCircle } from './level.js';
import { canSee } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPECT = 'suspect';
export const GUARD_CHASE = 'chase';
export const GUARD_SEARCH = 'search';

/** Wraps an angle into (-PI, PI]. */
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function createGuard(def, index) {
  const nodes = def.path.map(([tx, ty]) => tileCenter(tx, ty));
  const first = nodes[0];
  const next = nodes[1] || nodes[0];
  return {
    id: index,
    nodes,
    node: 1,
    dir: 1, // walks the route to its end, then back down it: a guard never cuts across the room
    x: first.x,
    y: first.y,
    r: 12,
    vx: 0,
    vy: 0,
    speed: def.speed,
    pause: def.pause ?? 0.8,
    wait: 0,
    facing: Math.atan2(next.y - first.y, next.x - first.x),
    torch: Math.atan2(next.y - first.y, next.x - first.x),
    mode: GUARD_PATROL,
    suspicion: 0,
    litYou: false,
    lastSeen: null,
    searchTimer: 0,
    lookAt: null,
    sweep: 0,
    sweepDir: 1,
  };
}

/** Points the lamp smoothly at a target angle, at a limited turn rate. */
function turnTorch(g, target, dt, rate) {
  const diff = wrapAngle(target - g.torch);
  const step = Math.min(Math.abs(diff), rate * dt) * Math.sign(diff);
  g.torch = wrapAngle(g.torch + step);
  return Math.abs(wrapAngle(target - g.torch)) < 0.05;
}

/**
 * Advances a guard. Returns what he saw this frame: { sees, seesPoint } where seesPoint is the
 * thief's position if this guard's lamp has it.
 */
export function updateGuard(g, dt, ctx) {
  const { level, player, alarmValue, time } = ctx;
  // ---- what the lamp can see
  const dx = player.x - g.x;
  const dy = player.y - g.y;
  const dist = Math.hypot(dx, dy);
  const range = TUNING.guardVisionRange * (g.mode === GUARD_CHASE ? 1.15 : 1);
  g.litYou = canSee(level, ctx.smokes, g.x, g.y, g.torch, TUNING.guardVisionHalf, range,
    player.x, player.y, player.r + 4);

  if (g.litYou) {
    g.lastSeen = { x: player.x, y: player.y };
    g.suspicion = Math.min(1, g.suspicion + dt * 2.6);
  } else {
    g.suspicion = Math.max(0, g.suspicion - dt * 0.45);
  }

  // ---- mode transitions
  if (g.litYou && dist < 260 && g.mode === GUARD_PATROL) g.mode = GUARD_SUSPECT;
  if (g.mode === GUARD_SUSPECT && g.suspicion >= 1) g.mode = GUARD_SEARCH;
  if (alarmValue >= 100 && (g.lastSeen || g.mode === GUARD_CHASE)) g.mode = GUARD_CHASE;
  if (g.mode === GUARD_CHASE && !g.lastSeen) {
    g.searchTimer -= dt;
    if (g.searchTimer <= 0) { g.mode = GUARD_PATROL; g.suspicion = 0; }
  } else if (g.mode === GUARD_CHASE) {
    g.searchTimer = 3.2;
  }
  if (g.mode === GUARD_SEARCH) {
    g.searchTimer -= dt;
    if (g.searchTimer <= 0) { g.mode = GUARD_PATROL; g.suspicion = 0; }
  }

  let target = null;
  let speed = g.speed;

  if (g.mode === GUARD_PATROL) {
    target = g.nodes[g.node];
    if (g.wait > 0) {
      g.wait -= dt;
      // Sweep the lamp left and right while paused: the cone you have to time your crossing against.
      g.sweep += dt * 1.6 * g.sweepDir;
      if (Math.abs(g.sweep) > 0.55) g.sweepDir *= -1;
      const base = Math.atan2(target.y - g.y, target.x - g.x);
      turnTorch(g, base + g.sweep, dt, 3.2);
      target = null;
    } else {
      const base = Math.atan2(target.y - g.y, target.x - g.x);
      turnTorch(g, base, dt, 4.5);
    }
  } else if (g.mode === GUARD_SUSPECT) {
    // Walk toward the last thing he saw, lamp first.
    target = g.lastSeen;
    speed = TUNING.guardSuspicionSpeed;
    if (g.lastSeen) {
      const want = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
      turnTorch(g, want, dt, 5);
    }
    if (g.lastSeen && Math.hypot(g.lastSeen.x - g.x, g.lastSeen.y - g.y) < 44) {
      g.searchTimer = 2.4;
      g.mode = GUARD_SEARCH;
    }
  } else if (g.mode === GUARD_CHASE) {
    target = g.lastSeen || { x: player.x, y: player.y };
    speed = TUNING.guardChaseSpeed;
    const want = Math.atan2((g.lastSeen?.y ?? player.y) - g.y, (g.lastSeen?.x ?? player.x) - g.x);
    turnTorch(g, want, dt, 8);
  } else if (g.mode === GUARD_SEARCH) {
    speed = 0;
    g.sweep += dt * 2.2 * g.sweepDir;
    if (Math.abs(g.sweep) > 1.0) g.sweepDir *= -1;
    const base = g.lastSeen ? Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x) : g.torch;
    turnTorch(g, base + g.sweep, dt, 3);
  }

  // ---- locomotion
  g.vx = 0;
  g.vy = 0;
  if (target) {
    const tx = target.x - g.x;
    const ty = target.y - g.y;
    const d = Math.hypot(tx, ty);
    const stopAt = g.mode === GUARD_PATROL ? 4 : 12;
    if (d > stopAt) {
      const step = Math.min(d - stopAt, speed * dt);
      g.vx = (tx / d) * speed;
      g.vy = (ty / d) * speed;
      moveCircle(level, g, (tx / d) * step, (ty / d) * step);
      g.facing = Math.atan2(ty, tx);
    } else if (g.mode === GUARD_PATROL) {
      // Ping-pong the route: step to the next node, and at either end turn back the way he came.
      if (g.node + g.dir >= g.nodes.length || g.node + g.dir < 0) g.dir *= -1;
      g.node += g.dir;
      g.wait = g.pause;
      g.sweep = 0;
      g.sweepDir = 1;
    }
  }
  // Never let a guard stand inside the thief's space.
  if (dist < 18) {
    const push = (18 - dist) || 1;
    moveCircle(level, g, (-dx / (dist || 1)) * push, (-dy / (dist || 1)) * push);
  }

  // A small lamp wobble so the cone feels hand-held rather than mathematical.
  g.torch = wrapAngle(g.torch + Math.sin(time * 1.7 + g.id) * 0.0006);

  return { sees: g.litYou, x: g.x, y: g.y };
}

/** Sends a guard to inspect a point (a whistle, a noise). */
export function beckonGuard(g, x, y) {
  if (g.mode === GUARD_CHASE) return;
  g.mode = GUARD_SUSPECT;
  g.lastSeen = { x, y };
  g.suspicion = 0.9;
  g.searchTimer = 4;
}

/** The guard's tile position, for debugging and for placing him in a screenshot scene. */
export function guardTile(g) {
  return { tx: Math.floor(g.x / TILE), ty: Math.floor(g.y / TILE) };
}
