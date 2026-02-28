// ============================================================
// particles.js — 파티클 시스템
// ============================================================

const Particles = (() => {
  const list = [];

  function spawn(px, py, count, color) {
    for (let i = 0; i < count; i++) {
      list.push({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 1.5 + Math.random() * 2.5,
        color
      });
    }
  }

  function update() {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;
      if (p.life <= 0) list.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const p of list) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function count() { return list.length; }
  function clear() { list.length = 0; }

  return { spawn, update, draw, count, clear };
})();
