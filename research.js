/**
 * Research & Experience — Four-Room Isometric Risograph Cutaway
 * Built in the exact Paper Rooms style of houses.js:
 *   1. AMR Diagnostics & Bacterial Pigments Lab (ICMR-RMRC neev.bio & Ravenshaw)
 *   2. Structural & Computational Biology Suite (UCL SMB, Sheffield & Cancer ML)
 *   3. Pure Mathematics & Theoretical Study (Riemann Zeta MDH & Jensen's Inequality)
 *   4. Botanical Crop-Protection & Microbiome Conservatory (GiGa Complex & BCDS 16S rRNA)
 *
 * Interactive: click any room to zoom in, click again or outside to return, drag to pan.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('research-canvas');
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
    const VIOLET = [['blue', 0.55], ['coral', 0.6]];
    const WOOD = [['coral', 0.45], ['sun', 0.46]];
    const WOOD_DK = [['coral', 0.52], ['blue', 0.34]];
    const SOIL = [['coral', 0.54], ['blue', 0.32]];
    const SLATE = [['blue', 0.86], ['teal', 0.22]];
    const STEEL = [['blue', 0.16], ['teal', 0.12]];
    const BOOKS = [
        [['coral', 0.85]], [['sun', 0.9]], [['teal', 0.8]], [['blue', 0.6]],
        ORANGE, GREEN, VIOLET, [['coral', 0.5]], [['teal', 0.45]], [['blue', 0.35]]
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
        const R = rand(hash('res-screen', ink, level));
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

        P.chalk = (pts, w = 1.2, closed = false, a = 0.92) => {
            if (pts.length < 2) return;
            const q = wobble(pts, closed, 0.22);
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

    function floorRing(i, j, z, r, n = 20) {
        const pts = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU;
            pts.push(iso(i + Math.cos(a) * r, j + Math.sin(a) * r, z));
        }
        return pts;
    }

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
        cyl(P, i, j, 0, 0.3 * size, 0.52 * size, [['coral', 0.65]]);
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
        const coat = o.coat;
        const body = [[x - 5.2 * s, hip + (coat ? 3.5 : 1) * s], [x + 5.2 * s, hip + (coat ? 3.5 : 1) * s], [x + 4.2 * s, neck], [x - 4.2 * s, neck]];
        shape(P, body, o.shirt || [['coral', 0.8]], { shade: 0.08, lw: 0.9 });
        if (coat) P.line([[x, neck + 1 * s], [x, hip + 3 * s]], 0.7, 'blue', false, 0.1);
        const reach = pose === 'reach' ? (Math.sin(t * 3.2) * 0.5 + 0.5) * 7 * s : 0;
        const write = pose === 'write' ? Math.sin(t * 5.2) * 3.5 * s : 0;
        const swing = step * 0.55;
        P.line([[x - 4.4 * s, neck + 1.5 * s], [x - 6.5 * s - swing, hip - 1 * s]], 2.2 * s, 'blue', false, 0.15);
        P.line([[x + 4.4 * s, neck + 1.5 * s], [x + 7.2 * s + swing + write * 0.5, hip - 1.5 * s - reach - (pose === 'write' ? 7 * s + write * 0.4 : 0)]], 2.2 * s, 'blue', false, 0.15);
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

    function flask(P, i, j, z, fill, size = 1) {
        const [x, y] = iso(i, j, z);
        shape(P, [[x - 7 * size, y], [x + 7 * size, y], [x + 2.5 * size, y - 11 * size], [x - 2.5 * size, y - 11 * size]], fill, { lw: 0.8 });
        P.line([[x - 2.5 * size, y - 11 * size], [x - 2.5 * size, y - 16 * size], [x + 2.5 * size, y - 16 * size], [x + 2.5 * size, y - 11 * size]], 0.8);
    }

    // ---------- Room 1: AMR Diagnostics & Bacterial Pigments Wet Lab ----------
    // ICMR-RMRC Rapid AMR Diagnostic Kit (neev.bio) + Ravenshaw Prodigiosin & Violacein + TLC/NMR/GC-MS

    const amrLab = {
        id: 'amr-lab',
        under(P, R) {
            shell(P, [['teal', 0.42]], [['sun', 0.14]]);
            // Checkered clean-room tile floor
            for (let a = 0; a < W; a++) for (let b = 0; b < D; b++) {
                if ((a + b) % 2) P.fill(flat(a, b, 0, 1, 1), 'teal', 0.18);
            }
            for (let n = 1; n < W; n++) {
                P.line([iso(n, 0, 0), iso(n, D, 0)], 0.45, 'blue', false, 0.18);
                P.line([iso(0, n, 0), iso(W, n, 0)], 0.45, 'blue', false, 0.18);
            }

            // Back-wall laboratory window with sunlit glass
            shape(P, onBack(0.9, 3.2, 1.35, 2.72), [['teal', 0.14], ['sun', 0.1]]);
            P.line([iso(2.05, 0, 1.35), iso(2.05, 0, 2.72)], 1.6);
            P.line([iso(0.9, 0, 2.02), iso(3.2, 0, 2.02)], 1.6);
            shape(P, onBack(0.75, 3.35, 1.22, 1.35), STEEL);

            // Chromatogram & TLC reference board on back wall
            shape(P, onBack(3.8, 5.7, 1.35, 2.68), [['sun', 0.14]]);
            // TLC lane strips with migrated Prodigiosin (red) & Violacein (violet) spots
            for (let k = 0; k < 4; k++) {
                const lx = 4.1 + k * 0.42;
                P.line([iso(lx, 0, 1.52), iso(lx, 0, 2.48)], 0.7, 'blue', false, 0.12);
                const spotZ = 1.75 + (k % 2 ? 0.48 : 0.28);
                shape(P, backRing(lx, spotZ, 0.09, 10), k % 2 ? VIOLET : RED, { lw: 0.55 });
            }

            // Left-wall NMR / GC-MS spectrometer tower
            block(P, 0.12, 1.0, 0, 1.35, 2.0, 2.25, STEEL, { top: [['blue', 0.12]] });
            // Magnet bore cylinder on top of NMR
            cyl(P, 0.78, 1.9, 2.25, 0.42, 0.55, [['blue', 0.25], ['teal', 0.2]]);
            // Control console screen on front of spectrometer
            shape(P, onLeft(1.3, 2.65, 1.25, 1.95, 1.48), SLATE, { lw: 0.85 });

            // Left-wall reagent shelf above extraction bench
            block(P, 0.05, 3.6, 1.9, 0.55, 3.4, 0.12, WOOD);
            for (let k = 0; k < 6; k++) {
                cyl(P, 0.3, 3.9 + k * 0.52, 2.02, 0.13, 0.34, k % 2 ? RED : VIOLET, { lw: 0.55 });
            }

            // Left extraction bench (Prodigiosin & Violacein glassware)
            block(P, 0.15, 3.4, 0, 1.5, 4.1, 1.0, [['blue', 0.18]], { top: [['sun', 0.2]] });
            // Condenser retort stand
            P.line([iso(0.75, 4.5, 1.0), iso(0.75, 4.5, 2.45)], 1.6, 'blue');
            P.line([iso(0.75, 4.5, 2.25), iso(1.15, 5.1, 2.05)], 1.1, 'teal');
            // Glass flasks: ruby Prodigiosin & violet Violacein
            flask(P, 0.85, 4.3, 1.02, RED, 1.1);
            flask(P, 0.9, 5.3, 1.02, VIOLET, 1.15);
            flask(P, 0.9, 6.3, 1.02, [['teal', 0.65]], 0.9);
            // TLC glass jar
            cyl(P, 1.1, 7.0, 1.02, 0.24, 0.45, [['sun', 0.3]], { lw: 0.7 });

            // Back-wall biosafety hood & petri incubator
            block(P, 5.8, 0.15, 0, 1.95, 1.35, 2.45, STEEL, { top: [['blue', 0.14]] });
            shape(P, onBack(6.0, 7.55, 1.05, 2.15, 1.52), [['teal', 0.22], ['sun', 0.1]], { lw: 0.8 });
            // Agar petri dishes glowing inside hood
            for (let k = 0; k < 3; k++) {
                shape(P, floorRing(6.3 + k * 0.45, 0.9, 1.08, 0.18, 12), k === 1 ? VIOLET : RED, { lw: 0.6 });
            }

            // Center island bench for Rapid AMR Diagnostic Kit (neev.bio)
            block(P, 2.6, 2.5, 0, 3.3, 2.0, 1.0, [['teal', 0.25]], { top: [['sun', 0.16]] });
            // Tray of 4 lateral-flow AMR test cassettes
            block(P, 3.0, 2.9, 1.0, 2.1, 1.1, 0.08, [['blue', 0.12]]);
            for (let k = 0; k < 4; k++) {
                const cx = 3.18 + k * 0.46;
                block(P, cx, 3.08, 1.08, 0.34, 0.76, 0.05, [['sun', 0.08]], { lw: 0.55 });
            }
            // Microscope on right side of island
            block(P, 5.15, 3.0, 1.0, 0.55, 0.55, 0.14, [['blue', 0.55]]);
            P.line([iso(5.45, 3.15, 1.14), iso(5.55, 3.15, 1.75), iso(5.28, 3.35, 2.05)], 2.6, 'blue');
            P.line([iso(5.28, 3.35, 1.78), iso(5.28, 3.35, 1.32)], 1.9, 'teal');

            // Reagent fridge / sample cooler in front-right corner
            block(P, 6.4, 5.2, 0, 1.35, 1.45, 1.75, [['teal', 0.22], ['blue', 0.14]]);
            P.line([iso(6.4, 5.4, 0.95), iso(6.4, 6.45, 0.95)], 1.0, 'blue');
        },
        mid(P, t) {
            // Animated GC-MS / NMR spectrum trace on left-wall spectrometer screen
            const pts = [];
            for (let k = 0; k <= 14; k++) {
                const u = k / 14;
                const peak = Math.exp(-Math.pow((u - 0.32) * 11, 2)) * 0.42
                    + Math.exp(-Math.pow((u - 0.65) * 13, 2)) * 0.36
                    + Math.sin(u * 18 - t * 3.5) * 0.04;
                pts.push(iso(1.5, 1.38 + u * 1.2, 1.38 + peak));
            }
            P.line(pts, 1.4, 'sun', false, 0.12);

            // Developing lateral-flow AMR test lines (neev.bio cassettes)
            const dev = (Math.sin(t * 1.1) * 0.5 + 0.5);
            for (let k = 0; k < 4; k++) {
                const cx = 3.18 + k * 0.46;
                P.line([iso(cx + 0.06, 3.35, 1.15), iso(cx + 0.28, 3.35, 1.15)], 1.5, 'coral', false, 0.08);
                if (dev > 0.25 + k * 0.14) {
                    P.line([iso(cx + 0.06, 3.55, 1.15), iso(cx + 0.28, 3.55, 1.15)], 1.5, k % 2 ? 'teal' : 'coral', false, 0.08);
                }
            }

            // Bubbling Prodigiosin & Violacein flasks
            for (let k = 0; k < 5; k++) {
                const p = (t * 0.6 + k * 0.22) % 1;
                const [bx, by] = iso(0.85 + Math.sin(t * 2 + k) * 0.08, k % 2 ? 4.3 : 5.3, 1.55 + p * 0.9);
                P.dot(bx, by, 2.2 * (1 - p * 0.5), k % 2 ? 'coral' : 'blue', 0.65 * (1 - p));
            }

            // Researcher 1 pipetting over AMR cassette bench
            const [r1x, r1y] = iso(4.1, 4.95, 0);
            figure(P, r1x, r1y, { shirt: [['sun', 0.14]], coat: true, pose: 'reach', t, s: 1.06 });

            // Researcher 2 inspecting pigment flasks
            const [r2x, r2y] = iso(2.05, 5.4 + Math.sin(t * 0.65) * 0.45, 0);
            figure(P, r2x, r2y, { shirt: [['teal', 0.22]], coat: true, pose: 'walk', t, s: 1.02 });
        },
        over(P, R) {
            // Lab stool in foreground
            cyl(P, 4.8, 6.3, 0, 0.34, 0.68, [['coral', 0.72]], { cap: [['sun', 0.5]] });
            plant(P, 7.2, 2.4, R, 0.95);
        },
        lamp(P, t) {
            lamp(P, 4.2, 3.5, 2.75, t, 0.4, 'sun');
        }
    };

    // ---------- Room 2: Structural & Computational Biology Suite ----------
    // UCL Structural & Molecular Biology + Sheffield Computational Biology + Cancer ML/Docking

    const compLab = {
        id: 'comp-lab',
        under(P, R) {
            shell(P, [['blue', 0.22]], [['sun', 0.22]]);
            // Warm studio parquet floor lines
            for (let n = 1; n < W; n++) {
                P.line([iso(0, n, 0), iso(W, n, 0)], 0.45, 'coral', false, 0.2);
            }
            // Acoustic rug under main desk
            shape(P, flat(2.1, 2.4, 0.02, 4.4, 3.6), [['teal', 0.22], ['blue', 0.12]], { lw: 0.75 });

            // Huge back-wall AlphaFold / PyMOL 3D protein display screen
            block(P, 1.3, 0.06, 0.85, 4.2, 0.16, 1.9, [['blue', 0.78]]);
            shape(P, onBack(1.45, 5.35, 0.98, 2.62, 0.23), SLATE, { lw: 0.8 });

            // GPU / HPC compute server rack in back-right corner
            block(P, 6.1, 0.25, 0, 1.55, 1.35, 2.55, [['blue', 0.68]], { top: [['blue', 0.35]] });
            for (let k = 0; k < 7; k++) {
                P.line([iso(6.25, 1.62, 0.3 + k * 0.3), iso(7.5, 1.62, 0.3 + k * 0.3)], 0.9, 'teal', false, 0.1);
            }

            // Left-wall bookshelves with structural biology & ML volumes
            block(P, 0.1, 1.0, 0, 0.85, 4.6, 2.5, WOOD);
            for (let s = 0; s < 4; s++) {
                const z = 0.22 + s * 0.56;
                let j = 1.15;
                while (j < 5.35) {
                    const th = 0.16 + R() * 0.14;
                    if (j + th > 5.45) break;
                    block(P, 0.2, j, z, 0.65, th, 0.38 + R() * 0.1, pick(R, BOOKS), { lw: 0.5, shade: 0.4 });
                    j += th + 0.03;
                }
            }

            // Dual-monitor L-shaped computational workstation desk
            block(P, 2.2, 2.6, 0.85, 3.6, 1.35, 0.14, WOOD);
            for (const [lx, ly] of [[2.35, 2.75], [5.6, 2.75], [2.35, 3.78], [5.6, 3.78]]) {
                block(P, lx, ly, 0, 0.14, 0.14, 0.85, [['blue', 0.55]], { lw: 0.6 });
            }
            // Left monitor (BioPython / ML training curves)
            block(P, 2.55, 2.78, 0.99, 1.25, 0.14, 0.85, [['blue', 0.72]]);
            shape(P, onBack(2.63, 3.72, 1.08, 1.76, 2.93), SLATE, { lw: 0.65 });
            // Right monitor (Genomic alignment / cancer cell lines MCF-7, A549)
            block(P, 4.15, 2.78, 0.99, 1.25, 0.14, 0.85, [['blue', 0.72]]);
            shape(P, onBack(4.23, 5.32, 1.08, 1.76, 2.93), SLATE, { lw: 0.65 });
            // Keyboard & mug
            block(P, 3.3, 3.35, 0.99, 1.2, 0.42, 0.05, [['blue', 0.3]], { lw: 0.5 });
            cyl(P, 5.2, 3.5, 0.99, 0.14, 0.25, [['coral', 0.82]], { lw: 0.55 });

            // Side table with physical ball-and-stick molecular docking model
            block(P, 6.2, 3.4, 0.72, 1.35, 1.5, 0.12, WOOD);
            for (const [lx, ly] of [[6.32, 3.52], [7.38, 3.52], [6.32, 4.72], [7.38, 4.72]]) {
                block(P, lx, ly, 0, 0.12, 0.12, 0.72, WOOD_DK, { lw: 0.5 });
            }
            // Desk chair
            block(P, 3.55, 4.35, 0.46, 0.85, 0.85, 0.12, [['coral', 0.75]]);
            block(P, 3.55, 5.08, 0.58, 0.85, 0.12, 0.75, [['coral', 0.75]]);
            cyl(P, 3.98, 4.78, 0, 0.1, 0.46, [['blue', 0.65]], { lw: 0.5 });
        },
        mid(P, t) {
            // Live 3D rotating AlphaFold protein double-ribbon & docked ligand on big back wall screen
            const cx = 3.4, cz = 1.8;
            const strandA = [], strandB = [];
            for (let k = 0; k <= 22; k++) {
                const u = (k / 22) * 2 - 1;
                const ang = u * 4.2 + t * 1.65;
                const px = cx + u * 1.45;
                const pyA = cz + Math.sin(ang) * 0.46;
                const pyB = cz + Math.sin(ang + Math.PI) * 0.46;
                strandA.push(iso(px, 0.26, pyA));
                strandB.push(iso(px, 0.26, pyB));
                if (k % 3 === 0) {
                    P.line([iso(px, 0.26, pyA), iso(px, 0.26, pyB)], 1.0, 'sun', false, 0.1);
                }
            }
            P.line(strandA, 2.2, 'teal', false, 0.14);
            P.line(strandB, 2.2, 'coral', false, 0.14);
            // Pulsing docked ligand at binding pocket
            const [lx, ly] = iso(cx + Math.cos(t * 1.65) * 0.18, 0.27, cz);
            P.dot(lx, ly, 4.5 + Math.sin(t * 4) * 1.2, 'sun', 0.95);

            // Live scrolling code & loss curve on workstation monitors
            for (let k = 0; k < 4; k++) {
                const w = 0.35 + ((hash(k, Math.floor(t * 2)) % 100) / 100) * 0.55;
                P.line([iso(2.74, 2.95, 1.62 - k * 0.14), iso(2.74 + w, 2.95, 1.62 - k * 0.14)], 1.2, k % 2 ? 'sun' : 'teal', false, 0.08);
            }
            const mpts = [];
            for (let k = 0; k <= 8; k++) {
                const u = k / 8;
                mpts.push(iso(4.32 + u * 0.88, 2.95, 1.18 + Math.exp(-u * 2.2) * 0.44 + Math.sin(t * 3 + k) * 0.03));
            }
            P.line(mpts, 1.3, 'coral', false, 0.08);

            // Blinking GPU compute cluster LEDs
            for (let k = 0; k < 6; k++) {
                const on = Math.sin(t * 5 + k * 1.9) > 0;
                const [gx, gy] = iso(6.35 + (k % 3) * 0.4, 1.64, 0.45 + Math.floor(k / 3) * 0.9);
                P.dot(gx, gy, 2.1, on ? 'teal' : 'coral', on ? 0.9 : 0.4);
            }

            // Rotating physical molecular model on side table
            const [mx, my] = iso(6.85, 4.15, 1.22);
            P.line([iso(6.85, 4.15, 0.84), [mx, my]], 1.4, 'blue');
            for (let k = 0; k < 4; k++) {
                const a = t * 1.2 + k * TAU / 4;
                const ax = mx + Math.cos(a) * 14, ay = my + Math.sin(a) * 8 - (k % 2 ? 7 : -3);
                P.line([[mx, my], [ax, ay]], 1.1, 'blue', false, 0.1);
                shape(P, circle(ax, ay, 3.6, 10), k % 2 ? RED : [['teal', 0.8]], { lw: 0.65 });
            }
            shape(P, circle(mx, my, 4.5, 10), [['sun', 0.92]], { lw: 0.7 });

            // Seated researcher at workstation
            const [s1x, s1y] = iso(3.98, 4.55, 0.25);
            figure(P, s1x, s1y, { shirt: [['teal', 0.82]], pose: 'sit', t, s: 1.04 });

            // Standing researcher pointing at AlphaFold screen
            const [s2x, s2y] = iso(1.75, 1.75, 0);
            figure(P, s2x, s2y, { shirt: [['coral', 0.85]], pose: 'reach', t, s: 1.05 });
        },
        over(P, R) {
            plant(P, 1.1, 6.7, R, 1.1);
            // Low coffee table with open preprint journal
            block(P, 5.2, 6.2, 0.45, 1.8, 1.1, 0.12, WOOD);
            for (const [lx, ly] of [[5.32, 6.32], [6.85, 6.32], [5.32, 7.15], [6.85, 7.15]]) {
                block(P, lx, ly, 0, 0.1, 0.1, 0.45, WOOD_DK, { lw: 0.5 });
            }
            shape(P, flat(5.6, 6.45, 0.58, 0.95, 0.6), [['sun', 0.1]], { lw: 0.6 });
        },
        lamp(P, t) {
            lamp(P, 3.9, 3.2, 2.75, t, 1.7, 'teal');
        }
    };

    // ---------- Room 3: Pure Mathematics & Theoretical Study ----------
    // Mesoscopic Zero-Density Hypothesis (Riemann Zeta) + Refinements of Jensen's Inequality

    const mathStudy = {
        id: 'math-study',
        under(P, R) {
            shell(P, [['sun', 0.34], ['coral', 0.1]], [['coral', 0.2], ['sun', 0.22]]);
            // Warm wooden floorboards
            for (let n = 1; n < W; n++) {
                P.line([iso(n, 0, 0), iso(n, D, 0)], 0.5, 'coral', false, 0.22);
            }
            // Geometric woven rug
            shape(P, flat(1.8, 2.2, 0.02, 4.6, 4.2), [['coral', 0.34], ['sun', 0.25]], { lw: 0.8 });
            shape(P, flat(2.25, 2.65, 0.03, 3.7, 3.3), [['blue', 0.14]], { lw: 0.65 });

            // Massive dark-slate mathematics chalkboard across back wall
            block(P, 0.9, 0.05, 0.72, 6.1, 0.16, 2.05, WOOD_DK);
            shape(P, onBack(1.08, 6.82, 0.88, 2.62, 0.22), SLATE, { lw: 0.85 });
            // Chalk tray with colored chalk sticks
            block(P, 1.05, 0.22, 0.7, 5.8, 0.24, 0.1, WOOD);

            // Static chalk drawings on board:
            // Left half: Riemann critical strip 0 < Re(s) < 1 with Re(s)=1/2 axis
            P.chalk([iso(1.5, 0.24, 1.1), iso(1.5, 0.24, 2.45)], 1.0, false, 0.65);
            P.chalk([iso(2.9, 0.24, 1.1), iso(2.9, 0.24, 2.45)], 1.0, false, 0.65);
            P.chalk([iso(2.2, 0.24, 1.05), iso(2.2, 0.24, 2.5)], 1.4, false, 0.92);
            // Horizontal mesoscopic window [T, T+H]
            P.chalk([iso(1.4, 0.24, 1.55), iso(3.0, 0.24, 1.55)], 0.9, false, 0.7);
            P.chalk([iso(1.4, 0.24, 2.05), iso(3.0, 0.24, 2.05)], 0.9, false, 0.7);

            // Right half: Jensen's Inequality convex curve + secant chord + midpoint
            const conv = [];
            for (let k = 0; k <= 12; k++) {
                const u = k / 12 * 2 - 1;
                conv.push(iso(5.1 + u * 1.15, 0.24, 1.25 + u * u * 0.95));
            }
            P.chalk(conv, 1.6, false, 0.95);
            // Secant line above convex curve
            P.chalk([iso(4.18, 0.24, 1.88), iso(6.02, 0.24, 1.88)], 1.25, false, 0.85);
            // Vertical gap arrow showing refinement bound
            P.chalk([iso(5.1, 0.24, 1.28), iso(5.1, 0.24, 1.85)], 1.1, false, 0.8);

            // Left-wall tall arched window + bookshelves
            shape(P, onLeft(0.8, 2.6, 1.05, 2.75), [['sun', 0.25], ['teal', 0.1]]);
            P.line([iso(0, 1.7, 1.05), iso(0, 1.7, 2.75)], 1.4);
            P.line([iso(0, 0.8, 1.9), iso(0, 2.6, 1.9)], 1.4);

            // Tall mahogany bookcase on left wall
            block(P, 0.1, 3.1, 0, 0.9, 3.8, 2.55, WOOD_DK);
            for (let s = 0; s < 4; s++) {
                const z = 0.22 + s * 0.58;
                let j = 3.25;
                while (j < 6.65) {
                    const th = 0.16 + R() * 0.14;
                    if (j + th > 6.78) break;
                    block(P, 0.2, j, z, 0.7, th, 0.4 + R() * 0.1, pick(R, BOOKS), { lw: 0.5, shade: 0.45 });
                    j += th + 0.03;
                }
            }

            // Classic study desk with stacked arXiv manuscripts & brass desk lamp
            block(P, 2.4, 3.5, 0.85, 3.1, 1.6, 0.14, WOOD_DK, { top: WOOD });
            for (const [lx, ly] of [[2.55, 3.65], [5.32, 3.65], [2.55, 4.92], [5.32, 4.92]]) {
                block(P, lx, ly, 0, 0.15, 0.15, 0.85, WOOD_DK, { lw: 0.6 });
            }
            // Open manuscript notebook & stacks of papers
            shape(P, flat(3.2, 3.85, 1.01, 1.25, 0.8), [['sun', 0.08]], { lw: 0.65 });
            P.line([iso(3.82, 3.85, 1.02), iso(3.82, 4.65, 1.02)], 0.7, 'blue');
            block(P, 2.6, 3.8, 0.99, 0.48, 0.62, 0.18, [['sun', 0.15]], { lw: 0.55 });
            // Brass banker's lamp on desk
            cyl(P, 5.05, 3.85, 0.99, 0.18, 0.08, [['sun', 0.85]]);
            P.line([iso(5.05, 3.85, 1.07), iso(5.05, 3.85, 1.55)], 1.5, 'blue');
            block(P, 4.82, 3.7, 1.5, 0.48, 0.3, 0.16, GREEN, { lw: 0.7 });
            // Teacup
            cyl(P, 4.65, 4.55, 0.99, 0.13, 0.2, [['coral', 0.75]], { lw: 0.55 });

            // Wooden armchair at desk
            block(P, 3.55, 5.4, 0.46, 0.9, 0.85, 0.14, WOOD);
            block(P, 3.55, 6.12, 0.6, 0.9, 0.14, 0.75, WOOD_DK);
        },
        mid(P, t) {
            // Animated glowing Riemann Zeta non-trivial zeros along Re(s) = 1/2
            for (let k = 0; k < 6; k++) {
                const zpos = 1.18 + k * 0.21;
                const pulse = 2.1 + Math.sin(t * 2.8 + k * 1.1) * 0.9;
                const [zx, zy] = iso(2.2, 0.25, zpos);
                P.dot(zx, zy, pulse, 'sun', 0.95);
            }
            // Oscillating Zeta wave curve beside critical strip
            const zpts = [];
            for (let k = 0; k <= 12; k++) {
                const u = k / 12;
                zpts.push(iso(2.2 + Math.sin(u * 11 + t * 2.2) * 0.38, 0.25, 1.12 + u * 1.3));
            }
            P.line(zpts, 1.2, 'coral', false, 0.1);

            // Animated tangent/midpoint highlight on Jensen's inequality curve
            const mx = Math.sin(t * 0.9) * 0.55;
            const [jx, jy] = iso(5.1 + mx, 0.25, 1.25 + mx * mx * 0.95);
            P.dot(jx, jy, 3.0, 'teal', 0.95);

            // Rising tea steam from cup on desk
            for (let k = 0; k < 3; k++) {
                const p = (t * 0.45 + k * 0.33) % 1;
                const [sx, sy] = iso(4.65 + Math.sin(t * 2 + k) * 0.08, 4.55, 1.25 + p * 0.65);
                P.dot(sx, sy, 2.0 * (1 - p * 0.4), 'blue', 0.25 * (1 - p));
            }

            // Mathematician actively writing on the chalkboard
            const [m1x, m1y] = iso(3.4 + Math.sin(t * 0.4) * 0.4, 1.15, 0);
            figure(P, m1x, m1y, { shirt: [['blue', 0.72]], pose: 'write', t, s: 1.06 });

            // Seated colleague reviewing proofs at desk
            const [m2x, m2y] = iso(4.0, 5.55, 0.25);
            figure(P, m2x, m2y, { shirt: ORANGE, pose: 'sit', t, s: 1.02 });
        },
        over(P, R) {
            // Floor globe & potted fern in front corner
            cyl(P, 6.8, 5.7, 0, 0.26, 0.72, WOOD_DK);
            const [gx, gy] = iso(6.8, 5.7, 1.02);
            shape(P, circle(gx, gy, 11, 14), [['teal', 0.65], ['sun', 0.35]], { lw: 0.85 });
            P.line(ellipse(gx, gy, 11, 4, 14), 0.7, 'blue', true, 0.15);
            plant(P, 6.9, 2.2, R, 1.0);
        },
        lamp(P, t) {
            lamp(P, 4.1, 4.2, 2.75, t, 2.6, 'sun');
        }
    };

    // ---------- Room 4: Botanical Crop-Protection & Microbiome Conservatory ----------
    // GiGa Complex Natural Biopesticide (Garlic Allicin & Ginger Diallyl Trisulfide) + BCDS 16S rRNA

    const bioConservatory = {
        id: 'bio-conservatory',
        under(P, R) {
            shell(P, [['teal', 0.26], ['sun', 0.15]], [['sun', 0.24], ['coral', 0.1]]);
            // Stone conservatory flagstones
            for (let a = 0; a < W; a += 2) for (let b = 0; b < D; b += 2) {
                if (((a + b) / 2) % 2) P.fill(flat(a, b, 0, 2, 2), 'blue', 0.08);
                P.line(flat(a, b, 0, 2, 2), 0.45, 'blue', true, 0.2);
            }

            // Tall glass greenhouse mullion windows on both back & left walls
            shape(P, onBack(0.5, 7.5, 0.65, 2.8), [['teal', 0.14], ['sun', 0.14]]);
            for (let i = 1.9; i < 7.2; i += 1.4) P.line([iso(i, 0, 0.65), iso(i, 0, 2.8)], 1.3, 'teal');
            P.line([iso(0.5, 0, 1.75), iso(7.5, 0, 1.75)], 1.2, 'teal');

            shape(P, onLeft(0.5, 7.2, 0.65, 2.8), [['teal', 0.12], ['sun', 0.12]]);
            for (let j = 1.9; j < 7.0; j += 1.4) P.line([iso(0, j, 0.65), iso(0, j, 2.8)], 1.3, 'teal');
            P.line([iso(0, 0.5, 1.75), iso(0, 7.2, 1.75)], 1.2, 'teal');

            // Raised timber GiGa crop trial bed 1 (back-center: lush crop stalks + garlic bulbs)
            block(P, 1.2, 1.0, 0, 4.6, 2.1, 0.68, WOOD, { top: SOIL });
            for (let k = 0; k < 14; k++) {
                const cx = 1.55 + (k % 7) * 0.62, cy = 1.45 + Math.floor(k / 7) * 0.95;
                const [px, py] = iso(cx, cy, 0.68);
                for (let b = -1; b <= 1; b++) {
                    P.line([[px, py], [px + b * 5 + (R() - 0.5) * 3, py - 15 - R() * 8]], 1.4, b === 0 ? 'teal' : 'sun', false, 0.25);
                }
                if (k % 3 === 0) shape(P, circle(px, py - 2, 3.2, 8), [['sun', 0.72]], { lw: 0.5 });
            }

            // Overhead misting pipe arch above crop bed
            P.line([iso(1.3, 2.0, 0.68), iso(1.3, 2.0, 2.35), iso(5.7, 2.0, 2.35), iso(5.7, 2.0, 0.68)], 1.5, 'blue', false, 0.18);

            // Second raised bed (ginger rhizomes & treated seedlings)
            block(P, 1.2, 4.3, 0, 3.0, 2.0, 0.62, WOOD, { top: SOIL });
            for (let k = 0; k < 8; k++) {
                const cx = 1.65 + (k % 4) * 0.68, cy = 4.78 + Math.floor(k / 4) * 0.95;
                const [px, py] = iso(cx, cy, 0.62);
                shape(P, [[px, py], [px - 6, py - 11], [px, py - 18], [px + 6, py - 11]], k % 2 ? GREEN : LEAF, { lw: 0.65 });
            }

            // Right-side bioassay & 16S rRNA microbiome bench (BCDS bladder microbiome study)
            block(P, 5.2, 3.6, 0, 2.3, 3.4, 0.95, [['blue', 0.16]], { top: WOOD });
            // Compact 16S rRNA sequencing unit with live microbiome bar-plot screen
            block(P, 5.5, 4.0, 0.95, 1.55, 1.25, 0.88, [['teal', 0.28], ['blue', 0.18]]);
            shape(P, onBack(5.65, 6.85, 1.15, 1.68, 5.26), SLATE, { lw: 0.65 });
            // Garlic/ginger extract amber bottles & mortar
            cyl(P, 5.8, 5.8, 0.95, 0.22, 0.35, ORANGE, { lw: 0.6 });
            cyl(P, 6.45, 5.8, 0.95, 0.18, 0.42, [['sun', 0.85]], { lw: 0.6 });
            cyl(P, 6.1, 6.45, 0.95, 0.28, 0.24, [['coral', 0.5]], { lw: 0.6 });
        },
        mid(P, t) {
            // Fine GiGa biopesticide mist falling from overhead pipe onto crop bed
            for (let n = 0; n < 3; n++) {
                const nx = 2.2 + n * 1.3;
                for (let k = 0; k < 4; k++) {
                    const p = (t * 0.85 + k * 0.25 + n * 0.17) % 1;
                    const [mx, my] = iso(nx + Math.sin(k * 2.1) * 0.28 * p, 2.0 + Math.cos(k * 1.7) * 0.22 * p, 2.3 - p * 1.45);
                    P.dot(mx, my, 1.8, 'teal', 0.55 * (1 - p));
                }
            }

            // Two tiny locusts repelled away from the GiGa-treated crop bed
            for (let k = 0; k < 2; k++) {
                const p = (t * 0.55 + k * 0.5) % 1;
                const hop = Math.abs(Math.sin(p * Math.PI * 3)) * 0.55;
                const [lx, ly] = iso(4.4 + p * 1.2, 3.25 + k * 0.4, 0.25 + hop);
                P.dot(lx, ly, 2.6, 'coral', 0.85, 0.55);
                P.line([[lx - 3, ly], [lx + 4, ly - 2]], 0.9, 'blue', false, 0.1);
            }

            // Live 16S rRNA phyla bar-chart (Firmicutes / Proteobacteria / Fusobacterium) on sequencer screen
            for (let k = 0; k < 5; k++) {
                const bh = 0.12 + (Math.sin(t * 2.1 + k * 1.3) * 0.5 + 0.5) * 0.28;
                const bx = 5.8 + k * 0.21;
                P.line([iso(bx, 5.28, 1.22), iso(bx, 5.28, 1.22 + bh)], 2.4, k % 2 ? 'coral' : 'sun', false, 0.08);
            }

            // Botanist tending GiGa crop bed
            const [b1x, b1y] = iso(3.6 + Math.sin(t * 0.5) * 0.5, 3.6, 0);
            figure(P, b1x, b1y, { shirt: GREEN, pose: 'reach', t, s: 1.05 });

            // Microbiome researcher checking 16S sequencer
            const [b2x, b2y] = iso(4.7, 5.65, 0);
            figure(P, b2x, b2y, { shirt: [['coral', 0.8]], coat: true, pose: 'stand', t, s: 1.03 });
        },
        over(P, R) {
            plant(P, 7.1, 1.3, R, 1.2);
            // Watering can in foreground
            cyl(P, 4.5, 7.0, 0, 0.28, 0.44, [['teal', 0.72]]);
            P.line([iso(4.5, 7.0, 0.35), iso(4.0, 6.7, 0.55)], 1.6, 'teal');
        },
        lamp(P, t) {
            lamp(P, 3.8, 3.6, 2.75, t, 3.8, 'sun');
        }
    };

    // ---------- 2x2 Room Grid Layout ----------

    const ROOMS = [
        { ...amrLab, ci: 0, cj: 0 },
        { ...compLab, ci: 1, cj: 0 },
        { ...mathStudy, ci: 0, cj: 1 },
        { ...bioConservatory, ci: 1, cj: 1 }
    ];

    const BX0 = -D * TW / 2 - 36, BX1 = W * TW / 2 + 36;
    const BY0 = -(H + 0.9) * TZ - 12, BY1 = (W + D) * TH / 2 + 0.4 * TZ + 26;
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
        for (const i of [-0.3, W]) for (const j of [-0.3, D]) for (const z of [-0.4, H + 0.6]) corners.push(iso(i, j, z));
        r.hull = hull(corners).map(([x, y]) => [x + ox, y + oy]);
    }
    ROOMS.sort((a, b) => (a.ci + a.cj) - (b.ci + b.cj) || a.ci - b.ci);

    const WORLD = {
        x0: Math.min(...ROOMS.map(r => r.box.x0)),
        y0: Math.min(...ROOMS.map(r => r.box.y0)),
        x1: Math.max(...ROOMS.map(r => r.box.x1)),
        y1: Math.max(...ROOMS.map(r => r.box.y1))
    };

    // ---------- Bitmap layer cache (fast & smooth) ----------

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
    const roomView = r => ({ x: (r.box.x0 + r.box.x1) / 2, y: (r.box.y0 + r.box.y1) / 2 + 10, zoom: Math.min(2.4, fit(r.box) * 1.02) });

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

            // Soft floating shadow beneath each cutaway room
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
