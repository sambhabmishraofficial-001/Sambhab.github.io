import { Pix, hex, mix, hash2 } from '../pixkit.js';

const W = 224, H = 140;
const CX = 112, BOTTOM = 116, R = 44, FLAT = 16, CY = BOTTOM - R, G = 260;

const C = {
    skyT: hex('#f6c9a0'), skyB: hex('#fdeedd'), sun: hex('#ffe2a8'),
    grassD: hex('#3f6b2f'), grass: hex('#5a8f3a'), grassL: hex('#86b95a'),
    trunk: hex('#5a3a26'), leafD: hex('#2f5a2a'), leaf: hex('#447a33'), leafL: hex('#6ea446'),
    wood: hex('#c79a63'), woodD: hex('#9c7244'), woodL: hex('#e2bd86'), plank: hex('#a97d4c'),
    frame: hex('#6b4a2e'), coping: hex('#cfd6dc'), copingD: hex('#7f8a93'), concrete: hex('#c9c3b8'), concreteD: hex('#a39d92'),
    rail: hex('#3a3f45'), skin: hex('#c98e62'), hoodie: hex('#2f6fd6'), hoodieD: hex('#1f4c99'), pants: hex('#2b2b38'),
    cap: hex('#e2483d'), shoe: hex('#f2f2f2'), deck: hex('#2a2a2a'), wheel: hex('#f2d16b'), lamp: hex('#fff4c2'), cone: hex('#ef7a2b'),
};

const pathPoint = th => {
    const flat = FLAT * Math.max(-1, Math.min(1, th / 0.35));
    return [CX + flat + R * Math.sin(th), CY + R * Math.cos(th)];
};

function scenery(P, t) {
    P.grad(0, 0, W, 90, C.skyT, C.skyB, 8);
    P.disc(178, 30, 11, C.sun);
    for (let k = 0; k < 3; k++) {
        const x = ((k * 90 + t * (1.5 + k * 0.5)) % (W + 50)) - 25;
        P.ellipse(x, 16 + k * 8, 14 - k * 3, 2.5, [255, 255, 255, 170]);
    }
    // grassy island
    for (let x = 0; x < W; x++) {
        const top = 94 + Math.sin(x * 0.07) * 1.5;
        for (let y = Math.floor(top); y < H; y++) {
            const n = hash2(x, y, 2);
            P.px(x, y, n > 0.82 ? C.grassL : n < 0.18 ? C.grassD : C.grass);
        }
    }
    // neem trees behind the ramp
    const trees = [[18, 96, 13], [46, 92, 10], [196, 95, 14], [168, 91, 9]];
    for (const [x, y, s] of trees) {
        P.rect(x - 1, y - s * 1.6, 3, s * 1.6, C.trunk);
        const sway = Math.sin(t * 0.9 + x) * 0.8;
        P.disc(x + sway, y - s * 2, s, C.leafD);
        P.disc(x - s * 0.4 + sway, y - s * 2.2, s * 0.7, C.leaf);
        P.disc(x + s * 0.4 + sway, y - s * 2.4, s * 0.55, C.leafL);
        for (let k = 0; k < 10; k++) P.px(x + sway + (hash2(k, x, 1) - 0.5) * s * 1.8, y - s * 2 + (hash2(x, k, 1) - 0.5) * s * 1.6, C.leafL);
    }
    // lamp post
    P.rect(206, 62, 2, 40, C.rail);
    P.rect(202, 60, 10, 3, C.rail);
    P.disc(207, 64, 2.5, C.lamp);
}

function ramp(P) {
    // concrete slab
    P.rect(CX - FLAT - R - 26, BOTTOM, (FLAT + R + 26) * 2, 6, C.concrete);
    P.rect(CX - FLAT - R - 26, BOTTOM + 6, (FLAT + R + 26) * 2, 2, C.concreteD);
    // side frame fill under the transition
    for (let y = CY; y <= BOTTOM; y++) {
        for (const side of [-1, 1]) {
            const dy = y - CY, off = Math.sqrt(Math.max(0, R * R - dy * dy));
            const inner = CX + side * (FLAT + R - off), outer = CX + side * (FLAT + R + 4);
            const a = Math.min(inner, outer), b = Math.max(inner, outer);
            for (let x = Math.round(a); x < Math.round(b); x++) {
                const stud = (Math.abs(x - CX) % 10 === 0) || ((y - CY) % 11 === 0);
                P.px(x, y, stud ? C.frame : (hash2(x, y, 4) > 0.9 ? C.woodD : C.wood));
            }
        }
    }
    // riding surface
    for (let k = 0; k <= 400; k++) {
        const th = -Math.PI / 2 + Math.PI * k / 400, [x, y] = pathPoint(th);
        P.px(x, y, C.woodL); P.px(x, y + 1, C.woodD);
    }
    P.rect(CX - FLAT, BOTTOM - 1, FLAT * 2, 1, C.woodL);
    // decks, coping and railings
    for (const side of [-1, 1]) {
        const x0 = side < 0 ? CX - FLAT - R - 24 : CX + FLAT + R;
        P.rect(x0, CY, 24, BOTTOM - CY, C.wood);
        for (let y = CY + 6; y < BOTTOM; y += 8) P.rect(x0, y, 24, 1, C.plank);
        P.rect(x0, CY - 1, 24, 2, C.woodL);
        const cx = CX + side * (FLAT + R);
        P.rect(cx - 1, CY - 2, 3, 3, C.coping); P.px(cx, CY + 1, C.copingD);
        const rx = side < 0 ? x0 + 2 : x0 + 21;
        P.rect(rx, CY - 14, 1, 14, C.rail);
        P.rect(side < 0 ? x0 + 2 : x0 + 8, CY - 14, 14, 1, C.rail);
        P.rect(side < 0 ? x0 + 15 : x0 + 8, CY - 14, 1, 14, C.rail);
    }
    // traffic cone
    P.poly([[30, 116], [33, 106], [36, 116]], C.cone);
    P.rect(31, 111, 4, 1, [255, 255, 255, 255]);
}

function skater(P, s) {
    let bx, by, ang;
    if (s.air) {
        bx = CX + s.side * (FLAT + R) - s.side * 2;
        by = CY - s.h;
        ang = s.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
        [bx, by] = pathPoint(s.th);
        ang = -s.th * (Math.abs(s.th) > 0.35 ? 1 : Math.abs(s.th) / 0.35);
        if (!s.running) { bx = CX + FLAT + R + 8; by = CY - 1; ang = 0; }
    }
    // tangent (along board) and normal (towards the head)
    const tx = Math.cos(ang), ty = Math.sin(ang), nx = Math.sin(ang), ny = -Math.cos(ang);
    const at = (u, v) => [bx + tx * u + nx * v, by + ty * u + ny * v];
    const crouch = s.hold ? 0.72 : 1;
    // board
    for (let u = -4; u <= 4; u++) { const [x, y] = at(u, 1); P.px(x, y, C.deck); }
    for (const u of [-3, 3]) { const [x, y] = at(u, 0); P.px(x, y, C.wheel); }
    if (s.slam > 0) {
        for (let u = -5; u <= 2; u++) { const [x, y] = at(u, 2); P.px(x, y + 1, u > 0 ? C.skin : C.hoodie); }
        return;
    }
    // legs, torso, arms, head
    const hip = 6 * crouch, chest = hip + 5, head = chest + 3;
    for (let v = 2; v <= hip; v++) { const [x1, y1] = at(-1.5, v); const [x2, y2] = at(1.5, v); P.px(x1, y1, C.pants); P.px(x2, y2, C.pants); }
    for (const u of [-2, 2]) { const [x, y] = at(u, 2); P.px(x, y, C.shoe); }
    for (let v = hip; v <= chest; v++) for (let u = -1.5; u <= 1.5; u += 1) { const [x, y] = at(u, v); P.px(x, y, v > chest - 2 ? C.hoodie : C.hoodieD); }
    if (s.grab) {
        for (let k = 0; k <= 5; k++) { const [x, y] = at(2.5, chest - k * (chest - 2) / 5); P.px(x, y, C.skin); }
    } else {
        const swing = Math.sin(s.t * 6) * 1.5;
        for (let k = 0; k <= 4; k++) { const [x, y] = at(-2 - k * 0.9, chest - 1 - k * 0.4 + swing * 0.2); P.px(x, y, C.hoodie); }
        for (let k = 0; k <= 4; k++) { const [x, y] = at(2 + k * 0.9, chest - 1 - k * 0.4 - swing * 0.2); P.px(x, y, C.hoodie); }
    }
    const [hx, hy] = at(0, head + 1);
    P.disc(hx, hy, 2.2, C.skin);
    const [cx, cy] = at(0.5, head + 2.6);
    P.disc(cx, cy, 1.8, C.cap);
    const [vx, vy] = at(2.5, head + 2);
    P.px(vx, vy, C.cap);
}

export function createRamp(canvas, hud = {}) {
    const P = new Pix(canvas, W, H);
    const s = { th: Math.PI / 2, om: 0, air: false, h: 0, vy: 0, side: 1, hold: false, grab: false, grabT: 0, slam: 0, running: false, t: 0 };
    let score = 0, mult = 1, time = 60, best = Number(localStorage.getItem('ramp-best') || 0), msg = 'tap to drop in';
    let last = performance.now();
    canvas.rampState = s;

    const say = (text, dur = 1.2) => { msg = text; s.msgT = dur; };
    const report = () => hud.onUpdate && hud.onUpdate({ score: Math.round(score), mult, time: Math.max(0, Math.ceil(time)), best, msg: s.msgT > 0 || !s.running ? msg : '' });

    function start() {
        Object.assign(s, { th: Math.PI / 2 - 0.02, om: -0.4, air: false, h: 0, grab: false, slam: 0, running: true });
        score = 0; mult = 1; time = 60;
        say('pump it!', 1.5);
    }

    function press(down) {
        if (down && !s.running) { start(); return; }
        s.hold = down;
        if (s.air && down) s.grab = true;
        if (!down) s.grab = false;
    }

    function step(dt) {
        s.t += dt;
        if (s.msgT > 0) s.msgT -= dt;
        if (hud.demo) {
            if (!s.running) start();
            time = 60;
            s.hold = s.air ? s.vy > 0 || s.h > 12 : s.th * s.om < 0;
            s.grab = s.air && s.hold;
        }
        if (!s.running) return;
        time -= dt;
        if (time <= 0) {
            s.running = false;
            if (score > best) { best = Math.round(score); localStorage.setItem('ramp-best', best); }
            say(`time! ${Math.round(score)} pts · tap to go again`, 99);
            return;
        }
        if (s.slam > 0) {
            s.slam -= dt;
            if (s.slam <= 0) Object.assign(s, { th: 0.05, om: 0.6, air: false });
            return;
        }
        if (s.air) {
            s.vy -= G * dt;
            s.h += s.vy * dt;
            if (s.grab) s.grabT += dt;
            if (s.h <= 0) {
                s.air = false; s.h = 0;
                if (s.grab) {
                    s.slam = 1.1; mult = 1; s.grab = false;
                    say('slam! let go before landing', 1.4);
                    return;
                }
                const pts = s.peak * 2 * mult + (s.grabT > 0.12 ? 40 * mult : 0);
                score += pts;
                if (s.grabT > 0.12) { mult = Math.min(5, mult + 1); say(`grab! +${Math.round(pts)}  x${mult}`); }
                else say(`+${Math.round(pts)}`, 0.8);
                s.th = s.side * (Math.PI / 2 - 0.001);
                s.om = -s.side * s.launch * 0.97;
            }
            return;
        }
        const goingDown = s.th * s.om < 0;
        const alpha = -(G / R) * Math.sin(s.th) - 0.05 * s.om;
        s.om += alpha * dt;
        if (s.hold) s.om *= goingDown ? 1 + 1.0 * dt : 1 - 0.5 * dt;
        s.om = Math.max(-5, Math.min(5, s.om));
        s.th += s.om * dt;
        if (Math.abs(s.th) >= Math.PI / 2) {
            s.side = Math.sign(s.th);
            const v = Math.abs(s.om) * R;
            if (v > 30) {
                s.air = true; s.vy = v * 0.9; s.h = 0; s.peak = (s.vy * s.vy) / (2 * G); s.launch = Math.abs(s.om); s.grabT = 0; s.grab = s.hold && false;
            } else {
                s.th = s.side * Math.PI / 2; s.om = 0;
            }
        }
    }

    function render() {
        P.clear([255, 255, 255, 255]);
        scenery(P, s.t);
        ramp(P);
        skater(P, s);
        P.tear(12, 8);
        P.flush();
        report();
    }

    if (!hud.demo) {
        canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); press(true); });
        canvas.addEventListener('pointerup', () => press(false));
        canvas.addEventListener('pointercancel', () => press(false));
        window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(true); } });
        window.addEventListener('keyup', e => { if (e.code === 'Space') press(false); });
    }

    function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        step(dt);
        render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return { start };
}
