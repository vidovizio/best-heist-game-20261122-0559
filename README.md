# GILDED AVIARY — a midnight heist in three floors
[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/vidovizio/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/vidovizio/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down heist played with keyboard and mouse in desktop Chrome. You are a thief crossing three
floors of a private collection at midnight: read the guards' swinging lamp cones and the wall
cameras' violet sweeps, use the crates as cover, lift the gold (a silver egg, a moon pearl, a
sapphire key, and finally the gilded aviary itself), then walk out through the green getaway door
before the clock runs out. Get seen and the alarm meter climbs and a guard comes to look; fill it
and the chase is on and you lose a life. Three floors, three lives, five minutes.

No build step, no library, no network: plain ES modules and a 2D canvas, every pixel drawn in code
and every sound synthesised with WebAudio.

Controls: WASD / arrows move · Shift creep · E or click a gem to lift it · 1-4 arm a tool then
click to place it · P pause · M mute.

## Run it

```
node serve.ts
```

Then open http://localhost:8080 (pass `--port 9000` to serve elsewhere). Any static file server
works too — `npx --yes serve game` — as long as it serves `game/` as the root.

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory, checks them against the gate's
caps, and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

## Layout

| path | job |
| --- | --- |
| `game/src/config.js` | every floor's tiles, guards, cameras, gates and the tuning numbers |
| `game/src/level.js` | builds a floor from its definition; walls, cover, line of sight, gates |
| `game/src/vision.js` | one question: can this point see that point, through walls and smoke |
| `game/src/guard.js` | patrol routes, lamp swing, suspicion and the chase |
| `game/src/camera.js` | wall cameras: fixed mount, sweeping cone, EMP downtime |
| `game/src/player.js` | the thief's body, speed, creep and grab reach |
| `game/src/tools.js` | the four belt items and what each one costs |
| `game/src/alarm.js` | the alarm meter's tiers: calm, suspicious, alarm, chase |
| `game/src/audio.js` | WebAudio cues, all synthesised, no files |
| `game/src/render.js` | the room: cover, light cones, loot, exit, the thief |
| `game/src/hud.js` | the belt, the alarm meter, floor cards, title and end cards |
| `game/src/input.js` | keys and mouse, normalised for the loop |
| `game/src/shots.js` | deterministic screenshot scenes (`?shot=start|loot|alarm|getaway`) |
| `game/src/main.js` | the browser entry: canvas, fixed-step loop, screen switching |

<sub>Entered on [make.fun](https://make.fun/?ref=ynfr7a93&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
