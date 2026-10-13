// =====================================================================
// INTRO - the little story between the front page and screen 1. After Play the camera pushes in on Swiftee's
// snowy cabin; a golden bell drops in and the learner rings it (or it rings by itself); the door swings open
// with warm light and a jingle; Swiftee hops out onto the steps and says hello; then the camera pulls back, the
// cabin shrinks into the little cabin on the lesson's landscape and Swiftee hops down to her usual spot, so the
// last frame is exactly the lesson's first one. Skip ends it at once.
// The scene lives in .intro-root (index.html); Swiftee and her bubble are the game's own (engine.say), so her
// voice, lip-sync and orange key words work here too. Engine hooks: startIntro() / endIntro().
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // the cabin pictures (1672 x 941) fill the stage: 1 picture px = K stage px
  const K = 1280 / 1672;
  // the door leaf in the picture (its arch top, sides and sill), and where the camera pushes in to
  const DOOR = { x: 705 * K, y: 388 * K, w: 245 * K, h: 404 * K, archH: 92 * K };
  const CAM = { x: 634, y: 452, zoom: 1.28 };
  // the cabin on the lesson's background (stage px): where the close-up shrinks to as the camera pulls back
  const LAND = { x: 67, y: 467, zoom: 2.6 };
  // Swiftee's poses, as offsets from her intro spot (CSS .stage.intro .swiftee: left 514, top 496, 259 px box):
  // in the doorway, on the steps, and her usual lesson spot (left 70, top 412, full size)
  const POSE = { door: { x: 39, y: 13, scale: 0.62 }, step: { x: 0, y: 0, scale: 0.92 }, home: { x: -444, y: -84, scale: 1 } };
  const LINES = [
    { m: 'waving', t: "Oh, hello there!\nI'm Swiftee." },
    { m: 'excited', t: 'Welcome to my cosy\nwinter cabin!' },
    { m: 'curious', t: 'Today I have a special\nshape to show you.' },
    { m: 'excited', t: "It's called a trapezium.\nLet's go and explore it!" }
  ];
  const BELL_WAIT_MS = 6000; // it rings by itself if nobody taps it

  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const BELL_SVG = '<svg viewBox="0 0 90 110" aria-hidden="true"><defs>' +
    '<linearGradient id="ibGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#f6c638"/><stop offset="1" stop-color="#c47f0c"/></linearGradient>' +
    '<linearGradient id="ibRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5d5d"/><stop offset="1" stop-color="#c3121e"/></linearGradient></defs>' +
    '<path d="M45 30 C28 30 22 44 21 60 C20 74 14 80 10 86 L80 86 C76 80 70 74 69 60 C68 44 62 30 45 30 Z" fill="url(#ibGold)" stroke="#9a5d06" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M31 44 C30 54 29 64 26 74" fill="none" stroke="#fffbe0" stroke-width="5" stroke-linecap="round" opacity=".75"/>' +
    '<rect x="9" y="84" width="72" height="8" rx="4" fill="#e0a21a" stroke="#9a5d06" stroke-width="2"/>' +
    '<circle cx="45" cy="98" r="8" fill="url(#ibGold)" stroke="#9a5d06" stroke-width="2.5"/>' +
    '<path d="M45 30 C34 18 18 18 20 28 C22 36 36 34 45 30 Z M45 30 C56 18 72 18 70 28 C68 36 54 34 45 30 Z" fill="url(#ibRed)" stroke="#8d0b14" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M42 32 L34 46 M48 32 L56 46" stroke="#c3121e" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="45" cy="30" r="5" fill="#ff6b6b" stroke="#8d0b14" stroke-width="2"/>' +
    '<path d="M30 14 C36 6 44 8 45 14 C38 14 34 16 30 14 Z M60 14 C54 6 46 8 45 14 C52 14 56 16 60 14 Z" fill="#2e9e4f" stroke="#1d6b35" stroke-width="1.5"/>' +
    '<circle cx="45" cy="13" r="3.5" fill="#e8282f"/></svg>';

  const Intro = {
    run: 0,
    play(engine, done) {
      this.stop();
      const root = document.querySelector('.stage .intro-root');
      if (!root) { done(); return; }
      const run = ++this.run, eng = engine;
      const live = () => run === this.run && root.isConnected;
      this.live = live; this.eng = eng; this.done = done; this.root = root;
      this.ctx = G ? G.context(() => {}) : null;
      this.timers = [];
      const R = reduced();
      const D = (s) => (R ? 0 : s);
      const later = (ms, fn) => { const t = setTimeout(() => { if (live()) fn(); }, R ? 0 : ms); this.timers.push(t); };
      const tl = (fn) => new Promise((res) => { if (!live()) return; if (!G) { res(); return; } this.ctx.add(() => { const t = fn(); t.eventCallback('onComplete', () => res()); }); });
      const say = (L) => new Promise((res) => { if (!live()) return; eng.say(L, () => res()); });

      // ---------- the scene ----------
      root.innerHTML = '';
      const land = el('img', 'intro-land', root); land.src = 'assets/images/winter-background.webp'; land.alt = '';
      const cam = el('div', 'intro-cam', root);
      const closed = el('img', 'intro-pic', cam); closed.src = 'assets/images/cabin-door-closed.webp'; closed.alt = "Swiftee's snowy cabin with its door closed";
      const open = el('img', 'intro-pic intro-open', cam); open.src = 'assets/images/cabin-door-open.webp'; open.alt = '';
      const glow = el('div', 'intro-glow', cam);
      const hinge = el('div', 'intro-hinge', cam);
      const leaf = el('div', 'intro-leaf', hinge);
      [hinge, glow].forEach((e) => { e.style.left = DOOR.x + 'px'; e.style.top = DOOR.y + 'px'; e.style.width = DOOR.w + 'px'; e.style.height = DOOR.h + 'px'; });
      leaf.style.backgroundPosition = (-DOOR.x) + 'px ' + (-DOOR.y) + 'px';
      leaf.style.borderRadius = '50% 50% 0 0 / ' + DOOR.archH + 'px ' + DOOR.archH + 'px 0 0';
      el('canvas', 'snowfall-cover intro-snow', root).setAttribute('aria-hidden', 'true');
      const bell = el('button', 'intro-bell', root, BELL_SVG); bell.type = 'button'; bell.setAttribute('aria-label', 'Ring the bell');
      const cap = el('div', 'intro-cap', root, 'Ring the bell!');
      const hand = el('div', 'intro-hand', root, '<img src="assets/images/hand-nudge.webp" alt="">');
      const skip = el('button', 'navbtn intro-skip', root, 'Skip'); skip.type = 'button';
      skip.addEventListener('click', () => { if (live()) { eng.sfx('tap'); this.finish(); } });
      const sw = document.querySelector('.stage .swiftee');
      if (G) this.ctx.add(() => {
        G.set(cam, { transformOrigin: CAM.x + 'px ' + CAM.y + 'px' });
        G.set(land, { transformOrigin: LAND.x + 'px ' + LAND.y + 'px', scale: LAND.zoom });
        G.set([bell, cap, hand, open], { opacity: 0 });
        G.set(leaf, { transformPerspective: 900, transformOrigin: '100% 50%' }); // hinged on its right, swings out
        if (sw) G.set(sw, Object.assign({ transformOrigin: '0 0', opacity: 0 }, POSE.door));
      });

      // sparkles: little stars flying out from a point (stage px)
      const sparkle = (x, y, n) => {
        if (!G || R) return;
        for (let i = 0; i < n; i++) {
          const s = el('i', 'intro-star', root), a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = 40 + Math.random() * 40;
          s.style.left = x + 'px'; s.style.top = y + 'px'; if (i % 2) s.style.background = '#fff';
          this.ctx.add(() => G.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => s.remove() }));
        }
      };

      // ---------- 1. push in on the cabin, the bell drops in ----------
      let bellShown = false; // taps before the bell has dropped in are ignored
      const ring = new Promise((resolve) => {
        let rung = false;
        const go = () => { if (rung || !live()) return; rung = true; resolve(); };
        bell.addEventListener('click', () => { if (!bellShown) return; eng.unlockAudio(); go(); });
        later(2300 + BELL_WAIT_MS, go);
      });
      tl(() => G.timeline().to(cam, { scale: CAM.zoom, duration: D(2.3), ease: 'power2.inOut' }))
        .then(() => {
          if (!live()) return;
          eng.sfx('pop'); bellShown = true;
          this.ctx.add(() => {
            G.fromTo(bell, { y: -70, opacity: 0, rotation: -10 }, { y: 0, opacity: 1, rotation: 0, duration: D(0.7), ease: 'bounce.out' });
            G.to(bell, { rotation: 6, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.8, transformOrigin: '50% 8%' });
            G.fromTo(cap, { y: 10, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: D(0.45), delay: D(0.4), ease: 'back.out(2)' });
            G.to(hand, { opacity: 1, duration: 0.3, delay: D(0.9) });
          });
        });

      // ---------- 2. ding dong: the bell rings, the door swings open ----------
      ring.then(() => {
        if (!live()) return;
        eng.sfx('dingdong');
        const b = bell.getBoundingClientRect(), st = document.querySelector('.stage').getBoundingClientRect(), k = st.width / 1280;
        sparkle((b.left + b.width / 2 - st.left) / k, (b.top + b.height * 0.6 - st.top) / k, 10);
        return tl(() => G.timeline()
          .to([cap, hand], { opacity: 0, duration: 0.25 }, 0)
          .to(bell, { keyframes: [{ rotation: 26 }, { rotation: -22 }, { rotation: 16 }, { rotation: -10 }, { rotation: 0 }], duration: D(1), ease: 'sine.inOut', transformOrigin: '50% 8%' }, 0)
          .to(bell, { opacity: 0, y: -30, duration: D(0.4) }, D(1.1))
          .call(() => { eng.sfx('whoosh'); later(350, () => eng.sfx('flourish')); }, null, D(0.8))
          .to(leaf, { rotationY: 78, duration: D(1.1), ease: 'power2.out' }, D(0.8))
          .to(open, { opacity: 1, duration: D(0.45) }, D(1.35))
          .to(leaf, { opacity: 0, duration: D(0.3) }, D(1.6))
          .fromTo(glow, { opacity: 0 }, { opacity: 0.85, duration: D(0.5), ease: 'sine.out' }, D(1))
          .to(glow, { opacity: 0.3, duration: D(1.2), ease: 'sine.inOut' }, D(1.6)));
      })
        // ---------- 3. Swiftee hops out onto the steps ----------
        .then(() => {
          if (!live() || !sw) return;
          eng.pose('excited');
          return tl(() => G.timeline()
            .to(sw, { opacity: 1, duration: D(0.3) })
            .to(sw, Object.assign({ duration: D(0.75), ease: 'power2.out' }, POSE.step), D(0.25))
            .to(sw, { keyframes: [{ y: -40, ease: 'power2.out' }, { y: 0, ease: 'bounce.out' }], duration: D(0.75) }, D(0.25))
            .call(() => eng.sfx('pop'), null, D(0.9)));
        })
        // ---------- 4. hello! ----------
        .then(() => LINES.reduce((p, L) => p.then(() => say(L)), Promise.resolve()))
        // ---------- 5. the camera pulls back to the landscape; Swiftee hops down to her spot ----------
        .then(() => {
          if (!live()) return;
          eng.setState({ bubOff: true }); eng.pose('happy'); eng.sfx('whoosh');
          if (R || !G) return;
          this.ctx.add(() => G.set(cam, { maskImage: 'radial-gradient(ellipse 50% 50% at ' + CAM.x + 'px ' + CAM.y + 'px, #000 62%, transparent 100%)', webkitMaskImage: 'radial-gradient(ellipse 50% 50% at ' + CAM.x + 'px ' + CAM.y + 'px, #000 62%, transparent 100%)', maskSize: '400% 400%', webkitMaskSize: '400% 400%', maskPosition: 'center', webkitMaskPosition: 'center', maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat' }));
          return tl(() => G.timeline()
            .to(cam, { scale: 0.3, x: LAND.x - CAM.x, y: LAND.y - CAM.y, duration: 2.1, ease: 'power2.inOut' }, 0)
            .to(cam, { maskSize: '100% 100%', webkitMaskSize: '100% 100%', duration: 1.2, ease: 'sine.in' }, 0)
            .to(cam, { opacity: 0, duration: 1.1, ease: 'sine.in' }, 0.7)
            .to(land, { scale: 1, duration: 2.1, ease: 'power2.inOut' }, 0)
            .to(sw, Object.assign({ duration: 1.5, ease: 'power2.inOut' }, POSE.home), 0.35)
            .to(sw, { keyframes: [{ y: POSE.home.y - 120, ease: 'power2.out' }, { y: POSE.home.y, ease: 'bounce.out' }], duration: 1.5 }, 0.35));
        })
        .then(() => { if (live()) this.finish(); });
    },
    // the intro is over (or skipped): the lesson's first screen takes over from the same picture
    finish() {
      if (!this.live || !this.live()) return;
      const done = this.done;
      this.stop();
      if (done) done();
    },
    stop() {
      this.run++;
      (this.timers || []).forEach(clearTimeout); this.timers = [];
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const sw = document.querySelector('.stage .swiftee');
      if (sw && G) G.set(sw, { clearProps: 'transform,opacity' });
      if (this.root) this.root.innerHTML = '';
      this.root = null;
    }
  };
  window.Intro = Intro;
})();
