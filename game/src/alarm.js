// alarm.js — the meter the whole run hangs on. Guards' lamps raise it faster than cameras; it only
// falls after a short grace period with nobody looking; and it is split into four named tiers so
// the player can read how much room is left. One job: the alarm's number and its name.

export const TIERS = [
  { at: 0, name: 'CALM', tint: '#5ee0a0' },
  { at: 30, name: 'SUSPICIOUS', tint: '#ffd25c' },
  { at: 62, name: 'ALARM', tint: '#ff9d3c' },
  { at: 100, name: 'LOCKDOWN', tint: '#ff4d4d' },
];

export function createAlarm() {
  return {
    value: 0,
    seen: false,
    seenByGuards: 0,
    seenByCameras: 0,
    grace: 0,
    pulse: 0,
    peakTier: 0,
  };
}

/** The tier a value falls in. */
export function tierOf(value) {
  let t = TIERS[0];
  for (const cand of TIERS) if (value >= cand.at) t = cand;
  return t;
}

/**
 * Advances the meter. `sources` is { guards, cameras } — how many lamps and lenses have the thief
 * in view this frame. Being seen pushes it up hard; being unseen lets it drain only once the grace
 * period has passed, so ducking behind a crate buys time rather than a clean slate.
 */
export function updateAlarm(alarm, dt, sources, tuning) {
  const guards = sources.guards;
  const cameras = sources.cameras;
  alarm.seenByGuards = guards;
  alarm.seenByCameras = cameras;
  alarm.seen = guards + cameras > 0;
  if (alarm.seen) {
    alarm.grace = tuning.alarmGrace;
    const rate = guards > 0 ? tuning.alarmGuardRate * (1 + 0.35 * (guards - 1)) : tuning.alarmCameraRate;
    alarm.value = Math.min(100, alarm.value + rate * dt);
    alarm.pulse = Math.min(1, alarm.pulse + dt * 4);
  } else if (alarm.grace > 0) {
    alarm.grace = Math.max(0, alarm.grace - dt);
    alarm.pulse = Math.max(0, alarm.pulse - dt * 2);
  } else {
    alarm.value = Math.max(0, alarm.value - tuning.alarmDecay * dt);
    alarm.pulse = Math.max(0, alarm.pulse - dt * 2);
  }
  alarm.peakTier = Math.max(alarm.peakTier, TIERS.indexOf(tierOf(alarm.value)));
  return alarm.value;
}
