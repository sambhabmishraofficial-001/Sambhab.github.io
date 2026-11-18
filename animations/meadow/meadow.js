import { Pix, rng, hex, mix, hash2, toPix } from '../pixkit.js';

const W = 192, H = 132;

export const SCENES = [
    {
        id: 'poppy', title: 'Poppy hill', caption: 'Summer · red cups nodding in the wind',
        sky: ['#7cc4f2', '#d9efff'], hill: ['#b9d98a', '#86b85c'], far: '#9fcf7d',
        leaf: ['#2f6b34', '#3f8a3e', '#5aa64a'], petal: ['#e8463b', '#c92f2c', '#ff8a6e'], eye: '#2b1d1d',
        count: 46, size: [3.2, 6], sun: null, water: false,
    },
    {
        id: 'lotus', title: 'Lotus pond', caption: 'Monsoon · pink lanterns on still water',
        sky: ['#a9c9e8', '#eef3f6'], hill: ['#8fb6a6', '#5f8f86'], far: '#7fa79a',
        leaf: ['#2d6b52', '#3e8a68', '#61a882'], petal: ['#f29bb8', '#d9688f', '#ffd3e1'], eye: '#f2c94c',
        count: 22, size: [4, 7], sun: null, water: true,
    },
    {
        id: 'marigold', title: 'Marigold row', caption: 'Autumn · orange pom-poms at golden hour',
        sky: ['#f3a86b', '#ffe3b0'], hill: ['#c7b45e', '#8e8a3d'], far: '#b09c55',
        leaf: ['#3c5a24', '#557a2e', '#77983b'], petal: ['#f59a1b', '#d86f0f', '#ffcf4a'], eye: '#8a3d0a',
        count: 40, size: [3, 5.5], sun: [150, 34], water: false,
    },
];

function buildFlowers(scene, seed) {
    const r = rng(seed), list = [];
    for (let i = 0; i < scene.count; i++) {
        const depth = r();
        const y = 62 + depth * 62 + r() * 4;
        list.push({
            x: r() * (W + 10) - 5,
            y,
            depth,
            stem: 10 + depth * 26 + r() * 8,
            size: scene.size[0] + (scene.size[1] - scene.size[0]) * depth * (0.75 + r() * 0.35),
            phase: r() * Math.PI * 2,
            lean: (r() - 0.5) * 0.25,
            bloom: 1,
        });
    }
    return list.sort((a, b) => a.y - b.y);
}

function drawFlower(P, s, f, t, wind) {
    const sway = Math.sin(t * 1.6 + f.phase + f.x * 0.04) * (1.2 + f.depth * 2.2) * wind + f.lean * f.stem;
    const hx = f.x + sway, hy = f.y - f.stem;
    const leafC = hex(s.leaf[f.depth > 0.5 ? 1 : 0]);
    // stem bends along a quadratic curve
    const steps = Math.ceil(f.stem);
    for (let k = 0; k <= steps; k++) {
        const u = k / steps, x = f.x + sway * u * u, y = f.y - f.stem * u;
        P.px(x, y, leafC);
        if (f.depth > 0.6) P.px(x + 1, y, leafC);
    }
    // a pair of leaves near the base
    const lc = hex(s.leaf[2]);
    P.ellipse(f.x - 2.5, f.y - f.stem * 0.25, 2.5 + f.depth * 2, 1 + f.depth * 0.6, lc);
    P.ellipse(f.x + 2.5 + sway * 0.1, f.y - f.stem * 0.42, 2.2 + f.depth * 2, 1 + f.depth * 0.6, leafC);
    if (f.bloom <= 0.05) return;
    const r = f.size * f.bloom;
    const base = hex(s.petal[0]), dark = hex(s.petal[1]), light = hex(s.petal[2]);
    if (s.id === 'lotus') {
        P.poly([[hx - r, hy], [hx - r * 0.5, hy - r * 1.3], [hx, hy - r * 0.4]], dark);
        P.poly([[hx + r, hy], [hx + r * 0.5, hy - r * 1.3], [hx, hy - r * 0.4]], dark);
        P.poly([[hx - r * 0.55, hy], [hx, hy - r * 1.6], [hx + r * 0.55, hy]], base);
        P.line(hx, hy - r * 1.4, hx, hy - r * 0.5, light);
        P.ellipse(hx, hy + 0.5, r * 0.9, r * 0.3, dark);
        return;
    }
    if (s.id === 'marigold') {
        P.disc(hx, hy, r, dark);
        for (let k = 0; k < 7; k++) {
            const a = k / 7 * Math.PI * 2 + f.phase;
            P.disc(hx + Math.cos(a) * r * 0.45, hy + Math.sin(a) * r * 0.45, r * 0.55, base);
        }
        P.disc(hx - r * 0.25, hy - r * 0.3, r * 0.4, light);
        return;
    }
    // poppy: a cup of four petals with a dark eye
    P.ellipse(hx, hy, r, r * 0.8, dark);
    P.ellipse(hx - r * 0.35, hy - r * 0.15, r * 0.65, r * 0.6, base);
    P.ellipse(hx + r * 0.4, hy - r * 0.1, r * 0.6, r * 0.6, base);
    P.px(hx - r * 0.4, hy - r * 0.45, light);
    P.disc(hx, hy + r * 0.05, Math.max(0.8, r * 0.28), hex(s.eye));
}

function drawButterfly(P, b, t) {
    const flap = Math.abs(Math.sin(t * 14 + b.seed)) * (b.resting ? 0.35 : 1);
    const x = Math.round(b.x), y = Math.round(b.y);
    const wing = hex('#ffffff'), edge = hex('#c9d6e3'), body = hex('#3b3046');
    const span = 1 + flap * 3.2, dir = b.vx >= 0 ? 1 : -1;
    P.poly([[x, y], [x - span * dir, y - 3.5], [x - span * dir * 0.7, y + 0.5]], edge);
    P.poly([[x, y], [x + span * dir * 0.9, y - 4], [x + span * dir * 1.1, y + 0.5]], wing);
    P.poly([[x, y + 0.5], [x + span * dir * 0.7, y + 3], [x + 0.5 * dir, y + 2]], wing);
    P.px(x, y, body); P.px(x, y + 1, body); P.px(x + dir, y - 1, body);
}

export function createMeadow(canvas, { scale = 1 } = {}) {
    const P = new Pix(canvas, W, H);
    let sceneIndex = 0, scene = SCENES[0], flowers = buildFlowers(scene, 11);
    let paused = false, clock = 0, last = performance.now();
    const petals = [];
    const fly = { x: 90, y: 60, vx: 0.4, vy: 0, tx: 90, ty: 60, seed: 3, resting: false, wander: 0 };
    let dragging = false;

    function setScene(i) {
        sceneIndex = (i + SCENES.length) % SCENES.length;
        scene = SCENES[sceneIndex];
        flowers = buildFlowers(scene, 11 + sceneIndex * 17);
        petals.length = 0;
    }

    function backdrop(t) {
        const s = scene;
        P.grad(0, 0, W, 72, hex(s.sky[0]), hex(s.sky[1]), 7);
        if (s.sun) P.disc(s.sun[0], s.sun[1], 9, mix(hex('#fff2c6'), hex(s.sky[1]), 0.2));
        // drifting clouds
        const cloud = [255, 255, 255, 200];
        for (let k = 0; k < 3; k++) {
            const cx = ((k * 77 + t * (2 + k)) % (W + 60)) - 30, cy = 14 + k * 9;
            P.ellipse(cx, cy, 12 - k * 2, 3, cloud);
            P.ellipse(cx + 6, cy - 2, 7 - k, 3, cloud);
        }
        // far ridge
        const far = hex(s.far);
        for (let x = 0; x < W; x++) {
            const y = 56 + Math.sin(x * 0.035 + 1) * 5 + Math.sin(x * 0.11) * 1.5;
            P.rect(x, y, 1, H - y, far);
        }
        if (s.water) {
            P.grad(0, 66, W, H - 66, hex('#a7cfe0'), hex('#5f9fb3'), 6);
            for (let k = 0; k < 26; k++) {
                const y = 70 + (k * 37 % 60), x = (k * 53 + Math.sin(t + k) * 4) % W;
                P.rect(x, y, 4 + (k % 3) * 2, 1, [255, 255, 255, 110]);
            }
            for (let k = 0; k < 14; k++) {
                const x = (k * 41) % W, y = 72 + (k * 23) % 56;
                P.ellipse(x, y, 5 + (k % 3) * 2, 1.6 + (k % 2), hex(s.leaf[k % 3]));
            }
            return;
        }
        // near hill with dithered grass texture
        const a = hex(s.hill[0]), b = hex(s.hill[1]);
        for (let x = 0; x < W; x++) {
            const top = 64 - (x / W) * 12 + Math.sin(x * 0.05) * 2;
            for (let y = Math.floor(top); y < H; y++) {
                const n = hash2(x, y, 5);
                P.px(x, y, mix(a, b, Math.min(1, (y - top) / 50 + (n > 0.85 ? 0.15 : 0))));
            }
        }
    }

    function step(dt) {
        clock += dt;
        // butterfly wander + seek
        fly.wander -= dt;
        if (!dragging && fly.wander <= 0) {
            fly.wander = 1.6 + Math.random() * 2;
            const f = flowers[Math.floor(Math.random() * flowers.length)];
            if (f && Math.random() < 0.45) { fly.tx = f.x; fly.ty = f.y - f.stem - f.size - 2; }
            else { fly.tx = 20 + Math.random() * (W - 40); fly.ty = 18 + Math.random() * 60; }
        }
        const ax = (fly.tx - fly.x) * 1.6, ay = (fly.ty - fly.y) * 1.6 + Math.sin(clock * 5) * 8;
        fly.vx = (fly.vx + ax * dt) * 0.94;
        fly.vy = (fly.vy + ay * dt) * 0.94;
        fly.x += fly.vx * dt * 3;
        fly.y += fly.vy * dt * 3;
        fly.resting = Math.hypot(fly.tx - fly.x, fly.ty - fly.y) < 2 && !dragging;
        // petals fall and drift
        for (let i = petals.length - 1; i >= 0; i--) {
            const p = petals[i];
            p.vy += 18 * dt; p.vx += Math.sin(clock * 3 + p.s) * 6 * dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0 || p.y > H + 4) petals.splice(i, 1);
        }
        for (const f of flowers) if (f.bloom < 1) f.bloom = Math.min(1, f.bloom + dt * 0.22);
    }

    function render() {
        const t = clock;
        P.clear([255, 255, 255, 255]);
        backdrop(t);
        const wind = 0.8 + Math.sin(t * 0.4) * 0.4;
        for (const f of flowers) drawFlower(P, scene, f, t, wind);
        for (const p of petals) P.px(p.x, p.y, p.c);
        drawButterfly(P, fly, t);
        P.tear(7 + sceneIndex, 7);
        P.flush();
    }

    function scatter(px, py) {
        let hit = null, bd = 9;
        const wind = 0.8 + Math.sin(clock * 0.4) * 0.4;
        for (const f of flowers) {
            const sway = Math.sin(clock * 1.6 + f.phase + f.x * 0.04) * (1.2 + f.depth * 2.2) * wind + f.lean * f.stem;
            const d = Math.hypot(f.x + sway - px, f.y - f.stem - py);
            if (d < f.size + 2 && d < bd && f.bloom > 0.5) { bd = d; hit = f; }
        }
        if (!hit) return false;
        const cols = scene.petal.map(hex);
        for (let k = 0; k < 18; k++) {
            const a = Math.random() * Math.PI * 2, sp = 10 + Math.random() * 22;
            petals.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, c: cols[k % 3], s: Math.random() * 6, life: 3 + Math.random() * 2 });
        }
        hit.bloom = 0;
        return true;
    }

    canvas.addEventListener('pointerdown', e => {
        const [x, y] = toPix(P, e);
        if (!scatter(x, y)) { fly.tx = x; fly.ty = y; fly.wander = 3; }
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        const [x, y] = toPix(P, e);
        fly.tx = x; fly.ty = y; fly.wander = 3;
    });
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) step(dt);
        render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return {
        setScene,
        get scene() { return SCENES[sceneIndex]; },
        get index() { return sceneIndex; },
        togglePause() { paused = !paused; return paused; },
    };
}

// Static preview of a scene, for thumbnails and homepage cards.
export function renderStill(canvas, index, t = 2) {
    const P = new Pix(canvas, W, H), scene = SCENES[index];
    const flowers = buildFlowers(scene, 11 + index * 17);
    P.clear([255, 255, 255, 255]);
    const fake = { scene };
    // reuse the live renderer's drawing by building a one-off instance-free pass
    P.grad(0, 0, W, 72, hex(scene.sky[0]), hex(scene.sky[1]), 7);
    if (scene.sun) P.disc(scene.sun[0], scene.sun[1], 9, hex('#fff2c6'));
    const far = hex(scene.far);
    for (let x = 0; x < W; x++) { const y = 56 + Math.sin(x * 0.035 + 1) * 5; P.rect(x, y, 1, H - y, far); }
    if (scene.water) P.grad(0, 66, W, H - 66, hex('#a7cfe0'), hex('#5f9fb3'), 6);
    else for (let x = 0; x < W; x++) { const top = 64 - (x / W) * 12; P.rect(x, top, 1, H - top, hex(scene.hill[0])); }
    for (const f of flowers) drawFlower(P, fake.scene, f, t, 1);
    P.tear(7 + index, 7);
    P.flush();
}
