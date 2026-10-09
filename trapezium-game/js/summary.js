// =====================================================================
// SUMMARY — screen 35, the animated trapezium summary.
// One large ice card at a time, explanation only (nothing to tap): Definition -> Parts -> Types -> Angles. On each
// card the shape pops in, Swiftee (peeking from behind the card's left edge) explains with the game's voice, the parts
// she names light up and the card's text appears on her words; then the card shrinks into the collection row below
// (a mini card appears there only once collected). After all four, the collected cards open into a 2x2 recap and
// Swiftee closes with one celebration.
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NS = 'http://www.w3.org/2000/svg';
  const PINK = '#e8287a', FILL = 'rgba(229,205,234,0.92)', PU = '#8e44d6', OR = '#f08a24', YEL = '#F5C542', GR = '#2e9e4f', NAVY = '#123b63';
  // pacing: every animation runs at PACE x its base time; Swiftee pauses LINE_PAUSE s after each line; a finished card
  // stays HOLD s before it is collected - so there is time to read and take it in
  const PACE = 1.35, LINE_PAUSE = 0.9, HOLD = 2.2;
  const D = (s) => (reduced ? 0 : s * PACE);

  // ---------- card geometry (card SVG is 680 x 440; bases at y 130 / 300, so AB is parallel to DC) ----------
  const TOP = 130, BOT = 300;
  const SHAPES = {
    gen: { A: 250, B: 450, C: 530, D: 150 },          // a general trapezium
    scal: { A: 270, B: 470, C: 540, D: 140 },         // legs 214 vs 184 px: unequal, no right angle
    iso: { A: 240, B: 440, C: 540, D: 140 },          // both legs run 100 px: equal
    right: { A: 160, B: 420, C: 540, D: 160 },        // AD vertical: 90 at A and D
    ang: { A: 221.88, B: 441.85, C: 540, D: 160 }     // D 70 / A 110 on the left leg, C 60 / B 120 on the right
  };
  const pt = (X, k) => ({ x: X[k], y: k === 'A' || k === 'B' ? TOP : BOT });
  const NB = { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] };
  const unit = (p, q) => { const L = Math.hypot(q.x - p.x, q.y - p.y) || 1; return { x: (q.x - p.x) / L, y: (q.y - p.y) / L }; };
  const angle = (X, k) => { const v = pt(X, k), u = unit(v, pt(X, NB[k][0])), w = unit(v, pt(X, NB[k][1])); return Math.round(Math.acos(u.x * w.x + u.y * w.y) * 180 / Math.PI); };
  const f1 = (n) => +n.toFixed(1);

  // ---------- tiny DOM helpers ----------
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach((a) => e.setAttribute(a, attrs[a])); if (parent) parent.appendChild(e); return e; };
  const div = (cls, html, parent) => { const e = document.createElement('div'); e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  // the whole shape lives in one <g>; render(X) moves every part for corner x positions X
  function Diagram(svg) {
    const g = el('g', { class: 'sm-shape' }, svg);
    const fill = el('polygon', { fill: FILL }, g);
    const hi = {}, side = {}, hit = {};
    ['AB', 'BC', 'CD', 'DA'].forEach((s) => { hi[s] = el('line', { class: 'sm-hi', stroke: YEL, 'stroke-width': 16, 'stroke-linecap': 'round', opacity: 0 }, g); });
    ['AB', 'BC', 'CD', 'DA'].forEach((s) => { side[s] = el('line', { stroke: s === 'AB' || s === 'CD' ? PINK : PU, 'stroke-width': 5, 'stroke-linecap': 'round' }, g); });
    const chev = el('path', { fill: 'none', stroke: OR, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, g);
    const ticks = el('path', { fill: 'none', stroke: PU, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 }, g);
    const rmarks = el('path', { fill: 'none', stroke: GR, 'stroke-width': 3, opacity: 0 }, g);
    const arcs = {}, vals = {};
    [['A', OR], ['B', PU], ['C', '#2b7bd6'], ['D', YEL]].forEach(([k, c]) => { arcs[k] = el('path', { fill: 'none', stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round', pathLength: 100, opacity: 0 }, g); });
    ['A', 'B', 'C', 'D'].forEach((k) => { vals[k] = el('text', { 'text-anchor': 'middle', 'font-family': 'Nunito, sans-serif', 'font-weight': 900, 'font-size': 17, fill: NAVY, opacity: 0 }, g); });
    const dots = {}, labs = {};
    ['A', 'B', 'C', 'D'].forEach((k) => {
      dots[k] = el('circle', { r: 7, fill: '#fff', stroke: PINK, 'stroke-width': 3 }, g);
      labs[k] = el('text', { 'text-anchor': 'middle', 'font-family': 'Nunito, sans-serif', 'font-weight': 900, 'font-size': 21, fill: NAVY }, g); labs[k].textContent = k;
    });
    // generous invisible tap targets along each side (the visible line stays precise)
    ['AB', 'BC', 'CD', 'DA'].forEach((s) => { hit[s] = el('line', { stroke: 'rgba(0,0,0,0.001)', 'stroke-width': 34, 'stroke-linecap': 'round', class: 'sm-hit', 'data-side': s }, g); });
    let X = Object.assign({}, SHAPES.gen);
    function render(next) {
      if (next) X = Object.assign({}, next);
      const P = { A: pt(X, 'A'), B: pt(X, 'B'), C: pt(X, 'C'), D: pt(X, 'D') };
      const cx = (X.A + X.B + X.C + X.D) / 4, cy = (TOP + BOT) / 2;
      fill.setAttribute('points', ['A', 'B', 'C', 'D'].map((k) => f1(P[k].x) + ',' + P[k].y).join(' '));
      const ends = { AB: ['A', 'B'], BC: ['B', 'C'], CD: ['D', 'C'], DA: ['D', 'A'] };
      Object.keys(ends).forEach((s) => { const a = P[ends[s][0]], b = P[ends[s][1]];
        [side[s], hi[s], hit[s]].forEach((l) => { l.setAttribute('x1', f1(a.x)); l.setAttribute('y1', a.y); l.setAttribute('x2', f1(b.x)); l.setAttribute('y2', b.y); }); });
      const chv = (y, x) => 'M' + f1(x - 7) + ',' + (y - 6) + ' L' + f1(x - 1) + ',' + y + ' L' + f1(x - 7) + ',' + (y + 6) + ' M' + f1(x + 1) + ',' + (y - 6) + ' L' + f1(x + 7) + ',' + y + ' L' + f1(x + 1) + ',' + (y + 6);
      chev.setAttribute('d', chv(TOP, (X.A + X.B) / 2) + ' ' + chv(BOT, (X.D + X.C) / 2));
      const tick = (a, b, n) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, t = unit(a, b), nn = { x: -t.y, y: t.x };
        const offs = n === 1 ? [0] : [-4, 4];
        return offs.map((o) => 'M' + f1(mx + t.x * o - nn.x * 9) + ',' + f1(my + t.y * o - nn.y * 9) + ' L' + f1(mx + t.x * o + nn.x * 9) + ',' + f1(my + t.y * o + nn.y * 9)).join(' '); };
      ticks._d = { same: tick(P.D, P.A, 2) + ' ' + tick(P.B, P.C, 2), diff: tick(P.D, P.A, 1) + ' ' + tick(P.B, P.C, 2) };
      ticks.setAttribute('d', ticks._mode === 'diff' ? ticks._d.diff : ticks._d.same);
      let rm = '';
      ['A', 'B', 'C', 'D'].forEach((k) => {
        const v = P[k], u = unit(v, P[NB[k][0]]), w = unit(v, P[NB[k][1]]), R = 26, cross = u.x * w.y - u.y * w.x;
        arcs[k].setAttribute('d', 'M' + f1(v.x + u.x * R) + ',' + f1(v.y + u.y * R) + ' A' + R + ',' + R + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + f1(v.x + w.x * R) + ',' + f1(v.y + w.y * R));
        let bx = u.x + w.x, by = u.y + w.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
        vals[k].setAttribute('x', f1(v.x + bx * 58)); vals[k].setAttribute('y', f1(v.y + by * 58 + 6)); vals[k].textContent = angle(X, k) + '°';
        dots[k].setAttribute('cx', f1(v.x)); dots[k].setAttribute('cy', v.y);
        labs[k].setAttribute('x', f1(v.x - bx * 24)); labs[k].setAttribute('y', f1(v.y - by * 24 + 7));
        if (angle(X, k) === 90) { const s = 15; rm += 'M' + f1(v.x + u.x * s) + ',' + f1(v.y + u.y * s) + ' L' + f1(v.x + u.x * s + w.x * s) + ',' + f1(v.y + u.y * s + w.y * s) + ' L' + f1(v.x + w.x * s) + ',' + f1(v.y + w.y * s) + ' '; }
      });
      rmarks.setAttribute('d', rm || 'M0,0');
      g.setAttribute('data-cx', f1(cx)); g.setAttribute('data-cy', cy);
    }
    render();
    return { g, fill, hi, side, hit, chev, ticks, rmarks, arcs, vals, dots, labs, render, get X() { return X; } };
  }

  // a small shape icon (for the collection cards and the type choices)
  function icon(kind, w) {
    const X = { def: SHAPES.gen, parts: SHAPES.gen, scal: SHAPES.scal, iso: SHAPES.iso, right: SHAPES.right, types: SHAPES.iso, ang: SHAPES.ang }[kind];
    const pts = ['A', 'B', 'C', 'D'].map((k) => f1(pt(X, k).x) + ',' + pt(X, k).y).join(' ');
    let extra = '';
    if (kind === 'parts') extra = `<line x1="${X.A}" y1="${TOP}" x2="${X.B}" y2="${TOP}" stroke="${YEL}" stroke-width="12" stroke-linecap="round"/><line x1="${X.D}" y1="${BOT}" x2="${X.C}" y2="${BOT}" stroke="${YEL}" stroke-width="12" stroke-linecap="round"/><line x1="${X.D}" y1="${BOT}" x2="${X.A}" y2="${TOP}" stroke="${PU}" stroke-width="12" stroke-linecap="round"/><line x1="${X.C}" y1="${BOT}" x2="${X.B}" y2="${TOP}" stroke="${PU}" stroke-width="12" stroke-linecap="round"/>`;
    if (kind === 'def') extra = `<path d="M${(X.A + X.B) / 2 - 14},${TOP - 14} l14,14 l-14,14 M${(X.D + X.C) / 2 - 14},${BOT - 14} l14,14 l-14,14" fill="none" stroke="${OR}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (kind === 'ang') { const u = unit(pt(X, 'D'), pt(X, 'A'));
      extra = `<path d="M${X.D + 55},${BOT} A55,55 0 0 0 ${f1(X.D + u.x * 55)},${f1(BOT + u.y * 55)}" fill="none" stroke="${YEL}" stroke-width="16"/><path d="M${f1(X.A - u.x * 55)},${f1(TOP - u.y * 55)} A55,55 0 0 0 ${X.A + 55},${TOP}" fill="none" stroke="${OR}" stroke-width="16"/>`; }
    return `<svg viewBox="110 100 460 230" width="${w}" height="${Math.round(w / 2)}" aria-hidden="true"><polygon points="${pts}" fill="${FILL}" stroke="${PINK}" stroke-width="10" stroke-linejoin="round"/>${extra}</svg>`;
  }

  const CARDS = [
    { key: 'def', title: 'Definition', recap: 'One pair of parallel sides.' },
    { key: 'parts', title: 'Parts', recap: 'Bases, legs, vertices.' },
    { key: 'types', title: 'Types', recap: 'Scalene, isosceles, right.' },
    { key: 'ang', title: 'Angles', recap: 'Same-leg angles add to 180°.' }
  ];

  const Summary = {
    run: 0,
    start(engine) {
      const root = document.querySelector('.stage .sum-root');
      if (!root || !G) return;
      this.stop();
      const run = ++this.run, eng = engine, tok = eng.stepTok;
      const live = () => run === this.run && tok === eng.stepTok && root.isConnected;
      const ctx = G.context(() => {});
      this.ctx = ctx;
      const tw = (fn) => new Promise((res) => { if (!live()) return; ctx.add(() => { const t = fn(); if (!t) { res(); return; } t.eventCallback('onComplete', () => res()); }); });
      const wait = (s) => new Promise((res) => { if (!live()) return; ctx.add(() => G.delayedCall(s, () => res())); });
      const say = (t, m, cues) => new Promise((res) => { if (!live()) return; eng.say({ m: m || 'happy', t: t, cueAt: cues }, () => { if (live()) ctx.add(() => G.delayedCall(LINE_PAUSE, res)); }); });
      const sfx = (k) => live() && eng.sfx(k);

      // ---------- build the stage pieces ----------
      root.innerHTML = '';
      const card = div('sm-card', '<div class="sm-wave"></div>', root);
      const head = div('sm-head', '', card);
      const svg = el('svg', { class: 'sm-svg', viewBox: '0 0 680 440' }, card);
      const cap = div('sm-cap', '', card);          // the card's text: appears in step with Swiftee's words
      const dg = Diagram(svg);
      const row = div('sm-row', null, root);
      // collected cards: nothing is shown until a card has actually been collected (no empty placeholders)
      const slots = CARDS.map((c) => { const s = div('sm-slot', `<div class="sm-mini"><span class="sm-ico">${icon(c.key, 70)}</span><b>${c.title}</b><i>${c.recap}</i></div>`, row); return s; });
      const allParts = () => [dg.chev, dg.ticks, dg.rmarks].concat(Object.values(dg.arcs), Object.values(dg.vals), Object.values(dg.hi));
      const resetParts = () => { G.set(allParts(), { opacity: 0 }); dg.ticks._mode = 'same'; };
      G.set(card, { opacity: 0 }); G.set(slots, { opacity: 0 });

      // ---------- shared pieces ----------
      const glowPair = (a, b, color) => { [a, b].forEach((s) => dg.hi[s].setAttribute('stroke', color)); return G.to([dg.hi[a], dg.hi[b]], { opacity: 0.85, duration: D(0.35) }); };
      const glow = (s, color) => { dg.hi[s].setAttribute('stroke', color); return G.to(dg.hi[s], { opacity: 0.85, duration: D(0.35) }); };
      const hide = (list) => G.to(list.map((s) => dg.hi[s]), { opacity: 0, duration: D(0.3) });
      // add one piece of text to the card's caption line (each piece pops in on its word)
      const capAdd = (html, cls) => { const s = document.createElement('span'); s.className = 'sm-cp ' + (cls || ''); s.innerHTML = html; cap.appendChild(s); G.fromTo(s, { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: D(0.5), ease: 'back.out(1.8)' }); sfx('pop'); };
      const capSet = (html, cls) => { cap.innerHTML = ''; capAdd(html, cls); };
      const morph = (to) => tw(() => G.to(Object.assign({}, dg.X), Object.assign({}, to, { duration: D(0.9), ease: 'power2.inOut', onUpdate() { dg.render(this.targets()[0]); } })));
      const arc = (k) => G.fromTo(dg.arcs[k], { opacity: 1, strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: D(0.45) });

      const enterCard = async (title, X) => {
        await wait(D(0.5)); // a short breath between cards
        resetParts(); head.textContent = title; cap.innerHTML = ''; dg.render(X);
        await tw(() => G.timeline()
          .fromTo(card, { opacity: 0, scale: 0.82, x: 0, y: 0 }, { opacity: 1, scale: 1, duration: D(0.55), ease: 'back.out(1.5)' })
          .fromTo(dg.g, { scale: 0.6, opacity: 0, svgOrigin: dg.g.getAttribute('data-cx') + ' ' + dg.g.getAttribute('data-cy') }, { scale: 1, opacity: 1, duration: D(0.45), ease: 'back.out(1.7)' }, D(0.3)));
        sfx('pop');
      };
      // the card shrinks into its place in the row; only then does that mini card appear
      const collect = async (i) => {
        sfx('chime');
        G.set(slots[i], { opacity: 1 }); G.set(slots[i].firstChild, { opacity: 0 });
        const st = document.querySelector('.stage').getBoundingClientRect(), k = st.width / 1280;
        const c = card.getBoundingClientRect(), s = slots[i].getBoundingClientRect();
        const dx = ((s.left + s.width / 2) - (c.left + c.width / 2)) / k, dy = ((s.top + s.height / 2) - (c.top + c.height / 2)) / k;
        await tw(() => G.timeline()
          .to(card, { scale: 1.03, duration: D(0.18), yoyo: true, repeat: 1 })
          .to(card, { x: dx, y: dy, scale: s.width / c.width, opacity: 0.5, duration: D(0.65), ease: 'power2.inOut' })
          .set(card, { opacity: 0 })
          .fromTo(slots[i].firstChild, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: D(0.35), ease: 'back.out(2)' })
          .fromTo(slots[i], { y: 0 }, { y: -6, duration: D(0.15), yoyo: true, repeat: 1 }, '<'));
      };

      // ---------- the sequence (explanation only - nothing to tap) ----------
      (async () => {
        const sw = document.querySelector('.stage .swiftee');
        G.set(sw, { x: -220, opacity: 0 });
        await tw(() => G.to(sw, { x: 0, opacity: 1, duration: D(0.6), ease: 'power2.out' }));

        // ---- 1 DEFINITION ----
        await enterCard('What is a trapezium?', SHAPES.gen);
        await say("Let's remember! A trapezium is a quadrilateral with one pair of opposite sides parallel.", 'happy', {
          quadrilateral: () => { G.fromTo(Object.values(dg.side), { attr: { 'stroke-width': 5 } }, { attr: { 'stroke-width': 8 }, duration: 0.25, yoyo: true, repeat: 1 }); capSet('4 sides'); },
          parallel: () => { glowPair('AB', 'CD', YEL); G.to(dg.chev, { opacity: 1, duration: 0.4 }); capAdd('one pair of <b>parallel sides</b>', 'hl'); } });
        await say('These two sides are parallel. They never meet!', 'curious', { meet: () => capAdd('AB ∥ DC', 'eq') });
        hide(['AB', 'CD']);
        await wait(HOLD); await collect(0);

        // ---- 2 PARTS ----
        await enterCard('Parts of a trapezium', SHAPES.gen);
        await say('The parallel sides are called the bases.', 'happy', { bases: () => { glowPair('AB', 'CD', YEL); capSet('Bases', 'base'); } });
        hide(['AB', 'CD']);
        await say('The other two sides are called the legs.', 'happy', { legs: () => { glowPair('DA', 'BC', PU); capAdd('Legs', 'leg'); } });
        hide(['DA', 'BC']);
        await say('And these four corners are called vertices.', 'happy', { corners: () => { G.fromTo(['A', 'B', 'C', 'D'].map((k) => dg.dots[k]), { attr: { r: 7 } }, { attr: { r: 12 }, duration: 0.35, yoyo: true, repeat: 1, stagger: 0.35 }); capAdd('Vertices', 'vtx'); } });
        await wait(HOLD); await collect(1);

        // ---- 3 TYPES (one shape changes from type to type) ----
        await enterCard('Types of trapezium', SHAPES.scal);
        dg.ticks._mode = 'diff'; dg.render();
        await say('A scalene trapezium has legs of different lengths.', 'happy', { scalene: () => capSet('Scalene'), different: () => { glowPair('DA', 'BC', PU); G.to(dg.ticks, { opacity: 1, duration: 0.3 }); } });
        hide(['DA', 'BC']); G.to(dg.ticks, { opacity: 0, duration: 0.25 });
        await morph(SHAPES.iso); dg.ticks._mode = 'same'; dg.render();
        await say('An isosceles trapezium has two equal legs.', 'happy', { isosceles: () => capAdd('Isosceles'), equal: () => G.fromTo(dg.ticks, { opacity: 0 }, { opacity: 1, duration: 0.35 }) });
        G.to(dg.ticks, { opacity: 0, duration: 0.25 });
        await morph(SHAPES.right);
        await say('A right trapezium has two right angles.', 'happy', { right: () => { capAdd('Right'); G.fromTo(dg.rmarks, { opacity: 0 }, { opacity: 1, duration: 0.35 }); } });
        await wait(HOLD); await collect(2);

        // ---- 4 ANGLES ----
        await enterCard('An important angle property', SHAPES.ang);
        await say('Here is an important property!', 'surprised', { property: () => { glowPair('AB', 'CD', YEL); G.to(dg.chev, { opacity: 1, duration: 0.3 }); } });
        hide(['AB', 'CD']);
        await say('The two angles on the same leg add up to 180 degrees.', 'happy', {
          angles: () => { glow('DA', PU); arc('A'); arc('D'); G.to([dg.vals.A, dg.vals.D], { opacity: 1, duration: 0.3, stagger: 0.25 }); },
          180: () => capSet('110° + 70° = <b>180°</b>', 'eq') });
        hide(['DA']);
        await say('On the other leg too: 120 plus 60 is 180.', 'happy', {
          other: () => { glow('BC', PU); arc('B'); arc('C'); G.to([dg.vals.B, dg.vals.C], { opacity: 1, duration: 0.3, stagger: 0.25 }); },
          180: () => capAdd('120° + 60° = <b>180°</b>', 'eq') });
        hide(['BC']);
        await say('That means these angles are supplementary.', 'happy', { supplementary: () => capAdd('Supplementary angles', 'hl') });
        await wait(HOLD); await collect(3);

        // ---- FINAL RECAP: the collected cards open into a 2x2 grid, one at a time ----
        const sr = document.querySelector('.stage').getBoundingClientRect(), k = sr.width / 1280;
        const gx = [452, 828], gy = [92, 336];
        G.set(card, { display: 'none' });
        for (let i = 0; i < 4; i++) {
          const s = slots[i], r = s.getBoundingClientRect();
          const fx = (r.left - sr.left) / k, fy = (r.top - sr.top) / k;
          root.appendChild(s); s.classList.add('sm-big');
          await tw(() => G.fromTo(s, { left: fx, top: fy, width: 150, height: 96, position: 'absolute' }, { left: gx[i % 2], top: gy[i >> 1], width: 360, height: 228, duration: D(0.55), ease: 'power2.inOut' }));
          sfx('pop');
        }
        const pulse = (i) => () => G.fromTo(slots[i], { scale: 1 }, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1 });
        await say('Wonderful! You learned what a trapezium is, its parts, its types, and its special angle property!', 'celebrating',
          { trapezium: pulse(0), parts: pulse(1), types: pulse(2), angle: pulse(3) });
        await wait(0.6);
        await say('You are ready for the next adventure!', 'happy');
        if (live()) eng.cheer();                        // one celebration at the very end
      })();
    },
    stop() {
      this.run++;
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const sw = document.querySelector('.stage .swiftee');
      if (sw && G) G.set(sw, { clearProps: 'transform,opacity,translate' });
    }
  };
  window.Summary = Summary;
})();
