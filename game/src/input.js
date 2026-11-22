// input.js — keyboard and mouse, read once per frame into a plain object the game can use, plus the
// title-screen keys and the mouse position the tools aim at. One job: turn the browser's events
// into this frame's intent.

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  const onKeyDown = (e) => {
    if (e.repeat) return;
    if (MOVE_KEYS[e.code] || e.code === 'Space' || e.code.startsWith('Digit')) e.preventDefault();
    held.add(e.code);
    pressed.add(e.code);
  };
  const onKeyUp = (e) => held.delete(e.code);
  const onBlur = () => held.clear();

  const toWorld = (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * sx;
    mouse.y = (e.clientY - rect.top) * sy;
  };
  const onMove = (e) => toWorld(e);
  const onDown = (e) => {
    toWorld(e);
    mouse.down = true;
    mouse.clicked = true;
    pressed.add('Mouse');
  };
  const onUp = () => { mouse.down = false; };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);

  return {
    mouse,
    /** This frame's movement intent, normalised components (-1..1 each), and the creep key. */
    read() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const k = MOVE_KEYS[code];
        if (k) { x += k[0]; y += k[1]; }
      }
      return { x, y, sneak: held.has('ShiftLeft') || held.has('ShiftRight') };
    },
    /** Whether a key (or 'Mouse') went down since the last call. */
    took(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    /** Whether a key is held right now. */
    isHeld(code) { return held.has(code); },
    /** The mouse's world position, the aim point for every thrown tool. */
    aim() { return { x: mouse.x, y: mouse.y }; },
    /** Clears the per-frame click flag; called at the end of a frame. */
    endFrame() { mouse.clicked = false; pressed.clear(); },
  };
}
