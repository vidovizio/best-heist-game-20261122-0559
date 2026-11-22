// game.js — the run itself: builds the state for a floor, advances it one tick (thief, lamps,
// lenses, alarm, loot, locks, tools, capture, getaway) and decides when a floor or the whole job is
// over. One job: the rules. It draws nothing and reads no DOM, so the same code runs in the browser
// and in a plain-node simulation.

import { TUNING, LEVELS, TOOL_BY_ID } from './config.js';
import { buildLevel, gateNear, openGate } from './level.js';
import { createAlarm, tierOf } from './alarm.js';
import { createGuard, updateGuard, beckonGuard, GUARD_PATROL } from './guard.js';
import { createCamera, updateCamera, empCameras } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';
import { createBelt, beltCost, dropSmoke, ageSmoke, beginPick, updatePick } from './tools.js';
import { updateAlarm } from './alarm.js';


/** A fresh run: lives, clock, haul and no floor loaded yet. */
export function createGame() {
  return {
    state: 'title', // title | playing | floorcard | end
    time: 0,
    levelIndex: 0,
    level: null,
    levels: LEVELS,
    player: null,
    guards: [],
    cameras: [],
    alarm: createAlarm(),
    alarmTier: tierOf(0),
    belt: {},
    startBelt: {},
    beltCost: 0,
    beltAccrued: 0,
    take: 0,
    gross: 0,
    net: 0,
    lives: TUNING.lives,
    clock: TUNING.clock,
    clockLabel: '05:00',
    cleared: 0,
    lifted: 0,
    lootTaken: 0,
    objective: '',
    smokes: [],
    whistles: [],
    pick: { gate: null, time: 0, x: 0, y: 0 },
    armedTool: null,
    aim: { x: 0, y: 0 },
    toasts: [],
    empFlash: 0,
    outcome: null,
    paused: false,
    shotMode: false,
    exitHinted: false,
  };
}

/** Loads a floor fresh: level, actors, belt, spawn. */
export function startFloor(game, index) {
  const level = buildLevel(LEVELS[index], index);
  game.levelIndex = index;
  game.level = level;
  game.player = createPlayer(level.spawn);
  game.guards = level.guards.map((def, i) => createGuard(def, i));
  game.cameras = level.cameras.map((def, i) => createCamera(def, i));
  game.alarm = createAlarm();
  game.alarmTier = tierOf(game.alarm.value);
  game.belt = createBelt(level.loadout);
  game.startBelt = { ...game.belt };
  // The belt is charged per floor the moment it is issued: the bill is the whole run's kit.
  game.beltAccrued += beltCost(game.startBelt);
  game.beltCost = game.beltAccrued;
  game.smokes = [];
  game.whistles = [];
  game.pick = { gate: null, time: 0, x: 0, y: 0 };
  game.armedTool = null;
  game.lootTaken = 0;
  game.objective = 'GRAB EVERY GEM';
  game.state = 'playing';
}

/** Starts a brand-new job from the title card. */
export function startJob(game) {
  game.lives = TUNING.lives;
  game.clock = TUNING.clock;
  game.take = 0;
  game.gross = 0;
  game.net = 0;
  game.beltAccrued = 0;
  game.cleared = 0;
  game.lifted = 0;
  game.outcome = null;
  game.toasts = [];
  startFloor(game, 0);
}

/** A short line of feedback floating up from a point. */
export function toast(game, text, colour, x, y) {
  game.toasts.push({
    text,
    colour,
    x: x ?? game.player?.x ?? 640,
    y: y ?? (game.player?.y ?? 300) - 26,
    life: 1.4,
    max: 1.4,
  });
  if (game.toasts.length > 6) game.toasts.shift();
}

/** Fires a tool at the aim point. Returns whether it went off. */
export function useTool(game, id, aim, audio) {
  const tool = TOOL_BY_ID[id];
  if (!tool) return false;
  if ((game.belt[id] ?? 0) <= 0) {
    toast(game, `NO ${tool.label} LEFT`, 'rgba(255,77,77,ALPHA)', aim.x, aim.y - 18);
    audio?.play('deny');
    return false;
  }
  if (id === 'smoke') {
    game.belt.smoke -= 1;
    dropSmoke(game.smokes, aim.x, aim.y);
    toast(game, 'SMOKE', 'rgba(200,214,235,ALPHA)', aim.x, aim.y - 20);
    audio?.play('smoke');
  } else if (id === 'emp') {
    game.belt.emp -= 1;
    empCameras(game.cameras);
    game.empFlash = 1;
    toast(game, 'LENSES DEAD', 'rgba(190,150,255,ALPHA)', aim.x, aim.y - 20);
    audio?.play('emp');
  } else if (id === 'whistle') {
    game.belt.whistle -= 1;
    game.whistles.push({ x: aim.x, y: aim.y, life: 0.9, max: 0.9 });
    let called = 0;
    for (const g of game.guards) {
      if (Math.hypot(g.x - aim.x, g.y - aim.y) < TUNING.whistleRadius) { beckonGuard(g, aim.x, aim.y); called++; }
    }
    toast(game, called ? 'GUARD DRAWN' : 'NOBODY HEARD', 'rgba(255,240,170,ALPHA)', aim.x, aim.y - 20);
    audio?.play('whistle');
  } else if (id === 'pick') {
    // The lockpick is not thrown: it is armed and used by standing still at a gate.
    toast(game, 'STAND AT A GATE', 'rgba(232,194,94,ALPHA)');
    return true;
  }
  game.armedTool = null;
  return true;
}

/** Recomputes the one-line objective shown in the HUD. */
function refreshObjective(game) {
  const all = game.level.loot.every((l) => l.taken);
  game.objective = all ? 'REACH THE GREEN GETAWAY' : 'GRAB EVERY GEM';
}

/** Applies a capture: lose a life, reset the floor's heat, put the thief back at the spawn. */
function loseLife(game, audio) {
  game.lives -= 1;
  game.alarm.value = 55;
  game.alarm.grace = 1.2;
  game.player.x = game.level.spawn.x;
  game.player.y = game.level.spawn.y;
  game.player.carrying = 0;
  game.smokes = [];
  game.pick = { gate: null, time: 0, x: 0, y: 0 };
  for (let i = 0; i < game.guards.length; i++) {
    const fresh = createGuard(game.level.guards[i], i);
    fresh.mode = GUARD_PATROL;
    game.guards[i] = fresh;
  }
  audio?.play('caught');
  toast(game, game.lives > 0 ? `CAUGHT — ${game.lives} LEFT` : 'CAUGHT', 'rgba(255,77,77,ALPHA)');
  if (game.lives <= 0) {
    game.state = 'end';
    game.outcome = 'caught';
    finalise(game);
  }
}

/** Closes the books: gross haul, belt bill, net. */
function finalise(game) {
  game.gross = game.take;
  game.beltCost = game.beltAccrued;
  game.net = Math.max(0, game.gross - game.beltCost);
  game.clockLabel = clockLabel(game.clock);
}

export function clockLabel(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * One tick of the run. `intent` is {x,y,sneak} from the keyboard, `actions` is
 * { arm, click, aim, grab } from the input layer, all optional (a simulation can drive it).
 */
export function updateGame(game, dt, intent, actions, audio) {
  if (game.state !== 'playing' || game.paused) return;
  game.time += dt;
  game.clock -= dt;
  game.clockLabel = clockLabel(game.clock);
  game.empFlash = Math.max(0, game.empFlash - dt * 2.2);
  if (game.clock <= 0) {
    game.state = 'end';
    game.outcome = 'timeout';
    finalise(game);
    return;
  }

  // ---- the thief
  const moved = updatePlayer(game.player, intent, game.level, dt);

  // ---- whistles and smoke age out
  for (let i = game.whistles.length - 1; i >= 0; i--) {
    game.whistles[i].life -= dt;
    if (game.whistles[i].life <= 0) game.whistles.splice(i, 1);
  }
  ageSmoke(game.smokes, dt);

  // ---- who has the thief lit
  const ctx = {
    level: game.level,
    player: game.player,
    smokes: game.smokes,
    alarmValue: game.alarm.value,
    time: game.time,
  };
  let guardSees = 0;
  let camSees = 0;
  for (const g of game.guards) {
    const r = updateGuard(g, dt, ctx);
    if (r.sees) guardSees += 1;
  }
  for (const c of game.cameras) {
    const r = updateCamera(c, dt, ctx);
    if (r.sees) camSees += 1;
  }
  updateAlarm(game.alarm, dt, { guards: guardSees, cameras: camSees }, TUNING);
  const before = game.alarmTier;
  game.alarmTier = tierOf(game.alarm.value);
  if (before.name !== 'LOCKDOWN' && game.alarmTier.name === 'LOCKDOWN') {
    audio?.play('alarm');
    toast(game, 'LOCKDOWN — RUN', 'rgba(255,77,77,ALPHA)');
  }
  audio?.setTension(game.alarm.value / 100);

  // ---- lifting loot: hold E (or the mouse) beside a gem
  const grabIntent = actions?.grab;
  let nearest = null;
  let nearestD = TUNING.grabRadius;
  for (const l of game.level.loot) {
    if (l.taken) continue;
    const d = Math.hypot(l.x - game.player.x, l.y - game.player.y);
    if (d < nearestD) { nearestD = d; nearest = l; }
  }
  for (const l of game.level.loot) {
    if (l.taken) continue;
    if (l === nearest && grabIntent) {
      l.grab += dt;
      if (l.grab >= TUNING.grabSeconds) {
        l.taken = true;
        l.grab = 0;
        game.take += l.value;
        game.lifted += 1;
        game.lootTaken += 1;
        game.player.carrying += 1;
        audio?.play('loot');
        toast(game, `+$${l.value.toLocaleString('en-US')}  ${l.name}`, 'rgba(255,210,92,ALPHA)', l.x, l.y - 26);
        refreshObjective(game);
      }
    } else if (l.grab > 0) {
      l.grab = Math.max(0, l.grab - dt * 1.6);
    }
  }

  // ---- the lockpick: armed, still, at a locked gate
  if (game.armedTool === 'pick' && !moved) {
    if (!game.pick.gate) {
      const gate = gateNear(game.level, game.player.x, game.player.y, TUNING.pickReach);
      if (gate) {
        if ((game.belt.pick ?? 0) > 0) beginPick(game.pick, gate, game.player);
        else toast(game, 'NO LOCKPICKS LEFT', 'rgba(255,77,77,ALPHA)');
      }
    }
  }
  const pickState = updatePick(game.pick, dt, game.player, game.level, openGate);
  if (pickState === 'done') {
    game.belt.pick = Math.max(0, game.belt.pick - 1);
    toast(game, 'GATE OPEN', 'rgba(232,194,94,ALPHA)', game.player.x, game.player.y - 28);
    audio?.play('unlock');
  } else if (pickState === 'cancel') {
    toast(game, 'PICK CANCELLED', 'rgba(255,77,77,ALPHA)');
    audio?.play('deny');
  }

  // ---- tools on click
  if (actions?.click && game.armedTool) {
    useTool(game, game.armedTool, actions.aim || game.aim, audio);
  }

  // ---- a chasing guard's hand on your collar
  for (const g of game.guards) {
    if (g.mode === 'chase' && Math.hypot(g.x - game.player.x, g.y - game.player.y) < TUNING.caughtRadius) {
      loseLife(game, audio);
      return;
    }
  }

  // ---- the getaway
  const allTaken = game.level.loot.every((l) => l.taken);
  const atExit = Math.hypot(game.level.exit.x - game.player.x, game.level.exit.y - game.player.y) < 30;
  if (atExit) {
    if (allTaken) {
      game.cleared += 1;
      audio?.play('exit');
      finalise(game);
      if (game.levelIndex + 1 < LEVELS.length) {
        game.state = 'floorcard';
      } else {
        game.state = 'end';
        game.outcome = 'won';
      }
      return;
    }
    if (!game.exitHinted) {
      game.exitHinted = true;
      toast(game, 'GETAWAY SEALED — STRIP THE FLOOR', 'rgba(60,227,154,ALPHA)', game.level.exit.x, game.level.exit.y - 34);
      audio?.play('deny');
    }
  } else {
    game.exitHinted = false;
  }

  // ---- toasts fade
  for (let i = game.toasts.length - 1; i >= 0; i--) {
    game.toasts[i].life -= dt;
    if (game.toasts[i].life <= 0) game.toasts.splice(i, 1);
  }
}
