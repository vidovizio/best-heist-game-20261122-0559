// shots.js — the four deterministic scenes the screenshots are taken from. `?shot=start|loot|alarm|
// getaway` (or ?shot=title for the card) builds that exact frame from a fixed seed, so a screenshot
// is reproducible to the pixel instead of hoping a live run lands on the right moment. One job:
// stage a frame. The rules still live in game.js.

import { buildLevel } from './level.js';
import { createGuard } from './guard.js';
import { createCamera } from './camera.js';
import { createPlayer } from './player.js';
import { createBelt, beltCost, dropSmoke } from './tools.js';
import { createAlarm, tierOf } from './alarm.js';
import { LEVELS, TUNING } from './config.js';
import { clockLabel } from './game.js';

/** Puts the run on a floor without advancing time, so every value below is exactly what we set. */
function stage(game, index, clock, take) {
  const level = buildLevel(LEVELS[index], index);
  game.levelIndex = index;
  game.level = level;
  game.player = createPlayer(level.spawn);
  game.guards = level.guards.map((def, i) => createGuard(def, i));
  game.cameras = level.cameras.map((def, i) => createCamera(def, i));
  game.alarm = createAlarm();
  game.belt = createBelt(level.loadout);
  game.startBelt = { ...game.belt };
  game.beltCost = beltCost(game.startBelt);
  game.beltAccrued = 0;
  game.smokes = [];
  game.whistles = [];
  game.pick = { gate: null, time: 0, x: 0, y: 0 };
  game.armedTool = null;
  game.toasts = [];
  game.empFlash = 0;
  game.take = take;
  game.gross = take;
  game.clock = clock;
  game.clockLabel = clockLabel(clock);
  game.lives = TUNING.lives;
  game.lootTaken = 0;
  game.state = 'playing';
  game.outcome = null;
  game.time = 0;
  game.objective = 'GRAB EVERY GEM';
  return level;
}

/** Places a guard by tile with an explicit lamp angle, so the cone points somewhere chosen. */
function putGuard(g, tx, ty, torch, mode = 'patrol', facing) {
  g.x = tx * 40 + 20;
  g.y = ty * 40 + 20;
  g.torch = torch;
  g.facing = facing ?? torch;
  g.mode = mode;
  g.wait = 0;
  g.node = 1;
  g.suspectFacing = torch;
}

/** Aims a camera by hand (the sweep is frozen for the shot). */
function putCamera(c, angle) {
  c.angle = angle;
  c.deadFor = 0;
}

/**
 * Builds a named scene. Returns a short caption for logging.
 *   start   — the cover: floor one mid-crossing, both lamps and both lenses live, all kit in view.
 *   loot    — a gem mid-lift with the belt and the take on the HUD.
 *   alarm   — floor three with the meter in ALARM and a guard walking you down.
 *   getaway — floor one stripped, the green door open, the thief one step from out.
 */
export function stageShot(game, name) {
  if (name === 'title') {
    game.state = 'title';
    game.time = 0.4;
    game.totalTake = 0;
    game.clockLabel = clockLabel(TUNING.clock);
    return 'title';
  }

  if (name === 'loot') {
    const level = stage(game, 1, 214, 4200);
    game.player.x = level.loot[1].x - 26;
    game.player.y = level.loot[1].y + 12;
    game.player.facing = -0.4;
    level.loot[1].grab = 0.75;
    level.loot[0].taken = true;
    game.lootTaken = 1;
    putGuard(game.guards[0], 8, 4, 0.5);
    putGuard(game.guards[1], 19, 13, -1.9);
    putGuard(game.guards[2], 27, 8, 2.9);
    putCamera(game.cameras[0], 1.9);
    putCamera(game.cameras[1], 0.35);
    putCamera(game.cameras[2], 3.0);
    game.alarm.value = 22;
    game.alarmTier = tierOf(22);
    game.alarm.grace = 0.3;
    dropSmoke(game.smokes, 20 * 40 + 20, 11 * 40 + 20).age = 1.1;
    game.belt.smoke = 1;
    game.objective = 'GRAB EVERY GEM';
    return 'loot';
  }

  if (name === 'alarm') {
    const level = stage(game, 2, 141, 2200);
    game.player.x = 20 * 40 + 20;
    game.player.y = 13 * 40 + 20;
    game.player.facing = -0.9;
    level.loot[0].taken = true;
    game.lootTaken = 1;
    putGuard(game.guards[0], 22, 6, 2.6);
    putGuard(game.guards[1], 9, 11, 0.6);
    putGuard(game.guards[2], 17, 15, -1.2, 'chase');
    putGuard(game.guards[3], 16, 11, 0.2);
    putCamera(game.cameras[0], 1.85);
    putCamera(game.cameras[1], 0.15);
    putCamera(game.cameras[2], 3.1);
    game.alarm.value = 78;
    game.alarmTier = tierOf(78);
    game.alarm.seen = true;
    game.alarm.seenByGuards = 1;
    game.alarm.grace = 1;
    game.empFlash = 0;
    game.belt.emp = 1;
    game.armedTool = 'emp';
    game.aim = { x: 27 * 40 + 20, y: 5 * 40 + 20 };
    game.objective = 'REACH THE GREEN GETAWAY';
    return 'alarm';
  }

  if (name === 'getaway') {
    const level = stage(game, 0, 96, 6000);
    for (const l of level.loot) l.taken = true;
    game.lootTaken = level.loot.length;
    game.player.x = 28 * 40 + 20;
    game.player.y = 3 * 40 + 20;
    game.player.facing = -1.6;
    game.player.carrying = 2;
    putGuard(game.guards[0], 12, 8, 1.3);
    putGuard(game.guards[1], 25, 11, -2.2);
    putCamera(game.cameras[0], 3.0);
    putCamera(game.cameras[1], 0.4);
    game.alarm.value = 34;
    game.alarmTier = tierOf(34);
    game.objective = 'REACH THE GREEN GETAWAY';
    return 'getaway';
  }

  // 'start' and the default cover scene: the frame that has to carry every criterion at once.
  // The thief stands directly behind the crate that cuts the left lamp's cone; the far lamp points
  // back across the room, the wall lens sweeps violet over the middle, and both gems and the green
  // door are in shot with the full belt on the band.
  const level = stage(game, 0, 262, 0);
  game.player.x = 12 * 40 + 20;
  game.player.y = 12 * 40 + 20;
  game.player.facing = -0.15;
  game.player.carrying = 0;
  putGuard(game.guards[0], 6, 12, 0);
  putGuard(game.guards[1], 24, 8, 2.3);
  putCamera(game.cameras[0], 2.9);
  putCamera(game.cameras[1], -0.55);
  game.alarm.value = 44;
  game.alarmTier = tierOf(44);
  game.alarm.seen = false;
  game.alarm.grace = 0.4;
  game.armedTool = 'smoke';
  game.aim = { x: 15 * 40 + 20, y: 8 * 40 + 20 };
  return 'start';
}

/** Names the four required screenshots, in the order they are written. */
export const SHOT_NAMES = [
  { file: '1-cover.png', scene: 'start', note: 'floor one mid-crossing: thief, two lamps, two lenses, loot, the getaway and the meter' },
  { file: '2-loot.png', scene: 'loot', note: 'a gem mid-lift on floor two, belt bill on the HUD' },
  { file: '3-alarm.jpg', scene: 'alarm', note: 'floor three in ALARM: a chasing guard, the EMP armed' },
  { file: '4-getaway.png', scene: 'getaway', note: 'floor one stripped: the green door open, the thief one step out' },
];

/** Whether a scene name is one this file knows. */
export function isShot(name) {
  return SHOT_NAMES.some((s) => s.scene === name) || name === 'title';
}
