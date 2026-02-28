class PerlinNoise {
  constructor(seed) {
    // 순열 테이블 생성 (256개 값을 섞어서 2배로 확장)
    this.perm = this._buildPermutation(seed);
  }

  // --- 시드 기반 순열 테이블 ---
  _buildPermutation(seed) {
    const p = Array.from({ length: 256 }, (_, i) => i);

    // Fisher-Yates 셔플 (시드 기반 간이 RNG)
    let s = seed;
    const rng = () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // 길이 512로 확장 (모듈로 연산 대신 직접 참조 가능)
    return [...p, ...p];
  }

  // --- Fade 함수: 6t⁵ - 15t⁴ + 10t³ ---
  // 격자 경계에서 1차·2차 도함수가 0이 되어 매끄러운 보간 보장
  _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // --- 선형 보간 ---
  _lerp(a, b, t) {
    return a + t * (b - a);
  }

  // --- 격자점의 그래디언트 벡터와 거리 벡터의 내적 ---
  // 해시값으로 4방향 중 하나를 선택하는 최적화 버전
  _grad(hash, x, y) {
    const h = hash & 3;        // 하위 2비트 → 0,1,2,3
    switch (h) {
      case 0: return  x + y;   // 그래디언트 ( 1,  1)
      case 1: return -x + y;   // 그래디언트 (-1,  1)
      case 2: return  x - y;   // 그래디언트 ( 1, -1)
      case 3: return -x - y;   // 그래디언트 (-1, -1)
    }
  }

  // ============================================================
  //  핵심: noise2D(x, y) → -1 ~ +1
  // ============================================================
  noise2D(x, y) {
    const p = this.perm;

    // ① 입력 좌표가 속한 격자 셀 찾기 (정수 부분)
    const xi = Math.floor(x) & 255;   // & 255 = 순열 테이블 범위 내로
    const yi = Math.floor(y) & 255;

    // ② 셀 내 상대 위치 (소수 부분, 0~1)
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // ③ Fade 함수로 보간 가중치 계산
    const u = this._fade(xf);
    const v = this._fade(yf);

    // ④ 네 꼭짓점의 해시값 (순열 테이블 체이닝)
    const aa = p[p[xi    ] + yi    ];   // 좌하
    const ab = p[p[xi    ] + yi + 1];   // 좌상
    const ba = p[p[xi + 1] + yi    ];   // 우하
    const bb = p[p[xi + 1] + yi + 1];   // 우상

    // ⑤ 각 꼭짓점의 그래디언트·거리 내적값을 보간
    const x1 = this._lerp(
      this._grad(aa, xf,     yf),       // 좌하 기여
      this._grad(ba, xf - 1, yf),       // 우하 기여
      u
    );
    const x2 = this._lerp(
      this._grad(ab, xf,     yf - 1),   // 좌상 기여
      this._grad(bb, xf - 1, yf - 1),   // 우상 기여
      u
    );

    return this._lerp(x1, x2, v);       // 최종 보간
  }

  // ============================================================
  //  fBm: 옥타브 합성 (fractal Brownian motion)
  // ============================================================
  fbm(x, y, octaves = 3, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxAmplitude = 0;  // 정규화용

    for (let i = 0; i < octaves; i++) {
      total += amplitude * this.noise2D(x * frequency, y * frequency);
      maxAmplitude += amplitude;
      amplitude *= persistence;    // 진폭 감소
      frequency *= lacunarity;     // 주파수 증가
    }

    return total / maxAmplitude;   // -1 ~ +1 범위로 정규화
  }
}

// ============================================================
//  시각화
// ============================================================

const canvas = document.getElementById('noiseCanvas');
const ctx = canvas.getContext('2d');

let perlin = new PerlinNoise(Date.now());
let colorMode = 'grayscale';

function getParams() {
  return {
    scale:       parseFloat(document.getElementById('scaleSlider').value),
    octaves:     parseInt(document.getElementById('octaveSlider').value),
    persistence: parseFloat(document.getElementById('persistSlider').value),
    gridSize:    parseInt(document.getElementById('gridSlider').value),
  };
}

// --- 색상 매핑 함수들 ---
function toGrayscale(v) {
  const c = Math.floor(v * 255);
  return `rgb(${c},${c},${c})`;
}

function toDalgona(v) {
  // 밝은 달고나색 ~ 어두운 갈색
  const r = Math.floor(140 + v * 100);  // 140~240
  const g = Math.floor(80 + v * 100);   // 80~180
  const b = Math.floor(20 + v * 40);    // 20~60
  return `rgb(${r},${g},${b})`;
}

function toHeatmap(v) {
  let r, g, b;
  if (v < 0.25) {
    const t = v / 0.25;
    r = 0; g = 0; b = Math.floor(80 + t * 175);
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    r = 0; g = Math.floor(t * 255); b = Math.floor(255 * (1 - t));
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    r = Math.floor(t * 255); g = 255; b = 0;
  } else {
    const t = (v - 0.75) / 0.25;
    r = 255; g = Math.floor(255 * (1 - t)); b = 0;
  }
  return `rgb(${r},${g},${b})`;
}

function getColor(v) {
  switch (colorMode) {
    case 'dalgona':  return toDalgona(v);
    case 'heatmap':  return toHeatmap(v);
    default:         return toGrayscale(v);
  }
}

// --- 메인 렌더링 ---
let noiseGrid = [];

function render() {
  const { scale, octaves, persistence, gridSize } = getParams();
  const cellSize = canvas.width / gridSize;

  noiseGrid = [];

  for (let gy = 0; gy < gridSize; gy++) {
    const row = [];
    for (let gx = 0; gx < gridSize; gx++) {
      // ★ 핵심: 정수 격자좌표 × scale → 소수 좌표로 변환
      const noiseVal = perlin.fbm(gx * scale, gy * scale, octaves, persistence);

      // -1~+1 → 0~1 정규화
      const normalized = (noiseVal + 1) / 2;
      row.push(normalized);

      ctx.fillStyle = getColor(normalized);
      ctx.fillRect(gx * cellSize, gy * cellSize, cellSize + 0.5, cellSize + 0.5);
    }
    noiseGrid.push(row);
  }
}

// --- 컨트롤 이벤트 ---
const sliders = ['scaleSlider', 'octaveSlider', 'persistSlider', 'gridSlider'];
const displays = ['scaleVal', 'octaveVal', 'persistVal', 'gridVal'];
const formatters = [
  v => parseFloat(v).toFixed(3),
  v => v,
  v => parseFloat(v).toFixed(2),
  v => v,
];

sliders.forEach((id, i) => {
  document.getElementById(id).addEventListener('input', (e) => {
    document.getElementById(displays[i]).textContent = formatters[i](e.target.value);
    render();
  });
});

document.getElementById('regenerateBtn').addEventListener('click', () => {
  perlin = new PerlinNoise(Date.now());
  render();
});

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    colorMode = btn.dataset.mode;
    render();
  });
});

// --- 마우스 호버 정보 ---
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const { scale, gridSize } = getParams();
  const cellSize = canvas.width / gridSize;

  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const py = (e.clientY - rect.top) * (canvas.height / rect.height);

  const gx = Math.floor(px / cellSize);
  const gy = Math.floor(py / cellSize);

  if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
    const val = noiseGrid[gy][gx];
    const strength = (0.6 + val * 0.4).toFixed(3);
    document.getElementById('hoverInfo').innerHTML =
      `격자 (<span>${gx}</span>, <span>${gy}</span>)<br>` +
      `noise(<span>${(gx*scale).toFixed(2)}</span>, <span>${(gy*scale).toFixed(2)}</span>) = <span>${val.toFixed(3)}</span><br>` +
      `strength = <span>${strength}</span>`;
  }
});

canvas.addEventListener('mouseleave', () => {
  document.getElementById('hoverInfo').innerHTML = '캔버스 위에 마우스를 올려보세요';
});

// 초기 렌더링
render();