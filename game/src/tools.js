// tools.js — the belt and what each tool does: smoke that bends every cone away, an EMP that kills
// the lenses, a lockpick that only works if you stand still at a gate, and a whistle that pulls a
// guard off his route. One job: spending charges and paying for them.

import { TUNING, TOOLS, TOOL_BY_ID } from './config.js';

export function createBelt(loadout) {
  const belt = {};
  for (const t of TOOLS) belt[t.id] = loadout[t.id] ?? 0;
  return belt;
}

/** The money the belt takes off the haul at the end: every charge you were issued, spent or not. */
export function beltCost(belt) {
  let total = 0;
  for (const t of TOOLS) total += (belt[t.id] ?? 0) * t.price;
  return total;
}

/** The value already spent, so the HUD can show the bill growing. */
export function beltSpent(startBelt, belt) {
  let total = 0;
  for (const t of TOOLS) total += Math.max(0, (startBelt[t.id] ?? 0) - (belt[t.id] ?? 0)) * t.price;
  return total;
}

/**
 * Uses one charge of a tool. Returns { ok, reason } — reasons are 'empty' or 'nowhere'. The
 * effects are applied by the caller so this file stays about the belt, not the world.
 */
export function spendCharge(belt, id) {
  if ((belt[id] ?? 0) <= 0) return { ok: false, reason: 'empty' };
  belt[id] -= 1;
  return { ok: true, tool: TOOL_BY_ID[id] };
}

/** Drops a smoke cloud at a point. */
export function dropSmoke(smokes, x, y) {
  smokes.push({
    x, y,
    radius: TUNING.smokeRadius,
    life: TUNING.smokeSeconds,
    max: TUNING.smokeSeconds,
    age: 0,
  });
  return smokes[smokes.length - 1];
}

/** Ages every cloud and removes the dead ones. */
export function ageSmoke(smokes, dt) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i];
    s.life -= dt;
    s.age += dt;
    if (s.life <= 0) smokes.splice(i, 1);
  }
}

/** Starts (or refreshes) a lockpick attempt on a gate. */
export function beginPick(pick, gate, player) {
  pick.gate = gate;
  pick.time = TUNING.pickSeconds;
  pick.x = player.x;
  pick.y = player.y;
  return pick;
}

/**
 * Advances a pick. Standing still keeps it going; moving away or off the gate cancels it. Returns
 * 'done' when the gate opens, 'cancel' when broken, 'working' while it holds, null when idle.
 */
export function updatePick(pick, dt, player, level, openGateFn) {
  if (!pick.gate || pick.time <= 0) return null;
  const moved = Math.hypot(player.x - pick.x, player.y - pick.y) > 10;
  const far = Math.hypot(pick.gate.cx - player.x, pick.gate.cy - player.y) > TUNING.pickReach;
  if (moved || far || pick.gate.open) {
    pick.gate = null;
    pick.time = 0;
    return 'cancel';
  }
  pick.time -= dt;
  if (pick.time <= 0) {
    openGateFn(level, pick.gate);
    pick.gate = null;
    return 'done';
  }
  return 'working';
}
