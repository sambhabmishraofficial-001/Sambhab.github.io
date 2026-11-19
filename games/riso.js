'use strict';

/*
 * Shared Risograph Print Kit (exact style of houses.js / ucl.js)
 * for all four games in Pixel Plays (MIT, adapted from amirmushichge/pixel-plays).
 */

window.RisoKit = (function () {
  const INK = {
    blue: [46, 70, 130],
    coral: [236, 100, 80],
    sun: [255, 204, 46],
    teal: [0, 138, 136],
  };
  const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
  const SHIFT = { blue: [0.3, -0.2], coral: [-0.4, 0.3], sun: [0.25, 0.45], teal: [-0.3, -0.4] };
  const TAU = Math.PI * 2;
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const PAL = {
    GREEN: [['teal', 0.72], ['sun', 0.55]],
    LEAF: [['teal', 0.5], ['sun', 0.8]],
    WOOD: [['coral', 0.45], ['sun', 0.46]],
    WOOD_DK: [['coral', 0.55], ['blue', 0.28]],
    STONE: [['sun', 0.22], ['coral', 0.08]],
    STONE_DK: [['sun', 0.3], ['coral', 0.14], ['blue', 0.1]],
    SAND: [['sun', 0.48], ['coral', 0.18]],
    WATER: [['teal', 0.62], ['blue', 0.24]],
    CONCRETE: [['blue', 0.14], ['sun', 0.1]],
    RED: [['coral', 0.9], ['blue', 0.16]],
    ORANGE: [['coral', 0.6], ['sun', 0.72]],
    PURPLE: [['blue', 0.48], ['coral', 0.52]],
    SKIN: [['coral', 0.22], ['sun', 0.18]],
  };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);

  function hash(...parts) {
    let h = 2166136261;
    for (const p of parts) {
      const s = String(p);
      for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
    }
    return h >>> 0;
  }

  function rand(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  const LEVELS = 16, CELL = 2.4, CELLS = 8, RES = 5;
  const tiles = new Map();
  function screenTile(ink, level) {
    const key = ink + level;
    let cv = tiles.get(key);
    if (cv) return cv;
    const cell = CELL * RES, size = cell * CELLS, tone = level / LEVELS;
    cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const R = rand(hash('rk', ink, level));
    c.fillStyle = rgba(INK[ink]);
    if (tone >= 1) {
      c.fillRect(0, 0, size, size);
    } else if (tone <= 0.5) {
      for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
        const r = cell * Math.sqrt(tone / Math.PI) * (0.86 + R() * 0.24);
        c.beginPath();
        c.arc((x + 0.5) * cell + (R() - 0.5) * RES * 0.6, (y + 0.5) * cell + (R() - 0.5) * RES * 0.6, r, 0, TAU);
        c.fill();
      }
    } else {
      c.fillRect(0, 0, size, size);
      c.globalCompositeOperation = 'destination-out';
      for (let y = 0; y <= CELLS; y++) for (let x = 0; x <= CELLS; x++) {
        const r = cell * Math.sqrt((1 - tone) / Math.PI) * (0.86 + R() * 0.24);
        c.beginPath();
        c.arc(x * cell, y * cell, r, 0, TAU);
        c.fill();
      }
    }
    c.globalCompositeOperation = 'destination-out';
    const n = Math.round(size * size / (RES * RES * 60));
    for (let k = 0; k < n; k++) {
      const s = (0.5 + R() * 1.3) * RES * (R() < 0.07 ? 2 : 1);
      c.globalAlpha = 0.25 + R() * 0.65;
      c.fillRect(R() * size, R() * size, s, s);
    }
    tiles.set(key, cv);
    return cv;
  }

  function createPatternCache(ctx) {
    const patterns = new Map();
    return function pattern(ink, tone) {
      const level = clamp(Math.round(tone * LEVELS), 1, LEVELS);
      const key = ink + level;
      let p = patterns.get(key);
      if (!p) {
        p = ctx.createPattern(screenTile(ink, level), 'repeat');
        if (p.setTransform) p.setTransform(new DOMMatrix().rotateSelf(ANGLE[ink]).scaleSelf(1 / RES));
        patterns.set(key, p);
      }
      return p;
    };
  }

  function ellipse(x, y, rx, ry, n = 18) {
    const pts = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
    return pts;
  }
  const circle = (x, y, r, n = 14) => ellipse(x, y, r, r, n);

  function createPen(c, seed, patternFn) {
    const R = rand(seed);
    const P = { c, R };

    function wobble(pts, closed, amp) {
      const out = [], n = pts.length, segs = closed ? n : n - 1;
      for (let s = 0; s < segs; s++) {
        const a = pts[s], b = pts[(s + 1) % n];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const steps = Math.max(1, Math.ceil(len / 8));
        const nx = -dy / len, ny = dx / len;
        for (let k = 0; k < steps; k++) {
          const t = k / steps, o = (R() - 0.5) * 2 * amp;
          out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
        }
      }
      if (!closed) out.push(pts[n - 1]);
      return out;
    }

    P.path = pts => {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
      c.closePath();
    };
    P.knock = pts => { c.globalCompositeOperation = 'source-over'; P.path(pts); c.fillStyle = '#fff'; c.fill(); };
    P.fill = (pts, ink, tone) => {
      if (tone <= 0.02) return;
      c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
      P.path(pts); c.fillStyle = patternFn(ink, tone); c.fill(); c.restore();
    };
    P.line = (pts, w = 1, ink = 'blue', closed = false, amp = 0.4) => {
      if (pts.length < 2) return;
      const q = wobble(pts, closed, amp);
      c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
      c.strokeStyle = rgba(INK[ink], 0.92); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(q[0][0], q[0][1]);
      for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
      if (closed) c.closePath(); c.stroke(); c.restore();
    };
    P.chalk = (pts, w = 1.6, closed = false) => {
      const q = wobble(pts, closed, 0.25);
      c.save(); c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#fff';
      c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(q[0][0], q[0][1]);
      for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
      if (closed) c.closePath(); c.stroke(); c.restore();
    };
    P.dot = (x, y, r, ink, tone, ry = 1) => P.fill(ellipse(x, y, r, r * ry, 12), ink, tone);
    P.paint = (pts, fills, k = 1, shade = 0) => {
      P.knock(pts);
      for (const [ink, tone] of fills) P.fill(pts, ink, Math.min(1, tone * k));
      if (shade) P.fill(pts, 'blue', shade);
    };
    P.shape = (pts, fills = [], o = {}) => {
      P.paint(pts, fills, 1, o.shade || 0);
      if (o.line !== false) P.line(pts, o.lw ?? 1, 'blue', true, o.amp ?? 0.38);
    };
    P.blob = (x, y, r, fills, o = {}) => {
      const pts = [], n = 11;
      for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = r * (0.82 + R() * 0.28); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.squash ?? 0.9)]); }
      P.shape(pts, fills, { lw: o.lw ?? 0.85, shade: o.shade || 0 });
    };
    P.limb = (x0, y0, x1, y1, w0, w1, fills) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      P.shape([[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], fills, { lw: 0.7, amp: 0.14 });
    };
    return P;
  }

  function applyNight(ctx, w, h) {
    let night = false;
    try { night = localStorage.getItem('theme') === 'night'; } catch (e) {}
    if (!night) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b9c0e0';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  return { INK, PAL, TAU, clamp, lerp, ease, hash, rand, ellipse, circle, createPatternCache, createPen, applyNight };
})();
