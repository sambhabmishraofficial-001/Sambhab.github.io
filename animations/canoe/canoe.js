// Two friends paddle a canoe across the river from one jetty to the other, turn around and paddle back,
// past pines on the far bank, swaying reeds and a fish that leaps from the current.
import { ease, clamp, lerp, makeScene } from '../scenekit.js';

export const config = { id: 'river-canoe', title: 'Canoe on the river', grid: 144, loop: 12, fps: 60 };

const C = {
    grass: '#b8c39c', edge: '#a3b18b', light: '#ced5b7', shade: '#929e7b',
    sand: '#d9c9a5', sandShade: '#c4b08a',
    water: '#7398a2', waterLight: '#93b0b4', waterDark: '#5f8590', foam: '#dce8ea',
    pine: '#4f7a3a', pineDark: '#3c5f2c', pineLight: '#6f9a4f', trunk: '#705237',
    rock: '#969b8e', rockLight: '#b0b4a8', reed: '#7d8a55', reedTop: '#8a6a4c',
    plank: '#a77c4e', plankShade: '#705237',
    hull: '#c4664f', hullDark: '#8f4239', hullLight: '#e0866c', paddle: '#c79c68', blade: '#a77c4e',
    skin: '#b97a52', skinShade: '#8e5a3b', hair: '#2f2a26', vestA: '#e5b45c', vestB: '#3f7f8c', cap: '#f2edde',
    fish: '#b9c4c8', fishBack: '#7d8c92'
};
config.palette = Object.values(C);

const X0 = 42, X1 = 102;

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    let k, dir, moving;
    if (t < 0.8) { k = 0; dir = 1; moving = false; }
    else if (t < 5.4) { k = ease((t - 0.8) / 4.6); dir = 1; moving = true; }
    else if (t < 6.6) { k = 1; dir = t < 6 ? 1 : -1; moving = false; }
    else if (t < 11.2) { k = 1 - ease((t - 6.6) / 4.6); dir = -1; moving = true; }
    else { k = 0; dir = 1; moving = false; }
    const x = lerp(X0, X1, k);
    const stroke = moving ? (t * 1.5) % 1 : 0.85;
    const jump = t > 2.4 && t < 3.3 ? (t - 2.4) / 0.9 : null;
    return { time: t, x, y: 96 + 0.5 * Math.sin(t * 2.2), dir, moving, stroke, jump, sway: Math.sin(t * 1.4) };
}

function pine(g, x, y, h) {
    const { poly: p, rect: r } = g;
    r(x - 1, y - 3, 2, 4, C.trunk);
    p([[x - h * 0.45, y - 2], [x, y - h * 0.55], [x + h * 0.45, y - 2]], C.pineDark);
    p([[x - h * 0.38, y - h * 0.3], [x, y - h * 0.8], [x + h * 0.38, y - h * 0.3]], C.pine);
    p([[x - h * 0.28, y - h * 0.55], [x, y - h], [x + h * 0.28, y - h * 0.55]], C.pineLight);
}

// One seated paddler; the paddle dips forward, pulls back through the water, then lifts out.
function paddler(g, x, y, d, shirt, phase) {
    const { rect: r, ell, bar, dot } = g;
    r(x - 2, y - 7, 4, 6, shirt);
    r(x - 2 + (d > 0 ? 0 : 3), y - 7, 1, 6, C.skinShade);
    r(x - 1, y - 8, 2, 1, C.skinShade);
    ell(x, y - 10.5, 2.4, 2.4, C.skin);
    ell(x - d * 0.6, y - 11.6, 2.4, 1.4, C.hair);
    dot(x + d * 1.6, y - 10.5, C.hair);
    const inWater = phase < 0.6, u = inWater ? phase / 0.6 : (phase - 0.6) / 0.4;
    const bladeX = inWater ? lerp(x + d * 8, x - d * 4, u) : lerp(x - d * 4, x + d * 8, u);
    const bladeY = inWater ? y + 3 : y + 1 - 3 * Math.sin(u * Math.PI);
    const grip = [x + d * 1 + (bladeX - x) * 0.25, y - 9];
    bar(grip, [bladeX, bladeY], 1, C.paddle);
    r(bladeX - 1, bladeY - 1, 2, 3, C.blade);
    bar([x + d * 1, y - 6], [grip[0], grip[1] + 1], 1.4, C.skin);
    bar([x + d * 1, y - 5], [lerp(grip[0], bladeX, 0.35), lerp(grip[1], bladeY, 0.35)], 1.4, C.skinShade);
    if (inWater && u > 0.2) { dot(bladeX + d * 2, y + 2, C.foam); dot(bladeX + d * 3, y + 3, C.foam); }
}

function draw(g, s) {
    const { rect: r, dot, poly: p, ell, bar } = g;

    // Two banks with the river running through the middle.
    p([[12, 94], [24, 84], [46, 79], [72, 78], [100, 79], [122, 85], [134, 94], [131, 104], [116, 112], [92, 116], [62, 117], [36, 114], [18, 108], [11, 101]], C.grass);
    p([[11, 101], [18, 108], [36, 114], [62, 117], [92, 116], [116, 112], [131, 104], [130, 108], [114, 115], [90, 119], [60, 120], [34, 117], [16, 111], [12, 105]], C.edge);
    p([[12, 93], [30, 87], [60, 86], [92, 87], [120, 88], [133, 92], [133, 101], [112, 105], [80, 106], [50, 105], [24, 104], [11, 100]], C.sand);
    p([[12, 94], [30, 89], [60, 88], [92, 89], [120, 90], [132, 93], [132, 100], [112, 103], [80, 104], [50, 103], [24, 102], [12, 99]], C.water);
    p([[12, 98], [24, 101], [50, 102], [80, 103], [112, 102], [132, 99], [132, 100], [112, 103], [80, 104], [50, 103], [24, 102], [12, 99]], C.waterDark);
    for (let i = 0; i < 14; i++) {
        const x = 14 + ((i * 17 + s.time * 7) % 116), y = 91 + (i * 5) % 10;
        r(x, y, 3, 1, i % 3 ? C.waterLight : C.foam);
    }

    // Far bank: pines, a couple of rocks.
    pine(g, 26, 88, 18); pine(g, 38, 85, 24); pine(g, 50, 84, 16);
    pine(g, 98, 84, 20); pine(g, 112, 86, 26); pine(g, 124, 89, 16);
    ell(70, 85, 5, 2.4, C.rock); ell(69, 84, 3, 1.2, C.rockLight);
    ell(80, 86, 3, 1.6, C.rock);

    // Leaping fish arcs out of the current mid-river.
    if (s.jump !== null) {
        const fx = 88 + s.jump * 10, fy = 97 - 9 * Math.sin(s.jump * Math.PI), up = s.jump < 0.5;
        p([[fx - 3, fy + (up ? 1 : -1)], [fx + 2, fy - (up ? 1 : -1)], [fx + 3, fy], [fx - 2, fy + (up ? 2 : -2)]], C.fish);
        dot(fx + 2, fy - 0.5, C.fishBack);
        if (s.jump < 0.15 || s.jump > 0.85) { dot(fx - 2, 98, C.foam); dot(fx + 2, 98, C.foam); }
    }

    // The canoe with its wake.
    const x = s.x, y = s.y, d = s.dir;
    if (s.moving) for (let k = 1; k <= 5; k++) {
        dot(x - d * (13 + k * 4), y + 2 - k * 0.5, C.foam);
        dot(x - d * (13 + k * 4), y + 3 + k * 0.5, C.waterLight);
    }
    paddler(g, x - d * 6, y, d, C.vestB, (s.stroke + 0.5) % 1);
    paddler(g, x + d * 6, y, d, C.vestA, s.stroke);
    p([[x - 14, y - 1], [x - 12, y], [x + 12, y], [x + 14, y - 1], [x + 11, y + 3], [x - 11, y + 3]], C.hull);
    r(x - 12, y, 24, 1, C.hullLight);
    r(x - 10, y + 2, 20, 1, C.hullDark);
    dot(x - 14, y - 1, C.hullDark); dot(x + 14, y - 1, C.hullDark);
    r(x - 11, y + 4, 22, 1, C.waterDark);

    // Near bank: two jetties, reeds, rocks.
    const jetty = jx => {
        r(jx + 3, 101, 1, 4, C.plankShade);
        r(jx + 12, 101, 1, 4, C.plankShade);
        p([[jx, 108], [jx + 14, 108], [jx + 15, 100], [jx + 2, 100]], C.plank);
        for (let y = 101; y < 108; y += 2) r(jx + 1, y, 14, 1, C.plankShade);
        r(jx, 108, 14, 1, C.plankShade);
    };
    jetty(22);
    jetty(110);
    for (const [rx, ry] of [[40, 106], [46, 107], [62, 107], [86, 107], [94, 106], [104, 106]]) {
        const lean = Math.round(s.sway * (rx % 2 ? 1 : 0.6));
        bar([rx, ry], [rx + lean, ry - 6], 1, C.reed);
        bar([rx + 2, ry], [rx + 2 + lean, ry - 4], 1, C.reed);
        r(rx + lean, ry - 8, 1, 2, C.reedTop);
    }
    ell(74, 110, 4, 2, C.rock); ell(73, 109, 2.4, 1, C.rockLight);
    ell(54, 112, 2.6, 1.2, C.rock);
}

export default makeScene(config, state, draw);
