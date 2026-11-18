import { Pix, hex, mix, hash2, rng } from '../pixkit.js';

const W = 208, H = 156;

export const STAGES = [
    { id: 'assembly', label: 'Assembly', at: 0 },
    { id: 'rollout', label: 'Rollout', at: 4 },
    { id: 'raise', label: 'Raise rail', at: 8 },
    { id: 'countdown', label: 'Countdown', at: 11 },
    { id: 'ignition', label: 'Ignition', at: 16 },
    { id: 'liftoff', label: 'Liftoff', at: 17.5 },
    { id: 'ascent', label: 'Ascent', at: 21 },
    { id: 'burnout', label: 'Burnout', at: 24 },
    { id: 'apogee', label: 'Apogee · patch in space', at: 26 },
];
export const DURATION = 32;

const C = {
    sky: hex('#cfe6f2'), skyHi: hex('#7fb2d9'), space: hex('#0d1530'),
    sea: hex('#5aa6c4'), seaD: hex('#3d86a6'), foam: hex('#e8f6fb'),
    sand: hex('#e6d3a3'), sandD: hex('#cdb682'), grass: hex('#8fae5a'), grassD: hex('#6d8c42'),
    pad: hex('#b9b7ae'), padD: hex('#8f8d85'), padL: hex('#d6d4cc'),
    steel: hex('#5d6f80'), steelD: hex('#3f4c59'), steelL: hex('#8aa0b3'),
    hangar: hex('#d9d2c3'), hangarD: hex('#a89f8d'), roof: hex('#b0573a'),
    body: hex('#f4f1ea'), bodyD: hex('#7d8ea3'), fin: hex('#e2683a'), nose: hex('#e2683a'), band: hex('#2c3e66'),
    flame: hex('#ffd36b'), flameO: hex('#ff8a3d'), smoke: hex('#eeeeee'), smokeD: hex('#c9c9c9'),
    person: hex('#2c3e66'), vest: hex('#f2a33a'), skin: hex('#c98e62'), sock: hex('#ef6b3a'),
    patchB: hex('#1f3f8f'), patchR: hex('#e2483d'), patchY: hex('#f2c94c'), earth: hex('#3d7fc4'), earthG: hex('#6ea44a'),
};

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const seg = (T, a, b) => ease((T - a) / (b - a));

function island(P, cam) {
    const oy = cam;
    // sea with foam ripples
    for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) {
        const yy = y - oy;
        if (yy < 70) continue;
        P.px(x, y, hash2(x >> 2, yy, 8) > 0.985 ? C.foam : (yy % 11 === 0 && hash2(x >> 1, yy, 3) > 0.7 ? C.seaD : C.sea));
    }
    // diamond island in a soft isometric view
    const cx = 100, cy = 108 + oy;
    const top = [[cx - 92, cy], [cx, cy - 40], [cx + 92, cy], [cx, cy + 40]];
    P.poly(top, C.sand);
    P.poly([[cx - 78, cy], [cx, cy - 33], [cx + 70, cy - 2], [cx - 4, cy + 30]], C.grass);
    for (let k = 0; k < 220; k++) {
        const x = cx + (hash2(k, 1, 4) - 0.5) * 150, y = cy + (hash2(1, k, 4) - 0.5) * 56;
        if (Math.abs(x - cx) / 78 + Math.abs(y - cy) / 33 < 0.95) P.px(x, y, C.grassD);
    }
    for (let k = 0; k < 120; k++) {
        const x = cx + (hash2(k, 2, 6) - 0.5) * 184, y = cy + (hash2(2, k, 6) - 0.5) * 80;
        const d = Math.abs(x - cx) / 92 + Math.abs(y - cy) / 40;
        if (d < 1 && d > 0.88) P.px(x, y, C.sandD);
    }
    // concrete pad
    P.poly([[cx - 6, cy - 4], [cx + 26, cy - 20], [cx + 58, cy - 4], [cx + 26, cy + 12]], C.pad);
    P.poly([[cx - 6, cy - 4], [cx + 26, cy + 12], [cx + 26, cy + 14], [cx - 6, cy - 2]], C.padD);
    P.poly([[cx + 26, cy + 12], [cx + 58, cy - 4], [cx + 58, cy - 2], [cx + 26, cy + 14]], C.padD);
    // road from hangar to pad
    for (let k = 0; k < 40; k++) P.px(cx - 44 + k * 1.5, cy + 6 - k * 0.55, C.padL);
    return { cx, cy };
}

function hangar(P, x, y) {
    P.poly([[x, y], [x + 22, y - 10], [x + 22, y - 26], [x, y - 16]], C.hangar);
    P.poly([[x, y], [x - 18, y - 8], [x - 18, y - 24], [x, y - 16]], C.hangarD);
    P.poly([[x - 18, y - 24], [x, y - 16], [x + 22, y - 26], [x + 4, y - 34]], C.roof);
    P.poly([[x + 4, y - 3], [x + 18, y - 9], [x + 18, y - 21], [x + 4, y - 15]], C.steelD);
}

function windsock(P, x, y, t) {
    P.rect(x, y - 18, 1, 18, C.steelD);
    const flap = Math.sin(t * 4) * 1.2;
    for (let k = 0; k < 7; k++) P.rect(x + 1 + k, y - 18 + k * 0.15 + flap * k / 7, 1, 3 - k * 0.25, k % 2 ? [255, 255, 255, 255] : C.sock);
}

function person(P, x, y, t, k) {
    const bob = Math.round(Math.sin(t * 5 + k) * 0.5);
    P.rect(x, y - 3 + bob, 2, 3, C.person);
    P.rect(x, y - 5 + bob, 2, 2, C.vest);
    P.px(x, y - 6 + bob, C.skin); P.px(x + 1, y - 6 + bob, C.skin);
}

function rocket(P, bx, by, ang, len, burning, t, sep) {
    // ang: 0 = horizontal pointing right, -PI/2 = vertical pointing up
    const tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
    const at = (u, v) => [bx + tx * u + nx * v, by + ty * u + ny * v];
    const fill = (u0, u1, half, col) => {
        for (let u = u0; u <= u1; u += 0.5) for (let v = -half; v <= half; v += 0.5) { const [x, y] = at(u, v); P.px(x, y, col); }
    };
    const boosterEnd = len * 0.42;
    if (!sep) {
        fill(0, boosterEnd, 1.5, C.bodyD);
        for (const s of [-1, 1]) for (let k = 0; k < 4; k++) for (let v = 1.5; v <= 1.5 + k * 0.8; v += 0.5) { const [x, y] = at(k, s * v); P.px(x, y, C.fin); }
    }
    fill(boosterEnd, len - 4, 1.5, C.body);
    fill(boosterEnd, boosterEnd + 1, 1.5, C.band);
    for (let u = len - 4; u <= len; u += 0.5) { const half = 1.5 * (len - u) / 4; for (let v = -half; v <= half; v += 0.5) { const [x, y] = at(u, v); P.px(x, y, C.nose); } }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const [x, y] = at(boosterEnd + 1 + k, s * (1.5 + k * 0.5)); if (sep) P.px(x, y, C.fin); }
    if (burning) {
        const base = sep ? boosterEnd : 0, flick = 3 + Math.sin(t * 40) * 1.5 + Math.random();
        for (let u = 0; u < flick + 4; u += 0.5) {
            const half = 1.4 * (1 - u / (flick + 5));
            for (let v = -half; v <= half; v += 0.5) { const [x, y] = at(base - u - 0.5, v); P.px(x, y, u < 2 ? [255, 255, 255, 255] : u < flick ? C.flame : C.flameO); }
        }
    }
}

function patch(P, x, y, r, spin) {
    P.disc(x, y, r + 1, [255, 255, 255, 255]);
    P.disc(x, y, r, C.patchB);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + spin; P.px(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), C.patchY); }
    P.disc(x - r * 0.3, y + r * 0.25, r * 0.35, C.earth);
    P.poly([[x - 1, y + r * 0.5], [x + r * 0.45, y - r * 0.6], [x + 1.5, y + r * 0.45]], [255, 255, 255, 255]);
    P.px(x + r * 0.15, y + r * 0.55, C.patchR); P.px(x + r * 0.25, y + r * 0.62, C.patchR);
}

export function createLaunch(canvas, { onStage, onTick } = {}) {
    const P = new Pix(canvas, W, H);
    const smoke = [], stars = [];
    const r = rng(42);
    for (let k = 0; k < 90; k++) stars.push([r() * W, r() * H, r()]);
    let T = 0, playing = true, last = performance.now(), stageIdx = -1;

    function frame(dt) {
        const prevT = T;
        if (playing) T = Math.min(DURATION, T + dt);
        if (T >= DURATION) playing = false;
        const idx = STAGES.reduce((acc, s, i) => (T >= s.at ? i : acc), 0);
        if (idx !== stageIdx) { stageIdx = idx; onStage && onStage(idx); }

        // rocket height (in px above pad) and camera follow
        const lift = T < 17.5 ? 0 : 6 * (T - 17.5) ** 2.2;
        const cam = lift - 52 * (1 - Math.exp(-lift / 52));
        const alt = ease(cam / 900);

        // sky blends to space with altitude
        const top = mix(C.skyHi, C.space, Math.min(1, alt * 1.3)), bot = mix(C.sky, C.space, Math.max(0, alt * 1.1 - 0.15));
        P.grad(0, 0, W, H, top, bot, 8);
        for (const [x, y, b] of stars) if (alt > 0.3 + b * 0.4) P.px(x, y, [255, 255, 255, 120 + b * 135]);

        if (cam < H + 60) {
            const { cx, cy } = island(P, cam);
            hangar(P, cx - 48, cy + 10 + 0);
            windsock(P, cx + 72, cy - 2, T);
            // launcher rail: rises from flat to near-vertical
            const raise = seg(T, 8, 11);
            const railAng = -0.25 - raise * (Math.PI / 2 - 0.35);
            const px = cx + 24, py = cy - 6;
            for (let u = 0; u < 30; u++) {
                const x = px + Math.cos(railAng) * u, y = py + Math.sin(railAng) * u;
                P.px(x, y, C.steel); P.px(x + 1, y, C.steelD);
                if (u % 6 === 0) P.px(x - 1, y, C.steelL);
            }
            P.poly([[px - 4, py + 2], [px + 4, py - 1], [px + 6, py + 3], [px - 2, py + 5]], C.steelD);
            // little crew walks away before ignition
            const walk = seg(T, 12, 15) * 30;
            person(P, cx + 10 - walk, cy + 8, T, 1);
            person(P, cx + 40 - walk * 0.8, cy + 4, T, 2);
            person(P, cx - 30, cy + 16, T, 3);

            if (T < 8) {
                // assembly in hangar door, then rollout on a trailer
                const roll = seg(T, 4, 8);
                const sx = cx - 40 + roll * 62, sy = cy + 2 - roll * 8;
                P.rect(sx - 2, sy + 1, 26, 2, C.steelD);
                P.px(sx + 2, sy + 3, C.steelD); P.px(sx + 20, sy + 3, C.steelD);
                rocket(P, sx, sy, -0.25, 24, false, T, false);
                if (T < 4) { person(P, sx + 6, sy + 6, T, 4); person(P, sx + 16, sy + 7, T, 5); }
            } else if (T < 17.5) {
                rocket(P, px + Math.cos(railAng) * 2, py + Math.sin(railAng) * 2, railAng, 24, T >= 16, T, false);
            }
            // smoke billows from ignition onward
            if (T >= 16 && T < 23 && playing) for (let k = 0; k < 3; k++) smoke.push({ x: px + (Math.random() - 0.5) * 6, y: py, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 6, r: 1.5 + Math.random() * 2, life: 2.5 });
            for (const s of smoke) P.disc(s.x, s.y + cam, s.r, s.life > 1.2 ? C.smoke : C.smokeD);
        }
        for (let i = smoke.length - 1; i >= 0; i--) {
            const s = smoke[i];
            s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.r += dt * 2.4; s.life -= dt;
            if (s.life <= 0) smoke.splice(i, 1);
        }

        // flying rocket, drawn in screen space
        if (T >= 17.5) {
            const sx = 124 + Math.sin(T * 0.6) * 1.5 + (T - 17.5) * 1.2, sy = 102 - (lift - cam) - 4;
            const sep = T >= 24;
            rocket(P, sx, sy, -Math.PI / 2 + 0.06, 24, T < 24 || (T > 24.6 && T < 26), T, sep);
            if (sep) {
                const fall = (T - 24) * 14;
                rocket(P, sx - 6 - fall * 0.3, sy + 6 + fall, -Math.PI / 2 + 0.6 + (T - 24), 10, false, T, false);
            }
            if (T >= 26) {
                const k = T - 26;
                if (alt > 0.85) {
                    for (let x = 0; x < W; x++) {
                        const y = H - 10 + ((x - W / 2) / W) ** 2 * 30, land = Math.sin(x * 0.07 + k * 0.05) + Math.sin(x * 0.19 + 2) * 0.6;
                        for (let yy = Math.floor(y); yy < H; yy++) P.px(x, yy, land + (yy - y) * 0.05 > 0.7 ? C.earthG : C.earth);
                    }
                    for (let x = 0; x < W; x++) { const y = H - 11 + ((x - W / 2) / W) ** 2 * 30; P.px(x, y, [170, 220, 255, 255]); }
                }
                patch(P, sx - 12 - k * 6, sy - 6 - k * 2, 6 + Math.min(6, k * 2), k * 0.8);
            }
        }
        P.tear(21, 7);
        P.flush();
        onTick && onTick(T, prevT);
    }

    function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        frame(dt);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return {
        seek(t) { T = Math.max(0, Math.min(DURATION, t)); smoke.length = 0; },
        play() { if (T >= DURATION) T = 0; playing = true; },
        pause() { playing = false; },
        toggle() { if (playing) this.pause(); else this.play(); return playing; },
        get time() { return T; },
        get playing() { return playing; },
    };
}
