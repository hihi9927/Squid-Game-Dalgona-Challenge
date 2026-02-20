// ============================================================
// audio.js — Web Audio API 기반 효과음
// ============================================================

const Audio = (() => {
  let ctx = null;

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function tone(freq, dur, type = 'sine', vol = 0.12) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  return {
    init,
    click()  { tone(800 + Math.random() * 400, 0.08, 'square', 0.06); },
    break_() { tone(200 + Math.random() * 100, 0.15, 'sawtooth', 0.08); },
    crack()  { tone(150 + Math.random() * 80, 0.25, 'sawtooth', 0.05); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone(f, 0.3, 'sine', 0.1), i * 120));
    },
    lose() {
      [400, 300, 200].forEach((f, i) =>
        setTimeout(() => tone(f, 0.4, 'sawtooth', 0.08), i * 200));
    }
  };
})();
