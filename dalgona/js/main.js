// ============================================================
// main.js — 진입점: 모듈 연결 및 UI 구성
// ============================================================

(function () {
  let drawVerts = [];
  let isMouseDown = false;

  // ── 모양 선택 버튼 생성 ──
  function buildShapeSelector() {
    const container = document.getElementById('shape-selector');
    container.innerHTML = '';
    for (const [key, shape] of Object.entries(Shapes.defs)) {
      const btn = document.createElement('div');
      btn.className = 'shape-btn' + (key === Game.getShape() ? ' selected' : '');
      btn.innerHTML = `<span style="font-size:28px">${shape.icon}</span><span>${shape.name}</span>`;
      btn.onclick = () => {
        Game.setShape(key);
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Shapes.invalidateCache();
        Grid.init(key);
        Renderer.renderBase();
        Renderer.resetCrackLayer();
      };
      container.appendChild(btn);
    }
    // 커스텀 그리기 버튼 (항상 맨 끝)
    const customBtn = document.createElement('div');
    customBtn.className = 'shape-btn' + (Game.getShape() === 'custom' ? ' selected' : '');
    customBtn.innerHTML = `<span style="font-size:28px">✏️</span><span>직접그리기</span>`;
    customBtn.onclick = openDrawScreen;
    container.appendChild(customBtn);
  }

  // ── 드로우 캔버스 렌더 ──
  function renderDrawCanvas() {
    const canvas = document.getElementById('draw-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    // 쿠키 원 가이드
    ctx.strokeStyle = 'rgba(212,149,43,0.4)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(150, 150, 133, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (drawVerts.length === 0) return;

    // 채우기 프리뷰
    if (drawVerts.length >= 3) {
      ctx.fillStyle = 'rgba(212,149,43,0.18)';
      ctx.beginPath();
      ctx.moveTo(drawVerts[0][0], drawVerts[0][1]);
      for (let i = 1; i < drawVerts.length; i++) ctx.lineTo(drawVerts[i][0], drawVerts[i][1]);
      ctx.closePath();
      ctx.fill();
    }

    // 선
    ctx.strokeStyle = '#D4952B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drawVerts[0][0], drawVerts[0][1]);
    for (let i = 1; i < drawVerts.length; i++) ctx.lineTo(drawVerts[i][0], drawVerts[i][1]);
    if (drawVerts.length >= 3) ctx.closePath();
    ctx.stroke();

    // 꼭짓점
    ctx.fillStyle = '#F0D090';
    for (const [x, y] of drawVerts) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 드로우 스크린 열기/닫기 ──
  function openDrawScreen() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('draw-screen').style.display = 'block';
    drawVerts = [];
    renderDrawCanvas();
  }

  function closeDrawScreen() {
    document.getElementById('draw-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
  }

  // ── 완료 처리 ──
  function finishDrawing() {
    if (drawVerts.length < 3) return;
    const gameVerts = drawVerts.map(([x, y]) => [x * 2, y * 2]);
    Shapes.defs.custom = {
      name: '커스텀', icon: '✏️',
      sdf(x, y) { return Shapes.sdPolygon(x, y, gameVerts); }
    };
    Game.setShape('custom');
    closeDrawScreen();
    buildShapeSelector();
    Shapes.invalidateCache();
    Grid.init('custom');
    Renderer.renderBase();
    Renderer.resetCrackLayer();
  }

  // ── 캔버스 초기화 ──
  const canvasSlot = document.getElementById('canvas-slot');
  Renderer.init(canvasSlot);

  buildShapeSelector();

  Shapes.invalidateCache();
  Grid.init(Game.getShape());
  Renderer.renderBase();
  Renderer.resetCrackLayer();

  Input.init();

  document.getElementById('start-btn').onclick = Game.start;
  document.getElementById('retry-btn').onclick = Game.showMenu;
  document.getElementById('lick-btn').onclick = Game.startLick;

  // ── 드로우 캔버스 마우스/터치 ──
  const drawCanvas = document.getElementById('draw-canvas');

  function getCanvasPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return [
      (src.clientX - rect.left) * (300 / rect.width),
      (src.clientY - rect.top)  * (300 / rect.height)
    ];
  }

  function onDrawStart(e) {
    e.preventDefault();
    isMouseDown = true;
    drawVerts = [];
    const [x, y] = getCanvasPos(e);
    drawVerts.push([x, y]);
    renderDrawCanvas();
  }

  function onDrawMove(e) {
    e.preventDefault();
    if (!isMouseDown) return;
    const [x, y] = getCanvasPos(e);
    const last = drawVerts[drawVerts.length - 1];
    const dx = x - last[0], dy = y - last[1];
    if (dx * dx + dy * dy >= 6 * 6) {
      drawVerts.push([x, y]);
      renderDrawCanvas();
    }
  }

  function onDrawEnd(e) {
    e.preventDefault();
    if (!isMouseDown) return;
    isMouseDown = false;
    if (drawVerts.length >= 3) finishDrawing();
  }

  drawCanvas.addEventListener('mousedown',  onDrawStart);
  drawCanvas.addEventListener('mousemove',  onDrawMove);
  drawCanvas.addEventListener('mouseup',    onDrawEnd);
  drawCanvas.addEventListener('touchstart', onDrawStart, { passive: false });
  drawCanvas.addEventListener('touchmove',  onDrawMove,  { passive: false });
  drawCanvas.addEventListener('touchend',   onDrawEnd,   { passive: false });

  document.getElementById('draw-done-btn').onclick = finishDrawing;
  document.getElementById('draw-clear-btn').onclick = () => { drawVerts = []; renderDrawCanvas(); };
  document.getElementById('draw-back-btn').onclick = closeDrawScreen;
})();
