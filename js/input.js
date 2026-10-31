'use strict';
/* Keyboard + on-screen touch controls. Same bindings as the PS1 demo. */
export const Input = (() => {
  const keys = Object.create(null);
  const pressed = Object.create(null);
  let stickX = 0, stickY = 0;
  let touchAttack = false, touchBlock = false;
  let attackTap = false, blockTap = false;
  let pauseTap = false;
  let landscapeLocked = false;

  const MOVE = {
    KeyW: [0, -1], ArrowUp: [0, -1],
    KeyS: [0, 1], ArrowDown: [0, 1],
    KeyA: [-1, 0], ArrowLeft: [-1, 0],
    KeyD: [1, 0], ArrowRight: [1, 0],
  };

  function onKey(e, down) {
    const k = e.code;
    if (MOVE[k] || k === 'KeyZ' || k === 'KeyJ' || k === 'KeyX' || k === 'KeyK' || k === 'KeyP' || k === 'Space' || k === 'Enter') {
      e.preventDefault();
    }
    if (down && !keys[k]) pressed[k] = true;
    keys[k] = down;
    if (down && k === 'KeyP') pauseTap = true;
  }
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));

  function moveAxis() {
    let x = stickX, y = stickY;
    for (const k in MOVE) {
      if (keys[k]) { x += MOVE[k][0]; y += MOVE[k][1]; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }
  function attackPressed() {
    const k = !!(pressed.KeyZ || pressed.KeyJ || attackTap);
    attackTap = false;
    return k || touchAttack;
  }
  function blockHeld() {
    return !!(keys.KeyX || keys.KeyK || touchBlock || blockTap);
  }
  function pausePressed() {
    const p = pauseTap;
    pauseTap = false;
    return p;
  }
  function endFrame() {
    for (const k in pressed) delete pressed[k];
    blockTap = false;
  }
  async function tryFullscreenLandscape() {
    if (landscapeLocked) return;
    landscapeLocked = true;
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (_) {}
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (_) {}
  }
  function bindTouch(root) {
    const zone = root.querySelector('.stick-zone');
    const knob = root.querySelector('.stick-knob');
    const atk = root.querySelector('#btn-attack');
    const blk = root.querySelector('#btn-block');
    let active = null, cx = 0, cy = 0, maxR = 44;

    function setStick(clientX, clientY) {
      let dx = clientX - cx, dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
      stickX = dx / maxR; stickY = dy / maxR;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    function clearStick() {
      stickX = stickY = 0;
      knob.style.transform = 'translate(-50%,-50%)';
      active = null;
    }
    zone.addEventListener('pointerdown', e => {
      tryFullscreenLandscape();
      active = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      setStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== active) return;
      setStick(e.clientX, e.clientY);
    });
    zone.addEventListener('pointerup', clearStick);
    zone.addEventListener('pointercancel', clearStick);

    function bindBtn(el, setHeld, setTap) {
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        tryFullscreenLandscape();
        el.classList.add('held');
        el.setPointerCapture(e.pointerId);
        setHeld(true); setTap(true);
      });
      el.addEventListener('pointerup', () => { el.classList.remove('held'); setHeld(false); });
      el.addEventListener('pointercancel', () => { el.classList.remove('held'); setHeld(false); });
    }
    bindBtn(atk, v => touchAttack = v, () => attackTap = true);
    bindBtn(blk, v => touchBlock = v, () => blockTap = true);

    const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (coarse) root.classList.add('show');
    window.addEventListener('touchstart', () => root.classList.add('show'), { once: true, passive: true });
  }
  return { moveAxis, attackPressed, blockHeld, pausePressed, endFrame, bindTouch, tryFullscreenLandscape };
})();
