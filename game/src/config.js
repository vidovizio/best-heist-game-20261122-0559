// config.js — the heist's design sheet: canvas geometry, the theme's colours, the tool belt's
// prices, the detection rates, and the three floors (walls, cover, patrol routes, camera sweeps,
// loot values, locked gates). Nothing here draws or decides anything: it is the data the rest of
// the game reads. One job: the numbers and the level plans.
//
// GILDED AVIARY — a midnight heist. You are a thief crossing three floors of a private collection
// to lift a mechanical bird made of gold. Every floor is one room you cross: guards walk their
// routes with lamp-lit vision cones, wall cameras sweep violet cones of their own, and the alarm
// meter in the bottom band climbs while you are lit and falls while you are hidden. Cover is cold
// blue steel, danger is warm lamp light, loot is gold: the room reads at a glance.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 17;
export const HUD_H = 120;
export const VIEW_W = TILE * COLS; // 1280
export const PLAY_H = TILE * ROWS; // 680
export const VIEW_H = PLAY_H + HUD_H; // 800

// The heist's palette. Cover and walls are cold steel; light is warm; loot is gold; the exit is green.
export const THEME = {
  ink: '#04070d',
  floorA: '#0b1220',
  floorB: '#0e1828',
  inlay: 'rgba(212,175,55,0.09)',
  wall: '#17243c',
  wallTop: '#2b4165',
  wallEdge: '#060a12',
  wallGold: 'rgba(212,175,55,0.26)',
  cover: '#1a2f4e',
  coverTop: '#3c6c9d',
  coverRim: '#7fd8ff',
  guard: '#ff6a4d',
  guardDark: '#5d1a0f',
  cam: '#b06bff',
  camHousing: '#241b3a',
  loot: '#ffd25c',
  lootDeep: '#a8750f',
  exit: '#3ce39a',
  text: '#e6eeff',
  dim: '#8698b8',
  gold: '#e8c25e',
  danger: '#ff4d4d',
  hud: '#070d18',
  hudLine: 'rgba(212,175,55,0.35)',
};

// How the thief, the light and the alarm behave. Tuned by hand, in pixels and seconds.
export const TUNING = {
  playerRadius: 11,
  playerSpeed: 168,
  playerSneakSpeed: 104,
  grabSeconds: 1.1,
  grabRadius: 30,
  guardVisionRange: 218,
  guardVisionHalf: 0.42, // radians each side of the lamp's centre line
  guardChaseSpeed: 190,
  guardSuspicionSpeed: 104,
  caughtRadius: 22,
  alarmGuardRate: 44,
  alarmCameraRate: 33,
  alarmDecay: 16,
  alarmGrace: 0.55,
  smokeSeconds: 5.5,
  smokeRadius: 76,
  empSeconds: 7,
  pickSeconds: 2.4,
  pickReach: 58,
  whistleRadius: 300,
  lives: 3,
  clock: 300,
};

// The tool belt: each tool costs haul (money off your take) and one of the few charges you carry.
// You cannot buy your way through a floor, only trade score for time or safety.
export const TOOLS = [
  { id: 'smoke', key: '1', label: 'SMOKE', price: 180, hint: 'blinds every cone' },
  { id: 'emp', key: '2', label: 'EMP', price: 420, hint: 'cameras dead 7s' },
  { id: 'pick', key: '3', label: 'LOCKPICK', price: 260, hint: 'stand still, open a gate' },
  { id: 'whistle', key: '4', label: 'WHISTLE', price: 60, hint: 'lure guards to a click' },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------------------------
// The three floors, 32 columns by 17 rows (rows 0 and 16, columns 0 and 31 are the building's
// shell). `solids` are walls (tall) and cover (chest-high steel: blocks feet and sight alike).
// Gates are carved into the plan and stay locked until picked: each is a short cut paid for with
// the seconds you stand still in the light. Loot values are the base take; the belt comes off it.
// ---------------------------------------------------------------------------------------------

const level1 = {
  name: 'THE GLASS ATRIUM',
  note: 'Two lamps, two wall cameras, one locked gate. The long way round the shell is free; the gate is fast.',
  spawn: [2, 14],
  exit: [30, 1],
  loadout: { smoke: 2, emp: 1, pick: 1, whistle: 2 },
  solids: [
    { x: 15, y: 1, w: 1, h: 8, kind: 'wall' },
    { x: 15, y: 11, w: 1, h: 4, kind: 'wall' },
    { x: 3, y: 4, w: 2, h: 2, kind: 'cover' },
    { x: 9, y: 3, w: 2, h: 2, kind: 'cover' },
    { x: 5, y: 8, w: 2, h: 2, kind: 'cover' },
    { x: 9, y: 11, w: 2, h: 2, kind: 'cover' },
    { x: 4, y: 13, w: 2, h: 2, kind: 'cover' },
    { x: 20, y: 2, w: 2, h: 2, kind: 'cover' },
    { x: 25, y: 5, w: 2, h: 2, kind: 'cover' },
    { x: 27, y: 9, w: 2, h: 2, kind: 'cover' },
    { x: 19, y: 10, w: 2, h: 2, kind: 'cover' },
    { x: 23, y: 13, w: 3, h: 2, kind: 'cover' },
    { x: 19, y: 6, w: 4, h: 1, kind: 'wall' },
  ],
  gates: [{ x: 15, y: 9, w: 1, h: 2, axis: 'v', name: 'ATRIUM GATE' }],
  loot: [
    { x: 4, y: 6, value: 2600, name: 'SILVER EGG' },
    { x: 27, y: 12, value: 3400, name: 'GILDED AVIARY' },
  ],
  guards: [
    { path: [[11, 2], [11, 7], [7, 7], [7, 14], [12, 14]], speed: 56, pause: 0.9 },
    { path: [[20, 4], [28, 4], [28, 7], [22, 7], [22, 12], [28, 12]], speed: 62, pause: 1.1 },
  ],
  cameras: [
    { x: 14, y: 5, angle: Math.PI, sweep: 0.5, period: 7.4, phase: 0.4, range: 300 },
    { x: 16, y: 10, angle: 0, sweep: 0.45, period: 6.2, phase: 1.8, range: 290 },
  ],
};

const level2 = {
  name: 'THE MARBLE GALLERY',
  note: 'Three lamps, three cameras. The gallery wall splits the floor: one narrow gap, one picked service gate.',
  spawn: [2, 2],
  exit: [30, 15],
  loadout: { smoke: 2, emp: 1, pick: 1, whistle: 3 },
  solids: [
    { x: 1, y: 7, w: 11, h: 1, kind: 'wall' },
    { x: 14, y: 7, w: 17, h: 1, kind: 'wall' },
    { x: 24, y: 11, w: 1, h: 4, kind: 'wall' },
    { x: 4, y: 2, w: 2, h: 2, kind: 'cover' },
    { x: 10, y: 2, w: 2, h: 2, kind: 'cover' },
    { x: 17, y: 2, w: 2, h: 2, kind: 'cover' },
    { x: 22, y: 3, w: 2, h: 2, kind: 'cover' },
    { x: 27, y: 4, w: 2, h: 2, kind: 'cover' },
    { x: 4, y: 10, w: 2, h: 2, kind: 'cover' },
    { x: 9, y: 12, w: 2, h: 2, kind: 'cover' },
    { x: 15, y: 10, w: 2, h: 2, kind: 'cover' },
    { x: 18, y: 13, w: 3, h: 2, kind: 'cover' },
    { x: 27, y: 12, w: 2, h: 2, kind: 'cover' },
    { x: 11, y: 15, w: 2, h: 1, kind: 'cover' },
  ],
  gates: [{ x: 24, y: 7, w: 1, h: 1, axis: 'h', name: 'SERVICE GATE' }],
  loot: [
    { x: 6, y: 11, value: 1800, name: 'JADE COMET' },
    { x: 16, y: 4, value: 2400, name: 'ONYX CROWN' },
    { x: 29, y: 9, value: 3400, name: 'MOON PEARL' },
  ],
  guards: [
    { path: [[3, 4], [9, 4], [9, 5], [3, 5]], speed: 62, pause: 0.8 },
    { path: [[13, 9], [22, 9], [22, 15], [13, 15]], speed: 66, pause: 0.9 },
    { path: [[26, 9], [29, 9], [29, 15], [21, 15], [21, 12]], speed: 70, pause: 0.8 },
  ],
  cameras: [
    { x: 13, y: 7, angle: Math.PI / 2, sweep: 0.55, period: 6.8, phase: 0.2, range: 300 },
    { x: 21, y: 8, angle: 0, sweep: 0.6, period: 5.9, phase: 2.1, range: 300 },
    { x: 30, y: 8, angle: Math.PI, sweep: 0.35, period: 7.7, phase: 1.1, range: 280 },
  ],
};

const level3 = {
  name: 'THE VAULT CAGE',
  note: 'Four lamps, three cameras, the bird behind steel. Both gates are locked: shorten the run or lose the clock.',
  spawn: [2, 14],
  exit: [30, 1],
  loadout: { smoke: 2, emp: 2, pick: 2, whistle: 2 },
  solids: [
    { x: 18, y: 1, w: 1, h: 6, kind: 'wall' },
    { x: 18, y: 9, w: 1, h: 6, kind: 'wall' },
    { x: 26, y: 4, w: 1, h: 8, kind: 'wall' },
    { x: 19, y: 4, w: 3, h: 1, kind: 'wall' },
    { x: 24, y: 11, w: 2, h: 1, kind: 'wall' },
    { x: 5, y: 3, w: 2, h: 2, kind: 'cover' },
    { x: 10, y: 5, w: 2, h: 2, kind: 'cover' },
    { x: 4, y: 10, w: 2, h: 2, kind: 'cover' },
    { x: 9, y: 11, w: 2, h: 2, kind: 'cover' },
    { x: 8, y: 14, w: 3, h: 1, kind: 'cover' },
    { x: 14, y: 8, w: 1, h: 3, kind: 'cover' },
    { x: 21, y: 2, w: 2, h: 2, kind: 'cover' },
    { x: 22, y: 8, w: 2, h: 2, kind: 'cover' },
    { x: 29, y: 12, w: 1, h: 2, kind: 'cover' },
    { x: 20, y: 14, w: 3, h: 1, kind: 'cover' },
  ],
  gates: [
    { x: 18, y: 7, w: 1, h: 2, axis: 'v', name: 'VAULT WEST GATE' },
    { x: 26, y: 7, w: 1, h: 1, axis: 'v', name: 'CAGE EAST GATE' },
  ],
  loot: [
    { x: 5, y: 6, value: 2200, name: 'SAPPHIRE KEY' },
    { x: 28, y: 9, value: 7000, name: 'GOLDEN AVIARY' },
  ],
  guards: [
    { path: [[20, 6], [25, 6], [25, 10], [20, 10]], speed: 68, pause: 0.7 },
    { path: [[3, 6], [3, 13], [12, 13], [12, 7]], speed: 64, pause: 0.9 },
    { path: [[19, 15], [27, 15], [27, 13], [19, 13]], speed: 74, pause: 0.7 },
    { path: [[20, 10], [22, 10], [22, 12], [20, 12]], speed: 52, pause: 0.6 },
  ],
  cameras: [
    { x: 27, y: 3, angle: Math.PI / 2, sweep: 0.5, period: 5.4, phase: 0.9, range: 280 },
    { x: 12, y: 5, angle: 0, sweep: 0.5, period: 6.6, phase: 1.2, range: 280 },
    { x: 15, y: 2, angle: Math.PI / 2, sweep: 0.55, period: 7.2, phase: 2.6, range: 300 },
  ],
};

export const LEVELS = [level1, level2, level3];
