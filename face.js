/**
 * Interactive hand-drawn risograph portrait for Sambhab Mishra.
 * Natural 2.5D head/eye tracking, subtle human expressions, and casual chat.
 */
(function () {
    'use strict';

    const root = document.createElement('div');
    root.className = 'sam-buddy';
    root.innerHTML = `
        <div class="sam-bubble hidden" id="sam-bubble" role="status" aria-live="polite">
            <button type="button" class="sam-close" id="sam-close" aria-label="Close">×</button>
            <p class="sam-text" id="sam-text"></p>
            <div class="sam-chips" id="sam-chips"></div>
        </div>
        <button type="button" class="sam-face-btn" id="sam-face-btn" aria-label="Interactive portrait of Sambhab. Click to chat." title="click to talk">
            <canvas id="sam-face" width="144" height="144"></canvas>
        </button>
    `;
    document.body.appendChild(root);

    const bubble = document.getElementById('sam-bubble');
    const textEl = document.getElementById('sam-text');
    const chipsEl = document.getElementById('sam-chips');
    const closeBtn = document.getElementById('sam-close');
    const faceBtn = document.getElementById('sam-face-btn');
    const canvas = document.getElementById('sam-face');
    const ctx = canvas.getContext('2d');

    // ---------- Casual, grounded dialogue ----------

    const POKE_LINES = [
        { mood: 'smirk', text: "hey. feel free to look around." },
        { mood: 'annoyed', text: "easy, watch the nose." },
        { mood: 'warm', text: "half my week is in a wet lab, the other half is painting or breaking code." },
        { mood: 'skeptic', text: "did you try the tennis game under Fun? the bot doesn't go easy." },
        { mood: 'smirk', text: "open the sketchbook if you want to see my paintings. you can actually fold the pages." },
        { mood: 'warm', text: "click UCL up top if you want to see the portico." },
        { mood: 'thinking', text: "probably should be reading a paper right now instead of sitting in this corner." },
    ];

    const TOO_MANY_POKES = [
        { mood: 'annoyed', text: "alright, that's enough poking." },
        { mood: 'skeptic', text: "seriously? again?" },
        { mood: 'smirk', text: "you're really committed to clicking my face." },
    ];

    const FOREHEAD_LINES = [
        { mood: 'warm', text: "alright, fair enough." },
        { mood: 'smirk', text: "that's slightly better than poking my eye." },
    ];

    const QA = [
        {
            q: "what do you work on?",
            mood: 'thinking',
            a: "rapid AMR diagnostics mostly, plus protein modelling and microbiome stuff. about 80% wet lab, 20% code."
        },
        {
            q: "UCL?",
            mood: 'warm',
            a: "doing my undergrad there in bloomsbury. click UCL in the line above if you want to see the main building."
        },
        {
            q: "do you actually paint?",
            mood: 'smirk',
            a: "yeah, oils and digital stuff whenever i get time. put thirteen of them in the sketchbook."
        },
        {
            q: "what's in the house?",
            mood: 'warm',
            a: "six rooms i put together: a lab, library, garden, football corner, arcade, and observatory. click enter on the left."
        },
        {
            q: "outside the lab?",
            mood: 'warm',
            a: "classical violin, oil painting, swimming, and collecting old colonial indian stamps."
        },
        {
            q: "get in touch?",
            mood: 'smirk',
            a: "just send an email. i read everything."
        },
    ];

    QA.forEach(item => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sam-chip';
        b.textContent = item.q;
        b.addEventListener('click', e => {
            e.stopPropagation();
            speak(item.a, item.mood);
            S.nod = 1;
        });
        chipsEl.appendChild(b);
    });

    // ---------- State ----------

    const S = {
        mood: 'idle',
        moodUntil: 0,
        talking: false,
        lookX: 0,
        lookY: 0,
        targetX: 0,
        targetY: 0,
        wanderX: 0,
        wanderY: 0,
        lastMove: performance.now(),
        blink: 0,
        nextBlink: performance.now() + 2800,
        pokeCount: 0,
        lastPoke: 0,
        pokeIdx: 0,
        nod: 0,
        flinch: 0,
    };

    let typeTimer = null;

    function speak(msg, mood = 'warm') {
        clearInterval(typeTimer);
        bubble.classList.remove('hidden');
        textEl.textContent = '';
        S.mood = mood;
        S.talking = true;
        S.moodUntil = performance.now() + 6000;
        let i = 0;
        typeTimer = setInterval(() => {
            i++;
            textEl.textContent = msg.slice(0, i);
            if (i >= msg.length) {
                clearInterval(typeTimer);
                S.talking = false;
                S.mood = mood;
                S.moodUntil = performance.now() + 4200;
            }
        }, 24);
    }

    faceBtn.addEventListener('pointerdown', e => {
        const r = faceBtn.getBoundingClientRect();
        const relY = (e.clientY - r.top) / r.height;
        const now = performance.now();

        if (now - S.lastPoke < 800) S.pokeCount++;
        else S.pokeCount = 1;
        S.lastPoke = now;
        S.flinch = 1;

        if (S.pokeCount >= 4) {
            const p = TOO_MANY_POKES[(S.pokeCount - 4) % TOO_MANY_POKES.length];
            speak(p.text, p.mood);
            return;
        }
        if (relY < 0.3) {
            const p = FOREHEAD_LINES[S.pokeIdx++ % FOREHEAD_LINES.length];
            speak(p.text, p.mood);
            return;
        }
        const p = POKE_LINES[S.pokeIdx++ % POKE_LINES.length];
        speak(p.text, p.mood);
    });

    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        clearInterval(typeTimer);
        S.talking = false;
        bubble.classList.add('hidden');
        S.mood = 'idle';
    });

    addEventListener('pointermove', e => {
        S.lastMove = performance.now();
        const r = faceBtn.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / 300;
        const dy = (e.clientY - cy) / 300;
        const d = Math.hypot(dx, dy);
        const cap = d > 1 ? 1 / d : 1;
        S.targetX = dx * cap;
        S.targetY = dy * cap;
    });

    // ---------- Risograph Portrait Renderer ----------

    const INK = { blue: [46, 70, 130], coral: [236, 100, 80], sun: [255, 204, 46], teal: [0, 138, 136] };
    const SHIFT = { blue: [0.25, -0.18], coral: [-0.3, 0.22], sun: [0.18, 0.3], teal: [-0.22, -0.25] };
    const ANGLE = { blue: 15, coral: 75, sun: 0, teal: 45 };
    const TAU = Math.PI * 2;
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    function hash(s) {
        let h = 2166136261;
        for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function rand(seed) {
        let s = (seed >>> 0) || 1;
        return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    }

    const pats = new Map();
    function pat(ink, tone) {
        const key = ink + tone;
        if (pats.has(key)) return pats.get(key);
        const cell = 10, cells = 6, size = cell * cells;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const g = cv.getContext('2d');
        const R = rand(hash('hp' + key));
        g.fillStyle = rgba(INK[ink]);
        for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
            const rad = cell * Math.sqrt(tone / Math.PI) * (0.86 + R() * 0.24);
            g.beginPath();
            g.arc((x + 0.5) * cell + (R() - 0.5) * 1.4, (y + 0.5) * cell + (R() - 0.5) * 1.4, rad, 0, TAU);
            g.fill();
        }
        const p = ctx.createPattern(cv, 'repeat');
        if (p.setTransform) p.setTransform(new DOMMatrix().rotateSelf(ANGLE[ink]).scaleSelf(0.24));
        pats.set(key, p);
        return p;
    }

    function ellipsePts(cx, cy, rx, ry, n = 22) {
        const pts = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * TAU;
            pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
        }
        return pts;
    }

    function makePen(seed) {
        const R = rand(seed);
        function wobble(pts, closed, amp) {
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
        }
        return {
            knock(pts) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
                ctx.closePath();
                ctx.fill();
            },
            fill(pts, ink, tone) {
                ctx.save();
                ctx.globalCompositeOperation = 'multiply';
                ctx.translate(SHIFT[ink][0], SHIFT[ink][1]);
                ctx.beginPath();
                pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
                ctx.closePath();
                ctx.fillStyle = pat(ink, tone);
                ctx.fill();
                ctx.restore();
            },
            line(pts, w = 1.4, ink = 'blue', closed = false, amp = 0.35) {
                if (pts.length < 2) return;
                const q = wobble(pts, closed, amp);
                ctx.save();
                ctx.globalCompositeOperation = 'multiply';
                ctx.translate(SHIFT[ink][0], SHIFT[ink][1]);
                ctx.strokeStyle = rgba(INK[ink], 0.94);
                ctx.lineWidth = w;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
                if (closed) ctx.closePath();
                ctx.stroke();
                ctx.restore();
            },
        };
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const SIZE = 144;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;

    function drawFace(now, dt) {
        const t = now / 1000;
        const boil = Math.floor(t * 4) % 3;
        const P = makePen(hash('portrait' + boil));

        // Subtle idle eye drift if cursor hasn't moved recently
        if (now - S.lastMove > 3500) {
            S.wanderX = Math.sin(t * 0.45) * 0.35;
            S.wanderY = Math.cos(t * 0.31) * 0.18;
            S.targetX += (S.wanderX - S.targetX) * dt * 1.2;
            S.targetY += (S.wanderY - S.targetY) * dt * 1.2;
        }

        const tx = S.mood === 'thinking' ? -0.55 : S.targetX;
        const ty = S.mood === 'thinking' ? -0.45 : S.targetY;
        S.lookX += (tx - S.lookX) * Math.min(1, dt * 8);
        S.lookY += (ty - S.lookY) * Math.min(1, dt * 8);
        S.flinch *= Math.pow(0.015, dt);
        S.nod *= Math.pow(0.03, dt);

        if (!S.talking && S.mood !== 'idle' && now > S.moodUntil) {
            S.mood = 'idle';
        }

        if (now > S.nextBlink) {
            S.blink = 1;
            S.nextBlink = now + 2800 + Math.random() * 3400;
        }
        if (S.blink > 0) S.blink = Math.max(0, S.blink - dt * 8.5);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, SIZE, SIZE);

        const breath = Math.sin(t * 1.9) * 1.0;
        const tilt = S.lookX * 0.055 + (S.mood === 'skeptic' ? 0.05 : 0) - S.flinch * 0.07;

        ctx.save();
        ctx.translate(72, 76 + breath + S.nod * 2.5 - S.flinch * 3);
        ctx.rotate(tilt);

        // Soft paper medallion frame
        const med = ellipsePts(0, -2, 56, 56, 28);
        P.knock(med);
        P.fill(med, 'sun', 0.14);
        P.line(med, 1.5, 'blue', true, 0.45);

        // Clip inside medallion so collar/shoulders sit cleanly like a sketch portrait
        ctx.save();
        ctx.beginPath();
        med.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.clip();

        // Collar & shoulders (dark ink/teal jacket)
        const shoulders = [[-40, 56], [-32, 35], [-13, 30], [13, 30], [32, 35], [40, 56]];
        P.knock(shoulders);
        P.fill(shoulders, 'teal', 0.55);
        P.fill(shoulders, 'blue', 0.25);
        P.line(shoulders, 1.4, 'blue', true, 0.35);

        // Crewneck collar line
        P.line([[-12, 31], [0, 38], [12, 31]], 1.3, 'blue', false, 0.25);

        // Neck + subtle jaw shadow on neck
        const neck = [[-9.5, 19], [9.5, 19], [11, 35], [-11, 35]];
        P.knock(neck);
        P.fill(neck, 'coral', 0.24);
        P.fill(neck, 'sun', 0.2);
        P.fill([[-9.5, 19], [9.5, 19], [8, 28], [-8, 28]], 'blue', 0.14);
        P.line([[-9.5, 22], [-10.5, 34]], 1.3, 'blue', false, 0.2);
        P.line([[9.5, 22], [10.5, 34]], 1.3, 'blue', false, 0.2);

        // 2.5D head parallax offsets
        const fx = S.lookX * 4.2;
        const fy = S.lookY * 2.8;

        // Ears (shift opposite to face turn for real depth)
        const earL = ellipsePts(-24.5 - fx * 0.3, 3 + fy * 0.2, 4.4, 8.2, 12);
        const earR = ellipsePts(24.5 - fx * 0.3, 3 + fy * 0.2, 4.4, 8.2, 12);
        for (const ear of [earL, earR]) {
            P.knock(ear);
            P.fill(ear, 'coral', 0.24);
            P.fill(ear, 'sun', 0.2);
            P.line(ear, 1.25, 'blue', true, 0.25);
        }

        // Back hair volume
        const backHair = [
            [-26 - fx * 0.2, -2], [-27 - fx * 0.15, -20], [-18, -34], [0, -39],
            [18, -34], [27 - fx * 0.15, -20], [26 - fx * 0.2, -2],
        ];
        P.knock(backHair);
        P.fill(backHair, 'blue', 0.9);
        P.line(backHair, 1.4, 'blue', false, 0.4);

        // Realistic jawline & cheekbones contour (not a cartoon circle!)
        const face = [
            [-23, -14], [-24, -1], [-22, 11], [-15, 22], [-6, 28.5],
            [0, 30], [6, 28.5], [15, 22], [22, 11], [24, -1], [23, -14],
            [17, -26], [0, -30], [-17, -26],
        ].map(([x, y]) => [x + fx * 0.25, y + fy * 0.25]);
        P.knock(face);
        P.fill(face, 'coral', 0.2);
        P.fill(face, 'sun', 0.22);

        // Subtle side-of-face shadow plane (classic portrait shading)
        const shade = [
            [14, -22], [23, -13], [24, -1], [22, 11], [15, 22], [6, 28.5], [10, 14], [15, 0],
        ].map(([x, y]) => [x + fx * 0.25, y + fy * 0.25]);
        P.fill(shade, 'coral', 0.12);
        P.fill(shade, 'blue', 0.06);
        P.line(face, 1.55, 'blue', true, 0.35);

        // Natural swept hair across forehead with soft part & loose strands
        const topHair = [
            [-24, -10], [-25, -21], [-17, -33], [-4, -38], [10, -36], [21, -28], [25, -16], [24, -8],
            [19, -18], [10, -22], [-2, -21], [-12, -24], [-19, -18],
        ].map(([x, y]) => [x + fx * 0.3, y + fy * 0.2]);
        P.knock(topHair);
        P.fill(topHair, 'blue', 0.9);
        P.line(topHair, 1.4, 'blue', true, 0.45);
        // Loose sketched hair strands
        P.line([[-8 + fx * 0.35, -22 + fy * 0.2], [-4 + fx * 0.4, -16 + fy * 0.2]], 1.0, 'blue', false, 0.2);
        P.line([[6 + fx * 0.35, -22 + fy * 0.2], [9 + fx * 0.4, -17 + fy * 0.2]], 1.0, 'blue', false, 0.2);

        // Subtle cheekbone warmth (not cartoon blush dots)
        if (S.mood === 'warm' || S.mood === 'smirk') {
            P.fill(ellipsePts(-13 + fx * 0.65, 8 + fy * 0.6, 5.5, 2.8, 10), 'coral', 0.16);
            P.fill(ellipsePts(13 + fx * 0.65, 8 + fy * 0.6, 5.5, 2.8, 10), 'coral', 0.16);
        }

        // ---------- Eyes & Eyebrows ----------
        const exL = -9.5 + fx * 0.8, exR = 9.5 + fx * 0.8, ey = -1.5 + fy * 0.75;
        const px = S.lookX * 2.4, py = S.lookY * 1.6;
        const blinkAmt = S.blink > 0 ? Math.sin(S.blink * Math.PI) : 0;

        // Expressive asymmetrical eyebrows
        let bL0 = 0, bL1 = 0, bR0 = 0, bR1 = 0;
        if (S.mood === 'skeptic') { bL0 = 1.5; bL1 = 1; bR0 = -3.2; bR1 = -2.2; }
        else if (S.mood === 'annoyed') { bL0 = -0.5; bL1 = 2.4; bR0 = 2.4; bR1 = -0.5; }
        else if (S.mood === 'thinking') { bL0 = -2.0; bL1 = -1.2; bR0 = 0.8; bR1 = 0.4; }
        else if (S.mood === 'warm') { bL0 = -1.2; bL1 = -1.5; bR0 = -1.5; bR1 = -1.2; }
        else if (S.flinch > 0.2) { bL0 = -2.5; bL1 = -2; bR0 = -2; bR1 = -2.5; }

        P.line([[exL - 6.2, ey - 7.5 + bL0], [exL - 1, ey - 8.6 + (bL0 + bL1) * 0.5], [exL + 4.8, ey - 7.8 + bL1]], 1.9, 'blue', false, 0.2);
        P.line([[exR - 4.8, ey - 7.8 + bR0], [exR + 1, ey - 8.6 + (bR0 + bR1) * 0.5], [exR + 6.2, ey - 7.5 + bR1]], 1.9, 'blue', false, 0.2);

        const squint = S.mood === 'annoyed' ? 0.38 : (S.mood === 'smirk' || S.mood === 'warm') ? 0.16 : 0;
        const drawEye = (ex) => {
            const openH = Math.max(0.4, 3.6 * (1 - blinkAmt) * (1 - squint));
            if (openH < 0.9) {
                P.line([[ex - 5.2, ey + 0.5], [ex, ey + 1.2], [ex + 5.2, ey + 0.5]], 1.5, 'blue', false, 0.15);
                return;
            }
            // Almond eye shape
            const eye = [
                [ex - 5.2, ey + 0.3],
                [ex - 2.2, ey - openH],
                [ex + 2.2, ey - openH * 0.95],
                [ex + 5.2, ey + 0.3],
                [ex + 2.0, ey + openH * 0.72],
                [ex - 2.0, ey + openH * 0.72],
            ];
            P.knock(eye);

            // Clip iris & pupil inside almond eyelid
            ctx.save();
            ctx.beginPath();
            eye.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
            ctx.closePath();
            ctx.clip();

            const ix = ex + px, iy = ey + py * 0.8;
            const iris = ellipsePts(ix, iy, 2.7, 2.7, 12);
            P.fill(iris, 'blue', 0.92);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ix - 0.85, iy - 0.85, 0.8, 0, TAU);
            ctx.fill();
            ctx.restore();

            // Upper lash line (slightly heavier) + subtle lower lid
            P.line([eye[0], eye[1], eye[2], eye[3]], 1.55, 'blue', false, 0.15);
            P.line([eye[3], eye[4], eye[5], eye[0]], 0.75, 'blue', false, 0.15);
            // Subtle upper eyelid crease
            P.line([[ex - 4, ey - openH - 1.6], [ex + 3.5, ey - openH - 1.5]], 0.65, 'blue', false, 0.12);
        };
        drawEye(exL);
        drawEye(exR);

        // ---------- Nose (bridge + underside shadow) ----------
        const nx = fx * 0.95, ny = fy * 0.85;
        P.line([[nx - 0.8, ny - 0.5], [nx + 0.4, ny + 7.5], [nx - 2.2, ny + 8.6]], 1.15, 'blue', false, 0.15);
        P.line([[nx + 2.2, ny + 8.2], [nx + 0.6, ny + 9.0]], 0.9, 'blue', false, 0.12);
        P.fill(ellipsePts(nx + 0.5, ny + 9.2, 3.2, 1.3, 8), 'coral', 0.18);

        // ---------- Mouth (natural lip expressions) ----------
        const mx = fx * 0.85, my = 16.5 + fy * 0.75;
        if (S.talking) {
            // Subtle organic speaking cadence (varies open height smoothly)
            const open = 1.4 + (Math.sin(t * 17) * 0.5 + 0.5) * 2.8 + (Math.sin(t * 9.3) * 0.5 + 0.5) * 1.4;
            const mouth = [
                [mx - 6.5, my],
                [mx - 2.5, my - 1.1],
                [mx + 2.5, my - 1.1],
                [mx + 6.5, my],
                [mx + 2.5, my + open],
                [mx - 2.5, my + open],
            ];
            P.knock(mouth);
            P.fill(mouth, 'coral', 0.55);
            P.line([mouth[0], mouth[1], mouth[2], mouth[3]], 1.4, 'blue', false, 0.18);
            P.line([mouth[3], mouth[4], mouth[5], mouth[0]], 1.2, 'blue', false, 0.18);
        } else if (S.mood === 'warm') {
            P.line([[mx - 7.5, my - 0.5], [mx - 2.5, my + 2.6], [mx + 2.5, my + 2.6], [mx + 7.5, my - 0.5]], 1.5, 'blue', false, 0.18);
            P.line([[mx - 3, my + 4.3], [mx + 3, my + 4.3]], 0.7, 'coral', false, 0.12);
        } else if (S.mood === 'smirk') {
            // Natural asymmetric half-smile
            P.line([[mx - 6, my + 0.8], [mx, my + 1.4], [mx + 5.5, my + 0.2], [mx + 8, my - 1.8]], 1.5, 'blue', false, 0.18);
        } else if (S.mood === 'annoyed') {
            P.line([[mx - 6, my + 1.8], [mx - 1.5, my + 0.6], [mx + 2.5, my + 0.8], [mx + 6, my + 2.0]], 1.45, 'blue', false, 0.16);
        } else if (S.mood === 'skeptic' || S.mood === 'thinking') {
            P.line([[mx - 4.5, my + 1.4], [mx + 1, my + 0.6], [mx + 5.5, my + 1.2]], 1.4, 'blue', false, 0.15);
        } else {
            // Calm, relaxed neutral mouth with hint of warmth
            P.line([[mx - 6.2, my + 0.4], [mx, my + 1.8], [mx + 6.2, my + 0.2]], 1.4, 'blue', false, 0.16);
            P.line([[mx - 2.4, my + 3.4], [mx + 2.4, my + 3.4]], 0.65, 'coral', false, 0.1);
        }

        ctx.restore(); // end medallion clip
        ctx.restore(); // end transform
    }

    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000);
        if (dt < 0.028) return;
        last = now;
        if (document.body.classList.contains('inside')) return;
        drawFace(now, dt);
    }
    requestAnimationFrame(loop);
})();
