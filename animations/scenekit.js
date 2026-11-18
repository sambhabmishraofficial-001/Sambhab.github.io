// Shared helpers for the 144-cell pixel scenes: whole-cell drawing primitives and a renderer wrapper.
export const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;

export function pen(ctx) {
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const dot = (x, y, c) => rect(x, y, 1, 1, c);
    // Pixel-centre scan conversion so every edge lands on whole cells.
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
        if (rx < 1 && ry < 1) dot(cx, cy, c);
    };
    const bar = (a, b, w, c) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len * w / 2, ny = dx / len * w / 2;
        poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], c);
        if (w >= 2) { ell(a[0], a[1], w / 2, w / 2, c); ell(b[0], b[1], w / 2, w / 2, c); }
    };
    return { rect, dot, poly, ell, bar };
}

export function makeScene(config, state, draw) {
    const size = config.grid;
    return {
        config, state,
        createRenderer(canvas) {
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d');
            return {
                canvas, ctx,
                draw(t, o = {}) {
                    ctx.clearRect(0, 0, size, size);
                    ctx.imageSmoothingEnabled = false;
                    const g = pen(ctx);
                    if (o.opaque) g.rect(0, 0, size, size, '#fff');
                    const s = state(t);
                    draw(g, s);
                    return s;
                },
                destroy() { ctx.clearRect(0, 0, size, size); }
            };
        }
    };
}
