/**
 * Phagocytosis / Blob Simulation
 * Inspired by otoro.net "creatures"
 */

const canvas = document.getElementById('canvas-bg');
const ctx = canvas.getContext('2d');

let width, height;

// Configuration
const PREDATOR_COUNT = 3;
const PREDATOR_RADIUS = 30;
const PREY_RADIUS = 8;
const PREY_SPEED = 2;
const PREDATOR_SPEED = 1.2;

let predators = [];
let prey = [];
let animationId;
let isRunning = false;

class Blob {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseRadius = radius;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.time = Math.random() * 100; // Offset for wobble
        this.angle = 0; // facing angle
    }

    update() {
        // Wobbly radius
        this.time += 0.1;
        // Movement logic in subclasses

        // Bounce off walls
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // Rotate to face direction

        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // Draw wobbly body
        ctx.beginPath();
        for (let i = 0; i < Math.PI * 2; i += 0.1) {
            let r = this.baseRadius + Math.sin(this.time + i * 5) * (this.baseRadius * 0.1);
            let x = Math.cos(i) * r;
            let y = Math.sin(i) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawEyes();

        ctx.restore();
    }

    drawEyes() {
        // Generic eyes drawing, subclasses can override or parameterize
        let eyeOffset = this.baseRadius * 0.4;
        let eyeSize = this.baseRadius * 0.3;

        // White part
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1.5;

        // Left Eye
        ctx.beginPath();
        ctx.arc(eyeOffset, -eyeOffset / 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Eye
        ctx.beginPath();
        ctx.arc(eyeOffset, eyeOffset / 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eyeOffset + eyeSize / 2, -eyeOffset / 2, eyeSize / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeOffset + eyeSize / 2, eyeOffset / 2, eyeSize / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Predator extends Blob {
    constructor(x, y) {
        super(x, y, PREDATOR_RADIUS, '#d9534f'); // Reddish
    }

    update() {
        super.update();

        // Find nearest prey
        let nearest = null;
        let minDist = Infinity;

        for (let p of prey) {
            let d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < minDist) {
                minDist = d;
                nearest = p;
            }
        }

        if (nearest) {
            // Chase
            let angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
            this.vx = Math.cos(angle) * PREDATOR_SPEED;
            this.vy = Math.sin(angle) * PREDATOR_SPEED;
            this.angle = angle; // Face the prey

            // Eat
            if (minDist < this.radius + nearest.radius) {
                // Remove prey
                let index = prey.indexOf(nearest);
                if (index > -1) prey.splice(index, 1);

                // Grow slightly
                this.baseRadius += 1;
            }
        } else {
            // Wander if no prey
            this.x += this.vx;
            this.y += this.vy;
            this.angle = Math.atan2(this.vy, this.vx);
        }

        this.x += this.vx;
        this.y += this.vy;
    }
}

class Prey extends Blob {
    constructor(x, y) {
        super(x, y, PREY_RADIUS, '#5cb85c'); // Greenish
    }

    update() {
        super.update();

        // Wander mostly
        if (Math.random() < 0.05) {
            let angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * PREY_SPEED;
            this.vy = Math.sin(angle) * PREY_SPEED;
            this.angle = angle;
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    drawEyes() {
        // Smaller eyes for prey
        let eyeOffset = this.baseRadius * 0.3;
        let eyeSize = this.baseRadius * 0.4;

        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(eyeOffset, -eyeOffset / 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eyeOffset, eyeOffset / 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eyeOffset + eyeSize / 4, -eyeOffset / 2, eyeSize / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeOffset + eyeSize / 4, eyeOffset / 2, eyeSize / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    resize();
    predators = [];
    prey = [];

    for (let i = 0; i < PREDATOR_COUNT; i++) {
        predators.push(new Predator(Math.random() * width, Math.random() * height));
    }
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (window.devicePixelRatio > 1) {
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
}

function animate() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, width, height);

    predators.forEach(p => {
        p.update();
        p.draw();
    });

    prey.forEach(p => {
        p.update();
        p.draw();
    });

    // Predator Collision
    for (let i = 0; i < predators.length; i++) {
        for (let j = i + 1; j < predators.length; j++) {
            let p1 = predators[i];
            let p2 = predators[j];
            let dx = p1.x - p2.x;
            let dy = p1.y - p2.y;
            let dist = Math.hypot(dx, dy);
            let minDist = p1.radius + p2.radius + 5;

            if (dist < minDist) {
                let angle = Math.atan2(dy, dx);
                let overlap = minDist - dist;
                let moveX = Math.cos(angle) * overlap * 0.5;
                let moveY = Math.sin(angle) * overlap * 0.5;

                p1.x += moveX;
                p1.y += moveY;
                p2.x -= moveX;
                p2.y -= moveY;

                p1.vx += moveX * 0.1;
                p1.vy += moveY * 0.1;
                p2.vx -= moveX * 0.1;
                p2.vy -= moveY * 0.1;
            }
        }
    }

    animationId = requestAnimationFrame(animate);
}

// Exposed control functions
window.startOtoro = function () {
    if (isRunning) return;
    console.log("Starting Otoro");
    isRunning = true;
    canvas.style.opacity = 1; // Ensure visible
    init();
    animate();
}

window.stopOtoro = function () {
    isRunning = false;
    cancelAnimationFrame(animationId);
}

window.addEventListener('resize', () => {
    if (isRunning) resize();
});

window.addEventListener('click', (e) => {
    if (!isRunning) return;
    for (let i = 0; i < 3; i++) {
        prey.push(new Prey(e.clientX + Math.random() * 20, e.clientY + Math.random() * 20));
    }
});

// Initial state: waiting for signal
