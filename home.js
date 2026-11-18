import { Pix, hex } from './animations/pixkit.js';
import { renderStill } from './animations/meadow/meadow.js';
import { createRamp } from './animations/ramp/ramp.js';
import { createLaunch, DURATION } from './animations/launch/launch.js';

// ---------- pixel glyphs (drawn on a 32x32 grid) ----------

const K = {
    ink: hex('#23272a'), white: hex('#ffffff'), glass: hex('#dff3fb'), glassD: hex('#9cc9dc'),
    green: hex('#4fbf7a'), greenD: hex('#2f8f5b'), cork: hex('#a8743f'),
    amber: hex('#c8682a'), amberL: hex('#e59a4d'), amberD: hex('#8a4116'), wood: hex('#2b1a10'),
    blue: hex('#2f6fd6'), blueL: hex('#8fb8f2'), sky: hex('#9fd3f5'), orange: hex('#e2683a'), red: hex('#e2483d'),
    yellow: hex('#f2c94c'), gold: hex('#e9b632'), goldD: hex('#b8861b'), purple: hex('#6d28d9'), purpleL: hex('#c4b5fd'),
    pink: hex('#f39ab6'), pinkD: hex('#d9688f'), grey: hex('#b9bec4'), greyD: hex('#6b7280'), leather: hex('#1f2226'),
    leatherL: hex('#3a3f46'), skin: hex('#c98e62'), hair: hex('#1d1b1a'), paper: hex('#fffdf6'), tan: hex('#d9a066'),
};

function edge(P, pts, c) {
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        P.line(a[0], a[1], b[0], b[1], c);
    }
}

function erase(P, x, y) {
    if (x < 0 || y < 0 || x >= P.w || y >= P.h) return;
    P.d[((y | 0) * P.w + (x | 0)) * 4 + 3] = 0;
}

const GLYPHS = {
    flask(P, t) {
        P.rect(13, 2, 6, 3, K.cork);
        const body = [[13, 5], [19, 5], [19, 12], [27, 27], [5, 27], [13, 12]];
        P.poly(body, K.glass);
        P.poly([[9.5, 19], [22.5, 19], [27, 27], [5, 27]], K.green);
        P.rect(8, 19, 16, 1, K.greenD);
        for (let k = 0; k < 4; k++) {
            const y = 26 - ((t * 6 + k * 5) % 10), x = 11 + k * 3 + Math.sin(t * 3 + k) * 0.8;
            P.px(x, y, K.white);
        }
        P.line(8, 23, 10, 19, K.white);
        edge(P, body, K.ink);
        P.rect(5, 27, 23, 1, K.ink);
    },
    screen(P, t) {
        P.rect(3, 5, 26, 18, K.ink);
        P.rect(5, 7, 22, 14, hex('#16213a'));
        const rows = [[7, 9, 10, K.green], [7, 12, 14, K.blueL], [9, 15, 8, K.yellow], [7, 18, 6, K.green]];
        for (const [x, y, w, c] of rows) P.rect(x, y, w, 1, c);
        if (Math.floor(t * 2) % 2) P.rect(14, 18, 2, 1, K.white);
        P.rect(14, 23, 4, 3, K.greyD);
        P.rect(10, 26, 12, 2, K.ink);
    },
    violin(P, t) {
        P.line(5, 29, 28, 4, K.tan);
        P.line(6, 29, 29, 4, K.amberD);
        P.ellipse(16, 22, 7.5, 6.5, K.amberD);
        P.ellipse(16, 12.5, 6, 5.5, K.amberD);
        P.ellipse(16, 22, 6.5, 5.5, K.amber);
        P.ellipse(16, 12.5, 5, 4.5, K.amber);
        P.rect(10, 16, 12, 2, K.amber);
        erase(P, 9, 17); erase(P, 22, 17);
        P.ellipse(13.5, 11, 1.5, 1.5, K.amberL);
        P.rect(15, 3, 2, 17, K.wood);
        P.disc(16, 2.5, 1.6, K.wood);
        P.rect(12, 20, 1, 3, K.wood); P.rect(19, 20, 1, 3, K.wood);
        P.rect(14, 21, 4, 1, K.paper);
        const buzz = Math.sin(t * 30) > 0 ? 0 : 0.5;
        P.line(15.5 + buzz, 4, 15.5, 25, K.paper);
        P.line(16.5, 4, 16.5 - buzz, 25, K.paper);
        P.rect(15, 25, 2, 2, K.wood);
    },
    curve(P) {
        P.rect(0, 0, 32, 32, hex('#eef4ff'));
        P.rect(4, 4, 1, 24, K.ink);
        P.rect(4, 27, 24, 1, K.ink);
        let prev = null;
        for (let x = 5; x <= 27; x++) {
            const y = 26 - ((x - 16) / 11) ** 2 * 18 * -1 - 18 + 0;
            const yy = 8 + ((x - 16) / 11) ** 2 * 17;
            if (prev) P.line(prev[0], prev[1], x, yy, K.blue);
            prev = [x, yy];
        }
        P.line(7, 8 + (9 / 11) ** 2 * 17, 25, 8 + (9 / 11) ** 2 * 17, K.orange);
        P.disc(7, 8 + (9 / 11) ** 2 * 17, 1.4, K.orange);
        P.disc(25, 8 + (9 / 11) ** 2 * 17, 1.4, K.orange);
        P.disc(16, 8, 1.4, K.blue);
    },
    zeta(P, t) {
        P.rect(0, 0, 32, 32, hex('#f3eeff'));
        for (let y = 2; y < 30; y += 3) P.rect(16, y, 1, 2, K.purpleL);
        const zeros = [6, 11, 15, 19, 22, 25, 28];
        zeros.forEach((y, i) => P.disc(16.5, 31 - y, 1.3, (Math.floor(t * 3) % zeros.length) === i ? K.orange : K.purple));
        P.rect(3, 16, 26, 1, K.grey);
    },
    leaf(P) {
        const pts = [[4, 27], [8, 14], [17, 6], [28, 4], [26, 15], [18, 24]];
        P.poly(pts, K.green);
        P.poly([[4, 27], [8, 14], [17, 6], [28, 4], [14, 18]], hex('#6fd394'));
        P.line(4, 27, 26, 6, K.greenD);
        for (let k = 0; k < 4; k++) { P.line(9 + k * 4, 22 - k * 4, 9 + k * 4 + 4, 23 - k * 4, K.greenD); }
        edge(P, pts, K.greenD);
        P.disc(9, 9, 3.5, K.paper); P.disc(9, 9, 2.5, hex('#efe6d2'));
        P.line(9, 5, 9, 7, K.greenD);
    },
    microbe(P, t) {
        for (let k = 0; k < 10; k++) P.px(25 + k * 0.6, 14 + Math.sin(t * 6 + k) * 1.5 + k * 0.3, K.pinkD);
        for (let k = 0; k < 10; k++) P.px(7 - k * 0.6, 18 + Math.sin(t * 6 + k + 2) * 1.5 - k * 0.3, K.pinkD);
        P.ellipse(16, 16, 11, 6, K.pinkD);
        P.ellipse(16, 16, 10, 5, K.pink);
        P.ellipse(13, 14, 4, 1.4, hex('#ffd3e1'));
        [[12, 17], [17, 15], [20, 18], [15, 19]].forEach(([x, y]) => P.px(x, y, K.pinkD));
    },
    medal(P, t) {
        P.poly([[8, 2], [14, 2], [18, 14], [12, 14]], K.blue);
        P.poly([[24, 2], [18, 2], [14, 14], [20, 14]], K.orange);
        P.disc(16, 21, 8.5, K.goldD);
        P.disc(16, 21, 7.5, K.gold);
        const star = [];
        for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 2.4 : 5.2;
            star.push([16 + Math.cos(a) * r, 21 + Math.sin(a) * r]);
        }
        P.poly(star, hex('#fff0b3'));
        if (Math.floor(t * 1.5) % 3 === 0) { P.px(11, 16, K.white); P.px(10, 17, K.white); P.px(12, 17, K.white); }
    },
    rocket(P, t) {
        const flick = Math.sin(t * 25) > 0 ? 1 : 0;
        P.poly([[13, 25], [16, 30 + flick * 2], [19, 25]], K.yellow);
        P.poly([[14, 25], [16, 28], [18, 25]], K.white);
        P.poly([[11, 18], [7, 25], [12, 24]], K.orange);
        P.poly([[21, 18], [25, 25], [20, 24]], K.orange);
        P.poly([[16, 2], [21, 10], [21, 25], [11, 25], [11, 10]], K.paper);
        P.poly([[16, 2], [21, 10], [11, 10]], K.red);
        edge(P, [[16, 2], [21, 10], [21, 25], [11, 25], [11, 10]], K.ink);
        P.disc(16, 15, 2.6, K.ink);
        P.disc(16, 15, 1.8, K.sky);
        P.rect(11, 21, 11, 1, K.blue);
    },
    sun(P, t) {
        P.disc(7, 7, 4, K.yellow);
        for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4 + t * 0.5;
            P.px(7 + Math.cos(a) * 6.5, 7 + Math.sin(a) * 6.5, K.yellow);
        }
        P.poly([[9, 13], [27, 11], [29, 15], [11, 17]], K.blue);
        for (let x = 13; x < 28; x += 4) P.line(x, 12.5, x + 1, 16, K.blueL);
        P.rect(18, 15, 1, 4, K.greyD);
        P.rect(8, 19, 20, 7, K.orange);
        P.rect(8, 19, 20, 1, hex('#f6a07a'));
        P.rect(11, 21, 6, 3, K.paper);
        P.disc(12, 27, 2.2, K.ink); P.disc(24, 27, 2.2, K.ink);
    },
    stamp(P) {
        P.rect(3, 3, 26, 26, K.paper);
        for (let k = 3; k <= 28; k += 2) { erase(P, k, 3); erase(P, k, 28); erase(P, 3, k); erase(P, 28, k); }
        P.rect(6, 6, 20, 20, K.red);
        P.rect(7, 7, 18, 18, K.sky);
        P.disc(20, 12, 3, K.yellow);
        P.poly([[7, 25], [7, 19], [13, 16], [19, 20], [25, 18], [25, 25]], K.green);
        P.poly([[10, 19], [13, 12], [16, 19]], K.amberD);
        P.rect(12, 10, 2, 2, K.amberD);
        P.rect(8, 22, 5, 2, K.paper);
    },
    palette(P, t) {
        P.ellipse(16, 17, 13, 10, hex('#b5793f'));
        P.ellipse(16, 16.5, 12, 9, K.tan);
        P.ellipse(10, 21, 2.6, 2.2, [0, 0, 0, 0]);
        for (let y = 18; y < 24; y++) for (let x = 7; x < 14; x++) if (((x - 10) / 2.6) ** 2 + ((y - 21) / 2.2) ** 2 <= 1) erase(P, x, y);
        [[11, 11, K.red], [17, 9, K.yellow], [23, 12, K.blue], [24, 19, K.green], [18, 22, K.purple]].forEach(([x, y, c]) => {
            P.disc(x, y, 2.4, c);
            P.px(x - 1, y - 1, K.white);
        });
        const wob = Math.sin(t * 2) * 0.8;
        P.line(27 + wob, 2, 15, 18, K.amberD);
        P.line(28 + wob, 2, 16, 18, K.amberD);
        P.disc(15, 18.5, 1.6, K.red);
    },
    jacket(P) {
        P.line(16, 1, 16, 4, K.greyD);
        P.px(17, 1, K.greyD); P.px(18, 2, K.greyD);
        P.line(6, 8, 16, 4, K.greyD); P.line(26, 8, 16, 4, K.greyD);
        const body = [[9, 7], [13, 6], [16, 10], [19, 6], [23, 7], [28, 12], [28, 27], [24, 27], [24, 16], [24, 30], [8, 30], [8, 16], [8, 27], [4, 27], [4, 12]];
        P.poly(body, K.leather);
        P.poly([[13, 6], [16, 10], [14, 16], [11, 9]], K.leatherL);
        P.poly([[19, 6], [16, 10], [18, 16], [21, 9]], K.leatherL);
        P.line(16, 11, 17, 29, K.grey);
        P.rect(10, 21, 4, 1, K.grey); P.rect(19, 19, 4, 1, K.grey);
        P.line(5, 13, 5, 26, K.leatherL); P.line(27, 13, 27, 26, K.leatherL);
        P.rect(8, 28, 16, 2, K.leatherL);
    },
};

function paintGlyph(canvas, name, t = 0) {
    const P = canvas._pix || (canvas._pix = new Pix(canvas, 32, 32));
    P.clear([0, 0, 0, 0]);
    GLYPHS[name](P, t);
    P.flush();
}

// avatar: a tiny pixel portrait for the menu bar
(function avatar() {
    const c = document.getElementById('avatar');
    if (!c) return;
    const P = new Pix(c, 16, 16);
    P.clear(hex('#dbeafe'));
    P.ellipse(8, 9, 4.6, 5.2, K.skin);
    P.ellipse(8, 4.6, 5.2, 3, K.hair);
    P.rect(3, 5, 2, 4, K.hair); P.rect(11, 5, 2, 3, K.hair);
    P.rect(5, 8, 2, 1, K.ink); P.rect(9, 8, 2, 1, K.ink);
    P.px(7, 8, K.ink); P.px(8, 8, K.ink);
    P.rect(6, 11, 4, 1, hex('#9b5a3a'));
    P.rect(3, 14, 10, 2, K.blue);
    P.flush();
})();

// static and lightly animated glyphs in the page
const liveGlyphs = [];
document.querySelectorAll('canvas[data-glyph]').forEach(c => {
    paintGlyph(c, c.dataset.glyph, 0);
    liveGlyphs.push(c);
});

// ---------- stickers ----------

const STICKERS = [
    { glyph: 'violin', tip: 'classical violin', href: '#about', x: 13, y: 22 },
    { glyph: 'stamp', tip: 'philately', href: 'achievements.html', x: 82, y: 17 },
    { glyph: 'flask', tip: 'research', href: 'research.html', x: 8, y: 60 },
    { glyph: 'rocket', tip: 'patch to space', href: 'launch.html', x: 87, y: 56 },
    { glyph: 'palette', tip: 'butterfly meadow', href: 'meadow.html', x: 21, y: 70 },
    { glyph: 'jacket', tip: '#bringbackjensen', href: 'jensen.html', x: 77, y: 70 },
];

const hero = document.querySelector('.hero');
const stickerHost = document.getElementById('stickers');
const stickerCanvases = [];

STICKERS.forEach((s, i) => {
    const b = document.createElement('a');
    b.className = 'sticker';
    b.href = s.href;
    b.setAttribute('aria-label', s.tip);
    b.style.left = `calc(${s.x}% - 46px)`;
    b.style.top = `calc(${s.y}% - 46px)`;
    b.style.animationDelay = `${-i * 0.8}s`;
    const c = document.createElement('canvas');
    const tip = document.createElement('span');
    tip.className = 'tip';
    tip.textContent = s.tip;
    b.append(c, tip);
    stickerHost.appendChild(b);
    paintGlyph(c, s.glyph, 0);
    stickerCanvases.push([c, s.glyph]);

    let start = null, moved = false;
    b.addEventListener('pointerdown', e => {
        e.preventDefault();
        const r = b.getBoundingClientRect(), h = hero.getBoundingClientRect();
        start = { x: e.clientX, y: e.clientY, left: r.left - h.left, top: r.top - h.top };
        moved = false;
        b.setPointerCapture(e.pointerId);
    });
    b.addEventListener('pointermove', e => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        b.classList.add('dragging');
        b.style.left = `${start.left + dx}px`;
        b.style.top = `${start.top + dy}px`;
    });
    b.addEventListener('pointerup', () => {
        b.classList.remove('dragging');
        start = null;
    });
    b.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } });
});

const hint = document.querySelector('.hero-hint');
if (hint) {
    const hide = () => hint.classList.add('gone');
    setTimeout(hide, 7000);
    hero.addEventListener('pointerdown', hide, { once: true });
}

// ---------- draggable name frame ----------

(function frame() {
    const f = document.getElementById('name-frame'), tag = document.getElementById('size-tag');
    if (!f) return;
    let off = { x: 0, y: 0 }, start = null;
    const size = () => { const r = f.getBoundingClientRect(); tag.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`; };
    size();
    window.addEventListener('resize', size);
    f.addEventListener('pointerdown', e => {
        start = { x: e.clientX - off.x, y: e.clientY - off.y };
        f.classList.add('moving');
        f.setPointerCapture(e.pointerId);
    });
    f.addEventListener('pointermove', e => {
        if (!start) return;
        off = { x: e.clientX - start.x, y: e.clientY - start.y };
        f.style.transform = `translate(${off.x}px, ${off.y}px)`;
        tag.textContent = `x ${Math.round(off.x)}  y ${Math.round(off.y)}`;
    });
    f.addEventListener('pointerup', () => { start = null; f.classList.remove('moving'); size(); });
    f.addEventListener('dblclick', () => { off = { x: 0, y: 0 }; f.style.transform = ''; });
})();

// ---------- dock magnification ----------

(function dock() {
    const d = document.getElementById('dock');
    if (!d || matchMedia('(hover: none)').matches) return;
    const icons = [...d.querySelectorAll('a')];
    d.addEventListener('mousemove', e => {
        for (const a of icons) {
            const r = a.getBoundingClientRect(), cx = r.left + r.width / 2;
            const dist = Math.abs(e.clientX - cx) / (a.style.getPropertyValue('--s') || 1);
            a.style.setProperty('--s', (1 + 0.55 * Math.max(0, 1 - dist / 130)).toFixed(3));
        }
    });
    d.addEventListener('mouseleave', () => icons.forEach(a => a.style.setProperty('--s', 1)));
})();

// ---------- clock, scroll spy, reveal, filter ----------

(function clock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', weekday: 'short' });
    const tick = () => { el.textContent = `London ${fmt.format(new Date())}`; };
    tick();
    setInterval(tick, 15000);
})();

const links = [...document.querySelectorAll('.mb-links a')];
const spy = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle('active', a.dataset.spy === en.target.id));
    }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('#top, main .section').forEach(s => spy.observe(s));

const reveal = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(s => reveal.observe(s));

document.querySelectorAll('.seg button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-selected', b === btn));
        const f = btn.dataset.filter;
        document.querySelectorAll('#research-grid .card').forEach(c => {
            c.style.display = f === 'all' || c.dataset.kind === f ? '' : 'none';
        });
    });
});

// ---------- life of sambhab: fanned playing cards ----------

const CARDS = [
    { rank: 'A', suit: '♣', name: 'Butterfly meadow', sub: 'tap flowers · call the butterfly', href: 'meadow.html', kind: 'meadow' },
    { rank: 'K', suit: '♦', name: 'Mini ramp', sub: 'pump, pop and grab · 60s', href: 'ramp.html', kind: 'ramp' },
    { rank: 'Q', suit: '♥', name: 'Patch to space', sub: 'my 2022 patch, launch to apogee', href: 'launch.html', kind: 'launch' },
    { rank: 'J', suit: '♠', name: '#Bringbackjensen', sub: 'a quiet pause, in pixels', href: 'jensen.html', kind: 'jensen' },
];

const fan = document.getElementById('fan');
if (fan) {
    const n = CARDS.length, title = document.getElementById('fan-title'), sub = document.getElementById('fan-sub');
    const narrow = matchMedia('(max-width: 760px)').matches;
    CARDS.forEach((card, i) => {
        const a = document.createElement('a');
        a.href = card.href;
        const mid = i - (n - 1) / 2;
        a.style.setProperty('--r', `${mid * 6}deg`);
        a.style.setProperty('--x', `${mid * (narrow ? 58 : 128)}px`);
        a.innerHTML = `<span class="suit"><span>${card.rank}</span><span>${card.suit}</span></span><canvas></canvas><span class="card-name">${card.name}</span><span class="card-sub">${card.sub}</span>`;
        fan.appendChild(a);
        const c = a.querySelector('canvas');
        if (card.kind === 'meadow') renderStill(c, 0);
        if (card.kind === 'ramp') createRamp(c, { demo: true });
        if (card.kind === 'launch') {
            const show = createLaunch(c, { onTick(t) { if (t >= DURATION) { show.seek(0); show.play(); } } });
        }
        if (card.kind === 'jensen') {
            import('./animations/jacket-pause/jacket-pause.js').then(({ default: anim }) => {
                const r = anim.createRenderer(c), t0 = performance.now();
                const loop = now => { r.draw((now - t0) / 1000, { opaque: true }); requestAnimationFrame(loop); };
                requestAnimationFrame(loop);
            }).catch(() => {});
        }
        const peek = () => { title.textContent = card.name; sub.textContent = card.sub; };
        a.addEventListener('mouseenter', peek);
        a.addEventListener('focus', peek);
    });
}

// ---------- gentle animation for stickers and glyphs ----------

let lastGlyph = 0;
function animate(now) {
    requestAnimationFrame(animate);
    if (now - lastGlyph < 120) return;
    lastGlyph = now;
    const t = now / 1000;
    if (hero.getBoundingClientRect().bottom > 0) for (const [c, g] of stickerCanvases) paintGlyph(c, g, t);
    for (const c of liveGlyphs) {
        const r = c.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) paintGlyph(c, c.dataset.glyph, t);
    }
}
requestAnimationFrame(animate);
