// ============================================================
// grid.js — 그리드 초기화 및 셀 관리
// ============================================================

const Grid = (() => {
  // Cell types
  const TYPE_OUTSIDE = 0;
  const TYPE_OUTLINE = 1;
  const TYPE_INSIDE  = 2;

  let cells = null;          // Float32 typed array가 아닌 object array (접근 편의)
  let stats = { totalOutline: 0, brokenOutline: 0, totalInside: 0, brokenInside: 0 };

  /**
   * 셀 데이터를 Struct-of-Arrays 형태로 관리
   * (성능을 위해 typed array 사용)
   */
  let hp, maxHp, type, crackLevel, broken, inCookie, noiseVal;

  function idx(x, y) { return y * CFG.GRID + x; }

  function init(shapeName) {
    const N = CFG.GRID;
    const total = N * N;

    hp         = new Int8Array(total);
    maxHp      = new Int8Array(total);
    type       = new Uint8Array(total);
    crackLevel = new Uint8Array(total);
    broken     = new Uint8Array(total);   // 0 or 1
    inCookie   = new Uint8Array(total);   // 0 or 1
    noiseVal   = new Float32Array(total);

    stats = { totalOutline: 0, brokenOutline: 0, totalInside: 0, brokenInside: 0 };

    const shape = Shapes.defs[shapeName];
    const center = CFG.CENTER;
    const radius = CFG.COOKIE_RADIUS;
    const thickness = CFG.OUTLINE_THICKNESS;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = idx(x, y);
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cookie = dist <= radius ? 1 : 0;

        inCookie[i] = cookie;
        noiseVal[i] = Math.random() * 0.15;
        crackLevel[i] = 0;
        broken[i] = 0;

        if (cookie) {
          const sdfVal = shape.sdf(x, y);
          if (sdfVal < -thickness) {
            type[i] = TYPE_INSIDE;
            hp[i] = CFG.HP_INNER;
            maxHp[i] = CFG.HP_INNER;
            stats.totalInside++;
          } else if (sdfVal <= thickness * 0.5) {
            type[i] = TYPE_OUTLINE;
            hp[i] = CFG.HP_OUTLINE;
            maxHp[i] = CFG.HP_OUTLINE;
            stats.totalOutline++;
          } else {
            type[i] = TYPE_OUTSIDE;
            hp[i] = CFG.HP_OUTER;
            maxHp[i] = CFG.HP_OUTER;
          }
        } else {
          type[i] = TYPE_OUTSIDE;
          hp[i] = 0;
          maxHp[i] = 0;
        }
      }
    }

    // 외부 일부 셀을 약하게 만들기
    for (let i = 0; i < total; i++) {
      if (inCookie[i] && type[i] === TYPE_OUTSIDE && Math.random() < CFG.HP_OUTER_WEAK_CHANCE) {
        hp[i] = 2;
        maxHp[i] = 2;
      }
    }
  }

  // 개별 셀 접근 헬퍼
  function get(x, y) {
    const i = idx(x, y);
    return {
      hp: hp[i], maxHp: maxHp[i], type: type[i],
      crackLevel: crackLevel[i], broken: broken[i],
      inCookie: inCookie[i], noiseVal: noiseVal[i]
    };
  }

  function getHp(x, y)         { return hp[idx(x, y)]; }
  function setHp(x, y, v)      { hp[idx(x, y)] = v; }
  function getType(x, y)       { return type[idx(x, y)]; }
  function getCrack(x, y)      { return crackLevel[idx(x, y)]; }
  function addCrack(x, y)      { crackLevel[idx(x, y)]++; }
  function setCrack(x, y)      { crackLevel[idx(x, y)] += hp[idx(x, y)]; }
  function isBroken(x, y)      { return broken[idx(x, y)] === 1; }
  function setBroken(x, y)     { broken[idx(x, y)] = 1; hp[idx(x, y)] = 0; }
  function isInCookie(x, y)    { return inCookie[idx(x, y)] === 1; }
  function getNoise(x, y)      { return noiseVal[idx(x, y)]; }

  // 직접 typed array 접근 (렌더러용)
  function arrays() {
    return { hp, maxHp, type, crackLevel, broken, inCookie, noiseVal };
  }

  return {
    TYPE_OUTSIDE, TYPE_OUTLINE, TYPE_INSIDE,
    init, get, getHp, setHp, getType, getCrack, addCrack, setCrack,
    isBroken, setBroken, isInCookie, getNoise, arrays, idx,
    stats: () => stats,
  };
})();
