// ============================================================
// main.js — 진입점: 모듈 연결 및 UI 구성
// ============================================================

(function () {
  let strokes = [];        // 완성된 스트로크들
  let currentStroke = null; // 현재 그리는 중인 스트로크

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
    ctx.strokeStyle = 'rgba(212,149,43,0.35)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(150, 150, 133, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#D4952B';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const all = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const s of all) {
      if (s.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]);
      ctx.stroke();
    }
  }

  // ── 드로우 스크린 열기/닫기 ──
  function openDrawScreen() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('draw-screen').style.display = 'block';
    strokes = [];
    currentStroke = null;
    renderDrawCanvas();
  }

  function closeDrawScreen() {
    document.getElementById('draw-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
  }

  // ── 완료 처리 ──
  function finishDrawing() {
    const all = currentStroke ? [...strokes, currentStroke] : strokes;
    if (all.length === 0) return;

    const N = CFG.GRID;
    const outlineSet = new Set();
    const brushR = 3;

    for (const stroke of all) {
      for (let i = 0; i < stroke.length - 1; i++) {
        const x0 = stroke[i][0] * 2,   y0 = stroke[i][1] * 2;
        const x1 = stroke[i+1][0] * 2, y1 = stroke[i+1][1] * 2;
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let s = 0; s <= steps; s++) {
          const px = Math.round(x0 + (x1 - x0) * s / steps);
          const py = Math.round(y0 + (y1 - y0) * s / steps);
          for (let dy = -brushR; dy <= brushR; dy++) {
            for (let dx = -brushR; dx <= brushR; dx++) {
              if (dx*dx + dy*dy > brushR*brushR) continue;
              const gx = px + dx, gy = py + dy;
              if (gx >= 0 && gx < N && gy >= 0 && gy < N)
                outlineSet.add(gy * N + gx);
            }
          }
        }
      }
    }

    Grid.setCustomOutline(outlineSet);
    Shapes.defs.custom = { name: '커스텀', icon: '✏️', sdf: () => 1 };
    Game.setShape('custom');
    closeDrawScreen();
    buildShapeSelector();
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
    currentStroke = [];
    const [x, y] = getCanvasPos(e);
    currentStroke.push([x, y]);
    renderDrawCanvas();
  }

  function onDrawMove(e) {
    e.preventDefault();
    if (!currentStroke) return;
    const [x, y] = getCanvasPos(e);
    const last = currentStroke[currentStroke.length - 1];
    const dx = x - last[0], dy = y - last[1];
    if (dx * dx + dy * dy >= 4 * 4) {
      currentStroke.push([x, y]);
      renderDrawCanvas();
    }
  }

  function onDrawEnd(e) {
    e.preventDefault();
    if (!currentStroke) return;
    if (currentStroke.length >= 2) strokes.push(currentStroke);
    currentStroke = null;
    renderDrawCanvas();
  }

  drawCanvas.addEventListener('mousedown',  onDrawStart);
  drawCanvas.addEventListener('mousemove',  onDrawMove);
  drawCanvas.addEventListener('mouseup',    onDrawEnd);
  drawCanvas.addEventListener('touchstart', onDrawStart, { passive: false });
  drawCanvas.addEventListener('touchmove',  onDrawMove,  { passive: false });
  drawCanvas.addEventListener('touchend',   onDrawEnd,   { passive: false });

  document.getElementById('draw-done-btn').onclick = finishDrawing;
  document.getElementById('draw-clear-btn').onclick = () => { strokes = []; currentStroke = null; renderDrawCanvas(); };
  document.getElementById('draw-back-btn').onclick = closeDrawScreen;
})();
