// =====================================================================
// INTRO - the little story between the front page and screen 1. After Play a gust of blowing snow clears onto
// Swiftee's cabin as the camera pushes in; the doorbell rings (a two-tone chime, the lantern flares,
// golden ripples spread from the door, snow shakes off the porch roof); the door swings open inward with warm
// light; Swiftee hops out onto the steps and says hello; her friend Chilly the snowman pops up out of the snow
// beside the steps and asks to come along; then she flies off and the camera pulls back through
// another gust of snow onto the lesson's landscape while she hops down to her usual spot, so the last frame is the lesson's first one.
// Nothing to tap: it plays by itself, and Skip ends it at once.
// The door: the two cabin pictures are the same except round the doorway, so the open picture is shown as soon as
// the door starts to move, and the closed door is laid over it in two cut-outs taken from the closed picture -
// the arched door leaf (it swings on its right-hand hinge) and the rest of the doorway (it fades).
// Swiftee and her bubble are the game's own (engine.say): voice, lip-sync and orange key words work here too.
// Engine hooks: startIntro() / endIntro().
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // the cabin pictures are 1672 x 941; they fill the stage, so 1 picture px = K stage px
  const K = 1280 / 1672;
  // stage px: the door leaf's hinge (its right edge, half way up), the top middle of the doorway, the lantern
  const HINGE = { x: 953 * K, y: 575 * K };
  const DOOR_TOP = { x: 828 * K, y: 380 * K };
  const LANTERN = { x: 645 * K, y: 468 * K };
  // where the camera pushes in to, and how close
  const CAM = { x: 634, y: 452, zoom: 1.28 };
  // the cabin on the lesson's background: the landscape starts zoomed in on it and pulls back to the full view
  const LAND = { x: 67, y: 467, zoom: 1.45 }; // (more would blur the picture)
  // Swiftee's poses, as offsets from her intro spot (CSS .stage.intro .swiftee: left 514, top 496, 259 px box):
  // in the doorway, on the steps, and her usual lesson spot (left 70, top 412, full size)
  const POSE = { door: { x: 39, y: 13, scale: 0.62 }, step: { x: 0, y: 0, scale: 0.92 }, home: { x: -444, y: -84, scale: 1 } };
  const LINES = [
    { m: 'waving', t: "Oh, hello there!\nI'm Swiftee." },
    { m: 'excited', t: 'Welcome to my cosy\nwinter cabin!' },
    { m: 'curious', t: 'Today I have a special\nshape to show you.' },
    { m: 'excited', t: "It's called a trapezium.\nLet's go and explore it!" }
  ];
  // once she says "let's go", her friend Chilly the snowman pops up by the steps (js/chilly.js) and asks to come
  // along; he dives back into the snow to travel (that is how he pops up in the lesson), and she flies off
  const MEET_CHILLY = { call: 'Wait! Wait for me!', chilly: "I'm Chilly the snowman.\nCan I come too?", m: 'excited', swiftee: 'Ha ha! Of course, Chilly!\nLet\'s all go together!' };

  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const at = (e, p) => { e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; };

  const Intro = {
    run: 0,
    play(engine, done) {
      this.stop();
      const root = document.querySelector('.stage .intro-root');
      if (!root) { done(); return; }
      const run = ++this.run, eng = engine;
      const live = () => run === this.run && root.isConnected;
      this.live = live; this.done = done; this.root = root;
      this.ctx = G ? G.context(() => {}) : null;
      const R = reduced() || !G, D = (s) => (R ? 0 : s);
      const tl = (fn) => new Promise((res) => { if (!live()) return; if (!G) { res(); return; } this.ctx.add(() => { const t = fn(); t.eventCallback('onComplete', () => res()); }); });
      const say = (L) => new Promise((res) => { if (!live()) return; eng.say(L, () => res()); });

      // ---------- the scene ----------
      root.innerHTML = '';
      const land = el('img', 'intro-land', root); land.src = 'assets/images/winter-background.webp'; land.alt = '';
      const cam = el('div', 'intro-cam', root);
      const closed = el('img', 'intro-pic', cam); closed.src = 'assets/images/cabin-door-closed.webp'; closed.alt = "Swiftee's snowy cabin";
      const open = el('img', 'intro-pic', cam); open.src = 'assets/images/cabin-door-open.webp'; open.alt = '';
      const frame = el('div', 'intro-cut intro-frame', cam);
      const leaf = el('div', 'intro-cut intro-leaf', cam);
      const glow = el('div', 'intro-glow', cam);
      const lamp = el('div', 'intro-lamp', cam); at(lamp, LANTERN);
      const rings = [0, 1, 2].map(() => { const r = el('i', 'intro-ring', cam); at(r, DOOR_TOP); return r; });
      el('canvas', 'snowfall-cover intro-snow', root).setAttribute('aria-hidden', 'true');
      const mist = el('div', 'intro-mist', root);
      // the scene changes inside a gust of blowing snow: a soft veil, the picture behind blurring, and a canvas of
      // flakes whose density follows gust.level (0 - 1)
      const snowCv = el('canvas', 'intro-blizzard', root); snowCv.width = 1920; snowCv.height = 1080;
      const gust = { level: R ? 0 : 1 }, flakes = [];
      for (let i = 0; i < 240; i++) flakes.push({ x: Math.random() * 1400, y: Math.random() * 720, r: 1.5 + Math.pow(Math.random(), 2) * 9, s: 0.6 + Math.random() * 0.9, ph: Math.random() * 6.3, a: 0.55 + Math.random() * 0.45 });
      let lastT = performance.now();
      const blow = (now) => {
        if (!live()) return;
        const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        const c = snowCv.getContext('2d'); c.setTransform(1.5, 0, 0, 1.5, 0, 0); c.clearRect(0, 0, 1280, 720);
        const lv = gust.level;
        if (lv > 0.01) flakes.forEach((f) => {
          f.x -= (260 + 520 * lv) * f.s * dt; f.y += (60 + 140 * lv) * f.s * dt + Math.sin(now / 400 + f.ph) * 0.6;
          if (f.x < -20) { f.x = 1300 + Math.random() * 100; f.y = Math.random() * 720 - 60; }
          if (f.y > 740) { f.y = -10; f.x = Math.random() * 1400; }
          c.globalAlpha = f.a * Math.min(1, lv * 1.2);
          if (f.r > 6) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(f.x, f.y, f.r * 1.7, 0, 6.29); c.fill(); }
          c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.29); c.fill();
        });
        c.globalAlpha = 1;
        requestAnimationFrame(blow);
      };
      requestAnimationFrame(blow);
      const skip = el('button', 'navbtn intro-skip', root, 'Skip'); skip.type = 'button';
      skip.addEventListener('click', () => { if (live()) { eng.sfx('tap'); this.finish(); } });
      const sw = document.querySelector('.stage .swiftee');
      if (G) this.ctx.add(() => {
        G.set(cam, { transformOrigin: CAM.x + 'px ' + CAM.y + 'px' });
        G.set(land, { transformOrigin: LAND.x + 'px ' + LAND.y + 'px', scale: LAND.zoom });
        G.set(open, { opacity: 0 });
        G.set(leaf, { transformPerspective: 1100, transformOrigin: HINGE.x + 'px ' + HINGE.y + 'px' });
        G.set([lamp, glow].concat(rings), { opacity: 0 });
        if (sw) G.set(sw, Object.assign({ transformOrigin: '0 0', opacity: 0 }, POSE.door));
      });
      // a few flakes of snow shaken off the porch roof (stage px)
      const flurry = () => {
        if (R) return;
        for (let i = 0; i < 14; i++) {
          const f = el('i', 'intro-flake', cam), x = 520 + Math.random() * 230, y = 200 + Math.random() * 20;
          f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.width = f.style.height = (3 + Math.random() * 4) + 'px';
          this.ctx.add(() => G.fromTo(f, { y: 0, x: 0, opacity: 1 }, { y: 120 + Math.random() * 90, x: (Math.random() - 0.5) * 50, opacity: 0, duration: 1.3 + Math.random() * 0.6, delay: Math.random() * 0.3, ease: 'power1.in', onComplete: () => f.remove() }));
        }
      };

      // ---------- 1. out of the white, the camera pushes in on the cabin ----------
      tl(() => G.timeline()
        .fromTo(mist, { opacity: 0.6 }, { opacity: 0, duration: D(1.2), ease: 'sine.out' }, D(0.1))
        .fromTo(cam, { filter: 'blur(10px)' }, { filter: 'blur(0px)', duration: D(1.1), ease: 'sine.out' }, D(0.1))
        .to(gust, { level: 0, duration: D(1.8), ease: 'sine.inOut' }, 0)
        .fromTo(cam, { scale: 1.06 }, { scale: CAM.zoom, duration: D(2.6), ease: 'power2.inOut' }, 0))
        // ---------- 2. ding-dong: the doorbell rings ----------
        .then(() => {
          if (!live()) return;
          eng.sfx('dingdong'); flurry();
          return tl(() => G.timeline()
            .to(lamp, { keyframes: [{ opacity: 1, scale: 1.15 }, { opacity: 0.45, scale: 1 }, { opacity: 1, scale: 1.15 }, { opacity: 0, scale: 1 }], duration: D(1.3), ease: 'sine.inOut' }, 0)
            .fromTo(rings, { scale: 0.25, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: D(1.1), ease: 'power1.out', stagger: D(0.3) }, 0)
            .to({}, { duration: D(0.35) }));
        })
        // ---------- 3. the door swings open inward ----------
        .then(() => {
          if (!live()) return;
          eng.sfx('door');
          return tl(() => G.timeline()
            .set(open, { opacity: 1 }).set(closed, { opacity: 0 })        // the same picture outside the doorway
            .fromTo(leaf, { rotationY: 0, filter: 'brightness(1)' }, { rotationY: -74, filter: 'brightness(0.72)', duration: D(1.35), ease: 'power2.inOut' }, 0)
            .to(leaf, { opacity: 0, duration: D(0.4), ease: 'sine.in' }, D(1.0))
            .to(frame, { opacity: 0, duration: D(1.1), ease: 'sine.inOut' }, D(0.1))
            .fromTo(glow, { opacity: 0 }, { opacity: 0.8, duration: D(0.6), ease: 'sine.out' }, D(0.35))
            .to(glow, { opacity: 0.25, duration: D(1.2), ease: 'sine.inOut' }, D(0.95)));
        })
        // ---------- 4. Swiftee hops out onto the steps ----------
        .then(() => {
          if (!live() || !sw) return;
          eng.pose('excited'); eng.sfx('jingle');
          return tl(() => G.timeline()
            .to(sw, { opacity: 1, duration: D(0.3) })
            .to(sw, Object.assign({ duration: D(0.75), ease: 'power2.out' }, POSE.step), D(0.2))
            .to(sw, { keyframes: [{ y: -40, ease: 'power2.out' }, { y: 0, ease: 'bounce.out' }], duration: D(0.75) }, D(0.2))
            .call(() => eng.sfx('pop'), null, D(0.85)));
        })
        // ---------- 5. hello! ----------
        .then(() => LINES.reduce((p, L) => p.then(() => say(L)), Promise.resolve()))
        // ---------- 6. "Wait for me!" Chilly asks to come too ----------
        .then(() => (live() && window.Chilly ? new Promise((res) => Chilly.visit(eng, MEET_CHILLY, res, 'cabin')) : null))
        // ---------- 7. Swiftee flies off; the camera pulls back through a snowy white-out onto the landscape ----------
        .then(() => {
          if (!live()) return;
          eng.setState({ bubOff: true }); eng.pose('flapping'); eng.sfx('whoosh');
          setTimeout(() => { if (live()) eng.pose('happy'); }, R ? 0 : 2050); // landed
          return tl(() => G.timeline()
            .to(cam, { scale: 1, filter: 'blur(10px)', duration: D(0.95), ease: 'power1.in' }, 0)
            .to(gust, { level: 1, duration: D(0.9), ease: 'sine.in' }, 0)
            .to(mist, { opacity: 0.6, duration: D(0.9), ease: 'sine.in' }, 0)
            .set(cam, { opacity: 0 }, D(0.95))                                // swapped inside the gust
            .fromTo(land, { filter: 'blur(10px)' }, { filter: 'blur(0px)', duration: D(1.1), ease: 'sine.out' }, D(0.95))
            .to(mist, { opacity: 0, duration: D(1.1), ease: 'sine.out' }, D(1))
            .to(gust, { level: 0, duration: D(1.6), ease: 'sine.out' }, D(1))
            .to(land, { scale: 1, duration: D(1.9), ease: 'power2.out' }, D(0.95))
            // the flight: up off the steps, a wide arc to the left, and a soft landing on her spot
            .to(sw, { x: POSE.home.x, scale: POSE.home.scale, duration: D(2), ease: 'sine.inOut' }, D(0.1))
            .to(sw, { keyframes: [{ y: -210, ease: 'power2.out' }, { y: POSE.home.y, ease: 'power2.in' }], duration: D(2) }, D(0.1))
            .to(sw, { keyframes: [{ rotation: -8 }, { rotation: 4 }, { rotation: 0 }], duration: D(2), ease: 'sine.inOut' }, D(0.1)));
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
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      if (window.Chilly) Chilly.stop();
      const sw = document.querySelector('.stage .swiftee');
      if (sw && G) G.set(sw, { clearProps: 'transform,opacity' });
      if (this.root) this.root.innerHTML = '';
      this.root = null;
    }
  };
  window.Intro = Intro;
})();
