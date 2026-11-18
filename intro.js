/**
 * Intro heading: types out each role in the boxed tag, then deletes it
 * and types the next.
 */

(function () {
    'use strict';

    const roleEl = document.getElementById('intro-role');
    if (!roleEl) return;

    const ROLES = ['researcher', 'artist', 'author', 'entrepreneur'];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let i = 0;
        setInterval(() => {
            i = (i + 1) % ROLES.length;
            roleEl.textContent = ROLES[i];
        }, 2600);
        return;
    }

    async function run() {
        let i = 0;
        await sleep(1800);
        for (;;) {
            const word = ROLES[i];
            for (let n = word.length - 1; n >= 0; n--) {
                roleEl.textContent = word.slice(0, n);
                await sleep(55);
            }
            i = (i + 1) % ROLES.length;
            const next = ROLES[i];
            await sleep(260);
            for (let n = 1; n <= next.length; n++) {
                roleEl.textContent = next.slice(0, n);
                await sleep(95 + Math.random() * 60);
            }
            await sleep(1900);
        }
    }

    run();
})();
