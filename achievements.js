/**
 * Patents & Achievements — an interactive risograph isometric courtyard & gallery
 * in the exact print style of houses.js, ucl.js, and skills.js.
 * Four living stations: Solar Itinerant Cart (Granted Patent), Biodegradable Planting Pots,
 * Awards & FRAS Gallery (Bal Puraskar, FRAS, Philately, Books), and NASA Wallops Sounding Rocket.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('achievements-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const INK = { blue: [46, 70, 130], coral: [236, 100, 80], sun: [255, 204, 46], teal: [0, 138, 136] };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const SHIFT = { blue: [0.3, -0.2], coral: [-0.4, 0.3], sun: [0.25, 0.45], teal: [-0.3, -0.4] };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const GREEN = [['teal', 0.72], ['sun', 0.55]];
    const LEAF = [['teal', 0.5], ['sun', 0.8]];
    const WOOD = [['coral', 0.45], ['sun', 0.48]];
    const WOOD_DK = [['coral', 0.55], ['blue', 0.28]];
    const RED = [['coral', 0.9], ['blue', 0.16]];
    const GOLD = [['sun', 0.92], ['coral', 0.24]];
    const STONE = [['sun', 0.22], ['coral', 0.09], ['blue', 0.06]];
    const SOLAR = [['blue', 0.82], ['teal', 0.35]];
    const WALL = [['sun', 0.16], ['coral', 0.08]];

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
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
        const R = rand(hash('ach', ink, level));
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

    const patterns = new Map();
    function pattern(ink, tone) {
        const level = clamp(Math.round(tone * LEVELS), 1, LEVELS);
        const key = ink + level;
        let p = patterns.get(key);
        if (!p) {
            p = ctx.createPattern(screenTile(ink, level), 'repeat');
            if (p.setTransform) p.setTransform(new DOMMatrix().rotateSelf(ANGLE[ink]).scaleSelf(1 / RES));
            patterns.set(key, p);
        }
        return p;
    }

    function Pen(c, seed) {
        const R = rand(seed);
        const P = { c, R };
        function wobble(pts, closed, amp) {
            const out = [], n = pts.length, segs = closed ? n : n - 1;
            for (let s = 0; s < segs; s++) {
                const a = pts[s], b = pts[(s + 1) % n];
                const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
                const steps = Math.max(1, Math.ceil(len / 7));
                const nx = -dy / len, ny = dx / len;
                for (let k = 0; k < steps; k++) {
                    const t = k / steps, o = (R() - 0.5) * 2 * amp;
                    out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
                }
            }
            if (!closed) out.push(pts[n - 1]);
            return out;
        }
        P.path = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); };
        P.knock = pts => { c.globalCompositeOperation = 'source-over'; P.path(pts); c.fillStyle = '#fff'; c.fill(); };
        P.fill = (pts, ink, tone) => {
            if (tone <= 0.02) return;
            c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            P.path(pts); c.fillStyle = pattern(ink, tone); c.fill(); c.restore();
        };
        P.line = (pts, w = 1, ink = 'blue', closed = false, amp = 0.38) => {
            if (pts.length < 2) return;
            const q = wobble(pts, closed, amp);
            c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            c.strokeStyle = rgba(INK[ink], 0.92); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(q[0][0], q[0][1]);
            for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
            if (closed) c.closePath(); c.stroke(); c.restore();
        };
        P.chalk = (pts, w = 1.4, closed = false) => {
            const q = wobble(pts, closed, 0.22);
            c.save(); c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#fff';
            c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(q[0][0], q[0][1]);
            for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
            if (closed) c.closePath(); c.stroke(); c.restore();
        };
        P.dot = (x, y, r, ink, tone, ry = 1) => P.fill(ellipse(x, y, r, r * ry, 12), ink, tone);
        P.pool = (x, y, r, ink, a) => {
            c.save(); c.globalCompositeOperation = 'multiply'; c.translate(x, y); c.scale(1, 0.5);
            const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, rgba(INK[ink], a)); g.addColorStop(1, rgba(INK[ink], 0));
            c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.restore();
        };
        return P;
    }

    const TW = 44, TH = 22, TZ = 24;
    const iso = (i, j, z = 0) => [(i - j) * TW / 2, (i + j) * TH / 2 - z * TZ];
    const flat = (i, j, z, w, d) => [iso(i, j, z), iso(i + w, j, z), iso(i + w, j + d, z), iso(i, j + d, z)];
    const faceL = (i, j, z, w, d, h) => [iso(i, j + d, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i, j + d, z + h)];
    const faceR = (i, j, z, w, d, h) => [iso(i + w, j, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i + w, j, z + h)];
    const onBack = (i0, i1, z0, z1, j = 0) => [iso(i0, j, z0), iso(i1, j, z0), iso(i1, j, z1), iso(i0, j, z1)];
    const onLeft = (j0, j1, z0, z1, i = 0) => [iso(i, j0, z0), iso(i, j1, z0), iso(i, j1, z1), iso(i, j0, z1)];

    function ellipse(x, y, rx, ry, n = 18) {
        const pts = [];
        for (let k = 0; k < n; k++) { const a = k / n * TAU; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
        return pts;
    }
    const circle = (x, y, r, n = 14) => ellipse(x, y, r, r, n);

    function paint(P, pts, fills, k, shade) {
        P.knock(pts);
        for (const [ink, tone] of fills) P.fill(pts, ink, Math.min(1, tone * k));
        if (shade) P.fill(pts, 'blue', shade);
    }
    function shape(P, pts, fills = [], o = {}) {
        paint(P, pts, fills, 1, o.shade || 0);
        if (o.line !== false) P.line(pts, o.lw ?? 0.9, 'blue', true, o.amp ?? 0.36);
    }
    function block(P, i, j, z, w, d, h, fills = [], o = {}) {
        const L = faceL(i, j, z, w, d, h), Rf = faceR(i, j, z, w, d, h), T = flat(i, j, z + h, w, d);
        const s = o.shade ?? 1;
        paint(P, L, fills, 0.85, 0.1 * s);
        paint(P, Rf, fills, 1, 0.25 * s);
        paint(P, T, o.top || fills, 0.58, 0);
        const lw = o.lw ?? 0.88;
        P.line(L, lw, 'blue', true);
        P.line(Rf, lw, 'blue', true);
        P.line(T, lw, 'blue', true);
    }
    function cyl(P, i, j, z, r, h, fills = [], o = {}) {
        const [cx, cy] = iso(i, j, z);
        const rx = r * 1.414 * TW / 2, ry = r * 1.414 * TH / 2, hh = h * TZ;
        const body = [];
        for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; body.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
        for (let k = 0; k <= 12; k++) { const a = Math.PI + Math.PI * k / 12; body.push([cx + Math.cos(a) * rx, cy - hh + Math.sin(a) * ry]); }
        shape(P, body, fills, { shade: o.shade ?? 0.15, lw: o.lw ?? 0.8 });
        shape(P, ellipse(cx, cy - hh, rx, ry, 14), o.cap || fills.map(([k, t]) => [k, t * 0.5]), { lw: o.lw ?? 0.8 });
    }
    function limb(P, x0, y0, x1, y1, w0, w1, fills) {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        shape(P, [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], fills, { lw: 0.7, amp: 0.14 });
    }
    function person(P, x, y, o = {}) {
        const s = o.s || 0.92, t = o.t || 0;
        const SKIN = [['coral', 0.22], ['sun', 0.2]];
        const PANTS = [['blue', 0.76]], SHIRT = o.shirt || [['teal', 0.72]];
        P.dot(x, y + 1, 9 * s, 'blue', 0.2, 0.38);
        const hip = y - 14 * s, shY = hip - 12 * s, hy = shY - 6 * s;
        limb(P, x - 2.2 * s, hip, x - 3.2 * s, y - 0.6 * s, 2.3 * s, 1.5 * s, PANTS);
        limb(P, x + 2.2 * s, hip, x + 3.4 * s, y + 0.8 * s, 2.3 * s, 1.5 * s, PANTS);
        shape(P, [[x - 4.5 * s, hip + 1.2 * s], [x + 4.6 * s, hip + 1 * s], [x + 5.6 * s, shY + 1.5 * s], [x + 3 * s, shY], [x - 3 * s, shY], [x - 5.4 * s, shY + 1.5 * s]], SHIRT, { shade: 0.08, lw: 0.82 });
        limb(P, x, shY + 0.5 * s, x, hy + 4 * s, 1.8 * s, 1.6 * s, SKIN);
        const head = ellipse(x, hy, 4.3 * s, 5.1 * s, 14);
        P.knock(head); P.fill(head, 'coral', 0.22); P.fill(head, 'sun', 0.18); P.line(head, 0.82, 'blue', true, 0.14);
        const hair = [];
        for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.92 + Math.PI * 1.16 * k / 10; hair.push([x + Math.cos(a) * 4.8 * s, hy - 0.8 * s + Math.sin(a) * 5.0 * s]); }
        shape(P, hair, [['blue', 0.9]], { lw: 0.62 });
        const wave = o.wave ? Math.sin(t * 4) * 3.5 * s : 0;
        limb(P, x - 5.0 * s, shY + 2 * s, x - 7.5 * s, hip - 1.5 * s, 1.7 * s, 1.3 * s, SHIRT);
        limb(P, x + 5.0 * s, shY + 2 * s, x + 8.5 * s, shY + (o.wave ? -5 * s + wave : 5 * s), 1.7 * s, 1.3 * s, SHIRT);
    }

    // ---------- Patents & Achievements Courtyard (14 x 8.5 grid) ----------

    const W = 14, D = 8.5, H = 3.6;

    const scene = {
        under(P, R) {
            block(P, 0, 0, -0.5, W, D, 0.5, [['blue', 0.16]], { top: STONE });

            // Gallery hardwood floor (back-left i 0..8.5, j 0..4.0)
            shape(P, flat(0, 0, 0.01, 8.6, 4.0), WOOD, { lw: 0.65 });
            for (let n = 1; n < 8; n++) P.line([iso(0, n * 0.5, 0.01), iso(8.6, n * 0.5, 0.01)], 0.35, 'blue', false, 0.12);

            // Courtyard lawn on front-left around the biodegradable pots & cart
            shape(P, flat(0, 4.0, 0.01, 8.6, 4.5), GREEN, { lw: 0.65 });
            shape(P, flat(0.4, 4.5, 0.02, 7.6, 3.3), STONE, { lw: 0.7 });

            // Concrete NASA Wallops rocket launchpad on right wing (i 8.8..14, j 0..8.5)
            shape(P, flat(8.8, 0, 0.01, 5.2, 8.5), [['blue', 0.14], ['sun', 0.08]], { lw: 0.75 });
            // Circular blast pad + hazard stripes
            const [lpx, lpy] = iso(11.6, 4.6, 0.03);
            shape(P, ellipse(lpx, lpy, 48, 24, 24), [['blue', 0.24]], { lw: 0.9 });
            P.line(ellipse(lpx, lpy, 36, 18, 20), 1.1, 'coral', true, 0.2);

            // Cutaway gallery walls on back-left
            block(P, -0.32, -0.32, 0, 0.32, 4.32, H, WALL, { shade: 0.88 });
            block(P, 0, -0.32, 0, 8.6, 0.32, H, WALL, { shade: 0.44 });
            P.line([iso(0, 0.02, 0.24), iso(8.6, 0.02, 0.24)], 0.85, 'blue');

            // ---- STATION 1: AWARDS & HONORS GALLERY (i 0.5..8.2, j 0.3..3.5) ----
            // Framed Royal Asiatic Society (FRAS) Charter + Letters of Appreciation on back wall
            shape(P, onBack(0.9, 2.5, 1.45, 2.95, 0.02), [['sun', 0.3]], { lw: 1.0 });
            P.dot(...iso(1.7, 0.04, 1.8), 3.6, 'coral', 0.9); // red FRAS wax seal
            shape(P, onBack(3.1, 4.9, 1.5, 2.95, 0.02), [['sun', 0.24], ['coral', 0.12]], { lw: 1.0 });
            // Mission patch framed artwork on wall
            const [mpx, mpy] = iso(6.6, 0.04, 2.2);
            shape(P, circle(mpx, mpy, 15, 18), [['blue', 0.85]], { lw: 1.0 });
            P.dot(mpx, mpy - 2, 6, 'sun', 0.95);
            P.line([[mpx - 6, mpy + 7], [mpx, mpy - 8], [mpx + 6, mpy + 7]], 1.4, 'coral', false, 0.1);

            // Rashtriya Bal Puraskar golden medallion on velvet pedestal (i 2.4, j 1.7)
            block(P, 2.0, 1.4, 0, 1.1, 1.1, 1.15, WOOD_DK, { top: RED });
            // Philately Scholarship stamp case (i 4.5, j 1.5)
            block(P, 4.2, 1.3, 0, 1.5, 1.0, 0.95, WOOD);
            shape(P, flat(4.35, 1.45, 0.96, 1.2, 0.7), [], { lw: 0.65 });
            for (let k = 0; k < 4; k++) shape(P, flat(4.45 + k * 0.26, 1.62, 0.97, 0.2, 0.34), [RED, [['teal', 0.8]], [['sun', 0.9]], [['blue', 0.8]]][k], { lw: 0.45, amp: 0.08 });
            // Published books stack on shelf pedestal (i 6.6, j 1.5)
            block(P, 6.4, 1.35, 0, 1.3, 0.95, 0.85, WOOD);
            block(P, 6.55, 1.5, 0.85, 0.95, 0.65, 0.16, RED, { lw: 0.55 });
            block(P, 6.6, 1.54, 1.01, 0.86, 0.58, 0.16, [['teal', 0.75]], { lw: 0.55 });
            block(P, 6.65, 1.58, 1.17, 0.78, 0.52, 0.15, GOLD, { lw: 0.55 });

            // ---- STATION 2: GRANTED PATENT — RENEWABLE ENERGY SOLAR ITINERANT CART (i 1.5..4.6, j 5.0..6.8) ----
            // Spoked wheels underneath cart
            for (const [wi, wj] of [[2.2, 6.7], [4.0, 6.7], [2.2, 5.2]]) {
                const [wx, wy] = iso(wi, wj, 0.32);
                shape(P, circle(wx, wy, 9.5, 16), [['blue', 0.2]], { lw: 1.5 });
                for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; P.line([[wx - Math.cos(a) * 8, wy - Math.sin(a) * 8], [wx + Math.cos(a) * 8, wy + Math.sin(a) * 8]], 0.7, 'blue', false, 0.1); }
            }
            // Cart body & clean-energy vending counter
            block(P, 1.8, 5.15, 0.42, 2.6, 1.55, 0.95, WOOD, { top: [['sun', 0.32]] });
            // Push handles on left end
            P.line([iso(1.8, 5.4, 1.1), iso(1.15, 5.4, 1.25)], 1.8, 'blue', false, 0.1);
            P.line([iso(1.8, 6.4, 1.1), iso(1.15, 6.4, 1.25)], 1.8, 'blue', false, 0.1);
            // Four vertical canopy poles
            for (const [pi, pj] of [[1.9, 5.25], [4.3, 5.25], [1.9, 6.6], [4.3, 6.6]]) {
                P.line([iso(pi, pj, 1.37), iso(pi, pj, 2.68)], 1.4, 'blue', false, 0.12);
            }
            // Tilted Solar Panel Canopy Roof (grid of photovoltaic cells!)
            const roof = [iso(1.65, 5.0, 2.85), iso(4.55, 5.0, 2.85), iso(4.55, 6.85, 2.55), iso(1.65, 6.85, 2.55)];
            shape(P, roof, SOLAR, { lw: 1.2 });
            for (let k = 1; k < 5; k++) {
                const f = k / 5;
                P.chalk([iso(lerp(1.65, 4.55, f), 5.0, 2.85), iso(lerp(1.65, 4.55, f), 6.85, 2.55)], 0.75);
            }
            for (let k = 1; k < 3; k++) {
                const f = k / 3;
                P.chalk([iso(1.65, lerp(5.0, 6.85, f), lerp(2.85, 2.55, f)), iso(4.55, lerp(5.0, 6.85, f), lerp(2.85, 2.55, f))], 0.75);
            }

            // ---- STATION 3: BIODEGRADABLE PLANTING POTS BENCH (i 5.4..7.7, j 5.2..6.9) ----
            block(P, 5.4, 5.3, 0, 2.2, 1.4, 0.78, WOOD_DK, { top: WOOD });
            for (let k = 0; k < 4; k++) {
                const pi = 5.75 + (k % 2) * 0.9, pj = 5.65 + Math.floor(k / 2) * 0.65;
                cyl(P, pi, pj, 0.78, 0.22, 0.28, [['coral', 0.52], ['sun', 0.35]], { cap: [['coral', 0.5], ['blue', 0.3]] });
            }

            // ---- STATION 4: NASA WALLOPS LAUNCH GANTRY TOWER (i 10.1, j 3.6) ----
            for (const [gi, gj] of [[9.8, 3.2], [10.45, 3.2], [9.8, 3.85], [10.45, 3.85]]) {
                P.line([iso(gi, gj, 0), iso(gi, gj, 3.6)], 1.5, 'coral', false, 0.15);
            }
            for (let z = 0.6; z <= 3.6; z += 0.75) {
                P.line([iso(9.8, 3.2, z), iso(10.45, 3.2, z), iso(10.45, 3.85, z), iso(9.8, 3.85, z)], 0.9, 'coral', true, 0.12);
                P.line([iso(9.8, 3.85, z - 0.75), iso(10.45, 3.85, z)], 0.7, 'blue', false, 0.1);
            }
            // Umbilical swing arm reaching toward rocket
            P.line([iso(10.45, 3.85, 2.5), iso(11.35, 4.35, 2.5)], 1.4, 'blue', false, 0.1);
        },

        live(P, t) {
            // 1. Spotlight & shimmer on Rashtriya Bal Puraskar golden medal
            const [bx, by] = iso(2.55, 1.95, 1.45);
            P.pool(bx, by + 18, 42, 'sun', 0.34 + 0.08 * Math.sin(t * 2.4));
            // Ribbon & golden medallion hovering/rotating gently on display stand
            P.line([[bx - 4, by - 14], [bx, by - 2], [bx + 4, by - 14]], 2.2, 'coral', false, 0.1);
            shape(P, circle(bx, by, 7.2, 14), GOLD, { lw: 1.0 });
            P.dot(bx, by, 2.5, 'coral', 0.65);

            // 2. Solar Cart: blinking green charge indicator, sun glint across panel, smiling vendor
            const glint = (t * 0.4) % 1;
            P.chalk([iso(lerp(1.75, 4.45, glint), 5.05, 2.84), iso(lerp(1.75, 4.45, glint), 6.75, 2.56)], 1.6);
            P.dot(...iso(4.15, 6.7, 1.15), 2.1, Math.sin(t * 5) > 0 ? 'teal' : 'sun', 1);
            const [vx, vy] = iso(3.1, 4.85, 0);
            person(P, vx, vy, { t, s: 0.92, shirt: [['sun', 0.8]], wave: true });

            // 3. Biodegradable Planting Pots: swaying green seedlings sprouting out of each pot
            for (let k = 0; k < 4; k++) {
                const pi = 5.75 + (k % 2) * 0.9, pj = 5.65 + Math.floor(k / 2) * 0.65;
                const [sx, sy] = iso(pi, pj, 1.06);
                const sw = Math.sin(t * 2.2 + k * 1.4) * 2.5;
                P.line([[sx, sy], [sx + sw, sy - 12]], 1.4, 'teal', false, 0.15);
                shape(P, [[sx + sw, sy - 10], [sx + sw - 6, sy - 14], [sx + sw - 1, sy - 17]], GREEN, { lw: 0.55 });
                shape(P, [[sx + sw, sy - 11], [sx + sw + 6, sy - 15], [sx + sw + 1, sy - 18]], LEAF, { lw: 0.55 });
            }

            // 4. NASA Wallops Sounding Rocket (CiS Mission Patch 2022):
            // 9-second cycle: 0..3.5s on pad with venting steam, 3.5..7.5s ignition & liftoff!, 7.5..9s reset
            const cyc = t % 9;
            let rz = 0.05;
            if (cyc > 3.5 && cyc < 7.8) {
                const u = (cyc - 3.5) / 4.3;
                rz = 0.05 + u * u * 7.8;
            } else if (cyc >= 7.8) {
                rz = 0.05;
            }
            const [rx, ry] = iso(11.6, 4.6, rz);

            // Exhaust plumes during ignition & liftoff
            if (cyc > 3.1 && cyc < 7.6) {
                const thrust = cyc < 3.6 ? (cyc - 3.1) / 0.5 : 1;
                const [px0, py0] = iso(11.6, 4.6, 0.08);
                for (let k = 0; k < 6; k++) {
                    const a = k / 6 * TAU + t * 2;
                    const rad = (7 + Math.sin(t * 14 + k) * 3) * thrust;
                    const ox = Math.cos(a) * (10 + k * 2.5) * thrust;
                    const oy = Math.sin(a) * (5 + k * 1.2) * thrust;
                    shape(P, circle(px0 + ox, py0 + oy, rad, 10), k % 2 ? [['sun', 0.85]] : [['coral', 0.72]], { lw: 0.6 });
                }
                // Rocket flame tail
                shape(P, [[rx - 4, ry], [rx + 4, ry], [rx, ry + 18 + Math.sin(t * 28) * 5]], [['sun', 0.95], ['coral', 0.6]], { lw: 0.5 });
            }

            // Sounding rocket body + fins + nose cone + mission patch badge!
            if (cyc < 7.5 || cyc >= 7.8) {
                const alpha = cyc >= 7.8 ? clamp((cyc - 7.8) / 0.5, 0, 1) : (cyc > 6.8 ? clamp((7.5 - cyc) / 0.7, 0, 1) : 1);
                ctx.save();
                ctx.globalAlpha = alpha;
                // Fins
                shape(P, [[rx - 5, ry - 2], [rx - 13, ry + 5], [rx - 5, ry - 14]], RED, { lw: 0.75 });
                shape(P, [[rx + 5, ry - 2], [rx + 13, ry + 5], [rx + 5, ry - 14]], RED, { lw: 0.75 });
                // Cylindrical fuselage
                shape(P, [[rx - 5.5, ry], [rx + 5.5, ry], [rx + 5.5, ry - 52], [rx - 5.5, ry - 52]], [], { lw: 0.95 });
                // Coral accent band + circular CiS Mission Patch on fuselage
                shape(P, [[rx - 5.5, ry - 14], [rx + 5.5, ry - 14], [rx + 5.5, ry - 20], [rx - 5.5, ry - 20]], RED, { lw: 0.6 });
                shape(P, circle(rx, ry - 34, 4.2, 12), [['blue', 0.88]], { lw: 0.6 });
                P.dot(rx, ry - 34, 1.8, 'sun', 1);
                // Pointed nose cone
                shape(P, [[rx - 5.5, ry - 52], [rx + 5.5, ry - 52], [rx, ry - 70]], RED, { lw: 0.9 });
                ctx.restore();
            }
        },

        over(P, R) {
            // Subtle velvet rope stanchions in front of Bal Puraskar pedestal
            for (const pi of [1.6, 3.5]) {
                P.line([iso(pi, 2.85, 0), iso(pi, 2.85, 0.75)], 1.4, 'sun', false, 0.1);
                P.dot(...iso(pi, 2.85, 0.78), 2.0, 'sun', 0.95);
            }
            P.line([iso(1.6, 2.85, 0.62), iso(2.55, 2.85, 0.45), iso(3.5, 2.85, 0.62)], 1.6, 'coral', false, 0.15);
        }
    };

    const corners = [];
    for (const i of [-0.4, W + 0.4]) for (const j of [-0.4, D + 0.4]) for (const z of [-0.5, H + 1.2]) corners.push(iso(i, j, z));
    const X0 = Math.min(...corners.map(p => p[0])) - 14, X1 = Math.max(...corners.map(p => p[0])) + 14;
    const Y0 = Math.min(...corners.map(p => p[1])) - 14, Y1 = Math.max(...corners.map(p => p[1])) + 14;
    const BW = X1 - X0, BH = Y1 - Y0;
    canvas.style.aspectRatio = `${BW} / ${BH}`;

    const STATIONS = {
        all: { cx: (X0 + X1) / 2, cy: (Y0 + Y1) / 2, zoom: 1, label: 'Click any station to zoom in' },
        cart: { pt: iso(3.1, 5.8, 1.2), zoom: 2.05, label: 'Granted Patent 355338-001 · Renewable Energy Solar Itinerant Cart' },
        pots: { pt: iso(6.5, 6.0, 0.9), zoom: 2.2, label: 'Patent Pending · Biodegradable Planting Pots' },
        awards: { pt: iso(4.2, 1.6, 1.4), zoom: 2.0, label: 'Honours · Rashtriya Bal Puraskar, FRAS, Philately Scholarship & Books' },
        rocket: { pt: iso(11.4, 4.4, 1.6), zoom: 1.9, label: 'CiS Mission Patch Winner 2022 · NASA Wallops Sounding Rocket' },
    };

    const cam = { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, zoom: 1 };
    let tween = null, activeStation = 'all';

    function focusStation(key) {
        const st = STATIONS[key] || STATIONS.all;
        activeStation = key;
        const tx = st.pt ? st.pt[0] : st.cx, ty = st.pt ? st.pt[1] : st.cy;
        tween = { from: { ...cam }, to: { x: tx, y: ty, zoom: st.zoom }, t0: performance.now(), dur: 750 };
        document.querySelectorAll('.ach-pill').forEach(b => b.classList.toggle('active', b.dataset.station === key));
        const cap = document.getElementById('achievements-caption');
        if (cap) cap.textContent = st.label;
    }

    document.querySelectorAll('.ach-pill').forEach(btn => btn.addEventListener('click', () => focusStation(btn.dataset.station)));
    canvas.addEventListener('click', e => {
        if (activeStation !== 'all') { focusStation('all'); return; }
        const r = canvas.getBoundingClientRect();
        const wx = X0 + ((e.clientX - r.left) / r.width) * BW, wy = Y0 + ((e.clientY - r.top) / r.height) * BH;
        let best = 'all', bd = 140;
        for (const [k, st] of Object.entries(STATIONS)) {
            if (!st.pt) continue;
            const d = Math.hypot(st.pt[0] - wx, st.pt[1] - wy);
            if (d < bd) { bd = d; best = k; }
        }
        focusStation(best);
    });

    let baseScale = 1, layers = new Map();
    function renderLayer(layer, variant) {
        const cv = document.createElement('canvas');
        cv.width = Math.round(BW * baseScale); cv.height = Math.round(BH * baseScale);
        const c = cv.getContext('2d');
        c.setTransform(baseScale, 0, 0, baseScale, -X0 * baseScale, -Y0 * baseScale);
        scene[layer](Pen(c, hash('ach', layer, variant)), rand(hash('ach', 'layout', layer)));
        return cv;
    }
    let budget = 0;
    function layerFor(layer, variant) {
        const key = layer + variant;
        if (!layers.has(key) && budget-- > 0) layers.set(key, renderLayer(layer, variant));
        return layers.get(key) || layers.get(layer + 0) || null;
    }
    function resize() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, canvas.clientWidth);
        baseScale = (w * dpr) / BW;
        canvas.width = Math.round(BW * baseScale); canvas.height = Math.round(BH * baseScale);
        layers = new Map();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(now) {
        if (tween) {
            const k = clamp((now - tween.t0) / tween.dur, 0, 1), e = ease(k);
            cam.x = lerp(tween.from.x, tween.to.x, e); cam.y = lerp(tween.from.y, tween.to.y, e); cam.zoom = lerp(tween.from.zoom, tween.to.zoom, e);
            if (k >= 1) tween = null;
        }
        const t = reducedMotion ? 4.2 : now / 1000;
        const boil = reducedMotion ? 0 : Math.floor(t * 4) % 3;
        budget = 1;

        const cw = canvas.width, ch = canvas.height, z = baseScale * cam.zoom;
        const ox = cw / 2 - cam.x * z, oy = ch / 2 - cam.y * z;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);

        const under = layerFor('under', boil);
        if (under) {
            ctx.setTransform(z, 0, 0, z, ox, oy);
            ctx.drawImage(under, X0, Y0, BW, BH);
            scene.live(Pen(ctx, hash('ach', 'live', boil)), t);
            ctx.globalCompositeOperation = 'source-over';
        }
        const over = layerFor('over', boil);
        if (over) {
            ctx.setTransform(z, 0, 0, z, ox, oy);
            ctx.drawImage(over, X0, Y0, BW, BH);
        }
        if (document.documentElement.classList.contains('night')) {
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0'; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
        }
    }
    let last = 0;
    function frame(now) { requestAnimationFrame(frame); if (now - last < 33) return; last = now; draw(now); }
    requestAnimationFrame(frame);
})();
