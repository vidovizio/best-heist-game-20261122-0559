// main.ts — hands GILDED AVIARY in (Node 22, standard library only).
//
// The game itself is game/: plain static files a desktop browser loads offline (index.html plus
// ES modules, no library and no network request). This program does three things, in order:
//   1. copy game/ and screenshots/ from beside this file into the output directory;
//   2. refuse to write a half-broken entry: the output is checked against the gate's own caps
//      (screenshot count, image bytes, game file count and bytes, path length) and a screenshot
//      that breaks one stops the run with the reason, instead of being handed in silently;
//   3. write dossier.json with the kit's vendored buildDossier, the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The gate's caps for this bounty (kit reference/gate.json). */
const CAPS = {
  text_max_bytes: 163840, // 160 KiB of source text inside the dossier
  screenshots: { max: 4, max_bytes: 262144, long_side: 1280, short_side: 480 }, // 256 KiB each
  game_max_files: 993,
  game_max_bytes: 50331648, // 48 MiB
  game_path_max_bytes: 1000,
  dossier_max_bytes: 1572864, // 1.5 MiB
} as const;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSrc = join(here, 'game');
const shotsSrc = join(here, 'screenshots');

if (!existsSync(join(gameSrc, 'index.html'))) {
  throw new Error(`main.ts: no game/index.html beside ${here} — nothing to hand in`);
}

// Refuse a broken entry before touching the output: nothing half-written is ever handed in.
checkTrees(gameSrc, shotsSrc);

// The output may hold a previous run's files (the grader starts clean, a local rerun may not);
// clear the two trees this program owns so the bytes depend only on the repository.
mkdirSync(out, { recursive: true });
for (const name of ['game', 'screenshots']) rmSync(join(out, name), { recursive: true, force: true });

// Nothing below the cap check should change a file's size or name; measuring again is cheap and
// proves the copy, not just the source, is what the scorer will read.
cpSync(gameSrc, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });
const copy = checkTrees(join(out, 'game'), join(out, 'screenshots'));

/** Reads an image's pixel size from its own header: PNG's IHDR, or JPEG's first SOFn frame. */
function imageSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length > 24 && buf.toString('latin1', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15, skipping DHT (0xc4), JPG (0xc8) and DAC (0xcc), which are not frames.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/**
 * Fails the run when a game tree or screenshot folder breaks a cap the scorer checks.
 * Called twice: on the repository's own trees before anything is written (a broken entry is
 * refused with nothing left on disk), then on what was actually written.
 */
function checkTrees(gameDir: string, shotsDir: string): { files: number; bytes: number; shots: string[] } {
  let files = 0;
  let bytes = 0;
  const walk = (dir: string, root: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = full.slice(root.length + 1);
      if (Buffer.byteLength(rel) > CAPS.game_path_max_bytes) {
        throw new Error(`game/ path over ${CAPS.game_path_max_bytes} bytes: ${rel}`);
      }
      if (entry.isDirectory()) {
        walk(full, root);
        continue;
      }
      files += 1;
      bytes += statSync(full).size;
    }
  };
  walk(gameDir, gameDir);
  if (files > CAPS.game_max_files) throw new Error(`game/ holds ${files} files, cap ${CAPS.game_max_files}`);
  if (bytes > CAPS.game_max_bytes) throw new Error(`game/ is ${bytes} bytes, cap ${CAPS.game_max_bytes}`);

  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir)
        .filter((n) => !n.startsWith('.'))
        .filter((n) => statSync(join(shotsDir, n)).isFile())
        .sort()
    : [];
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`screenshots/ holds ${shots.length}, the gate takes 3 to ${CAPS.screenshots.max}`);
  }
  for (const name of shots) {
    const buf = readFileSync(join(shotsDir, name));
    if (buf.length > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${buf.length} bytes, cap ${CAPS.screenshots.max_bytes}`);
    }
    const size = imageSize(buf);
    if (!size) throw new Error(`screenshot ${name} is not a PNG or JPEG this program can measure`);
    const long = Math.max(size.w, size.h);
    const short = Math.min(size.w, size.h);
    if (long > CAPS.screenshots.long_side || short < CAPS.screenshots.short_side) {
      throw new Error(
        `screenshot ${name} is ${size.w}x${size.h}; the gate wants long side <= ` +
          `${CAPS.screenshots.long_side} and short side >= ${CAPS.screenshots.short_side}`,
      );
    }
  }
  return { files, bytes, shots };
}

// Refuse a broken entry before touching the output: no half-written hand-in, ever.
checkTrees(gameSrc, shotsSrc);

const dossier = buildDossier(out, CAPS);
if (dossier.byteLength > CAPS.dossier_max_bytes) {
  throw new Error(`dossier.json is ${dossier.byteLength} bytes, cap ${CAPS.dossier_max_bytes}`);
}
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(
  `gilded-aviary: game/ ${copy.files} entries, ${copy.bytes} bytes; ` +
    `screenshots ${copy.shots.length} (${copy.shots.join(', ')}); dossier.json written`,
);
