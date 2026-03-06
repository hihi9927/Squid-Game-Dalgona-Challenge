// ============================================================
// game.js — 게임 상태 관리 (타이머, 승패, HUD)
// ============================================================

const Game = (() => {
  let state = 'menu';   // menu | playing | licking | win | lose
  let timeLeft = CFG.TIME_LIMIT;
  let timerHandle = null;
  let selectedShape = 'star';
  let lickUsed = false;

  const $lickOverlay = () => document.getElementById('lick-overlay');

  // DOM refs
  const $timer     = () => document.getElementById('timer');
  const $timerWrap = () => document.getElementById('timer-display');
  const $progress  = () => document.getElementById('progress-bar');
  const $integrity = () => document.getElementById('integrity');
  const $intWrap   = () => document.getElementById('integrity-display');
  const $overlay   = () => document.getElementById('overlay');
  const $menuScr   = () => document.getElementById('menu-screen');
  const $resultScr = () => document.getElementById('result-screen');
  const $resEmoji  = () => document.getElementById('result-emoji');
  const $resTitle  = () => document.getElementById('result-title');
  const $resSub    = () => document.getElementById('result-subtitle');

  function getState() { return state; }
  function getShape() { return selectedShape; }
  function setShape(s) { selectedShape = s; }

  function updateHUD() {
    const stats = Grid.stats();
    const progress = stats.totalOutline > 0
      ? (stats.brokenOutline / stats.totalOutline * 100) : 0;
    $progress().style.width = progress + '%';

    const integrity = stats.totalInside > 0
      ? Math.max(0, 100 - (stats.brokenInside / stats.totalInside * 100)) : 100;
    $integrity().textContent = Math.round(integrity);

    if (integrity < 85) $intWrap().classList.add('warning');
  }

  function checkConditions() {
    if (state !== 'playing') return;
    updateHUD();
    const stats = Grid.stats();

    // 패배: 내부 셀 과다 파괴
    if (stats.brokenInside > stats.totalInside * CFG.LOSE_INSIDE_RATIO) {
      endGame('lose');
      return;
    }
    // 승리: 윤곽선 충분히 파괴
    if (stats.brokenOutline >= stats.totalOutline * CFG.WIN_OUTLINE_RATIO) {
      state = 'win';
      clearInterval(timerHandle);
      setTimeout(() => endGame('win'), 1500);
    }
  }

  // ── 핥기 기회 제공 (균열 발생 후 1회만) ──
  function offerLick() {
    if (lickUsed) { endGame('lose'); return; }
    state = 'licking_offer';   // 게임 입력 차단
    clearInterval(timerHandle);
    $lickOverlay().style.display = 'block';
  }

  function startLick() {
    lickUsed = true;
    state = 'licking';
    $lickOverlay().style.display = 'none';
  }

  function endLick() {
    state = 'playing';
    // 타이머 재개
    timerHandle = setInterval(() => {
      timeLeft--;
      $timer().textContent = timeLeft;
      if (timeLeft <= 15) $timerWrap().classList.add('warning');
      if (timeLeft <= 0) endGame('lose');
    }, 1000);
  }

  function start() {
    Audio.init();
    state = 'playing';
    lickUsed = false;
    $lickOverlay().style.display = 'none';
    timeLeft = CFG.TIME_LIMIT;
    Particles.clear();

    Shapes.invalidateCache();
    Grid.init(selectedShape);
    Renderer.renderBase();
    Renderer.resetCrackLayer();
    Crack.clearDirty();
    Crack.clearLickable();

    $overlay().classList.add('hidden');
    $timerWrap().classList.remove('warning');
    $intWrap().classList.remove('warning');
    $timer().textContent = timeLeft;
    $progress().style.width = '0%';
    $integrity().textContent = '100';

    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      timeLeft--;
      $timer().textContent = timeLeft;
      if (timeLeft <= 15) $timerWrap().classList.add('warning');
      if (timeLeft <= 0) endGame('lose');
    }, 1000);

    Renderer.startLoop(getState);
  }

  function endGame(result) {
    state = result;
    clearInterval(timerHandle);

    setTimeout(() => {
      $overlay().classList.remove('hidden');
      $menuScr().style.display = 'none';
      const rs = $resultScr();
      rs.style.display = 'flex';
      rs.style.flexDirection = 'column';
      rs.style.alignItems = 'center';

      if (result === 'win') {
        Audio.win();
        $resEmoji().textContent = '🎉';
        $resTitle().textContent = '성공!';
        $resSub().textContent = `${CFG.TIME_LIMIT - timeLeft}초 만에 뽑기 성공!`;
      } else {
        Audio.lose();
        $resEmoji().textContent = '💔';
        $resTitle().textContent = '실패...';
        $resSub().textContent = timeLeft <= 0
          ? '시간이 초과되었습니다!' : '달고나가 깨져버렸습니다!';
      }
    }, 500);
  }

  function showMenu() {
    state = 'menu';
    clearInterval(timerHandle);
    Renderer.stopLoop();

    $overlay().classList.remove('hidden');
    $menuScr().style.display = 'block';
    $resultScr().style.display = 'none';

    // 미리보기
    Shapes.invalidateCache();
    Grid.init(selectedShape);
    Renderer.renderBase();
    Renderer.resetCrackLayer();
  }

  return { getState, getShape, setShape, start, endGame, showMenu, checkConditions, offerLick, startLick, endLick };
})();
