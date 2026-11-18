// A mela tightrope walker: a girl crosses the rope with a balancing pole and a pot on her head,
// turns, and walks back while a dholak player keeps time and two children watch.
import { ease, clamp, makeScene } from '../scenekit.js';

export const config = { id: 'mela-tightrope', title: 'Rope walk at the mela', grid: 144, loop: 12, fps: 60 };

const C = {
    ground: '#d9c9a5', groundEdge: '#c4b08a', groundLight: '#e6dabd', shade: '#b59f78',
    bamboo: '#c9a35e', bambooDark: '#8f7038', rope: '#6e5a3e', guy: '#a8956f',
    skin: '#b97a52', skinShade: '#8e5a3b', hair: '#2f2a26',
    skirt: '#c2364a', skirtLight: '#e0566a', skirtBand: '#e1b84f', blouse: '#e3a23b', dupatta: '#3f7f8c',
    pot: '#b8693c', potLight: '#d68a55', potDark: '#8a4a28', pole: '#a07a3e',
    flagR: '#c2364a', flagY: '#e1b84f', flagG: '#6f9a4f', flagB: '#3f7f8c',
    drum: '#9b5b34', drumDark: '#6e3f24', drumHead: '#efe4c8', kurta: '#f2edde', kurtaShade: '#c8c5ae', turban: '#c2364a',
    kidA: '#3f7f8c', kidB: '#e3a23b', kidPants: '#4e5a63'
};
config.palette = Object.values(C);

const L = 30, R = 114, TOP = 50;

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    let walk, dir;
    if (t < 5.4) { walk = ease(t / 5.4); dir = 1; }
    else if (t < 6.6) { walk = 1; dir = t < 6 ? 1 : -1; }
    else { walk = 1 - ease((t - 6.6) / 5.4); dir = -1; }
    const gx = 42 + walk * 60;
    const moving = t < 5.4 || t > 6.6;
    const step = moving ? (t < 5.4 ? t : t - 6.6) * 1.6 : 0;
    const wobble = 0.07 * Math.sin(t * 2.3) + 0.04 * Math.sin(t * 5.1);
    const beat = (t * 4) % 1;
    return { time: t, gx, dir, step, moving, wobble, beat, flutter: Math.sin(t * 6) };
}

// The rope dips under the walker's weight, most at her feet.
const ropeY = (x, gx) => {
    const w = x < gx ? (x - L) / (gx - L) : (R - x) / (R - gx);
    return TOP + 4 * clamp(w);
};

function stand(g, cx) {
    const { bar } = g;
    bar([cx - 7, 100], [cx + 3, TOP - 4], 2, C.bambooDark);
    bar([cx + 7, 100], [cx - 3, TOP - 4], 2, C.bamboo);
    bar([cx - 6, 84], [cx + 6, 84], 1.4, C.bambooDark);
}

function draw(g, s) {
    const { rect: r, dot, poly: p, ell, bar } = g;

    // Mela ground.
    p([[10, 96], [22, 87], [44, 83], [72, 82], [100, 83], [122, 88], [134, 96], [131, 105], [116, 112], [92, 116], [62, 117], [36, 114], [18, 108], [9, 101]], C.ground);
    p([[9, 101], [18, 108], [36, 114], [62, 117], [92, 116], [116, 112], [131, 105], [130, 109], [114, 115], [90, 119], [60, 120], [34, 117], [16, 111], [10, 105]], C.groundEdge);
    p([[24, 89], [40, 85], [56, 85], [42, 88], [28, 91]], C.groundLight);

    // Guy ropes to stakes, then the two bamboo X-stands.
    bar([L, TOP], [14, 102], 1, C.guy);
    bar([R, TOP], [130, 102], 1, C.guy);
    r(13, 101, 2, 3, C.bambooDark);
    r(129, 101, 2, 3, C.bambooDark);
    ell(L, 101, 9, 2, C.shade);
    ell(R, 101, 9, 2, C.shade);
    stand(g, L);
    stand(g, R);

    // Bunting hung along both guy ropes, fluttering.
    const flags = [C.flagR, C.flagY, C.flagG, C.flagB];
    for (const [a, b] of [[[L, TOP], [14, 102]], [[R, TOP], [130, 102]]]) {
        for (let i = 1; i < 8; i++) {
            const u = i / 8.5, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
            const f = Math.round(s.flutter * (i % 2 ? 1 : -1) * 0.7), side = b[0] < a[0] ? -1 : 1;
            p([[x, y - 2], [x, y + 3], [x + side * (5 + f), y + 0.5]], flags[i % 4]);
        }
    }

    // The sagging rope.
    for (let x = L; x <= R; x++) dot(x, ropeY(x, s.gx), C.rope);
    r(L - 1, TOP - 1, 3, 3, C.rope);
    r(R - 1, TOP - 1, 3, 3, C.rope);

    // Dholak player sitting under the rope, hands bouncing on the beat.
    const dx = 66, dy = 92;
    ell(dx, 101, 14, 2.5, C.shade);
    p([[dx - 10, 94], [dx + 2, 93], [dx + 6, 99], [dx - 12, 100]], C.kurtaShade);
    p([[dx - 8, 78], [dx - 1, 77], [dx + 1, 86], [dx + 1, 95], [dx - 10, 95], [dx - 10, 85]], C.kurta);
    ell(dx - 4, 72, 4, 4.4, C.skin);
    ell(dx - 4, 69, 5, 2.6, C.turban);
    r(dx - 1, 71, 1, 1, C.hair);
    r(dx - 6, 74, 5, 2, C.hair);
    for (let y = 90; y <= 97; y++) r(dx - 2, y, 16, 1, (y === 90 || y === 97) ? C.drumDark : C.drum);
    for (let x = dx; x < dx + 14; x += 3) bar([x, 90], [x + 2, 97], 1, C.drumDark);
    ell(dx - 2, 93.5, 1.6, 4, C.drumHead);
    ell(dx + 14, 93.5, 1.6, 4, C.drumHead);
    const hitL = s.beat < 0.25 ? 0 : 2, hitR = ((s.beat + 0.5) % 1) < 0.25 ? 0 : 2;
    bar([dx - 6, 80], [dx - 8, 88], 2.5, C.kurta);
    bar([dx - 8, 88], [dx - 4, 91 - hitL], 2, C.skinShade);
    bar([dx, 80], [dx + 8, 85], 2.5, C.kurta);
    bar([dx + 8, 85], [dx + 13, 90 - hitR], 2, C.skin);

    // The walker. Feet on the rope, pole across her body, pot balanced on her head.
    const gx = s.gx, fy = ropeY(gx, gx), d = s.dir, wb = s.wobble;
    const lean = x => wb * (fy - x) * 0.9;
    const sp = Math.sin(s.step * Math.PI), front = 3 * sp * d, back = -front;
    bar([gx - 0.5 + lean(fy - 9), fy - 9], [gx + front * 0.6, fy - 1], 1.6, C.skinShade);
    bar([gx + 0.5 + lean(fy - 9), fy - 9], [gx + back * 0.6 + d, fy - 1], 1.6, C.skin);
    r(gx + front * 0.6 - 1, fy - 1, 3, 1, C.skinShade);
    r(gx + back * 0.6 + d - 1, fy - 1, 3, 1, C.skin);

    const hip = fy - 10, waist = fy - 15, sh = fy - 20;
    const swirl = Math.sin(s.time * 3) * 1.2;
    p([[gx - 2 + lean(waist), waist], [gx + 2 + lean(waist), waist], [gx + 6 + swirl, hip + 2], [gx - 6 + swirl, hip + 2]], C.skirt);
    p([[gx - 1 + lean(waist), waist], [gx + 1 + lean(waist), waist], [gx + 2 + swirl, hip + 2], [gx - 3 + swirl, hip + 2]], C.skirtLight);
    r(gx - 6 + swirl, hip + 1, 12, 1, C.skirtBand);
    p([[gx - 3 + lean(sh), sh], [gx + 3 + lean(sh), sh], [gx + 2 + lean(waist), waist], [gx - 2 + lean(waist), waist]], C.blouse);
    bar([gx - 3 * d + lean(sh), sh], [gx + 2 * d + lean(waist), waist + 1], 1.4, C.dupatta);

    const hx = gx + lean(sh - 4), hy = sh - 4;
    r(hx - 1, sh - 2, 2, 2, C.skinShade);
    ell(hx, hy, 2.8, 3, C.skin);
    ell(hx - d, hy - 0.6, 2.6, 2.6, C.hair);
    ell(hx - 2.5 * d, hy, 1.4, 1.4, C.hair);
    dot(hx + 1.5 * d, hy - 0.4, C.hair);

    const pot = [hx + wb * 6, hy - 6];
    ell(pot[0], pot[1] + 2.4, 2.2, 0.8, C.potDark);
    ell(pot[0], pot[1], 3.4, 3, C.pot);
    ell(pot[0] - 1, pot[1] - 1, 1.3, 1.2, C.potLight);
    r(pot[0] - 1, pot[1] - 4, 3, 1, C.potDark);

    // Long balancing pole tilts with her wobble.
    const ang = wb * 1.4, pc = [gx + lean(sh + 3), sh + 3], half = 22;
    const pa = [pc[0] - half * Math.cos(ang), pc[1] - half * Math.sin(ang)], pb = [pc[0] + half * Math.cos(ang), pc[1] + half * Math.sin(ang)];
    bar(pa, pb, 1, C.pole);
    r(pa[0] - 1, pa[1] - 1, 2, 2, C.bambooDark);
    r(pb[0] - 1, pb[1] - 1, 2, 2, C.bambooDark);
    const hl = [pc[0] - 6 * Math.cos(ang), pc[1] - 6 * Math.sin(ang)], hr = [pc[0] + 6 * Math.cos(ang), pc[1] + 6 * Math.sin(ang)];
    bar([gx - 2.5 + lean(sh), sh + 1], hl, 1.4, C.skinShade);
    bar([gx + 2.5 + lean(sh), sh + 1], hr, 1.4, C.skin);

    // Two children watching from the front; one claps.
    const kid = (x, top, shirt, clap) => {
        ell(x, 112, 4, 1.2, C.shade);
        r(x - 2, top + 9, 2, 4, C.kidPants);
        r(x, top + 9, 2, 4, C.kidPants);
        p([[x - 3, top + 3], [x + 3, top + 3], [x + 3, top + 9], [x - 3, top + 9]], shirt);
        ell(x, top, 2.6, 2.8, C.skin);
        ell(x - 0.4, top - 1, 2.6, 1.8, C.hair);
        if (clap) { r(x - 1, top + 3 - (s.beat < 0.5 ? 2 : 0), 2, 2, C.skin); }
    };
    kid(44, 98, C.kidA, true);
    kid(98, 99, C.kidB, false);
}

export default makeScene(config, state, draw);
