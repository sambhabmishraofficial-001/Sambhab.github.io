'use strict';

window.PixelPlays = (function () {
  function mount(opts = {}) {
    const rules = opts.rules || [];
    const inFrame = window.self !== window.top;

    const style = document.createElement('style');
    style.textContent = `
      .pp-bar {
        position: fixed;
        top: max(14px, env(safe-area-inset-top));
        right: max(16px, env(safe-area-inset-right));
        display: flex;
        align-items: center;
        gap: 14px;
        z-index: 20;
        font: 13px/1.35 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace;
      }
      .pp-bar a, .pp-bar button {
        font: inherit;
        color: #8b877f;
        text-decoration: none;
        background: none;
        border: 0;
        padding: 8px;
        margin: -8px;
        cursor: pointer;
      }
      .pp-bar a:hover, .pp-bar button:hover,
      .pp-bar a:focus-visible, .pp-bar button:focus-visible {
        color: #1c1b19;
      }
      .pp-modal {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.88);
        display: none;
        place-items: center;
        padding: 20px;
        z-index: 30;
        font: 13px/1.5 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace;
        color: #1c1b19;
      }
      .pp-modal.open { display: grid; }
      .pp-card {
        max-width: 440px;
        width: 100%;
        background: #fff;
        border: 1.5px solid #1c1b19;
        border-radius: 8px;
        padding: 20px 22px;
        box-shadow: 4px 4px 0 #1c1b19;
      }
      .pp-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .pp-head strong { font-size: 14px; font-weight: 600; }
      .pp-card ul { margin: 0; padding-left: 18px; }
      .pp-card li { margin-bottom: 8px; }
      .pp-card li:last-child { margin-bottom: 0; }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.className = 'pp-bar';

    if (!inFrame) {
      const back = document.createElement('a');
      back.href = '../../fun.html';
      back.textContent = '← fun';
      bar.appendChild(back);
    }

    if (rules.length) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'rules';
      btn.setAttribute('aria-expanded', 'false');
      bar.appendChild(btn);

      const modal = document.createElement('div');
      modal.className = 'pp-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'How to play');

      const card = document.createElement('div');
      card.className = 'pp-card';

      const head = document.createElement('div');
      head.className = 'pp-head';
      const title = document.createElement('strong');
      title.textContent = document.title || 'Rules';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'close';
      head.append(title, close);

      const list = document.createElement('ul');
      for (const line of rules) {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
      }

      card.append(head, list);
      modal.appendChild(card);
      document.body.appendChild(modal);

      const setOpen = open => {
        modal.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      };
      btn.addEventListener('click', () => setOpen(!modal.classList.contains('open')));
      close.addEventListener('click', () => setOpen(false));
      modal.addEventListener('click', e => { if (e.target === modal) setOpen(false); });
      addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    }

    document.body.appendChild(bar);
  }

  return { mount };
})();
