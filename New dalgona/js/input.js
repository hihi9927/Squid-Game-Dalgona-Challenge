// ============================================================
// input.js — 마우스/터치 입력 처리
// ============================================================

const Input = (() => {
  function init() {
    const canvas = Renderer.getInputCanvas();

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      Renderer.setMouse(
        (e.clientX - rect.left) * sx,
        (e.clientY - rect.top) * sy
      );
    });

    canvas.addEventListener('mousedown', (e) => {
      if (Game.getState() !== 'playing') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * sx;
      const cy = (e.clientY - rect.top) * sy;
      handleClick(cx, cy);
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (Game.getState() !== 'playing') return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const cx = (t.clientX - rect.left) * sx;
      const cy = (t.clientY - rect.top) * sy;
      Renderer.setMouse(cx, cy);
      handleClick(cx, cy);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      Renderer.setMouse(
        (t.clientX - rect.left) * sx,
        (t.clientY - rect.top) * sy
      );
    }, { passive: false });
  }

  function handleClick(canvasX, canvasY) {
    const gx = Math.floor(canvasX / CFG.CELL);
    const gy = Math.floor(canvasY / CFG.CELL);
    Crack.applyClick(gx, gy);
    Game.checkConditions();
  }

  return { init };
})();
