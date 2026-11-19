'use strict';

/*
 * Isometric pixel-art 3D software rasterizer for PixelPlays mini-games.
 */

const W = 400, H = 264;
const SCALE = 9.5;
const R2 = Math.SQRT2;
const SIN = 0.5, COS = Math.sqrt(3) / 2;

const SCENE = window.PP_SCENE || {};
const ORIGIN_X = W / 2 + (SCENE.originX || 0);
const ORIGIN_Y = H / 2 + (SCENE.originY || 0);
const SHADOW_X = SCENE.shadowX ?? 0.9;
const SHADOW_Y = SCENE.shadowY ?? -0.6;

const canvas = document.getElementById('c');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const image = ctx.createImageData(W, H);
const pix = new Uint32Array(image.data.buffer);
const zb = new Float32Array(W * H);
const ground = new Uint8Array(W * H);
const groundZ = new Float32Array(W * H);
const kinds = new Uint8Array(W * H);
const bakedPix = new Uint32Array(W * H);
const bakedZ = new Float32Array(W * H);
const shadowMask = new Float32Array(W * H);
const staticShadow = new Float32Array(W * H);
const pendingShadows = [];

const KIND_GRASS = 3;
const GRASS = [[98, 128, 72], [112, 142, 80], [126, 156, 88], [142, 170, 96]];
const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const WIND_FPS = 6;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

function rgb(r, g, b) {
  const R = clamp(r | 0, 0, 255);
  const G = clamp(g | 0, 0, 255);
  const B = clamp(b | 0, 0, 255);
  return ((255 << 24) | (B << 16) | (G << 8) | R) >>> 0;
}

const INK = rgb(28, 27, 25);
const PAPER = rgb(255, 255, 255);
const SIGNAL = rgb(246, 214, 52);

function hash(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];
function bayerAt(ix, iy) {
  return BAYER[((iy & 3) << 2) | (ix & 3)] / 16;
}

const _ramps = new Map();
function rampOf(col) {
  const key = (col[0] << 16) | (col[1] << 8) | col[2];
  let r = _ramps.get(key);
  if (r) return r;
  r = [0.58, 0.76, 0.94, 1.08, 1.22].map(k =>
    rgb(col[0] * k, col[1] * k, col[2] * k)
  );
  _ramps.set(key, r);
  return r;
}

function project(x, y, z) {
  const u = (x - y) / R2;
  const v = (x + y) / R2;
  return {
    sx: ORIGIN_X + u * SCALE,
    sy: ORIGIN_Y + (v * SIN - z * COS) * SCALE,
    d: v * COS + z * SIN,
  };
}

function unproject(sx, sy) {
  const u = (sx - ORIGIN_X) / SCALE;
  const v = (sy - ORIGIN_Y) / (SCALE * SIN);
  return {
    x: (u + v) * R2 * 0.5,
    y: (v - u) * R2 * 0.5,
  };
}

function plot(x, y, z, color) {
  const p = project(x, y, z);
  const ix = p.sx | 0, iy = p.sy | 0;
  if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  const i = iy * W + ix;
  if (p.d >= zb[i]) {
    zb[i] = p.d;
    pix[i] = color;
  }
}

function drawDots(pts, color) {
  for (let k = 0; k < pts.length; k++) {
    const ix = pts[k][0] | 0, iy = pts[k][1] | 0;
    if (ix >= 0 && iy >= 0 && ix < W && iy < H) pix[iy * W + ix] = color;
  }
}

// Sun direction (upper-left-front)
const LX = -0.58, LY = 0.42, LZ = 0.7;

function shadeColor(col, ndl, material, ix, iy) {
  let k = 0.62 + clamp(ndl, -0.3, 1) * 0.45;
  if (material === 'gloss' && ndl > 0.72) k += (ndl - 0.72) * 0.9;
  const d = (bayerAt(ix, iy) - 0.5) * 0.06;
  return rgb(col[0] * (k + d), col[1] * (k + d), col[2] * (k + d));
}

function box(x0, y0, z0, x1, y1, z1, col, seed = 0) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
  const ay = Math.min(y0, y1), by = Math.max(y0, y1);
  const az = Math.min(z0, z1), bz = Math.max(z0, z1);
  const step = 0.055;

  // Top face (z = bz)
  for (let x = ax; x <= bx; x += step) {
    for (let y = ay; y <= by; y += step) {
      const p = project(x, y, bz);
      const ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (p.d >= zb[i]) {
        zb[i] = p.d;
        const n = (hash(ix + seed, iy) - 0.5) * 0.06;
        pix[i] = rgb(col[0] * (1.08 + n), col[1] * (1.08 + n), col[2] * (1.08 + n));
      }
    }
  }
  // +X face (facing front-right)
  for (let y = ay; y <= by; y += step) {
    for (let z = az; z <= bz; z += step) {
      const p = project(bx, y, z);
      const ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (p.d >= zb[i]) {
        zb[i] = p.d;
        const n = (hash(ix + seed, iy) - 0.5) * 0.06;
        pix[i] = rgb(col[0] * (0.76 + n), col[1] * (0.76 + n), col[2] * (0.76 + n));
      }
    }
  }
  // +Y face (facing front-left)
  for (let x = ax; x <= bx; x += step) {
    for (let z = az; z <= bz; z += step) {
      const p = project(x, by, z);
      const ix = p.sx | 0, iy = p.sy | 0;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (p.d >= zb[i]) {
        zb[i] = p.d;
        const n = (hash(ix + seed, iy) - 0.5) * 0.06;
        pix[i] = rgb(col[0] * (0.9 + n), col[1] * (0.9 + n), col[2] * (0.9 + n));
      }
    }
  }
}

function sphere(x, y, z, r, col, material = 'solid') {
  const c = project(x, y, z);
  const pr = Math.max(1, r * SCALE);
  const x0 = Math.max(0, Math.floor(c.sx - pr));
  const x1 = Math.min(W - 1, Math.ceil(c.sx + pr));
  const y0 = Math.max(0, Math.floor(c.sy - pr));
  const y1 = Math.min(H - 1, Math.ceil(c.sy + pr));
  const r2 = pr * pr;
  for (let iy = y0; iy <= y1; iy++) {
    const dy = (iy + 0.5) - c.sy;
    for (let ix = x0; ix <= x1; ix++) {
      const dx = (ix + 0.5) - c.sx;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const nz = Math.sqrt(Math.max(0, r2 - d2)) / pr;
      const nx = dx / pr, ny = -dy / pr;
      const depth = c.d + nz * r;
      const i = iy * W + ix;
      if (depth >= zb[i]) {
        zb[i] = depth;
        const ndl = nx * -0.45 + ny * 0.65 + nz * 0.6;
        pix[i] = shadeColor(col, ndl, material, ix, iy);
      }
    }
  }
}

function capsule(p0, p1, r0, r1, colorFn, material = 'solid') {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
  const len = Math.hypot(dx, dy, dz);
  const steps = Math.max(1, Math.ceil(len * SCALE * 1.4));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = p0[0] + dx * t, y = p0[1] + dy * t, z = p0[2] + dz * t;
    const r = lerp(r0, r1, t);
    const col = typeof colorFn === 'function' ? colorFn(t) : colorFn;
    sphere(x, y, z, r, col, material);
  }
}

function dynamicAdd(p0, p1, r0, r1, colorFn) {
  capsule(p0, p1, r0, r1, colorFn, 'solid');
  const mx = (p0[0] + p1[0]) * 0.5;
  const my = (p0[1] + p1[1]) * 0.5;
  const mz = (p0[2] + p1[2]) * 0.5;
  castShadow(mx, my, mz, Math.max(r0, r1) * 1.15, 0.85, 0.2);
}

function figure(x, y, yaw, pose, pal, addFn) {
  const s = pose.scale || 1;
  const z0 = pose.z || 0;
  const crouch = pose.crouch || 0;
  const lean = pose.lean || 0;
  const stance = pose.stance || 0.16;
  const armR = pose.armR ?? 0.3;
  const armL = pose.armL ?? 0.3;

  const fx = Math.cos(yaw), fy = Math.sin(yaw);
  const rx = fy, ry = -fx; // right-hand side vector

  const hipZ = z0 + (0.92 - crouch * 0.28) * s;
  const shZ = hipZ + 0.58 * s;
  const leanD = lean * 0.22 * s;

  const hip = [x, y, hipZ];
  const shC = [x + fx * leanD, y + fy * leanD, shZ];

  // Legs
  const footSpread = stance * s;
  const footL = [x - rx * 0.16 * s - fx * footSpread, y - ry * 0.16 * s - fy * footSpread, z0 + 0.08 * s];
  const footR = [x + rx * 0.16 * s + fx * footSpread, y + ry * 0.16 * s + fy * footSpread, z0 + 0.08 * s];
  const hipL = [hip[0] - rx * 0.13 * s, hip[1] - ry * 0.13 * s, hipZ];
  const hipR = [hip[0] + rx * 0.13 * s, hip[1] + ry * 0.13 * s, hipZ];
  addFn(footL, hipL, 0.1 * s, 0.12 * s, () => pal.legs);
  addFn(footR, hipR, 0.1 * s, 0.12 * s, () => pal.legs);

  // Torso (with chest stripe)
  addFn(hip, shC, 0.21 * s, 0.23 * s, t => (t > 0.35 && t < 0.68 ? pal.stripe : pal.shirt));

  // Head + hair cap
  const head = [shC[0] + fx * 0.04 * s, shC[1] + fy * 0.04 * s, shZ + 0.34 * s];
  sphere(head[0], head[1], head[2], 0.22 * s, pal.skin, 'solid');
  sphere(head[0] - fx * 0.04 * s, head[1] - fy * 0.04 * s, head[2] + 0.08 * s, 0.21 * s, pal.hair, 'solid');

  // Arms
  const shL = [shC[0] - rx * 0.27 * s, shC[1] - ry * 0.27 * s, shZ - 0.03 * s];
  const shR = [shC[0] + rx * 0.27 * s, shC[1] + ry * 0.27 * s, shZ - 0.03 * s];
  const armLen = 0.58 * s;

  const handL = [
    shL[0] + (fx * Math.sin(armL) - rx * 0.12) * armLen,
    shL[1] + (fy * Math.sin(armL) - ry * 0.12) * armLen,
    shL[2] - Math.cos(armL) * armLen,
  ];
  const handR = [
    shR[0] + (fx * Math.sin(armR) + rx * 0.12) * armLen,
    shR[1] + (fy * Math.sin(armR) + ry * 0.12) * armLen,
    shR[2] - Math.cos(armR) * armLen,
  ];

  addFn(shL, handL, 0.095 * s, 0.08 * s, t => (t < 0.45 ? pal.shirt : pal.skin));
  addFn(shR, handR, 0.095 * s, 0.08 * s, t => (t < 0.45 ? pal.shirt : pal.skin));

  castShadow(x, y, z0, 0.48 * s, 1, 0.2);
  return handR;
}

// ---------- Vegetation ----------

const _tufts = [];
function growGrass() {
  _tufts.length = 0;
  for (let iy = 1; iy < H - 1; iy++) {
    for (let ix = 1; ix < W - 1; ix++) {
      const i = iy * W + ix;
      if (kinds[i] !== KIND_GRASS) continue;
      if (hash(ix * 3, iy * 5) > 0.045) continue;
      const col = GRASS[clamp(Math.floor(hash(ix, iy) * 4), 0, 3)];
      _tufts.push({ ix, iy, h: 1 + (hash(ix + 7, iy + 13) > 0.55 ? 1 : 0), phase: hash(ix, iy + 9) * 6.283, col: rgb(col[0] * 0.9, col[1] * 0.95, col[2] * 0.85), d: zb[i] + 0.05 });
    }
  }
}

function drawTufts(windT) {
  for (let k = 0; k < _tufts.length; k++) {
    const t = _tufts[k];
    const sway = Math.round(Math.sin(windT * 2.2 + t.phase + t.ix * 0.04) * 0.65);
    for (let h = 1; h <= t.h; h++) {
      const ix = t.ix + (h === t.h ? sway : 0);
      const iy = t.iy - h;
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (t.d >= zb[i]) {
        zb[i] = t.d;
        pix[i] = t.col;
      }
    }
  }
}

const _leaves = [];
function growTree(x, y, scale = 1, count = 260, seed = 100) {
  const trunk = [108, 78, 54];
  const h = 3.2 * scale;
  capsule([x, y, 0], [x + 0.1 * scale, y - 0.08 * scale, h * 0.68], 0.34 * scale, 0.2 * scale, () => trunk);
  capsule([x + 0.05 * scale, y - 0.04 * scale, h * 0.52], [x - 0.8 * scale, y + 0.5 * scale, h * 0.92], 0.16 * scale, 0.08 * scale, () => trunk);
  capsule([x + 0.08 * scale, y - 0.06 * scale, h * 0.58], [x + 0.85 * scale, y - 0.4 * scale, h * 0.96], 0.15 * scale, 0.08 * scale, () => trunk);
  castShadow(x, y, 0.6, 1.9 * scale, 0.9, 0.4);

  const leafTones = [[58, 92, 52], [74, 112, 60], [92, 132, 68], [116, 150, 78]];
  const cx = x, cy = y, cz = h * 1.05;
  const r = 1.95 * scale;
  const clusters = Math.max(18, Math.round(count / 7));
  for (let k = 0; k < clusters; k++) {
    const a = hash(seed + k, 1) * 6.283;
    const u = Math.pow(hash(seed + k, 2), 0.55) * r;
    const dz = (hash(seed + k, 3) - 0.42) * r * 1.15;
    const lx = cx + Math.cos(a) * u;
    const ly = cy + Math.sin(a) * u;
    const lz = cz + dz;
    const toneIdx = clamp(Math.floor(((lz - (cz - r * 0.6)) / (r * 1.3)) * 3.5 + (hash(seed + k, 4) - 0.5)), 0, 3);
    _leaves.push({
      x: lx, y: ly, z: lz,
      r: (0.28 + hash(seed + k, 5) * 0.26) * scale,
      col: leafTones[toneIdx],
      phase: hash(seed + k, 6) * 6.283,
    });
  }
}

function drawLeaves(windT) {
  for (let k = 0; k < _leaves.length; k++) {
    const l = _leaves[k];
    const sw = Math.sin(windT * 1.9 + l.phase) * 0.06;
    sphere(l.x + sw, l.y + sw * 0.5, l.z, l.r, l.col, 'solid');
  }
}

// ---------- Shadows & edges ----------

function castShadow(x, y, z, r, strength = 1, soft = 0.2) {
  pendingShadows.push({ x, y, z, r, strength, soft });
}

function flushShadows() {
  shadowMask.set(staticShadow);
  for (let k = 0; k < pendingShadows.length; k++) {
    const s = pendingShadows[k];
    const gx = s.x + s.z * SHADOW_X;
    const gy = s.y + s.z * SHADOW_Y;
    const p = project(gx, gy, 0);
    const rx = Math.max(1, s.r * SCALE * 1.05);
    const ry = Math.max(1, rx * 0.52);
    const x0 = Math.max(0, Math.floor(p.sx - rx));
    const x1 = Math.min(W - 1, Math.ceil(p.sx + rx));
    const y0 = Math.max(0, Math.floor(p.sy - ry));
    const y1 = Math.min(H - 1, Math.ceil(p.sy + ry));
    const amt = clamp(0.28 * s.strength, 0.05, 0.45);
    for (let iy = y0; iy <= y1; iy++) {
      const dy = (iy + 0.5 - p.sy) / ry;
      for (let ix = x0; ix <= x1; ix++) {
        const dx = (ix + 0.5 - p.sx) / rx;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const i = iy * W + ix;
        if (!ground[i]) continue;
        const fall = d2 > 0.65 ? (1 - d2) / 0.35 : 1;
        const v = amt * fall;
        if (v > shadowMask[i]) shadowMask[i] = v;
      }
    }
  }
}

function bakeOcclusion() {
  for (let iy = 1; iy < H - 1; iy++) {
    for (let ix = 1; ix < W - 1; ix++) {
      const i = iy * W + ix;
      if (!ground[i]) continue;
      const d = zb[i];
      if (zb[i - W] - d > 0.4 || zb[i - 1] - d > 0.4) {
        if (shadowMask[i] < 0.14) shadowMask[i] = 0.14;
      }
    }
  }
}

function applyShadows(refZ) {
  for (let i = 0; i < W * H; i++) {
    const sh = shadowMask[i];
    if (sh <= 0.01) continue;
    if (zb[i] > refZ[i] + 0.12) continue;
    const c = pix[i];
    const k = 1 - sh;
    pix[i] = rgb((c & 255) * k, ((c >> 8) & 255) * k, ((c >> 16) & 255) * (k + sh * 0.14));
  }
}

function shadeEdges() {
  for (let iy = 1; iy < H - 1; iy++) {
    for (let ix = 1; ix < W - 1; ix++) {
      const i = iy * W + ix;
      const d = zb[i];
      if (d <= -1e8) continue;
      if (d - zb[i + 1] > 0.65 || d - zb[i + W] > 0.65) {
        const c = pix[i];
        pix[i] = rgb((c & 255) * 0.84, ((c >> 8) & 255) * 0.84, ((c >> 16) & 255) * 0.86);
      }
    }
  }
}

function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const s = Math.min(vw / W, vh / H);
  const scale = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = Math.round(W * scale) + 'px';
  canvas.style.height = Math.round(H * scale) + 'px';
}
