// A roadside chai stall: the chaiwala pulls a long pour between two cups, the kettle steams,
// a customer on the bench sips, and a stray dog naps in the shade.
import { ease, clamp, makeScene } from '../scenekit.js';

export const config = { id: 'chai-stall', title: 'Chai on the corner', grid: 144, loop: 12, fps: 60 };

const C = {
    ground: '#d9c9a5', groundEdge: '#c4b08a', groundLight: '#e6dabd', shade: '#b59f78',
    wood: '#a77c4e', woodShade: '#705237', woodLight: '#c79c68',
    tarp: '#3f7f8c', tarpLight: '#5c9aa5', tarpStripe: '#e1b84f',
    board: '#c2364a', letter: '#f7f2e4',
    steel: '#b9bdb8', steelDark: '#868b86', steelLight: '#e3e5df',
    flame: '#e5823a', flameCore: '#f3c25a', stove: '#4a4a46',
    tea: '#b9824f', teaLight: '#d9a877', froth: '#e8cfa6', glass: '#d7dfdc', steam: '#e9e6dc',
    skin: '#b97a52', skinShade: '#8e5a3b', hair: '#2f2a26',
    vest: '#4e5a63', shirt: '#f2edde', shirtShade: '#c8c5ae', lungi: '#6f9a4f',
    customer: '#c2364a', customerShade: '#8f2a37', pants: '#4e5a63',
    dog: '#c99a5a', dogShade: '#9c7340', dogDark: '#5b4636'
};
config.palette = Object.values(C);

// 3x5 pixel letters for the stall sign.
const GLYPH = {
    C: ['111', '100', '100', '100', '111'],
    H: ['101', '101', '111', '101', '101'],
    A: ['010', '101', '111', '101', '101'],
    I: ['111', '010', '010', '010', '111']
};

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    // Two long pours per loop: the cup rises, the stream stretches, then it comes back down.
    const pourCycle = t < 6 ? t / 6 : (t - 6) / 6;
    const lift = ease(clamp((pourCycle - 0.1) / 0.3)) * (1 - ease(clamp((pourCycle - 0.7) / 0.25)));
    const pouring = pourCycle > 0.12 && pourCycle < 0.9;
    const sip = ease((t - 8.6) / 0.8) * (1 - ease((t - 10.4) / 0.8));
    const flicker = Math.sin(t * 23) * 0.5 + Math.sin(t * 37) * 0.5;
    const ear = (t % 5) > 4.6 ? 1 : 0;
    return { time: t, lift, pouring, sip, flicker, ear, breath: Math.sin(t * Math.PI / 2.5) };
}

function draw(g, s) {
    const { rect: r, dot, poly: p, ell, bar } = g;

    // Street corner ground.
    p([[14, 96], [26, 87], [46, 83], [74, 82], [100, 83], [120, 88], [130, 96], [127, 105], [112, 112], [88, 116], [60, 117], [36, 114], [20, 108], [13, 101]], C.ground);
    p([[13, 101], [20, 108], [36, 114], [60, 117], [88, 116], [112, 112], [127, 105], [126, 109], [110, 115], [86, 119], [58, 120], [34, 117], [18, 111], [14, 105]], C.groundEdge);
    p([[28, 89], [42, 85], [56, 85], [44, 88], [32, 91]], C.groundLight);

    // Tarp canopy on two poles, high enough to clear the chaiwala's head.
    bar([24, 30], [24, 96], 1.6, C.woodShade);
    bar([86, 26], [86, 94], 1.6, C.woodShade);
    p([[18, 30], [52, 20], [92, 26], [60, 38]], C.tarp);
    for (let i = 0; i < 4; i++) {
        const k = i / 4 + 0.08;
        p([[18 + k * 34, 30 - k * 10], [21 + k * 34, 29 - k * 10], [63 + k * 32, 37 - k * 12 + 1], [60 + k * 32, 38 - k * 12 + 1]], C.tarpStripe);
    }
    p([[18, 30], [60, 38], [60, 40], [18, 32]], C.tarpLight);
    for (let x = 20; x < 60; x += 4) dot(x, 32 + (x - 18) * 0.19, C.tarpLight);

    // Sign board hanging from the canopy edge, left of the chaiwala.
    bar([28, 33], [28, 40], 1, C.woodShade);
    bar([42, 35], [42, 42], 1, C.woodShade);
    p([[24, 40], [46, 42], [46, 50], [24, 48]], C.board);
    let cx = 26;
    for (const ch of 'CHAI') {
        GLYPH[ch].forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') dot(cx + x, 42 + y + Math.round((cx + x - 24) * 0.09), C.letter); }));
        cx += 5;
    }

    // Stall counter.
    ell(56, 98, 30, 3, C.shade);
    p([[26, 76], [82, 74], [88, 78], [32, 80]], C.woodLight);
    p([[32, 80], [88, 78], [88, 96], [32, 98]], C.wood);
    for (let y = 84; y < 96; y += 5) bar([33, y + 1], [87, y - 1], 1, C.woodShade);
    p([[26, 76], [32, 80], [32, 98], [26, 94]], C.woodShade);

    // Glasses lined up on the counter.
    for (const x of [34, 38, 42]) { r(x, 73, 3, 4, C.glass); r(x, 75, 3, 2, C.tea); }

    // Chaiwala behind the counter: low hand holds the glass, high hand lifts the steel cup.
    const lowCup = [58, 72], highCup = [60 + s.lift * 2, 66 - s.lift * 22];
    p([[49, 52], [57, 51], [60, 56], [61, 76], [48, 77], [47, 58]], C.shirt);
    p([[49, 53], [53, 52], [55, 62], [54, 76], [48, 77], [47, 58]], C.vest);
    p([[57, 53], [60, 56], [61, 76], [57, 76], [58, 62]], C.vest);
    r(51, 77, 9, 2, C.lungi);
    ell(54, 46, 4.2, 4.6, C.skin);
    ell(53.4, 43.4, 4.2, 2.6, C.hair);
    r(55, 47, 4, 1, C.hair);
    dot(56, 45, C.hair);
    r(52, 50, 3, 2, C.skinShade);

    bar([49, 55], [46, 64], 2.6, C.shirtShade);
    bar([46, 64], [lowCup[0] - 2, lowCup[1] + 1], 2, C.skinShade);
    bar([58, 54], [63, 58 - s.lift * 10], 2.6, C.shirt);
    bar([63, 58 - s.lift * 10], [highCup[0] - 1, highCup[1] + 2], 2, C.skin);

    // Cups, the long tea stream with a frothy landing, and froth topping the glass.
    r(lowCup[0], lowCup[1], 4, 5, C.glass);
    r(lowCup[0], lowCup[1] + 2, 4, 3, C.tea);
    r(lowCup[0], lowCup[1] + 1, 4, 1, C.froth);
    r(highCup[0], highCup[1], 4, 4, C.steel);
    r(highCup[0] + 3, highCup[1], 1, 4, C.steelDark);
    dot(highCup[0], highCup[1], C.steelLight);
    if (s.pouring) {
        const x = highCup[0] + 0.5, y0 = highCup[1] + 4, y1 = lowCup[1];
        for (let y = y0; y < y1; y++) dot(x + Math.round(Math.sin(y * 0.7 + s.time * 20) * 0.3), y, (y % 3) ? C.tea : C.teaLight);
        dot(lowCup[0] + 1, lowCup[1] - 1, C.froth);
        dot(lowCup[0] + 3, lowCup[1] - 1, C.froth);
    }

    // Stove with a flickering flame and a big kettle.
    r(68, 69, 12, 6, C.stove);
    r(69, 68, 10, 1, C.steelDark);
    const fl = Math.round(s.flicker);
    p([[70, 69], [74, 66 + fl], [78, 69]], C.flame);
    p([[72, 69], [74, 67 + fl], [76, 69]], C.flameCore);
    ell(74, 61, 6, 5, C.steel);
    ell(72, 59, 2.4, 2, C.steelLight);
    r(70, 55, 8, 1, C.steelDark);
    bar([80, 61], [84, 56], 1.4, C.steelDark);
    bar([70, 56], [74, 52], 1, C.steelDark);
    bar([74, 52], [78, 56], 1, C.steelDark);

    // Steam curls from the kettle spout and the fresh glass.
    for (let i = 0; i < 6; i++) {
        const ph = (s.time * 0.35 + i / 6) % 1, src = i % 2 ? [84, 54] : [60, 70];
        if (ph < 0.8) dot(src[0] + Math.sin(ph * 8 + i) * 2 + ph * 3, src[1] - ph * 18, C.steam);
    }

    // Bench and customer sipping.
    ell(108, 101, 14, 2.4, C.shade);
    p([[94, 88], [122, 86], [124, 89], [96, 91]], C.woodLight);
    r(96, 91, 2, 9, C.woodShade);
    r(120, 89, 2, 10, C.woodShade);
    r(107, 90, 2, 9, C.woodShade);
    p([[102, 88], [112, 87], [114, 92], [116, 99], [112, 99], [110, 92], [104, 92], [104, 99], [100, 99], [101, 92]], C.pants);
    r(99, 99, 5, 2, C.dogDark);
    r(111, 99, 5, 2, C.dogDark);
    const cb = s.breath * 0.3;
    p([[102, 72], [110, 71], [113, 76], [113, 88], [101, 89], [100, 78 - cb]], C.customer);
    p([[102, 72], [105, 72], [104, 88], [101, 89], [100, 78 - cb]], C.customerShade);
    ell(106, 66, 4, 4.4, C.skin);
    ell(106.6, 63.6, 4.2, 2.4, C.hair);
    r(103, 64, 2, 3, C.hair);
    const hand = [101 - s.sip * 1, 82 - s.sip * 14];
    bar([104, 74], [99, 80 - s.sip * 4], 2.6, C.customerShade);
    bar([99, 80 - s.sip * 4], hand, 2, C.skin);
    r(hand[0] - 2, hand[1] - 3, 3, 4, C.glass);
    r(hand[0] - 2, hand[1] - 2, 3, 3, C.tea);
    if (s.sip < 0.3) for (let i = 0; i < 2; i++) { const ph = (s.time * 0.5 + i / 2) % 1; dot(hand[0] - 1 + Math.sin(ph * 7) * 1.5, hand[1] - 5 - ph * 10, C.steam); }

    // Sleeping dog curled at the front, flank rising with each breath.
    const db = Math.max(0, s.breath) * 0.8;
    ell(46, 108, 11, 2, C.shade);
    ell(46, 104 - db * 0.5, 9, 3.6 + db * 0.4, C.dog);
    ell(44, 105, 6, 2, C.dogShade);
    ell(54, 104, 3.4, 2.8, C.dog);
    p([[53, 101 - s.ear], [55, 99 - s.ear * 2], [56, 102]], C.dogShade);
    r(57, 104, 2, 1, C.dogDark);
    r(54, 104, 2, 1, C.dogDark);
    bar([38, 105], [33, 103], 1.6, C.dog);
}

export default makeScene(config, state, draw);
