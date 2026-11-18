/**
 * The Wilkins Building, UCL - drawn in the same risograph style as the paper rooms.
 * Portico, dome, the two wings and the front quad, with students coming and going.
 */

(function () {
'use strict';

    const canvas = document.getElementById('ucl-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    // ---------- Print settings ----------

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

    const GREEN = [['teal', 0.75], ['sun', 0.55]];
    const LEAF = [['teal', 0.5], ['sun', 0.8]];
    const WOOD = [['coral', 0.45], ['sun', 0.45]];
    const STONE = [['sun', 0.22], ['coral', 0.08]];
    const STONE_DK = [['sun', 0.3], ['coral', 0.16], ['blue', 0.08]];
    const PAVE = [['sun', 0.4], ['coral', 0.14]];
    const LEAD = [['blue', 0.32], ['teal', 0.28]];
    const GLASS = [['blue', 0.6], ['teal', 0.15]];
    const PURPLE = [['blue', 0.6], ['coral', 0.55]];

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

    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const pingpong = x => { const f = ((x % 2) + 2) % 2; return f < 1 ? f : 2 - f; };

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
        const R = rand(hash('screen', ink, level));
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

    // ---------- Pen: hand-drawn riso marks ----------

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

        P.line = (pts, w = 1, ink = 'blue', closed = false, amp = 0.45) => {
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

        P.dot = (x, y, r, ink, tone, ry = 1) => {
            P.fill(ellipse(x, y, r, r * ry, 12), ink, tone);
        };

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

    // ---------- Isometric geometry ----------

    const TW = 48, TH = 24, TZ = 26;

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

    // ---------- Shapes ----------

    function paint(P, pts, fills, k, shade) {
        P.knock(pts);
        for (const [ink, tone] of fills) P.fill(pts, ink, Math.min(1, tone * k));
        if (shade) P.fill(pts, 'blue', shade);
    }

    function shape(P, pts, fills = [], o = {}) {
        paint(P, pts, fills, 1, o.shade || 0);
        if (o.line !== false) P.line(pts, o.lw ?? 1, 'blue', true, o.amp ?? 0.45);
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

    function blob(P, x, y, r, fills, R, o = {}) {
        const pts = [];
        const n = 11;
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU, rr = r * (0.82 + R() * 0.3);
            pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.squash ?? 0.9)]);
        }
        shape(P, pts, fills, { lw: o.lw ?? 0.9, shade: o.shade || 0 });
    }

    function figure(P, x, y, o = {}) {
        const s = o.s || 1, t = o.t || 0, pose = o.pose || 'stand';
        P.dot(x, y, 8 * s, 'blue', 0.22, 0.4);
        const sit = pose === 'sit';
        const step = pose === 'walk' ? Math.sin(t * 9) * 3.2 * s : 0;
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
        const swing = step * 0.6, up = o.armsUp ? 10 * s : 0;
        P.line([[x - 4.4 * s, neck + 1.5 * s], [x - 6.5 * s - swing, hip - 1 * s - up]], 2.2 * s, 'blue', false, 0.15);
        P.line([[x + 4.4 * s, neck + 1.5 * s], [x + 7 * s + swing, hip - 1 * s - up]], 2.2 * s, 'blue', false, 0.15);
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
        return hy;
    }

    function mortarboard(P, x, y, spin = 0) {
        const w = 6, h = 2.6, c = Math.cos(spin), s = Math.sin(spin);
        const pts = [[-w, 0], [0, -h], [w, 0], [0, h]].map(([dx, dy]) => [x + dx * c - dy * s * 0.4, y + dy + dx * s * 0.3]);
        shape(P, pts, [['blue', 0.95]], { lw: 0.6, amp: 0.1 });
        P.line([[x, y], [x + 3 * c, y + 4]], 0.7, 'sun', false, 0.05);
    }

    function ctxAlpha(P, a, fn) {
        P.c.save();
        P.c.globalAlpha = clamp(a, 0, 1);
        fn();
        P.c.restore();
    }

    // ---------- The building ----------

    const COLS = 10, COL_I0 = 5.95, COL_I1 = 10.05, COL_J = 2.95;
    const columnI = k => lerp(COL_I0, COL_I1, k / (COLS - 1));

    const scene = {
        under(P, R) {
            block(P, -0.5, -0.5, -0.4, 17, 12, 0.4, [['blue', 0.15]], { top: GREEN });
            shape(P, flat(2, 1.6, 0.01, 12, 3.3), PAVE, { lw: 0.8 });
            for (let n = 1; n < 12; n++) P.line([iso(2 + n, 1.6, 0.01), iso(2 + n, 4.9, 0.01)], 0.4, 'blue', false, 0.15);
            shape(P, flat(7.2, 4.9, 0.01, 1.6, 6.6), PAVE, { lw: 0.8 });
            shape(P, flat(-0.5, 7.4, 0.01, 17, 1.2), PAVE, { lw: 0.8 });
            const onPath = (i, j) => j < 4.95 || (i > 7.1 && i < 8.9) || (j > 7.3 && j < 8.7);
            for (let n = 0; n < 520; n++) {
                const i = -0.4 + R() * 16.8, j = R() * 11.4;
                if (onPath(i, j)) continue;
                const [x, y] = iso(i, j, 0);
                P.line([[x, y], [x + (R() - 0.5) * 2, y - 2.5 - R() * 2]], 0.7, R() < 0.6 ? 'teal' : 'sun', false, 0.1);
            }
            for (const [fi, fj] of [[3.2, 6.1], [12.8, 6.1], [3.2, 9.9], [12.8, 9.9]]) {
                for (let k = 0; k < 7; k++) {
                    const a = k / 7 * TAU;
                    const [x, y] = iso(fi + Math.cos(a) * 0.55, fj + Math.sin(a) * 0.55, 0.05);
                    shape(P, circle(x, y - 3, 2.6, 8), [[k % 2 ? 'coral' : 'sun', 0.85]], { lw: 0.5 });
                }
            }

            // main range
            block(P, 2, 0, 0, 12, 1.6, 3.3, STONE);
            P.line([iso(2, 1.6, 0.35), iso(14, 1.6, 0.35)], 0.7, 'blue', false, 0.2);
            P.line([iso(2, 1.6, 3.0), iso(14, 1.6, 3.0)], 0.9, 'blue', false, 0.2);
            for (const z0 of [0.6, 1.85]) {
                for (let i0 = 2.4; i0 < 5.2; i0 += 0.72) shape(P, onBack(i0, i0 + 0.36, z0, z0 + 0.78, 1.6), GLASS, { lw: 0.6, amp: 0.15 });
                for (let i0 = 10.85; i0 < 13.7; i0 += 0.72) shape(P, onBack(i0, i0 + 0.36, z0, z0 + 0.78, 1.6), GLASS, { lw: 0.6, amp: 0.15 });
            }
            block(P, 2, 0, 3.3, 12, 1.6, 0.14, STONE_DK, { lw: 0.8 });

            // north wing
            block(P, 0, 0, 0, 2, 4.4, 2.8, STONE);
            P.line([iso(2, 1.6, 2.55), iso(2, 4.4, 2.55), iso(0, 4.4, 2.55)], 0.8, 'blue', false, 0.2);
            for (const z0 of [0.5, 1.55]) {
                for (let j0 = 1.85; j0 < 4.2; j0 += 0.65) shape(P, onLeft(j0, j0 + 0.34, z0, z0 + 0.72, 2), GLASS, { lw: 0.6, amp: 0.15 });
                for (const i0 of [0.4, 1.2]) shape(P, onBack(i0, i0 + 0.36, z0, z0 + 0.72, 4.4), GLASS, { lw: 0.6, amp: 0.15 });
            }

            // dome
            cyl(P, 8, 0.8, 3.3, 0.95, 0.6, STONE, { cap: STONE_DK });
            const [dx, dy] = iso(8, 0.8, 3.9);
            const rx = 0.95 * 1.414 * TW / 2, ry = rx * TH / TW, hd = 34;
            for (let k = 0; k < 8; k++) {
                const a = Math.PI * (k + 0.5) / 8;
                const [px, py] = [dx + Math.cos(a) * rx, dy + Math.sin(a) * ry + 15];
                P.line([[px, py], [px, py - 12]], 0.6, 'blue', false, 0.1);
            }
            const dome = [];
            for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; dome.push([dx + Math.cos(a) * rx, dy + Math.sin(a) * ry]); }
            for (let k = 0; k <= 16; k++) { const a = Math.PI - Math.PI * k / 16; dome.push([dx + Math.cos(a) * rx, dy - Math.sin(a) * hd]); }
            shape(P, dome, LEAD, { shade: 0.1 });
            P.fill(dome.slice(0, 9).concat(dome.slice(25)), 'blue', 0.12);
            for (const sx of [-0.75, -0.4, 0, 0.4, 0.75]) {
                const pts = [];
                for (let u = 0; u <= 8; u++) {
                    const a = u / 8 * Math.PI / 2;
                    pts.push([dx + rx * sx * Math.cos(a), dy + ry * Math.sqrt(1 - sx * sx) * Math.cos(a) - hd * Math.sin(a)]);
                }
                P.line(pts, 0.6, 'blue', false, 0.1);
            }
            const lz = 3.9 + hd / TZ - 0.05;
            cyl(P, 8, 0.8, lz, 0.2, 0.42, STONE, { cap: LEAD, lw: 0.7 });
            const [lx, ly] = iso(8, 0.8, lz + 0.42);
            shape(P, [[lx - 5, ly], [lx, ly - 6], [lx + 5, ly]], LEAD, { lw: 0.6 });
            P.line([[lx, ly - 6], [lx, ly - 13]], 1, 'blue', false, 0.1);
            P.dot(lx, ly - 13, 1.6, 'sun', 1);

            // portico
            block(P, 5.5, 1.6, 0, 5, 1.6, 0.8, STONE_DK, { top: PAVE });
            for (let k = 0; k < 3; k++) block(P, 5.3, 3.2 + k * 0.32, 0, 5.4, 0.32, 0.6 - k * 0.2, STONE_DK, { top: PAVE, lw: 0.8 });
            shape(P, onBack(7.55, 8.45, 0.8, 2.25, 1.6), WOOD, { lw: 0.8 });
            P.line([iso(8, 1.6, 0.8), iso(8, 1.6, 2.25)], 0.6, 'blue', false, 0.1);
            for (const i0 of [6.35, 9.25]) shape(P, onBack(i0, i0 + 0.4, 1.15, 2.1, 1.6), GLASS, { lw: 0.6, amp: 0.15 });
            for (let k = 0; k < COLS; k++) {
                const ci = columnI(k);
                block(P, ci - 0.17, COL_J - 0.17, 0.8, 0.34, 0.34, 0.1, STONE_DK, { lw: 0.6 });
                cyl(P, ci, COL_J, 0.9, 0.13, 2.0, STONE, { cap: STONE_DK, shade: 0.22, lw: 0.8 });
                block(P, ci - 0.19, COL_J - 0.19, 2.85, 0.38, 0.38, 0.15, STONE_DK, { lw: 0.6 });
            }
            block(P, 5.5, 1.6, 3.0, 5, 1.6, 0.32, STONE, { lw: 0.9 });
            P.line([iso(5.5, 3.2, 3.12), iso(10.5, 3.2, 3.12)], 0.6, 'blue', false, 0.15);
            const ap = 4.15;
            shape(P, [iso(5.5, 3.2, 3.32), iso(8, 3.2, ap), iso(8, 1.6, ap), iso(5.5, 1.6, 3.32)], STONE_DK, { lw: 0.9 });
            shape(P, [iso(8, 3.2, ap), iso(10.5, 3.2, 3.32), iso(10.5, 1.6, 3.32), iso(8, 1.6, ap)], STONE_DK, { shade: 0.2, lw: 0.9 });
            shape(P, [iso(5.5, 3.2, 3.32), iso(10.5, 3.2, 3.32), iso(8, 3.2, ap)], STONE, { lw: 1 });
            P.line([iso(6.1, 3.2, 3.42), iso(9.9, 3.2, 3.42), iso(8, 3.2, ap - 0.18)], 0.6, 'blue', true, 0.15);

            // south wing
            block(P, 14, 0, 0, 2, 4.4, 2.8, STONE);
            P.line([iso(14, 4.4, 2.55), iso(16, 4.4, 2.55), iso(16, 0, 2.55)], 0.8, 'blue', false, 0.2);
            for (const z0 of [0.5, 1.55]) {
                for (const i0 of [14.4, 15.2]) shape(P, onBack(i0, i0 + 0.36, z0, z0 + 0.72, 4.4), GLASS, { lw: 0.6, amp: 0.15 });
                for (let j0 = 0.4; j0 < 4.2; j0 += 0.65) shape(P, onLeft(j0, j0 + 0.34, z0, z0 + 0.72, 16), GLASS, { lw: 0.6, amp: 0.15 });
            }

            // flagpole on the roof
            P.line([iso(12.6, 0.8, 3.44), iso(12.6, 0.8, 5.0)], 1.1, 'blue', false, 0.1);
        },

        live(P, t) {
            // UCL purple flag
            const flag = [], low = [];
            for (let k = 0; k <= 5; k++) {
                const w = Math.sin(t * 4 - k * 0.9) * 0.05 * k;
                flag.push(iso(12.6 + k * 0.17, 0.8 - k * 0.04, 4.95 + w));
                low.unshift(iso(12.6 + k * 0.17, 0.8 - k * 0.04, 4.55 + w));
            }
            shape(P, flag.concat(low), PURPLE, { lw: 0.6, amp: 0.1 });

            // pigeons on the lawn
            for (let k = 0; k < 3; k++) {
                const [x, y] = iso(10.6 + k * 0.5, 5.9 + (k % 2) * 0.5, 0);
                const peck = Math.max(0, Math.sin(t * 3 + k * 2.1)) > 0.85;
                shape(P, ellipse(x, y - 2.5, 3.6, 2.2, 10), [['blue', 0.35]], { lw: 0.5, amp: 0.1 });
                P.dot(x + 3, y - (peck ? 1.5 : 4.5), 1.6, 'blue', 0.7);
            }

            // students on the lawn
            const [ax, ay] = iso(3.9, 9.4, 0);
            figure(P, ax, ay, { t, pose: 'sit', s: 0.7, shirt: [['sun', 0.85]], hair: [['coral', 0.6], ['blue', 0.4]] });
            const [bx, by] = iso(4.6, 9.9, 0);
            figure(P, bx, by, { t, pose: 'sit', s: 0.7, shirt: [['teal', 0.7]], hair: [['blue', 0.9]] });
            const page = (t * 0.6) % 1;
            if (page < 0.25) P.line([[bx + 4, by - 9], [bx + 4 + Math.cos(page * 4 * Math.PI) * 4, by - 11]], 0.7, 'blue', false, 0.05);
            const [cx, cy] = iso(12.2, 9.6, 0);
            figure(P, cx, cy, { t, pose: 'sit', s: 0.7, shirt: PURPLE, hair: [['sun', 0.8], ['coral', 0.4]] });

            // the cross path, both ways
            const w1 = pingpong(t / 11);
            const [x1, y1] = iso(lerp(0.6, 15.4, w1), 7.75, 0);
            figure(P, x1, y1, { t, pose: 'walk', s: 0.7, shirt: [['coral', 0.8]], hair: [['blue', 0.85]] });
            const w2 = pingpong(t / 14 + 0.6);
            const [x2, y2] = iso(lerp(0.6, 15.4, w2), 8.25, 0);
            figure(P, x2, y2, { t: t + 0.4, pose: 'walk', s: 0.7, shirt: [['teal', 0.6], ['sun', 0.4]], hair: [['coral', 0.85]] });

            // up the middle path to the portico
            const k3 = (t / 9) % 1;
            const [x3, y3] = iso(7.85, lerp(11.2, 4.9, k3), 0);
            ctxAlpha(P, Math.min(k3 * 8, (1 - k3) * 8), () =>
                figure(P, x3, y3, { t, pose: 'walk', s: 0.7, shirt: [['blue', 0.45]], hair: [['blue', 0.9]] }));
            const k4 = (t / 10 + 0.5) % 1;
            const [x4, y4] = iso(8.25, lerp(4.9, 11.2, k4), 0);
            ctxAlpha(P, Math.min(k4 * 8, (1 - k4) * 8), () =>
                figure(P, x4, y4, { t: t + 1, pose: 'walk', s: 0.7, shirt: [['sun', 0.6], ['coral', 0.3]], hair: [['blue', 0.8]] }));

            // graduates on the portico, throwing their caps
            const toss = (t % 7) / 1.8;
            for (const [gi, ph, shirt] of [[6.75, 0, [['blue', 0.8]]], [9.3, 0.15, [['blue', 0.8]]]]) {
                const [gx, gy] = iso(gi, 3.05, 0.8);
                const k = toss - ph, flying = k > 0 && k < 1;
                const hy = figure(P, gx, gy, { t, s: 0.7, shirt, hair: [['blue', 0.9]], armsUp: flying && k < 0.5 });
                const lift = flying ? Math.sin(k * Math.PI) * 40 : 0;
                mortarboard(P, gx, hy - 3 - lift, flying ? k * TAU * 1.5 : 0);
            }
        },

        over(P, R) {
            for (const [ti, tj, r] of [[0.6, 10.4, 30], [15.9, 6.4, 26], [0.7, 5.6, 22]]) {
                cyl(P, ti, tj, 0, 0.14, 1.5, WOOD, { lw: 0.8 });
                const [x, y] = iso(ti, tj, 2.2);
                const bl = [[0, 0, r], [-r * 0.7, r * 0.3, r * 0.7], [r * 0.7, r * 0.25, r * 0.72], [-r * 0.3, -r * 0.6, r * 0.65], [r * 0.4, -r * 0.55, r * 0.6]];
                for (const [ox, oy, rr] of bl) blob(P, x + ox, y + oy, rr, R() < 0.5 ? GREEN : LEAF, R, { shade: 0.08 });
            }
            for (const [li, lj] of [[6.7, 6.2], [9.3, 6.2], [6.7, 10.2], [9.3, 10.2]]) {
                P.line([iso(li, lj, 0), iso(li, lj, 1.5)], 1.2, 'blue', false, 0.1);
                const [x, y] = iso(li, lj, 1.5);
                shape(P, [[x - 3.5, y], [x + 3.5, y], [x + 2.5, y - 6], [x - 2.5, y - 6]], [['sun', 0.6]], { lw: 0.7 });
                shape(P, [[x - 4, y - 6], [x + 4, y - 6], [x, y - 9]], [['blue', 0.6]], { lw: 0.6 });
            }
        }
    };

    // ---------- Frame ----------

    const corners = [iso(8, 0.8, 6.3), iso(-0.5, -0.5, 2.9), iso(16.5, -0.5, 2.9), iso(0.7, 5.6, 4)];
    for (const i of [-0.5, 16.5]) for (const j of [-0.5, 11.5]) corners.push(iso(i, j, -0.4));
    const X0 = Math.min(...corners.map(p => p[0])) - 12, X1 = Math.max(...corners.map(p => p[0])) + 12;
    const Y0 = Math.min(...corners.map(p => p[1])) - 12, Y1 = Math.max(...corners.map(p => p[1])) + 12;
    const BW = X1 - X0, BH = Y1 - Y0;
    canvas.style.aspectRatio = `${BW} / ${BH}`;

    let scale = 1, layers = new Map();

    function renderLayer(layer, variant) {
        const cv = document.createElement('canvas');
        cv.width = canvas.width;
        cv.height = canvas.height;
        const c = cv.getContext('2d');
        c.setTransform(scale, 0, 0, scale, -X0 * scale, -Y0 * scale);
        const P = Pen(c, hash('ucl', layer, variant));
        scene[layer](P, rand(hash('ucl', 'layout', layer)));
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
        scale = w * dpr / BW;
        canvas.width = Math.round(BW * scale);
        canvas.height = Math.round(BH * scale);
        layers = new Map();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw(now) {
        const t = reducedMotion ? 4 : now / 1000;
        const boil = reducedMotion ? 0 : Math.floor(t * 4) % 3;
        budget = 2;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        const night = document.documentElement.classList.contains('night');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const under = layerFor('under', boil);
        if (under) ctx.drawImage(under, 0, 0);
        if (under) {
            ctx.setTransform(scale, 0, 0, scale, -X0 * scale, -Y0 * scale);
            scene.live(Pen(ctx, hash('ucl', 'live', boil)), t);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
        }
        const over = layerFor('over', boil);
        if (over) ctx.drawImage(over, 0, 0);
        if (night) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    let last = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        if (now - last < 33) return;
        last = now;
        draw(now);
    }
    requestAnimationFrame(frame);
})();
