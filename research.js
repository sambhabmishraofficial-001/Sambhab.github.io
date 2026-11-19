/**
 * Research & Experience — an open-air risograph scientific campus & botanical field,
 * completely distinct from the indoor studio on skills.html.
 * Features: GiGa Complex crop field & greenhouse arch, a domed biomedical pavilion
 * (ICMR-RMRC AMR diagnostics & Ravenshaw Prodigiosin/Violacein pigments), a rotating
 * 3D protein-folding sculpture (UCL/Sheffield), and an outdoor Riemann Zeta & Jensen chalkboard.
 */
(function () {
    'use strict';

    const canvas = document.getElementById('research-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const INK = { blue: [46, 70, 130], coral: [236, 100, 80], sun: [255, 204, 46], teal: [0, 138, 136] };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const SHIFT = { blue: [0.3, -0.2], coral: [-0.4, 0.3], sun: [0.25, 0.45], teal: [-0.3, -0.4] };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const GREEN = [['teal', 0.65], ['sun', 0.58]];
    const LEAF = [['teal', 0.48], ['sun', 0.82]];
    const SOIL = [['coral', 0.52], ['blue', 0.28]];
    const BRICK = [['coral', 0.62], ['sun', 0.28]];
    const STONE = [['sun', 0.28], ['coral', 0.12]];
    const GLASS = [['teal', 0.34], ['blue', 0.22]];
    const WOOD = [['coral', 0.44], ['sun', 0.46]];
    const SLATE = [['blue', 0.88], ['teal', 0.22]];
    const RED = [['coral', 0.92], ['blue', 0.15]];
    const VIOLET = [['blue', 0.64], ['coral', 0.62]];
    const WATER = [['teal', 0.55], ['blue', 0.25]];

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
        const R = rand(hash('rc', ink, level));
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
        return P;
    }

    const TW = 44, TH = 22, TZ = 24;
    const iso = (i, j, z = 0) => [(i - j) * TW / 2, (i + j) * TH / 2 - z * TZ];
    const flat = (i, j, z, w, d) => [iso(i, j, z), iso(i + w, j, z), iso(i + w, j + d, z), iso(i, j + d, z)];
    const faceL = (i, j, z, w, d, h) => [iso(i, j + d, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i, j + d, z + h)];
    const faceR = (i, j, z, w, d, h) => [iso(i + w, j, z), iso(i + w, j + d, z), iso(i + w, j + d, z + h), iso(i + w, j, z + h)];
    const onBack = (i0, i1, z0, z1, j = 0) => [iso(i0, j, z0), iso(i1, j, z0), iso(i1, j, z1), iso(i0, j, z1)];

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
    function blob(P, x, y, r, fills, R, o = {}) {
        const pts = [], n = 11;
        for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = r * (0.82 + R() * 0.28); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.squash ?? 0.9)]); }
        shape(P, pts, fills, { lw: o.lw ?? 0.82, shade: o.shade || 0 });
    }
    function limb(P, x0, y0, x1, y1, w0, w1, fills) {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        shape(P, [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], fills, { lw: 0.68, amp: 0.14 });
    }
    function walker(P, x, y, o = {}) {
        const s = o.s || 0.84, t = o.t || 0, walk = o.walk || false;
        const SKIN = [['coral', 0.22], ['sun', 0.2]];
        const PANTS = [['blue', 0.76]], SHIRT = o.shirt || [];
        P.dot(x, y + 1, 8 * s, 'blue', 0.2, 0.4);
        const hip = y - 13 * s, shY = hip - 11.5 * s, hy = shY - 5.8 * s;
        const step = walk ? Math.sin(t * 8) * 3.5 * s : 0;
        limb(P, x - 2 * s, hip, x - 2.4 * s + step, y, 2.2 * s, 1.4 * s, PANTS);
        limb(P, x + 2 * s, hip, x + 2.4 * s - step, y, 2.2 * s, 1.4 * s, PANTS);
        shape(P, [[x - 4.4 * s, hip + 1.2 * s], [x + 4.4 * s, hip + 1 * s], [x + 5.2 * s, shY + 1.4 * s], [x + 2.8 * s, shY], [x - 2.8 * s, shY], [x - 5.2 * s, shY + 1.4 * s]], SHIRT, { shade: 0.08, lw: 0.8 });
        if (o.labcoat) shape(P, [[x - 4.6 * s, hip], [x + 4.6 * s, hip], [x + 5.2 * s, hip + 6 * s], [x - 5.0 * s, hip + 6 * s]], [], { lw: 0.72 });
        limb(P, x, shY, x, hy + 3.8 * s, 1.7 * s, 1.5 * s, SKIN);
        const head = ellipse(x, hy, 4.1 * s, 4.8 * s, 12);
        P.knock(head); P.fill(head, 'coral', 0.22); P.fill(head, 'sun', 0.18); P.line(head, 0.8, 'blue', true, 0.14);
        const hair = [];
        for (let k = 0; k <= 8; k++) { const a = Math.PI + Math.PI * k / 8; hair.push([x + Math.cos(a) * 4.5 * s, hy - 0.7 * s + Math.sin(a) * 4.7 * s]); }
        shape(P, hair, [['blue', 0.9]], { lw: 0.6 });
        const sw = walk ? Math.sin(t * 8) * 3 * s : 0;
        limb(P, x - 4.6 * s, shY + 2 * s, x - 6.6 * s - sw, hip - 1 * s, 1.6 * s, 1.2 * s, SHIRT);
        limb(P, x + 4.6 * s, shY + 2 * s, x + 6.6 * s + sw, hip - 1 * s - (o.raise ? 7 * s : 0), 1.6 * s, 1.2 * s, SHIRT);
    }

    // ---------- Open-Air Research Campus & Botanical Field (16 x 10 grid, NO room walls!) ----------

    const W = 16, D = 10;

    const scene = {
        under(P, R) {
            // Open landscaped campus lawn with earthy cutaway soil rim
            block(P, 0, 0, -0.5, W, D, 0.5, SOIL, { top: GREEN });
            for (let n = 0; n < 340; n++) {
                const i = 0.2 + R() * (W - 0.4), j = 0.2 + R() * (D - 0.4);
                const [x, y] = iso(i, j, 0.01);
                P.line([[x, y], [x + (R() - 0.5) * 2, y - 2.2 - R() * 2]], 0.65, R() < 0.6 ? 'teal' : 'sun', false, 0.1);
            }

            // Winding stream separating the botanical field from the biomedical & math campus!
            shape(P, flat(4.6, 0, 0.02, 1.5, D), WATER, { lw: 0.8 });
            // Arched wooden footbridge connecting field to lab (j 5.6..7.2)
            block(P, 4.3, 5.7, 0.05, 2.1, 1.4, 0.16, WOOD, { lw: 0.8 });
            P.line([iso(4.3, 5.7, 0.21), iso(4.3, 5.7, 0.85), iso(6.4, 5.7, 0.85), iso(6.4, 5.7, 0.21)], 1.2, 'blue', false, 0.15);
            P.line([iso(4.3, 7.1, 0.21), iso(4.3, 7.1, 0.85), iso(6.4, 7.1, 0.85), iso(6.4, 7.1, 0.21)], 1.2, 'blue', false, 0.15);

            // Stone courtyard terrace on the right half (i 6.5..15.4, j 0.6..9.2)
            shape(P, flat(6.5, 0.8, 0.02, 8.9, 8.4), STONE, { lw: 0.8 });
            for (let n = 1; n < 8; n++) P.line([iso(6.5 + n * 1.1, 0.8, 0.02), iso(6.5 + n * 1.1, 9.2, 0.02)], 0.35, 'blue', false, 0.12);

            // ---- LEFT ISLAND: GIGA COMPLEX BOTANICAL FIELD & GREENHOUSE ARCH (i 0.6..4.0, j 1.2..8.6) ----
            // Three plowed soil beds with rows of lush crops (garlic/ginger natural biopesticide research)
            for (let row = 0; row < 3; row++) {
                const ri = 0.8 + row * 1.05;
                block(P, ri, 1.6, 0.02, 0.72, 5.6, 0.18, SOIL, { lw: 0.7 });
            }
            // Glass-and-wood greenhouse hoop arch over the back of the field
            for (const aj of [1.7, 3.0, 4.3]) {
                const arch = [];
                for (let k = 0; k <= 10; k++) {
                    const a = Math.PI * k / 10;
                    arch.push(iso(2.25 - Math.cos(a) * 1.65, aj, 0.2 + Math.sin(a) * 1.9));
                }
                P.line(arch, 1.4, 'blue', false, 0.2);
            }
            P.line([iso(2.25, 1.7, 2.1), iso(2.25, 4.3, 2.1)], 1.2, 'blue', false, 0.15);
            // Botanical extract table in front of the plot
            block(P, 1.1, 7.7, 0.02, 2.4, 0.9, 0.72, WOOD);
            cyl(P, 1.6, 8.15, 0.74, 0.16, 0.32, [['sun', 0.85]]); // ginger extract
            cyl(P, 2.3, 8.15, 0.74, 0.16, 0.32, [['teal', 0.65]]); // garlic allicin

            // ---- CENTER: DOMED BIOMEDICAL PAVILION (ICMR-RMRC AMR + Ravenshaw Pigments + BCDS) ----
            // Warm brick circular/octagonal drum with arched glass windows
            cyl(P, 9.5, 3.2, 0.02, 2.15, 2.1, BRICK, { cap: STONE });
            // Glass skylight dome atop the biomedical pavilion!
            const [dx, dy] = iso(9.5, 3.2, 2.12);
            const rx = 2.0 * 1.414 * TW / 2, ry = rx * TH / TW, hd = 42;
            const dome = [];
            for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; dome.push([dx + Math.cos(a) * rx, dy + Math.sin(a) * ry]); }
            for (let k = 0; k <= 16; k++) { const a = Math.PI - Math.PI * k / 16; dome.push([dx + Math.cos(a) * rx, dy - Math.sin(a) * hd]); }
            shape(P, dome, GLASS, { shade: 0.08, lw: 1.0 });
            for (const sx of [-0.72, -0.35, 0, 0.35, 0.72]) {
                const rib = [];
                for (let u = 0; u <= 8; u++) {
                    const a = u / 8 * Math.PI / 2;
                    rib.push([dx + rx * sx * Math.cos(a), dy + ry * Math.sqrt(1 - sx * sx) * Math.cos(a) - hd * Math.sin(a)]);
                }
                P.line(rib, 0.75, 'blue', false, 0.1);
            }
            // Outdoor AMR & Bacterial Pigment chromatography bench right outside the pavilion (i 7.4..11.0, j 6.2..7.5)
            block(P, 7.5, 6.4, 0.02, 3.4, 1.15, 0.8, [['blue', 0.12]], { top: [['sun', 0.12]] });
            cyl(P, 8.1, 6.95, 0.82, 0.22, 0.36, RED);    // Prodigiosin
            cyl(P, 8.8, 6.95, 0.82, 0.22, 0.36, VIOLET); // Violacein
            // Rapid AMR lateral-flow diagnostic tray (neev.bio)
            shape(P, flat(9.35, 6.65, 0.83, 1.3, 0.65), [], { lw: 0.65 });
            for (let k = 0; k < 3; k++) shape(P, flat(9.48 + k * 0.38, 6.74, 0.84, 0.22, 0.46), [['teal', 0.2]], { lw: 0.5 });

            // ---- RIGHT TERRACE: OUTDOOR PURE MATH CHALKBOARD & 3D PROTEIN SCULPTURE ----
            // Freestanding slate chalkboard on wooden easel legs (i 12.2..15.0, j 1.8)
            for (const ci of [12.5, 14.7]) P.line([iso(ci, 1.8, 0.02), iso(ci, 1.8, 2.7)], 1.7, 'blue', false, 0.12);
            shape(P, onBack(12.25, 14.95, 0.95, 2.75, 1.8), SLATE, { lw: 1.3 });
            // Riemann Zeta critical strip + zeros
            P.chalk([iso(12.7, 1.82, 1.15), iso(12.7, 1.82, 2.5)], 0.9);
            P.chalk([iso(13.05, 1.82, 1.15), iso(13.05, 1.82, 2.5)], 1.2);
            P.chalk([iso(13.4, 1.82, 1.15), iso(13.4, 1.82, 2.5)], 0.9);
            for (let k = 0; k < 5; k++) P.dot(...iso(13.05, 1.83, 1.32 + k * 0.25), 1.7, 'sun', 1);
            // Convex curve + chord (Jensen's Inequality)
            const jc = [];
            for (let k = 0; k <= 8; k++) { const u = k / 4 - 1; jc.push(iso(14.25 + u * 0.52, 1.82, 1.45 + u * u * 0.78)); }
            P.chalk(jc, 1.35);
            P.chalk([iso(13.8, 1.82, 2.02), iso(14.7, 1.82, 2.06)], 0.95);

            // Stone pedestal in the front-right courtyard for the rotating 3D AlphaFold protein sculpture!
            cyl(P, 13.4, 6.2, 0.02, 0.95, 0.65, STONE, { cap: [['sun', 0.35]] });
        },

        live(P, t) {
            // 1. Swaying green crops in the GiGa Complex field!
            for (let row = 0; row < 3; row++) {
                for (let k = 0; k < 5; k++) {
                    const pi = 1.15 + row * 1.05, pj = 2.0 + k * 1.05;
                    const [sx, sy] = iso(pi, pj, 0.2);
                    const sw = Math.sin(t * 2.2 + row + k * 0.7) * 2.8;
                    P.line([[sx, sy], [sx + sw, sy - 16]], 1.4, 'teal', false, 0.15);
                    shape(P, [[sx + sw, sy - 11], [sx + sw - 6, sy - 15], [sx + sw - 1, sy - 18]], GREEN, { lw: 0.5 });
                    shape(P, [[sx + sw, sy - 12], [sx + sw + 6, sy - 16], [sx + sw + 1, sy - 19]], LEAF, { lw: 0.5 });
                }
            }

            // 2. Flowing ripples down the campus stream
            for (let k = 0; k < 5; k++) {
                const sj = (t * 0.9 + k * 2) % (D - 0.5);
                P.chalk([iso(5.1 + (k % 2) * 0.4, sj, 0.04), iso(5.1 + (k % 2) * 0.4, sj + 0.55, 0.04)], 1.1);
            }

            // 3. Bubbling Prodigiosin & Violacein flasks + researcher crossing the footbridge!
            for (const [fi, ink] of [[8.1, 'coral'], [8.8, 'blue']]) {
                const ph = (t * 0.65) % 1;
                const [bx, by] = iso(fi + Math.sin(t * 3) * 0.03, 6.95, 1.25 + ph * 0.55);
                if (ph < 0.85) shape(P, circle(bx, by, 1.4 + (1 - ph) * 1.4, 8), [[ink, 0.28]], { lw: 0.5, amp: 0.06 });
            }
            // Researcher walking smoothly back and forth across the bridge between field and biomedical pavilion
            const w = (Math.sin(t * 0.45) + 1) / 2;
            const [wx, wy] = iso(lerp(3.6, 7.4, w), 6.4, w > 0.2 && w < 0.75 ? 0.22 : 0.02);
            walker(P, wx, wy, { t, walk: true, labcoat: true, s: 0.88 });

            // Mathematician standing by the outdoor Riemann Zeta chalkboard
            const [mx, my] = iso(13.3, 3.0, 0.02);
            walker(P, mx, my, { t, raise: true, shirt: [['sun', 0.8]], s: 0.88 });
            const ju = Math.sin(t * 0.9) * 0.5;
            P.dot(...iso(14.25 + ju * 0.52, 1.84, 1.45 + ju * ju * 0.78), 2.3, 'coral', 1);

            // 4. Giant rotating 3D AlphaFold / PyMOL protein double-helix sculpture over the stone pedestal!
            const ptsA = [], ptsB = [];
            for (let k = 0; k < 14; k++) {
                const u = k / 13;
                const ang = t * 1.8 + u * 6.5;
                const r = 0.58;
                const z = 0.95 + u * 2.15;
                ptsA.push(iso(13.4 + Math.cos(ang) * r, 6.2 + Math.sin(ang) * r, z));
                ptsB.push(iso(13.4 - Math.cos(ang) * r, 6.2 - Math.sin(ang) * r, z));
            }
            for (let k = 0; k < 14; k += 2) P.line([ptsA[k], ptsB[k]], 1.0, 'sun', false, 0.06);
            P.line(ptsA, 2.2, 'teal', false, 0.12);
            P.line(ptsB, 2.2, 'coral', false, 0.12);
            for (let k = 0; k < 14; k++) {
                P.dot(ptsA[k][0], ptsA[k][1], 2.2, 'teal', 0.95);
                P.dot(ptsB[k][0], ptsB[k][1], 2.2, 'coral', 0.95);
            }
        },

        over(P, R) {
            // Two leafy campus trees framing the back-left and front-right corners
            for (const [ti, tj, rad] of [[15.1, 8.3, 24], [0.8, 0.9, 22]]) {
                cyl(P, ti, tj, 0, 0.16, 1.45, WOOD, { lw: 0.75 });
                const [cx, cy] = iso(ti, tj, 2.05);
                for (const [dx, dy, r] of [[0, 0, rad], [-rad * 0.65, rad * 0.25, rad * 0.68], [rad * 0.65, rad * 0.2, rad * 0.68], [0, -rad * 0.55, rad * 0.62]]) {
                    blob(P, cx + dx, cy + dy, r, R() < 0.5 ? GREEN : LEAF, R, { shade: 0.08 });
                }
            }
        }
    };

    const corners = [];
    for (const i of [-0.3, W + 0.3]) for (const j of [-0.3, D + 0.3]) for (const z of [-0.5, 4.4]) corners.push(iso(i, j, z));
    const X0 = Math.min(...corners.map(p => p[0])) - 14, X1 = Math.max(...corners.map(p => p[0])) + 14;
    const Y0 = Math.min(...corners.map(p => p[1])) - 14, Y1 = Math.max(...corners.map(p => p[1])) + 14;
    const BW = X1 - X0, BH = Y1 - Y0;
    canvas.style.aspectRatio = `${BW} / ${BH}`;

    let scale = 1, layers = new Map();
    function renderLayer(layer, variant) {
        const cv = document.createElement('canvas');
        cv.width = canvas.width; cv.height = canvas.height;
        const c = cv.getContext('2d');
        c.setTransform(scale, 0, 0, scale, -X0 * scale, -Y0 * scale);
        scene[layer](Pen(c, hash('rc', layer, variant)), rand(hash('rc', 'layout', layer)));
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
        scale = (w * dpr) / BW;
        canvas.width = Math.round(BW * scale); canvas.height = Math.round(BH * scale);
        layers = new Map();
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(now) {
        const t = reducedMotion ? 2 : now / 1000;
        const boil = reducedMotion ? 0 : Math.floor(t * 4) % 3;
        budget = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const under = layerFor('under', boil);
        if (under) ctx.drawImage(under, 0, 0);
        if (under) {
            ctx.setTransform(scale, 0, 0, scale, -X0 * scale, -Y0 * scale);
            scene.live(Pen(ctx, hash('rc', 'live', boil)), t);
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
        }
        const over = layerFor('over', boil);
        if (over) ctx.drawImage(over, 0, 0);

        if (document.documentElement.classList.contains('night')) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }
    }
    let last = 0;
    function frame(now) { requestAnimationFrame(frame); if (now - last < 33) return; last = now; draw(now); }
    requestAnimationFrame(frame);
})();
