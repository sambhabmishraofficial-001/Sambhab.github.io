/**
 * PixelPen - hard-edged pixel drawing into an ImageData buffer.
 * Shapes are rasterised at pixel centres with no anti-aliasing.
 */

export class PixelPen {
    constructor(ctx, width = ctx.canvas.width, height = ctx.canvas.height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.image = ctx.getImageData(0, 0, width, height);
        this.data = this.image.data;
    }

    pixel(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
        const i = (y * this.width + x) * 4;
        this.data[i] = color[0];
        this.data[i + 1] = color[1];
        this.data[i + 2] = color[2];
        this.data[i + 3] = color.length > 3 ? color[3] : 255;
    }

    span(y, x0, x1, color) {
        if (y < 0 || y >= this.height) return;
        x0 = Math.max(0, x0);
        x1 = Math.min(this.width - 1, x1);
        for (let x = x0; x <= x1; x++) this.pixel(x, y, color);
    }

    polygon(points, color) {
        if (points.length < 3) return;
        let minY = Infinity, maxY = -Infinity;
        for (const [, y] of points) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(this.height - 1, Math.ceil(maxY));
        const xs = [];
        for (let y = y0; y <= y1; y++) {
            const yc = y + 0.5;
            xs.length = 0;
            for (let k = 0; k < points.length; k++) {
                const [ax, ay] = points[k], [bx, by] = points[(k + 1) % points.length];
                if ((ay <= yc && yc < by) || (by <= yc && yc < ay)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
            }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2) this.span(y, Math.ceil(xs[k] - 0.5), Math.floor(xs[k + 1] - 0.5), color);
        }
    }

    ellipse([cx, cy], rx, ry, color) {
        if (rx <= 0 || ry <= 0) return;
        const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
        for (let y = y0; y <= y1; y++) {
            const dy = (y + 0.5 - cy) / ry;
            if (Math.abs(dy) > 1) continue;
            const dx = rx * Math.sqrt(1 - dy * dy);
            this.span(y, Math.ceil(cx - dx - 0.5), Math.floor(cx + dx - 0.5), color);
        }
        if (rx < 1 && ry < 1) this.pixel(cx, cy, color);
    }

    line(a, b, color, width = 1) {
        if (width <= 1) {
            let x0 = Math.round(a[0]), y0 = Math.round(a[1]);
            const x1 = Math.round(b[0]), y1 = Math.round(b[1]);
            const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            for (;;) {
                this.pixel(x0, y0, color);
                if (x0 === x1 && y0 === y1) break;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
            return;
        }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.ceil(len));
        const r = width / 2;
        for (let k = 0; k <= steps; k++) {
            const t = k / steps;
            this.ellipse([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], r, r, color);
        }
    }

    polyline(points, color, width = 1) {
        for (let k = 0; k + 1 < points.length; k++) this.line(points[k], points[k + 1], color, width);
    }

    finish() {
        this.ctx.putImageData(this.image, 0, 0);
    }
}
