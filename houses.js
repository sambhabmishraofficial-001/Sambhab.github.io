/**
 * Paper Rooms - an original risograph-style isometric animation.
 * Six rooms: lab, library, garden, football, arcade, observatory.
 */

(function () {
'use strict';

    const canvas = document.getElementById('bg-houses');
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
    const ORANGE = [['coral', 0.6], ['sun', 0.7]];
    const RED = [['coral', 0.9], ['blue', 0.2]];
    const PURPLE = [['blue', 0.45], ['coral', 0.5]];
    const WOOD = [['coral', 0.45], ['sun', 0.45]];
    const NIGHT = [['blue', 0.85], ['teal', 0.2]];
    const BOOKS = [[['coral', 0.85]], [['sun', 0.9]], [['teal', 0.8]], [['blue', 0.6]], ORANGE, GREEN, PURPLE, [['coral', 0.5]], [['teal', 0.45]], [['blue', 0.35]]];

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

        P.chalk = (pts, w = 1.6, closed = false) => {
            const q = wobble(pts, closed, 0.3);
            c.save();
            c.globalCompositeOperation = 'source-over';
            c.strokeStyle = '#fff';
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
    const W = 8, D = 8, H = 3, PITCH = 12.2;

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

    function floorRing(i, j, z, r, n = 24) {
        const pts = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU;
            pts.push(iso(i + Math.cos(a) * r, j + Math.sin(a) * r, z));
        }
        return pts;
    }

    function backRing(i, z, r, n = 20, j = 0) {
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

    function plant(P, i, j, R, size = 1) {
        cyl(P, i, j, 0, 0.32 * size, 0.55 * size, [['coral', 0.65]]);
        const [x, y] = iso(i, j, 0.55 * size);
        for (let k = 0; k < 6; k++) {
            const a = -Math.PI / 2 + (k - 2.5) * 0.45;
            const L = (14 + R() * 8) * size;
            const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L];
            const mid = [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5];
            const nx = -Math.sin(a) * 5 * size, ny = Math.cos(a) * 5 * size;
            shape(P, [[x, y], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], k % 2 ? GREEN : LEAF, { lw: 0.7 });
        }
    }

    function figure(P, x, y, o = {}) {
        const s = o.s || 1, t = o.t || 0, pose = o.pose || 'stand';
        P.dot(x, y, 8 * s, 'blue', 0.22, 0.4);
        const sit = pose === 'sit';
        const step = pose === 'walk' ? Math.sin(t * 9) * 3.2 * s : 0;
        const kick = pose === 'kick' ? Math.max(0, Math.sin(o.k || 0)) * 7 * s : 0;
        const hip = y - (sit ? 9 : 13) * s, neck = hip - 12 * s, hy = neck - 5.5 * s;
        if (sit) {
            P.line([[x - 2.5 * s, hip], [x + 3 * s, hip + 2 * s], [x + 3 * s, y]], 3 * s, 'blue', false, 0.15);
            P.line([[x + 1.5 * s, hip], [x + 7 * s, hip + 2 * s], [x + 7 * s, y - 1 * s]], 3 * s, 'blue', false, 0.15);
        } else {
            P.line([[x - 2 * s, hip], [x - 2 * s + step, y]], 3 * s, 'blue', false, 0.15);
            P.line([[x + 2 * s, hip], [x + 2 * s - step + kick, y - kick * 0.5]], 3 * s, 'blue', false, 0.15);
        }
        const body = [[x - 5 * s, hip + 1 * s], [x + 5 * s, hip + 1 * s], [x + 4.2 * s, neck], [x - 4.2 * s, neck]];
        shape(P, body, o.shirt || [['coral', 0.8]], { shade: 0.08, lw: 0.9 });
        const reach = pose === 'reach' ? (Math.sin(t * 3) * 0.5 + 0.5) * 6 * s : 0;
        const swing = step * 0.6;
        P.line([[x - 4.4 * s, neck + 1.5 * s], [x - 6.5 * s - swing, hip - 1 * s - (o.armsUp ? 10 * s : 0)]], 2.2 * s, 'blue', false, 0.15);
        P.line([[x + 4.4 * s, neck + 1.5 * s], [x + 7 * s + swing, hip - 1 * s - reach - (o.armsUp ? 10 * s : 0)]], 2.2 * s, 'blue', false, 0.15);
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
        P.dot(x + 2.5 * s, hy + 1.6 * s, 1.1 * s, 'coral', 0.7);
    }

    function shell(P, wall, floor, o = {}) {
        block(P, 0, 0, -0.4, W, D, 0.4, [['blue', 0.15]], { top: floor });
        block(P, -0.3, -0.3, 0, 0.3, D + 0.3, H, wall, { shade: 0.9 });
        block(P, 0, -0.3, 0, W, 0.3, H, wall, { shade: 0.5 });
        if (o.skirting !== false) {
            P.line([iso(0, 0.02, 0.25), iso(W, 0.02, 0.25)], 1, 'blue');
            P.line([iso(0.02, 0, 0.25), iso(0.02, D, 0.25)], 1, 'blue');
        }
    }

    function lamp(P, i, j, z, t, phase, ink = 'sun') {
        const flick = 0.3 + 0.06 * Math.sin(t * 1.7 + phase) + 0.03 * Math.sin(t * 11 + phase);
        const [fx, fy] = iso(i, j, 0);
        P.pool(fx, fy, 95, ink, flick);
        P.line([iso(i, j, H + 0.8), iso(i, j, z + 0.45)], 1, 'blue', false, 0.2);
        const [x, y] = iso(i, j, z);
        shape(P, [[x - 4, y - 12], [x + 4, y - 12], [x + 12, y], [x - 12, y]], [[ink, 0.85]], { lw: 0.9 });
        P.dot(x, y + 1, 4, ink, 0.5, 0.5);
    }

    // ---------- Room 1: microbiology lab ----------

    const lab = {
        id: 'lab',
        under(P, R) {
            shell(P, [['teal', 0.45]], [['sun', 0.18]]);
            for (let a = 0; a < W; a++) for (let b = 0; b < D; b++) if ((a + b) % 2) P.fill(flat(a, b, 0, 1, 1), 'teal', 0.22);
            for (let n = 1; n < W; n++) {
                P.line([iso(n, 0, 0), iso(n, D, 0)], 0.5, 'blue', false, 0.2);
                P.line([iso(0, n, 0), iso(W, n, 0)], 0.5, 'blue', false, 0.2);
            }

            shape(P, onBack(1.4, 3.6, 1.25, 2.75), [['teal', 0.15], ['sun', 0.08]]);
            shape(P, backRing(2.1, 2.35, 0.3, 12), [['sun', 0.2]], { lw: 0.5 });
            P.line([iso(2.5, 0, 1.25), iso(2.5, 0, 2.75)], 1.8);
            P.line([iso(1.4, 0, 2.0), iso(3.6, 0, 2.0)], 1.8);
            shape(P, onBack(1.25, 3.75, 1.1, 1.25), [['blue', 0.2]]);

            shape(P, onBack(4.4, 6.4, 1.3, 2.75), [['coral', 0.18]]);
            for (let k = 0; k < 6; k++) {
                const ink = pick(R, ['teal', 'coral', 'sun', 'blue']);
                shape(P, backRing(4.8 + R() * 1.2, 1.6 + R() * 0.85, 0.12 + R() * 0.1, 12), [[ink, 0.75]], { lw: 0.6 });
            }

            shape(P, onLeft(1.0, 3.4, 1.3, 2.75), [['sun', 0.25]]);
            for (let a = 0; a < 6; a++) for (let b = 0; b < 3; b++) {
                if (b === 0 && a > 0 && a < 5) continue;
                const j0 = 1.15 + a * 0.37, z0 = 2.6 - b * 0.42;
                shape(P, onLeft(j0, j0 + 0.32, z0 - 0.36, z0), pick(R, BOOKS), { lw: 0.5, amp: 0.2 });
            }

            block(P, 0, 4.4, 1.9, 0.6, 3.0, 0.1, WOOD);
            for (let k = 0; k < 5; k++) cyl(P, 0.3, 4.75 + k * 0.55, 2.0, 0.17, 0.4 + R() * 0.2, [[pick(R, ['teal', 'coral', 'sun']), 0.55]]);

            block(P, 1.7, 0.15, 0, 6.0, 1.3, 0.85, [['blue', 0.12]], { top: [['blue', 0.06]] });
            for (let k = 0; k < 4; k++) {
                const i0 = 1.9 + k * 1.5;
                shape(P, onBack(i0, i0 + 1.3, 0.1, 0.7, 1.45), [['teal', 0.2]], { lw: 0.6 });
                P.dot(...iso(i0 + 1.1, 1.45, 0.45), 1.2, 'blue', 0.9);
            }

            block(P, 2.1, 0.45, 0.85, 0.6, 0.6, 0.1, [['blue', 0.7]]);
            block(P, 2.3, 0.55, 0.95, 0.18, 0.22, 0.75, [['blue', 0.6]]);
            block(P, 2.15, 0.5, 1.6, 0.5, 0.4, 0.22, [['blue', 0.45], ['teal', 0.3]]);
            block(P, 2.32, 0.62, 1.82, 0.14, 0.14, 0.3, [['blue', 0.7]]);
            for (const [pi, pj, f] of [[3.3, 1.0, [['coral', 0.35]]], [3.9, 0.7, [['sun', 0.4]]], [3.7, 1.25, [['teal', 0.3]]]]) {
                cyl(P, pi, pj, 0.85, 0.24, 0.05, f, { lw: 0.6 });
                for (let k = 0; k < 4; k++) {
                    const [x, y] = iso(pi + (R() - 0.5) * 0.25, pj + (R() - 0.5) * 0.25, 0.9);
                    P.dot(x, y, 1.4, 'coral', 0.8);
                }
            }
            for (let k = 0; k < 3; k++) {
                const fi = 4.9 + k * 0.7;
                cyl(P, fi, 0.75, 0.85, 0.2, 0.32, [[['sun', 'coral', 'teal'][k], 0.55]]);
                cyl(P, fi, 0.75, 1.17, 0.12, 0.25, [], { cap: [['blue', 0.15]] });
                cyl(P, fi, 0.75, 1.42, 0.06, 0.4, [], { cap: [['blue', 0.15]] });
            }
            cyl(P, 7.1, 0.85, 0.85, 0.33, 0.38, [['blue', 0.3]], { cap: [['teal', 0.3]] });

            block(P, 0.05, 1.9, 0, 1.25, 1.4, 2.0, [['coral', 0.35]]);
            shape(P, onBack(0.25, 1.1, 0.8, 1.7, 3.3), [['teal', 0.25]], { lw: 0.8 });
            for (let k = 1; k < 3; k++) P.line([iso(0.25, 3.3, 0.8 + k * 0.3), iso(1.1, 3.3, 0.8 + k * 0.3)], 0.6);
            shape(P, onBack(0.3, 1.0, 0.25, 0.55, 3.3), [['sun', 0.6]], { lw: 0.6 });
        },
        live(P, t) {
            for (let k = 0; k < 3; k++) {
                const fi = 4.9 + k * 0.7;
                for (let b = 0; b < 3; b++) {
                    const ph = (t * 0.55 + b / 3 + k * 0.21) % 1;
                    const [x, y] = iso(fi + Math.sin(t * 3 + b + k) * 0.03, 0.75, 1.2 + ph * 0.9);
                    if (ph < 0.85) shape(P, circle(x, y, 1.2 + (1 - ph) * 1.6, 8), [['teal', 0.12]], { lw: 0.6, amp: 0.1 });
                }
            }
            const blink = Math.sin(t * 6) > 0;
            P.dot(...iso(7.1, 1.2, 1.25), 1.8, blink ? 'coral' : 'sun', 1);
            lamp(P, 4.6, 3.6, 2.8, t, 0);
            const [fx, fy] = iso(3.4, 2.3, 0);
            figure(P, fx, fy, { t, pose: 'reach', shirt: [], hair: [['blue', 0.9]] });
            const [gx, gy] = iso(5.2, 4.8, 0);
            figure(P, gx + Math.sin(t * 0.4) * 30, gy + Math.sin(t * 0.4) * 15, { t, pose: 'walk', shirt: [['teal', 0.7]], hair: [['coral', 0.6], ['sun', 0.6]] });
        },
        over(P, R) {
            cyl(P, 3.8, 3.4, 0, 0.28, 0.75, [['coral', 0.6]]);
            block(P, 5.8, 5.7, 0, 1.4, 0.9, 0.95, [['sun', 0.55]]);
            for (let k = 0; k < 3; k++) cyl(P, 6.1 + k * 0.4, 6.1, 0.95, 0.12, 0.3, [[pick(R, ['teal', 'coral']), 0.5]]);
            plant(P, 1.0, 6.8, R, 1.2);
        }
    };

    // ---------- Room 2: library ----------

    const library = {
        id: 'library',
        under(P, R) {
            shell(P, [['blue', 0.3], ['teal', 0.12]], WOOD);
            for (let n = 1; n < D * 2; n++) P.line([iso(0, n / 2, 0), iso(W, n / 2, 0)], 0.45, 'blue', false, 0.2);
            for (let n = 0; n < 40; n++) {
                const i = R() * W, j = Math.floor(R() * D * 2) / 2;
                P.line([iso(i, j, 0), iso(i, j + 0.5, 0)], 0.45, 'blue', false, 0.1);
            }

            const shelfFill = [['coral', 0.5], ['blue', 0.25]];
            block(P, 0.2, 0, 0, 7.6, 0.7, 2.75, shelfFill);
            for (let row = 0; row < 4; row++) {
                const z0 = 0.15 + row * 0.65;
                P.line([iso(0.2, 0.71, z0), iso(7.8, 0.71, z0)], 1.2);
                let i = 0.35;
                while (i < 7.6) {
                    const w = 0.1 + R() * 0.12, h = 0.38 + R() * 0.18;
                    if (i + w > 7.65) break;
                    if (R() < 0.06) { i += 0.25; continue; }
                    shape(P, onBack(i, i + w, z0, z0 + h, 0.71), pick(R, BOOKS), { lw: 0.5, amp: 0.15 });
                    i += w + 0.015;
                }
            }

            block(P, 0, 1.1, 0, 0.7, 5.6, 2.75, shelfFill);
            for (let row = 0; row < 4; row++) {
                const z0 = 0.15 + row * 0.65;
                P.line([iso(0.71, 1.1, z0), iso(0.71, 6.7, z0)], 1.2);
                let j = 1.25;
                while (j < 6.6) {
                    const w = 0.1 + R() * 0.12, h = 0.38 + R() * 0.18;
                    if (j + w > 6.65) break;
                    if (R() < 0.06) { j += 0.25; continue; }
                    shape(P, onLeft(j, j + w, z0, z0 + h, 0.71), pick(R, BOOKS), { lw: 0.5, amp: 0.15 });
                    j += w + 0.015;
                }
            }

            P.line([iso(6.1, 1.7, 0), iso(6.1, 0.75, 2.9)], 1.6);
            P.line([iso(6.7, 1.7, 0), iso(6.7, 0.75, 2.9)], 1.6);
            for (let k = 1; k < 7; k++) {
                const f = k / 7;
                P.line([iso(6.1, lerp(1.7, 0.75, f), 2.9 * f), iso(6.7, lerp(1.7, 0.75, f), 2.9 * f)], 1.1);
            }

            shape(P, flat(2.1, 2.5, 0.01, 4.6, 3.4), [['teal', 0.45]]);
            P.line(flat(2.4, 2.8, 0.01, 4.0, 2.8), 0.8, 'sun', true);

            for (const [li, lj] of [[2.75, 3.15], [5.95, 3.15], [2.75, 4.35], [5.95, 4.35]]) block(P, li, lj, 0, 0.14, 0.14, 0.72, WOOD, { lw: 0.7 });
            block(P, 2.6, 3.0, 0.72, 3.6, 1.6, 0.12, WOOD, { top: [['coral', 0.3], ['sun', 0.45]] });
            block(P, 3.0, 3.25, 0.84, 0.55, 0.4, 0.1, [['coral', 0.75]], { lw: 0.6 });
            block(P, 3.05, 3.28, 0.94, 0.5, 0.36, 0.08, [['teal', 0.7]], { lw: 0.6 });
            const [ox, oy] = iso(4.8, 3.6, 0.85);
            shape(P, [[ox - 12, oy], [ox, oy - 4], [ox, oy + 4], [ox - 12, oy + 8]], [], { lw: 0.6 });
            shape(P, [[ox + 12, oy], [ox, oy - 4], [ox, oy + 4], [ox + 12, oy + 8]], [], { lw: 0.6 });
            cyl(P, 3.9, 3.3, 0.84, 0.12, 0.05, [['sun', 0.7]], { lw: 0.6 });
            block(P, 3.88, 3.28, 0.89, 0.04, 0.04, 0.5, [['sun', 0.7]], { lw: 0.5 });
            cyl(P, 5.6, 3.3, 0.84, 0.12, 0.05, [['sun', 0.7]], { lw: 0.6 });
            block(P, 5.58, 3.28, 0.89, 0.04, 0.04, 0.5, [['sun', 0.7]], { lw: 0.5 });

            cyl(P, 1.8, 1.7, 0, 0.15, 0.9, WOOD);
            const [gx, gy] = iso(1.8, 1.7, 1.25);
            shape(P, circle(gx, gy, 10), [['teal', 0.5], ['blue', 0.15]]);
            blob(P, gx - 3, gy - 2, 4, [['sun', 0.6], ['coral', 0.3]], R, { lw: 0.5 });
            blob(P, gx + 4, gy + 3, 3, [['sun', 0.6], ['coral', 0.3]], R, { lw: 0.5 });
        },
        live(P, t) {
            for (const [li, ph] of [[3.9, 0], [5.6, 2]]) {
                const [x, y] = iso(li, 3.3, 1.42);
                const [fx, fy] = iso(li, 3.9, 0.84);
                P.pool(fx, fy, 50, 'sun', 0.3 + 0.05 * Math.sin(t * 1.3 + ph));
                shape(P, [[x - 7, y + 3], [x + 7, y + 3], [x + 4, y - 3], [x - 4, y - 3]], GREEN, { lw: 0.7 });
            }
            const [sx, sy] = iso(4.1, 4.9, 0);
            block(P, 3.85, 4.75, 0, 0.5, 0.5, 0.55, WOOD, { lw: 0.7 });
            figure(P, sx, sy - 2, { t, pose: 'sit', shirt: [['sun', 0.8]], hair: [['coral', 0.7], ['blue', 0.3]] });
            const flip = (t * 0.5) % 1;
            if (flip < 0.3) {
                const [ox, oy] = iso(4.8, 3.6, 0.85);
                const a = flip / 0.3 * Math.PI;
                const px = ox + Math.cos(a) * 12, py = oy - Math.sin(a) * 9;
                shape(P, [[ox, oy - 4], [px, py - 2], [px, py + 6], [ox, oy + 4]], [], { lw: 0.6 });
            }
            const walk = (Math.sin(t * 0.35) + 1) / 2;
            const [wx, wy] = iso(lerp(2.8, 5.3, walk), 6.0, 0);
            figure(P, wx, wy, { t, pose: 'walk', shirt: [['teal', 0.75]], hair: [['blue', 0.85]] });
        },
        over(P, R) {
            block(P, 1.0, 5.6, 0, 1.3, 1.25, 0.55, RED);
            block(P, 1.0, 5.6, 0.55, 0.3, 1.25, 0.8, RED);
            block(P, 1.3, 5.6, 0.55, 1.0, 0.25, 0.3, RED);
            block(P, 1.3, 6.6, 0.55, 1.0, 0.25, 0.3, RED);
            block(P, 5.9, 6.2, 0, 1.4, 0.8, 0.9, [['teal', 0.55]]);
            let i = 6.0;
            while (i < 7.2) {
                const w = 0.12 + R() * 0.1, h = 0.35 + R() * 0.2;
                block(P, i, 6.4, 0.9, w, 0.4, h, pick(R, BOOKS), { lw: 0.5, shade: 0.6 });
                i += w + 0.02;
            }
            plant(P, 7.3, 1.6, R, 1.0);
        }
    };

    // ---------- Room 3: garden ----------

    const garden = {
        id: 'garden',
        padL: 60,
        under(P, R) {
            const L = -3.5;
            block(P, L, 0, -0.4, W - L, D, 0.4, [['coral', 0.4], ['sun', 0.3]], { top: [['teal', 0.5], ['sun', 0.55]] });
            for (let n = 0; n < 460; n++) {
                const [x, y] = iso(L + R() * (W - L), R() * D, 0);
                P.line([[x, y], [x + (R() - 0.5) * 2, y - 2.5 - R() * 2]], 0.7, R() < 0.6 ? 'teal' : 'sun', false, 0.1);
            }
            block(P, L, -0.3, 0, W - L, 0.3, 2.4, [['coral', 0.6], ['sun', 0.25]], { shade: 0.5 });
            for (let row = 0; row < 8; row++) {
                const z = row * 0.3;
                P.line([iso(L, 0, z), iso(W, 0, z)], 0.6, 'blue', false, 0.2);
                for (let b = L + (row % 2) * 0.4; b < W; b += 0.8) P.line([iso(b, 0, z), iso(b, 0, z + 0.3)], 0.6, 'blue', false, 0.1);
            }
            block(P, -0.3, -0.3, 0, 0.6, D + 0.3, 1.1, GREEN, { shade: 0.6 });
            for (let n = 0; n < 40; n++) {
                const [x, y] = iso(0.3, R() * D, 0.3 + R() * 0.8);
                P.dot(x, y, 2.2, R() < 0.5 ? 'sun' : 'teal', 0.9);
            }

            block(P, 0.6, 0.1, 0, 4.2, 0.9, 0.35, [['coral', 0.5], ['blue', 0.2]]);
            for (let n = 0; n < 16; n++) {
                const fi = 0.8 + R() * 3.8, fj = 0.25 + R() * 0.6;
                const [x, y] = iso(fi, fj, 0.35);
                P.line([[x, y], [x, y - 9 - R() * 6]], 0.9, 'teal', false, 0.2);
                shape(P, circle(x, y - 12 - R() * 4, 3, 8), [[pick(R, ['coral', 'sun']), 0.85]], { lw: 0.5 });
            }

            for (let k = 0; k < 7; k++) {
                const [x, y] = iso(7.2 - k * 0.65, 6.6 - k * 0.45, 0.01);
                shape(P, ellipse(x, y, 9, 4.5, 10), [['blue', 0.15], ['sun', 0.15]], { lw: 0.7 });
            }

            shape(P, floorRing(5.7, 2.9, 0.01, 1.45, 26), [['teal', 0.55], ['blue', 0.3]]);
            for (let k = 0; k < 14; k++) {
                const a = k / 14 * TAU;
                const [x, y] = iso(5.7 + Math.cos(a) * 1.55, 2.9 + Math.sin(a) * 1.55, 0.02);
                blob(P, x, y, 4.5, [['blue', 0.2]], R, { lw: 0.6, squash: 0.6 });
            }
            const [lx, ly] = iso(5.3, 2.6, 0.03);
            shape(P, ellipse(lx, ly, 7, 3, 10), GREEN, { lw: 0.6 });

            cyl(P, 2.4, 2.6, 0, 0.32, 2.6, [['coral', 0.55], ['blue', 0.35]]);
            P.line([iso(2.4, 2.6, 2.2), iso(4.0, 3.6, 3.0)], 5, 'blue', false, 0.3);
            P.line([iso(2.4, 2.6, 2.4), iso(1.2, 1.8, 3.1)], 4, 'blue', false, 0.3);

            for (const li of [6.1, 7.4]) block(P, li, 5.5, 0, 0.12, 0.4, 0.45, WOOD, { lw: 0.6 });
            block(P, 6.0, 5.4, 0.45, 1.6, 0.6, 0.12, WOOD);
        },
        live(P, t) {
            for (let k = 0; k < 3; k++) {
                const ph = (t * 0.35 + k / 3) % 1;
                ctxAlpha(P, 1 - ph, () => P.line(floorRing(5.9, 3.1, 0.02, 0.2 + ph * 1.1, 22), 0.8, 'blue', true, 0.15));
            }
            const a = Math.sin(t * 1.5) * 0.55;
            const pivot = [4.0, 3.6, 3.0];
            const seat = [pivot[0] + Math.sin(a) * 2.1, pivot[1], pivot[2] - Math.cos(a) * 2.1];
            const [shx, shy] = iso(seat[0], seat[1], 0);
            P.dot(shx, shy + 2, 10, 'blue', 0.2, 0.4);
            for (const dj of [-0.3, 0.3]) P.line([iso(pivot[0], pivot[1] + dj, pivot[2]), iso(seat[0], seat[1] + dj, seat[2])], 0.9, 'blue', false, 0.15);
            const [sx, sy] = iso(seat[0], seat[1], seat[2]);
            figure(P, sx - 3, sy + 1, { t, pose: 'sit', s: 0.85, shirt: [['coral', 0.85]], hair: [['sun', 0.8], ['coral', 0.4]] });
            shape(P, flat(seat[0] - 0.3, seat[1] - 0.35, seat[2], 0.6, 0.7), WOOD, { lw: 0.7 });
            for (let b = 0; b < 2; b++) {
                const bx = 3 + Math.sin(t * 0.6 + b * 2) * 2.5, by = 5 + Math.cos(t * 0.45 + b) * 1.8;
                const [x, y] = iso(bx, by, 1.6 + Math.sin(t * 2 + b) * 0.4);
                const f = Math.abs(Math.sin(t * 14 + b));
                shape(P, [[x, y], [x - 5 * f, y - 5], [x - 6 * f, y + 1]], [[b ? 'coral' : 'sun', 0.85]], { lw: 0.5, amp: 0.1 });
                shape(P, [[x, y], [x + 5 * f, y - 5], [x + 6 * f, y + 1]], [[b ? 'coral' : 'sun', 0.85]], { lw: 0.5, amp: 0.1 });
            }
            const [gx, gy] = iso(6.6, 5.6, 0.57);
            figure(P, gx, gy - 4, { t, pose: 'sit', shirt: [['blue', 0.5]], hair: [['blue', 0.3]] });
        },
        over(P, R) {
            const [cx, cy] = iso(2.4, 2.6, 3.3);
            const blobs = [[0, 0, 38], [-30, 10, 28], [30, 8, 30], [-12, -24, 28], [18, -22, 26], [0, 22, 26], [-40, -6, 20], [42, -8, 20]];
            for (const [dx, dy, r] of blobs) blob(P, cx + dx, cy + dy, r, R() < 0.5 ? GREEN : LEAF, R, { shade: 0.08 });
            for (let k = 0; k < 14; k++) {
                const x = cx + (R() - 0.5) * 90, y = cy + (R() - 0.5) * 55;
                shape(P, circle(x, y, 3.2, 8), [['coral', 0.85]], { lw: 0.5 });
            }
            plant(P, 7.4, 1.0, R, 1.3);
            block(P, 6.0, 5.95, 0.57, 1.6, 0.1, 0.55, WOOD);
        }
    };

    // ---------- Room 4: football (Man United corner) ----------

    const football = {
        id: 'football',
        under(P, R) {
            shell(P, RED, GREEN);
            for (let a = 0; a < W; a += 2) P.fill(flat(a, 0, 0, 1, D), 'teal', 0.25);
            P.chalk([iso(W / 2, 0.3, 0), iso(W / 2, D - 0.3, 0)]);
            P.chalk(floorRing(W / 2, D / 2, 0, 1.2, 28), 1.6, true);
            P.chalk([iso(0.1, 2.0, 0), iso(1.8, 2.0, 0), iso(1.8, 6.0, 0), iso(0.1, 6.0, 0)]);
            P.chalk([iso(0.3, 0.3, 0), iso(W - 0.3, 0.3, 0), iso(W - 0.3, D - 0.3, 0), iso(0.3, D - 0.3, 0)], 1.6, true);

            for (let k = 0; k <= 10; k++) P.line([iso(0.03, 2.7 + k * 0.26, 0), iso(0.03, 2.7 + k * 0.26, 1.7)], 0.5, 'blue', false, 0.15);
            for (let k = 0; k <= 6; k++) P.line([iso(0.03, 2.7, k * 0.28), iso(0.03, 5.3, k * 0.28)], 0.5, 'blue', false, 0.15);
            block(P, 0.05, 2.55, 0, 0.16, 0.16, 1.75, [], { lw: 0.8 });
            block(P, 0.05, 5.3, 0, 0.16, 0.16, 1.75, [], { lw: 0.8 });
            block(P, 0.05, 2.55, 1.75, 0.16, 2.91, 0.16, [], { lw: 0.8 });

            for (let s = 0; s < 12; s++) {
                const fills = [RED, [], [['blue', 0.9]]][s % 3];
                shape(P, onBack(0.6 + s * 0.3, 0.9 + s * 0.3, 2.35, 2.75), fills, { lw: 0.6, amp: 0.2 });
            }
            const [jx, jy] = iso(2.3, 0, 1.45);
            shape(P, onBack(1.5, 3.1, 0.8, 2.1), [['sun', 0.35]]);
            shape(P, [[jx - 12, jy - 12], [jx - 4, jy - 16], [jx + 6, jy - 11], [jx + 14, jy - 6], [jx + 10, jy], [jx + 6, jy - 2], [jx + 6, jy + 14], [jx - 8, jy + 7], [jx - 8, jy - 6], [jx - 14, jy - 6]], RED, { lw: 0.8 });
            P.line([[jx - 2, jy - 3], [jx + 3, jy - 1], [jx - 1, jy + 8]], 1.6, 'sun', false, 0.15);

            const flags = [];
            for (let k = 0; k <= 12; k++) flags.push(iso(0.2 + k * 0.62, 0.02, 2.88 - Math.sin(k / 12 * Math.PI) * 0.3));
            P.line(flags, 0.8);
            for (let k = 0; k < 12; k++) {
                const a = flags[k], b = flags[k + 1];
                shape(P, [a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 10]], [[['coral', 'sun', 'teal'][k % 3], 0.85]], { lw: 0.5, amp: 0.15 });
            }

            block(P, 4.7, 0.05, 0, 2.8, 0.7, 2.4, [['blue', 0.12]], { top: WOOD });
            for (let row = 0; row < 2; row++) {
                const z = 0.2 + row * 1.1;
                P.line([iso(4.7, 0.76, z), iso(7.5, 0.76, z)], 1);
                for (let n = 0; n < 3; n++) {
                    const ti = 5.2 + n * 0.85;
                    cyl(P, ti, 0.4, z, 0.13, 0.12, [['blue', 0.7]], { lw: 0.6 });
                    cyl(P, ti, 0.4, z + 0.12, 0.04, 0.3, [['sun', 0.85]], { lw: 0.5 });
                    const [x, y] = iso(ti, 0.4, z + 0.6);
                    shape(P, [[x - 7, y - 6], [x + 7, y - 6], [x + 4, y + 4], [x - 4, y + 4]], [['sun', 0.9]], { lw: 0.6 });
                }
            }
            P.fill(faceL(4.7, 0.05, 0, 2.8, 0.7, 2.4), 'teal', 0.1);
        },
        live(P, t) {
            const period = 2.6, ph = (t % (period * 2)) / period;
            const dir = ph < 1 ? 1 : -1, k = ph < 1 ? ph : ph - 1;
            const A = [2.3, 4.4], B = [6.1, 5.6];
            const from = dir > 0 ? A : B, to = dir > 0 ? B : A;
            const bi = lerp(from[0], to[0], k), bj = lerp(from[1], to[1], k), bz = Math.sin(k * Math.PI) * 1.6 + 0.18;
            const [pa, pb] = [iso(A[0] - 0.3, A[1] - 0.2, 0), iso(B[0] + 0.3, B[1] + 0.2, 0)];
            figure(P, pa[0], pa[1], { t, pose: 'kick', k: dir > 0 ? (1 - k) * 6 : 0, shirt: RED, hair: [['blue', 0.9]] });
            figure(P, pb[0], pb[1], { t, pose: 'kick', k: dir < 0 ? (1 - k) * 6 : 0, shirt: [['blue', 0.2]], hair: [['coral', 0.6], ['sun', 0.5]] });
            const [sx, sy] = iso(bi, bj, 0);
            P.dot(sx, sy, 6 * (1 - bz / 3), 'blue', 0.3, 0.45);
            const [x, y] = iso(bi, bj, bz);
            shape(P, circle(x, y, 5.5, 12), [], { lw: 0.9, amp: 0.1 });
            P.dot(x + 1, y - 1, 2, 'blue', 0.9);
            P.dot(x - 3, y + 2, 1.2, 'blue', 0.9);
            const [cx, cy] = iso(7.6, 7.6, 0);
            P.line([[cx, cy], [cx, cy - 34]], 1.2);
            const f = Math.sin(t * 6) * 3;
            shape(P, [[cx, cy - 34], [cx + 14, cy - 30 + f], [cx, cy - 25]], RED, { lw: 0.6, amp: 0.1 });
        },
        over(P, R) {
            block(P, 6.4, 0.9, 0, 1.2, 0.8, 0.5, [['blue', 0.6]]);
            for (let k = 0; k < 3; k++) {
                const [x, y] = iso(6.6 + k * 0.4, 1.3, 0.62);
                shape(P, circle(x, y, 5, 10), [], { lw: 0.7, amp: 0.1 });
                P.dot(x, y, 1.6, 'blue', 0.9);
            }
        }
    };

    // ---------- Room 5: arcade ----------

    const PIECES = [[[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]]];

    const arcade = {
        id: 'arcade',
        under(P, R) {
            shell(P, NIGHT, [['coral', 0.25], ['sun', 0.2]]);
            for (let a = 0; a < W; a++) for (let b = 0; b < D; b++) if ((a + b) % 2) P.fill(flat(a, b, 0, 1, 1), 'blue', 0.35);
            for (let n = 0; n < 30; n++) {
                const [x, y] = iso(R() * W, 0.01, 2.5 + R() * 0.4);
                P.dot(x, y, 1.4, 'sun', 1);
            }
            this.cabs = [];
            for (let k = 0; k < 3; k++) {
                const i0 = 1.6 + k * 1.95;
                const fills = [[['sun', 0.75]], [['teal', 0.7]], [['coral', 0.75]]][k];
                block(P, i0, 0.15, 0, 1.4, 1.1, 2.4, fills);
                shape(P, onBack(i0 + 0.15, i0 + 1.25, 1.35, 2.15, 1.25), [['blue', 0.95]], { lw: 1 });
                block(P, i0, 1.25, 0.95, 1.4, 0.35, 0.2, [['blue', 0.6]], { lw: 0.8 });
                const [jx, jy] = iso(i0 + 0.4, 1.42, 1.15);
                P.line([[jx, jy], [jx, jy - 6]], 1.6);
                shape(P, circle(jx, jy - 7, 2.6, 8), RED, { lw: 0.5 });
                P.dot(...iso(i0 + 0.9, 1.42, 1.15), 2, 'sun', 1);
                shape(P, onBack(i0 + 0.1, i0 + 1.3, 2.2, 2.38, 1.25), [['sun', 0.4], ['coral', 0.2]], { lw: 0.6 });
            }

            block(P, 0.1, 3.0, 0, 1.4, 1.4, 1.0, [['sun', 0.6], ['coral', 0.25]]);
            for (let k = 0; k < 7; k++) {
                const [x, y] = iso(0.4 + R() * 0.9, 3.3 + R() * 0.9, 1.1 + R() * 0.15);
                blob(P, x, y, 4, [[pick(R, ['coral', 'teal', 'sun', 'blue']), 0.7]], R, { lw: 0.5 });
            }
            const glass = [faceL(0.1, 3.0, 1.0, 1.4, 1.4, 1.2), faceR(0.1, 3.0, 1.0, 1.4, 1.4, 1.2)];
            for (const g of glass) { P.fill(g, 'teal', 0.1); P.line(g, 0.8, 'blue', true); }
            block(P, 0.1, 3.0, 2.2, 1.4, 1.4, 0.25, [['coral', 0.7]]);
        },
        live(P, t) {
            const step = Math.floor(t * 2.5);
            const cell = (i0, cx, cy, fills) => {
                const a = i0 + 0.2 + cx * 0.16, z = 1.4 + cy * 0.095;
                shape(P, onBack(a, a + 0.14, z, z + 0.085, 1.26), fills, { lw: 0.3, amp: 0.05 });
            };
            const i0 = 1.6;
            const stack = [[1, 1, 0, 1, 1, 1], [1, 1, 1, 0, 1, 1], [0, 1, 1, 0, 0, 1]];
            stack.forEach((row, y) => row.forEach((v, x) => { if (v) cell(i0, x, y, [[['coral', 'sun', 'teal'][(x + y) % 3], 0.9]]); }));
            const which = Math.floor(step / 5) % PIECES.length, fall = 7 - (step % 5);
            for (const [px, py] of PIECES[which]) cell(i0, 1 + px, fall - py, [[['teal', 'coral', 'sun', 'coral'][which], 0.95]]);

            const i1 = 3.55, u = (Math.sin(t * 1.8) + 1) / 2, v = Math.abs(((t * 0.8) % 2) - 1);
            shape(P, onBack(i1 + 0.22, i1 + 0.27, 1.5 + v * 0.4, 1.68 + v * 0.4, 1.26), [['sun', 0.9]], { lw: 0.3 });
            shape(P, onBack(i1 + 1.13, i1 + 1.18, 1.45 + (1 - v) * 0.45, 1.63 + (1 - v) * 0.45, 1.26), [['sun', 0.9]], { lw: 0.3 });
            shape(P, onBack(i1 + 0.3 + u * 0.78, i1 + 0.36 + u * 0.78, 1.45 + v * 0.6, 1.51 + v * 0.6, 1.26), [['coral', 0.95]], { lw: 0.3 });

            const i2 = 5.5, sway = Math.sin(t * 0.9) * 0.12;
            for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
                const a = i2 + 0.3 + c * 0.2 + sway, z = 1.9 - r * 0.14 - (Math.floor(t * 0.5) % 3) * 0.04;
                shape(P, onBack(a, a + 0.12, z, z + 0.08, 1.26), [[['teal', 'sun', 'coral'][r], 0.9]], { lw: 0.3 });
            }
            shape(P, onBack(i2 + 0.55 + Math.sin(t * 1.3) * 0.3, i2 + 0.75 + Math.sin(t * 1.3) * 0.3, 1.4, 1.48, 1.26), [['sun', 0.9]], { lw: 0.3 });

            const on = Math.sin(t * 13) < 0.9;
            const heart = [];
            for (let k = 0; k <= 24; k++) {
                const a = k / 24 * TAU;
                const hx = 16 * Math.pow(Math.sin(a), 3), hz = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
                heart.push(iso(0.02, 6.2 + hx * 0.04, 2.1 + hz * 0.04));
            }
            if (on) P.line(heart, 7, 'coral', true, 0.1);
            P.chalk(heart, 2.2, true);
            P.line(heart, 1, 'coral', true, 0.1);

            const [fx, fy] = iso(4.3, 2.4, 0);
            figure(P, fx, fy, { t, pose: 'reach', shirt: [['teal', 0.6], ['sun', 0.4]], hair: [['coral', 0.85]] });
            const [kx, ky] = iso(1.9, 2.3, 0);
            figure(P, kx, ky, { t: t + 1, pose: 'stand', s: 0.8, shirt: [['sun', 0.85]], armsUp: Math.sin(t * 2) > 0.6 });
        },
        over(P, R) {
            const [bx, by] = iso(6.3, 6.0, 0.3);
            blob(P, bx, by, 24, RED, R, { squash: 0.55, shade: 0.1 });
            const [cx, cy] = iso(4.6, 6.9, 0.25);
            blob(P, cx, cy, 18, [['teal', 0.7]], R, { squash: 0.55, shade: 0.1 });
            plant(P, 7.4, 1.6, R, 1.1);
        }
    };

    // ---------- Room 6: observatory ----------

    const observatory = {
        id: 'observatory',
        under(P, R) {
            shell(P, [['blue', 0.65]], [['blue', 0.15], ['teal', 0.12]]);
            for (let n = 1; n < D; n++) P.line([iso(0, n, 0), iso(W, n, 0)], 0.5, 'blue', false, 0.2);
            const win = backRing(4.2, 1.65, 1.1, 30);
            shape(P, win, NIGHT, { lw: 3 });
            this.stars = [];
            for (let n = 0; n < 22; n++) {
                const a = R() * TAU, r = Math.sqrt(R()) * 0.98;
                this.stars.push([4.2 + Math.cos(a) * r, 1.65 + Math.sin(a) * r, R() * TAU]);
            }
            const [mx, my] = iso(4.75, 0, 2.2);
            shape(P, circle(mx, my, 8), [['sun', 0.7]], { lw: 0.6 });
            P.dot(mx + 3, my - 2, 6, 'blue', 0.85);
            P.line([iso(4.2, 0, 0.55), iso(4.2, 0, 2.75)], 1.4);
            P.line([iso(3.1, 0, 1.65), iso(5.3, 0, 1.65)], 1.4);

            shape(P, onLeft(1.2, 3.6, 1.1, 2.7), [['sun', 0.2]]);
            for (let k = 0; k < 5; k++) {
                const [x, y] = iso(0, 1.6 + k * 0.42, 1.9 + Math.sin(k) * 0.3);
                shape(P, circle(x, y, 4 + k * 1.2, 10), [[['coral', 'sun', 'teal', 'coral', 'blue'][k], 0.75]], { lw: 0.6 });
            }
            P.line([iso(0, 1.4, 1.9), iso(0, 3.5, 1.9)], 0.6, 'blue', false, 0.2);

            block(P, 0, 4.4, 0, 0.6, 2.6, 2.0, WOOD);
            for (let row = 0; row < 2; row++) {
                let j = 4.5;
                const z0 = 0.15 + row * 0.95;
                while (j < 6.9) {
                    const w = 0.1 + R() * 0.12;
                    shape(P, onLeft(j, j + w, z0, z0 + 0.45 + R() * 0.25, 0.61), pick(R, BOOKS), { lw: 0.5, amp: 0.15 });
                    j += w + 0.02;
                }
            }

            shape(P, floorRing(4.2, 5.0, 0.01, 1.9, 30), [['coral', 0.35], ['sun', 0.3]]);
            P.line(floorRing(4.2, 5.0, 0.01, 1.5, 30), 0.8, 'blue', true);
            P.line(floorRing(4.2, 5.0, 0.01, 0.9, 24), 0.8, 'blue', true);

            for (const [ti, tj] of [[5.3, 3.3], [6.3, 3.6], [5.7, 4.3]]) P.line([iso(5.8, 3.7, 1.6), iso(ti, tj, 0)], 1.4);
            const tube = [iso(5.3, 4.2, 1.3), iso(6.5, 3.0, 2.4)];
            P.line(tube, 11, 'blue', false, 0.2);
            P.chalk(tube, 8);
            P.line(tube, 8, 'coral', false, 0.2);
            P.line([iso(5.3, 4.2, 1.3), iso(5.15, 4.35, 1.15)], 5, 'blue', false, 0.1);
            shape(P, ellipse(...iso(6.5, 3.0, 2.4), 4, 6, 12), [['sun', 0.5]], { lw: 1 });
        },
        live(P, t) {
            for (const [si, sz, ph] of this.stars || []) {
                const tw = (Math.sin(t * 2 + ph) + 1) / 2;
                const [x, y] = iso(si, 0, sz);
                P.chalk([[x - 1.5 - tw * 1.5, y], [x + 1.5 + tw * 1.5, y]], 1);
                P.chalk([[x, y - 1.5 - tw * 1.5], [x, y + 1.5 + tw * 1.5]], 1);
            }
            const sh = (t % 7) / 1.2;
            if (sh < 1) {
                const [a, b] = [iso(3.4 + sh * 1.4, 0, 2.4 - sh * 0.9), iso(3.4 + sh * 1.4 + 0.4, 0, 2.4 - sh * 0.9 + 0.15)];
                P.chalk([a, b], 1.8);
            }
            const [hx, hy] = iso(2.4, 4.4, 2.8);
            P.line([[hx - 30, hy], [hx + 30, hy]], 1);
            P.line([iso(2.4, 4.4, H + 0.8), [hx, hy]], 1, 'blue', false, 0.1);
            for (let k = 0; k < 4; k++) {
                const a = t * 0.5 + k * TAU / 4;
                const px = hx + Math.cos(a) * 28, py = hy + 14 + k * 5 + Math.sin(a) * 4;
                P.line([[px, hy + Math.sin(a) * 3], [px, py]], 0.6, 'blue', false, 0.1);
                shape(P, circle(px, py, 4 + k, 10), [[['coral', 'sun', 'teal', 'coral'][k], 0.8]], { lw: 0.6 });
                if (k === 1) P.line(ellipse(px, py, 9, 2.5, 14), 0.8, 'blue', true, 0.1);
            }
            const [fx, fy] = iso(4.8, 4.75, 0);
            figure(P, fx, fy, { t, pose: 'reach', shirt: [['coral', 0.55], ['sun', 0.6]], hair: [['blue', 0.85]] });
            const br = 1 + Math.sin(t * 2) * 0.06;
            const [cx, cy] = iso(3.3, 5.8, 0.05);
            const cat = ellipse(cx, cy - 4 * br, 11, 6 * br, 14);
            shape(P, cat, ORANGE, { lw: 0.8 });
            shape(P, circle(cx + 9, cy - 6, 4.5, 10), ORANGE, { lw: 0.7 });
            P.line([[cx - 10, cy - 2], [cx - 16, cy + 2], [cx - 10, cy + 4]], 1.6, 'coral', false, 0.2);
        },
        over(P, R) {
            for (const [li, lj] of [[5.9, 6.1], [7.3, 6.1], [5.9, 6.9], [7.3, 6.9]]) block(P, li, lj, 0, 0.12, 0.12, 0.8, WOOD, { lw: 0.6 });
            block(P, 5.8, 6.0, 0.8, 1.7, 1.1, 0.12, WOOD);
            for (let k = 0; k < 4; k++) {
                const [x, y] = iso(6.2 + k * 0.25, 6.4 + (R() - 0.5) * 0.3, 0.93 + k * 0.01);
                shape(P, [[x - 8, y], [x, y - 4], [x + 8, y], [x, y + 4]], [], { lw: 0.5 });
            }
            cyl(P, 7.1, 6.3, 0.92, 0.14, 0.3, [['teal', 0.6]], { lw: 0.6 });
            plant(P, 7.4, 1.4, R, 1.2);
        }
    };

    function ctxAlpha(P, a, fn) {
        P.c.save();
        P.c.globalAlpha = clamp(a, 0, 1);
        fn();
        P.c.restore();
    }

    // ---------- Layout ----------

    const ROOMS = [
        { ...lab, ci: 0, cj: 0 },
        { ...library, ci: 1, cj: 0 },
        { ...garden, ci: 2, cj: 0 },
        { ...football, ci: 0, cj: 1 },
        { ...arcade, ci: 1, cj: 1 },
        { ...observatory, ci: 2, cj: 1 }
    ];
    const BX0 = -D * TW / 2 - 40, BX1 = W * TW / 2 + 40;
    const BY0 = -(H + 0.9) * TZ - 10, BY1 = (W + D) * TH / 2 + 0.4 * TZ + 30;
    const BH = BY1 - BY0;
    const CARD = [iso(-0.3, -0.3, 0), iso(W, -0.3, 0), iso(W, 0, -0.4), iso(W, D, -0.4), iso(0, D, -0.4), iso(-0.3, D, 0)];

    for (const r of ROOMS) {
        const [ox, oy] = iso(r.ci * PITCH, r.cj * PITCH, 0);
        r.ox = ox; r.oy = oy;
        r.bx0 = BX0 - (r.padL || 0);
        r.bw = BX1 - r.bx0;
        r.box = { x0: ox + r.bx0, y0: oy + BY0, x1: ox + BX1, y1: oy + BY1 };
        const L = r.padL ? -3.6 : -0.3, corners = [];
        for (const i of [L, W]) for (const j of [-0.3, D]) for (const z of [-0.4, H + 0.9]) corners.push(iso(i, j, z));
        r.hull = hull(corners).map(([x, y]) => [x + ox, y + oy]);
    }

    function hull(pts) {
        pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for (const p of pts.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
        return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    ROOMS.sort((a, b) => (a.ci + a.cj) - (b.ci + b.cj) || a.ci - b.ci);
    const WORLD = {
        x0: Math.min(...ROOMS.map(r => r.box.x0)), y0: Math.min(...ROOMS.map(r => r.box.y0)),
        x1: Math.max(...ROOMS.map(r => r.box.x1)), y1: Math.max(...ROOMS.map(r => r.box.y1))
    };

    // ---------- Bitmap cache ----------

    const cache = new Map();
    const CACHE_MAX = 48;
    const BUCKETS = [0.5, 1, 1.5, 2, 3];

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
        // Never stall a frame for extra boil variants; only build them while time remains.
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

    // ---------- Camera ----------

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let vw = 1, vh = 1, dpr = 1;
    const cam = { x: 0, y: 0, zoom: 1 };
    let tween = null, velocity = { x: 0, y: 0 };
    const tour = { index: -1, next: 0, pausedUntil: 0 };

    const fit = b => Math.min(vw / (b.x1 - b.x0), vh / (b.y1 - b.y0));
    const overview = () => ({ x: (WORLD.x0 + WORLD.x1) / 2, y: (WORLD.y0 + WORLD.y1) / 2, zoom: fit(WORLD) * 1.05 });
    const roomView = r => ({ x: (r.box.x0 + r.box.x1) / 2, y: (r.box.y0 + r.box.y1) / 2 + 20, zoom: Math.min(3, fit(r.box) * 1.1) });
    const zoomLimits = () => [overview().zoom * 0.6, 4];

    function flyTo(target, dur) {
        tween = { from: { ...cam }, to: target, start: performance.now(), dur };
    }

    function interrupt(now) {
        tween = null;
        tour.pausedUntil = now + 25000;
        tour.next = tour.pausedUntil;
    }

    function updateCamera(now) {
        if (tween) {
            const k = clamp((now - tween.start) / tween.dur, 0, 1), e = ease(k);
            const a = tween.from, b = tween.to;
            const far = Math.hypot(a.x - b.x, a.y - b.y) > 200;
            cam.x = lerp(a.x, b.x, e);
            cam.y = lerp(a.y, b.y, e);
            cam.zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e)) * (far ? 1 - 0.3 * Math.sin(Math.PI * k) : 1);
            if (k >= 1) tween = null;
        } else if (!drag) {
            cam.x += velocity.x * 16;
            cam.y += velocity.y * 16;
            velocity.x *= 0.92;
            velocity.y *= 0.92;
        }
        if (!reducedMotion && !tween && !drag && now > tour.next && now > tour.pausedUntil) {
            tour.index = (tour.index + 1) % (ROOMS.length + 1);
            const order = ['lab', 'library', 'garden', 'observatory', 'arcade', 'football'];
            flyTo(tour.index === ROOMS.length ? overview() : roomView(ROOMS.find(r => r.id === order[tour.index])), 3400);
            tour.next = now + (tour.index === ROOMS.length ? 7000 : 10000);
        }
        if (parked) return;
        cam.x = clamp(cam.x, WORLD.x0, WORLD.x1);
        cam.y = clamp(cam.y, WORLD.y0, WORLD.y1);
    }

    // ---------- Frame ----------

    function draw(now) {
        const t = now / 1000;
        updateCamera(now);
        const cw = canvas.width, ch = canvas.height, z = cam.zoom * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        const night = document.documentElement.classList.contains('night');
        ctx.fillStyle = night ? '#1e2340' : '#fff';
        ctx.fillRect(0, 0, cw, ch);

        const need = z * 0.9;
        const scale = BUCKETS.find(b => b >= need) || BUCKETS[BUCKETS.length - 1];
        const boil = Math.floor(t * 4) % 3;
        const variant = tween ? 0 : boil;
        budget = 1;
        frameDeadline = performance.now() + 7;

        const vx0 = cam.x - vw / 2 / cam.zoom, vx1 = cam.x + vw / 2 / cam.zoom;
        const vy0 = cam.y - vh / 2 / cam.zoom, vy1 = cam.y + vh / 2 / cam.zoom;

        for (const r of ROOMS) {
            const b = r.box;
            if (b.x1 < vx0 || b.x0 > vx1 || b.y1 < vy0 || b.y0 > vy1) continue;
            ctx.setTransform(z, 0, 0, z, cw / 2 + (r.ox - cam.x) * z, ch / 2 + (r.oy - cam.y) * z);
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            const behind = ROOMS.filter(n => n.ci + n.cj < r.ci + r.cj);
            if (behind.length) {
                ctx.beginPath();
                ctx.rect(r.bx0 - 10, BY0 - 10, r.bw + 20, BH + 20);
                for (const n of behind) {
                    const dx = n.ox - r.ox, dy = n.oy - r.oy;
                    CARD.forEach(([x, y], k) => (k ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
                    ctx.closePath();
                }
                ctx.clip('evenodd');
            }
            const under = layerFor(r, 'under', variant, scale);
            if (under) ctx.drawImage(under, r.bx0, BY0, r.bw, BH);
            if (under && r.live) {
                const P = Pen(ctx, hash(r.id, 'live', boil));
                try { r.live(P, t); } catch (err) { console.error(r.id, 'live', err); }
                ctx.globalCompositeOperation = 'source-over';
            }
            const over = layerFor(r, 'over', variant, scale);
            if (over) ctx.drawImage(over, r.bx0, BY0, r.bw, BH);
            ctx.restore();
        }
        if (night) {
            // moonlight: tint the paper a cool blue
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#b9c0e0';
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // ---------- Input ----------

    let drag = null;
    canvas.addEventListener('pointerdown', e => {
        interrupt(performance.now());
        drag = { x: e.clientX, y: e.clientY, t: performance.now() };
        velocity = { x: 0, y: 0 };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('drag');
    });
    canvas.addEventListener('pointermove', e => {
        if (!drag) return;
        const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(8, now - drag.t);
        cam.x -= dx / cam.zoom;
        cam.y -= dy / cam.zoom;
        velocity = { x: lerp(velocity.x, -dx / cam.zoom / dt, 0.6), y: lerp(velocity.y, -dy / cam.zoom / dt, 0.6) };
        drag = { x: e.clientX, y: e.clientY, t: now };
    });
    const release = () => {
        if (drag && performance.now() - drag.t > 90) velocity = { x: 0, y: 0 };
        drag = null;
        canvas.classList.remove('drag');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        interrupt(performance.now());
        const [lo, hi] = zoomLimits();
        const ax = cam.x + (e.clientX - vw / 2) / cam.zoom, ay = cam.y + (e.clientY - vh / 2) / cam.zoom;
        cam.zoom = clamp(cam.zoom * Math.exp(-clamp(e.deltaY, -300, 300) * 0.0015), lo, hi);
        cam.x = ax - (e.clientX - vw / 2) / cam.zoom;
        cam.y = ay - (e.clientY - vh / 2) / cam.zoom;
    }, { passive: false });
    canvas.addEventListener('dblclick', e => {
        const wx = cam.x + (e.clientX - vw / 2) / cam.zoom, wy = cam.y + (e.clientY - vh / 2) / cam.zoom;
        let best = null, bd = Infinity;
        for (const r of ROOMS) {
            const d = Math.hypot((r.box.x0 + r.box.x1) / 2 - wx, (r.box.y0 + r.box.y1) / 2 - wy);
            if (d < bd) { bd = d; best = r; }
        }
        if (best) {
            flyTo(roomView(best), 1200);
            tour.pausedUntil = performance.now() + 25000;
            tour.next = tour.pausedUntil;
        }
    });

    function resize() {
        vw = Math.max(1, window.innerWidth);
        vh = Math.max(1, window.innerHeight);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
    }
    // Parked view: the library fills the bottom-left corner, the lab peeking in above it.
    let parked = true;
    function cornerView() {
        const lib = ROOMS.find(r => r.id === 'library').box;
        const zoom = (vh * 0.82) / (lib.x1 - lib.x0);
        return {
            x: (lib.x0 + lib.x1) / 2 - (0.235 * vw - vw / 2) / zoom,
            y: (lib.y0 + lib.y1) / 2 - (0.81 * vh - vh / 2) / zoom,
            zoom,
        };
    }

    window.addEventListener('resize', resize);
    resize();
    Object.assign(cam, cornerView());
    tour.pausedUntil = Infinity;
    window.addEventListener('resize', () => { if (parked && !tween) Object.assign(cam, cornerView()); });

    window.paperRooms = {
        corner(instant) {
            parked = true;
            tour.pausedUntil = Infinity;
            velocity = { x: 0, y: 0 };
            if (instant) { tween = null; Object.assign(cam, cornerView()); }
            else flyTo(cornerView(), 1300);
        },
        enter() {
            parked = false;
            tour.pausedUntil = 0;
            tour.index = -1;
            tour.next = performance.now() + 2600;
            flyTo(overview(), 1300);
        },
        // screen-space outlines of every room, in CSS pixels
        outlines() {
            return ROOMS.map(r => r.hull.map(([x, y]) => [vw / 2 + (x - cam.x) * cam.zoom, vh / 2 + (y - cam.y) * cam.zoom]));
        },
    };

    let last = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        if (now - last < 33) return;
        last = now;
        draw(now);
    }
    requestAnimationFrame(frame);
})();
