/**
 * Clean Risograph Stamped Postcards & Interactive Pinboard
 * Every stamp is drawn in code in the exact Paper Rooms risograph house style:
 * perforated dotted edges, ornamental stamp border, halftone dot screens, and 4 riso inks.
 * Starts clean with zero placeholder messages.
 */
(function () {
    'use strict';

    // ---------- Risograph Print Engine (exact houses.js 4-ink palette & halftones) ----------
    const INK = {
        blue: [46, 70, 130],
        coral: [236, 100, 80],
        sun: [255, 204, 46],
        teal: [0, 138, 136]
    };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const SHIFT = { blue: [0.3, -0.2], coral: [-0.35, 0.25], sun: [0.22, 0.35], teal: [-0.25, -0.3] };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    function hash(...parts) {
        let h = 2166136261;
        for (const p of parts) {
            const s = String(p);
            for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
        }
        return h >>> 0;
    }
    function rand(seed) {
        let s = (seed >>> 0) || 1;
        return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    }
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

    const LEVELS = 16, CELL = 2.2, CELLS = 8, RES = 4;
    const tiles = new Map();
    function screenTile(ink, level) {
        const key = ink + level;
        let cv = tiles.get(key);
        if (cv) return cv;
        const cell = CELL * RES, size = cell * CELLS, tone = level / LEVELS;
        cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        const R = rand(hash('st-screen', ink, level));
        c.fillStyle = rgba(INK[ink]);
        if (tone >= 1) c.fillRect(0, 0, size, size);
        else if (tone <= 0.5) {
            for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
                const r = cell * Math.sqrt(tone / Math.PI) * (0.86 + R() * 0.24);
                c.beginPath();
                c.arc((x + 0.5) * cell + (R() - 0.5) * RES * 0.5, (y + 0.5) * cell + (R() - 0.5) * RES * 0.5, r, 0, TAU);
                c.fill();
            }
        } else {
            c.fillRect(0, 0, size, size);
            c.globalCompositeOperation = 'destination-out';
            for (let y = 0; y <= CELLS; y++) for (let x = 0; x <= CELLS; x++) {
                const r = cell * Math.sqrt((1 - tone) / Math.PI) * (0.86 + R() * 0.24);
                c.beginPath(); c.arc(x * cell, y * cell, r, 0, TAU); c.fill();
            }
        }
        tiles.set(key, cv);
        return cv;
    }

    function createPen(c, seed) {
        const R = rand(seed);
        const patterns = new Map();
        const pat = (ink, tone) => {
            const level = clamp(Math.round(tone * LEVELS), 1, LEVELS);
            const key = ink + level;
            let p = patterns.get(key);
            if (!p) {
                p = c.createPattern(screenTile(ink, level), 'repeat');
                if (p.setTransform) p.setTransform(new DOMMatrix().rotateSelf(ANGLE[ink]).scaleSelf(1 / RES));
                patterns.set(key, p);
            }
            return p;
        };
        const P = {};
        const wobble = (pts, closed, amp) => {
            const out = [], n = pts.length, segs = closed ? n : n - 1;
            for (let s = 0; s < segs; s++) {
                const a = pts[s], b = pts[(s + 1) % n];
                const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
                const steps = Math.max(1, Math.ceil(len / 6));
                const nx = -dy / len, ny = dx / len;
                for (let k = 0; k < steps; k++) {
                    const t = k / steps, o = (R() - 0.5) * 2 * amp;
                    out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
                }
            }
            if (!closed) out.push(pts[n - 1]);
            return out;
        };
        P.path = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); };
        P.knock = pts => { c.globalCompositeOperation = 'source-over'; P.path(pts); c.fillStyle = '#fffdf8'; c.fill(); };
        P.fill = (pts, ink, tone) => {
            if (tone <= 0.02) return;
            c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            P.path(pts); c.fillStyle = pat(ink, tone); c.fill(); c.restore();
        };
        P.line = (pts, w = 1, ink = 'blue', closed = false, amp = 0.35) => {
            if (pts.length < 2) return;
            const q = wobble(pts, closed, amp);
            c.save(); c.globalCompositeOperation = 'multiply'; c.translate(SHIFT[ink][0], SHIFT[ink][1]);
            c.strokeStyle = rgba(INK[ink], 0.94); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(q[0][0], q[0][1]);
            for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]);
            if (closed) c.closePath(); c.stroke(); c.restore();
        };
        P.shape = (pts, fills = [], o = {}) => {
            P.knock(pts);
            for (const [ink, tone] of fills) P.fill(pts, ink, tone);
            if (o.line !== false) P.line(pts, o.lw ?? 1, o.ink || 'blue', true, o.amp ?? 0.32);
        };
        P.rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        P.circle = (cx, cy, r, n = 16) => Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * TAU) * r, cy + Math.sin(k / n * TAU) * r]);
        return P;
    }

    // ---------- 8 Code-Drawn Risograph House-Style Postage Stamps ----------
    const STAMPS = [
        {
            id: 1,
            name: 'Paper House',
            borderInk: 'blue',
            bg: [['sun', 0.14]],
            draw(P) {
                // Isometric mini cutaway house
                P.shape([[50, 42], [74, 54], [50, 66], [26, 54]], [['sun', 0.38]], { lw: 0.9 });
                P.shape([[26, 54], [26, 30], [50, 18], [50, 42]], [['teal', 0.45]], { lw: 0.9 });
                P.shape([[50, 42], [50, 18], [74, 30], [74, 54]], [['coral', 0.32]], { lw: 0.9 });
                P.shape([[35, 39], [43, 35], [43, 45], [35, 49]], [['sun', 0.8]], { lw: 0.75 });
                P.shape([[57, 36], [65, 40], [65, 50], [57, 46]], [['blue', 0.55]], { lw: 0.75 });
                // Sun above house
                P.shape(P.circle(68, 22, 6, 12), [['sun', 0.9]], { lw: 0.75, ink: 'coral' });
            }
        },
        {
            id: 2,
            name: 'UCL Portico',
            borderInk: 'teal',
            bg: [['teal', 0.1]],
            draw(P) {
                // Dome + classical pediment + columns
                P.shape(P.circle(50, 34, 13, 16), [['teal', 0.65], ['sun', 0.3]], { lw: 0.85 });
                P.shape([[22, 46], [50, 33], [78, 46]], [['sun', 0.32], ['coral', 0.18]], { lw: 0.9 });
                P.shape(P.rect(24, 46, 52, 5), [['blue', 0.2]], { lw: 0.8 });
                for (let k = 0; k < 5; k++) {
                    P.shape(P.rect(28 + k * 10, 51, 4, 24), [['sun', 0.25]], { lw: 0.75 });
                }
                P.shape(P.rect(20, 75, 60, 5), [['coral', 0.45]], { lw: 0.85 });
            }
        },
        {
            id: 3,
            name: 'Sounding Rocket',
            borderInk: 'coral',
            bg: [['blue', 0.14]],
            draw(P) {
                // Stars
                for (const [sx, sy] of [[26, 26], [72, 24], [74, 48], [24, 52]]) {
                    P.shape(P.circle(sx, sy, 2, 8), [['sun', 0.95]], { lw: 0.5 });
                }
                // Exhaust plume
                P.shape([[44, 65], [56, 65], [50, 82]], [['sun', 0.92], ['coral', 0.45]], { lw: 0.75 });
                // Fins
                P.shape([[43, 52], [33, 66], [43, 63]], [['coral', 0.88]], { lw: 0.8 });
                P.shape([[57, 52], [67, 66], [57, 63]], [['coral', 0.88]], { lw: 0.8 });
                // Fuselage + nosecone
                P.shape(P.rect(43, 30, 14, 34), [['sun', 0.1]], { lw: 0.9 });
                P.shape([[43, 30], [50, 16], [57, 30]], [['coral', 0.9]], { lw: 0.9 });
                P.shape(P.circle(50, 44, 4.5, 12), [['teal', 0.75]], { lw: 0.75 });
            }
        },
        {
            id: 4,
            name: 'Lab Flask',
            borderInk: 'teal',
            bg: [['sun', 0.12]],
            draw(P) {
                // Erlenmeyer flask with bubbling teal & coral liquid
                P.shape([[44, 24], [56, 24], [56, 40], [72, 74], [28, 74], [44, 40]], [['sun', 0.08]], { lw: 0.95 });
                P.shape([[35, 58], [65, 58], [71, 73], [29, 73]], [['teal', 0.65], ['sun', 0.25]], { lw: 0.75 });
                P.shape(P.circle(45, 65, 3, 10), [['coral', 0.8]], { lw: 0.6 });
                P.shape(P.circle(55, 62, 2.4, 10), [['sun', 0.9]], { lw: 0.6 });
                P.shape(P.circle(50, 48, 2.5, 10), [['teal', 0.7]], { lw: 0.6 });
                P.shape(P.circle(48, 17, 3, 10), [['coral', 0.75]], { lw: 0.6 });
            }
        },
        {
            id: 5,
            name: 'Classical Violin',
            borderInk: 'coral',
            bg: [['sun', 0.16]],
            draw(P) {
                // Bow diagonal
                P.line([[24, 72], [76, 26]], 1.4, 'blue');
                // Violin body
                P.shape(P.circle(50, 62, 13, 14), [['coral', 0.62], ['sun', 0.45]], { lw: 0.9 });
                P.shape(P.circle(50, 46, 10, 14), [['coral', 0.62], ['sun', 0.45]], { lw: 0.9 });
                P.shape(P.rect(47, 20, 6, 24), [['blue', 0.8]], { lw: 0.75 });
                P.line([[49, 22], [49, 70]], 0.7, 'sun');
                P.line([[51, 22], [51, 70]], 0.7, 'sun');
                P.shape(P.circle(50, 18, 3.2, 10), [['coral', 0.75]], { lw: 0.7 });
            }
        },
        {
            id: 6,
            name: 'Solar Cart',
            borderInk: 'blue',
            bg: [['teal', 0.1]],
            draw(P) {
                // Sun rays top right
                P.shape(P.circle(72, 24, 7, 12), [['sun', 0.95]], { lw: 0.75, ink: 'coral' });
                // Solar canopy
                P.shape([[24, 34], [70, 28], [72, 36], [26, 42]], [['blue', 0.8], ['teal', 0.35]], { lw: 0.9 });
                P.line([[32, 41], [32, 54]], 1.2, 'blue');
                P.line([[64, 37], [64, 54]], 1.2, 'blue');
                // Cart body + spoked wheels
                P.shape(P.rect(28, 52, 40, 16), [['teal', 0.68]], { lw: 0.9 });
                P.shape(P.circle(38, 72, 7, 12), [['coral', 0.85]], { lw: 0.85 });
                P.shape(P.circle(58, 72, 7, 12), [['coral', 0.85]], { lw: 0.85 });
            }
        },
        {
            id: 7,
            name: 'Riemann Zeta',
            borderInk: 'blue',
            bg: [['blue', 0.1]],
            draw(P) {
                // Slate board frame
                P.shape(P.rect(20, 22, 60, 56), [['blue', 0.82], ['teal', 0.18]], { lw: 0.95 });
                // Critical line + oscillating zeta wave + zeros
                P.line([[50, 26], [50, 74]], 1.2, 'sun');
                const wave = [];
                for (let k = 0; k <= 14; k++) {
                    const y = 28 + k * 3.1;
                    wave.push([50 + Math.sin(k * 0.9) * 14, y]);
                }
                P.line(wave, 1.3, 'coral');
                for (let k = 0; k < 4; k++) {
                    P.shape(P.circle(50, 34 + k * 11, 2.8, 10), [['sun', 0.98]], { lw: 0.5 });
                }
            }
        },
        {
            id: 8,
            name: 'Paper Plane',
            borderInk: 'coral',
            bg: [['teal', 0.12]],
            draw(P) {
                // Halftone cloud
                P.shape(P.circle(34, 64, 9, 12), [['sun', 0.1]], { lw: 0.8 });
                P.shape(P.circle(46, 61, 11, 12), [['sun', 0.1]], { lw: 0.8 });
                P.shape(P.circle(58, 65, 8, 12), [['sun', 0.1]], { lw: 0.8 });
                // Dotted flight trail
                P.line([[22, 56], [38, 46]], 1.0, 'teal');
                // Coral risograph paper airplane
                P.shape([[26, 36], [76, 24], [52, 50]], [['coral', 0.86]], { lw: 0.9 });
                P.shape([[44, 44], [76, 24], [52, 50]], [['sun', 0.85]], { lw: 0.75 });
            }
        }
    ];

    // Render a stamp canvas with authentic serrated/dotted postage-stamp edges & risograph inner border
    const stampDataCache = new Map();
    function renderStampCanvas(st, cssW, cssH) {
        const key = `${st.id}-${cssW}-${cssH}`;
        const cv = document.createElement('canvas');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(cssW * dpr);
        cv.height = Math.round(cssH * dpr);
        cv.style.width = cssW + 'px';
        cv.style.height = cssH + 'px';
        cv.className = 'stamp-canvas';

        let cached = stampDataCache.get(key);
        if (!cached) {
            cached = document.createElement('canvas');
            cached.width = cv.width;
            cached.height = cv.height;
            const c = cached.getContext('2d');
            c.scale(cv.width / 100, cv.height / 116);

            // 1. Cream risograph stamp paper base
            c.fillStyle = '#fdfbf6';
            c.fillRect(0, 0, 100, 116);

            // 2. Draw risograph inner artwork + full ornamental stamp border
            const P = createPen(c, hash('stamp-art', st.id));
            // Outer fine frame & inner dotted/lined stamp border
            P.shape(P.rect(10, 10, 80, 96), st.bg || [], { lw: 1.25, ink: st.borderInk });
            P.line(P.rect(14, 14, 72, 88), 0.75, st.borderInk, true, 0.22);

            // Corner riso dots inside border
            for (const [cx, cy] of [[16.5, 16.5], [83.5, 16.5], [16.5, 99.5], [83.5, 99.5]]) {
                P.shape(P.circle(cx, cy, 1.8, 8), [['coral', 0.8]], { lw: 0.4 });
            }

            // Centerpiece riso illustration (shifted slightly for balanced stamp framing)
            c.save();
            c.translate(0, 8);
            st.draw(P);
            c.restore();

            // 3. Punch authentic circular postage-stamp perforations around all 4 edges!
            c.globalCompositeOperation = 'destination-out';
            const r = 3.4;
            for (let x = 0; x <= 100; x += 10) {
                c.beginPath(); c.arc(x, 0, r, 0, TAU); c.fill();
                c.beginPath(); c.arc(x, 116, r, 0, TAU); c.fill();
            }
            for (let y = 0; y <= 116; y += 10.5) {
                c.beginPath(); c.arc(0, y, r, 0, TAU); c.fill();
                c.beginPath(); c.arc(100, y, r, 0, TAU); c.fill();
            }

            // Subtle riso edge ink outline tracing the perforated rim
            c.globalCompositeOperation = 'source-over';
            stampDataCache.set(key, cached);
        }

        cv.getContext('2d').drawImage(cached, 0, 0);
        return cv;
    }

    // ---------- Sound ----------
    let audioCtx = null;
    function playTick(kind) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const now = audioCtx.currentTime;
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            if (kind === 'stamp') {
                o.type = 'triangle';
                o.frequency.setValueAtTime(170, now);
                o.frequency.exponentialRampToValueAtTime(54, now + 0.09);
                g.gain.setValueAtTime(0.22, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                o.connect(g).connect(audioCtx.destination);
                o.start(now); o.stop(now + 0.11);
            } else {
                o.type = 'sine';
                o.frequency.setValueAtTime(520, now);
                o.frequency.exponentialRampToValueAtTime(300, now + 0.04);
                g.gain.setValueAtTime(0.07, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
                o.connect(g).connect(audioCtx.destination);
                o.start(now); o.stop(now + 0.05);
            }
        } catch (e) {}
    }

    // ---------- Composer & Board State ----------
    const STORAGE_KEY = 'sambhab_postcards_v2';
    const choicesEl = document.getElementById('stamp-choices');
    const previewEl = document.getElementById('active-stamp-preview');
    const shuffleBtn = document.getElementById('shuffle-stamps');
    const formEl = document.getElementById('postcard-form');
    const textEl = document.getElementById('postcard-text');
    const fromEl = document.getElementById('postcard-from');
    const sendBtn = document.getElementById('send-btn');
    const noticeEl = document.getElementById('form-notice');
    const pinboardEl = document.getElementById('pinboard');

    // ---------- Content Safety & Profanity Filter ----------
    // Catches English + Hinglish profanity, slurs, leetspeak (f*ck, sh1t, b!tch),
    // stretched letters (fuuuuck), and spaced bypasses (f u c k).
    const BLOCKED_WORDS = [
        'fuck', 'fucker', 'fucking', 'fucked', 'fck', 'fuk', 'fvck', 'phuck', 'mf', 'motherfucker',
        'shit', 'shitty', 'bullshit', 'sh1t', 'bitch', 'btch', 'b1tch', 'biatch',
        'asshole', 'arsehole', 'dumbass', 'jackass', 'bastard', 'cunt', 'cnt', 'dick', 'd1ck',
        'cock', 'pussy', 'twat', 'slut', 'whore', 'hoe', 'skank', 'wanker', 'prick', 'bollocks',
        'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'kike', 'chink', 'spic',
        'kys', 'kill yourself', 'rape', 'rapist', 'nazi', 'hitler', 'porn', 'xxx', 'nude', 'nudes',
        'madarchod', 'behenchod', 'bhenchod', 'bhenc', 'bhosdike', 'bhosdi', 'bhosda',
        'chutiya', 'chutiye', 'chut', 'lund', 'lauda', 'lavda', 'gaand', 'gand', 'gandu',
        'harami', 'haramkhor', 'kamina', 'kamine', 'kutta', 'kutti', 'kutiya', 'saala', 'sala',
        'randi', 'mc', 'bc', 'bkl', 'mkc', 'bsdk', 'chinal', 'jhatu', 'lodu', 'loda', 'suar'
    ];
    const STRICT_SUBSTRINGS = [
        'fuck', 'fck', 'fvck', 'motherfuck', 'cunt', 'nigger', 'nigga', 'faggot', 'bitch',
        'asshole', 'whore', 'madarchod', 'behenchod', 'bhenchod', 'bhosdike', 'chutiya', 'gandu', 'randi'
    ];

    function normalizeForFilter(str) {
        return String(str || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f\u200B-\u200D\uFEFF]/g, '')
            .toLowerCase()
            .replace(/[0@4]/g, m => (m === '0' ? 'o' : 'a'))
            .replace(/[1!|]/g, 'i')
            .replace(/3/g, 'e')
            .replace(/[5$]/g, 's')
            .replace(/7/g, 't')
            .replace(/8/g, 'b')
            .replace(/(.)\1{2,}/g, '$1$1');
    }

    function hasBlockedContent(raw) {
        if (!raw) return false;
        const lower = String(raw).toLowerCase();
        // Block HTML / script injection patterns
        if (/<\s*\/?\s*(script|iframe|img|svg|object|embed|style|link)|javascript:|on\w+\s*=/i.test(lower)) return true;

        const norm = normalizeForFilter(raw);
        const tokens = norm.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
        const collapsed = norm.replace(/[^a-z0-9]/g, '');
        const sqCollapsed = collapsed.replace(/(.)\1+/g, '$1');

        for (const w of BLOCKED_WORDS) {
            if (w.includes(' ')) {
                if (norm.includes(w)) return true;
            } else {
                const sqW = w.replace(/(.)\1+/g, '$1');
                for (const tok of tokens) {
                    const sqTok = tok.replace(/(.)\1+/g, '$1');
                    if (tok === w || sqTok === sqW) return true;
                }
            }
        }
        for (const sub of STRICT_SUBSTRINGS) {
            const sqSub = sub.replace(/(.)\1+/g, '$1');
            if (collapsed.includes(sub) || sqCollapsed.includes(sqSub)) return true;
        }
        return false;
    }

    function showNotice(msg) {
        if (noticeEl) noticeEl.textContent = msg || '';
    }
    const tidyBtn = document.getElementById('btn-tidy');
    const scatterBtn = document.getElementById('btn-scatter');

    const nowDate = new Date();
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const todayStr = `${nowDate.getDate()} ${MONTHS[nowDate.getMonth()]}`;

    const urlStamp = parseInt(new URLSearchParams(window.location.search).get('stamp'), 10);
    let selectedStamp = STAMPS.find(s => s.id === urlStamp) || STAMPS[0];
    let selectedInk = 'blue';
    let currentFour = [];

    function renderPreview() {
        previewEl.innerHTML = '';
        previewEl.appendChild(renderStampCanvas(selectedStamp, 86, 100));
    }

    function renderStampChoices() {
        choicesEl.innerHTML = '';
        for (const st of currentFour) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stamp-btn';
            btn.title = st.name;
            btn.setAttribute('aria-label', st.name);
            btn.setAttribute('aria-pressed', String(st.id === selectedStamp.id));
            btn.appendChild(renderStampCanvas(st, 56, 65));
            btn.addEventListener('click', () => {
                selectedStamp = st;
                renderPreview();
                renderStampChoices();
                playTick('pick');
            });
            choicesEl.appendChild(btn);
        }
    }

    function pickFour(includeStamp) {
        const pool = STAMPS.filter(s => s.id !== includeStamp.id).sort(() => Math.random() - 0.5);
        currentFour = [includeStamp, ...pool.slice(0, 3)].sort(() => Math.random() - 0.5);
        renderStampChoices();
    }

    shuffleBtn.addEventListener('click', () => {
        const next = STAMPS[Math.floor(Math.random() * STAMPS.length)];
        selectedStamp = next;
        renderPreview();
        pickFour(next);
        playTick('pick');
    });

    document.querySelectorAll('.ink-dot').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedInk = btn.dataset.ink;
            document.querySelectorAll('.ink-dot').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        });
    });

    textEl.addEventListener('input', () => {
        showNotice('');
        sendBtn.disabled = textEl.value.trim().length === 0;
    });
    fromEl.addEventListener('input', () => showNotice(''));

    // ---------- Clean Pinboard (starts empty, persists real user postcards) ----------
    function loadCards() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.filter(c => c && typeof c.text === 'string' && !hasBlockedContent(c.text) && !hasBlockedContent(c.from || ''));
                }
            }
        } catch (e) {}
        return [];
    }

    function saveCards() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch (e) {}
    }

    let cards = loadCards();
    let topZ = 10;
    const bodies = new Map();

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function applyTransform(el, b) {
        el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.rot.toFixed(2)}deg)`;
    }

    function renderBoard() {
        pinboardEl.innerHTML = '';
        bodies.clear();

        const bw = Math.max(320, pinboardEl.clientWidth || 860);
        const rowsNeeded = Math.max(2, Math.ceil(cards.length / Math.max(1, Math.floor((bw - 40) / 292))));
        pinboardEl.style.minHeight = Math.max(460, rowsNeeded * 236 + 50) + 'px';

        cards.forEach((c, idx) => {
            const st = STAMPS.find(s => s.id === c.stampId) || STAMPS[0];
            const el = document.createElement('article');
            el.className = `pin-card ink-${c.ink || 'blue'}`;
            el.style.zIndex = String(++topZ);
            el.innerHTML = `
                <span class="pin-tack" aria-hidden="true"></span>
                <div class="pin-top">
                    <p class="pin-msg">${escapeHtml(c.text)}</p>
                    <div class="pin-stamp-wrap"></div>
                </div>
                <div class="pin-foot">
                    <span class="pin-from">${c.from ? escapeHtml(c.from) : ''}</span>
                    <span>${escapeHtml(c.date || todayStr)}</span>
                </div>
            `;
            el.querySelector('.pin-stamp-wrap').appendChild(renderStampCanvas(st, 60, 70));

            const body = { x: c.x ?? 28, y: c.y ?? 28, rot: c.rot ?? 0, vx: 0, vy: 0, dragging: false, card: c, el };
            bodies.set(c.id || idx, body);
            applyTransform(el, body);

            let startX = 0, startY = 0, origX = 0, origY = 0, lastX = 0, lastY = 0, lastT = 0;
            el.addEventListener('pointerdown', e => {
                e.preventDefault();
                body.dragging = true;
                body.vx = 0; body.vy = 0;
                el.classList.add('dragging');
                el.style.zIndex = String(++topZ);
                el.setPointerCapture(e.pointerId);
                startX = lastX = e.clientX;
                startY = lastY = e.clientY;
                origX = body.x; origY = body.y;
                lastT = performance.now();
            });
            el.addEventListener('pointermove', e => {
                if (!body.dragging) return;
                const now = performance.now();
                const dt = Math.max(8, now - lastT);
                body.x = origX + (e.clientX - startX);
                body.y = origY + (e.clientY - startY);
                body.vx = ((e.clientX - lastX) / dt) * 16;
                body.vy = ((e.clientY - lastY) / dt) * 16;
                lastX = e.clientX; lastY = e.clientY; lastT = now;
                applyTransform(el, body);
            });
            const endDrag = () => {
                if (!body.dragging) return;
                body.dragging = false;
                el.classList.remove('dragging');
                body.card.x = body.x;
                body.card.y = body.y;
                saveCards();
            };
            el.addEventListener('pointerup', endDrag);
            el.addEventListener('pointercancel', endDrag);

            pinboardEl.appendChild(el);
        });
    }

    function stepPhysics() {
        const bw = pinboardEl.clientWidth || 860;
        const bh = pinboardEl.clientHeight || 460;
        bodies.forEach(b => {
            if (b.dragging) return;
            if (Math.abs(b.vx) > 0.12 || Math.abs(b.vy) > 0.12) {
                b.x += b.vx;
                b.y += b.vy;
                b.vx *= 0.91;
                b.vy *= 0.91;
                const maxX = Math.max(12, bw - b.el.offsetWidth - 12);
                const maxY = Math.max(16, bh - b.el.offsetHeight - 12);
                if (b.x < 12) { b.x = 12; b.vx *= -0.45; }
                if (b.x > maxX) { b.x = maxX; b.vx *= -0.45; }
                if (b.y < 16) { b.y = 16; b.vy *= -0.45; }
                if (b.y > maxY) { b.y = maxY; b.vy *= -0.45; }
                b.card.x = b.x; b.card.y = b.y;
                applyTransform(b.el, b);
            }
        });
        requestAnimationFrame(stepPhysics);
    }

    tidyBtn.addEventListener('click', () => {
        const bw = Math.max(320, pinboardEl.clientWidth || 860);
        const cardW = 268, gap = 22;
        const cols = Math.max(1, Math.floor((bw - 32) / (cardW + gap)));
        const padX = Math.max(16, (bw - cols * cardW - (cols - 1) * gap) / 2);
        cards.forEach((c, idx) => {
            const col = idx % cols, row = Math.floor(idx / cols);
            c.x = padX + col * (cardW + gap);
            c.y = 26 + row * 228;
            c.rot = (idx % 2) ? 0.6 : -0.6;
            const b = bodies.get(c.id || idx);
            if (b) {
                b.x = c.x; b.y = c.y; b.rot = c.rot; b.vx = 0; b.vy = 0;
                b.el.style.transition = 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)';
                applyTransform(b.el, b);
                setTimeout(() => { b.el.style.transition = ''; }, 380);
            }
        });
        saveCards();
        playTick('pick');
    });

    scatterBtn.addEventListener('click', () => {
        const bw = Math.max(320, pinboardEl.clientWidth || 860);
        const bh = Math.max(460, pinboardEl.clientHeight || 460);
        cards.forEach((c, idx) => {
            c.x = 24 + Math.random() * Math.max(20, bw - 310);
            c.y = 24 + Math.random() * Math.max(20, bh - 220);
            c.rot = (Math.random() - 0.5) * 9;
            const b = bodies.get(c.id || idx);
            if (b) {
                b.x = c.x; b.y = c.y; b.rot = c.rot; b.vx = 0; b.vy = 0;
                b.el.style.transition = 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)';
                applyTransform(b.el, b);
                setTimeout(() => { b.el.style.transition = ''; }, 380);
            }
        });
        saveCards();
        playTick('pick');
    });

    let lastPostAt = 0;
    formEl.addEventListener('submit', e => {
        e.preventDefault();
        const text = textEl.value.trim();
        if (!text) return;
        const from = fromEl.value.trim();
        if (hasBlockedContent(text) || hasBlockedContent(from)) {
            showNotice('please keep it respectful.');
            return;
        }
        const now = Date.now();
        if (now - lastPostAt < 2500) {
            showNotice('wait a moment before pinning again.');
            return;
        }
        lastPostAt = now;
        showNotice('');
        const bw = Math.max(320, pinboardEl.clientWidth || 860);
        const newCard = {
            id: 'card-' + Date.now(),
            text,
            from,
            stampId: selectedStamp.id,
            ink: selectedInk,
            date: todayStr,
            x: Math.max(20, Math.min(bw - 292, 32 + (cards.length % 3) * 288 + (Math.random() - 0.5) * 20)),
            y: 28 + Math.floor(cards.length / 3) * 228 + (Math.random() - 0.5) * 16,
            rot: (Math.random() - 0.5) * 5
        };
        cards.unshift(newCard);
        saveCards();
        textEl.value = '';
        fromEl.value = '';
        sendBtn.disabled = true;
        playTick('stamp');
        renderBoard();
    });

    renderPreview();
    pickFour(selectedStamp);
    renderBoard();
    requestAnimationFrame(stepPhysics);
})();
