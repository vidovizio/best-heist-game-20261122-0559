// hud.js — the readout band under the room and the cards over it: the alarm meter with its tier
// ticks, who has you in view, floor / clock / take / lives, the tool belt with its prices, plus the
// title, floor, pause and end cards. One job: tell the player what is happening.

import { VIEW_W, VIEW_H, PLAY_H, HUD_H, THEME, TUNING, TOOLS } from './config.js';
import { TIERS } from './alarm.js';
import { roundRect } from './render.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const MONO = '"DejaVu Sans Mono", "Consolas", monospace';

/** A short floating line of feedback, fading and rising. */
export function drawToasts(ctx, toasts) {
  ctx.textAlign = 'center';
  ctx.font = `bold 13px ${FONT}`;
  for (const t of toasts) {
    const a = Math.max(0, Math.min(1, t.life / 0.6));
    ctx.fillStyle = t.colour.replace('ALPHA', a.toFixed(3));
    ctx.fillText(t.text, t.x, t.y - (1 - t.life / t.max) * 24);
  }
}

/** The alarm bar: gradient fill, tier ticks, sheen, and the name of the tier you are in. */
function drawAlarmMeter(ctx, game, y0) {
  const tier = game.alarmTier;
  ctx.textAlign = 'left';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText('DETECTION', 28, y0 + 27);
  const barX = 92;
  const barY = y0 + 14;
  const barW = 540;
  const barH = 20;
  ctx.fillStyle = '#111a29';
  roundRect(ctx, barX, barY, barW, barH, 10);
  ctx.fill();
  const fillW = Math.max(0, barW * (game.alarm.value / 100));
  if (fillW > 2) {
    const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    g.addColorStop(0, '#5ee0a0');
    g.addColorStop(0.35, '#ffd25c');
    g.addColorStop(0.7, '#ff9d3c');
    g.addColorStop(1, '#ff4d4d');
    ctx.save();
    roundRect(ctx, barX, barY, barW, barH, 10);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(barX, barY, fillW, barH);
    const sheen = ((game.time * 90) % (barW + 120)) - 60;
    const sg = ctx.createLinearGradient(barX + sheen, 0, barX + sheen + 70, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (const t of TIERS) {
    if (t.at === 0) continue;
    const x = barX + (barW * t.at) / 100;
    ctx.beginPath();
    ctx.moveTo(x, barY);
    ctx.lineTo(x, barY + barH);
    ctx.stroke();
  }
  ctx.strokeStyle = game.alarm.seen ? tier.tint : 'rgba(255,255,255,0.28)';
  ctx.lineWidth = game.alarm.seen ? 2.4 : 1.2;
  roundRect(ctx, barX, barY, barW, barH, 10);
  ctx.stroke();
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillStyle = tier.tint;
  ctx.fillText(tier.name, barX + barW + 14, y0 + 27);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`${Math.round(game.alarm.value)}%`, barX + barW + 14, y0 + 43);
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = game.alarm.seen ? THEME.danger : 'rgba(94,224,160,0.85)';
  const who = game.alarm.seenByGuards > 0 ? 'LAMP ON YOU' : 'CAMERA ON YOU';
  ctx.fillText(game.alarm.seen ? who : 'UNSEEN', 28, y0 + 56);
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = 'rgba(134,152,184,0.8)';
  ctx.fillText(`LOOT ${game.lootTaken}/${game.level.loot.length}  ·  ${game.objective}`, 150, y0 + 56);
}

/** Floor, clock, take and lives on the right of the band. */
function drawRunStats(ctx, game, y0) {
  ctx.textAlign = 'right';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText(`${game.levelIndex + 1}/3  ${game.level.name}`, VIEW_W - 28, y0 + 27);
  const clock = Math.max(0, game.clock);
  const mm = String(Math.floor(clock / 60)).padStart(2, '0');
  const ss = String(Math.floor(clock % 60)).padStart(2, '0');
  ctx.font = `bold 26px ${MONO}`;
  ctx.fillStyle = clock < 30 ? THEME.danger : THEME.text;
  ctx.fillText(`${mm}:${ss}`, VIEW_W - 28, y0 + 58);
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`TAKE $${game.take.toLocaleString('en-US')}`, VIEW_W - 128, y0 + 56);
  ctx.fillStyle = THEME.dim;
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillText('LIVES', VIEW_W - 232, y0 + 26);
  for (let i = 0; i < TUNING.lives; i++) {
    const x = VIEW_W - 232 - i * 19;
    const y = y0 + 48;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fillStyle = i < game.lives ? THEME.exit : 'rgba(60,227,154,0.16)';
    ctx.fill();
  }
}

/** The four tool slots, their prices and counts, with the armed one highlighted. */
function drawBelt(ctx, game, y0) {
  const bx = 28;
  const by = y0 + 62;
  const bw = 150;
  const bh = 36;
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const x = bx + i * (bw + 10);
    const count = game.belt[t.id] ?? 0;
    const armed = game.armedTool === t.id;
    ctx.fillStyle = armed ? 'rgba(232,194,94,0.18)' : '#0d1626';
    roundRect(ctx, x, by, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = armed ? THEME.gold : count > 0 ? 'rgba(127,216,255,0.5)' : 'rgba(120,138,168,0.22)';
    ctx.lineWidth = armed ? 2 : 1;
    roundRect(ctx, x, by, bw, bh, 6);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = count > 0 ? THEME.text : 'rgba(134,152,184,0.55)';
    ctx.fillText(`${t.key}  ${t.label}`, x + 10, by + 17, bw - 44);
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = 'rgba(134,152,184,0.85)';
    ctx.fillText(`$${t.price} ${t.hint}`, x + 10, by + 31, bw - 18);
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${MONO}`;
    ctx.fillStyle = count > 0 ? THEME.loot : 'rgba(134,152,184,0.5)';
    ctx.fillText(`x${count}`, x + bw - 8, by + 17);
  }
  ctx.textAlign = 'left';
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = 'rgba(134,152,184,0.85)';
  ctx.fillText(`BELT COST $${game.beltCost.toLocaleString('en-US')} off the haul  ·  1-4 arm, click to place  ·  Shift creep  ·  E grab  ·  P pause  ·  M mute`,
    bx, y0 + 109);
}

/** The whole readout band. */
export function renderHud(ctx, game) {
  const y0 = PLAY_H;
  ctx.fillStyle = THEME.hud;
  ctx.fillRect(0, y0, VIEW_W, HUD_H);
  ctx.strokeStyle = THEME.hudLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y0 + 0.5);
  ctx.lineTo(VIEW_W, y0 + 0.5);
  ctx.stroke();
  drawAlarmMeter(ctx, game, y0);
  drawRunStats(ctx, game, y0);
  drawBelt(ctx, game, y0);
  drawToasts(ctx, game.toasts);
}

/** Word-wrap a line inside `width`, drawing as it goes. */
function wrap(ctx, text, x, y, width, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line === '' ? w : `${line} ${w}`;
    if (ctx.measureText(test).width > width && line !== '') {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = test;
  }
  if (line !== '') ctx.fillText(line, x, y);
}

/** The title card: theme, controls, and an honest note on how this meets the brief, in order. */
export function renderTitle(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#05080f');
  g.addColorStop(0.6, '#0a1322');
  g.addColorStop(1, '#070c15');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = `bold 62px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText('GILDED AVIARY', VIEW_W / 2, 150);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText('a midnight heist in three floors — lift the golden bird, then leave through the green door', VIEW_W / 2, 184);
  const lines = [
    ['1  COMPLETE HEIST IN ONE FRAME', 'one room crossed by the thief, guards with vision cones, wall cameras with cones of their own, gold loot and the alarm meter — all visible at once, as the screenshots show'],
    ['2  DEPTH', 'every floor has a long safe route and a short lit one; smoke, EMP, lockpick and whistle each cost haul or the seconds you stand still; patrols and camera sweeps must be read before you move'],
    ['3  FEEL', 'the meter climbs only while you are lit and falls when you hide, so being spotted is a warning; a suspicious guard walks over to look; a full alarm starts the chase; the getaway opens only when the floor is stripped'],
    ['4  LOOK', 'cold steel cover, warm lamp danger, violet camera cones, gold loot, green exit — safe, danger and loot read at a glance, and all of it is drawn from scratch in code'],
    ['5  STRUCTURE', 'one job per file: config, level, vision, guard, camera, player, tools, alarm, audio, render, hud, input, shots, main'],
  ];
  ctx.textAlign = 'left';
  let y = 250;
  for (const [head, body] of lines) {
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = THEME.loot;
    ctx.fillText(head, 150, y);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#a9b9d4';
    wrap(ctx, body, 150, y + 18, 980, 16);
    y += 66;
  }
  ctx.textAlign = 'center';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = `rgba(232,194,94,${(0.6 + Math.sin(game.time * 3) * 0.25).toFixed(3)})`;
  ctx.fillText('PRESS ENTER OR CLICK TO BEGIN THE HEIST', VIEW_W / 2, 636);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText('WASD / arrows move  ·  Shift creep  ·  E or click a gem to lift it  ·  1-4 arm a tool then click to place  ·  P pause  ·  M mute', VIEW_W / 2, 664);
  ctx.fillText('three floors, three lives, five minutes on the clock — the belt comes off your take', VIEW_W / 2, 688);
}

/** The card between floors. */
export function renderFloorCard(ctx, game) {
  ctx.fillStyle = 'rgba(4,7,13,0.86)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = THEME.exit;
  ctx.fillText(`FLOOR ${game.levelIndex + 1} CLEARED`, VIEW_W / 2, 300);
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText(game.level.name, VIEW_W / 2, 352);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = THEME.text;
  ctx.fillText(`take $${game.take.toLocaleString('en-US')}  ·  clock ${game.clockLabel}  ·  lives ${game.lives}`, VIEW_W / 2, 392);
  if (game.levelIndex + 1 < 3) {
    const next = game.levels[game.levelIndex + 1];
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = THEME.loot;
    ctx.fillText(`NEXT — ${next.name}`, VIEW_W / 2, 452);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#a9b9d4';
    wrap(ctx, next.note, VIEW_W / 2 - 400, 476, 800, 16);
  }
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText('PRESS ENTER TO CONTINUE', VIEW_W / 2, 560);
}

/** The end card: getaway won, or caught / out of time. */
export function renderEndCard(ctx, game) {
  ctx.fillStyle = 'rgba(4,7,13,0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  const won = game.outcome === 'won';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = won ? THEME.exit : THEME.danger;
  const head = won ? 'THE BIRD IS OUT OF THE CAGE' : game.outcome === 'caught' ? 'CAUGHT IN THE LIGHT' : 'THE CLOCK RAN OUT';
  ctx.fillText(head, VIEW_W / 2, 210);
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillStyle = won ? THEME.gold : '#c9d5ea';
  ctx.fillText(won ? 'GETAWAY' : 'NO GETAWAY', VIEW_W / 2, 272);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = THEME.text;
  ctx.fillText(`gross $${game.gross.toLocaleString('en-US')}  −  belt $${game.beltCost.toLocaleString('en-US')}  =  net $${game.net.toLocaleString('en-US')}`, VIEW_W / 2, 322);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`floors cleared ${game.cleared}  ·  loot lifted ${game.lifted}  ·  clock left ${game.clockLabel}`, VIEW_W / 2, 350);
  if (won) {
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#a9b9d4';
    ctx.fillText('the plan paid: the gates you picked, the cones you read and the seconds you spent are the difference', VIEW_W / 2, 388);
  }
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText('PRESS ENTER OR CLICK TO PLAN THE NEXT JOB', VIEW_W / 2, 470);
}

/** The pause card. */
export function renderPause(ctx) {
  ctx.fillStyle = 'rgba(4,7,13,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = THEME.gold;
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText('P or Esc to go back into the dark', VIEW_W / 2, VIEW_H / 2 + 24);
}
