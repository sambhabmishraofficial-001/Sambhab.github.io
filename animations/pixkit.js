// Tiny pixel-art toolkit shared by the playground animations.

export function rng(seed = 1) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

export function hash2(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hex(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export function mix(a, b, t) {
    return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)).concat(255);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// A low resolution frame buffer that is scaled up crisply onto a visible canvas.
export class Pix {
    constructor(canvas, w, h) {
        this.canvas = canvas;
        this.w = w;
        this.h = h;
        canvas.width = w;
        canvas.height = h;
        this.ctx = canvas.getContext('2d');
        this.img = this.ctx.createImageData(w, h);
        this.d = this.img.data;
    }
    clear(c = [0, 0, 0, 0]) {
        const d = this.d;
        for (let i = 0; i < d.length; i += 4) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] ?? 255; }
    }
    px(x, y, c) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
        const i = (y * this.w + x) * 4, a = (c[3] ?? 255) / 255, d = this.d;
        if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
        d[i] = d[i] + (c[0] - d[i]) * a;
        d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a;
        d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a;
        d[i + 3] = Math.max(d[i + 3], c[3]);
    }
    get(x, y) {
        const i = ((y | 0) * this.w + (x | 0)) * 4;
        return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
    }
    rect(x, y, w, h, c) {
        for (let j = Math.round(y); j < Math.round(y + h); j++)
            for (let i = Math.round(x); i < Math.round(x + w); i++) this.px(i, j, c);
    }
    // vertical gradient with ordered dithering between two colours
    grad(x, y, w, h, top, bottom, steps = 6) {
        for (let j = 0; j < h; j++) {
            const t = j / Math.max(1, h - 1), q = Math.floor(t * steps) / steps, f = t * steps - Math.floor(t * steps);
            for (let i = 0; i < w; i++) {
                const k = q + (f > bayer(x + i, y + j) ? 1 / steps : 0);
                this.px(x + i, y + j, mix(top, bottom, Math.min(1, k)));
            }
        }
    }
    disc(cx, cy, r, c) {
        for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
            for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
                if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.px(i, j, c);
    }
    ellipse(cx, cy, rx, ry, c) {
        for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
            for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++)
                if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) this.px(i, j, c);
    }
    line(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        for (;;) {
            this.px(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * e;
            if (e2 >= dy) { e += dy; x0 += sx; }
            if (e2 <= dx) { e += dx; y0 += sy; }
        }
    }
    poly(pts, c) {
        let y0 = Infinity, y1 = -Infinity;
        for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
            const xs = [], sy = y + 0.5;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                if ((a[1] <= sy) !== (b[1] <= sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
            }
            xs.sort((p, q) => p - q);
            for (let k = 0; k + 1 < xs.length; k += 2)
                for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
        }
    }
    // knock out pixels outside a wobbly, dithered "torn paper" border
    tear(seed = 3, depth = 6) {
        const { w, h } = this;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
            if (edge >= depth) continue;
            const n = hash2(x >> 1, y >> 1, seed) * 0.6 + hash2(x, y, seed + 9) * 0.4;
            if (edge / depth < n) { const i = (y * w + x) * 4; this.d[i + 3] = 0; }
        }
    }
    flush() { this.ctx.putImageData(this.img, 0, 0); }
}

// Map a pointer event to frame-buffer pixel coordinates.
export function toPix(pix, e) {
    const r = pix.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * pix.w, (e.clientY - r.top) / r.height * pix.h];
}
