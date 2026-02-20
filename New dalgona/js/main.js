// ============================================================
// main.js — 진입점: 모듈 연결 및 UI 구성
// ============================================================

(function () {
  // 모양 선택 버튼 생성
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
        // 꼭짓점 캐시 초기화 후 미리보기
        Shapes.invalidateCache();
        Grid.init(key);
        Renderer.renderBase();
        Renderer.resetCrackLayer();
      };
      container.appendChild(btn);
    }
  }

  // 캔버스 컨테이너 초기화
  const canvasSlot = document.getElementById('canvas-slot');
  Renderer.init(canvasSlot);

  // 모양 선택 UI
  buildShapeSelector();

  // 초기 미리보기
  Shapes.invalidateCache();
  Grid.init(Game.getShape());
  Renderer.renderBase();
  Renderer.resetCrackLayer();

  // 입력 바인딩
  Input.init();

  // 버튼 이벤트
  document.getElementById('start-btn').onclick = Game.start;
  document.getElementById('retry-btn').onclick = Game.showMenu;
})();
