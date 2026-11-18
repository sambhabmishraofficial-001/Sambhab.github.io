// A painter at an easel, drawn on 144 native cells in the pocketworld style.
// Over one 12s loop the picture is painted stroke by stroke, admired, then lifted off for a fresh canvas.
export const config = { id: 'easel-painter', title: 'An afternoon at the easel', grid: 144, loop: 12, fps: 60 };

const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

const C = {
    grass: '#b8c39c', edge: '#a3b18b', light: '#ced5b7', shade: '#929e7b',
    wood: '#a77c4e', woodShade: '#705237', woodLight: '#c79c68',
    face: '#f7f2e4', faceEdge: '#ddd6c2',
    skin: '#e5b18a', skinShade: '#bb805c', hair: '#47553e',
    smock: '#f2edde', smockShade: '#c8c5ae', pants: '#657572', pantsDark: '#4e5a63', shoe: '#5b4636',
    beret: '#b5584a', beretShade: '#8f4239', palette: '#d9b98a',
    sky: '#a9c4cf', skyLight: '#c3d6db', sun: '#e5b45c', hill: '#9db383', hillDark: '#7f9a6c',
    roof: '#c4664f', wall: '#f2edde', jar: '#93b0b4', jarShade: '#7398a2',
    bird: '#8a6a4c', birdLight: '#b89676'
};
config.palette = Object.values(C);

// Each stroke sweeps a band of the picture from left to right; the brush tip rides the sweep front.
const STROKES = [
    { a: 0.4, b: 3.0, x0: 87, x1: 105, y0: 51, y1: 62, ink: 'sky' },
    { a: 3.3, b: 4.3, x0: 98, x1: 104, y0: 53, y1: 58, ink: 'sun' },
    { a: 4.6, b: 7.4, x0: 87, x1: 105, y0: 63, y1: 77, ink: 'hill' },
    { a: 7.7, b: 9.0, x0: 89, x1: 96, y0: 62, y1: 70, ink: 'roof' }
];
const REST = [84, 76];

function strokeTip(st, t) {
    const p = (t - st.a) / (st.b - st.a);
    const mid = (st.y0 + st.y1) / 2, amp = (st.y1 - st.y0) / 2 - 1;
    return [st.x0 + p * (st.x1 - st.x0), mid + amp * Math.sin(t * 9)];
}

export function state(time) {
    const t = ((time % 12) + 12) % 12;
    const reveal = STROKES.map(st => Math.max(0, Math.min(1, (t - st.a) / (st.b - st.a))));
    let tip = REST, ink = null;
    const i = STROKES.findIndex(st => t >= st.a && t < st.b);
    if (i >= 0) {
        tip = strokeTip(STROKES[i], t);
        ink = STROKES[i].ink;
    } else {
        const next = STROKES.findIndex(st => t < st.a);
        const prev = next < 0 ? STROKES.length - 1 : next - 1;
        const from = prev >= 0 ? strokeTip(STROKES[prev], STROKES[prev].b) : REST;
        const to = next >= 0 ? strokeTip(STROKES[next], STROKES[next].a) : REST;
        const g0 = prev >= 0 ? STROKES[prev].b : 0, g1 = next >= 0 ? STROKES[next].a : 9.8;
        const g = Math.max(0, Math.min(1, (t - g0) / (g1 - g0)));
        tip = next < 0 ? lerp(from, REST, ease(g)) : g < 0.5 ? lerp(from, REST, ease(g * 2) * 0.6) : lerp(lerp(from, REST, 0.6), to, ease(g * 2 - 1));
        if (prev >= 0 && next >= 0) ink = STROKES[next].ink;
    }
    const admire = ease((t - 9.3) / 0.8) * (1 - ease((t - 10.9) / 0.6));
    const lean = (tip[0] - 86) * 0.22 - admire * 1.5;
    const wipe = t > 11.4 ? (t - 11.4) / 0.6 : 0;
    const hop = (t % 4) < 0.35 ? Math.sin((t % 4) / 0.35 * Math.PI) : 0;
    const peck = ((t + 2) % 4) < 0.6 ? Math.sin(((t + 2) % 4) / 0.6 * Math.PI) : 0;
    return { time: t, reveal, tip, ink, admire, lean, wipe, hop, peck, breath: Math.sin(t * Math.PI / 3) };
}

function drawing(ctx) {
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const poly = (p, c) => {
        const y0 = Math.floor(Math.min(...p.map(q => q[1]))), y1 = Math.max(...p.map(q => q[1]));
        for (let y = y0; y < y1; y++) {
            const cuts = [];
            for (let i = 0; i < p.length; i++) {
                const a = p[i], b = p[(i + 1) % p.length];
                if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5)) cuts.push(a[0] + (y + .5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
            }
            cuts.sort((a, b) => a - b);
            for (let i = 0; i + 1 < cuts.length; i += 2) {
                const a = Math.ceil(cuts[i] - .5), b = Math.ceil(cuts[i + 1] - .5);
                if (b > a) rect(a, y, b - a, 1, c);
            }
        }
    };
    const ell = (cx, cy, rx, ry, c) => {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
            const dy = (y + .5 - cy) / ry;
            if (Math.abs(dy) > 1) continue;
            const dx = rx * Math.sqrt(1 - dy * dy), a = Math.ceil(cx - dx - .5), b = Math.ceil(cx + dx - .5);
            if (b > a) rect(a, y, b - a, 1, c);
        }
    };
    const bar = (a, b, w, c) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len * w / 2, ny = dx / len * w / 2;
        poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], c);
    };
    return { rect, poly, ell, bar };
}

// The picture on the easel; cells right of a stroke's sweep front stay bare canvas.
function drawPicture(g, s) {
    const [sky, sun, hill, house] = s.reveal;
    const top = 51 + Math.floor(s.wipe * 27);
    const clipRect = (x, y, w, h, c, upto) => {
        for (let yy = Math.max(y, top); yy < y + h; yy++) {
            const right = Math.min(x + w, upto);
            if (right > x) g.rect(x, yy, right - x, 1, c);
        }
    };
    if (sky > 0) {
        const X = 87 + Math.round(sky * 18);
        clipRect(87, 51, 18, 3, C.skyLight, X);
        clipRect(87, 54, 18, 9, C.sky, X);
    }
    if (sun > 0) {
        const X = 98 + Math.round(sun * 6);
        for (let y = 53; y < 58; y++) {
            const w = y === 53 || y === 57 ? 3 : 5;
            clipRect(101 - Math.floor(w / 2), y, w, 1, C.sun, X);
        }
    }
    if (hill > 0) {
        const X = 87 + Math.round(hill * 18);
        for (let x = 87; x < 105; x++) {
            const crest = Math.round(63 + 2 * Math.sin((x - 87) / 4));
            clipRect(x, crest, 1, 73 - crest, C.hill, X);
            clipRect(x, 73, 1, 4, C.hillDark, X);
        }
    }
    if (house > 0) {
        const X = 89 + Math.round(house * 7);
        clipRect(90, 66, 5, 4, C.wall, X);
        clipRect(92, 63, 1, 1, C.roof, X);
        clipRect(91, 64, 3, 1, C.roof, X);
        clipRect(90, 65, 5, 1, C.roof, X);
        clipRect(89, 66, 1, 1, C.roof, X);
        clipRect(95, 66, 1, 1, C.roof, X);
        clipRect(92, 68, 1, 2, C.woodShade, X);
    }
}

export function drawNative(ctx, s, o = {}) {
    ctx.clearRect(0, 0, 144, 144);
    ctx.imageSmoothingEnabled = false;
    const g = drawing(ctx), { rect: r, poly: p, ell, bar } = g;
    if (o.opaque) r(0, 0, 144, 144, '#fff');

    // Irregular meadow footprint with one lit edge and one shaded lip.
    p([[20, 92], [30, 85], [46, 82], [64, 81], [84, 82], [104, 85], [118, 90], [124, 97], [122, 104], [112, 110], [96, 114], [76, 115], [56, 113], [38, 109], [26, 103], [19, 97]], C.grass);
    p([[19, 97], [26, 103], [38, 109], [56, 113], [76, 115], [96, 114], [112, 110], [122, 104], [121, 108], [110, 113], [95, 117], [75, 118], [55, 116], [37, 112], [25, 106], [20, 101]], C.edge);
    p([[30, 88], [42, 85], [52, 85], [44, 87], [34, 90]], C.light);
    for (const [x, y] of [[33, 100], [48, 106], [84, 110], [104, 105], [116, 97]]) {
        r(x, y, 2, 1, C.edge);
        r(x + 1, y - 1, 1, 1, C.edge);
    }

    // Contact shadows stay fixed under feet and easel legs.
    p([[56, 97], [66, 95], [80, 96], [78, 99], [62, 100]], C.shade);
    p([[84, 101], [98, 99], [114, 101], [110, 104], [88, 104]], C.shade);

    // Easel back leg sits behind everything else.
    bar([98, 46], [103, 98], 1.4, C.woodShade);

    // Painter: fixed feet and legs, torso leans toward the brush.
    const l = s.lean;
    p([[63, 76], [68, 76], [67, 89], [66, 96], [62, 96], [63, 88]], C.pantsDark);
    p([[67, 76], [73, 76], [74, 88], [75, 96], [71, 96], [69, 88]], C.pants);
    r(60, 96, 7, 2, C.shoe);
    r(70, 96, 7, 2, C.shoe);

    const sh = [76 + l, 58], back = [64 + l * 0.4, 59];
    p([[back[0], 58], [70 + l * 0.7, 56], [sh[0], 58], [75 + l * 0.5, 67], [75, 77], [62, 78], [62 + l * 0.2, 67]], C.smock);
    p([[back[0], 58], [66 + l * 0.5, 58], [64 + l * 0.2, 68], [65, 78], [62, 78], [62 + l * 0.2, 67]], C.smockShade);
    r(71, 70, 1, 1, C.roof);
    r(67, 73, 1, 1, C.sky);
    r(73, 66, 1, 1, C.sun);

    // Far arm holds the palette at the hip.
    bar(back, [60 + l * 0.2, 67], 3, C.smockShade);
    bar([60 + l * 0.2, 67], [63, 71], 2, C.skinShade);
    ell(61, 72, 5, 2.4, C.palette);
    r(57, 71, 1, 1, C.roof);
    r(59, 72, 1, 1, C.sky);
    r(61, 71, 1, 1, C.sun);
    r(63, 72, 1, 1, C.hill);
    r(64, 71, 1, 1, '#ffffff');

    // Head seen from three-quarter back; the beret tilts while admiring.
    const hx = 70 + l * 0.8, hy = 50 + s.admire * 0.6;
    r(hx - 1, hy + 4, 3, 3, C.skinShade);
    ell(hx, hy, 4.6, 5, C.skin);
    ell(hx - 1.6, hy - 0.4, 4, 4.8, C.hair);
    r(hx - 1, hy, 1, 2, C.skinShade);
    ell(hx + s.admire * 0.6, hy - 4, 5.6, 2, C.beret);
    r(hx - 3 + s.admire * 0.6, hy - 3, 5, 1, C.beretShade);
    r(hx + 1 + s.admire, hy - 7, 1, 1, C.beret);

    // Easel front legs, ledge, clamp, then the canvas face resting on the ledge.
    bar([94, 44], [86, 101], 2, C.wood);
    bar([100, 44], [110, 101], 2, C.wood);
    bar([84, 79], [108, 79], 2, C.woodShade);
    r(95, 46, 4, 3, C.woodShade);
    r(86, 50, 21, 28, C.faceEdge);
    r(86, 50, 19, 27, C.face);
    drawPicture(g, s);

    // Near arm reaches the canvas; the brush tip carries the colour of the current stroke.
    const tip = s.tip, hand = [tip[0] - 5, tip[1] + 2];
    const elbow = [(sh[0] + hand[0]) / 2 - 1, Math.max(sh[1], hand[1]) + 4];
    bar(sh, elbow, 3, C.smock);
    bar(elbow, hand, 2, C.skin);
    r(hand[0] - 1, hand[1] - 1, 2, 2, C.skin);
    bar(hand, [tip[0] - 0.5, tip[1]], 1, C.woodShade);
    r(tip[0], tip[1], 1, 1, s.ink ? C[s.ink] : C.woodLight);

    // Brush jar and a sparrow that hops and pecks.
    r(113, 88, 5, 6, C.jar);
    r(116, 88, 2, 6, C.jarShade);
    bar([114, 88], [112, 82], 1, C.woodShade);
    bar([116, 88], [118, 81], 1, C.wood);
    r(112, 81, 1, 1, C.roof);
    r(118, 80, 1, 1, C.sky);

    const by = 95 - Math.round(s.hop * 2);
    p([[30, by], [35, by - 2], [38, by], [35, by + 2], [31, by + 2]], C.bird);
    r(32, by, 3, 1, C.birdLight);
    const head = [38, by - 2 + Math.round(s.peck * 3)];
    r(head[0], head[1], 2, 2, C.bird);
    r(head[0] + 2, head[1] + 1, 1, 1, C.sun);
    r(33, by + 2, 1, 2 + Math.round(s.hop * 2), C.woodShade);
    r(35, by + 2, 1, 2 + Math.round(s.hop * 2), C.woodShade);

    return s;
}

export function createRenderer(canvas) {
    canvas.width = canvas.height = 144;
    const ctx = canvas.getContext('2d');
    return {
        canvas, ctx,
        draw(t, o = {}) { return drawNative(ctx, state(t), o); },
        destroy() { ctx.clearRect(0, 0, 144, 144); }
    };
}

export default { config, state, createRenderer };
