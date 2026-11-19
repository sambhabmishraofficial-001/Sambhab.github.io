/**
 * Patents & Achievements — Four-Room Isometric Risograph Cutaway
 * Built in the exact Paper Rooms style of houses.js:
 *   1. Patent Design & Solar Engineering Workshop (Solar Itinerant Cart Patent No. 355338-001)
 *   2. Biodegradable Planting Pots Studio (Eco-Materials Patent App. 202131043278)
 *   3. Hall of Honors (Rashtriya Bal Puraskar 2023, FRAS 2021, Philately & Books)
 *   4. NASA Wallops Flight Facility Launchpad & CiS Mission Patch Control (2022)
 *
 * Interactive: click any room to zoom in, click again or outside to return, drag to pan.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('achievements-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    // ---------- Print settings (exact houses.js risograph palette) ----------

    const INK = {
        blue: [46, 70, 130],
        coral: [236, 100, 80],
        sun: [255, 204, 46],
        teal: [0, 138, 136]
    };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const SHIFT = { blue: [0.3, -0.2], coral: [-0.4, 0.3], sun: [0.25, 0.45], teal: [-0.3, -0.4] };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const GREEN = [['teal', 0.72], ['sun', 0.55]];
    const LEAF = [['teal', 0.48], ['sun', 0.82]];
    const ORANGE = [['coral', 0.6], ['sun', 0.7]];
    const RED = [['coral', 0.92], ['blue', 0.18]];
    const GOLD = [['sun', 0.95], ['coral', 0.25]];
    const WOOD = [['coral', 0.45], ['sun', 0.46]];
    const WOOD_DK = [['coral', 0.52], ['blue', 0.34]];
    const CLAY = [['coral', 0.66], ['sun', 0.34]];
    const SOIL = [['coral', 0.52], ['blue', 0.36]];
    const SLATE = [['blue', 0.86], ['teal', 0.22]];
    const STEEL = [['blue', 0.16], ['teal', 0.1]];
    const SOLAR = [['blue', 0.84], ['teal', 0.42]];
    const BOOKS = [
        [['coral', 0.85]], [['sun', 0.9]], [['teal', 0.8]], [['blue', 0.6]],
        ORANGE, GREEN, [['blue', 0.45], ['coral', 0.5]], [['coral', 0.5]]
    ];

    // ---------- Randomness ----------

    function hash(...parts) {
        let h = 2166136261;
        for (const p of parts) {
            const s = String(p);
            for (let k = 0; k < s.length; k++) {
                h ^= s.charCodeAt(k);
                h = Math.imul(h, 16777619);
            }
        }
        return h >>> 0;
    }

    function rand(seed) {
        let s = (seed >>> 0) || 1;
        return () => {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    }

    const pick = (R, arr) => arr[(R() * arr.length) | 0];
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // ---------- Halftone screens ----------

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
        const R = rand(hash('ach-screen', ink, level));
        c.fillStyle = rgba(INK[ink]);
        if (tone >= 1) {
            c.fillRect(0, 0, size, size);
        } else if (tone <= 0.5) {
            for (let y = 0; y < CELLS; y++) {
                for (let x = 0; x < CELLS; x++) {
                    const r = cell * Math.sqrt(tone / Math.PI) * (0.86 + R() * 0.24);
                    c.beginPath();
                    c.arc((x + 0.5) * cell + (R() - 0.5) * RES * 0.6, (y + 0.5) * cell + (R() - 0.5) * RES * 0.6, r, 0, TAU);
                    c.fill();
                }
            }
        } else {
            c.fillRect(0, 0, size, size);
            c.globalCompositeOperation = 'destination-out';
            for (let y = 0; y <= CELLS; y++) {
                for (let x = 0; x <= CELLS; x++) {
                    const r = cell * Math.sqrt((1 - tone) / Math.PI) * (0.86 + R() * 0.24);
                    c.beginPath();
                    c.arc(x * cell, y * cell, r, 0, TAU);
                    c.fill();
                }
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

    // ---------- Pen: hand-drawn risograph marks ----------

    function Pen(c, seed) {
        const R = rand(seed);
        const P = { c, R };

        function wobble(pts, closed, amp) {
            const out = [];
            const n = pts.length, segs = closed ? n : n - 1;
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

        P.path = pts => {
            c.beginPath();
            c.moveTo(pts[0][0], pts[0][1]);
            for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
            c.closePath();
        };

        P.knock = pts => {
            c.globalCompositeOperation = 'source-over';
            P.path(pts);
            c.fillStyle = '#fff';
            c.fill();
        };

        P.fill = (pts, ink, tone) => {
            if (tone <= 0.02) return;
            c.save();
            c.globalCompositeOperation = 'multiply';
            c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            P.path(pts);
            c.fillStyle = pattern(ink, tone);
            c.fill();
            c.restore();
        };

        P.line = (pts, w = 1, ink = 'blue', closed = false, amp = 0.42) => {
            if (pts.length < 2) return;
            const q = wobble(pts, closed, amp);
            c.save();
            c.globalCompositeOperation = 'multiply';
            c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            c.strokeStyle = rgba(INK[ink], 0.92);
            c.lineWidth = w;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.beginPath();
            c.moveTo(q[0][0], q[0][1]);
            for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
            if (closed) c.closePath();
            c.stroke();
            c.restore();
        };

        P.chalk = (pts, w = 1.1, closed = false, a = 0.9) => {
            if (pts.length < 2) return;
            const q = wobble(pts, closed, 0.2);
            c.save();
            c.globalCompositeOperation = 'source-over';
            c.strokeStyle = `rgba(255,255,255,${a})`;
            c.lineWidth = w;
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.beginPath();
            c.moveTo(q[0][0], q[0][1]);
            for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
            if (closed) c.closePath();
            c.stroke();
            c.restore();
        };

        P.dot = (x, y, r, ink, tone, ry = 1) => P.fill(ellipse(x, y, r, r * ry, 12), ink, tone);

        P.pool = (x, y, r, ink, a) => {
            c.save();
            c.globalCompositeOperation = 'multiply';
            c.translate(x, y);
            c.scale(1, 0.5);
            const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, rgba(INK[ink], a));
            g.addColorStop(1, rgba(INK[ink], 0));
            c.fillStyle = g;
            c.beginPath();
            c.arc(0, 0, r, 0, TAU);
            c.fill();
            c.restore();
        };

        return P;
    }

    // ---------- Isometric geometry (exact houses.js proportions) ----------

    const TW = 48, TH = 24, TZ = 26;
    const W = 8, D = 8, H = 3, PITCH = 11.5;

    const iso = (i, j, z = 0) => [(i - j) * TW / 2, (i + j) * TH / 2 - z * TZ];
    const flat = (i, j, z, w, d) => [iso(i, j, z), iso(i + w, j, z), iso(i + w, j + d, z), iso(i, j + d, z)];
    const faceL = (i, j, z, w, d, h) => [iso(i, j + d, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i, j + d, z + h)];
    const faceR = (i, j, z, w, d, h) => [iso(i + w, j, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i + w, j, z + h)];
    const onBack = (i0, i1, z0, z1, j = 0) => [iso(i0, j, z0), iso(i1, j, z0), iso(i1, j, z1), iso(i0, j, z1)];
    const onLeft = (j0, j1, z0, z1, i = 0) => [iso(i, j0, z0), iso(i, j1, z0), iso(i, j1, z1), iso(i, j0, z1)];

    function ellipse(x, y, rx, ry, n = 20) {
        const pts = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU;
            pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
        }
        return pts;
    }
    const circle = (x, y, r, n = 16) => ellipse(x, y, r, r, n);

    function backRing(i, z, r, n = 18, j = 0) {
        const pts = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU;
            pts.push(iso(i + Math.cos(a) * r, j, z + Math.sin(a) * r));
        }
        return pts;
    }

    // ---------- Shapes ----------

    function paint(P, pts, fills, k, shade) {
        P.knock(pts);
        for (const [ink, tone] of fills) P.fill(pts, ink, Math.min(1, tone * k));
        if (shade) P.fill(pts, 'blue', shade);
    }

    function shape(P, pts, fills = [], o = {}) {
        paint(P, pts, fills, 1, o.shade || 0);
        if (o.line !== false) P.line(pts, o.lw ?? 1, 'blue', true, o.amp ?? 0.42);
    }

    function block(P, i, j, z, w, d, h, fills = [], o = {}) {
        const L = faceL(i, j, z, w, d, h), Rf = faceR(i, j, z, w, d, h), T = flat(i, j, z + h, w, d);
        const s = o.shade ?? 1;
        paint(P, L, fills, 0.85, 0.1 * s);
        paint(P, Rf, fills, 1, 0.28 * s);
        paint(P, T, o.top || fills, 0.55, 0);
        const lw = o.lw ?? 1;
        P.line(L, lw, 'blue', true);
        P.line(Rf, lw, 'blue', true);
        P.line(T, lw, 'blue', true);
    }

    function cyl(P, i, j, z, r, h, fills = [], o = {}) {
        const [cx, cy] = iso(i, j, z);
        const rx = r * 1.414 * TW / 2, ry = r * 1.414 * TH / 2, hh = h * TZ;
        const body = [];
        for (let k = 0; k <= 12; k++) {
            const a = Math.PI * k / 12;
            body.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
        }
        for (let k = 0; k <= 12; k++) {
            const a = Math.PI + Math.PI * k / 12;
            body.push([cx + Math.cos(a) * rx, cy - hh + Math.sin(a) * ry]);
        }
        shape(P, body, fills, { shade: o.shade ?? 0.15, lw: o.lw ?? 0.9 });
        shape(P, ellipse(cx, cy - hh, rx, ry, 16), o.cap || fills.map(([k, t]) => [k, t * 0.5]), { lw: o.lw ?? 0.9 });
    }

    function plant(P, i, j, R, size = 1) {
        cyl(P, i, j, 0, 0.3 * size, 0.52 * size, CLAY);
        const [x, y] = iso(i, j, 0.52 * size);
        for (let k = 0; k < 6; k++) {
            const a = -Math.PI / 2 + (k - 2.5) * 0.45;
            const L = (14 + R() * 7) * size;
            const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L];
            const mid = [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5];
            const nx = -Math.sin(a) * 4.8 * size, ny = Math.cos(a) * 4.8 * size;
            shape(P, [[x, y], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], k % 2 ? GREEN : LEAF, { lw: 0.7 });
        }
    }

    function figure(P, x, y, o = {}) {
        const s = o.s || 1, t = o.t || 0, pose = o.pose || 'stand';
        P.dot(x, y, 8 * s, 'blue', 0.22, 0.4);
        const sit = pose === 'sit';
        const step = pose === 'walk' ? Math.sin(t * 7) * 2.8 * s : 0;
        const hip = y - (sit ? 9 : 13) * s, neck = hip - 12 * s, hy = neck - 5.5 * s;
        if (sit) {
            P.line([[x - 2.5 * s, hip], [x + 3 * s, hip + 2 * s], [x + 3 * s, y]], 3 * s, 'blue', false, 0.15);
            P.line([[x + 1.5 * s, hip], [x + 7 * s, hip + 2 * s], [x + 7 * s, y - 1 * s]], 3 * s, 'blue', false, 0.15);
        } else {
            P.line([[x - 2 * s, hip], [x - 2 * s + step, y]], 3 * s, 'blue', false, 0.15);
            P.line([[x + 2 * s, hip], [x + 2 * s - step, y]], 3 * s, 'blue', false, 0.15);
        }
        const body = [[x - 5 * s, hip + 1 * s], [x + 5 * s, hip + 1 * s], [x + 4.2 * s, neck], [x - 4.2 * s, neck]];
        shape(P, body, o.shirt || [['coral', 0.8]], { shade: 0.08, lw: 0.9 });
        const reach = pose === 'reach' ? (Math.sin(t * 3.0) * 0.5 + 0.5) * 6.5 * s : 0;
        const swing = step * 0.55;
        P.line([[x - 4.4 * s, neck + 1.5 * s], [x - 6.5 * s - swing, hip - 1 * s]], 2.2 * s, 'blue', false, 0.15);
        P.line([[x + 4.4 * s, neck + 1.5 * s], [x + 7 * s + swing, hip - 1.5 * s - reach]], 2.2 * s, 'blue', false, 0.15);
        const head = circle(x, hy, 5 * s, 14);
        P.knock(head);
        P.fill(head, 'coral', 0.2);
        P.line(head, 0.9, 'blue', true, 0.15);
        const hair = [];
        for (let k = 0; k <= 8; k++) {
            const a = Math.PI + Math.PI * k / 8;
            hair.push([x + Math.cos(a) * 5.4 * s, hy - 0.5 * s + Math.sin(a) * 5.4 * s]);
        }
        shape(P, hair, o.hair || [['blue', 0.85]], { lw: 0.7 });
        P.dot(x + 2.4 * s, hy + 1.5 * s, 1.0 * s, 'coral', 0.65);
    }

    function shell(P, wall, floor, o = {}) {
        block(P, 0, 0, -0.4, W, D, 0.4, [['blue', 0.16]], { top: floor });
        block(P, -0.3, -0.3, 0, 0.3, D + 0.3, H, wall, { shade: 0.9 });
        block(P, 0, -0.3, 0, W, 0.3, H, wall, { shade: 0.5 });
        if (o.skirting !== false) {
            P.line([iso(0, 0.02, 0.24), iso(W, 0.02, 0.24)], 1, 'blue');
            P.line([iso(0.02, 0, 0.24), iso(0.02, D, 0.24)], 1, 'blue');
        }
    }

    function lamp(P, i, j, z, t, phase, ink = 'sun') {
        const flick = 0.28 + 0.05 * Math.sin(t * 1.8 + phase);
        const [fx, fy] = iso(i, j, 0);
        P.pool(fx, fy, 92, ink, flick);
        P.line([iso(i, j, H + 0.8), iso(i, j, z + 0.45)], 1, 'blue', false, 0.2);
        const [x, y] = iso(i, j, z);
        shape(P, [[x - 4, y - 11], [x + 4, y - 11], [x + 12, y], [x - 12, y]], [[ink, 0.85]], { lw: 0.9 });
        P.dot(x, y + 1, 3.8, ink, 0.5, 0.5);
    }

    // ---------- Room 1: Patent Design & Solar Engineering Workshop ----------
    // Granted Design Patent No. 355338-001: Renewable Energy Itinerant Cart

    const solarWorkshop = {
        id: 'solar-workshop',
        under(P, R) {
            shell(P, [['sun', 0.26], ['teal', 0.1]], [['blue', 0.1], ['sun', 0.12]]);
            // Concrete studio expansion grid + yellow safety zone stripes
            for (let n = 2; n < W; n += 2) {
                P.line([iso(n, 0, 0), iso(n, D, 0)], 0.5, 'blue', false, 0.2);
                P.line([iso(0, n, 0), iso(W, n, 0)], 0.5, 'blue', false, 0.2);
            }
            shape(P, flat(2.2, 2.0, 0.02, 4.4, 3.6), [['sun', 0.22]], { lw: 0.7 });

            // Back-wall blue patent blueprint sheets (Design Patent 355338-001)
            shape(P, onBack(0.9, 4.3, 1.0, 2.65), [['blue', 0.78]], { lw: 0.9 });
            // Crisp white chalk elevation schematic of the solar cart on the blueprint
            P.chalk([iso(1.4, 0.03, 1.4), iso(3.4, 0.03, 1.4), iso(3.4, 0.03, 1.95), iso(1.4, 0.03, 1.95)], 1.1, true, 0.9);
            P.chalk([iso(1.2, 0.03, 2.28), iso(3.6, 0.03, 2.42)], 1.4, false, 0.95);
            P.chalk([iso(1.6, 0.03, 1.95), iso(1.6, 0.03, 2.3)], 0.9, false, 0.85);
            P.chalk([iso(3.2, 0.03, 1.95), iso(3.2, 0.03, 2.4)], 0.9, false, 0.85);
            P.chalk(backRing(1.9, 1.25, 0.16, 12, 0.03), 1.0, true, 0.9);
            P.chalk(backRing(3.0, 1.25, 0.16, 12, 0.03), 1.0, true, 0.9);

            // Second patent seal & framed grant document on back wall
            shape(P, onBack(4.8, 6.2, 1.25, 2.5), [['sun', 0.16]], { lw: 0.85 });
            shape(P, backRing(5.5, 1.55, 0.2, 12, 0.02), RED, { lw: 0.65 });
            for (let k = 0; k < 4; k++) {
                P.line([iso(5.05, 0.02, 2.3 - k * 0.15), iso(5.95, 0.02, 2.3 - k * 0.15)], 0.8, 'blue', false, 0.12);
            }

            // Left-wall tool pegboard & drafting table
            shape(P, onLeft(1.2, 3.8, 1.45, 2.55), WOOD, { lw: 0.8 });
            for (let k = 0; k < 5; k++) {
                P.line([iso(0.03, 1.55 + k * 0.48, 1.68), iso(0.03, 1.55 + k * 0.48, 2.32)], 1.6, 'blue', false, 0.15);
            }
            // Angled architect drafting desk with rolled patent drawings
            block(P, 0.25, 1.1, 0, 1.55, 2.9, 0.92, WOOD_DK, { top: [['sun', 0.12]] });
            shape(P, flat(0.45, 1.4, 0.95, 1.1, 1.9), [['blue', 0.2]], { lw: 0.65 });
            cyl(P, 1.35, 3.65, 0.92, 0.12, 0.55, [['sun', 0.25]], { lw: 0.55 });

            // Battery charger & inverter bench in back-right
            block(P, 6.4, 0.4, 0, 1.25, 1.6, 1.15, STEEL);
            block(P, 6.58, 0.65, 1.15, 0.85, 1.1, 0.52, [['teal', 0.65]]);

            // CENTERPIECE: Patented Solar Itinerant Cart (No. 355338-001)
            // Wheels (spoked cart wheels)
            for (const [wx, wy] of [[3.2, 4.75], [5.4, 4.75], [3.2, 2.75], [5.4, 2.75]]) {
                const [cx, cy] = iso(wx, wy, 0.45);
                shape(P, ellipse(cx, cy, 11, 13, 14), [['blue', 0.78]], { lw: 0.85 });
                shape(P, ellipse(cx, cy, 4.5, 5.5, 10), [['sun', 0.8]], { lw: 0.65 });
            }
            // Main mobile vending cart chassis & insulated compartments
            block(P, 2.8, 2.7, 0.48, 3.1, 1.95, 1.05, [['teal', 0.62]], { top: WOOD });
            // Vending counter display bins & goods on top
            block(P, 3.05, 2.95, 1.53, 1.15, 1.45, 0.34, [['sun', 0.68]], { lw: 0.65 });
            block(P, 4.45, 2.95, 1.53, 1.15, 1.45, 0.34, [['coral', 0.62]], { lw: 0.65 });
            // Push handles extending on right side
            P.line([iso(5.9, 3.05, 1.35), iso(6.55, 3.05, 1.48)], 2.2, 'blue');
            P.line([iso(5.9, 4.3, 1.35), iso(6.55, 4.3, 1.48)], 2.2, 'blue');
            P.line([iso(6.55, 3.05, 1.48), iso(6.55, 4.3, 1.48)], 2.2, 'coral');

            // 4 tubular steel canopy uprights
            for (const [px, py] of [[2.95, 2.85], [5.75, 2.85], [2.95, 4.5], [5.75, 4.5]]) {
                P.line([iso(px, py, 1.53), iso(px, py, 2.65)], 1.8, 'blue');
            }
            // Tilted photovoltaic solar roof canopy
            const panel = [iso(2.65, 2.55, 2.55), iso(6.05, 2.55, 2.85), iso(6.05, 4.85, 2.85), iso(2.65, 4.85, 2.55)];
            shape(P, panel, SOLAR, { lw: 1.1 });
            // Photovoltaic cell grid lines across the solar canopy
            for (let k = 1; k < 5; k++) {
                const u = k / 5;
                P.chalk([iso(lerp(2.65, 6.05, u), 2.55, lerp(2.55, 2.85, u)), iso(lerp(2.65, 6.05, u), 4.85, lerp(2.55, 2.85, u))], 0.85, false, 0.78);
            }
            for (let k = 1; k < 3; k++) {
                const v = k / 3;
                P.chalk([iso(2.65, lerp(2.55, 4.85, v), 2.55), iso(6.05, lerp(2.55, 4.85, v), 2.85)], 0.85, false, 0.78);
            }
        },
        mid(P, t) {
            // Animated sun glint sweeping across the solar panel canopy
            const sweep = (t * 0.45) % 1;
            const gx = lerp(2.85, 5.85, sweep), gz = lerp(2.58, 2.84, sweep);
            P.chalk([iso(gx, 2.68, gz), iso(gx + 0.35, 4.72, gz + 0.03)], 2.4, false, 0.55);

            // Animated solar energy pulse traveling down power conduit into cart battery
            for (let k = 0; k < 3; k++) {
                const p = (t * 0.8 + k * 0.33) % 1;
                const [ex, ey] = iso(5.75, 2.85, lerp(2.65, 1.35, p));
                P.dot(ex, ey, 2.8, 'sun', 0.95);
            }

            // Cart's glowing under-canopy LED lamp
            const [lx, ly] = iso(4.35, 3.65, 2.45);
            P.dot(lx, ly, 4.2 + Math.sin(t * 4) * 0.6, 'sun', 0.9);

            // Inventor adjusting solar wiring beside cart
            const [i1x, i1y] = iso(6.55, 4.95, 0);
            figure(P, i1x, i1y, { shirt: ORANGE, pose: 'reach', t, s: 1.06 });

            // Engineer inspecting blueprint at drafting desk
            const [i2x, i2y] = iso(2.25, 2.2 + Math.sin(t * 0.55) * 0.4, 0);
            figure(P, i2x, i2y, { shirt: [['blue', 0.72]], pose: 'walk', t, s: 1.02 });
        },
        over(P, R) {
            // Toolbox & spare solar cell crate in foreground
            block(P, 1.2, 5.8, 0, 1.35, 0.85, 0.55, RED);
            plant(P, 7.1, 6.6, R, 0.95);
        },
        lamp(P, t) {
            lamp(P, 2.1, 5.1, 2.85, t, 0.5, 'sun');
        }
    };

    // ---------- Room 2: Biodegradable Planting Pots Eco-Materials Studio ----------
    // Pending Patent: Biodegradable Planting Pots (App. 202131043278)

    const ecoPotsStudio = {
        id: 'eco-pots',
        under(P, R) {
            shell(P, [['coral', 0.24], ['sun', 0.2]], [['sun', 0.28], ['coral', 0.16]]);
            // Terracotta tile floor grid
            for (let a = 0; a < W; a += 2) for (let b = 0; b < D; b += 2) {
                if (((a + b) / 2) % 2) P.fill(flat(a, b, 0, 2, 2), 'coral', 0.12);
                P.line(flat(a, b, 0, 2, 2), 0.45, 'blue', true, 0.2);
            }

            // Back-wall sunlit workshop windows
            shape(P, onBack(4.4, 7.3, 1.05, 2.7), [['sun', 0.22], ['teal', 0.12]]);
            P.line([iso(5.85, 0, 1.05), iso(5.85, 0, 2.7)], 1.4);
            P.line([iso(4.4, 0, 1.88), iso(7.3, 0, 1.88)], 1.4);

            // Back-wall multi-tier drying rack filled with biodegradable coir/fiber pots
            block(P, 0.7, 0.15, 0, 3.2, 0.85, 2.45, WOOD);
            for (let s = 0; s < 3; s++) {
                const z = 0.42 + s * 0.72;
                block(P, 0.75, 0.18, z, 3.1, 0.8, 0.08, WOOD_DK, { lw: 0.6 });
                for (let k = 0; k < 5; k++) {
                    const px = 1.1 + k * 0.6;
                    cyl(P, px, 0.58, z + 0.08, 0.2, 0.34, s === 2 ? CLAY : [['coral', 0.48], ['sun', 0.52]], { lw: 0.55 });
                    if (s === 2) {
                        const [sx, sy] = iso(px, 0.58, z + 0.44);
                        P.line([[sx, sy], [sx - 4, sy - 8]], 1.2, 'teal');
                        P.line([[sx, sy], [sx + 4, sy - 9]], 1.2, 'teal');
                    }
                }
            }

            // Left-wall natural fiber & organic pulp mixing vat
            cyl(P, 1.0, 3.2, 0, 0.78, 1.05, WOOD_DK, { cap: SOIL });
            // Stacked bales of coconut coir / agricultural husk fibers
            block(P, 0.25, 4.6, 0, 1.35, 1.9, 0.75, [['sun', 0.62], ['coral', 0.34]]);
            block(P, 0.35, 4.8, 0.75, 1.15, 1.5, 0.65, [['sun', 0.55], ['coral', 0.28]]);

            // CENTERPIECE: Mechanical Biodegradable Pot-Molding Press Bench
            block(P, 2.7, 2.4, 0, 2.6, 1.8, 0.95, WOOD_DK, { top: WOOD });
            // Cast-iron press frame arch
            block(P, 3.15, 2.75, 0.95, 0.22, 0.22, 1.35, [['blue', 0.72]], { lw: 0.6 });
            block(P, 4.65, 2.75, 0.95, 0.22, 0.22, 1.35, [['blue', 0.72]], { lw: 0.6 });
            block(P, 3.08, 2.7, 2.25, 1.86, 0.34, 0.24, [['blue', 0.78]]);
            // Bottom pot mold die
            cyl(P, 4.0, 3.25, 0.95, 0.38, 0.32, [['blue', 0.45]]);
            // Freshly molded biodegradable pot sitting beside the press
            cyl(P, 4.9, 3.45, 0.95, 0.24, 0.38, CLAY, { lw: 0.65 });

            // Right-side sprouting nursery table with thriving biodegradable pots
            block(P, 5.5, 3.6, 0, 2.1, 3.4, 0.88, WOOD, { top: [['sun', 0.22]] });
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 2; c++) {
                    const px = 6.05 + c * 0.95, py = 4.2 + r * 1.02;
                    cyl(P, px, py, 0.88, 0.28, 0.42, CLAY, { lw: 0.65 });
                    const [sx, sy] = iso(px, py, 1.32);
                    for (let k = -1; k <= 1; k++) {
                        shape(P, [[sx, sy], [sx + k * 7 - 2, sy - 11], [sx + k * 9, sy - 15], [sx + k * 5 + 3, sy - 9]], k === 0 ? LEAF : GREEN, { lw: 0.6 });
                    }
                }
            }
        },
        mid(P, t) {
            // Animated vertical press piston + rotating lever handle molding a biodegradable pot
            const cyc = (Math.sin(t * 2.1) * 0.5 + 0.5);
            const pressZ = lerp(1.92, 1.32, ease(cyc));
            P.line([iso(4.0, 2.86, 2.25), iso(4.0, 2.86, pressZ)], 2.8, 'blue');
            cyl(P, 4.0, 3.25, pressZ - 0.16, 0.32, 0.22, [['coral', 0.8]], { lw: 0.65 });
            // Lever handle swinging with press
            P.line([iso(4.85, 2.86, 2.15), iso(5.45, 2.86, lerp(2.55, 1.72, ease(cyc)))], 2.2, 'coral');

            // Gentle water droplets over nursery sprouting pots
            for (let k = 0; k < 4; k++) {
                const p = (t * 0.75 + k * 0.25) % 1;
                const [wx, wy] = iso(6.05 + (k % 2) * 0.95, 4.2 + Math.floor(k / 2) * 1.1, 2.15 - p * 0.85);
                P.dot(wx, wy, 1.7, 'teal', 0.55 * (1 - p));
            }

            // Maker operating the biodegradable pot press
            const [m1x, m1y] = iso(3.85, 4.65, 0);
            figure(P, m1x, m1y, { shirt: GREEN, pose: 'reach', t, s: 1.06 });

            // Assistant inspecting sprouting pots on nursery table
            const [m2x, m2y] = iso(4.8, 5.7 + Math.sin(t * 0.6) * 0.35, 0);
            figure(P, m2x, m2y, { shirt: [['sun', 0.88]], pose: 'walk', t, s: 1.02 });
        },
        over(P, R) {
            plant(P, 1.8, 6.8, R, 1.15);
            cyl(P, 2.9, 6.9, 0, 0.32, 0.45, CLAY);
        },
        lamp(P, t) {
            lamp(P, 4.0, 3.8, 2.75, t, 1.4, 'sun');
        }
    };

    // ---------- Room 3: Rashtriya Bal Puraskar, FRAS & Philately Hall of Honors ----------
    // Bal Puraskar (2023) + Fellow of the Royal Asiatic Society (2021) + Philately Scholarship (2019) + Books

    const honorsGallery = {
        id: 'honors-gallery',
        under(P, R) {
            shell(P, [['coral', 0.18], ['sun', 0.24]], [['sun', 0.26], ['coral', 0.12]]);
            // Polished parquet herringbone floor
            for (let n = 1; n < W; n++) P.line([iso(n, 0, 0), iso(n, D, 0)], 0.45, 'coral', false, 0.18);
            // Royal crimson-coral carpet runner leading to the medal plinth
            shape(P, flat(2.5, 0.4, 0.02, 2.8, 7.2), [['coral', 0.72], ['blue', 0.12]], { lw: 0.85 });
            shape(P, flat(2.72, 0.55, 0.03, 2.36, 6.9), [['sun', 0.25]], { lw: 0.65 });

            // Back-wall gallery frames: Bal Puraskar Citation, FRAS Fellowship Scroll, Letters of Appreciation
            const frames = [
                { i0: 0.9, i1: 2.5, z0: 1.15, z1: 2.55, fill: [['sun', 0.24]] },
                { i0: 3.1, i1: 4.9, z0: 1.1, z1: 2.65, fill: [['coral', 0.16], ['sun', 0.22]] },
                { i0: 5.5, i1: 7.1, z0: 1.15, z1: 2.55, fill: [['teal', 0.16], ['sun', 0.2]] }
            ];
            for (const f of frames) {
                block(P, f.i0, 0.04, f.z0, f.i1 - f.i0, 0.1, f.z1 - f.z0, GOLD, { lw: 0.85 });
                shape(P, onBack(f.i0 + 0.16, f.i1 - 0.16, f.z0 + 0.16, f.z1 - 0.16, 0.15), f.fill, { lw: 0.6 });
                shape(P, backRing((f.i0 + f.i1) / 2, f.z0 + 0.45, 0.16, 12, 0.16), GOLD, { lw: 0.55 });
            }

            // Left-wall Royal Asiatic Society (FRAS) mahogany bookcase with published books & volumes
            block(P, 0.1, 1.0, 0, 0.95, 4.2, 2.55, WOOD_DK);
            for (let s = 0; s < 4; s++) {
                const z = 0.22 + s * 0.58;
                let j = 1.15;
                while (j < 4.95) {
                    const th = 0.18 + R() * 0.14;
                    if (j + th > 5.05) break;
                    block(P, 0.2, j, z, 0.72, th, 0.42 + R() * 0.08, pick(R, BOOKS), { lw: 0.5, shade: 0.42 });
                    j += th + 0.03;
                }
            }

            // CENTERPIECE: Rashtriya Bal Puraskar Gold Medallion Display Plinth
            block(P, 3.25, 2.55, 0, 1.35, 1.35, 1.15, [['blue', 0.24]], { top: [['sun', 0.14]] });
            // Glass display vitrine cube on plinth
            block(P, 3.4, 2.7, 1.15, 1.05, 1.05, 0.95, [['teal', 0.12]], { top: [['teal', 0.08]], lw: 0.65, shade: 0.2 });
            // Velvet cushion inside vitrine
            block(P, 3.58, 2.88, 1.16, 0.7, 0.7, 0.18, RED, { lw: 0.55 });

            // Brass museum stanchions around the medallion plinth
            for (const [sx, sy] of [[2.65, 2.35], [5.15, 2.35], [2.65, 4.35], [5.15, 4.35]]) {
                cyl(P, sx, sy, 0, 0.12, 0.85, GOLD, { lw: 0.55 });
            }
            P.line([iso(2.65, 2.35, 0.72), iso(2.65, 4.35, 0.72)], 1.4, 'coral');
            P.line([iso(5.15, 2.35, 0.72), iso(5.15, 4.35, 0.72)], 1.4, 'coral');

            // Right-side illuminated Philately Display Cabinet (Deen Dayal Sparsh Yojana Scholarship)
            block(P, 5.7, 2.6, 0, 1.85, 3.2, 0.92, WOOD_DK, { top: [['sun', 0.14]] });
            // Mounted colonial & Indian postage stamp plates under glass
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 2; c++) {
                    const si = 5.95 + c * 0.75, sj = 2.95 + r * 0.9;
                    shape(P, flat(si, sj, 0.95, 0.55, 0.68), (r + c) % 2 ? RED : [['teal', 0.68]], { lw: 0.6 });
                    shape(P, flat(si + 0.1, sj + 0.12, 0.96, 0.35, 0.44), [['sun', 0.82]], { lw: 0.45 });
                }
            }
        },
        mid(P, t) {
            // Gleaming Rashtriya Bal Puraskar Gold Medallion rotating gently inside vitrine
            const [mx, my] = iso(3.92, 3.22, 1.62 + Math.sin(t * 2.2) * 0.04);
            const rx = 6.5 * (0.65 + 0.35 * Math.abs(Math.cos(t * 1.4)));
            // Ribbon & medallion
            P.line([[mx - 4, my - 10], [mx, my - 4], [mx + 4, my - 10]], 1.8, 'coral');
            shape(P, ellipse(mx, my, rx, 6.8, 14), GOLD, { lw: 0.8 });
            // Soft golden shimmer rays
            const sparkle = 0.45 + 0.45 * Math.sin(t * 4.2);
            P.dot(mx, my, 12 * sparkle, 'sun', 0.32 * sparkle);

            // Laureate / visitor admiring the Bal Puraskar medallion
            const [v1x, v1y] = iso(3.85, 5.15, 0);
            figure(P, v1x, v1y, { shirt: [['blue', 0.78]], pose: 'stand', t, s: 1.06 });

            // Visitor examining philately stamp cabinet
            const [v2x, v2y] = iso(5.1, 4.7 + Math.sin(t * 0.5) * 0.35, 0);
            figure(P, v2x, v2y, { shirt: [['teal', 0.75]], pose: 'reach', t, s: 1.03 });
        },
        over(P, R) {
            plant(P, 1.3, 6.4, R, 1.1);
            // Gallery velvet bench in foreground
            block(P, 5.2, 6.3, 0.48, 2.1, 0.9, 0.18, RED);
            for (const [lx, ly] of [[5.35, 6.42], [7.15, 6.42], [5.35, 7.08], [7.15, 7.08]]) {
                block(P, lx, ly, 0, 0.12, 0.12, 0.48, GOLD, { lw: 0.5 });
            }
        },
        lamp(P, t) {
            lamp(P, 3.92, 3.22, 2.8, t, 2.3, 'sun');
        }
    };

    // ---------- Room 4: NASA Wallops Launchpad & CiS Mission Patch Control ----------
    // CiS Mission Patch Winner (2022) — Sounding Rocket from NASA Wallops Flight Facility, Virginia

    const wallopsLaunch = {
        id: 'wallops-launch',
        under(P, R) {
            shell(P, [['blue', 0.28], ['teal', 0.12]], [['blue', 0.14], ['sun', 0.1]]);
            // Concrete launchpad apron & blast-deflector hazard stripes
            for (let n = 1; n < W; n++) {
                P.line([iso(n, 0, 0), iso(n, D, 0)], 0.45, 'blue', false, 0.18);
                P.line([iso(0, n, 0), iso(W, n, 0)], 0.45, 'blue', false, 0.18);
            }
            // Blast pad octagonal concrete plinth
            block(P, 3.2, 2.2, 0, 3.6, 3.6, 0.34, [['blue', 0.28]], { top: [['sun', 0.24]] });
            shape(P, flat(3.65, 2.65, 0.35, 2.7, 2.7), [['coral', 0.28]], { lw: 0.75 });
            shape(P, flat(4.3, 3.3, 0.36, 1.4, 1.4), SLATE, { lw: 0.7 });

            // Back-wall large framed circular CiS Mission Patch emblem plaque
            shape(P, backRing(2.1, 1.9, 0.78, 20, 0.04), [['blue', 0.85]], { lw: 1.0 });
            shape(P, backRing(2.1, 1.9, 0.62, 18, 0.05), [['sun', 0.88]], { lw: 0.7 });
            shape(P, backRing(2.1, 1.9, 0.36, 14, 0.06), RED, { lw: 0.6 });
            P.chalk([iso(1.85, 0.07, 1.65), iso(2.35, 0.07, 2.15)], 1.3, false, 0.95);

            // Red-and-white NASA umbilical launch gantry tower behind the rocket
            const tx = 5.45, ty = 2.35;
            for (const [dx, dy] of [[0, 0], [0.95, 0], [0, 0.95], [0.95, 0.95]]) {
                P.line([iso(tx + dx, ty + dy, 0.34), iso(tx + dx, ty + dy, 3.65)], 1.7, 'coral');
            }
            for (let z = 0.7; z <= 3.5; z += 0.62) {
                P.line([iso(tx, ty, z), iso(tx + 0.95, ty, z), iso(tx + 0.95, ty + 0.95, z), iso(tx, ty + 0.95, z)], 1.1, 'coral', true, 0.15);
                P.line([iso(tx, ty + 0.95, z), iso(tx + 0.95, ty + 0.95, z + 0.6)], 0.9, 'coral', false, 0.12);
                P.line([iso(tx + 0.95, ty, z), iso(tx + 0.95, ty + 0.95, z + 0.6)], 0.9, 'coral', false, 0.12);
            }
            // Swing umbilical arm reaching toward sounding rocket
            P.line([iso(tx, ty + 0.5, 2.45), iso(4.95, 3.65, 2.45)], 1.8, 'blue');

            // Left-wall Wallops Mission Control Telemetry Console
            block(P, 0.2, 2.2, 0, 1.5, 4.4, 0.95, [['blue', 0.42]], { top: STEEL });
            // Dual telemetry radar & trajectory screens mounted on left wall
            block(P, 0.15, 2.45, 1.15, 0.22, 1.75, 1.15, [['blue', 0.76]]);
            shape(P, onLeft(2.58, 4.08, 1.28, 2.18, 0.38), SLATE, { lw: 0.7 });
            block(P, 0.15, 4.55, 1.15, 0.22, 1.75, 1.15, [['blue', 0.76]]);
            shape(P, onLeft(4.68, 6.18, 1.28, 2.18, 0.38), SLATE, { lw: 0.7 });
            // Console switches & countdown indicator bar
            for (let k = 0; k < 6; k++) {
                const [bx, by] = iso(0.95, 2.6 + k * 0.65, 0.98);
                P.dot(bx, by, 2.5, k % 2 ? 'coral' : 'teal', 0.85);
            }
            // Control chair
            block(P, 1.95, 3.9, 0.45, 0.75, 0.75, 0.12, [['coral', 0.72]]);
            cyl(P, 2.32, 4.28, 0, 0.1, 0.45, [['blue', 0.65]], { lw: 0.5 });
        },
        mid(P, t) {
            // Periodic Sounding Rocket ignition & liftoff cycle (7.5s period)
            const cyc = (t % 7.5) / 7.5;
            let rz = 0.38;
            let firing = false;
            let shake = 0;
            if (cyc > 0.42 && cyc < 0.55) {
                firing = true;
                shake = Math.sin(t * 55) * 0.04;
            } else if (cyc >= 0.55 && cyc < 0.86) {
                firing = true;
                const u = (cyc - 0.55) / 0.31;
                rz = 0.38 + u * u * 3.4;
            } else if (cyc >= 0.86) {
                const u = (cyc - 0.86) / 0.14;
                rz = lerp(3.78, 0.38, ease(u));
            }

            // Telemetry trajectory arc & live rocket blip on left-wall radar screens
            const arc = [];
            for (let k = 0; k <= 10; k++) {
                const u = k / 10;
                arc.push(iso(0.4, 2.7 + u * 1.25, 1.42 + Math.sin(u * Math.PI) * 0.62));
            }
            P.line(arc, 1.3, 'teal', false, 0.1);
            const prog = cyc >= 0.55 && cyc < 0.86 ? (cyc - 0.55) / 0.31 : 0.08;
            const [rx, ry] = iso(0.41, 2.7 + prog * 1.25, 1.42 + Math.sin(prog * Math.PI) * 0.62);
            P.dot(rx, ry, 3.0, 'sun', 0.95);

            // Second telemetry monitor: live altitude / thrust waveform
            const wave = [];
            for (let k = 0; k <= 10; k++) {
                const u = k / 10;
                wave.push(iso(0.4, 4.8 + u * 1.25, 1.65 + Math.sin(u * 12 + t * 5) * (firing ? 0.25 : 0.08)));
            }
            P.line(wave, 1.2, 'coral', false, 0.1);

            // Billowing sun/coral launch exhaust clouds at base of pad when firing
            if (firing) {
                for (let k = 0; k < 7; k++) {
                    const a = k * 0.95 + t * 2.2;
                    const spread = 0.3 + ((t * 1.6 + k * 0.2) % 1) * 1.1;
                    const [px, py] = iso(4.95 + Math.cos(a) * spread, 3.95 + Math.sin(a) * spread, 0.48 + (k % 3) * 0.18);
                    shape(P, circle(px, py, 7 + (k % 3) * 3, 10), k % 2 ? [['sun', 0.82]] : [['coral', 0.65]], { lw: 0.6 });
                }
            }

            // NASA Sounding Rocket (sleek white fuselage, coral fins, CiS patch stripe, nosecone)
            if (rz < 3.65) {
                const cx = 4.95 + shake, cy = 3.95;
                // Tail fins
                const [bx, by] = iso(cx, cy, rz);
                shape(P, [[bx - 12, by + 3], [bx - 4, by - 14], [bx - 4, by + 2]], RED, { lw: 0.75 });
                shape(P, [[bx + 12, by + 3], [bx + 4, by - 14], [bx + 4, by + 2]], RED, { lw: 0.75 });
                // Exhaust flame cone
                if (firing) {
                    shape(P, [[bx - 4.5, by + 2], [bx + 4.5, by + 2], [bx, by + 18 + Math.sin(t * 45) * 4]], GOLD, { lw: 0.6 });
                }
                // Rocket body cylinder
                cyl(P, cx, cy, rz, 0.24, 1.95, [['sun', 0.06]], { cap: RED, lw: 0.9 });
                // CiS Mission Patch circular decal on rocket fairing
                const [px, py] = iso(cx, cy, rz + 1.18);
                shape(P, circle(px, py, 4.4, 10), [['blue', 0.85]], { lw: 0.55 });
                P.dot(px, py, 2.3, 'sun', 0.95);
                // Coral nosecone tip
                const [nx, ny] = iso(cx, cy, rz + 1.95);
                shape(P, [[nx - 7.8, ny], [nx + 7.8, ny], [nx, ny - 21]], RED, { lw: 0.85 });
            }

            // Flight engineer seated at Wallops console
            const [f1x, f1y] = iso(2.3, 4.15, 0.24);
            figure(P, f1x, f1y, { shirt: [['blue', 0.78]], pose: 'sit', t, s: 1.04 });

            // Launch director watching rocket liftoff from safe perimeter
            const [f2x, f2y] = iso(3.2, 6.25, 0);
            figure(P, f2x, f2y, { shirt: [['teal', 0.82]], pose: firing ? 'reach' : 'stand', t, s: 1.04 });
        },
        over(P, R) {
            // Coastal radar dish & safety cone in front-right corner
            cyl(P, 6.9, 6.4, 0, 0.22, 0.65, [['blue', 0.65]]);
            const [dx, dy] = iso(6.9, 6.4, 0.85);
            shape(P, ellipse(dx, dy, 10, 6, 12), [['sun', 0.2]], { lw: 0.8 });
            P.line([[dx, dy], [dx - 5, dy - 7]], 1.2, 'coral');
            plant(P, 1.2, 7.1, R, 0.85);
        },
        lamp(P, t) {
            lamp(P, 2.4, 4.5, 2.85, t, 3.1, 'teal');
        }
    };

    // ---------- 2x2 Room Grid Layout ----------

    const ROOMS = [
        { ...solarWorkshop, ci: 0, cj: 0 },
        { ...ecoPotsStudio, ci: 1, cj: 0 },
        { ...honorsGallery, ci: 0, cj: 1 },
        { ...wallopsLaunch, ci: 1, cj: 1 }
    ];

    const BX0 = -D * TW / 2 - 36, BX1 = W * TW / 2 + 36;
    const BY0 = -(H + 1.5) * TZ - 16, BY1 = (W + D) * TH / 2 + 0.4 * TZ + 26;
    const BH = BY1 - BY0;
    const CARD = [iso(-0.3, -0.3, 0), iso(W, -0.3, 0), iso(W, 0, -0.4), iso(W, D, -0.4), iso(0, D, -0.4), iso(-0.3, D, 0)];

    function hull(pts) {
        pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for (const p of pts.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
        return lo.slice(0, -1).concat(up.slice(0, -1));
    }

    for (const r of ROOMS) {
        const [ox, oy] = iso(r.ci * PITCH, r.cj * PITCH, 0);
        r.ox = ox; r.oy = oy;
        r.bx0 = BX0;
        r.bw = BX1 - BX0;
        r.box = { x0: ox + BX0, y0: oy + BY0, x1: ox + BX1, y1: oy + BY1 };
        const corners = [];
        for (const i of [-0.3, W]) for (const j of [-0.3, D]) for (const z of [-0.4, H + 0.8]) corners.push(iso(i, j, z));
        r.hull = hull(corners).map(([x, y]) => [x + ox, y + oy]);
    }
    ROOMS.sort((a, b) => (a.ci + a.cj) - (b.ci + b.cj) || a.ci - b.ci);

    const WORLD = {
        x0: Math.min(...ROOMS.map(r => r.box.x0)),
        y0: Math.min(...ROOMS.map(r => r.box.y0)),
        x1: Math.max(...ROOMS.map(r => r.box.x1)),
        y1: Math.max(...ROOMS.map(r => r.box.y1))
    };

    // ---------- Bitmap layer cache ----------

    const cache = new Map();
    const CACHE_MAX = 36;
    const BUCKETS = [0.5, 0.85, 1.25, 1.85, 2.6];

    function renderLayer(room, layer, variant, scale) {
        const cv = document.createElement('canvas');
        cv.width = Math.ceil(room.bw * scale);
        cv.height = Math.ceil(BH * scale);
        const c = cv.getContext('2d');
        c.setTransform(scale, 0, 0, scale, -room.bx0 * scale, -BY0 * scale);
        const P = Pen(c, hash(room.id, layer, variant));
        try { room[layer](P, rand(hash(room.id, 'layout', layer))); } catch (err) { console.error(room.id, layer, err); }
        return cv;
    }

    let budget = 0, frameDeadline = 0;
    function fallbackLayer(room, layer, scale) {
        const exact = cache.get(room.id + '|' + layer + '|0|' + scale);
        if (exact) return exact;
        for (const [k, v] of cache) if (k.startsWith(room.id + '|' + layer + '|')) return v;
        return null;
    }

    function layerFor(room, layer, variant, scale) {
        const key = room.id + '|' + layer + '|' + variant + '|' + scale;
        let cv = cache.get(key);
        if (cv) {
            cache.delete(key);
            cache.set(key, cv);
            return cv;
        }
        const existing = fallbackLayer(room, layer, scale);
        if (budget > 0 && (!existing || performance.now() < frameDeadline)) {
            budget--;
            const v = existing ? variant : 0;
            const k = room.id + '|' + layer + '|' + v + '|' + scale;
            cv = renderLayer(room, layer, v, scale);
            cache.set(k, cv);
            while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
            return cv;
        }
        return existing;
    }

    // ---------- Camera & Interaction ----------

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vw = 960, vh = 600, dpr = 1;
    const cam = { x: 0, y: 0, zoom: 1 };
    let tween = null, focusedRoom = null, hoverRoom = null;

    const fit = b => Math.min(vw / (b.x1 - b.x0), vh / (b.y1 - b.y0));
    const overview = () => ({ x: (WORLD.x0 + WORLD.x1) / 2, y: (WORLD.y0 + WORLD.y1) / 2, zoom: fit(WORLD) * 0.96 });
    const roomView = r => ({ x: (r.box.x0 + r.box.x1) / 2, y: (r.box.y0 + r.box.y1) / 2 + 12, zoom: Math.min(2.4, fit(r.box) * 1.04) });

    function flyTo(target, dur = 680) {
        tween = { from: { ...cam }, to: target, start: performance.now(), dur };
    }

    function resize() {
        const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 960;
        vw = Math.max(320, Math.round(parentW));
        vh = Math.round(clamp(vw * 0.62, 340, 620));
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = vw + 'px';
        canvas.style.height = vh + 'px';
        const target = focusedRoom ? roomView(focusedRoom) : overview();
        cam.x = target.x; cam.y = target.y; cam.zoom = target.zoom;
        tween = null;
    }

    function toWorld(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const sx = (clientX - rect.left) * (vw / rect.width);
        const sy = (clientY - rect.top) * (vh / rect.height);
        return [(sx - vw / 2) / cam.zoom + cam.x, (sy - vh / 2) / cam.zoom + cam.y];
    }

    function inPoly(x, y, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    function roomAt(wx, wy) {
        for (let k = ROOMS.length - 1; k >= 0; k--) {
            if (inPoly(wx, wy, ROOMS[k].hull)) return ROOMS[k];
        }
        return null;
    }

    let drag = null;
    canvas.addEventListener('pointerdown', e => {
        drag = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        const [wx, wy] = toWorld(e.clientX, e.clientY);
        hoverRoom = roomAt(wx, wy);
        canvas.style.cursor = drag && drag.moved ? 'grabbing' : (hoverRoom ? 'pointer' : 'grab');
        if (!drag) return;
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
            drag.moved = true;
            tween = null;
        }
        if (drag.moved) {
            const rect = canvas.getBoundingClientRect();
            cam.x = drag.cx - dx * (vw / rect.width) / cam.zoom;
            cam.y = drag.cy - dy * (vh / rect.height) / cam.zoom;
        }
    });
    canvas.addEventListener('pointerup', e => {
        if (!drag) return;
        const wasMoved = drag.moved;
        drag = null;
        if (!wasMoved) {
            const [wx, wy] = toWorld(e.clientX, e.clientY);
            const hit = roomAt(wx, wy);
            if (hit && hit !== focusedRoom) {
                focusedRoom = hit;
                flyTo(roomView(hit));
            } else {
                focusedRoom = null;
                flyTo(overview());
            }
        }
    });
    canvas.addEventListener('pointerleave', () => { hoverRoom = null; });
    canvas.addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        tween = null;
        const [wx, wy] = toWorld(e.clientX, e.clientY);
        const factor = Math.exp(-e.deltaY * 0.0025);
        const minZ = overview().zoom * 0.7;
        cam.zoom = clamp(cam.zoom * factor, minZ, 2.6);
        const [wx2, wy2] = toWorld(e.clientX, e.clientY);
        cam.x += wx - wx2;
        cam.y += wy - wy2;
    }, { passive: false });

    // ---------- Render loop ----------

    function draw(now) {
        if (tween) {
            const k = clamp((now - tween.start) / tween.dur, 0, 1), e = ease(k);
            cam.x = lerp(tween.from.x, tween.to.x, e);
            cam.y = lerp(tween.from.y, tween.to.y, e);
            cam.zoom = Math.exp(lerp(Math.log(tween.from.zoom), Math.log(tween.to.zoom), e));
            if (k >= 1) tween = null;
        }

        const t = reducedMotion ? 0 : now / 1000;
        const boil = reducedMotion ? 0 : Math.floor(t * 4) % 3;
        const targetScale = cam.zoom * dpr;
        let bucket = BUCKETS[BUCKETS.length - 1];
        for (const b of BUCKETS) { if (b >= targetScale * 0.88) { bucket = b; break; } }

        budget = 2;
        frameDeadline = performance.now() + 8;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(cam.zoom * dpr, 0, 0, cam.zoom * dpr, (vw / 2 - cam.x * cam.zoom) * dpr, (vh / 2 - cam.y * cam.zoom) * dpr);

        for (const r of ROOMS) {
            ctx.save();
            ctx.translate(r.ox, r.oy);

            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.translate(10, 16);
            ctx.beginPath();
            ctx.moveTo(CARD[0][0], CARD[0][1]);
            for (let k = 1; k < CARD.length; k++) ctx.lineTo(CARD[k][0], CARD[k][1]);
            ctx.closePath();
            ctx.fillStyle = rgba(INK.blue, hoverRoom === r ? 0.14 : 0.08);
            ctx.fill();
            ctx.restore();

            const under = layerFor(r, 'under', boil, bucket);
            if (under) ctx.drawImage(under, r.bx0, BY0, r.bw, BH);

            const P = Pen(ctx, hash(r.id, 'mid', boil));
            r.mid(P, t);

            const over = layerFor(r, 'over', boil, bucket);
            if (over) ctx.drawImage(over, r.bx0, BY0, r.bw, BH);

            if (r.lamp) r.lamp(Pen(ctx, hash(r.id, 'lamp', boil)), t);
            ctx.restore();
        }

        if (document.documentElement.classList.contains('night')) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
})();
