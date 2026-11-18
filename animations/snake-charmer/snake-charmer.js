// A snake charmer on a rug: the cobra rises from its basket, sways to the pungi, flares its hood and sinks back.
import { ease, clamp, makeScene } from '../scenekit.js';

export const config = { id: 'snake-charmer', title: 'The snake charmer', grid: 144, loop: 12, fps: 60 };

const C = {
    ground: '#d9c9a5', groundEdge: '#c4b08a', groundLight: '#e6dabd', shade: '#b59f78',
    rug: '#a8453a', rugDark: '#7e3129', rugBorder: '#d9a441',
    skin: '#b97a52', skinShade: '#8e5a3b', beard: '#3a3530',
    turban: '#e3a23b', turbanShade: '#b97d22', kurta: '#f2edde', kurtaShade: '#c8c5ae', dhoti: '#e8e1cc', dhotiShade: '#cfc6ad',
    basket: '#b88a4f', basketDark: '#8a6236', basketLight: '#d2a86a',
    snake: '#4f5b3a', snakeLight: '#7d8a55', belly: '#d4c38a', hood: '#e9dfb8', tongue: '#c4444a', eye: '#1f2420',
    pungi: '#8a5a2e', pungiLight: '#c99a5a', bead: '#e1b84f',
    note: '#6b7b8e', coin: '#e1b84f', bowl: '#8f8f86', bowlDark: '#6b6b63', brass: '#c9a14a'
};
config.palette = Object.values(C);

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    const rise = ease((t - 0.4) / 2.2) * (1 - ease((t - 9.6) / 2));
    const flare = ease((t - 2.8) / 0.8) * (1 - ease((t - 9.2) / 0.8));
    const sway = Math.sin(t * 1.9);
    const tongue = (t % 2.6) > 2.2 && flare > 0.5;
    const puff = 0.5 + 0.5 * Math.sin(t * 7);
    const bob = Math.sin(t * 1.9 + 0.6);
    return { time: t, rise, flare, sway, tongue, puff, bob, breath: Math.sin(t * Math.PI / 3) };
}

function draw(g, s) {
    const { rect: r, dot, poly: p, ell, bar } = g;

    // Dusty bazaar ground.
    p([[18, 94], [28, 86], [46, 82], [70, 80], [96, 82], [114, 87], [126, 95], [124, 104], [112, 111], [92, 115], [66, 116], [42, 113], [26, 107], [17, 100]], C.ground);
    p([[17, 100], [26, 107], [42, 113], [66, 116], [92, 115], [112, 111], [124, 104], [123, 108], [110, 114], [90, 118], [65, 119], [40, 116], [24, 110], [18, 104]], C.groundEdge);
    p([[30, 88], [44, 84], [58, 84], [46, 87], [34, 90]], C.groundLight);
    for (const [x, y] of [[22, 98], [118, 99], [70, 112], [104, 108]]) { dot(x, y, C.shade); dot(x + 2, y + 1, C.shade); }

    // Rug with a gold border.
    p([[30, 94], [70, 86], [112, 95], [72, 104]], C.rugBorder);
    p([[34, 94], [70, 87.5], [107, 95], [72, 102.5]], C.rug);
    p([[34, 94], [72, 102.5], [72, 104], [30, 94]], C.rugDark);

    // Basket lid resting on the rug and its shadow.
    ell(105, 101, 8, 2.6, C.shade);
    ell(104, 99, 7, 2.4, C.basketDark);
    ell(104, 98.5, 6, 1.8, C.basket);
    r(103, 96, 2, 2, C.basketDark);

    // Coin bowl and a brass lota at the front.
    ell(38, 104, 6, 2, C.shade);
    ell(38, 101, 5, 2.4, C.bowlDark);
    ell(38, 100.5, 4, 1.5, C.bowl);
    dot(36, 100, C.coin); dot(39, 101, C.coin); dot(40, 100, C.coin);
    ell(118, 92, 3, 3, C.brass);
    r(117, 87, 2, 2, C.brass);
    ell(118, 87, 2.2, 0.8, C.brass);
    dot(117, 91, '#f1d68a');

    // Charmer, cross-legged, facing right; head and pungi sway with the cobra.
    ell(52, 100, 15, 3, C.shade);
    p([[36, 92], [60, 89], [67, 95], [62, 100], [40, 100], [34, 96]], C.dhoti);
    p([[34, 96], [40, 100], [52, 100], [44, 96], [38, 94]], C.dhotiShade);
    r(59, 96, 4, 2, C.skin);
    r(40, 97, 4, 2, C.skinShade);

    const b = s.breath * 0.4;
    p([[43, 72], [51, 70], [57, 73], [59, 82], [59, 91], [42, 92], [41 - b, 82]], C.kurta);
    p([[43, 72], [46, 72], [45, 82], [47, 91], [42, 92], [41 - b, 82]], C.kurtaShade);
    r(49, 78, 1, 1, C.rugBorder); r(49, 82, 1, 1, C.rugBorder); r(49, 86, 1, 1, C.rugBorder);

    const hb = s.bob * 0.8, hx = 51 + hb, hy = 63;
    r(hx - 1, hy + 4, 4, 4, C.skinShade);
    ell(hx, hy, 4.8, 5, C.skin);
    p([[hx - 3, hy + 2], [hx + 4, hy + 1], [hx + 4, hy + 4], [hx + 1, hy + 8], [hx - 2, hy + 7], [hx - 4, hy + 4]], C.beard);
    r(hx + 2, hy - 1, 1, 1, C.eye);
    ell(hx + 4, hy + 2, 0.6 + s.puff * 1.2, 1.2 + s.puff * 0.6, C.skin);
    ell(hx, hy - 4, 6.5, 3.4, C.turban);
    p([[hx - 6, hy - 4], [hx + 6, hy - 6], [hx + 6, hy - 4], [hx - 6, hy - 2]], C.turbanShade);
    p([[hx - 5, hy - 3], [hx - 9, hy + 1], [hx - 8, hy + 6], [hx - 6, hy + 2]], C.turbanShade);
    dot(hx + 2, hy - 6, C.coin);

    // Pungi: mouthpiece into a gourd, two reed pipes pointing at the basket.
    const a = s.sway * 0.09, mouth = [hx + 4, hy + 3];
    const rot = ([dx, dy]) => [mouth[0] + dx * Math.cos(a) - dy * Math.sin(a), mouth[1] + dx * Math.sin(a) + dy * Math.cos(a)];
    const bulb = rot([7, 3]);
    bar(mouth, bulb, 1.5, C.pungi);
    ell(bulb[0], bulb[1], 3.4, 3, C.pungi);
    ell(bulb[0] - 1, bulb[1] - 1, 1.4, 1, C.pungiLight);
    const p1 = rot([17, 7]), p2 = rot([16, 10]);
    bar(rot([9, 4]), p1, 1.4, C.pungi);
    bar(rot([9, 5.5]), p2, 1.4, C.pungiLight);
    dot(p1[0], p1[1], C.bead);
    dot(p2[0], p2[1], C.bead);

    // Both hands on the reeds.
    const h1 = rot([12, 6]), h2 = rot([14, 8]);
    bar([45, 74], [47, 84], 3, C.kurtaShade);
    bar([47, 84], h1, 2, C.skinShade);
    bar([56, 74], [58, 85], 3, C.kurta);
    bar([58, 85], h2, 2, C.skin);
    r(h2[0] - 1, h2[1] - 1, 2, 2, C.skin);

    // Music notes drift up from the reeds.
    for (let i = 0; i < 3; i++) {
        const ph = (s.time * 0.45 + i / 3) % 1;
        const nx = p1[0] + 2 + ph * 12 + Math.sin(ph * 9 + i) * 2, ny = p1[1] - 6 - ph * 28;
        if (ph < 0.85) {
            r(nx, ny + 3, 2, 2, C.note);
            r(nx + 1, ny, 1, 4, C.note);
            if (i % 2) r(nx + 2, ny, 1, 1, C.note);
        }
    }

    // Basket body with woven bands; the cobra coils up out of its mouth.
    const bx = 86, by = 86;
    ell(bx + 1, 100, 12, 3, C.shade);
    for (let y = by; y <= 99; y++) {
        const k = (y - by) / 13, w = 9 + 2.2 * Math.sin(k * Math.PI) - k;
        const col = (y - by) % 4 === 0 ? C.basketDark : (y - by) % 4 === 2 ? C.basketLight : C.basket;
        r(Math.round(bx - w), y, Math.round(2 * w), 1, col);
        r(Math.round(bx + w) - 2, y, 2, 1, C.basketDark);
    }
    ell(bx, by, 9, 2.6, C.basketDark);
    ell(bx, by - 0.4, 7.6, 1.8, '#4a3a26');

    const height = 26 * s.rise, N = 18;
    const pts = [];
    for (let k = 0; k <= N; k++) {
        const u = k / N;
        pts.push([bx + s.sway * 4.5 * s.rise * Math.sin(u * 2.2) * u + s.sway * 1.2 * Math.sin(s.time * 3.8 - u * 6) * u, by - 1 - u * height]);
    }
    if (s.rise > 0.04) {
        ell(bx, by - 0.5, 4.5, 1.6, C.snake);
        for (let k = 0; k < N; k++) {
            const [x, y] = pts[k], w = 2.4 - (k / N) * 0.6;
            ell(x, y, w, 1.4, C.snake);
            if (k % 3 === 1) dot(x - 1, y, C.snakeLight);
            if (k > N * 0.5) dot(x + 1, y, C.belly);
        }
        const [tx, ty] = pts[N];
        const hw = 1.8 + 3 * s.flare;
        ell(tx, ty + 1, hw, 4.2, C.snake);
        if (s.flare > 0.3) {
            ell(tx, ty + 1.5, hw - 1.4, 2.8, C.hood);
            dot(tx - 1, ty + 1, C.snake); dot(tx + 1, ty + 1, C.snake);
            r(tx - 0.5, ty + 3, 1, 1, C.snake);
        }
        ell(tx - 1, ty - 3, 2.4, 1.6, C.snake);
        dot(tx - 2, ty - 4, C.snakeLight);
        dot(tx - 2, ty - 3, C.eye);
        if (s.tongue) { dot(tx - 4, ty - 3, C.tongue); dot(tx - 5, ty - 3, C.tongue); dot(tx - 6, ty - 4, C.tongue); dot(tx - 6, ty - 2, C.tongue); }
    }
}

export default makeScene(config, state, draw);
