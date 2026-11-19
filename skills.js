/**
 * Skills & Interests — a dense, detailed risograph isometric cutaway studio
 * in the exact print style of houses.js and ucl.js.
 * Five living stations: Wet Lab (80%), Dry Lab (20%), Violin & Oil Painting,
 * Colonial India Philately, and Lap Swimming.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('skills-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    // ---------- Risograph print settings (matching houses.js) ----------

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
    const LEAF = [['teal', 0.5], ['sun', 0.8]];
    const WOOD = [['coral', 0.44], ['sun', 0.48]];
    const WOOD_DK = [['coral', 0.54], ['blue', 0.28]];
    const ORANGE = [['coral', 0.6], ['sun', 0.7]];
    const RED = [['coral', 0.9], ['blue', 0.16]];
    const PURPLE = [['blue', 0.45], ['coral', 0.5]];
    const POOL = [['teal', 0.58], ['blue', 0.22]];
    const POOL_DEEP = [['teal', 0.72], ['blue', 0.42]];
    const TILE = [['sun', 0.14], ['coral', 0.06]];
    const WALL = [['teal', 0.2], ['sun', 0.1]];
    const STONE = [['sun', 0.24], ['coral', 0.1], ['blue', 0.06]];

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
        const R = rand(hash('sk2', ink, level));
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

    // ---------- Pen ----------

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
            P.path(pts); c.fillStyle = pattern(ink, tone); c.fill(); c.restore();
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
            const q = wobble(pts, closed, 0.24);
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

    // ---------- Isometric geometry ----------

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
        if (o.line !== false) P.line(pts, o.lw ?? 0.95, 'blue', true, o.amp ?? 0.38);
    }
    function block(P, i, j, z, w, d, h, fills = [], o = {}) {
        const L = faceL(i, j, z, w, d, h), Rf = faceR(i, j, z, w, d, h), T = flat(i, j, z + h, w, d);
        const s = o.shade ?? 1;
        paint(P, L, fills, 0.85, 0.1 * s);
        paint(P, Rf, fills, 1, 0.26 * s);
        paint(P, T, o.top || fills, 0.58, 0);
        const lw = o.lw ?? 0.9;
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
    function blob(P, x, y, r, fills, R, o = {}) {
        const pts = [], n = 11;
        for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = r * (0.82 + R() * 0.28); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.squash ?? 0.9)]); }
        shape(P, pts, fills, { lw: o.lw ?? 0.8, shade: o.shade || 0 });
    }
    function plant(P, i, j, R, size = 1) {
        cyl(P, i, j, 0, 0.28 * size, 0.52 * size, [['coral', 0.65]]);
        const [x, y] = iso(i, j, 0.52 * size);
        for (let k = 0; k < 6; k++) {
            const a = -Math.PI / 2 + (k - 2.5) * 0.45;
            const L = (12 + R() * 7) * size;
            const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L];
            const mid = [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5];
            const nx = -Math.sin(a) * 4.2 * size, ny = Math.cos(a) * 4.2 * size;
            shape(P, [[x, y], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], k % 2 ? GREEN : LEAF, { lw: 0.65 });
        }
    }
    // Helper: draw a shaded limb segment (sleeve or skin) with clean ink outline
    function limb(P, x0, y0, x1, y1, w0, w1, fills) {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const pts = [
            [x0 + nx * w0, y0 + ny * w0],
            [x1 + nx * w1, y1 + ny * w1],
            [x1 - nx * w1, y1 - ny * w1],
            [x0 - nx * w0, y0 - ny * w0],
        ];
        shape(P, pts, fills, { lw: 0.72, amp: 0.14 });
    }

    function figure(P, x, y, o = {}) {
        const s = o.s || 0.96, t = o.t || 0, pose = o.pose || 'stand';
        const SKIN = [['coral', 0.22], ['sun', 0.2]];
        const PANTS = o.pants || [['blue', 0.76]];
        const SHIRT = o.shirt || [];

        // Ground contact shadow
        P.dot(x, y + 1, 9.5 * s, 'blue', 0.22, 0.38);

        const hip = y - 15 * s, shY = hip - 13 * s, hy = shY - 6.5 * s;
        // Natural 3/4 contrapposto stance (one foot slightly forward/angled)
        const dir = o.facing === 'back-right' ? 1 : -1;
        const lFootX = x - 3.6 * s, lFootY = y - 1.2 * s;
        const rFootX = x + 3.8 * s, rFootY = y + 1.0 * s;

        // Articulated trousers (thigh + calf taper) & shoes
        limb(P, x - 2.4 * s, hip, lFootX, lFootY, 2.5 * s, 1.7 * s, PANTS);
        limb(P, x + 2.4 * s, hip, rFootX, rFootY, 2.5 * s, 1.7 * s, PANTS);
        shape(P, ellipse(lFootX + dir * 1.4 * s, lFootY + 0.5 * s, 3.0 * s, 1.5 * s, 10), [['blue', 0.92]], { lw: 0.65 });
        shape(P, ellipse(rFootX + dir * 1.4 * s, rFootY + 0.5 * s, 3.0 * s, 1.5 * s, 10), [['blue', 0.92]], { lw: 0.65 });

        // Tailored torso (3/4 turned shoulders & subtle waist)
        const torso = [
            [x - 4.6 * s, hip + 1.5 * s],
            [x + 4.8 * s, hip + 1.0 * s],
            [x + 6.0 * s, shY + 1.8 * s],
            [x + 3.2 * s, shY - 0.5 * s],
            [x - 3.2 * s, shY - 0.5 * s],
            [x - 5.6 * s, shY + 1.8 * s],
        ];
        shape(P, torso, SHIRT, { shade: 0.08, lw: 0.85 });

        if (o.labcoat) {
            // Knee-length white lab coat tails + lapel + pocket
            shape(P, [[x - 5.0 * s, hip], [x + 5.2 * s, hip], [x + 6.2 * s, hip + 7.5 * s], [x - 5.6 * s, hip + 7.5 * s]], [], { lw: 0.8 });
            P.line([[x - 1.5 * s, shY], [x + 0.5 * s, shY + 4.5 * s], [x + 2.2 * s, shY]], 0.75, 'teal', false, 0.12);
            P.line([[x + 0.5 * s, shY + 4.5 * s], [x + 0.5 * s, hip + 7.2 * s]], 0.65, 'blue', false, 0.12);
        }

        // Neck & sculpted 3/4 head
        limb(P, x, shY + 0.5 * s, x, hy + 4.2 * s, 2.0 * s, 1.8 * s, SKIN);
        const tilt = pose === 'violin' ? 1.8 * s : 0;
        const head = ellipse(x - tilt, hy, 4.5 * s, 5.4 * s, 14);
        P.knock(head); P.fill(head, 'coral', 0.22); P.fill(head, 'sun', 0.18); P.line(head, 0.85, 'blue', true, 0.14);
        // Hair cap & sideburn
        const hair = [];
        for (let k = 0; k <= 10; k++) {
            const a = Math.PI * 0.92 + Math.PI * 1.16 * k / 10;
            hair.push([x - tilt + Math.cos(a) * 5.0 * s, hy - 1.0 * s + Math.sin(a) * 5.4 * s]);
        }
        shape(P, hair, o.hair || [['blue', 0.9]], { lw: 0.65 });
        // Subtle gaze dots when facing viewer/side
        if (pose !== 'paint') {
            P.dot(x - tilt - 1.4 * s, hy + 0.3 * s, 0.75 * s, 'blue', 0.95);
            P.dot(x - tilt + 1.8 * s, hy + 0.3 * s, 0.75 * s, 'blue', 0.95);
        }

        // Articulated arms with real sleeves + hands
        if (pose === 'pipette') {
            const dip = Math.sin(t * 2.8) * 3.2 * s;
            // Left arm relaxed at bench
            limb(P, x - 5.2 * s, shY + 2 * s, x - 7.8 * s, hip - 1.5 * s, 1.8 * s, 1.4 * s, SHIRT);
            // Right arm holding micropipette over ELISA plate
            const ex = x + 6.5 * s, ey = shY + 5.5 * s;
            const hx = x + 11.0 * s, hy2 = shY + 1.5 * s + dip;
            limb(P, x + 5.2 * s, shY + 2 * s, ex, ey, 1.9 * s, 1.6 * s, SHIRT);
            limb(P, ex, ey, hx, hy2, 1.5 * s, 1.2 * s, SKIN);
            P.dot(hx, hy2, 1.5 * s, 'coral', 0.35);
            // Micropipette body + blue sterile tip
            P.line([[hx, hy2 - 5 * s], [hx + 1.0 * s, hy2 + 3.5 * s]], 2.1, 'blue', false, 0.06);
            P.line([[hx + 1.0 * s, hy2 + 3.5 * s], [hx + 1.4 * s, hy2 + 8.0 * s]], 1.1, 'teal', false, 0.04);
        } else if (pose === 'paint') {
            const sx = Math.sin(t * 3.2) * 3.2 * s;
            const sy = Math.cos(t * 2.1) * 2.4 * s;
            // Left arm holding wooden artist palette
            const lx = x - 8.8 * s, ly = shY + 6.2 * s;
            limb(P, x - 5.0 * s, shY + 2 * s, x - 7.6 * s, shY + 6.2 * s, 1.8 * s, 1.5 * s, SHIRT);
            limb(P, x - 7.6 * s, shY + 6.2 * s, lx, ly, 1.4 * s, 1.1 * s, SKIN);
            shape(P, ellipse(lx - 2.2 * s, ly, 5.6 * s, 3.4 * s, 14), WOOD, { lw: 0.72 });
            P.dot(lx - 4.4 * s, ly - 0.8 * s, 1.3 * s, 'coral', 0.95);
            P.dot(lx - 1.8 * s, ly - 1.3 * s, 1.3 * s, 'sun', 0.95);
            P.dot(lx + 0.6 * s, ly - 0.4 * s, 1.3 * s, 'teal', 0.95);
            P.dot(lx - 2.2 * s, ly + 1.2 * s, 1.1 * s, 'blue', 0.85);
            // Right arm reaching up-left toward the easel canvas with a long brush
            const ex = x + 6.5 * s, ey = shY + 3.2 * s;
            const hx = x + 7.2 * s + sx, hy2 = shY - 3.2 * s + sy;
            limb(P, x + 5.0 * s, shY + 2 * s, ex, ey, 1.8 * s, 1.5 * s, SHIRT);
            limb(P, ex, ey, hx, hy2, 1.4 * s, 1.1 * s, SKIN);
            P.line([[hx, hy2], [hx - 2.5 * s, hy2 - 8.5 * s]], 1.3, 'coral', false, 0.06);
            P.dot(hx - 2.6 * s, hy2 - 9.0 * s, 1.3 * s, 'sun', 0.95);
        } else if (pose === 'violin') {
            // Real hourglass violin tucked cleanly on left shoulder under chin
            const vx0 = x - 2.2 * s, vy0 = shY + 0.6 * s; // chinrest
            const vx1 = x - 16.5 * s, vy1 = shY + 5.4 * s; // scroll
            const vlen = Math.hypot(vx1 - vx0, vy1 - vy0) || 1;
            const ux = (vx1 - vx0) / vlen, uy = (vy1 - vy0) / vlen;
            const nx = -uy, ny = ux;

            // Left arm bent gracefully up under the fingerboard
            const lex = x - 8.8 * s, ley = shY + 10.2 * s;
            const lhx = vx0 + ux * 11.8 * s, lhy = vy0 + uy * 11.8 * s + 1.0 * s;
            limb(P, x - 5.0 * s, shY + 2 * s, lex, ley, 1.8 * s, 1.5 * s, SHIRT);
            limb(P, lex, ley, lhx, lhy, 1.4 * s, 1.1 * s, SKIN);

            // Sculpted hourglass violin silhouette (lower bout -> C-waist -> upper bout)
            const pt = (a, b) => [vx0 + ux * a * s + nx * b * s, vy0 + uy * a * s + ny * b * s];
            const vBody = [
                pt(0.2, 0), pt(0.8, 3.2), pt(3.2, 4.0), pt(4.9, 2.2), pt(6.2, 3.2),
                pt(8.6, 2.6), pt(9.5, 0),
                pt(8.6, -2.6), pt(6.2, -3.2), pt(4.9, -2.2), pt(3.2, -4.0), pt(0.8, -3.2),
            ];
            shape(P, vBody, [['coral', 0.62], ['sun', 0.55]], { shade: 0.12, lw: 0.85 });
            // Ebony chinrest, tailpiece, fingerboard & scroll
            shape(P, ellipse(...pt(1.2, 1.6), 1.8 * s, 1.2 * s, 8), [['blue', 0.9]], { lw: 0.5 });
            P.line([pt(2.6, 0), pt(14.8, 0)], 1.7 * s, 'blue', false, 0.05);
            P.dot(...pt(15.2, 0.3), 1.6 * s, 'blue', 0.92);
            // White bridge & subtle f-holes
            P.chalk([pt(4.6, -1.6), pt(4.6, 1.6)], 1.0);
            P.line([pt(3.8, 2.0), pt(5.3, 1.6)], 0.65, 'blue', false, 0.05);
            P.line([pt(3.8, -2.0), pt(5.3, -1.6)], 0.65, 'blue', false, 0.05);

            // Taut wooden bow + white horsehair drawn smoothly perpendicular across the strings
            const bowSlide = Math.sin(t * 4.0) * 6.8 * s;
            const bcx = vx0 + ux * 5.6 * s + nx * bowSlide;
            const bcy = vy0 + uy * 5.6 * s + ny * bowSlide;
            const tipX = bcx - nx * 10.5 * s, tipY = bcy - ny * 10.5 * s;
            const frogX = bcx + nx * 10.5 * s, frogY = bcy + ny * 10.5 * s;
            P.chalk([[tipX, tipY], [frogX, frogY]], 1.0);
            P.line([[tipX + ux * 1.3, tipY + uy * 1.3], [frogX + ux * 1.3, frogY + uy * 1.3]], 1.2, 'coral', false, 0.05);
            P.dot(frogX, frogY, 1.3 * s, 'blue', 0.9);

            // Articulated right arm (shoulder -> elbow -> bowing hand at frog)
            const rex = (x + 5.2 * s + frogX) * 0.5 + 4.2 * s;
            const rey = (shY + 2 * s + frogY) * 0.5 + 4.0 * s;
            limb(P, x + 5.2 * s, shY + 2 * s, rex, rey, 1.8 * s, 1.5 * s, SHIRT);
            limb(P, rex, rey, frogX, frogY, 1.4 * s, 1.1 * s, SKIN);
            P.dot(frogX, frogY, 1.4 * s, 'coral', 0.35);
        }
    }

    function drawSwimmer(P, t) {
        const SKIN = [['coral', 0.26], ['sun', 0.22]];
        const lap = (t * 0.13) % 2;
        const dir = lap < 1 ? 1 : -1;
        const u = lap < 1 ? lap : 2 - lap;
        const si = lerp(8.7, 13.4, u);
        const sj = dir > 0 ? 5.72 : 7.58;

        const [p0x, p0y] = iso(si, sj, 0.04);
        const [p1x, p1y] = iso(si + dir, sj, 0.04);
        const dlen = Math.hypot(p1x - p0x, p1y - p0y) || 1;
        const ux = (p1x - p0x) / dlen, uy = (p1y - p0y) / dlen;
        const px = -uy, py = ux;

        const phase = t * 5.0;
        const roll = Math.sin(phase) * 0.85; // authentic freestyle body roll

        // Trailing V-wake & expanding ripples behind swimmer
        for (let k = 0; k < 4; k++) {
            const wph = (t * 1.2 + k / 4) % 1;
            const wx = p0x - ux * (14 + wph * 30);
            const wy = p0y - uy * (14 + wph * 30);
            ctx.save();
            ctx.globalAlpha = (1 - wph) * 0.8;
            P.chalk(ellipse(wx, wy, 5 + wph * 10, 2.2 + wph * 4, 12), 1.1, true);
            ctx.restore();
        }

        // Tapered kicking legs (thigh + calf) & churned white splash foam
        const kick = Math.sin(t * 15.5);
        const hipX = p0x - ux * 8.5, hipY = p0y - uy * 8.5;
        const f1X = hipX - ux * 14 + px * 2.6, f1Y = hipY - uy * 14 + py * 2.6 - Math.max(0, kick) * 4.2;
        const f2X = hipX - ux * 14 - px * 2.6, f2Y = hipY - uy * 14 - py * 2.6 - Math.max(0, -kick) * 4.2;
        limb(P, hipX + px * 2.1, hipY + py * 2.1, f1X, f1Y, 2.1, 1.1, SKIN);
        limb(P, hipX - px * 2.1, hipY - py * 2.1, f2X, f2Y, 2.1, 1.1, SKIN);
        // White churned foam around feet
        P.chalk([[f1X - ux * 2, f1Y - 1], [f1X - ux * 7, f1Y - 4 - Math.max(0, kick) * 3]], 1.5);
        P.chalk([[f2X - ux * 2, f2Y - 1], [f2X - ux * 7, f2Y - 4 - Math.max(0, -kick) * 3]], 1.5);

        // Anatomical torso (broad shoulders tapering cleanly to waist & hips)
        const shX = p0x + ux * 6.5, shY = p0y + uy * 6.5;
        const waistX = p0x - ux * 1.5, waistY = p0y - uy * 1.5;
        const torso = [
            [hipX + px * 3.4, hipY + py * 3.4],
            [waistX + px * 3.1, waistY + py * 3.1],
            [shX + px * 5.2, shY + py * 5.2],
            [shX - px * 5.2, shY - py * 5.2],
            [waistX - px * 3.1, waistY - py * 3.1],
            [hipX - px * 3.4, hipY - py * 3.4],
        ];
        shape(P, torso, SKIN, { lw: 0.78 });
        // Blue swim trunks
        const trunks = [
            [hipX + px * 3.5, hipY + py * 3.5],
            [hipX + ux * 5.5 + px * 3.4, hipY + uy * 5.5 + py * 3.4],
            [hipX + ux * 5.5 - px * 3.4, hipY + uy * 5.5 - py * 3.4],
            [hipX - px * 3.5, hipY - py * 3.5],
        ];
        shape(P, trunks, [['blue', 0.85]], { lw: 0.65 });

        // Head with swim cap & goggles, turning slightly sideways to breathe
        const headX = shX + ux * 6.8, headY = shY + uy * 6.8 - 2.0 - Math.max(0, roll) * 0.9;
        shape(P, ellipse(headX, headY, 4.6, 4.1, 12), SKIN, { lw: 0.8 });
        const cap = [];
        for (let k = 0; k <= 8; k++) {
            const a = Math.PI + Math.PI * k / 8;
            cap.push([headX + Math.cos(a) * 4.8, headY - 0.5 + Math.sin(a) * 4.2]);
        }
        shape(P, cap, [['blue', 0.92]], { lw: 0.6 });
        P.line([[headX + ux * 1.5 - px * 2.2, headY + 0.4], [headX + ux * 3.4 + px * 2.2, headY + 0.4]], 1.5, 'sun', false, 0.04);

        // High-elbow alternating freestyle arms (upper arm + forearm)
        for (const side of [-1, 1]) {
            const a = phase + (side > 0 ? 0 : Math.PI);
            const lift = Math.sin(a);
            if (lift > -0.1) {
                const reach = Math.cos(a);
                const s0x = shX + px * side * 4.5, s0y = shY + py * side * 4.5 - 1;
                const elX = s0x + ux * (reach * 6.5) + px * side * 3.2;
                const elY = s0y + uy * (reach * 6.5) - 3.2 - Math.max(0, lift) * 9.5;
                const haX = s0x + ux * (reach * 14 + 3.5) + px * side * 1.4;
                const haY = s0y + uy * (reach * 14 + 3.5) - Math.max(0, lift) * 5.2;
                limb(P, s0x, s0y, elX, elY, 1.9, 1.5, SKIN);
                limb(P, elX, elY, haX, haY, 1.4, 1.0, SKIN);
                if (reach > 0.7 && lift < 0.35) {
                    P.chalk(ellipse(haX, haY + 1, 5.2, 2.4, 10), 1.2, true);
                }
            }
        }

        // Bow wave & water surface lapping across shoulders/torso so swimmer sits IN the water
        P.chalk([[headX + ux * 5.5 - px * 4, headY + uy * 5.5 + 2.5], [headX + ux * 7.5, headY + uy * 7.5 + 3], [headX + ux * 5.5 + px * 4, headY + uy * 5.5 + 2.5]], 1.25);
        P.chalk([[p0x - ux * 4 + px * 6, p0y - uy * 4 + py * 6 + 1.5], [p0x + ux * 3 - px * 5, p0y + uy * 3 - py * 5 + 1.5]], 1.0);
    }

    // ---------- Dense Isometric Studio (15 x 9 grid) ----------

    const W = 15, D = 9, H = 3.5;

    const scene = {
        under(P, R) {
            // Thick cutaway architectural foundation slab
            block(P, 0, 0, -0.5, W, D, 0.5, [['blue', 0.16]], { top: TILE });

            // Lab tiled floor (i 0..9.5, j 0..4.5) with crisp grout lines
            for (let a = 0; a < 9; a++) for (let b = 0; b < 4; b++) {
                if ((a + b) % 2) P.fill(flat(a, b, 0.01, 1, 1), 'teal', 0.16);
            }
            for (let n = 1; n <= 9; n++) P.line([iso(n, 0, 0.01), iso(n, 4.4, 0.01)], 0.35, 'blue', false, 0.15);
            for (let n = 1; n <= 4; n++) P.line([iso(0, n, 0.01), iso(9.2, n, 0.01)], 0.35, 'blue', false, 0.15);

            // Warm hardwood parquet floor in philately & painting studio
            shape(P, flat(0, 4.4, 0.01, 7.2, 4.6), WOOD, { lw: 0.65 });
            for (let n = 1; n < 9; n++) P.line([iso(0, 4.4 + n * 0.52, 0.01), iso(7.2, 4.4 + n * 0.52, 0.01)], 0.38, 'blue', false, 0.15);

            // Woven rug under the philately desk
            shape(P, flat(1.2, 5.1, 0.02, 5.1, 3.2), [['coral', 0.36], ['sun', 0.25]], { lw: 0.7 });
            P.line(flat(1.45, 5.35, 0.02, 4.6, 2.7), 0.7, 'sun', true, 0.2);

            // Stone pool deck surrounding the right courtyard
            shape(P, flat(7.2, 4.4, 0.01, 7.8, 4.6), STONE, { lw: 0.7 });

            // Cutaway back & left walls with skirting boards
            block(P, -0.32, -0.32, 0, 0.32, D + 0.32, H, WALL, { shade: 0.9 });
            block(P, 0, -0.32, 0, W, 0.32, H, WALL, { shade: 0.45 });
            P.line([iso(0, 0.02, 0.24), iso(W, 0.02, 0.24)], 0.9, 'blue');
            P.line([iso(0.02, 0, 0.24), iso(0.02, D, 0.24)], 0.9, 'blue');

            // ---- Left Wall: Biosafety Cabinet (Mammalian Cell Culture) + 80/20 Poster ----
            // Laminar flow / biosafety hood (j 1.6..3.6)
            block(P, 0.05, 1.65, 0, 1.25, 1.85, 2.25, [['blue', 0.14]], { top: [['teal', 0.25]] });
            // Sash window into hood interior
            shape(P, onLeft(1.85, 3.3, 0.95, 1.95, 1.31), [['teal', 0.28], ['sun', 0.12]], { lw: 0.75 });
            // Culture flasks inside the biosafety hood
            for (let k = 0; k < 3; k++) {
                shape(P, onLeft(2.05 + k * 0.38, 2.28 + k * 0.38, 1.0, 1.32, 1.32), [['coral', 0.55]], { lw: 0.5 });
            }
            // Control panel above sash
            shape(P, onLeft(1.9, 3.25, 2.02, 2.2, 1.31), [['blue', 0.55]], { lw: 0.5 });
            // Wall reagent shelf above philately corner (j 4.8..7.4)
            block(P, 0, 4.7, 2.2, 0.55, 2.8, 0.1, WOOD_DK);
            for (let k = 0; k < 6; k++) {
                const bj = 4.9 + k * 0.42;
                block(P, 0.08, bj, 2.3, 0.36, 0.28, 0.42 + (k % 2) * 0.14, [RED, [['teal', 0.7]], [['sun', 0.8]], PURPLE, [['blue', 0.65]], ORANGE][k], { lw: 0.5, shade: 0.5 });
            }
            // 80% Wet Lab / 20% Dry Lab pie chart poster (j 0.3..1.4)
            shape(P, onLeft(0.3, 1.45, 1.45, 2.8), [['sun', 0.22]]);
            const [ppx, ppy] = iso(0.02, 0.88, 2.12);
            shape(P, circle(ppx, ppy, 11, 14), [['teal', 0.58]], { lw: 0.75 });
            shape(P, [[ppx, ppy], [ppx + 11, ppy], [ppx + 6.5, ppy - 8.8]], [['coral', 0.85]], { lw: 0.55 });

            // ---- Back Wall: Upper Reagent Shelf, Bioinformatics Whiteboard & Art Gallery ----
            // Reagent bottle shelf above wet lab (i 0.8..4.8)
            block(P, 0.8, 0, 2.35, 4.2, 0.5, 0.1, WOOD);
            for (let k = 0; k < 7; k++) {
                cyl(P, 1.15 + k * 0.55, 0.26, 2.45, 0.13, 0.34 + (k % 3) * 0.1, [[['teal', 'coral', 'sun', 'blue'][k % 4], 0.55]], { lw: 0.6 });
            }
            // Bioinformatics whiteboard above dry lab (i 5.8..9.2)
            shape(P, onBack(5.85, 9.15, 1.85, 3.1), [], { lw: 1.0 });
            // Phylogenetic tree diagram + sticky notes on whiteboard
            P.line([iso(6.15, 0.02, 2.5), iso(6.75, 0.02, 2.5)], 0.8, 'teal');
            P.line([iso(6.75, 0.02, 2.8), iso(6.75, 0.02, 2.2)], 0.8, 'teal');
            P.line([iso(6.75, 0.02, 2.8), iso(7.35, 0.02, 2.8)], 0.8, 'teal');
            P.line([iso(6.75, 0.02, 2.2), iso(7.2, 0.02, 2.2)], 0.8, 'teal');
            P.line([iso(7.2, 0.02, 2.35), iso(7.2, 0.02, 2.05)], 0.8, 'coral');
            P.line([iso(7.2, 0.02, 2.35), iso(7.65, 0.02, 2.35)], 0.8, 'coral');
            P.line([iso(7.2, 0.02, 2.05), iso(7.65, 0.02, 2.05)], 0.8, 'coral');
            for (let k = 0; k < 3; k++) shape(P, onBack(8.05 + k * 0.34, 8.32 + k * 0.34, 2.55 - (k % 2) * 0.35, 2.85 - (k % 2) * 0.35, 0.02), [[['sun', 'coral', 'teal'][k], 0.75]], { lw: 0.45 });

            // Sunlit studio window + 3 framed oil paintings on right back wall (i 10..14.6)
            shape(P, onBack(10.0, 11.4, 1.5, 3.0), [['teal', 0.12], ['sun', 0.14]], { lw: 1.2 });
            P.line([iso(10.7, 0.02, 1.5), iso(10.7, 0.02, 3.0)], 1.2);
            P.line([iso(10.0, 0.02, 2.25), iso(11.4, 0.02, 2.25)], 1.2);
            // Framed oil paintings
            shape(P, onBack(11.8, 13.0, 1.65, 2.95), [['sun', 0.35]], { lw: 1.0 });
            shape(P, onBack(11.9, 12.9, 2.25, 2.85, 0.02), [['teal', 0.45]], { lw: 0.4 });
            shape(P, onBack(11.9, 12.9, 1.75, 2.25, 0.02), [['coral', 0.65], ['sun', 0.45]], { lw: 0.4 });
            shape(P, onBack(13.3, 14.5, 1.75, 2.85), [['purple' === 'x' ? 'blue' : 'coral', 0.25], ['sun', 0.35]], { lw: 1.0 });
            shape(P, onBack(13.45, 14.35, 1.85, 2.75, 0.02), GREEN, { lw: 0.4 });

            // ---- STATION 1: WET LAB BENCH (i 1.3..5.6, j 0.15..1.55) ----
            block(P, 1.3, 0.15, 0, 4.3, 1.4, 0.88, [['blue', 0.1]], { top: [['blue', 0.05]] });
            for (let k = 0; k < 3; k++) {
                const i0 = 1.45 + k * 1.38;
                shape(P, onBack(i0, i0 + 1.22, 0.1, 0.72, 1.56), [['teal', 0.18]], { lw: 0.55 });
                P.dot(...iso(i0 + 1.0, 1.56, 0.45), 1.1, 'blue', 0.85);
            }
            // Confocal Microscope (i 1.65)
            block(P, 1.5, 0.45, 0.88, 0.68, 0.68, 0.12, [['blue', 0.75]]);
            block(P, 1.72, 0.55, 1.0, 0.2, 0.24, 0.84, [['blue', 0.65]]);
            block(P, 1.55, 0.5, 1.72, 0.54, 0.42, 0.24, [['blue', 0.45], ['teal', 0.35]]);
            block(P, 1.7, 0.62, 1.96, 0.12, 0.12, 0.32, [['blue', 0.8]]);
            block(P, 1.86, 0.62, 1.96, 0.12, 0.12, 0.32, [['blue', 0.8]]);
            // Western Blot / Gel Electrophoresis Tank (i 2.45)
            block(P, 2.38, 0.48, 0.88, 0.68, 0.54, 0.26, [['teal', 0.22]], { top: [['blue', 0.12]] });
            // ELISA 96-well plate + pipette carousel (i 3.25)
            block(P, 3.2, 0.55, 0.88, 0.58, 0.42, 0.07, [['sun', 0.28]], { lw: 0.55 });
            for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
                P.dot(...iso(3.28 + a * 0.13, 0.64 + b * 0.11, 0.96), 1.2, (a + b) % 2 ? 'coral' : 'teal', 0.85);
            }
            // Bubbling Erlenmeyer Flasks (NGS / HPLC)
            for (let k = 0; k < 3; k++) {
                const fi = 3.98 + k * 0.36;
                cyl(P, fi, 0.7, 0.88, 0.14, 0.28, [[['teal', 'coral', 'sun'][k], 0.55]]);
                cyl(P, fi, 0.7, 1.16, 0.06, 0.3, [], { cap: [['blue', 0.15]] });
            }
            // RT-qPCR Thermal Cycler & GC-MS stack (i 4.9)
            block(P, 4.92, 0.38, 0.88, 0.64, 0.78, 0.62, [['blue', 0.2]], { top: [['teal', 0.28]] });
            shape(P, onBack(5.0, 5.48, 1.02, 1.38, 1.17), [['blue', 0.92]], { lw: 0.5 });

            // ---- STATION 2: DRY LAB / COMPUTATIONAL DESK (i 5.8..9.5, j 0.15..1.55) ----
            block(P, 5.8, 0.15, 0, 3.7, 1.4, 0.84, WOOD);
            // PC Tower under desk
            block(P, 8.85, 0.35, 0, 0.5, 0.9, 0.75, [['blue', 0.72]]);
            // Main PyMOL / AlphaFold monitor
            block(P, 6.05, 0.32, 0.84, 1.95, 0.14, 1.12, [['blue', 0.86]]);
            shape(P, onBack(6.14, 7.9, 0.95, 1.86, 0.47), [['blue', 0.96]], { lw: 0.65 });
            block(P, 6.82, 0.32, 0.84, 0.4, 0.34, 0.08, [['blue', 0.65]]);
            // Second monitor (BLAST / GraphPad Prism / R)
            block(P, 8.15, 0.38, 0.84, 1.15, 0.14, 0.95, [['blue', 0.82]]);
            shape(P, onBack(8.22, 9.22, 0.94, 1.7, 0.53), [['blue', 0.94]], { lw: 0.6 });
            // Keyboard + coffee mug
            shape(P, flat(6.35, 0.78, 0.85, 1.45, 0.42), [['blue', 0.22]], { lw: 0.55 });
            cyl(P, 8.35, 1.05, 0.85, 0.11, 0.2, RED, { lw: 0.55 });
            // Desk lamp
            cyl(P, 9.3, 0.48, 0.84, 0.13, 0.07, [['sun', 0.82]], { lw: 0.55 });
            P.line([iso(9.3, 0.48, 0.91), iso(9.1, 0.65, 1.52)], 1.3, 'blue', false, 0.12);

            // ---- STATION 3: OIL PAINTING STUDIO & CLASSICAL VIOLIN (i 10.0..14.6, j 0.7..4.0) ----
            // Detailed wooden A-frame easel (i 10.8, j 1.3)
            const ei = 10.8, ej = 1.3;
            P.line([iso(ei - 0.52, ej + 0.55, 0), iso(ei, ej, 2.3)], 1.6, 'blue', false, 0.15);
            P.line([iso(ei + 0.52, ej + 0.55, 0), iso(ei, ej, 2.3)], 1.6, 'blue', false, 0.15);
            P.line([iso(ei, ej - 0.52, 0), iso(ei, ej, 2.3)], 1.4, 'blue', false, 0.15);
            // Oil painting canvas on easel (mini mountain & sunset lake landscape)
            shape(P, onBack(ei - 0.62, ei + 0.62, 0.95, 2.15, ej + 0.15), [['sun', 0.22]], { lw: 0.95 });
            shape(P, onBack(ei - 0.54, ei + 0.54, 1.52, 2.06, ej + 0.16), [['sun', 0.55], ['coral', 0.22]], { lw: 0.3 });
            // Sun disc & mountain silhouette on canvas
            P.dot(...iso(ei + 0.18, ej + 0.17, 1.84), 4.2, 'coral', 0.75);
            shape(P, [iso(ei - 0.54, ej + 0.17, 1.38), iso(ei - 0.18, ej + 0.17, 1.78), iso(ei + 0.1, ej + 0.17, 1.54), iso(ei + 0.34, ej + 0.17, 1.72), iso(ei + 0.54, ej + 0.17, 1.38)], [['blue', 0.55], ['teal', 0.35]], { lw: 0.35 });
            shape(P, onBack(ei - 0.54, ei + 0.54, 1.02, 1.38, ej + 0.17), [['teal', 0.55], ['sun', 0.25]], { lw: 0.3 });
            // Paint taboret + brush jar + paint tubes
            block(P, 9.75, 1.55, 0, 0.72, 0.62, 0.72, WOOD_DK);
            cyl(P, 10.22, 1.78, 0.72, 0.11, 0.26, [['teal', 0.5]], { lw: 0.55 });
            for (let k = 0; k < 4; k++) P.line([iso(10.22, 1.78, 0.98), iso(10.12 + k * 0.07, 1.74 + (k % 2) * 0.08, 1.32)], 0.85, ['coral', 'blue', 'sun', 'teal'][k], false, 0.1);
            // Spare canvases leaning against back wall
            shape(P, onBack(11.65, 12.25, 0.05, 0.95, 0.45), [['sun', 0.28]], { lw: 0.75 });
            // Music stand + open violin case on floor
            P.line([iso(13.4, 1.55, 0), iso(13.4, 1.55, 1.42)], 1.35, 'blue', false, 0.12);
            shape(P, onBack(13.0, 13.8, 1.28, 1.82, 1.57), [], { lw: 0.75 });
            for (let k = 0; k < 4; k++) P.line([iso(13.1, 1.58, 1.38 + k * 0.11), iso(13.7, 1.58, 1.38 + k * 0.11)], 0.45, 'blue', false, 0.1);
            // Open velvet-lined violin case beside violinist
            block(P, 13.5, 2.7, 0, 1.05, 0.48, 0.18, WOOD_DK, { top: RED, lw: 0.65 });

            // ---- STATION 4: COLONIAL INDIA PHILATELY DESK (i 1.6..5.7, j 5.5..7.5) ----
            for (const [li, lj] of [[1.75, 5.65], [5.45, 5.65], [1.75, 7.25], [5.45, 7.25]]) block(P, li, lj, 0, 0.14, 0.14, 0.76, WOOD_DK, { lw: 0.6 });
            block(P, 1.65, 5.55, 0.76, 3.95, 1.85, 0.12, WOOD, { top: [['sun', 0.34], ['coral', 0.22]] });
            // Open leather-bound stamp album
            shape(P, flat(2.15, 5.88, 0.89, 1.28, 1.18), [], { lw: 0.75 });
            shape(P, flat(3.43, 5.88, 0.89, 1.28, 1.18), [], { lw: 0.75 });
            // Perforated Colonial India stamps (rows of colourful rectangles)
            const stCols = [RED, [['teal', 0.82]], [['sun', 0.92]], PURPLE, ORANGE, [['blue', 0.78]]];
            for (let k = 0; k < 6; k++) {
                const si = 2.3 + (k % 3) * 0.34, sj = 6.02 + Math.floor(k / 3) * 0.44;
                shape(P, flat(si, sj, 0.9, 0.24, 0.3), stCols[k], { lw: 0.48, amp: 0.08 });
            }
            for (let k = 0; k < 6; k++) {
                const si = 3.58 + (k % 3) * 0.34, sj = 6.02 + Math.floor(k / 3) * 0.44;
                shape(P, flat(si, sj, 0.9, 0.24, 0.3), stCols[(k + 3) % 6], { lw: 0.48, amp: 0.08 });
            }
            // Vintage airmail envelopes with red wax seal on right side of desk
            shape(P, flat(4.85, 6.25, 0.89, 0.58, 0.42), [['sun', 0.3]], { lw: 0.55 });
            P.dot(...iso(5.14, 6.46, 0.91), 2.0, 'coral', 0.95);
            // Brass philately desk lamp
            cyl(P, 1.9, 5.85, 0.88, 0.14, 0.08, [['sun', 0.85]], { lw: 0.55 });
            P.line([iso(1.9, 5.85, 0.96), iso(2.1, 6.0, 1.55)], 1.3, 'blue', false, 0.12);

            // ---- STATION 5: RECESSED LAP SWIMMING POOL (i 7.7..14.4, j 4.8..8.5) ----
            // Raised stone coping rim
            shape(P, flat(7.45, 4.55, 0.02, 7.2, 4.2), [['sun', 0.22], ['blue', 0.1]], { lw: 0.85 });
            // Visible recessed pool inner walls (depth illusion!)
            shape(P, [iso(7.7, 4.8, 0.03), iso(14.4, 4.8, 0.03), iso(14.4, 4.8, -0.35), iso(7.7, 4.8, -0.35)], POOL_DEEP, { lw: 0.65 });
            shape(P, [iso(7.7, 4.8, 0.03), iso(7.7, 8.5, 0.03), iso(7.7, 8.5, -0.35), iso(7.7, 4.8, -0.35)], POOL_DEEP, { lw: 0.65 });
            // Water surface
            shape(P, flat(7.7, 4.8, 0.01, 6.7, 3.7), POOL, { lw: 0.9 });
            // Floating lane rope with alternating coral/sun/white buoys
            P.chalk([iso(7.9, 6.65, 0.03), iso(14.2, 6.65, 0.03)], 1.4);
            for (let k = 0; k < 11; k++) {
                P.dot(...iso(8.15 + k * 0.58, 6.65, 0.04), 1.8, k % 2 ? 'coral' : 'sun', 0.95);
            }
            // Starting block + stainless ladder + striped beach towel on deck
            block(P, 7.45, 5.45, 0.02, 0.42, 0.55, 0.34, [['blue', 0.35]], { top: [['coral', 0.7]] });
            P.line([iso(8.1, 4.8, 0.02), iso(8.1, 4.8, 0.78), iso(7.75, 4.8, 0.78)], 1.35, 'blue', false, 0.12);
            P.line([iso(8.52, 4.8, 0.02), iso(8.52, 4.8, 0.78), iso(8.17, 4.8, 0.78)], 1.35, 'blue', false, 0.12);
            shape(P, flat(13.3, 4.25, 0.02, 1.15, 0.48), [['coral', 0.65]], { lw: 0.6 });
            P.chalk([iso(13.55, 4.25, 0.03), iso(13.55, 4.73, 0.03)], 1.2);
            P.chalk([iso(14.05, 4.25, 0.03), iso(14.05, 4.73, 0.03)], 1.2);
        },

        live(P, t) {
            // 1. Wet Lab animations: confocal laser beam, gel electrophoresis bands, bubbling flasks, qPCR curve, researcher
            const [lx, ly] = iso(1.82, 0.72, 1.25);
            P.pool(lx, ly + 8, 30, 'teal', 0.28 + 0.1 * Math.sin(t * 4.2));
            // Migrating Western blot gel bands
            const bandShift = (t * 0.08) % 0.25;
            for (let b = 0; b < 3; b++) {
                P.line([iso(2.48 + b * 0.18, 0.6 + bandShift, 1.15), iso(2.58 + b * 0.18, 0.6 + bandShift, 1.15)], 1.4, b === 1 ? 'coral' : 'teal', false, 0.05);
            }
            // Bubbling flasks
            for (let k = 0; k < 3; k++) {
                const fi = 3.98 + k * 0.36;
                for (let b = 0; b < 2; b++) {
                    const ph = (t * 0.65 + b * 0.5 + k * 0.23) % 1;
                    const [x, y] = iso(fi + Math.sin(t * 3 + k + b) * 0.02, 0.7, 1.26 + ph * 0.58);
                    if (ph < 0.85) shape(P, circle(x, y, 1.2 + (1 - ph) * 1.2, 8), [['teal', 0.16]], { lw: 0.5, amp: 0.06 });
                }
            }
            // Live sigmoidal RT-qPCR amplification curve on screen
            const qPts = [];
            const prog = (t * 0.35) % 1;
            for (let k = 0; k <= 8; k++) {
                const u = (k / 8) * prog;
                const sig = 1 / (1 + Math.exp(-10 * (u - 0.55)));
                qPts.push(iso(5.04 + u * 0.4, 1.18, 1.06 + sig * 0.28));
            }
            if (qPts.length >= 2) P.line(qPts, 1.3, 'sun', false, 0.04);
            // Wet-lab researcher in white lab coat pipetting
            const [rx, ry] = iso(3.15, 2.2, 0);
            figure(P, rx, ry, { t, pose: 'pipette', labcoat: true, s: 0.94, shirt: [], hair: [['blue', 0.9]] });

            // 2. Dry Lab: rotating 3D protein helix + live BLAST/Prism plots + golden desk lamp
            const [dlx, dly] = iso(8.8, 0.95, 0.85);
            P.pool(dlx, dly, 48, 'sun', 0.28 + 0.04 * Math.sin(t * 2));
            for (let k = 0; k < 11; k++) {
                const u = k / 10;
                const ang = t * 2.1 + u * 5.6;
                const si = 6.26 + u * 1.48;
                const sz1 = 1.42 + Math.sin(ang) * 0.3;
                const sz2 = 1.42 - Math.sin(ang) * 0.3;
                P.dot(...iso(si, 0.49, sz1), 2.1, 'teal', 0.95);
                P.dot(...iso(si, 0.49, sz2), 2.1, 'coral', 0.95);
                if (k % 2 === 0) P.line([iso(si, 0.49, sz1), iso(si, 0.49, sz2)], 0.65, 'sun', false, 0.04);
            }
            // Live BLAST alignment bars on side monitor
            for (let r = 0; r < 5; r++) {
                const len = 0.25 + ((Math.sin(t * 1.5 + r * 1.4) + 1) * 0.28);
                P.line([iso(8.3, 0.55, 1.05 + r * 0.13), iso(8.3 + len, 0.55, 1.05 + r * 0.13)], 1.6, ['sun', 'teal', 'coral', 'sun', 'teal'][r], false, 0.04);
            }

            // 3. Oil Painter & Classical Violinist
            const [px, py] = iso(10.8, 2.35, 0);
            figure(P, px, py, { t, pose: 'paint', s: 0.94, shirt: [['sun', 0.82]], hair: [['blue', 0.88]] });
            const [vx, vy] = iso(12.95, 2.55, 0);
            figure(P, vx, vy, { t, pose: 'violin', s: 0.95, shirt: [['coral', 0.78]], hair: [['blue', 0.9]] });
            for (let n = 0; n < 3; n++) {
                const ph = (t * 0.46 + n / 3) % 1;
                const nx = vx - 8 + Math.sin(ph * 5 + n) * 8;
                const ny = vy - 38 - ph * 34;
                ctx.save();
                ctx.globalAlpha = Math.sin(ph * Math.PI);
                P.dot(nx, ny, 2.2, 'blue', 0.9);
                P.line([[nx + 2, ny], [nx + 2, ny - 8], [nx + 6, ny - 6]], 1.0, 'blue', false, 0.08);
                ctx.restore();
            }

            // 4. Philately: warm brass lamp pool + sweeping magnifying glass
            const [plx, ply] = iso(2.6, 6.2, 0.89);
            P.pool(plx, ply, 52, 'sun', 0.28 + 0.04 * Math.sin(t * 1.5));
            const mgI = 3.0 + Math.sin(t * 0.7) * 1.15;
            const mgJ = 6.35 + Math.cos(t * 0.5) * 0.34;
            const [gx, gy] = iso(mgI, mgJ, 1.08);
            shape(P, circle(gx, gy, 7.5, 14), [['sun', 0.25]], { lw: 1.4 });
            P.line([[gx + 5, gy + 5], [gx + 13, gy + 12]], 2.4, 'coral', false, 0.1);

            // 5. Swimming Pool: caustic shimmer + realistic articulated freestyle swimmer
            for (let k = 0; k < 5; k++) {
                const ci = 8.4 + k * 1.25 + Math.sin(t * 1.6 + k) * 0.3;
                const cj = 5.4 + (k % 2) * 2.1 + Math.cos(t * 1.3 + k) * 0.2;
                ctx.save();
                ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 2.5 + k);
                P.chalk([iso(ci - 0.35, cj, 0.03), iso(ci + 0.35, cj, 0.03)], 1.0);
                ctx.restore();
            }
            drawSwimmer(P, t);
        },

        over(P, R) {
            // Philately chair in front of desk
            block(P, 3.25, 7.65, 0, 0.62, 0.58, 0.52, WOOD_DK, { lw: 0.65 });
            block(P, 3.25, 8.12, 0.52, 0.62, 0.12, 0.6, WOOD_DK, { lw: 0.65 });
            // Lush potted plants framing the corners
            plant(P, 0.75, 8.1, R, 1.15);
            plant(P, 14.3, 3.9, R, 1.1);
            // Rolling lab stool near dry lab
            cyl(P, 7.45, 2.35, 0, 0.28, 0.62, [['blue', 0.6]], { cap: [['coral', 0.65]] });
        }
    };

    // ---------- Camera & Interactive Station Focus ----------

    const corners = [];
    for (const i of [-0.4, W + 0.4]) for (const j of [-0.4, D + 0.4]) for (const z of [-0.5, H + 0.6]) corners.push(iso(i, j, z));
    const X0 = Math.min(...corners.map(p => p[0])) - 14, X1 = Math.max(...corners.map(p => p[0])) + 14;
    const Y0 = Math.min(...corners.map(p => p[1])) - 14, Y1 = Math.max(...corners.map(p => p[1])) + 14;
    const BW = X1 - X0, BH = Y1 - Y0;
    canvas.style.aspectRatio = `${BW} / ${BH}`;

    const STATIONS = {
        all: { cx: (X0 + X1) / 2, cy: (Y0 + Y1) / 2, zoom: 1, label: 'Click any station to zoom in' },
        wetlab: { pt: iso(2.8, 1.5, 1.1), zoom: 2.0, label: 'Wet Lab · Biosafety hood, confocal laser, Western blot, ELISA, RT-qPCR & flasks' },
        drylab: { pt: iso(7.6, 0.9, 1.2), zoom: 2.1, label: 'Dry Lab · PyMOL 3D protein helix, BLAST alignments, R & phylogenetic trees' },
        arts: { pt: iso(11.9, 2.0, 1.1), zoom: 2.0, label: 'Arts & Music · Oil painting easel, gallery wall & classical violin' },
        philately: { pt: iso(3.5, 6.4, 0.65), zoom: 2.15, label: 'Philately · Colonial India stamp album, vintage envelopes & magnifying glass' },
        swim: { pt: iso(11.0, 6.6, 0.15), zoom: 1.9, label: 'Sports · Recessed lap swimming pool with freestyle swimmer' },
    };

    const cam = { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, zoom: 1 };
    let tween = null;
    let activeStation = 'all';

    function focusStation(key) {
        const st = STATIONS[key] || STATIONS.all;
        activeStation = key;
        const tx = st.pt ? st.pt[0] : st.cx;
        const ty = st.pt ? st.pt[1] : st.cy;
        tween = { from: { ...cam }, to: { x: tx, y: ty, zoom: st.zoom }, t0: performance.now(), dur: 750 };
        document.querySelectorAll('.skills-pill').forEach(b => b.classList.toggle('active', b.dataset.station === key));
        const cap = document.getElementById('skills-caption');
        if (cap) cap.textContent = st.label;
    }

    document.querySelectorAll('.skills-pill').forEach(btn => {
        btn.addEventListener('click', () => focusStation(btn.dataset.station));
    });

    canvas.addEventListener('click', e => {
        if (activeStation !== 'all') { focusStation('all'); return; }
        const r = canvas.getBoundingClientRect();
        const wx = X0 + ((e.clientX - r.left) / r.width) * BW;
        const wy = Y0 + ((e.clientY - r.top) / r.height) * BH;
        let best = 'all', bd = 140;
        for (const [k, st] of Object.entries(STATIONS)) {
            if (!st.pt) continue;
            const d = Math.hypot(st.pt[0] - wx, st.pt[1] - wy);
            if (d < bd) { bd = d; best = k; }
        }
        focusStation(best);
    });

    // ---------- Cached Layers & Render Loop ----------

    let baseScale = 1, layers = new Map();
    function renderLayer(layer, variant) {
        const cv = document.createElement('canvas');
        cv.width = Math.round(BW * baseScale);
        cv.height = Math.round(BH * baseScale);
        const c = cv.getContext('2d');
        c.setTransform(baseScale, 0, 0, baseScale, -X0 * baseScale, -Y0 * baseScale);
        scene[layer](Pen(c, hash('sk2', layer, variant)), rand(hash('sk2', 'layout', layer)));
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
        canvas.width = Math.round(BW * baseScale);
        canvas.height = Math.round(BH * baseScale);
        layers = new Map();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw(now) {
        if (tween) {
            const k = clamp((now - tween.t0) / tween.dur, 0, 1);
            const e = ease(k);
            cam.x = lerp(tween.from.x, tween.to.x, e);
            cam.y = lerp(tween.from.y, tween.to.y, e);
            cam.zoom = lerp(tween.from.zoom, tween.to.zoom, e);
            if (k >= 1) tween = null;
        }

        const t = reducedMotion ? 2 : now / 1000;
        const boil = reducedMotion ? 0 : Math.floor(t * 4) % 3;
        budget = 1;

        const cw = canvas.width, ch = canvas.height;
        const z = baseScale * cam.zoom;
        const ox = cw / 2 - cam.x * z;
        const oy = ch / 2 - cam.y * z;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cw, ch);

        const under = layerFor('under', boil);
        if (under) {
            ctx.setTransform(z, 0, 0, z, ox, oy);
            ctx.drawImage(under, X0, Y0, BW, BH);
            scene.live(Pen(ctx, hash('sk2', 'live', boil)), t);
            ctx.globalCompositeOperation = 'source-over';
        }
        const over = layerFor('over', boil);
        if (over) {
            ctx.setTransform(z, 0, 0, z, ox, oy);
            ctx.drawImage(over, X0, Y0, BW, BH);
        }

        if (document.documentElement.classList.contains('night')) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0';
            ctx.fillRect(0, 0, cw, ch);
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
