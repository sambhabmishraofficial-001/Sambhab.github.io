/**
 * Butterfly Meadow - four little pixel places with a white butterfly.
 * Everything is drawn procedurally into a 160x116 pixel buffer.
 */

(function () {
'use strict';

    // Scenes are laid out in 160x116 units and printed at S pixels per unit.
    const W = 160, H = 116, S = 1.5, TAU = Math.PI * 2, DUR = 14, PAN = 70;
    const BW = Math.round(W * S), BH = Math.round(H * S), N = BW * BH;
    const canvas = document.getElementById('meadow');
    if (!canvas) return;
    canvas.width = BW;
    canvas.height = BH;
    const ctx = canvas.getContext('2d');
    const out = ctx.createImageData(BW, BH);
    const out32 = new Uint32Array(out.data.buffer);
    const buf = new Uint32Array(N);

    // ---------- Pixel helpers ----------

    const hex = h => {
        const n = parseInt(h.slice(1), 16);
        return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
    };
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
    const dith = (x, y, t) => t > BAYER[((y & 3) << 2) | (x & 3)];

    function pxb(x, y, c, t = 1) {
        if (x < 0 || y < 0 || x >= BW || y >= BH) return;
        if (t < 1 && !dith(x, y, t)) return;
        buf[y * BW + x] = c;
    }
    const px = (x, y, c, t = 1) => pxb(Math.floor(x * S), Math.floor(y * S), c, t);

    function ellipse(cx, cy, rx, ry, c, t = 1, rot = 0) {
        if (rx <= 0 || ry <= 0) return;
        cx *= S; cy *= S; rx *= S; ry *= S;
        const R = Math.max(rx, ry) + 1, cs = Math.cos(rot), sn = Math.sin(rot);
        const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(BW - 1, Math.ceil(cx + R));
        const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(BH - 1, Math.ceil(cy + R));
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                const u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
                if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1) pxb(x, y, c, t);
            }
        }
    }
    const circle = (x, y, r, c, t = 1) => ellipse(x, y, Math.max(r, 0.5 / S), Math.max(r, 0.5 / S), c, t);

    function ring(cx, cy, rx, ry, c, t = 1) {
        cx *= S; cy *= S; rx *= S; ry *= S;
        const x0 = Math.max(0, Math.floor(cx - rx - 1)), x1 = Math.min(BW - 1, Math.ceil(cx + rx + 1));
        const y0 = Math.max(0, Math.floor(cy - ry - 1)), y1 = Math.min(BH - 1, Math.ceil(cy + ry + 1));
        const m = Math.min(rx, ry);
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
                if (Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * m < 0.6) pxb(x, y, c, t);
            }
        }
    }

    function poly(pts, c, t = 1) {
        let y0 = Infinity, y1 = -Infinity;
        pts = pts.map(p => [p[0] * S, p[1] * S]);
        for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(BH - 1, Math.ceil(y1));
        const xs = [];
        for (let y = y0; y <= y1; y++) {
            const sy = y + 0.5;
            xs.length = 0;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const ax = pts[j][0], ay = pts[j][1], bx = pts[i][0], by = pts[i][1];
                if ((ay <= sy) !== (by <= sy)) xs.push(ax + (sy - ay) / (by - ay) * (bx - ax));
            }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2) {
                const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(BW - 1, Math.floor(xs[k + 1] - 0.5));
                for (let x = xa; x <= xb; x++) pxb(x, y, c, t);
            }
        }
    }

    function line(x0, y0, x1, y1, w, c, t = 1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * S * 1.5) + 1;
        for (let i = 0; i <= n; i++) {
            const f = i / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
            if (w <= 1.2) px(x, y, c, t);
            else circle(x, y, w / 2, c, t);
        }
    }

    const bez = (p0, p1, p2, s) => [
        (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0],
        (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1]
    ];

    function curve(p0, p1, p2, w, c, t = 1) {
        let prev = p0;
        for (let i = 1; i <= 16; i++) {
            const p = bez(p0, p1, p2, i / 16);
            line(prev[0], prev[1], p[0], p[1], w, c, t);
            prev = p;
        }
    }

    function vgrad(y0, y1, cols) {
        for (let y = Math.max(0, Math.floor(y0 * S)); y < Math.min(BH, y1 * S); y++) {
            const s = Math.min(0.9999, Math.max(0, (y / S - y0) / (y1 - y0))) * (cols.length - 1);
            const i = Math.floor(s), f = s - i;
            for (let x = 0; x < BW; x++) buf[y * BW + x] = dith(x, y, f) ? cols[i + 1] : cols[i];
        }
    }

    function hash(x, y, s) {
        let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }

    function rng(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const rr = (R, a, b) => a + R() * (b - a);
    const span = p => [-8, W + PAN * p + 8];

    // ---------- Shared bits ----------

    const WHITE = hex('#ffffff');
    let parts = [];

    function spawn(kind, x, y, n, cols, spread = 3) {
        for (let k = 0; k < n; k++) {
            const a = Math.random() * TAU, sp = 6 + Math.random() * 16;
            parts.push({
                kind, x: x + Math.cos(a) * Math.random() * spread, y: y + Math.sin(a) * Math.random() * spread,
                vx: Math.cos(a) * sp + (kind === 'seed' ? 12 : 4), vy: Math.sin(a) * sp - (kind === 'seed' ? 10 : 6),
                life: 0, max: kind === 'spark' ? 0.7 + Math.random() * 0.5 : 2.5 + Math.random() * 2,
                ph: Math.random() * TAU, c: cols[k % cols.length]
            });
        }
    }

    function updateParts(dt, t) {
        for (const p of parts) {
            p.life += dt;
            if (p.kind === 'petal') {
                p.vy += 16 * dt;
                p.vx += Math.sin(t * 3 + p.ph) * 18 * dt;
                p.vx *= 0.97; p.vy *= 0.97;
            } else if (p.kind === 'seed') {
                p.vy += (Math.sin(t * 2 + p.ph) * 6 - 2) * dt;
                p.vx += 3 * dt;
                p.vx *= 0.985; p.vy *= 0.985;
            } else {
                p.vx *= 0.9; p.vy *= 0.9;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
        parts = parts.filter(p => p.life < p.max && p.y < H + 4 && p.x > -6 && p.x < W + 6);
    }

    const SEED_STEM = hex('#c8d2da');
    function drawParts() {
        for (const p of parts) {
            const fade = 1 - p.life / p.max;
            if (p.kind === 'petal') {
                px(p.x, p.y, p.c, Math.min(1, fade * 2));
                if (Math.sin(p.life * 9 + p.ph) > 0) px(p.x + 1, p.y, p.c, Math.min(1, fade * 2));
            } else if (p.kind === 'seed') {
                px(p.x, p.y, WHITE, Math.min(1, fade * 2));
                px(p.x, p.y + 1, SEED_STEM, Math.min(1, fade * 2));
            } else {
                sparkle(p.x, p.y, Math.sin(Math.PI * p.life / p.max) * 2.2);
            }
        }
    }

    function sparkle(x, y, s) {
        const n = Math.round(s * S), bx = Math.floor(x * S), by = Math.floor(y * S);
        pxb(bx, by, WHITE);
        for (let k = 1; k <= n; k++) {
            const t = k === n ? 0.6 : 1;
            pxb(bx + k, by, WHITE, t); pxb(bx - k, by, WHITE, t);
            pxb(bx, by + k, WHITE, t); pxb(bx, by - k, WHITE, t);
        }
    }

    // ---------- Scene 1: milk vetch field ----------

    const V = {
        sky: ['#3ba7f5', '#4cb0f6', '#62baf6', '#7fc7f7', '#a3d6f7', '#c6e5f8', '#e0f0f8'].map(hex),
        bush: [hex('#1f6a33'), hex('#2a7d3b'), hex('#3b9445')],
        rim: hex('#f3eeb6'), hillA: hex('#e2e893'), hillB: hex('#c3dc78'), hillC: hex('#9fcd60'), hillD: hex('#86bf55'),
        petals: [['#d9486d', '#f190aa', '#ffd2de', '#f7e6ec'], ['#c93a63', '#ec7f9c', '#ffc6d6', '#f8e2ea'], ['#e0567a', '#f5a3b8', '#ffdbe4', '#fbeef2']]
            .map(s => s.map(hex)),
        stem: hex('#2c7a3a'), stemLight: hex('#4f9e45'),
        leaves: [['#2f8a3e', '#5cb552', '#a3db78'], ['#25713a', '#3f9a48', '#7cc65e'], ['#3b9b45', '#6cc05a', '#b4e48a']].map(s => s.map(hex))
    };
    const hillY = x => 66 - x * 0.12;

    function rosette(x, y, r, cols, spin) {
        ellipse(x, y + r * 0.12, r, r * 0.78, cols[0]);
        const n = r > 6 ? 11 : r > 3 ? 8 : 5;
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU + spin;
            ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.45, r * 0.42, r * 0.28, k % 3 === 0 ? cols[0] : cols[1], 1, a);
        }
        if (r > 2.5) {
            const m = r > 6 ? 7 : 5;
            for (let k = 0; k < m; k++) {
                const a = k / m * TAU - spin * 1.3;
                ellipse(x + Math.cos(a) * r * 0.3, y - r * 0.12 + Math.sin(a) * r * 0.22, r * 0.3, r * 0.2, k % 2 ? cols[1] : cols[2], 1, a);
            }
        }
        ellipse(x - r * 0.15, y - r * 0.32, r * 0.34, r * 0.17, cols[2]);
        if (r > 2.5) ellipse(x, y - r * 0.12, r * 0.16, r * 0.12, cols[3]);
        ellipse(x, y + r * 0.42, r * 0.7, r * 0.26, cols[0], 0.5);
    }

    function leafBlob(x, y, r, cols) {
        ellipse(x, y, r, r * 0.7, cols[0]);
        ellipse(x - r * 0.15, y - r * 0.18, r * 0.8, r * 0.48, cols[1]);
        ellipse(x - r * 0.35, y - r * 0.35, r * 0.32, r * 0.16, cols[2]);
        line(x - r * 0.7, y + r * 0.1, x + r * 0.6, y - r * 0.15, 1, cols[0], 0.8);
    }

    const vetch = {
        name: 'Milk vetch field',
        sub: 'Spring · pink blooms rolling down the hill',
        hint: 'Tap a flower to scatter its petals · tap to call the butterfly · drag to fly',
        build(R) {
            const flowers = [], leaves = [];
            const add = (n, p, ry, rr0, rr1, stem) => {
                const [a, b] = span(p);
                for (let i = 0; i < n; i++) {
                    const x = rr(R, a, b);
                    const y = ry === 'hill' ? hillY(x) + rr(R, 2, 11) : rr(R, ry[0], ry[1]);
                    flowers.push({ x, y, p, r: rr(R, rr0, rr1), stem, cols: V.petals[i % 3], spin: R() * TAU, ph: R() * TAU, hit: -99 });
                }
            };
            add(60, 0.5, 'hill', 1.3, 2.4, false);
            add(40, 0.75, [60, 88], 3.4, 5.6, true);
            add(13, 1, [74, 102], 8, 11.5, true);
            const bush = [];
            const [ba, bb] = span(0.85);
            for (let i = 0; i < 26; i++) bush.push({ x: rr(R, ba, bb), y: rr(R, 84, 104), r: rr(R, 6, 11), c: V.bush[i % 3] });
            for (const [n, p, y0, y1, r0, r1] of [[14, 0.85, 92, 110, 7, 12], [12, 1, 101, 118, 9, 15]]) {
                const [a, b] = span(p);
                for (let i = 0; i < n; i++) leaves.push({ x: rr(R, a, b), y: rr(R, y0, y1), r: rr(R, r0, r1), p, cols: V.leaves[i % 3] });
            }
            flowers.sort((a, b) => a.p - b.p || a.y - b.y);
            return { flowers, leaves, bush };
        },
        draw(st, cam, t) {
            vgrad(0, 72, V.sky);
            for (let x = 0; x < BW; x++) {
                const hy = Math.round(hillY(x / S + cam * 0.5) * S);
                for (let y = Math.max(0, hy); y < BH; y++) {
                    const d = (y - hy) / S;
                    let c;
                    if (d < 1.5) c = V.rim;
                    else if (d < 8) c = dith(x, y, (d - 1.5) / 6.5) ? V.hillB : V.hillA;
                    else c = dith(x, y, Math.min(1, (d - 8) / 20)) ? V.hillD : V.hillC;
                    buf[y * BW + x] = c;
                }
            }
            const drawLeaves = p => { for (const l of st.leaves) if (l.p === p) leafBlob(l.x - cam * l.p, l.y, l.r, l.cols); };
            let leavesBack = false, bushDone = false;
            for (const f of st.flowers) {
                if (!bushDone && f.p >= 0.75) {
                    for (const b of st.bush) ellipse(b.x - cam * 0.85, b.y, b.r, b.r * 0.65, b.c);
                    bushDone = true;
                }
                if (!leavesBack && f.p === 1) { drawLeaves(0.85); leavesBack = true; }
                const x = f.x - cam * f.p + Math.sin(t * 1.3 + f.ph) * f.r * 0.08, y = f.y;
                if (x < -14 || x > W + 14) continue;
                if (f.stem) {
                    line(x, y + f.r * 0.5, x + Math.sin(f.ph) * 2, H + 2, f.r > 7 ? 2 : 1, V.stem);
                    if (f.r > 7) line(x - 0.5, y + f.r * 0.6, x - 0.5 + Math.sin(f.ph) * 2, H, 1, V.stemLight);
                }
                const age = t - f.hit;
                let k = 1;
                if (age >= 0 && age < 6) k = age < 0.15 ? 1 - age / 0.15 : age < 4.8 ? 0 : (age - 4.8) / 1.2;
                if (k > 0.05) rosette(x, y, f.r * Math.max(0.25, k), f.cols, f.spin + Math.sin(t * 0.7 + f.ph) * 0.1);
                else ellipse(x, y, Math.max(1, f.r * 0.25), Math.max(1, f.r * 0.2), f.cols[0]);
            }
            drawLeaves(1);
        },
        tap(st, sx, sy, cam, t) {
            for (let i = st.flowers.length - 1; i >= 0; i--) {
                const f = st.flowers[i];
                const x = f.x - cam * f.p, age = t - f.hit;
                if (age >= 0 && age < 6) continue;
                if (Math.hypot(sx - x, sy - f.y) < f.r + 2.5) {
                    f.hit = t;
                    spawn('petal', x, f.y, 6 + Math.round(f.r * 2), [f.cols[0], f.cols[1], f.cols[2]], f.r);
                    return true;
                }
            }
            return false;
        }
    };

    // ---------- Scene 2: still pond ----------

    const PD = {
        water: ['#74b8f1', '#4a9be8', '#3289e1', '#2b7dd9', '#2774d2'].map(hex),
        halo: hex('#8fbfee'), cloud: hex('#c9def4'), cloudLight: hex('#e7f1fb'), shine: hex('#9fd0f8'),
        rockShadow: hex('#76808f'), rock: hex('#bcc4cf'), rockTop: hex('#dbe0e7'), rockLight: hex('#f3f5f8'),
        reeds: [['#2e9e46', '#7fd35b', '#1e6b34'], ['#3aae4c', '#a2e27f', '#22763a'], ['#24863c', '#5cc24e', '#195c2d']].map(s => s.map(hex)),
        ripple: hex('#dcedfb')
    };

    function blade(bx, by, cx, cy, tx, ty, w, cols) {
        const L = [], Rt = [], spine = [];
        for (let i = 0; i <= 14; i++) {
            const s = i / 14, p = bez([bx, by], [cx, cy], [tx, ty], s), q = bez([bx, by], [cx, cy], [tx, ty], Math.min(1, s + 0.02));
            let nx = -(q[1] - p[1]), ny = q[0] - p[0];
            const nl = Math.hypot(nx, ny) || 1;
            nx /= nl; ny /= nl;
            const wv = w * Math.sin(Math.PI * Math.min(0.999, 0.15 + s * 0.85)) * (1 - s * 0.35);
            L.push([p[0] + nx * wv, p[1] + ny * wv]);
            Rt.push([p[0] - nx * wv, p[1] - ny * wv]);
            spine.push(p);
        }
        poly(L.concat(Rt.slice().reverse()), cols[0]);
        poly(L.concat(spine.slice().reverse()), cols[1]);
        for (let i = 1; i < spine.length; i++) line(spine[i - 1][0], spine[i - 1][1], spine[i][0], spine[i][1], 1, cols[2]);
    }

    const pond = {
        name: 'Still pond',
        sub: 'Spring · the sky resting on the water',
        hint: 'Tap the water to ripple it · tap to call the butterfly · drag to fly',
        build(R) {
            const clouds = [];
            for (let i = 0; i < 7; i++) {
                const puffs = [];
                const n = 4 + Math.floor(R() * 3), s = rr(R, 7, 13);
                for (let k = 0; k < n; k++) puffs.push([rr(R, -s * 1.4, s * 1.4), rr(R, -s * 0.4, s * 0.4), rr(R, s * 0.55, s)]);
                clouds.push({ x: i * 38 + rr(R, -8, 8), y: rr(R, 10, 106), puffs });
            }
            const reeds = [];
            for (const base of [146, 214]) {
                for (let k = 0; k < 7; k++) {
                    const bx = base + rr(R, -4, 10), tx = bx - rr(R, 10, 34), ty = rr(R, -10, 40);
                    reeds.push({ bx, by: H + 8, cx: bx + rr(R, -2, 8), cy: rr(R, 50, 80), tx, ty, w: rr(R, 2.2, 3.6), cols: PD.reeds[k % 3] });
                }
            }
            return { clouds, reeds, ripples: [] };
        },
        draw(st, cam, t) {
            vgrad(0, H, PD.water);
            const wrap = 7 * 38;
            const cpos = st.clouds.map(c => [((c.x - cam * 0.7 + t * 1.2) % wrap + wrap) % wrap - 40, c.y]);
            for (let pass = 0; pass < 3; pass++) {
                st.clouds.forEach((c, i) => {
                    const [cx, cy] = cpos[i];
                    for (const [dx, dy, r] of c.puffs) {
                        if (pass === 0) circle(cx + dx, cy + dy, r + 3, PD.halo, 0.5);
                        else if (pass === 1) circle(cx + dx, cy + dy, r, PD.cloud);
                        else circle(cx + dx - r * 0.2, cy + dy - r * 0.25, r * 0.62, PD.cloudLight);
                    }
                });
            }
            for (let k = 0; k < 6; k++) {
                const y = 20 + k * 17 + Math.sin(t * 0.6 + k) * 2, x = ((k * 53 - cam * 0.7 + t * 4) % 190 + 190) % 190 - 15;
                line(x, y, x + 8 + (k % 3) * 3, y, 1, PD.shine, 0.6);
            }
            const rx = 12 - cam, ry = 12;
            if (rx > -30) {
                ellipse(rx + 2, ry + 3, 16, 10.5, PD.rockShadow);
                ellipse(rx, ry, 16, 10.5, PD.rock);
                ellipse(rx - 2, ry - 2, 12, 7, PD.rockTop);
                ellipse(rx - 6, ry - 4.5, 4, 2, PD.rockLight);
                for (let k = 0; k < 7; k++) {
                    const a = -2.2 + k * 0.22 + Math.sin(t * 1.4 + k) * 0.05, len = 9 + (k % 3) * 4;
                    const c = PD.reeds[k % 3];
                    line(rx + 3, ry - 5, rx + 3 + Math.cos(a) * len, ry - 5 + Math.sin(a) * len, 1.6, c[k % 2 ? 0 : 1]);
                }
            }
            for (const r of st.reeds) {
                const sway = Math.sin(t * 1.1 + r.bx) * 1.5;
                const ox = -cam;
                if (r.bx + ox < -40 || r.tx + ox > W + 40) continue;
                blade(r.bx + ox, r.by, r.cx + ox, r.cy, r.tx + ox + sway, r.ty, r.w, r.cols);
            }
            st.ripples = st.ripples.filter(rp => t - rp.t0 < 2.6);
            for (const rp of st.ripples) {
                for (let k = 0; k < 3; k++) {
                    const a = t - rp.t0 - k * 0.35;
                    if (a <= 0) continue;
                    const rxp = 2 + a * 20;
                    ring(rp.x, rp.y, rxp, rxp * 0.55, PD.ripple, Math.max(0, 1 - a / 2.1));
                }
            }
        },
        tap(st, sx, sy, cam, t) {
            st.ripples.push({ x: sx, y: sy, t0: t });
            return false;
        }
    };

    // ---------- Scene 3: buttercup meadow ----------

    const BC = {
        sky: ['#44abee', '#58b5f0', '#6fc0f2', '#8ccdf4', '#acdbf6', '#c8e7f8', '#dbf0f9'].map(hex),
        grass: ['#2f9a5f', '#45b06a', '#1f7a4c', '#64c070', '#28875a'].map(hex),
        dark: ['#1f6e4a', '#175c3e', '#2a8457'].map(hex),
        puffHalo: hex('#dfe7ee'), puff: hex('#f8fbfd'), puffShade: hex('#dbe4ec'), seedHead: hex('#b9a98a'), dStem: hex('#7ba86a'),
        cupShade: hex('#e2900b'), cup: hex('#ffc41e'), cupLight: hex('#ffe78a'), cupCore: hex('#b56a00'), cStem: hex('#3e8e41'),
        clover: [['#1d6b63', '#2e8b7f', '#55b3a3'], ['#17574f', '#257a6f', '#3f9f90'], ['#226f5f', '#349582', '#68c2ad']].map(s => s.map(hex)),
        mound: hex('#145049'),
        violet: [hex('#aaa6f3'), hex('#8c87e6'), hex('#c9c6fa')], violetCore: hex('#f6d54a')
    };

    function buttercup(x, y, r, tilt) {
        ellipse(x, y + r * 0.15, r, r * 0.72, BC.cupShade, 1, tilt);
        ellipse(x, y - r * 0.1, r * 0.86, r * 0.5, BC.cup, 1, tilt);
        ellipse(x - r * 0.3, y - r * 0.25, r * 0.36, r * 0.2, BC.cupLight, 1, tilt);
        px(x, y - r * 0.1, BC.cupCore);
    }

    const buttercups = {
        name: 'Buttercup meadow',
        sub: 'Spring · buttercups, clover and dandelion clocks',
        hint: 'Tap a dandelion to blow it · tap to call the butterfly · drag to fly',
        build(R) {
            const mk = (n, p, f) => { const [a, b] = span(p); const o = []; for (let i = 0; i < n; i++) o.push(f(rr(R, a, b), i)); return o; };
            return {
                far: mk(70, 0.55, (x, i) => ({ x, h: rr(R, 40, 82), lean: rr(R, -7, 7), ph: R() * TAU, c: [BC.grass[i % 5], BC.grass[(i + 3) % 5], BC.grass[i % 5]] })),
                dandelions: mk(6, 0.7, x => ({ x, y: rr(R, 18, 44), r: rr(R, 6, 8.5), ph: R() * TAU, hit: -99 })),
                cups: mk(15, 0.8, x => ({ x, y: rr(R, 30, 78), r: rr(R, 3, 5.4), tilt: rr(R, -0.4, 0.4), ph: R() * TAU })),
                near: mk(42, 1, (x, i) => ({ x, h: rr(R, 70, 114), lean: rr(R, -10, 10), ph: R() * TAU, c: [BC.dark[i % 3], BC.dark[(i + 1) % 3], BC.dark[i % 3]] })),
                bigCups: mk(5, 1, x => ({ x, y: rr(R, 52, 88), r: rr(R, 6.5, 9), tilt: rr(R, -0.5, 0.5), ph: R() * TAU })),
                clover: mk(46, 1, (x, i) => ({ x, y: rr(R, 86, 120), r: rr(R, 3, 5), rot: R() * TAU, cols: BC.clover[i % 3] })),
                violets: mk(18, 1, (x, i) => ({ x: rr(R, 2, 62), y: rr(R, 92, 114), r: rr(R, 2, 3.2), c: BC.violet[i % 3] }))
            };
        },
        draw(st, cam, t) {
            vgrad(0, H, BC.sky);
            const wind = k => Math.sin(t * 1.2 + k) * 2;
            const grass = (list, p, w) => {
                for (const g of list) {
                    const x = g.x - cam * p;
                    if (x < -20 || x > W + 20) continue;
                    blade(x, H + 2, x + g.lean * 0.3, H - g.h * 0.55, x + g.lean + wind(g.ph), H - g.h, w, g.c);
                }
            };
            grass(st.far, 0.55, 0.9);
            for (const d of st.dandelions) {
                const x = d.x - cam * 0.7 + wind(d.ph) * 0.6;
                if (x < -14 || x > W + 14) continue;
                line(x, d.y, x + 2, H + 2, 1, BC.dStem);
                const age = t - d.hit;
                let k = 1;
                if (age >= 0 && age < 8) k = age < 6.5 ? 0 : (age - 6.5) / 1.5;
                if (k > 0.1) {
                    circle(x, d.y, d.r * k + 1.5, BC.puffHalo, 0.5);
                    circle(x, d.y, d.r * k, BC.puff);
                    circle(x + d.r * 0.25 * k, d.y + d.r * 0.25 * k, d.r * 0.55 * k, BC.puffShade, 0.35);
                }
                circle(x, d.y, 1.4, BC.seedHead);
            }
            for (const c of st.cups) {
                const x = c.x - cam * 0.8 + wind(c.ph) * 0.8;
                if (x < -10 || x > W + 10) continue;
                line(x, c.y, x + Math.sin(c.ph) * 3, H + 2, 1, BC.cStem);
                buttercup(x, c.y, c.r, c.tilt);
            }
            grass(st.near, 1, 1.5);
            for (const c of st.bigCups) {
                const x = c.x - cam + wind(c.ph);
                if (x < -12 || x > W + 12) continue;
                line(x, c.y, x + Math.sin(c.ph) * 3, H + 2, 1.6, BC.cStem);
                buttercup(x, c.y, c.r, c.tilt);
            }
            ellipse(70 - cam * 0.2, H + 10, 60, 26, BC.mound);
            for (const c of st.clover) {
                const x = c.x - cam;
                if (x < -10 || x > W + 10) continue;
                for (let k = 0; k < 3; k++) {
                    const a = c.rot + k * TAU / 3;
                    ellipse(x + Math.cos(a) * c.r * 0.6, c.y + Math.sin(a) * c.r * 0.4, c.r * 0.62, c.r * 0.45, c.cols[k === 0 ? 2 : k === 1 ? 1 : 0]);
                }
                px(x, c.y, c.cols[0]);
            }
            for (const v of st.violets) {
                const x = v.x - cam;
                for (let k = 0; k < 5; k++) {
                    const a = k / 5 * TAU;
                    circle(x + Math.cos(a) * v.r * 0.8, v.y + Math.sin(a) * v.r * 0.7, v.r * 0.55, v.c);
                }
                px(x, v.y, BC.violetCore);
            }
        },
        tap(st, sx, sy, cam, t) {
            for (const d of st.dandelions) {
                const x = d.x - cam * 0.7, age = t - d.hit;
                if (age >= 0 && age < 8) continue;
                if (Math.hypot(sx - x, sy - d.y) < d.r + 3) {
                    d.hit = t;
                    spawn('seed', x, d.y, 30, [WHITE], d.r);
                    return true;
                }
            }
            return false;
        }
    };

    // ---------- Scene 4: lily of the valley ----------

    const LV = {
        sky: ['#2a95ee', '#3aa3f1', '#5cb5f4', '#84c8f7'].map(hex),
        cloud: hex('#ffffff'), cloudShade: hex('#d6e6f4'),
        leafBack: [hex('#257d47'), hex('#329158'), hex('#1b6338')],
        leaf: [hex('#2e9b57'), hex('#42b06a'), hex('#1f7a43')],
        stem: hex('#2d7a3e'),
        bell: hex('#f6b4c9'), bellShade: hex('#e384a3'), bellLight: hex('#ffdee9'), bellDeep: hex('#cc5d82')
    };

    function bellDraw(x, y, r, ang) {
        const cx = x + Math.sin(ang) * r * 1.4, top = y + 1;
        line(x, y, cx, top + r * 0.3, 1, LV.stem);
        circle(cx, top + r * 0.78, r * 0.78, LV.bell);
        poly([[cx - r * 0.74, top + r * 0.8], [cx + r * 0.74, top + r * 0.8], [cx + r * 1.08, top + r * 1.7], [cx - r * 1.08, top + r * 1.7]], LV.bell);
        for (const k of [-0.72, 0, 0.72]) circle(cx + k * r, top + r * 1.7, r * 0.34, LV.bell);
        ellipse(cx + r * 0.45, top + r * 1.15, r * 0.36, r * 0.72, LV.bellShade, 0.55);
        ellipse(cx - r * 0.35, top + r * 0.62, r * 0.22, r * 0.36, LV.bellLight);
        if (r > 2.5) line(cx - r * 0.55, top + r * 1.9, cx + r * 0.55, top + r * 1.9, 1, LV.bellDeep, 0.7);
        return [cx, top + r];
    }

    const lily = {
        name: 'Lily of the valley',
        sub: 'Spring · little pink bells in the breeze',
        hint: 'Tap a bell to ring it · tap to call the butterfly · drag to fly',
        build(R) {
            const leaf = (p, bx, tx, ty, w, flip) => ({ p, bx, tx, ty, w, cx: bx + (tx - bx) * 0.2 + flip * 14, cy: ty + (H - ty) * 0.25 });
            const spray = (p, bx, top, dir, size) => {
                const ex = bx + dir * rr(R, 26, 40), ey = top + rr(R, 8, 18);
                const bells = [];
                for (let s = 0.42; s <= 1.001; s += 0.13) bells.push({ s, r: size * (1.1 - (s - 0.42) * 0.85), ph: R() * TAU, hit: -99 });
                return { p, b: [bx, H + 4], c: [bx + dir * 4, top - 14], e: [ex, ey], bells };
            };
            return {
                cloud: { x: 82, y: 24 },
                back: [leaf(0.6, 40, 70, 30, 13, 1), leaf(0.6, 150, 120, 26, 12, -1), leaf(0.6, 210, 186, 34, 12, -1)],
                sprays: [spray(0.8, 30, 24, 1, 5.2), spray(0.8, 168, 18, -1, 5), spray(0.8, 104, 50, 1, 3.2), spray(1, 208, 30, -1, 6)],
                front: [leaf(1, 10, 6, 52, 16, 1), leaf(1, 66, 96, 28, 20, 1), leaf(1, 120, 74, 44, 15, -1), leaf(1, 182, 160, 40, 17, -1), leaf(1, 240, 220, 36, 16, -1)]
            };
        },
        draw(st, cam, t) {
            vgrad(0, H, LV.sky);
            const cx = st.cloud.x - cam * 0.3 + Math.sin(t * 0.2) * 3, cy = st.cloud.y;
            ellipse(cx, cy + 1, 9, 3, LV.cloudShade);
            ellipse(cx, cy, 9, 3, LV.cloud);
            ellipse(cx + 4, cy - 1.5, 5, 2.6, LV.cloud);
            line(cx + 8, cy - 1, cx + 19, cy - 6, 1, LV.cloud);
            line(cx + 6, cy + 1, cx + 16, cy - 2, 1, LV.cloud, 0.6);
            const drawLeaf = (l, cols) => {
                const o = -cam * l.p, sway = Math.sin(t * 0.8 + l.bx) * 1.2;
                blade(l.bx + o, H + 10, l.cx + o, l.cy, l.tx + o + sway, l.ty, l.w, cols);
            };
            const drawSpray = sp => {
                const o = -cam * sp.p, sway = Math.sin(t * 0.9 + sp.b[0]) * 1.5;
                const b = [sp.b[0] + o, sp.b[1]], c = [sp.c[0] + o + sway * 0.5, sp.c[1]], e = [sp.e[0] + o + sway, sp.e[1]];
                curve(b, c, e, 1.6, LV.stem);
                for (const bl of sp.bells) {
                    const [hx, hy] = bez(b, c, e, bl.s);
                    const age = t - bl.hit;
                    let ang = Math.sin(t * 1.3 + bl.ph) * 0.08;
                    if (age >= 0 && age < 3) ang += Math.sin(age * 11) * 0.6 * Math.exp(-age * 1.6);
                    bl.at = bellDraw(hx, hy, bl.r, ang);
                }
            };
            for (const l of st.back) drawLeaf(l, LV.leafBack);
            for (const sp of st.sprays) if (sp.p < 1) drawSpray(sp);
            for (const l of st.front) drawLeaf(l, LV.leaf);
            for (const sp of st.sprays) if (sp.p === 1) drawSpray(sp);
        },
        tap(st, sx, sy, cam, t) {
            for (let i = st.sprays.length - 1; i >= 0; i--) {
                for (const bl of st.sprays[i].bells) {
                    if (!bl.at) continue;
                    if (Math.hypot(sx - bl.at[0], sy - bl.at[1]) < bl.r + 2.5) {
                        bl.hit = t;
                        spawn('spark', bl.at[0], bl.at[1] + bl.r, 5, [WHITE], bl.r * 2.5);
                        return true;
                    }
                }
            }
            return false;
        }
    };

    // ---------- Butterfly ----------

    const BF = { white: hex('#ffffff'), edge: hex('#b9cade'), shade: hex('#cad8e7'), soft: hex('#f0f5fa'), body: hex('#59606e') };
    const bf = { x: 40, y: 44, vx: 12, vy: 0, mode: 'wander', tx: 90, ty: 40, next: 0, until: 0 };

    function updateButterfly(dt, t) {
        if (bf.mode === 'drag') {
            const k = Math.min(1, dt * 12);
            bf.vx = (bf.tx - bf.x) * k / Math.max(dt, 0.001);
            bf.x += (bf.tx - bf.x) * k;
            bf.y += (bf.ty - bf.y) * k;
            return;
        }
        if (bf.mode === 'wander' && t > bf.next) {
            bf.tx = 16 + Math.random() * (W - 32);
            bf.ty = 12 + Math.random() * 60;
            bf.next = t + 2 + Math.random() * 3;
        }
        if (bf.mode === 'hover' && t > bf.until) { bf.mode = 'wander'; bf.next = 0; }
        const dx = bf.tx - bf.x, dy = bf.ty - bf.y, d = Math.hypot(dx, dy) || 1;
        const maxv = bf.mode === 'goto' ? 52 : bf.mode === 'hover' ? 8 : 26, acc = bf.mode === 'goto' ? 130 : 50;
        bf.vx += dx / d * acc * dt;
        bf.vy += dy / d * acc * dt + Math.sin(t * 6.3) * 34 * dt;
        const v = Math.hypot(bf.vx, bf.vy);
        if (v > maxv) { bf.vx *= maxv / v; bf.vy *= maxv / v; }
        if (bf.mode === 'goto' && d < 4) { bf.mode = 'hover'; bf.until = t + 2.5; }
        bf.x = Math.min(W - 5, Math.max(5, bf.x + bf.vx * dt));
        bf.y = Math.min(H - 8, Math.max(6, bf.y + bf.vy * dt));
    }

    function drawButterfly(t) {
        const f = (Math.sin(t * 16) + 1) / 2, s = 1 + f * 4.4, x = bf.x, y = bf.y;
        for (const side of [-1, 1]) {
            ellipse(x + side * s * 0.55, y - 1.4, s * 0.55 + 0.6, 3, BF.edge);
            ellipse(x + side * s * 0.55, y - 1.5, s * 0.55, 2.4, BF.white);
            ellipse(x + side * s * 0.42, y + 1.7, s * 0.42 + 0.4, 2, BF.shade);
            ellipse(x + side * s * 0.42, y + 1.6, s * 0.42, 1.5, BF.soft);
        }
        line(x, y - 2.5, x, y + 2.5, 1, BF.body);
        px(x - 1, y - 4, BF.body);
        px(x + 1, y - 4, BF.body);
    }

    // ---------- Masks ----------

    const EDGE = new Uint8Array(N), TH = new Float32Array(N), BAND = 11;
    for (let y = 0; y < BH; y++) {
        for (let x = 0; x < BW; x++) {
            const i = y * BW + x, d = Math.min(x, y, BW - 1 - x, BH - 1 - y);
            const n = hash(x >> 1, y >> 1, 77) * 0.6 + hash(x, y, 78) * 0.4;
            EDGE[i] = d >= BAND || n < (d + 0.6) / (BAND + 0.5) - 0.05 ? 1 : 0;
            const grid = x % 7 === 3 && y % 7 === 3;
            TH[i] = grid ? hash(x, y, 5) * 0.32 : 0.34 + hash(x, y, 9) * 0.66;
        }
    }

    // ---------- Places, UI and loop ----------

    const SCENES = [vetch, pond, buttercups, lily];
    const states = SCENES.map((s, i) => s.build(rng(1009 + i * 7919)));
    const $ = id => document.getElementById(id);
    const nameEl = $('scene-name'), subEl = $('scene-sub'), hintEl = $('scene-hint'), placesEl = $('places'), pauseBtn = $('pause');
    const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

    const thumbs = SCENES.map((s, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb';
        btn.setAttribute('aria-label', s.name);
        const cv = document.createElement('canvas');
        cv.width = BW; cv.height = BH;
        const bar = document.createElement('span');
        bar.className = 'bar';
        bar.appendChild(document.createElement('i'));
        btn.append(cv, bar);
        btn.addEventListener('click', () => go(i));
        placesEl.insertBefore(btn, placesEl.querySelector('.sep'));
        s.draw(states[i], PAN * 0.3, 0);
        const img = cv.getContext('2d').createImageData(BW, BH), d32 = new Uint32Array(img.data.buffer);
        for (let k = 0; k < N; k++) d32[k] = EDGE[k] ? buf[k] : 0;
        cv.getContext('2d').putImageData(img, 0, 0);
        return btn;
    });

    let cur = 0, next = 0, phase = 'in', prog = 0, elapsed = 0, paused = false, cam = 0;

    function showText() {
        const s = SCENES[cur];
        nameEl.textContent = s.name;
        subEl.textContent = s.sub;
        hintEl.textContent = s.hint;
        thumbs.forEach((b, i) => {
            b.classList.toggle('on', i === cur);
            if (i === cur) b.setAttribute('aria-current', 'true');
            else b.removeAttribute('aria-current');
        });
    }

    function go(i) {
        if (phase === 'out') { next = i; return; }
        if (i === cur) return;
        next = i;
        phase = 'out';
    }

    pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.classList.toggle('paused', paused);
        pauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    });

    const local = e => {
        const r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    };
    let down = null, clock = 0;
    canvas.addEventListener('pointerdown', e => {
        down = { x: e.clientX, y: e.clientY, drag: false };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        if (!down) return;
        if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down.drag = true; bf.mode = 'drag'; }
        if (down.drag) [bf.tx, bf.ty] = local(e);
    });
    const release = e => {
        if (!down) return;
        if (down.drag) {
            bf.mode = 'hover';
            bf.until = clock + 1.5;
        } else {
            const [sx, sy] = local(e);
            const used = phase !== 'out' && SCENES[cur].tap(states[cur], sx, sy, cam, clock);
            if (!used) { bf.mode = 'goto'; bf.tx = sx; bf.ty = sy; }
        }
        down = null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => { down = null; if (bf.mode === 'drag') bf.mode = 'wander'; });

    let spark = 0;
    function step(dt) {
        clock += dt;
        if (phase === 'out') {
            prog -= dt / 0.55;
            if (prog <= 0) {
                prog = 0; cur = next; phase = 'in'; elapsed = 0; parts = [];
                showText();
            }
        } else {
            if (phase === 'in') {
                prog += dt / 1.6;
                if (prog >= 1) { prog = 1; phase = 'show'; }
            }
            if (!paused) {
                elapsed += dt;
                if (elapsed >= DUR) go((cur + 1) % SCENES.length);
            }
        }
        if (phase !== 'out') cam = PAN * ease(Math.min(1, elapsed / DUR));
        spark -= dt;
        if (spark <= 0) {
            spark = 0.35 + Math.random() * 0.5;
            spawn('spark', 10 + Math.random() * (W - 20), 8 + Math.random() * (H - 30), 1, [WHITE], 0);
        }
        updateParts(dt, clock);
        updateButterfly(dt, clock);
    }

    function render() {
        SCENES[cur].draw(states[cur], cam, clock);
        drawParts();
        drawButterfly(clock);
        for (let i = 0; i < N; i++) out32[i] = EDGE[i] && TH[i] < prog ? buf[i] : 0;
        ctx.putImageData(out, 0, 0);
        const bar = thumbs[cur].querySelector('.bar i');
        bar.style.width = (Math.min(1, elapsed / DUR) * 100).toFixed(1) + '%';
    }

    showText();
    let last = performance.now(), acc = 0;
    function frame(now) {
        requestAnimationFrame(frame);
        acc += Math.min(0.1, (now - last) / 1000);
        last = now;
        if (acc < 1 / 30) return;
        step(acc);
        acc = 0;
        render();
    }
    requestAnimationFrame(frame);
})();
