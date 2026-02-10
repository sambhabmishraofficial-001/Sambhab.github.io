/**
 * Tetris "SAM" Animation (Intro)
 */

(function () {
    const canvas = document.getElementById('canvas-intro');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    let blocks = [];
    let blockSize = 20;
    let animationId;
    let isIntroDone = false;
    let onCompleteCallback = null;

    // Colors
    const COLORS = ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'];

    const LETTERS = {
        S: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        A: [[0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
        M: [[1, 0, 0, 0, 1], [1, 1, 0, 1, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
        B: [[1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0]],
        H: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
        I: [[0, 1, 1, 1, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 1, 1, 1, 0]],
        R: [[1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0], [1, 0, 1, 0, 0], [1, 0, 0, 1, 0], [1, 0, 0, 0, 1]],
        SPACE: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]
    };

    class Block {
        constructor(targetX, targetY, color, delay) {
            this.targetX = targetX;
            this.targetY = targetY;
            this.color = color;
            this.x = Math.random() * width;
            this.y = -Math.random() * 500 - 50;
            this.vy = 0;
            this.vx = 0;
            this.state = 'falling';
            this.delay = delay;
        }

        update() {
            if (this.delay > 0) {
                this.delay--;
                return;
            }

            if (this.state === 'falling') {
                this.vy += 0.2;
                let dx = this.targetX - this.x;
                this.vx = dx * 0.05;
                this.y += this.vy;
                this.x += this.vx;

                if (this.y >= this.targetY) {
                    this.y = this.targetY;
                    this.x = this.targetX;
                    this.vy = 0;
                    this.vx = 0;
                    this.state = 'locked';
                }
            }
        }

        draw() {
            if (this.delay > 0) return;
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1; // Thinner border for smaller blocks
            ctx.fillRect(this.x, this.y, blockSize, blockSize);
            ctx.strokeRect(this.x, this.y, blockSize, blockSize);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(this.x, this.y, blockSize, blockSize / 3);
            ctx.fillRect(this.x, this.y, blockSize / 3, blockSize);
        }
    }

    function init() {
        resize();
        createName();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        // Calc block size based on name length: "SAMBHAB MISHRA" is ~14 letters * 6 width = 84 units
        // Add some margin
        blockSize = Math.min(width / 90, height / 20);
        // Ensure minimum visibility
        if (blockSize < 5) blockSize = 5;
    }

    function createName() {
        blocks = [];
        const gap = 1;
        const letterW = 5;
        const sentence = "SAMBHAB MISHRA";

        let totalCols = 0;
        for (let char of sentence) {
            totalCols += letterW + gap;
        }
        totalCols -= gap; // remove last gap

        const totalW = totalCols * blockSize;
        const startX = (width - totalW) / 2;
        const totalH = 7 * blockSize;
        const startY = (height - totalH) / 2;

        let offsetX = startX;

        for (let char of sentence) {
            let matrix;
            if (char === ' ') matrix = LETTERS.SPACE;
            else matrix = LETTERS[char];

            if (matrix) {
                addLetter(matrix, offsetX, startY);
            }
            offsetX += (letterW + gap) * blockSize;
        }
    }

    function addLetter(matrix, startX, startY) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    let x = startX + c * blockSize;
                    let y = startY + r * blockSize;
                    let color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    blocks.push(new Block(x, y, color, Math.random() * 100));
                }
            }
        }
    }

    function animate() {
        if (isIntroDone) return;

        ctx.clearRect(0, 0, width, height);

        let allLocked = true;
        blocks.forEach(b => {
            b.update();
            b.draw();
            if (b.state !== 'locked') allLocked = false;
        });

        if (allLocked && blocks.length > 0) {
            // Give it a moment to linger? 
            // We can just keep animating locked blocks or stop.
            // Let's trigger callback after a small delay
            if (onCompleteCallback) {
                // To prevent multiple calls
                let cb = onCompleteCallback;
                onCompleteCallback = null;
                setTimeout(cb, 2000); // Linger for 2 seconds
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    window.startTetrisIntro = function (callback) {
        console.log("Starting Tetris Intro");
        onCompleteCallback = callback;
        isIntroDone = false;
        canvas.style.display = 'block';
        init();
        animate();
    }

    // Resize update
    window.addEventListener('resize', () => {
        if (!isIntroDone) {
            resize();
            createName(); // Reset to fit new screen
        }
    });

})();
