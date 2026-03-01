// ============================================================
// renderer.js — 최적화된 멀티 레이어 렌더러
//
// Layer 1 (baseCanvas)  : 달고나 본체 텍스처 — 최초 1회 렌더
// Layer 2 (crackCanvas) : 균열/파괴 — dirty cell만 부분 갱신 (ImageData)
// Layer 3 (uiCanvas)    : 파티클 + 커서 — 매 프레임 갱신 (가벼움)
// ============================================================

const Renderer = (() => {
  let baseCanvas, baseCtx;
  let crackCanvas, crackCtx, crackImageData, crackBuf;
  let uiCanvas, uiCtx;

  let shakeX = 0, shakeY = 0;
  let mouseX = 0, mouseY = 0;
  let running = false;

  // ---- 색상 유틸 ----
  // Uint32: 0xAABBGGRR (little-endian)
  function rgba(r, g, b, a) {
    return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  const COL_TABLE     = rgba(62, 37, 16, 255);
  const COL_BROKEN    = rgba(62, 37, 16, 255);
  const COL_CRACK_BG  = rgba(0, 0, 0, 0);        // transparent
  const COL_TRANSPARENT = rgba(0, 0, 0, 0);

  function candyColor(noise, typeVal) {
    const r = 212 + Math.floor(noise * 30 - 15);
    const g = 149 + Math.floor(noise * 20 - 10);
    const b = 43  + Math.floor(noise * 15 - 7);
    if (typeVal === Grid.TYPE_OUTLINE) {
      return rgba(r - 20, g - 15, b - 5, 255);
    }
    return rgba(r, g, b, 255);
  }

  function crackColor(crackLvl) {
    const alpha = Math.min(180, crackLvl * 65);
    return rgba(100, 65, 15, alpha);
  }

  // ---- 초기화 ----
  function init(container) {
    const size = CFG.CANVAS_SIZE;

    // 컨테이너 스타일
    container.style.position = 'relative';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    function makeCanvas(zIndex) {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.style.position = 'absolute';
      c.style.top = '0'; c.style.left = '0';
      c.style.zIndex = zIndex;
      c.style.borderRadius = '8px';
      container.appendChild(c);
      return c;
    }

    baseCanvas  = makeCanvas(1);
    crackCanvas = makeCanvas(2);
    uiCanvas    = makeCanvas(3);
    uiCanvas.style.cursor = 'none';

    baseCtx  = baseCanvas.getContext('2d');
    crackCtx = crackCanvas.getContext('2d');
    uiCtx    = uiCanvas.getContext('2d');

    // Crack layer: ImageData 버퍼
    crackImageData = crackCtx.createImageData(size, size);
    crackBuf = new Uint32Array(crackImageData.data.buffer);
    crackBuf.fill(COL_TRANSPARENT);
  }

  // ---- Layer 1: 달고나 본체 (1회 렌더) ----
  function renderBase() {
    const N = CFG.GRID, C = CFG.CELL, size = CFG.CANVAS_SIZE;
    const center = CFG.CENTER, radius = CFG.COOKIE_RADIUS;

    // ImageData로 빠르게 그리기
    const imgData = baseCtx.createImageData(size, size);
    const buf = new Uint32Array(imgData.data.buffer);

    // 테이블 배경
    buf.fill(rgba(74, 46, 20, 255));

    // 달고나 셀
    const arr = Grid.arrays();
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const i = Grid.idx(gx, gy);
        if (!arr.inCookie[i]) continue;

        const col = candyColor(arr.noiseVal[i], arr.type[i]);
        const px0 = gx * C, py0 = gy * C;
        for (let dy = 0; dy < C; dy++) {
          const rowStart = (py0 + dy) * size + px0;
          for (let dx = 0; dx < C; dx++) {
            buf[rowStart + dx] = col;
          }
        }
      }
    }

    baseCtx.putImageData(imgData, 0, 0);

    // 위에 방사형 그래디언트 (입체감)
    const halfSize = size / 2;
    const grad = baseCtx.createRadialGradient(
      halfSize - 30, halfSize - 30, 10,
      halfSize, halfSize, radius * C
    );
    grad.addColorStop(0, 'rgba(255,220,150,0.12)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    baseCtx.fillStyle = grad;
    baseCtx.beginPath();
    baseCtx.arc(halfSize, halfSize, radius * C, 0, Math.PI * 2);
    baseCtx.fill();

    // 쿠키 테두리 베벨
    baseCtx.strokeStyle = 'rgba(180,130,50,0.4)';
    baseCtx.lineWidth = 2;
    baseCtx.beginPath();
    baseCtx.arc(halfSize, halfSize, radius * C, 0, Math.PI * 2);
    baseCtx.stroke();

    // 나무 결 텍스처
    /*baseCtx.strokeStyle = 'rgba(80,50,20,0.2)';
    baseCtx.lineWidth = 1;
    for (let l = 0; l < 25; l++) {
      const yy = l * (size / 25) + 5;
      baseCtx.beginPath();
      baseCtx.moveTo(0, yy);
      for (let xx = 0; xx < size; xx += 20) {
        baseCtx.lineTo(xx, yy + Math.sin(xx * 0.02 + l) * 3);
      }
      baseCtx.stroke();
    }*/

    // 윤곽선 가이드 (반투명 도트)
    baseCtx.fillStyle = 'rgba(120,80,15,0.3)';
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const i = Grid.idx(gx, gy);
        if (arr.inCookie[i] && arr.type[i] === Grid.TYPE_OUTLINE) {
          baseCtx.fillRect(gx * C, gy * C, C, C);
        }
      }
    }
  }

  // ---- Layer 2: 균열/파괴 (dirty cell만 갱신) ----
  function updateCrackLayer(dirtySet) {
    if (dirtySet.size === 0) return;

    const N = CFG.GRID, C = CFG.CELL, size = CFG.CANVAS_SIZE;
    const arr = Grid.arrays();

    for (const key of dirtySet) {
      const gx = key % N;
      const gy = Math.floor(key / N);
      const i = key;

      if (!arr.inCookie[i]) continue;

      const px0 = gx * C, py0 = gy * C;

      if (arr.broken[i]) {
        // 구멍 — 어두운 색
        for (let dy = 0; dy < C; dy++) {
          const rowStart = (py0 + dy) * size + px0;
          for (let dx = 0; dx < C; dx++) {
            // 상단/좌측 가장자리를 더 어둡게 (깊이감)
            if (dy === 0 || dx === 0) {
              crackBuf[rowStart + dx] = rgba(40, 25, 10, 240);
            } else {
              crackBuf[rowStart + dx] = rgba(55, 33, 14, 220);
            }
          }
        }
      } else if (arr.hp[i] < arr.maxHp[i]) {
        // 균열
        const cl = 1.0 - arr.hp[i] / arr.maxHp[i];
        const alpha = Math.floor(160 * cl) >> 0;
        //const col = rgba(240, 240, 240, alpha);
        const col = rgba(90, 58, 12, alpha);
        for (let dy = 0; dy < C; dy++) {
          const rowStart = (py0 + dy) * size + px0;
          for (let dx = 0; dx < C; dx++) {
            crackBuf[rowStart + dx] = col;
          }
        }
      }
    }

    crackCtx.putImageData(crackImageData, 0, 0);
  }

  // 전체 crack layer를 리셋하고 다시 그리기 (게임 시작 시)
  function resetCrackLayer() {
    crackBuf.fill(COL_TRANSPARENT);
    crackCtx.putImageData(crackImageData, 0, 0);
  }

  // ---- Layer 3: 파티클 + 커서 (매 프레임) ----
  function renderUI(gameState) {
    const size = CFG.CANVAS_SIZE;
    uiCtx.clearRect(0, 0, size, size);

    // 화면 흔들림 (UI 레이어에만 미묘하게 적용)
    uiCtx.save();
    shakeX *= 0.85;
    shakeY *= 0.85;

    // 파티클
    Particles.update();
    Particles.draw(uiCtx);

    // 핀 커서
    if (gameState === 'playing') {
      const cx = mouseX, cy = mouseY;
      // 그림자
      uiCtx.fillStyle = 'rgba(0,0,0,0.2)';
      uiCtx.beginPath();
      uiCtx.ellipse(cx + 2, cy + 2, 4, 2, 0, 0, Math.PI * 2);
      uiCtx.fill();
      // 바늘
      uiCtx.strokeStyle = '#C0C0C8';
      uiCtx.lineWidth = 2;
      uiCtx.beginPath();
      uiCtx.moveTo(cx, cy);
      uiCtx.lineTo(cx - 6, cy - 22);
      uiCtx.stroke();
      // 머리
      uiCtx.fillStyle = '#E04040';
      uiCtx.beginPath();
      uiCtx.arc(cx - 6, cy - 24, 4, 0, Math.PI * 2);
      uiCtx.fill();
      uiCtx.fillStyle = '#F06060';
      uiCtx.beginPath();
      uiCtx.arc(cx - 7, cy - 25, 1.5, 0, Math.PI * 2);
      uiCtx.fill();
      // 끝
      uiCtx.fillStyle = '#E8E8EE';
      uiCtx.beginPath();
      uiCtx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      uiCtx.fill();
    }

    // 승리 하이라이트
    if (gameState === 'win') {
      const N = CFG.GRID, C = CFG.CELL;
      const arr = Grid.arrays();
      uiCtx.fillStyle = 'rgba(255,220,100,0.25)';
      for (let gy = 0; gy < N; gy++) {
        for (let gx = 0; gx < N; gx++) {
          const i = Grid.idx(gx, gy);
          if (arr.type[i] === Grid.TYPE_INSIDE && !arr.broken[i] && arr.inCookie[i]) {
            uiCtx.fillRect(gx * C, gy * C, C, C);
          }
        }
      }
    }

    uiCtx.restore();
  }

  // ---- 흔들림 API ----
  function shake(intensity) {
    shakeX += (Math.random() - 0.5) * intensity * 2;
    shakeY += (Math.random() - 0.5) * intensity * 2;
    // 전 레이어에 미세 오프셋 적용
    const tx = Math.round(shakeX), ty = Math.round(shakeY);
    baseCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
    crackCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
    uiCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  function clearShake() {
    shakeX = 0; shakeY = 0;
    baseCanvas.style.transform = '';
    crackCanvas.style.transform = '';
    uiCanvas.style.transform = '';
  }

  // ---- 게임 루프 ----
  // gameStateFn은 game.js의 getState를 받는 함수 인자
  function startLoop(gameStateFn) {
    running = true;
    function frame() {
      if (!running && Particles.count() === 0) return;

      const gs = gameStateFn();

      // Crack dirty update
      const dirty = Crack.getDirty();
      if (dirty.size > 0) {
        updateCrackLayer(dirty);
        Crack.clearDirty();
      }

      // Shake decay
      shakeX *= 0.85;
      shakeY *= 0.85;
      if (Math.abs(shakeX) < 0.1 && Math.abs(shakeY) < 0.1) {
        clearShake();
      } else {
        const tx = Math.round(shakeX), ty = Math.round(shakeY);
        baseCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
        crackCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
        uiCanvas.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      // UI layer (매 프레임)
      renderUI(gs);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function stopLoop() { running = false; }

  // ---- 마우스 좌표 갱신 ----
  function setMouse(x, y) { mouseX = x; mouseY = y; }

  // ---- 최상위 캔버스(입력용) 반환 ----
  function getInputCanvas() { return uiCanvas; }

  return {
    init, renderBase, resetCrackLayer, updateCrackLayer,
    renderUI, shake, clearShake,
    startLoop, stopLoop,
    setMouse, getInputCanvas
  };
})();
