/**
 * Paper Sky - a sun, drifting riso clouds and a small flock of birds, plus a
 * little meadow of flowers and butterflies in the bottom corner,
 * printed with the same inks and screens as Paper Rooms.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('bg-sky');
    if (!canvas) return;
    const skyCtx = canvas.getContext('2d');
    const meadow = document.getElementById('bg-meadow');
    const meadowCtx = meadow ? meadow.getContext('2d') : null;
    let ctx = skyCtx;

    const INK = { blue: [46, 70, 130], coral: [236, 100, 80], sun: [255, 204, 46], teal: [0, 138, 136] };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const SHIFT = { blue: [0.3, -0.2], coral: [-0.4, 0.3], sun: [0.25, 0.45], teal: [-0.3, -0.4] };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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

    // ---------- halftone screens (same recipe as the rooms) ----------

    const LEVELS = 16, CELL = 2.4, CELLS = 8, RES = 5;
    const tiles = new Map(), patterns = new Map();

    function screenTile(ink, level) {
        const key = ink + level;
        if (tiles.has(key)) return tiles.get(key);
        const cell = CELL * RES, size = cell * CELLS, tone = level / LEVELS;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const R = rand(hash('screen', ink, level));
        c.fillStyle = rgba(INK[ink]);
        if (tone >= 1) c.fillRect(0, 0, size, size);
        else if (tone <= 0.5) {
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

    function pattern(ink, tone) {
        const level = clamp(Math.round(tone * LEVELS), 1, LEVELS), key = ink + level;
        if (!patterns.has(key)) {
            const p = ctx.createPattern(screenTile(ink, level), 'repeat');
            if (p.setTransform) p.setTransform(new DOMMatrix().rotateSelf(ANGLE[ink]).scaleSelf(1 / RES));
            patterns.set(key, p);
        }
        return patterns.get(key);
    }

    // ---------- marks ----------

    function wobble(R, pts, amp) {
        const out = [];
        for (let s = 0; s < pts.length - 1; s++) {
            const a = pts[s], b = pts[s + 1];
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
            const steps = Math.max(1, Math.ceil(len / 7)), nx = -dy / len, ny = dx / len;
            for (let k = 0; k < steps; k++) {
                const t = k / steps, o = (R() - 0.5) * 2 * amp;
                out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
            }
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    function line(R, pts, w, ink, amp = 0.45) {
        if (pts.length < 2) return;
        const q = wobble(R, pts, amp);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.translate(SHIFT[ink][0], SHIFT[ink][1]);
        ctx.strokeStyle = rgba(INK[ink], 0.92);
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(q[0][0], q[0][1]);
        for (let k = 1; k < q.length; k++) ctx.lineTo(q[k][0], q[k][1]);
        ctx.stroke();
        ctx.restore();
    }

    function fillPath(path, ink, tone) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.translate(SHIFT[ink][0], SHIFT[ink][1]);
        ctx.fillStyle = pattern(ink, tone);
        ctx.fill(path);
        ctx.restore();
    }

    // ---------- clouds ----------

    // each cloud is a cluster of puffs (dx, dy, r) relative to its anchor, flat along the bottom
    function makeCloud(seed, size) {
        const R = rand(seed), puffs = [], n = 4 + ((R() * 3) | 0);
        for (let k = 0; k < n; k++) {
            const u = n === 1 ? 0.5 : k / (n - 1), mid = 1 - Math.abs(u - 0.5) * 2;
            const r = size * (0.32 + mid * 0.38 + R() * 0.1);
            puffs.push([(u - 0.5) * size * 2.2, -r * 0.55 - mid * size * 0.18, r]);
        }
        return { puffs, size, seed };
    }

    const CLOUDS = [
        { cloud: makeCloud(11, 44), x: 0.6, y: 0.42, speed: 5 },
        { cloud: makeCloud(23, 28), x: 0.16, y: 0.26, speed: 7 },
        { cloud: makeCloud(37, 34), x: 0.9, y: 0.78, speed: 4 },
        { cloud: makeCloud(51, 20), x: 0.36, y: 0.66, speed: 6 },
        { cloud: makeCloud(64, 24), x: 0.78, y: 0.27, speed: 5.5 },
        { cloud: makeCloud(79, 17), x: 0.02, y: 0.72, speed: 8 },
        { cloud: makeCloud(93, 30), x: 0.42, y: 0.3, speed: 4.5 },
        { cloud: makeCloud(107, 26), x: 0.27, y: 0.55, speed: 6.5 },
        { cloud: makeCloud(121, 36), x: 0.69, y: 0.62, speed: 5 },
        { cloud: makeCloud(138, 19), x: 0.52, y: 0.2, speed: 7.5 },
    ];

    function cloudPath(cl, cx, cy) {
        const p = new Path2D();
        for (const [dx, dy, r] of cl.puffs) { p.moveTo(cx + dx + r, cy + dy); p.arc(cx + dx, cy + dy, r, 0, TAU); }
        const left = Math.min(...cl.puffs.map(q => q[0] - q[2] * 0.7)), right = Math.max(...cl.puffs.map(q => q[0] + q[2] * 0.7));
        p.rect(cx + left, cy - cl.size * 0.35, right - left, cl.size * 0.35);
        return p;
    }

    function inside(cl, cx, cy, x, y, skip) {
        for (let k = 0; k < cl.puffs.length; k++) {
            if (k === skip) continue;
            const [dx, dy, r] = cl.puffs[k];
            if (Math.hypot(x - cx - dx, y - cy - dy) < r - 0.5) return true;
        }
        return false;
    }

    function drawCloud(cl, cx, cy, boil) {
        const path = cloudPath(cl, cx, cy);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff';
        ctx.fill(path);
        ctx.restore();
        fillPath(path, 'blue', 0.07);
        // soft teal belly
        ctx.save();
        ctx.clip(path);
        const belly = new Path2D();
        belly.ellipse(cx, cy + cl.size * 0.05, cl.size * 1.5, cl.size * 0.32, 0, 0, TAU);
        fillPath(belly, 'teal', 0.18);
        ctx.restore();

        // outline: the visible arcs of each puff, plus the flat base
        const R = rand(hash('cloud', cl.seed, boil));
        cl.puffs.forEach(([dx, dy, r], k) => {
            let run = [];
            const steps = Math.max(18, Math.round(r * 0.9));
            for (let s = 0; s <= steps; s++) {
                const a = Math.PI + (s / steps) * Math.PI;
                const x = cx + dx + Math.cos(a) * r, y = cy + dy + Math.sin(a) * r;
                if (y <= cy && !inside(cl, cx, cy, x, y, k)) run.push([x, y]);
                else { if (run.length > 1) line(R, run, 1.1, 'blue', 0.35); run = []; }
            }
            if (run.length > 1) line(R, run, 1.1, 'blue', 0.35);
        });
        const left = Math.min(...cl.puffs.map(q => q[0] - q[2])), right = Math.max(...cl.puffs.map(q => q[0] + q[2]));
        line(R, [[cx + left + cl.size * 0.25, cy], [cx + right - cl.size * 0.25, cy]], 1.1, 'blue', 0.3);
        // a couple of white chalk highlights on the top puffs
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        const top = cl.puffs.reduce((a, b) => (b[1] - b[2] < a[1] - a[2] ? b : a));
        ctx.beginPath();
        ctx.arc(cx + top[0], cy + top[1], top[2] * 0.62, Math.PI * 1.15, Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
    }

    // ---------- sun ----------

    function arcPts(cx, cy, r, a0, a1, n = 48) {
        const pts = [];
        for (let k = 0; k <= n; k++) {
            const a = a0 + (a1 - a0) * (k / n);
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        return pts;
    }

    function drawSun(cx, cy, r, t, boil) {
        const R = rand(hash('sun', boil));
        const spin = t * 0.15;
        for (let k = 0; k < 12; k++) {
            const a = spin + (k / 12) * TAU, long = k % 2 === 0;
            const r0 = r * 1.28, r1 = r * (long ? 1.75 : 1.55);
            line(R, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], long ? 2 : 1.5, long ? 'coral' : 'sun', 0.2);
        }
        const disc = new Path2D();
        disc.arc(cx, cy, r, 0, TAU);
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fill(disc);
        ctx.restore();
        fillPath(disc, 'sun', 0.85);
        ctx.save();
        ctx.clip(disc);
        const warm = new Path2D();
        warm.arc(cx + r * 0.35, cy + r * 0.4, r * 0.85, 0, TAU);
        fillPath(warm, 'coral', 0.25);
        ctx.restore();
        line(R, arcPts(cx, cy, r, 0, TAU, 36), 1.2, 'coral', 0.35);
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.62, Math.PI * 1.1, Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
    }

    // ---------- night: moon and stars ----------

    const isNight = () => document.documentElement.classList.contains('night');

    const SR = rand(hash('stars'));
    const STARS = [];
    for (let k = 0; k < 90; k++) {
        STARS.push({ x: SR(), y: SR() * 0.95, s: SR() < 0.12 ? 2 : SR() < 0.5 ? 1 : 0, ph: SR() * TAU, sp: 0.6 + SR() * 1.6 });
    }

    function drawStars(t) {
        ctx.save();
        for (const st of STARS) {
            const x = st.x * w, y = st.y * h, tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
            ctx.globalAlpha = tw;
            if (st.s === 2) {
                const r = 4.5 + tw * 1.5;
                ctx.strokeStyle = '#ffe7a3';
                ctx.lineWidth = 1.3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
                ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
                ctx.stroke();
                ctx.fillStyle = '#fffaf0';
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, TAU);
                ctx.fill();
            } else {
                ctx.fillStyle = st.s ? '#fff4d6' : '#c9d2ff';
                ctx.beginPath();
                ctx.arc(x, y, st.s ? 1.3 : 0.9, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawMoon(cx, cy, r, boil) {
        const R = rand(hash('moon', boil));
        const disc = new Path2D();
        disc.arc(cx, cy, r, 0, TAU);
        ctx.save();
        ctx.fillStyle = '#fff6dc';
        ctx.fill(disc);
        ctx.restore();
        fillPath(disc, 'sun', 0.3);
        ctx.save();
        ctx.clip(disc);
        for (const [dx, dy, cr] of [[-0.35, 0.1, 0.2], [-0.1, 0.5, 0.13], [-0.55, -0.35, 0.12], [0.05, -0.15, 0.09]]) {
            const c = new Path2D();
            c.arc(cx + dx * r, cy + dy * r, cr * r, 0, TAU);
            fillPath(c, 'blue', 0.16);
        }
        ctx.restore();
        line(R, arcPts(cx, cy, r, 0, TAU, 36), 1.2, 'sun', 0.3);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx + r * 0.48, cy - r * 0.22, r * 0.86, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-over';
        const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.6);
        glow.addColorStop(0, 'rgba(255, 240, 200, 0.2)');
        glow.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
        ctx.restore();
    }

    // ---------- birds ----------

    const BIRDS = [
        { x: 0.40, y: 0.30, s: 1.0, ph: 0.0 },
        { x: 0.47, y: 0.22, s: 0.85, ph: 1.7 },
        { x: 0.53, y: 0.33, s: 0.8, ph: 3.1 },
        { x: 0.30, y: 0.50, s: 0.65, ph: 4.4 },
        { x: 0.58, y: 0.16, s: 0.6, ph: 2.3 },
    ];

    function drawBird(b, x, y, t, boil) {
        const R = rand(hash('bird', b.ph, boil));
        const span = 17 * b.s, flap = Math.sin(t * 6 + b.ph);
        const tip = -flap * 9 * b.s, elbow = -5 * b.s - flap * 3.5 * b.s;
        const ink = b.s > 0.75 ? 'blue' : 'teal';
        const lw = 1.9 * Math.max(0.8, b.s);
        line(R, [[x - span, y + tip], [x - span * 0.45, y + elbow], [x, y]], lw, ink, 0.25);
        line(R, [[x, y], [x + span * 0.45, y + elbow], [x + span, y + tip]], lw, ink, 0.25);
    }

    // ---------- meadow ----------

    function ellPts(cx, cy, rx, ry, rot, n = 20) {
        const c = Math.cos(rot), s = Math.sin(rot), pts = [];
        for (let k = 0; k <= n; k++) {
            const a = (k / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
            pts.push([cx + x * c - y * s, cy + x * s + y * c]);
        }
        return pts;
    }

    function blob(R, pts, ink, tone, outline = 'blue', lw = 1) {
        const p = new Path2D();
        p.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) p.lineTo(pts[k][0], pts[k][1]);
        p.closePath();
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fill(p);
        ctx.restore();
        fillPath(p, ink, tone);
        if (outline) line(R, pts, lw, outline, 0.25);
    }

    const MR = rand(hash('meadow'));
    const KINDS = ['daisy', 'bloom', 'tulip', 'cup'];
    const FLOWERS = [];
    for (let k = 0; k < 17; k++) {
        const kind = KINDS[k % 4];
        FLOWERS.push({
            fx: 0.14 + (k / 16) * 0.82 + (MR() - 0.5) * 0.06,
            base: 4 + MR() * 18,
            tall: 0.24 + MR() * 0.36,
            r: kind === 'cup' ? 6.5 + MR() * 2.5 : 11 + MR() * 5,
            kind,
            ink: kind === 'tulip' ? (MR() < 0.6 ? 'coral' : 'sun') : kind === 'bloom' ? (MR() < 0.5 ? 'coral' : 'blue') : 'sun',
            leaf: MR() < 0.7 ? (MR() < 0.5 ? -1 : 1) : 0,
            ph: MR() * TAU,
        });
    }
    FLOWERS.sort((a, b) => a.base - b.base);
    const GRASS = [];
    for (let k = 0; k < 220; k++) {
        GRASS.push({ fx: 0.16 + MR() * 0.84, len: 16 + MR() * 34, lean: (MR() - 0.5) * 12, ink: MR() < 0.75 ? 'teal' : 'blue', back: MR() < 0.5 });
    }
    const BUTTERFLIES = [
        { ink: 'coral', ax: 0.6, ay: 0.36, rx: 0.24, ry: 0.14, sp: 0.21, ph: 0.4, s: 1.6 },
        { ink: 'sun', ax: 0.45, ay: 0.28, rx: 0.18, ry: 0.12, sp: 0.27, ph: 2.6, s: 1.3 },
        { ink: 'blue', ax: 0.8, ay: 0.42, rx: 0.12, ry: 0.16, sp: 0.18, ph: 4.9, s: 1.15 },
    ];

    function drawFlower(f, x, y, sway, u, boil) {
        const R = rand(hash('flower', f.ph, boil));
        const hx = x + sway, hy = y - f.tall * mh, r = f.r * u;
        line(R, [[x, y], [x + sway * 0.3, y - f.tall * mh * 0.5], [hx, hy]], 1.8 * u, 'teal', 0.2);
        if (f.leaf) {
            const lx = x + sway * 0.15, ly = y - f.tall * mh * 0.3;
            blob(R, ellPts(lx + f.leaf * 9 * u, ly, 10 * u, 3.6 * u, f.leaf * -0.5, 14), 'teal', 0.55, 'teal');
            blob(R, ellPts(lx - f.leaf * 7 * u, ly + 9 * u, 8 * u, 3 * u, f.leaf * 0.5, 14), 'teal', 0.45, 'teal');
        }
        if (f.kind === 'daisy') {
            for (let k = 0; k < 8; k++) {
                const a = (k / 8) * TAU + f.ph;
                blob(R, ellPts(hx + Math.cos(a) * r * 0.62, hy + Math.sin(a) * r * 0.62, r * 0.55, r * 0.24, a, 12), 'blue', 0.05);
            }
            blob(R, ellPts(hx, hy, r * 0.36, r * 0.36, 0, 14), 'sun', 0.85);
        } else if (f.kind === 'bloom') {
            for (let k = 0; k < 5; k++) {
                const a = (k / 5) * TAU + f.ph;
                blob(R, ellPts(hx + Math.cos(a) * r * 0.5, hy + Math.sin(a) * r * 0.5, r * 0.45, r * 0.45, 0, 14), f.ink, f.ink === 'blue' ? 0.35 : 0.55);
            }
            blob(R, ellPts(hx, hy, r * 0.3, r * 0.3, 0, 12), 'sun', 0.9);
        } else if (f.kind === 'tulip') {
            const cup = [[-1, -0.2], [-0.95, -1.15], [-0.4, -0.65], [0, -1.3], [0.4, -0.65], [0.95, -1.15], [1, -0.2], [0.6, 0.7], [-0.6, 0.7], [-1, -0.2]]
                .map(([a, b]) => [hx + a * r * 0.75, hy + b * r * 0.75]);
            blob(R, cup, f.ink, f.ink === 'sun' ? 0.8 : 0.6);
            line(R, [[hx, hy + r * 0.5], [hx, hy - r * 0.5]], 0.9, f.ink === 'sun' ? 'coral' : 'blue', 0.2);
        } else {
            blob(R, ellPts(hx, hy, r, r * 0.9, 0, 14), 'sun', 0.75);
            blob(R, ellPts(hx - r * 0.3, hy - r * 0.3, r * 0.3, r * 0.22, 0, 8), 'sun', 0.25, null);
        }
    }

    function drawButterfly(b, t, u, boil) {
        const R = rand(hash('butterfly', b.ph, boil));
        const a = t * b.sp + b.ph;
        const x = mw * (b.ax + b.rx * Math.sin(a)), y = mh * (b.ay + b.ry * Math.sin(a * 1.7 + b.ph));
        const dir = Math.cos(a) >= 0 ? 1 : -1, fw = 0.25 + 0.75 * Math.abs(Math.sin(t * 9 + b.ph)), s = b.s * u;
        ctx.save();
        ctx.translate(x, y + Math.sin(t * 4 + b.ph) * 2 * u);
        ctx.rotate(dir * 0.25);
        const tone = b.ink === 'sun' ? 0.8 : b.ink === 'blue' ? 0.4 : 0.6;
        for (const side of [-1, 1]) {
            blob(R, ellPts(side * 6 * s * fw, -3 * s, 6.5 * s * fw, 5.5 * s, side * -0.5, 14), b.ink, tone);
            blob(R, ellPts(side * 4.5 * s * fw, 3.5 * s, 4.5 * s * fw, 3.6 * s, side * 0.5, 12), b.ink, tone * 0.75);
        }
        line(R, [[0, -5 * s], [0, 5 * s]], 2 * u, 'blue', 0.15);
        line(R, [[0, -5 * s], [-2.5 * s, -9 * s]], 0.8, 'blue', 0.15);
        line(R, [[0, -5 * s], [2.5 * s, -9 * s]], 0.8, 'blue', 0.15);
        ctx.restore();
    }

    function drawMeadow(t, boil) {
        const u = clamp(mw / 480, 0.8, 1.2);
        const wind = x => Math.sin(t * 1.4 + x * 0.03) * 3 * u;
        const R = rand(hash('ground', boil));
        // keep clear of the house: plants rooted or blooming over it are skipped, the rest is trimmed
        const rooms = window.paperRooms && window.paperRooms.outlines ? window.paperRooms.outlines() : [];
        const cut = new Path2D();
        for (const pts of rooms) {
            pts.forEach(([x, y], k) => (k ? cut.lineTo(x - mx, y - my) : cut.moveTo(x - mx, y - my)));
            cut.closePath();
        }
        ctx.lineWidth = MARGIN;
        ctx.lineJoin = 'round';
        const clear = (x, y) => !rooms.length || !(ctx.isPointInPath(cut, x * dpr, y * dpr) || ctx.isPointInStroke(cut, x * dpr, y * dpr));

        for (const g of GRASS) if (g.back) {
            const x = g.fx * mw, y = mh + 2, sw = wind(x), len = (g.len + 14) * u;
            if (!clear(x, y) || !clear(x, y - len)) continue;
            line(R, [[x, y], [x + (g.lean + sw) * 0.35 * u, y - len * 0.55], [x + (g.lean + sw) * u, y - len]], 1.4, g.ink, 0.15);
        }
        for (const f of FLOWERS) {
            const x = f.fx * mw, y = mh - f.base * u;
            if (!clear(x, y) || !clear(x - f.r * u, y - f.tall * mh - f.r * u)) continue;
            drawFlower(f, x, y, wind(x), u, boil);
        }
        for (const g of GRASS) if (!g.back) {
            const x = g.fx * mw, y = mh + 2, sw = wind(x);
            const len = g.len * 0.75 * u;
            if (!clear(x, y) || !clear(x, y - len)) continue;
            line(R, [[x, y], [x + (g.lean + sw) * 0.35 * u, y - len * 0.55], [x + (g.lean + sw) * u, y - len]], 1.5, g.ink, 0.15);
        }
        if (rooms.length) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = MARGIN;
            ctx.lineJoin = 'round';
            ctx.fill(cut, 'nonzero');
            ctx.stroke(cut);
            ctx.restore();
        }
        for (const b of BUTTERFLIES) drawButterfly(b, t, u, boil);
        if (isNight()) drawFireflies(t);
    }
    const MARGIN = 24;

    const FIREFLIES = [];
    for (let k = 0; k < 14; k++) FIREFLIES.push({ ax: 0.25 + MR() * 0.72, ay: 0.3 + MR() * 0.6, ph: MR() * TAU, sp: 0.25 + MR() * 0.35 });

    function drawFireflies(t) {
        ctx.save();
        for (const f of FIREFLIES) {
            const x = mw * (f.ax + 0.05 * Math.sin(t * f.sp + f.ph)), y = mh * (f.ay + 0.06 * Math.sin(t * f.sp * 1.6 + f.ph * 2));
            const glow = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.7 + f.ph * 3));
            const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
            g.addColorStop(0, `rgba(255, 236, 140, ${0.75 * glow})`);
            g.addColorStop(1, 'rgba(255, 236, 140, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 7, y - 7, 14, 14);
            ctx.fillStyle = `rgba(255, 250, 210, ${glow})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.3, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    // ---------- loop ----------

    let w = 1, h = 1, dpr = 1, mw = 1, mh = 1, mx = 0, my = 0;
    function resize() {
        const r = canvas.getBoundingClientRect();
        w = Math.max(1, r.width);
        h = Math.max(1, r.height);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        if (meadow) {
            const m = meadow.getBoundingClientRect();
            mw = Math.max(1, m.width);
            mh = Math.max(1, m.height);
            mx = m.left;
            my = m.top;
            meadow.width = Math.round(mw * dpr);
            meadow.height = Math.round(mh * dpr);
        }
    }
    window.addEventListener('resize', resize);
    resize();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let last = 0;

    function draw(now) {
        const t = reduced ? 0 : (now - t0) / 1000, boil = Math.floor(t * 4);
        if (meadowCtx) {
            ctx = meadowCtx;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, meadow.width, meadow.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawMeadow(t, boil);
            ctx = skyCtx;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const unit = Math.min(1.25, Math.max(0.9, w / 380));

        const night = isNight();
        const orbR = Math.min(22 * unit, h * 0.17);
        if (night) {
            drawStars(t);
            drawMoon(w * 0.87, h * 0.42, orbR, boil);
        } else {
            drawSun(w * 0.87, h * 0.42, orbR, t, boil);
        }

        const span = w + 220;
        const layers = CLOUDS.map(c => ({ c, x: span - ((((1 - c.x) * w + t * c.speed) % span + span) % span) - 110, y: c.y * h }))
            .sort((a, b) => a.c.cloud.size - b.c.cloud.size);
        ctx.globalAlpha = night ? 0.32 : 1;
        for (const { c, x, y } of layers) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(unit, unit);
            drawCloud(c.cloud, 0, 0, boil);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        if (night) return;

        const flockSpan = w + 160;
        const drift = t * 14;
        for (const b of BIRDS) {
            const x = flockSpan - ((((1 - b.x) * Math.min(w, 520) + drift) % flockSpan + flockSpan) % flockSpan) - 80;
            const y = b.y * h + Math.sin(t * 0.9 + b.ph) * 4;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(unit, unit);
            drawBird(b, 0, 0, t, boil);
            ctx.restore();
        }
    }

    function frame(now) {
        requestAnimationFrame(frame);
        if (now - last < 33) return;
        if (document.body.classList.contains('inside')) return;
        last = now;
        draw(now);
    }
    requestAnimationFrame(frame);
})();
