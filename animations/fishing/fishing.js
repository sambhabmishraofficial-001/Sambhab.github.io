// Fishing at the village pond: a man casts, waits through a nibble, strikes, lands a fish in his basket,
// while an egret wades and pecks beside a thatched hut and a coconut palm.
import { ease, clamp, lerp, makeScene } from '../scenekit.js';

export const config = { id: 'village-fishing', title: 'Fishing in the village', grid: 144, loop: 12, fps: 60 };

const C = {
    grass: '#b8c39c', edge: '#a3b18b', light: '#ced5b7', shade: '#929e7b',
    bank: '#a59c83', water: '#7398a2', waterLight: '#93b0b4', waterDark: '#5f8590', pad: '#6f9a4f', padDark: '#557a3c', lotus: '#e8a3b0',
    mud: '#c9a27a', mudShade: '#a7825d', thatch: '#c9b06a', thatchDark: '#9c8648', door: '#5b4636',
    trunk: '#8a6a4c', trunkLight: '#a98760', frond: '#6f9a4f', frondDark: '#4f7a3a', coconut: '#7a5a34',
    skin: '#b97a52', skinShade: '#8e5a3b', hair: '#2f2a26', vest: '#f2edde', vestShade: '#c8c5ae', lungi: '#3f7f8c', lungiDark: '#2f6470',
    gamcha: '#c2364a', gamchaLight: '#f2edde', stone: '#969b8e', stoneLight: '#b0b4a8',
    rod: '#a07a3e', line: '#5b6b70', float: '#e5823a', floatTop: '#f7f2e4',
    fish: '#b9c4c8', fishBack: '#7d8c92', basket: '#b88a4f', basketDark: '#8a6236',
    egret: '#fbf9f2', egretShade: '#d9d6c8', beak: '#e1b84f', leg: '#3a3530', ripple: '#c3d6db'
};
config.palette = Object.values(C);

const BUTT = [65, 87], ROD = 34, FLOAT = [101, 99], BASKET = [76, 90];

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    const deg = Math.PI / 180;
    let a = 30;
    if (t < 0.5) a = lerp(30, 82, ease(t / 0.5));
    else if (t < 0.9) a = lerp(82, 22, ease((t - 0.5) / 0.4));
    else if (t < 1.4) a = lerp(22, 30, ease((t - 0.9) / 0.5));
    else if (t >= 7 && t < 7.5) a = lerp(30, 72, ease((t - 7) / 0.5));
    else if (t >= 7.5 && t < 9.2) a = lerp(72, 58, ease((t - 7.5) / 1.7));
    else if (t >= 9.2 && t < 10.2) a = lerp(58, 30, ease((t - 9.2) / 1));
    const tip = [BUTT[0] + ROD * Math.cos(a * deg), BUTT[1] - ROD * Math.sin(a * deg)];

    let float = null, fish = null;
    if (t >= 0.7 && t < 1.25) {
        const k = (t - 0.7) / 0.55;
        float = [lerp(tip[0], FLOAT[0], k), lerp(tip[1], FLOAT[1], k) - 10 * Math.sin(k * Math.PI)];
    } else if (t >= 1.25 && t < 7) {
        const nibble = t > 5.1 && t < 5.5 ? Math.sin((t - 5.1) / 0.4 * Math.PI) : 0;
        const bite = t > 6.5 ? ease((t - 6.5) / 0.4) * 3 : 0;
        float = [FLOAT[0], FLOAT[1] + 0.5 * Math.sin(t * 3) + nibble + bite];
    } else if (t >= 10.2) {
        float = [FLOAT[0], FLOAT[1]];
    }
    if (t >= 7.2 && t < 9.6) {
        const k = ease((t - 7.2) / 2.4);
        fish = { x: lerp(FLOAT[0], BASKET[0], k), y: lerp(FLOAT[1], BASKET[1] - 3, k) - 18 * Math.sin(k * Math.PI), flip: Math.sin(t * 18) > 0 };
    }
    const ring = t >= 1.25 && t < 2.4 ? (t - 1.25) / 1.15 : t >= 6.6 && t < 7.8 ? (t - 6.6) / 1.2 : null;
    const peck = (t > 3 && t < 3.7) || (t > 10.3 && t < 11) ? Math.sin(((t > 10 ? t - 10.3 : t - 3) / 0.7) * Math.PI) : 0;
    const splash = t >= 9.5 && t < 10 ? 1 : 0;
    return { time: t, tip, float, fish, ring, peck, splash, sway: Math.sin(t * 1.3), breath: Math.sin(t * Math.PI / 3) };
}

function draw(g, s) {
    const { rect: r, dot, poly: p, ell, bar } = g;

    // Meadow footprint with a pond biting into its right side.
    p([[18, 92], [28, 84], [46, 80], [70, 79], [96, 81], [116, 86], [126, 94], [124, 103], [112, 110], [92, 114], [66, 115], [42, 112], [26, 106], [17, 99]], C.grass);
    p([[17, 99], [26, 106], [42, 112], [66, 115], [92, 114], [112, 110], [124, 103], [123, 107], [110, 113], [90, 117], [65, 118], [40, 115], [24, 109], [18, 103]], C.edge);
    p([[24, 88], [36, 84], [48, 84], [38, 87], [28, 90]], C.light);
    p([[72, 93], [88, 86], [110, 87], [124, 94], [122, 103], [110, 109], [92, 112], [76, 109], [68, 102], [68, 96]], C.bank);
    p([[74, 94], [89, 88], [109, 89], [121, 95], [120, 102], [109, 107], [92, 110], [77, 107], [70, 101], [70, 97]], C.water);
    p([[78, 95], [90, 90], [104, 90], [96, 92], [84, 96]], C.waterLight);
    p([[80, 106], [96, 108], [110, 105], [104, 108], [92, 109]], C.waterDark);
    ell(86, 103, 3, 1.2, C.pad); dot(86, 103, C.padDark);
    ell(116, 99, 2.6, 1, C.pad);
    ell(93, 106, 2.4, 1, C.pad); r(93, 104, 2, 1, C.lotus); dot(93, 103, C.lotus);

    // Thatched hut with mud walls.
    ell(36, 88, 15, 2.5, C.shade);
    p([[24, 74], [46, 72], [47, 87], [26, 88]], C.mud);
    p([[20, 72], [24, 74], [26, 88], [22, 85]], C.mudShade);
    r(33, 77, 6, 10, C.door);
    r(41, 77, 3, 3, C.door);
    p([[16, 74], [33, 56], [52, 71], [49, 75], [20, 77]], C.thatch);
    p([[16, 74], [20, 77], [49, 75], [52, 71], [50, 74], [20, 78]], C.thatchDark);
    for (let x = 22; x < 48; x += 4) bar([x, 74], [33 + (x - 33) * 0.4, 60], 1, C.thatchDark);

    // Coconut palm behind the fisherman, fronds swaying.
    const top = [57 + s.sway * 0.6, 50];
    for (let i = 0; i < 6; i++) {
        const u = i / 6, x = lerp(53, top[0], u), y = lerp(86, top[1], u);
        bar([x, y], [lerp(53, top[0], u + 1 / 6), lerp(86, top[1], u + 1 / 6)], 2.4, i % 2 ? C.trunk : C.trunkLight);
    }
    for (const [dx, dy, c] of [[-14, 5, C.frondDark], [14, 4, C.frondDark], [-10, -5, C.frond], [11, -6, C.frond], [-3, -9, C.frond], [16, 9, C.frond], [-16, 10, C.frond]]) {
        const tipF = [top[0] + dx + s.sway * (dy > 0 ? 1.2 : 0.6), top[1] + dy];
        bar(top, [(top[0] + tipF[0]) / 2, Math.min(top[1], tipF[1]) - 2], 2, c);
        bar([(top[0] + tipF[0]) / 2, Math.min(top[1], tipF[1]) - 2], tipF, 1.4, c);
    }
    ell(top[0] - 1, top[1] + 2, 1.6, 1.6, C.coconut);
    ell(top[0] + 2, top[1] + 2, 1.6, 1.6, C.coconut);

    // Fisherman seated on a stone at the water's edge.
    ell(62, 98, 9, 2, C.shade);
    ell(61, 96, 5, 2.4, C.stone);
    ell(60, 95, 3.4, 1.4, C.stoneLight);
    p([[56, 90], [63, 89], [69, 85], [71, 88], [66, 92], [70, 96], [66, 97], [60, 94]], C.lungi);
    p([[56, 90], [60, 94], [66, 97], [62, 97], [56, 94]], C.lungiDark);
    r(68, 95, 4, 2, C.skin);
    r(69, 87, 3, 2, C.skinShade);
    const b = s.breath * 0.3;
    p([[56, 78], [62, 77], [64, 82], [63, 90], [56, 91], [55 - b, 84]], C.vest);
    p([[56, 78], [58, 78], [58, 90], [56, 91], [55 - b, 84]], C.vestShade);
    r(59, 74, 3, 4, C.skinShade);
    ell(61, 71, 3.6, 3.8, C.skin);
    ell(60, 68.6, 4, 2.2, C.gamcha);
    for (const x of [58, 60, 62]) dot(x, 68, C.gamchaLight);
    p([[57, 69], [54, 74], [55, 75], [58, 71]], C.gamcha);
    dot(63, 70, C.hair);

    // Basket by the water; a splash of scales when the catch drops in.
    ell(BASKET[0], BASKET[1] + 4, 5, 1.2, C.shade);
    for (let y = BASKET[1]; y <= BASKET[1] + 4; y++) r(BASKET[0] - 4 + (y - BASKET[1] > 2 ? 1 : 0), y, 8 - (y - BASKET[1] > 2 ? 2 : 0), 1, (y - BASKET[1]) % 2 ? C.basketDark : C.basket);
    ell(BASKET[0], BASKET[1], 4, 1.2, C.basketDark);
    if (s.splash) { dot(BASKET[0] - 2, BASKET[1] - 3, C.fish); dot(BASKET[0] + 2, BASKET[1] - 4, C.fish); dot(BASKET[0], BASKET[1] - 5, C.ripple); }

    // Rod, hands, and the line out to the float or the hooked fish.
    const tip = s.tip;
    bar(BUTT, tip, 1, C.rod);
    const grip = [BUTT[0] + (tip[0] - BUTT[0]) * 0.12, BUTT[1] + (tip[1] - BUTT[1]) * 0.12];
    bar([57, 80], [60, 87], 2.4, C.vestShade);
    bar([60, 87], [grip[0] - 1, grip[1] + 1], 1.8, C.skinShade);
    bar([62, 80], [66, 84], 2.4, C.vest);
    bar([66, 84], grip, 1.8, C.skin);
    r(grip[0] - 1, grip[1] - 1, 2, 2, C.skin);

    const end = s.fish ? [s.fish.x, s.fish.y] : s.float;
    if (end) {
        const n = Math.max(2, Math.ceil(Math.hypot(end[0] - tip[0], end[1] - tip[1])));
        const sag = s.fish ? 0 : 3;
        for (let i = 0; i <= n; i++) {
            const k = i / n;
            dot(lerp(tip[0], end[0], k), lerp(tip[1], end[1], k) + sag * Math.sin(k * Math.PI), C.line);
        }
    } else {
        bar(tip, [tip[0] + 1, tip[1] + 8], 1, C.line);
    }
    if (s.float && !s.fish && s.float[1] < FLOAT[1] + 2) {
        r(s.float[0] - 1, s.float[1] - 1, 2, 2, C.float);
        dot(s.float[0], s.float[1] - 2, C.floatTop);
    }
    if (s.ring !== null) {
        const rx = 2 + s.ring * 6, ry = 1 + s.ring * 2;
        for (let k = 0; k < 10; k++) {
            const an = k / 10 * Math.PI * 2;
            dot(FLOAT[0] + Math.cos(an) * rx, FLOAT[1] + 1 + Math.sin(an) * ry, C.ripple);
        }
    }
    if (s.fish) {
        const { x, y, flip } = s.fish, d = flip ? 1 : -1;
        p([[x - 3 * d, y - 1], [x + 2 * d, y - 1.5], [x + 3 * d, y], [x + 2 * d, y + 1.5], [x - 3 * d, y + 1]], C.fish);
        r(Math.min(x - 2 * d, x + 2 * d), y - 1, 4, 1, C.fishBack);
        p([[x - 3 * d, y], [x - 5 * d, y - 2], [x - 5 * d, y + 2]], C.fishBack);
        dot(x + 2 * d, y - 0.5, C.hair);
    }

    // Egret wading, dipping its beak now and then.
    const ex = 114, ey = 92;
    bar([ex - 1, ey + 2], [ex - 2, 100], 1, C.leg);
    bar([ex + 1, ey + 2], [ex + 1, 100], 1, C.leg);
    r(ex - 4, 100, 3, 1, C.waterLight);
    r(ex, 100, 3, 1, C.waterLight);
    ell(ex, ey, 3.6, 2.2, C.egret);
    p([[ex + 1, ey + 1], [ex + 5, ey + 1], [ex + 3, ey + 2.5]], C.egretShade);
    const head = [ex - 4 - s.peck * 2, ey - 7 + s.peck * 9];
    bar([ex - 2, ey - 1], [ex - 4 - s.peck, ey - 4 + s.peck * 4], 1.4, C.egret);
    bar([ex - 4 - s.peck, ey - 4 + s.peck * 4], head, 1.4, C.egret);
    ell(head[0], head[1], 1.4, 1.2, C.egret);
    bar([head[0] - 1, head[1]], [head[0] - 4, head[1] + 1 + s.peck], 1, C.beak);
    dot(head[0], head[1] - 0.5, C.leg);
}

export default makeScene(config, state, draw);
