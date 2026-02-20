// ============================================================
// shapes.js — 다각형 기반 SDF 모양 정의
//
// 모든 도형을 꼭짓점 배열로 정의한 뒤 sdPolygon()으로
// 정확한 signed distance를 계산한다.
// ============================================================

const Shapes = (() => {
  const C = () => CFG.CENTER;
  const S = () => CFG.GRID / 84;  // 기준 스케일 (GRID=84 → 1x)

  // ──────────────────────────────────────────────
  // 유틸: 닫힌 다각형에 대한 Signed Distance
  // ──────────────────────────────────────────────
  function sdPolygon(px, py, verts) {
    const n = verts.length;
    let minDist2 = Infinity;
    let crossings = 0;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = verts[i][0], ay = verts[i][1];
      const bx = verts[j][0], by = verts[j][1];

      const ex = bx - ax, ey = by - ay;
      const len2 = ex * ex + ey * ey;
      let t = len2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / len2 : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const dx = px - (ax + t * ex);
      const dy = py - (ay + t * ey);
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist2) minDist2 = d2;

      if ((ay > py) !== (by > py)) {
        const xInt = ax + (py - ay) / (by - ay) * (bx - ax);
        if (px < xInt) crossings++;
      }
    }

    const dist = Math.sqrt(minDist2);
    return (crossings & 1) ? -dist : dist;
  }

  // ──────────────────────────────────────────────
  // 1) 별 ⭐  — 10개 꼭짓점 (외곽 5 + 내곽 5)
  // ──────────────────────────────────────────────
  function starVerts(cx, cy, outerR, innerR) {
    const v = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      v.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return v;
  }

  // ──────────────────────────────────────────────
  // 2) 하트 ❤️ — 파라메트릭 곡선 샘플링
  //    x(t) = 16 sin³(t)
  //    y(t) = 13cos(t) − 5cos(2t) − 2cos(3t) − cos(4t)
  // ──────────────────────────────────────────────
  function heartVerts(cx, cy, scale) {
    const v = [];
    const N = 80;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 2 * Math.PI;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      // 원래 수식에서 y가 위로 양수이므로, 캔버스(아래로 양수)에 맞게 부호 반전
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t)
                    - 2 * Math.cos(3*t) - Math.cos(4*t));
      v.push([cx + hx * scale, cy + hy * scale]);
    }
    return v;
  }

  // ──────────────────────────────────────────────
  // 3) 우산 ☂️ — 돔(상반원) + 손잡이(직선) + 갈고리(하반원)
  // ──────────────────────────────────────────────
  function umbrellaVerts(cx, cy, s) {
    const v = [];
    const domeR    = 22 * s;
    const domeY    = cy - 4 * s;     // 돔 중심 Y
    const handleW  = 2.5 * s;        // 손잡이 반폭
    const handleBot = cy + 22 * s;   // 손잡이 하단
    const hookR    = 5 * s;          // 갈고리 반지름

    // ① 돔 상반원 (왼→오, 호)
    const domeN = 40;
    for (let i = 0; i <= domeN; i++) {
      const a = Math.PI + (i / domeN) * Math.PI; // π → 2π
      v.push([cx + domeR * Math.cos(a), domeY + domeR * Math.sin(a)]);
    }

    // ② 돔 오른쪽 끝 → 손잡이 오른쪽 상단
    v.push([cx + handleW, domeY]);
    // ③ 손잡이 오른쪽 하단
    v.push([cx + handleW, handleBot]);

    // ④ 갈고리: J-커브 (바깥쪽 호, 오른쪽으로)
    const hookCx = cx + hookR;
    const hookN  = 16;
    for (let i = 0; i <= hookN; i++) {
      const a = -Math.PI / 2 + (i / hookN) * Math.PI;
      v.push([
        hookCx + (hookR + handleW) * Math.cos(a),
        handleBot + (hookR + handleW) * Math.sin(a)
      ]);
    }
    // 안쪽 호 (역방향)
    for (let i = hookN; i >= 0; i--) {
      const a = -Math.PI / 2 + (i / hookN) * Math.PI;
      v.push([
        hookCx + Math.max(0, hookR - handleW) * Math.cos(a),
        handleBot + Math.max(0, hookR - handleW) * Math.sin(a)
      ]);
    }

    // ⑤ 손잡이 왼쪽 올라가기
    v.push([cx - handleW, handleBot]);
    v.push([cx - handleW, domeY]);

    return v;
  }

  // ──────────────────────────────────────────────
  // 4) 삼각형 🔺 — 정삼각형
  // ──────────────────────────────────────────────
  function triangleVerts(cx, cy, R) {
    const v = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI / 3) - Math.PI / 2;
      v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    return v;
  }

  // ──────────────────────────────────────────────
  // Shape 정의 (꼭짓점 캐싱)
  // ──────────────────────────────────────────────
  const defs = {
    star: {
      name: '별', icon: '⭐', _v: null,
      sdf(x, y) {
        if (!this._v) this._v = starVerts(C(), C(), 24 * S(), 10 * S());
        return sdPolygon(x, y, this._v);
      }
    },
    heart: {
      name: '하트', icon: '❤️', _v: null,
      sdf(x, y) {
        if (!this._v) this._v = heartVerts(C(), C() + 2 * S(), S() * 1.15);
        return sdPolygon(x, y, this._v);
      }
    },
    circle: {
      name: '원', icon: '⭕',
      sdf(x, y) {
        const dx = x - C(), dy = y - C();
        return Math.sqrt(dx * dx + dy * dy) - 20 * S();
      }
    },
    umbrella: {
      name: '우산', icon: '☂️', _v: null,
      sdf(x, y) {
        if (!this._v) this._v = umbrellaVerts(C(), C(), S());
        return sdPolygon(x, y, this._v);
      }
    },
    triangle: {
      name: '삼각형', icon: '🔺', _v: null,
      sdf(x, y) {
        if (!this._v) this._v = triangleVerts(C(), C() + 2 * S(), 22 * S());
        return sdPolygon(x, y, this._v);
      }
    }
  };

  function invalidateCache() {
    for (const shape of Object.values(defs)) {
      if ('_v' in shape) shape._v = null;
    }
  }

  return { defs, invalidateCache };
})();
