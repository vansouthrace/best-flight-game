// Ridge Runner: Alpine Mail Run — keyboard and mouse.
// One job: turn keys and the pointer into one control object the flight
// model reads: { pitch, bank, throttle } plus one-shot actions (start,
// restart, pause, mute).

export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    // Held state the game reads every frame.
    pitch: 0,
    bank: 0,
    throttle: 0.55,
    // Mouse steering: -1..1 across the canvas, 0 when the pointer is idle.
    mousePitch: 0,
    mouseBank: 0,
    mouseActive: false,
    // One-shot actions, consumed by the game loop and then cleared.
    startPressed: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
  };

  // Controls: arrows steer (up/down pitch, left/right bank), A/D bank too,
  // W/S work the throttle, the mouse steers when it moves, the wheel works
  // the throttle, Enter/Space/click starts, R restarts, P pauses, M mutes.

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') input.startPressed = true;
    if (event.code === 'KeyR') input.restartPressed = true;
    if (event.code === 'KeyP') input.pausePressed = true;
    if (event.code === 'KeyM') input.mutePressed = true;
    if (event.code === 'KeyW') input.throttle = Math.min(1, input.throttle + 0.05);
    if (event.code === 'KeyS') input.throttle = Math.max(0, input.throttle - 0.05);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    input.mouseBank = Math.max(-1, Math.min(1, (nx - 0.5) * 2.4));
    input.mousePitch = Math.max(-1, Math.min(1, (0.5 - ny) * 2.0));
    input.mouseActive = true;
  });
  canvas.addEventListener('pointerleave', () => {
    input.mouseActive = false;
    input.mouseBank = 0;
    input.mousePitch = 0;
  });
  canvas.addEventListener('pointerdown', () => {
    input.startPressed = true;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    input.throttle = Math.max(0, Math.min(1, input.throttle - Math.sign(event.deltaY) * 0.06));
  }, { passive: false });

  // Resolve held keys (and the mouse, when it moved recently) into the
  // stick position for this frame. Keyboard wins while a key is held.
  input.poll = function poll() {
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const up = keys.has('ArrowUp');
    const down = keys.has('ArrowDown');
    if (left || right || up || down) {
      input.bank = (right ? 1 : 0) - (left ? 1 : 0);
      input.pitch = (up ? 1 : 0) - (down ? 1 : 0);
    } else if (input.mouseActive) {
      input.bank = input.mouseBank;
      input.pitch = input.mousePitch;
    } else {
      input.bank = 0;
      input.pitch = 0;
    }
  };

  input.consume = function consume() {
    const actions = {
      start: input.startPressed,
      restart: input.restartPressed,
      pause: input.pausePressed,
      mute: input.mutePressed,
    };
    input.startPressed = false;
    input.restartPressed = false;
    input.pausePressed = false;
    input.mutePressed = false;
    return actions;
  };

  return input;
}
