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
      const cx = (e.clientX - rect.left) * sx;
      const cy = (e.clientY - rect.top) * sy;
      Renderer.setMouse(cx, cy);
      // 핥기 모드: 드래그 중 복구
      if (Game.getState() === 'licking' && e.buttons === 1) {
        Crack.healAt(Math.floor(cx / CFG.CELL), Math.floor(cy / CFG.CELL), 20);
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      Audio.init();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * sx;
      const cy = (e.clientY - rect.top) * sy;
      // 핥기 모드
      if (Game.getState() === 'licking') {
        Crack.healAt(Math.floor(cx / CFG.CELL), Math.floor(cy / CFG.CELL), 20);
        return;
      }
      if (Game.getState() !== 'playing') return;
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') Renderer.toggleHint();
    });
  }

  function handleClick(canvasX, canvasY) {
    const gx = Math.floor(canvasX / CFG.CELL);
    const gy = Math.floor(canvasY / CFG.CELL);
    Crack.applyClick(gx, gy);
    Game.checkConditions();
  }

  return { init };
})();
