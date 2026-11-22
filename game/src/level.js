// level.js — the room as geometry: the tile grid, wall and cover blocking, a locked gate per cut,
// circle-vs-wall movement with sliding, and line-of-sight tests. One job: turn a floor plan into
// space you can walk and see through. No drawing, no rules about alarms.

import { TILE, COLS, ROWS } from './config.js';

export const EMPTY = 0;
export const WALL = 1;
export const COVER = 2;
export const GATE = 3;

const idx = (tx, ty) => ty * COLS + tx;

/** Centre of a tile in world pixels. */
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Builds a level's grid, gates, loot and exit from its plan. */
export function buildLevel(def, index) {
  const grid = new Uint8Array(COLS * ROWS);
  // The building's shell.
  for (let tx = 0; tx < COLS; tx++) {
    grid[idx(tx, 0)] = WALL;
    grid[idx(tx, ROWS - 1)] = WALL;
  }
  for (let ty = 0; ty < ROWS; ty++) {
    grid[idx(0, ty)] = WALL;
    grid[idx(COLS - 1, ty)] = WALL;
  }
  for (const s of def.solids) {
    const kind = s.kind === 'cover' ? COVER : WALL;
    for (let ty = s.y; ty < s.y + s.h; ty++) {
      for (let tx = s.x; tx < s.x + s.w; tx++) {
        if (tx > 0 && ty > 0 && tx < COLS - 1 && ty < ROWS - 1) grid[idx(tx, ty)] = kind;
      }
    }
  }
  // Gates are carved last: they punch a door through whatever wall they sit in.
  const gates = def.gates.map((g) => {
    for (let ty = g.y; ty < g.y + g.h; ty++) {
      for (let tx = g.x; tx < g.x + g.w; tx++) grid[idx(tx, ty)] = GATE;
    }
    const c = tileCenter(g.x + (g.w - 1) / 2, g.y + (g.h - 1) / 2);
    return { ...g, cx: c.x, cy: c.y, open: false, progress: 0 };
  });

  const spawn = tileCenter(def.spawn[0], def.spawn[1]);
  const exit = tileCenter(def.exit[0], def.exit[1]);
  const loot = def.loot.map((l, i) => {
    const c = tileCenter(l.x, l.y);
    return { ...l, x: c.x, y: c.y, taken: false, grab: 0, bob: i * 1.7 };
  });
  return {
    index,
    name: def.name,
    note: def.note,
    grid,
    gates,
    loot,
    exit,
    spawn,
    loadout: { ...def.loadout },
    guards: def.guards,
    cameras: def.cameras,
  };
}

/** The tile kind at a world position, or WALL outside the grid. */
export function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return WALL;
  return 0;
}

/** Whether a world point sits in a solid tile (walls, cover, and still-locked gates). */
export function solidAt(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const g = level.grid[idx(tx, ty)];
  if (g === WALL || g === COVER) return true;
  if (g === GATE) {
    for (const gate of level.gates) {
      if (!gate.open && tx >= gate.x && tx < gate.x + gate.w && ty >= gate.y && ty < gate.y + gate.h) return true;
    }
  }
  return false;
}

/** Blocks sight: walls, cover and closed gates. */
export function blocksSight(level, x, y) {
  return solidAt(level, x, y);
}

/**
 * Moves a circle by (dx,dy), sliding along walls instead of sticking: each axis is resolved
 * separately against the four probes of the circle. Returns whether any movement happened.
 */
export function moveCircle(level, body, dx, dy) {
  const r = body.r;
  const tryX = (x) => !solidAt(level, x, body.y - r + 1) && !solidAt(level, x, body.y) &&
    !solidAt(level, x, body.y + r - 1);
  const tryY = (y) => !solidAt(level, body.x - r + 1, y) && !solidAt(level, body.x, y) &&
    !solidAt(level, body.x + r - 1, y);
  let moved = false;
  if (dx !== 0) {
    const nx = body.x + dx;
    if (tryX(nx + Math.sign(dx) * r * 0.35)) { body.x = nx; moved = true; }
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    if (tryY(ny + Math.sign(dy) * r * 0.35)) { body.y = ny; moved = true; }
  }
  return moved;
}

/** Whether the straight segment a->b is unobstructed (step of half a tile). */
export function segmentClear(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 2)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (solidAt(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

/** The nearest locked gate within reach of a point, or null. */
export function gateNear(level, x, y, reach) {
  let best = null;
  let bestD = reach;
  for (const g of level.gates) {
    if (g.open) continue;
    const d = Math.hypot(g.cx - x, g.cy - y);
    if (d <= bestD) { bestD = d; best = g; }
  }
  return best;
}

/** Opens a gate: the tiles stop blocking movement and sight. */
export function openGate(level, gate) {
  gate.open = true;
  for (let ty = gate.y; ty < gate.y + gate.h; ty++) {
    for (let tx = gate.x; tx < gate.x + gate.w; tx++) level.grid[idx(tx, ty)] = EMPTY;
  }
}

/** A free tile centre near a point, used to place displaced things safely. */
export function freePointNear(level, x, y, maxTiles = 3) {
  for (let ring = 0; ring <= maxTiles; ring++) {
    for (let oy = -ring; oy <= ring; oy++) {
      for (let ox = -ring; ox <= ring; ox++) {
        const px = x + ox * TILE;
        const py = y + oy * TILE;
        if (!solidAt(level, px, py)) return { x: px, y: py };
      }
    }
  }
  return { x, y };
}
