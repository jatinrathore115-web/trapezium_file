// =====================================================================
// MOTION — the lesson's choreographed animations, on GSAP (js/vendor/gsap.min.js).
// Everything a screen starts runs inside one gsap.context: Motion.clear() (called on every screen change) kills it
// and reverts every inline style it set, so a screen never inherits half-finished motion from the one before.
// Only unbound style properties are animated (opacity, transform, filter, stroke-width, text-shadow): the template
// runtime binds left/top and stroke colour, so the two never fight. Hover/tap feedback stays in CSS.
// prefers-reduced-motion: entrances jump to their end state, value tweens still run (they carry the lesson state).
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (sel) => Array.from(document.querySelectorAll('.stage ' + sel));
  const GLOW = 'drop-shadow(0px 0px 6px rgba(232,40,122,0.6))', NOGLOW = 'drop-shadow(0px 0px 0px rgba(232,40,122,0))';
  // one shared feel for every entrance: soft ease-out with a hint of overshoot, 90% -> 100% scale
  const ENTER = { duration: 0.6, ease: 'back.out(1.3)' };
  let ctx = G ? G.context(() => {}) : null;
  const add = (fn) => (ctx ? ctx.add(fn) : null);
  // the labels are centred on their point by CSS (translate -50% -50%); GSAP keeps that while it owns the transform
  const centred = (els) => G.set(els, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  // every element any Motion animation touches (Motion.clear wipes their animated properties on screen change)
  const ANIMATED = '.tag.snum, .tag.vlab, .edge, .vdot, .shape-fill, .outline-settle, .pop-g, .chev, .calp > *, .ticks, .tag.mtag, .okcheck *, .tag.alab, .arc, .chip, .chip-res, .swiftee, .swiftee canvas, .swiftee img, .bubble, .bs, .hspk, .hglow, .sv-a, .sv-d, .sv-base, .sv-180, .rmark, .tag.r90, .q3, .q3 *, .q3-hint, .q3-hint *, .q3-fly, .q4s, .q4s *, .slot, .lab, .q4-strip, .q4-card, .q4-link';
  const ANIMATED_SVG = '.edge, .vdot, .shape-fill, .outline-settle, svg g.pop-g, .chev, .calp > *, .ticks, .okcheck *, .arc, .sv-a, .sv-d, .sv-base, .sv-180, .rmark';

  const Motion = {
    ok: !!G,
    reduced: reduced,
    // stop everything the current screen started and put every element back as the stylesheet draws it.
    // revert() alone is not enough: it restores each tween's recorded "before" state, and when one tween started
    // from another's end (letters faded out, then flown back in) that "before" can be a hidden state, which then
    // leaks into every later screen. So afterwards every property GSAP animates is wiped from every element it
    // can touch (the runtime's own bindings - left/top, stroke colour, transform-origin - are left alone).
    clear() {
      if (ctx) ctx.revert();
      if (G) G.set($(ANIMATED), { clearProps: 'opacity,transform,filter,textShadow,strokeWidth,translate,rotate,scale' });
      // GSAP pins SVG origins to 0 0 whenever it touches an SVG element (even while clearing), so drop that by hand
      $(ANIMATED_SVG).forEach((el) => { el.style.removeProperty('transform-origin'); el.style.removeProperty('stroke-dasharray'); });
      document.querySelectorAll('.eq-layer').forEach((el) => el.remove()); // screen 25's equation build
      ctx = G ? G.context(() => {}) : null;
    },

    // a tween on plain values (pen position, trace length...): onUpdate(value) each frame, onDone at the end
    value(from, to, duration, ease, onUpdate, onDone) {
      if (!G) { onUpdate(to); if (onDone) onDone(); return; }
      const o = { v: from };
      add(() => G.to(o, { v: to, duration: duration, ease: ease, onUpdate: () => onUpdate(o.v), onComplete: onDone }));
    },
    // a pause that dies with the screen
    wait(seconds, fn) { if (!G) { fn(); return; } add(() => G.delayedCall(seconds, fn)); },

    // screen 1: once the pen has closed the outline, a soft glow settles round it and the fill fades in
    hideFill() { if (G) add(() => G.set($('.shape-fill'), { opacity: 0 })); },
    settle() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        tl.fromTo($('.outline-settle'), { opacity: 0 }, { opacity: 0.75, duration: 0.45, ease: 'sine.out' })
          .to($('.outline-settle'), { opacity: 0, duration: 0.85, ease: 'sine.inOut' })
          .to($('.shape-fill'), { opacity: 1, duration: 0.9, ease: 'sine.out' }, 0.1);
        return tl;
      });
    },

    // screen 2: numbers 1 top, 2 right, 3 bottom, 4 left - each glides in from its own side, one after another;
    // onLand(i) fires as number i settles (its side then gives the voice-sync grow)
    sideNums(onLand) {
      const els = ['.tag.snum.n1', '.tag.snum.n2', '.tag.snum.n3', '.tag.snum.n4'].map((s) => $(s)[0]).filter(Boolean);
      if (!G || !els.length) { els.forEach((e, i) => onLand && onLand(i)); return; }
      const from = [{ y: -46 }, { x: 46 }, { y: 46 }, { x: -46 }];
      add(() => {
        centred(els);
        const tl = G.timeline({ delay: 0.45 });
        els.forEach((el, i) => {
          tl.fromTo(el, Object.assign({ opacity: 0, scale: 0.9, x: 0, y: 0 }, from[i]),
            Object.assign({ opacity: 1, scale: 1, x: 0, y: 0 }, ENTER, reduced ? { duration: 0 } : {}), i * 0.65)
            .call(() => onLand && onLand(i), null, i * 0.65 + 0.5);
        });
        return tl;
      });
    },

    // the corner letters come softly back, A -> B -> C -> D (screen 4, as Swiftee invites a closer look)
    labelsIn() {
      const els = $('.board .tag.vlab');
      if (G && els.length) add(() => G.to(els, { opacity: 1, duration: reduced ? 0 : 0.45, stagger: 0.15, ease: 'sine.out', overwrite: 'auto' }));
    },

    // screen 10: the two parallel sides (and their arrow marks) step out softly, to be brought back on the voice cue
    hideSides(keys) {
      const els = keys.map((k) => $('.e' + k)[0]).filter(Boolean).concat($('.chev'));
      if (G && els.length) add(() => G.to(els, { opacity: 0, duration: 0.35, ease: 'sine.out' }));
    },
    // ...a parallel side comes back from its own side - top from above, bottom from below - with an ease-out and a
    // soft glow that settles; onLand fires as it arrives
    sideIn(k, onLand) {
      const el = $('.e' + k)[0];
      if (!G || !el) { if (onLand) onLand(); return; }
      const dy = k === 'AB' ? -56 : k === 'CD' ? 56 : 0, dx = k === 'BC' ? 56 : k === 'DA' ? -56 : 0;
      add(() => G.timeline()
        .fromTo(el, { opacity: 0, x: dx, y: dy, strokeWidth: 7, filter: GLOW },
          { opacity: 1, x: 0, y: 0, duration: reduced ? 0 : 0.6, ease: 'power3.out', overwrite: 'auto' })
        .call(() => onLand && onLand())
        .to(el, { strokeWidth: 5, filter: NOGLOW, duration: 0.35, ease: 'sine.out' })
        .set(el, { clearProps: 'strokeWidth,filter' })); // hand the stroke back to the stylesheet (voice-sync emphasis)
    },
    // screen 13 "one pair of parallel sides": the legs stay solid purple; the arrow marks step aside; AB draws itself
    // A -> B, then DC draws D -> C (a pen stroke, not a fade); both give one synchronized pulse with a soft glow,
    // hold highlighted for a moment, then everything eases back to normal
    parallelPair() {
      const ab = $('.eAB')[0], cd = $('.eCD')[0];
      if (!G || !ab || !cd) return;
      const len = (e) => Math.hypot(+e.getAttribute('x2') - +e.getAttribute('x1'), +e.getAttribute('y2') - +e.getAttribute('y1')) || 1;
      const la = len(ab), lc = len(cd), chev = $('.chev'), draw = reduced ? 0 : 0.55;
      add(() => {
        const tl = G.timeline();
        tl.to(chev, { opacity: 0, duration: 0.2, ease: 'sine.out' }, 0)
          // both parallel sides clear, then are drawn in one after the other (DC's line runs C -> D, so it is revealed
          // from its end to read D -> C)
          .set(ab, { strokeDasharray: la, strokeDashoffset: la }, 0)
          .set(cd, { strokeDasharray: lc, strokeDashoffset: -lc }, 0)
          .to(ab, { strokeDashoffset: 0, duration: draw, ease: 'power2.inOut' }, 0.1)
          .to(cd, { strokeDashoffset: 0, duration: draw, ease: 'power2.inOut' }, 0.1 + draw + 0.05)
          // one synchronized pulse, then a short highlighted hold
          .to([ab, cd], { strokeWidth: 8, filter: GLOW, duration: 0.3, ease: 'sine.out' }, '>+0.1')
          .to([ab, cd], { strokeWidth: 7, filter: 'drop-shadow(0px 0px 4px rgba(232,40,122,0.4))', duration: 0.25, ease: 'sine.inOut' }, '>')
          .to(chev, { opacity: 1, duration: 0.35, ease: 'sine.out' }, '<')
          // back to normal
          .to([ab, cd], { strokeWidth: 5, filter: NOGLOW, duration: 0.45, ease: 'sine.inOut' }, '>+0.9')
          .set([ab, cd], { clearProps: 'strokeDasharray,strokeDashoffset,strokeWidth,filter' })
;
        return tl;
      });
    },

    // "The parallel sides...": the other two sides dim to neutral and the named pair gets a quick line-reveal sweep,
    // one after the other (a pen stroke along each side), so the pair comes into focus. calloutIn() undoes the dimming.
    focusPair(keys) {
      const pair = keys.map((k) => $('.e' + k)[0]).filter(Boolean);
      const others = ['AB', 'BC', 'CD', 'DA'].filter((k) => keys.indexOf(k) < 0).map((k) => $('.e' + k)[0]).filter(Boolean);
      if (!G || !pair.length) return;
      const len = (e) => Math.hypot(+e.getAttribute('x2') - +e.getAttribute('x1'), +e.getAttribute('y2') - +e.getAttribute('y1')) || 1;
      add(() => {
        const tl = G.timeline();
        pair.forEach((e, i) => {
          const L = len(e);
          tl.fromTo(e, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.45, ease: 'power2.inOut' }, 0.05 + i * 0.4)
            .set(e, { clearProps: 'strokeDasharray,strokeDashoffset' });
        });
        return tl;
      });
    },
    // the "Base" / "Leg" pills come in one after another: each connector draws out from its side, then its pill pops
    // in (90% -> 100%, soft ease-out); then any dimmed sides ease back. The labels stay. (The pair's pulse is the
    // voice-sync grow on the word itself - "bases" / "legs" - which lands exactly as the labels arrive.)
    calloutIn(pairKeys) {
      if (!G) return;
      const keys = pairKeys || [];
      const pills = [$('.calp1')[0], $('.calp2')[0]].filter(Boolean);
      const others = ['AB', 'BC', 'CD', 'DA'].filter((k) => keys.indexOf(k) < 0).map((k) => $('.e' + k)[0]).filter(Boolean);
      add(() => {
        const tl = G.timeline();
        pills.forEach((p, i) => {
          const stem = p.querySelector('.cal-stem'), body = Array.from(p.children).filter((c) => c !== stem);
          const L = (stem && stem.getTotalLength && stem.getTotalLength()) || 1, at = i * 0.45;
          tl.set(body, { opacity: 0 }, 0);
          if (stem) tl.fromTo(stem, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.25, ease: 'sine.out' }, at);
          tl.fromTo(body, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: reduced ? 0 : 0.4, ease: 'back.out(1.4)', immediateRender: false }, at + 0.2);
        });
        tl.to(others, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, '>+0.6').set(others, { clearProps: 'opacity' });
        return tl;
      });
    },

    // screen 20 "same length": the bases dim to neutral; both legs reveal from their two ends toward their middle at
    // exactly the same time and speed (one shared tween drives both); then they pulse together once, and the
    // equal-length tick marks and both leg labels appear at that same moment; everything eases back after a hold
    equalLegs() {
      const legs = [$('.eDA')[0], $('.eBC')[0]].filter(Boolean);
      if (!G || legs.length < 2) return;
      const bases = $('.eAB').concat($('.eCD')), ticks = $('.ticks'), labels = $('.board .tag.mtag.mleg');
      const L = legs.map((e) => Math.hypot(+e.getAttribute('x2') - +e.getAttribute('x1'), +e.getAttribute('y2') - +e.getAttribute('y1')) || 1);
      // dash h at each end, gap between: h 0 -> L/2 closes the line from both ends into the middle
      const draw = (h) => legs.forEach((e, i) => { const hh = Math.min(h * L[i], L[i] / 2); e.style.strokeDasharray = hh + ' ' + Math.max(0, L[i] - 2 * hh) + ' ' + hh + ' 0'; });
      add(() => {
        const o = { h: 0 }, tl = G.timeline();
        tl.to(bases, { opacity: 0.4, duration: 0.3, ease: 'sine.out' }, 0)
          .set(ticks.concat(labels), { opacity: 0 }, 0)
          .call(() => draw(0), null, 0)
          .to(o, { h: 0.5, duration: reduced ? 0 : 0.7, ease: 'power2.inOut', onUpdate: () => draw(o.h) }, 0.1)
          .call(() => legs.forEach((e) => e.style.removeProperty('stroke-dasharray')))
          // matching pulse + the equality cues, all at the same instant
          .to(legs, { strokeWidth: 8, filter: 'drop-shadow(0px 0px 4px rgba(142,68,214,0.45))', duration: 0.3, ease: 'sine.out' }, '>')
          .to(ticks, { opacity: 1, duration: 0.3, ease: 'sine.out' }, '<')
          .fromTo(labels, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, xPercent: -50, yPercent: -50, duration: 0.35, ease: 'back.out(1.4)' }, '<')
          .to(legs, { strokeWidth: 6.5, filter: 'drop-shadow(0px 0px 2px rgba(142,68,214,0.3))', duration: 0.25, ease: 'sine.inOut' }, '>')
          // hold, then back to normal
          .to(legs, { strokeWidth: 5, filter: NOGLOW, duration: 0.45, ease: 'sine.inOut' }, '>+0.9')
          .to(bases, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, '<')
          .set(legs, { clearProps: 'strokeWidth,filter' })
          .set(bases, { clearProps: 'opacity' });
        return tl;
      });
    },

    // screen 21 entry: the corner handles pop in one after another, then the measurements fade in
    entryPop() {
      const dots = $('.vdot'), labels = $('.board .tag.mtag');
      if (!G || !dots.length) return;
      add(() => G.timeline()
        .fromTo(dots, { scale: 0.4, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: reduced ? 0 : 0.35, ease: 'back.out(1.8)', stagger: 0.08 }, 0.15)
        .fromTo(labels, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'sine.out', stagger: 0.05 }, '>-0.1'));
    },
    // correct answer: a soft sparkle burst beside the shape (no check-mark icons anywhere - success is shown with green
    // highlights, glows, gentle bounces, sparkles and the success sound)
    okCheck() {
      const g = $('.okcheck')[0];
      if (!G || !g) return;
      const spk = Array.from(g.querySelectorAll('.spk'));
      add(() => G.fromTo(spk, { scale: 0, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1.3, opacity: 0, duration: 0.9, ease: 'power2.out', stagger: 0.08 }));
    },

    // screen 23 "Let's look at its angles": A -> B -> C -> D, each arc draws itself round its corner while its value
    // glides in toward that corner (A top-left, B top-right, C bottom-right, D bottom-left) and settles
    anglesIn() {
      if (!G) return;
      // each value glides toward its own vertex from a little deeper inside the shape (along the angle's bisector):
      // going deeper only adds room from both sides, so the label stays inside the trapezium for the whole motion.
      // The arcs are clipped to the shape (index.html #shapeClip), so their draw-in can never paint outside it either.
      const dots = $('.vdot'), order = ['A', 'B', 'C', 'D'];
      const dir = {};
      order.forEach((k, i) => {
        const lab = $('.tag.alab.l' + k)[0], dot = dots[i];
        if (!lab || !dot) { dir[k] = [0, 0]; return; }
        const lx = parseFloat(lab.style.left), ly = parseFloat(lab.style.top), vx = +dot.getAttribute('cx'), vy = +dot.getAttribute('cy');
        const L = Math.hypot(lx - vx, ly - vy) || 1;
        dir[k] = [(lx - vx) / L * 16, (ly - vy) / L * 16];
      });
      add(() => {
        const tl = G.timeline();
        order.forEach((k, i) => {
          const arc = $('.arc.a' + k)[0], lab = $('.tag.alab.l' + k)[0], at = i * 0.4;
          if (arc) tl.fromTo(arc, { opacity: 1, strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out' }, at);
          if (lab) tl.fromTo(lab, { opacity: 0, x: dir[k][0], y: dir[k][1], xPercent: -50, yPercent: -50, scale: 0.9 },
            { opacity: 1, x: 0, y: 0, scale: 1, duration: reduced ? 0 : 0.5, ease: 'power3.out' }, at + 0.1);
        });
        return tl;
      });
    },

    // a named angle in focus (screen 25 "∠A ... ∠D"): the other angles dim, this arc redraws round its corner (0.5 s)
    // and gives one gentle pulse, its value pulses with it
    angleFocus(k) {
      if (!G) return;
      const arc = $('.arc.a' + k)[0], lab = $('.tag.alab.l' + k)[0];
      const others = ['A', 'B', 'C', 'D'].filter((x) => x !== k);
      const dim = others.map((x) => $('.arc.a' + x)[0]).concat(others.map((x) => $('.tag.alab.l' + x)[0])).filter(Boolean);
      add(() => {
        const tl = G.timeline();
        tl.to(dim, { opacity: 0.35, duration: 0.3, ease: 'sine.out' }, 0).to([arc, lab].filter(Boolean), { opacity: 1, duration: 0.2 }, 0);
        if (arc) tl.fromTo(arc, { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.5, ease: 'power2.out' }, 0)
          .to(arc, { strokeWidth: 10, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5);
        if (lab) tl.fromTo(lab, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.15, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5);
        return tl;
      });
    },
    // screen 25 "∠A and ∠D add up to 180°": the sum is built in the formula box. eqStart: the frame "∠A + ∠D = ?"
    // rises in; eqFly ("add"): copies of the 120° and 60° labels lift off the shape and glide into the ∠A / ∠D places;
    // eqResult ("180"): 180° pops in, "120° + 60° = 180°" holds, then the box settles to "∠A + ∠D = 180°".
    // Each step completes the ones before it if a cue comes early; everything here is removed by clear().
    // the build lives in its own layer outside the template runtime's markup (the runtime must never meet nodes it
    // did not make), laid exactly over the stage and scaled with it, so its children use stage coordinates
    eqLayer() {
      const stage = document.querySelector('.stage');
      if (!stage) return null;
      let L = document.querySelector('.eq-layer');
      if (!L) { L = document.createElement('div'); L.className = 'eq-layer'; document.body.appendChild(L); }
      const r = stage.getBoundingClientRect(), k = r.width / 1280 || 1;
      L.style.left = r.left + 'px'; L.style.top = r.top + 'px'; L.style.transform = 'scale(' + k + ')';
      return L;
    },
    eqStart() {
      if (!G || document.querySelector('.eq-build')) return;
      const row = $('.chip-row')[0], stage = this.eqLayer();
      if (!row || !stage) return;
      const slot = (cls, sym) => '<span class="eq-slot ' + cls + '"><span class="eq-sym">' + sym + '</span><span class="eq-val"></span></span>';
      const box = document.createElement('div');
      box.className = 'chip gold eq-build';
      box.innerHTML = slot('eq-a', '∠A') + '<span class="eq-op">+</span>' + slot('eq-d', '∠D') + '<span class="eq-op">=</span>' + slot('eq-r', '?');
      // centred on the formula row (stage coordinates: the row's own left/top/size)
      box.style.left = (row.offsetLeft + row.offsetWidth / 2) + 'px'; box.style.top = (row.offsetTop + row.offsetHeight / 2) + 'px';
      stage.appendChild(box);
      add(() => G.timeline()
        .fromTo(box, { xPercent: -50, yPercent: -50, opacity: 0, y: 14, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.15)
        .fromTo(box.querySelector('.eq-r .eq-sym'), { opacity: 0 }, { opacity: 0.35, duration: 0.3 }, 0.35));
    },
    eqFly() {
      if (!G) return;
      if (!document.querySelector('.eq-build')) this.eqStart();
      const box = document.querySelector('.eq-build'), stage = this.eqLayer();
      if (!box || box.dataset.flown) return;
      box.dataset.flown = '1';
      const sr = stage.getBoundingClientRect(), k = sr.width / 1280 || 1;
      const local = (r) => ({ x: (r.left - sr.left + r.width / 2) / k, y: (r.top - sr.top + r.height / 2) / k });
      add(() => {
        const tl = G.timeline({ onComplete: () => { box.dataset.landed = '1'; if (box._after) box._after(); } });
        [['A', '.eq-a'], ['D', '.eq-d']].forEach(([v, sel], i) => {
          const src = $('.board .tag.alab.l' + v)[0], dst = box.querySelector(sel);
          if (!src || !dst) return;
          const val = src.textContent.trim(), from = local(src.getBoundingClientRect()), to = local(dst.getBoundingClientRect());
          dst.querySelector('.eq-val').textContent = val;
          // the copy: same pill as the angle label, laid over the original (which stays where it is)
          const c = document.createElement('div');
          c.className = 'tag alab eq-fly'; c.textContent = val; c.style.left = from.x + 'px'; c.style.top = from.y + 'px';
          stage.appendChild(c);
          const at = i * 0.18, grow = 28 / 17; // label type (17px) grows to the formula's (28px) on the way
          tl.fromTo(c, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 }, { y: -8, scale: 1.12, boxShadow: '0 6px 14px rgba(11,91,112,.22)', duration: 0.25, ease: 'power2.out' }, at)
            .to(c, { x: to.x - from.x, y: to.y - from.y, scale: grow, backgroundColor: 'rgba(255,255,255,0)', boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.7, ease: 'power2.inOut' }, at + 0.25)
            // landing: the symbol makes way, the value takes its place, the copy dissolves into it
            .to(dst.querySelector('.eq-sym'), { opacity: 0, duration: 0.2 }, at + 0.8)
            .fromTo(dst.querySelector('.eq-val'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.9)
            .to(c, { opacity: 0, duration: 0.15, onComplete: () => c.remove() }, at + 0.95)
            .fromTo(dst, { scale: 1 }, { scale: 1.08, duration: 0.14, ease: 'sine.out', yoyo: true, repeat: 1 }, at + 0.95);
        });
        return tl;
      });
    },
    eqResult(onPop) {
      if (!G) return;
      if (!document.querySelector('.eq-build')) this.eqStart();
      const box = document.querySelector('.eq-build');
      if (!box || box.dataset.result) return;
      box.dataset.result = '1';
      const go = () => {
        const r = box.querySelector('.eq-r'), swap = (sel, toVal) => [box.querySelector(sel + ' .eq-sym'), box.querySelector(sel + ' .eq-val')][toVal ? 1 : 0];
        r.querySelector('.eq-val').textContent = '180°';
        if (onPop) onPop();
        add(() => G.timeline()
          .to(r.querySelector('.eq-sym'), { opacity: 0, duration: 0.15 }, 0)
          .fromTo(r.querySelector('.eq-val'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.05)
          .fromTo(box, { boxShadow: '0 0 0 0 rgba(255,196,60,0)' }, { boxShadow: '0 0 0 6px rgba(255,214,110,.45)', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1)
          // hold "120° + 60° = 180°", then settle to the rule "∠A + ∠D = 180°"
          .to([swap('.eq-a', true), swap('.eq-d', true)], { opacity: 0, duration: 0.35, ease: 'sine.inOut' }, 1.6)
          .to([swap('.eq-a', false), swap('.eq-d', false)], { opacity: 1, duration: 0.35, ease: 'sine.inOut' }, 1.75));
      };
      // a value still in flight lands first
      if (box.dataset.landed) go();
      else { box._after = go; if (!box.dataset.flown) this.eqFly(); }
    },
    // screen 30: the values arrive in a sum box (a soft lift-in of the box's text)
    sumValues(i) {
      const c = $('.chip-row .chip')[i];
      if (!G || !c) return;
      add(() => G.fromTo(c, { scale: 1 }, { scale: 1.04, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }));
    },
    // screen 31: the angle values turn into their names (∠A...) with a soft pop, all four together
    angleNames() {
      const labs = $('.board .tag.alab');
      if (!G || !labs.length) return;
      add(() => G.fromTo(labs, { xPercent: -50, yPercent: -50, scale: 0.7 }, { scale: 1, duration: 0.4, ease: 'back.out(1.8)', stagger: 0.06 }));
    },
    // ...and its result resolves: "180°" pops, the box gets a soft warm halo (strong: a second, slightly bigger pulse)
    sumResolve(i, strong) {
      const c = $('.chip-row .chip')[i], r = c && c.querySelector('.chip-res');
      if (!G || !c || !r) return;
      add(() => {
        const tl = G.timeline();
        tl.fromTo(r, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)' }, 0)
          .fromTo(c, { boxShadow: '0 0 0 0px rgba(255,196,60,0)' }, { boxShadow: '0 0 0 6px rgba(255,214,110,.5)', duration: 0.35, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1);
        if (strong) tl.to(r, { scale: 1.18, color: '#d9640a', duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.55);
        return tl;
      });
    },
    // angles that were dimmed on the previous screen start this one dimmed (set at once, before the first paint)
    dimAngles(keys) {
      const els = keys.split('').map((x) => $('.arc.a' + x)[0]).concat(keys.split('').map((x) => $('.tag.alab.l' + x)[0])).filter(Boolean);
      if (G && els.length) add(() => G.set(els, { opacity: 0.35 }));
    },
    // the named pair together (on "180"): both arcs and values pulse at once, then every angle comes back to full
    anglesTogether(keys) {
      if (!G || !keys.length) return;
      const arcs = keys.map((k) => $('.arc.a' + k)[0]).filter(Boolean), labs = keys.map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
      const all = $('.arc').concat($('.board .tag.alab'));
      add(() => G.timeline()
        .to(arcs.concat(labs), { opacity: 1, duration: 0.2 }, 0)
        .to(arcs, { strokeWidth: 10, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        .fromTo(labs, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.15, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        .to(all, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, '>+0.8')
        .set(all, { clearProps: 'opacity,strokeWidth,strokeDasharray,strokeDashoffset' }));
    },
    // after a line that focused angles without a sum: every angle eases back to full
    anglesRestore() {
      const all = $('.arc').concat($('.board .tag.alab'));
      if (G && all.length) add(() => G.timeline().to(all, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }).set(all, { clearProps: 'opacity,strokeWidth,strokeDasharray,strokeDashoffset' }));
    },
    // the sum label arriving: a soft pop (90% -> 100%, slight lift)
    // a name label arriving: 85% -> 105% -> 100%, then one gentle pulse
    titlePop() {
      const els = $('.chip'), el = els[els.length - 1];
      if (!G || !el) return;
      add(() => G.timeline()
        .fromTo(el, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1.05, duration: reduced ? 0 : 0.3, ease: 'power2.out' })
        .to(el, { scale: 1, duration: reduced ? 0 : 0.2, ease: 'sine.inOut' })
        .to(el, { scale: 1.04, boxShadow: '0 0 0 6px rgba(92,198,207,0.3), 0 4px 14px rgba(11,91,112,0.12)', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, '>+0.15')
        .set(el, { clearProps: 'boxShadow' }));
    },
    chipPop() {
      const els = $('.chip');
      const el = els[els.length - 1];
      if (G && el) add(() => G.fromTo(el, { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: reduced ? 0 : 0.5, ease: 'back.out(1.6)' }));
    },

    // screen 34 finale: Swiftee flies from her usual spot in a gentle arc to centre stage and settles into a soft
    // hover; a warm glow fades up behind her, two small stars pop in at her sides and a few sparkles twinkle
    heroIn() {
      const sw = $('.swiftee')[0];
      if (!G || !sw) return;
      const glow = $('.hglow'), stars = $('.bs.s1').concat($('.bs.s3')), spk = $('.hspk');
      add(() => {
        const tl = G.timeline(), fly = reduced ? 0 : 1.1;
        tl.fromTo(sw, { x: -440, scale: 0.9 }, { x: 0, scale: 1, duration: fly, ease: 'power2.inOut' }, 0)
          .fromTo(sw, { y: 0 }, { y: -110, duration: fly / 2, ease: 'sine.out' }, 0)
          .to(sw, { y: 0, duration: fly / 2, ease: 'sine.in' }, fly / 2)
          .to(glow, { opacity: 1, duration: 0.7, ease: 'sine.out' }, fly - 0.2)
          .fromTo(stars, { opacity: 0, scale: 0.3, rotation: -30, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.8)', stagger: 0.15 }, fly)
          .fromTo(spk, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)', stagger: 0.08 }, fly + 0.15)
          // then: a soft hover and gently twinkling sparkles, until the screen changes
          .call(() => {
            G.to(sw, { y: -12, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
            spk.forEach((s, i) => G.to(s, { opacity: 0.35, scale: 0.7, duration: 0.9 + i * 0.17, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
          });
        return tl;
      });
    },

    // screen 26 "That means they are supplementary angles."
    // 1. as the line starts: A (orange) and D (yellow) pulse gently, B and C dim
    suppStart() {
      if (!G) return;
      const focus = ['A', 'D'].map((k) => $('.arc.a' + k)[0]).filter(Boolean), flab = ['A', 'D'].map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
      const dim = ['B', 'C'].map((k) => $('.arc.a' + k)[0]).concat(['B', 'C'].map((k) => $('.tag.alab.l' + k)[0])).filter(Boolean);
      add(() => G.timeline()
        .to(dim, { opacity: 0.35, duration: 0.4, ease: 'sine.inOut' }, 0)
        .to(focus, { strokeWidth: 10, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1)
        .fromTo(flab, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.12, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.1));
    },
    // 2. "supplementary": copies of the 120 deg and 60 deg wedges lift off corners A and D and fly to the free side of
    //    the panel, where they lock together on one straight line - a 180 deg angle - with its label
    suppSectors() {
      if (!G) return;
      const st = document.querySelector('.stage'), sr = st.getBoundingClientRect(), k = sr.width / 1280;
      const svg = document.querySelector('.stage svg[viewBox="0 0 520 420"]'), m = svg && svg.getScreenCTM(), P = window.__trapP && window.__trapP();
      const at = (key) => { if (!m || !P) return [0, 0]; const q = svg.createSVGPoint(); q.x = P[key].x; q.y = P[key].y; const s = q.matrixTransform(m); return [(s.x - sr.left) / k, (s.y - sr.top) / k]; };
      const V = [1163, 398], a = at('A'), d = at('D');
      const ga = $('.sv-a')[0], gd = $('.sv-d')[0], base = $('.sv-base')[0], lbl = $('.sv-180')[0];
      add(() => G.timeline()
        // the orange wedge sits at A turned the way corner A opens (180 deg round), the yellow one at D already matches
        .fromTo(ga, { opacity: 0, x: a[0] - V[0], y: a[1] - V[1], rotation: 180, scale: 0.6, svgOrigin: V[0] + ' ' + V[1] },
          { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: reduced ? 0 : 0.6, ease: 'power2.inOut' }, 0)
        .fromTo(gd, { opacity: 0, x: d[0] - V[0], y: d[1] - V[1], scale: 0.6, svgOrigin: V[0] + ' ' + V[1] },
          { opacity: 1, x: 0, y: 0, scale: 1, duration: reduced ? 0 : 0.6, ease: 'power2.inOut' }, 0.25)
        .fromTo(base, { opacity: 0, scaleX: 0.2, svgOrigin: V[0] + ' ' + V[1] }, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'sine.out' }, 0.75)
        .fromTo(lbl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'sine.out' }, 0.95));
    },
    // 3. "angles": the equation gets a soft success glow; the figure stays a moment, then fades and all angles return
    suppConfirm() {
      if (!G) return;
      const chips = $('.chip'), chip = chips[chips.length - 1];
      const fig = $('.sv-a').concat($('.sv-d'), $('.sv-base'), $('.sv-180'));
      const all = $('.arc').concat($('.board .tag.alab'));
      add(() => {
        const tl = G.timeline();
        if (chip) tl.to(chip, { scale: 1.06, boxShadow: '0 0 0 6px rgba(92,198,207,0.35), 0 4px 18px rgba(46,158,79,0.35)', duration: 0.3, ease: 'sine.out' }, 0)
          .to(chip, { scale: 1, boxShadow: '0 4px 12px rgba(11,91,112,0.10)', duration: 0.5, ease: 'sine.inOut' }, 0.35);
        tl.to(fig, { opacity: 0, duration: 0.5, ease: 'sine.inOut' }, 2.6)
          .to(all, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 2.6)
          .set(all, { clearProps: 'opacity,strokeWidth' });
        return tl;
      });
    },

    // a question label arriving: pops down into place, then one soft shine across it
    askIn() {
      const chips = $('.chip'), el = chips[chips.length - 1];
      if (!G || !el) return;
      add(() => G.timeline()
        .fromTo(el, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: reduced ? 0 : 0.5, ease: 'back.out(1.7)' })
        .to(el, { boxShadow: '0 0 0 5px rgba(92,198,207,0.30), 0 4px 14px rgba(18,59,99,0.14)', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, '>+0.05'));
    },
    // a soft success glow round the latest label (optionally after a delay)
    chipGlow(delay) {
      const chips = $('.chip'), el = chips[chips.length - 1];
      if (!G || !el) return;
      add(() => G.timeline({ delay: delay || 0 })
        .to(el, { scale: 1.06, boxShadow: '0 0 0 6px rgba(92,198,207,0.35), 0 4px 18px rgba(46,158,79,0.35)', duration: 0.3, ease: 'sine.out' })
        .to(el, { scale: 1, boxShadow: '0 4px 12px rgba(11,91,112,0.10)', duration: 0.5, ease: 'sine.inOut' }, '>+0.05'));
    },

    // screen 28 "What if we...": a small anticipation squash on the shape
    whatIfStart() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      if (!G || reduced) return;
      add(() => G.timeline()
        .to([g, d].filter(Boolean), { scaleY: 0.97, scaleX: 1.02, transformOrigin: '50% 80%', duration: 0.25, ease: 'sine.out' })
        .to([g, d].filter(Boolean), { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' }));
    },
    // the four corner dots pulse once, one after another
    vertexPulse() {
      const dots = $('.vdot');
      if (G && dots.length) add(() => G.fromTo(dots, { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.6, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.07 }));
    },
    // tween the top corners through each frame (soft elastic ease, a soft sound as each glide starts)
    morph(from, frames, onUpdate, onSeg, onDone) {
      if (!G) { const f = frames[frames.length - 1]; onUpdate({ A: f.A, B: f.B }); onDone(); return; }
      const o = { A: from.A, B: from.B };
      add(() => {
        const tl = G.timeline({ onComplete: onDone, delay: 0.35 });
        frames.forEach((f, i) => tl.call(onSeg).to(o, { A: f.A, B: f.B, duration: reduced ? 0.01 : 0.85, ease: i === frames.length - 1 ? 'back.out(1.6)' : 'back.inOut(1.3)', onUpdate: () => onUpdate(o) }, '>+0.12'));
        return tl;
      });
    },
    // settle: the reshaped trapezium lands with a gentle bounce about its centre (nothing else moves - the shape change
    // is the whole story here)
    settleShape(cx, cy) {
      if (!G) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline();
        if (g) tl.fromTo(g, { scale: 1 }, { scale: 1.04, svgOrigin: cx + ' ' + cy, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: 1.04, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        return tl;
      });
    },

    // screen 29 "Notice the sum of angles": A + D pulse and the left panel glows, then B + C and the right panel
    sumPanels() {
      if (!G) return;
      const L = $('.tag.sumL')[0], R = $('.tag.sumR')[0];
      const pulse = (keys, panel, at, tl) => {
        const arcs = keys.map((k) => $('.arc.a' + k)[0]).filter(Boolean), labs = keys.map((k) => $('.tag.alab.l' + k)[0]).filter(Boolean);
        tl.to(arcs, { strokeWidth: 10, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
          .fromTo(labs, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.15, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, at);
        if (panel) tl.fromTo(panel, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.08, duration: 0.3, ease: 'back.out(2)', yoyo: true, repeat: 1 }, at + 0.2);
      };
      add(() => { const tl = G.timeline(); pulse(['A', 'D'], L, 0, tl); pulse(['B', 'C'], R, 0.8, tl); return tl; });
    },
    // the first real drag: both 180° panels give one soft success glow together
    sumsGlow() {
      const els = $('.tag.sumL').concat($('.tag.sumR'));
      if (G && els.length) add(() => G.timeline()
        .fromTo(els, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.1, boxShadow: '0 0 0 5px rgba(46,158,79,0.25), 0 4px 14px rgba(46,158,79,0.3)', duration: 0.3, ease: 'back.out(2)' })
        .to(els, { scale: 1, boxShadow: '0 3px 0 rgba(0,0,0,0.06)', duration: 0.5, ease: 'sine.inOut' }, '>+0.3'));
    },

    // screen 33: right-angle markers and their 90° labels wait hidden for the voice
    rightPrep() { const els = $('.rmark').concat($('.tag.r90')); if (G && els.length) add(() => G.set(els, { opacity: 0 })); },
    // a right-angle marker draws itself into its corner and its 90° label pops in
    rightMark(k) {
      const m = $('.rm' + k)[0], lab = $('.tag.r90' + k)[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline(), L = (m && m.getTotalLength && m.getTotalLength()) || 30;
        if (m) tl.fromTo(m, { opacity: 1, strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.5, ease: 'power2.out' }, 0)
          .to(m, { filter: 'drop-shadow(0px 0px 4px rgba(46,158,79,0.7))', duration: 0.25, yoyo: true, repeat: 1 }, 0.45);
        if (lab) tl.fromTo(lab, { opacity: 0, scale: 0.6, xPercent: -50, yPercent: -50 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.3);
        return tl;
      });
    },
    rightMarkA() { this.rightMark('A'); },
    // "...is a right angle": the two sides meeting at A light up as an L, then D's marker follows
    rightL() {
      const sides = [$('.eDA')[0], $('.eAB')[0]].filter(Boolean);
      if (!G) return;
      add(() => G.timeline()
        .to(sides, { strokeWidth: 8, filter: 'drop-shadow(0px 0px 5px rgba(46,158,79,0.6))', duration: 0.3, ease: 'sine.out' })
        .to(sides, { strokeWidth: 5, filter: NOGLOW, duration: 0.45, ease: 'sine.inOut' }, '>+0.35')
        .set(sides, { clearProps: 'strokeWidth,filter' })
        .call(() => this.rightMark('D'), null, 0.55));
    },
    // tapping a found corner: marker + label give a soft green pulse
    rightFound(k) {
      const m = $('.rm' + k)[0], lab = $('.tag.r90' + k)[0];
      if (!G) return;
      add(() => G.timeline()
        .to(m, { strokeWidth: 5, filter: 'drop-shadow(0px 0px 5px rgba(46,158,79,0.8))', duration: 0.2, yoyo: true, repeat: 1 }, 0)
        .fromTo(lab, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.3, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0));
    },
    // both 90° corners found: the vertical side glows once
    rightAll() {
      const s = $('.eDA')[0];
      if (G && s) add(() => G.timeline()
        .to(s, { strokeWidth: 9, filter: 'drop-shadow(0px 0px 6px rgba(46,158,79,0.7))', duration: 0.35, ease: 'sine.out' })
        .to(s, { strokeWidth: 5, filter: NOGLOW, duration: 0.6, ease: 'sine.inOut' }, '>+0.4')
        .set(s, { clearProps: 'strokeWidth,filter' }));
    },

    // ---------- screen 38 (check 3) ----------
    // entrance: outline draws, fill fades in, corners and letters pop, the parallel arrows slide into place
    q3In() {
      if (!G) return;
      const line = $('.q3-line')[0];
      const L = (line && line.getTotalLength && line.getTotalLength()) || 1000;
      add(() => G.timeline()
        .fromTo(line, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.9, ease: 'power2.inOut' }, 0)
        .fromTo($('.q3-fill'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6)
        .fromTo($('.q3-dot').concat($('.q3-lab')), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.05 }, 0.7)
        .fromTo($('.q3-chev'), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }, 1.0));
    },
    // "In this trapezium": one gentle pulse of the whole shape
    q3Shape() { const s = $('.q3')[0]; if (G && s) add(() => G.fromTo(s, { scale: 1 }, { scale: 1.03, transformOrigin: '50% 50%', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 })); },
    // "∠A = 120°": the orange wedge opens from A, its value pops, one soft glow
    q3A() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q3-wA'), { opacity: 1, scale: 0, transformOrigin: '0% 0%' }, { scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0)
        .fromTo($('.q3-vA'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.25)
        .to($('.q3-wA'), { filter: 'drop-shadow(0px 0px 6px rgba(240,138,36,0.8))', duration: 0.3, yoyo: true, repeat: 1 }, 0.6));
    },
    // "What is the value of ∠D?": a light travels down AD, D's yellow wedge opens, a big "?" pops and pulses,
    // then A and D glow together (60° stays hidden)
    q3D() {
      if (!G) return;
      const ad = $('.q3-ad')[0], L = 177;
      add(() => G.timeline()
        .fromTo(ad, { opacity: 0.9, strokeDasharray: '30 ' + L, strokeDashoffset: 0 }, { strokeDashoffset: -L, duration: reduced ? 0 : 0.7, ease: 'sine.inOut' }, 0)
        .to(ad, { opacity: 0, duration: 0.2 }, 0.7)
        .fromTo($('.q3-wD'), { opacity: 1, scale: 0, transformOrigin: '0% 100%' }, { scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 0.6)
        .fromTo($('.q3-q'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 0.85)
        .to($('.q3-q'), { scale: 1.15, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 1.3)
        .to($('.q3-wA').concat($('.q3-wD')), { filter: 'drop-shadow(0px 0px 6px rgba(240,170,36,0.8))', duration: 0.3, yoyo: true, repeat: 1 }, 1.4));
    },
    // after the question: AD glows once and the relationship cue "120° + ? = 180°" appears above the shape
    q3Hint() {
      if (!G) return;
      const ad = $('.q3-ad')[0];
      add(() => G.timeline()
        .fromTo(ad, { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.8, duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .fromTo($('.q3-hint'), { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }, 0.2)
        .fromTo($('.q3h-sa').concat($('.q3h-sd')), { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', stagger: 0.15 }, 0.55));
    },
    // a wrong answer: attention back to the relationship - 120° and 180° pulse; after two misses the cue shows the
    // difference to work out (180° − 120° = ?) without giving the answer
    q3Wrong(misses) {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (misses >= 2) {
          const h = $('.q3-hint')[0];
          tl.to(h, { scale: 0.9, opacity: 0.4, duration: 0.15 }, 0).call(() => {
            const a = h.querySelector('.q3h-a'), s = h.querySelector('.q3h-s'), ops = h.querySelectorAll('.q3h-op');
            a.textContent = '180°'; ops[0].textContent = '−'; h.querySelector('.q3h-x').textContent = '120°'; ops[1].textContent = '='; s.textContent = '?';
            h.querySelector('.q3h-x').style.color = '#d9640a'; a.style.color = '#0b5b70'; s.style.color = '#b8860b';
          }, null, 0.15).to(h, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, 0.15);
        }
        tl.fromTo($('.q3h-a').concat($('.q3h-s')), { scale: 1 }, { scale: 1.25, duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.2 }, 0.4);
        return tl;
      });
    },
    // idle: the "?" pulses and the cue glows briefly
    q3Idle() {
      if (!G) return;
      add(() => G.timeline()
        .to($('.q3-q'), { scale: 1.2, transformOrigin: '50% 50%', duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .to($('.q3-hint'), { boxShadow: '0 0 0 6px rgba(92,198,207,0.35), 0 4px 14px rgba(11,91,112,0.12)', duration: 0.3, yoyo: true, repeat: 1 }, 0.1));
    },
    // the right answer: 60° flies from the chosen card to D, replaces the "?", A + D glow, the cue reads
    // "120° + 60° = 180°" and its two wedges close into a straight angle
    q3Correct() {
      if (!G) return;
      const st = document.querySelector('.stage'), sr = st.getBoundingClientRect(), k = sr.width / 1280;
      const card = Array.from(document.querySelectorAll('.stage .opt')).find((e) => e.textContent.trim() === '60°');
      const q = $('.q3-q')[0], fly = $('.q3-fly')[0], h = $('.q3-hint')[0];
      const at = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; };
      const a = card ? at(card) : { x: 700, y: 470 }, b = q ? at(q) : { x: 760, y: 350 };
      add(() => G.timeline()
        .set(fly, { left: a.x, top: a.y, opacity: 1, scale: 1 }, 0)
        .to(fly, { left: b.x, top: b.y, scale: 0.9, duration: reduced ? 0 : 0.7, ease: 'power2.inOut' }, 0)
        .to(q, { opacity: 0, scale: 0.4, duration: 0.2 }, 0.55)
        .to(fly, { opacity: 0, duration: 0.15 }, 0.7)
        .fromTo($('.q3-vD'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.7)
        .to($('.q3-wA').concat($('.q3-wD')), { filter: 'drop-shadow(0px 0px 7px rgba(240,170,36,0.9))', duration: 0.35, yoyo: true, repeat: 1 }, 0.8)
        .call(() => {
          const ops = h.querySelectorAll('.q3h-op');
          h.querySelector('.q3h-a').textContent = '120°'; ops[0].textContent = '+'; ops[1].textContent = '=';
          const x = h.querySelector('.q3h-x'); x.textContent = '60°'; x.style.color = '#1d6b35'; h.querySelector('.q3h-s').textContent = '180°';
          h.querySelector('.q3h-a').style.color = '#d9640a'; h.querySelector('.q3h-s').style.color = '';
        }, null, 0.9)
        .fromTo(h, { scale: 0.92 }, { scale: 1.06, boxShadow: '0 0 0 6px rgba(46,158,79,0.28), 0 4px 18px rgba(46,158,79,0.3)', duration: 0.3, ease: 'back.out(2)' }, 0.9)
        .to(h, { scale: 1, duration: 0.4 }, 1.3)
        .fromTo($('.q3h-sa'), { x: -8 }, { x: 0, duration: 0.4, ease: 'back.out(2)' }, 1.0)
        .fromTo($('.q3h-sd'), { x: 8 }, { x: 0, duration: 0.4, ease: 'back.out(2)' }, 1.0));
    },

    // ---------- screen 39 (check 4) ----------
    // entrance: each shape draws its outline then fills, top to bottom; arrows slide in; the drop boxes pop
    q4In() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        $('.q4s').forEach((s, i) => {
          const p = s.querySelector('.q4-poly'), L = (p.getTotalLength && p.getTotalLength()) || 400, at = 0.1 + i * 0.35;
          const fill = p.getAttribute('fill');
          tl.fromTo(p, { strokeDasharray: L, strokeDashoffset: L, fillOpacity: 0 }, { strokeDashoffset: 0, duration: reduced ? 0 : 0.6, ease: 'power2.inOut' }, at)
            .to(p, { fillOpacity: 1, duration: 0.35 }, at + 0.45)
            .set(p, { clearProps: 'strokeDasharray,strokeDashoffset,fillOpacity' }, at + 0.85)
            .fromTo(s.querySelector('.q4-chev'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }, at + 0.5);
          const mark = s.querySelector('.q4-tick, .q4-right');
          if (mark) tl.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at + 0.6);
        });
        tl.fromTo($('.q4-strip'), { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.1 }, 0)
          .fromTo($('.q4-card'), { opacity: 0, scale: 0.9, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)', stagger: 0.35 }, 0.05)
          .fromTo($('.q4-link'), { opacity: 0, x: -6 }, { opacity: 0.75, x: 0, duration: 0.3, stagger: 0.12 }, 1.2)
          .fromTo($('.slot'), { opacity: 0, scaleX: 0.7 }, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'back.out(1.6)', stagger: 0.12 }, 1.3)
          .set($('.slot'), { clearProps: 'transform,scale' });
        return tl;
      });
    },
    // each shape's defining property, as a clue (never its name): 0 scalene - each leg traced separately (unequal);
    // 1 isosceles - both legs glow together and the ticks pop; 2 right - the squares draw and the vertical leg glows
    q4Clue(i, tl0, at0) {
      const s = $('.q4s' + i)[0];
      if (!G || !s) return;
      const legs = [s.querySelector('.q4-leg0'), s.querySelector('.q4-leg1')];
      const len = (e) => Math.hypot(e.getAttribute('x2') - e.getAttribute('x1'), e.getAttribute('y2') - e.getAttribute('y1')) || 1;
      const run = (tl, at) => {
        if (i === 0) legs.forEach((e, j) => tl.fromTo(e, { opacity: 0.9, strokeDasharray: len(e), strokeDashoffset: len(e) }, { strokeDashoffset: 0, duration: 0.4, ease: 'sine.inOut' }, at + j * 0.5).to(e, { opacity: 0, duration: 0.3 }, at + j * 0.5 + 0.6));
        if (i === 1) tl.fromTo(legs, { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.3 }, at)
          .fromTo(s.querySelector('.q4-tick'), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.35, duration: 0.2, yoyo: true, repeat: 1 }, at + 0.1);
        if (i === 2) {
          const r = s.querySelector('.q4-right'), L = (r.getTotalLength && r.getTotalLength()) || 60;
          tl.fromTo(r, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, at)
            .set(r, { clearProps: 'strokeDasharray,strokeDashoffset' }, at + 0.5)
            .fromTo(legs[0], { opacity: 0, strokeDasharray: 'none' }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.3 }, at + 0.35);
        }
        return tl;
      };
      if (tl0) return run(tl0, at0);
      add(() => run(G.timeline(), 0));
    },
    // "Label each trapezium...": the shapes light up one after another, each showing its clue
    q4Shapes() {
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        $('.q4s').forEach((s, i) => {
          tl.fromTo(s, { filter: 'drop-shadow(0px 0px 0px rgba(255,255,255,0))' }, { filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.95))', duration: 0.3, yoyo: true, repeat: 1 }, i * 0.7);
          this.q4Clue(i, tl, i * 0.7 + 0.1);
        });
        return tl;
      });
    },
    // second instruction line: "Drag a label" - the chips glow one by one; "onto a shape" - the rows and slots glow;
    // "tap a label and then tap a box" - one chip shows the selected glow, then all the slots answer it
    q4HiLabels() { const l = $('.lab'); if (G && l.length) add(() => G.fromTo(l, { boxShadow: '0 4px 0 #d9b04c' }, { boxShadow: '0 0 0 6px rgba(240,160,32,0.35), 0 4px 0 #d9b04c', duration: 0.25, yoyo: true, repeat: 1, stagger: 0.15 })); },
    q4HiShapes() {
      if (!G) return;
      add(() => G.timeline()
        .fromTo($('.q4-card'), { scale: 1 }, { scale: 1.05, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 1, stagger: 0.15 }, 0)
        .fromTo($('.slot'), { boxShadow: '0 0 0 0 rgba(63,163,232,0)' }, { boxShadow: '0 0 0 6px rgba(63,163,232,0.3)', duration: 0.25, yoyo: true, repeat: 1, stagger: 0.15 }, 0.1)
        .set($('.slot'), { clearProps: 'boxShadow' }));
    },
    q4HiTap() {
      const lab = $('.lab')[1];
      if (!G || !lab) return;
      add(() => G.timeline()
        .to(lab, { y: -4, boxShadow: '0 0 0 5px rgba(63,163,232,0.4), 0 6px 0 #d9b04c', duration: 0.25, ease: 'sine.out' }, 0)
        .fromTo($('.slot'), { boxShadow: '0 0 0 0 rgba(63,163,232,0)' }, { boxShadow: '0 0 0 6px rgba(63,163,232,0.3)', duration: 0.25, yoyo: true, repeat: 1 }, 0.45)
        .to(lab, { y: 0, boxShadow: '0 4px 0 #d9b04c', duration: 0.3 }, 1.1)
        .set([lab].concat($('.slot')), { clearProps: 'boxShadow,transform' }));
    },
    // the three labels rise in with a soft spring, one after another
    q4Labels() {
      const labs = $('.lab');
      if (G && labs.length) add(() => G.fromTo(labs, { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)', stagger: 0.12, clearProps: 'transform' }));
    },
    // a right match: the box pulses green, the shape glows and shows its clue again
    q4Ok(i) {
      const box = $('.slot')[i], s = $('.q4s' + i)[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (box) tl.fromTo(box, { scale: 1 }, { scale: 1.05, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        const strip = $('.q4-strip' + i)[0], card = $('.q4-card' + i)[0];
        if (strip) tl.fromTo(strip, { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.65)' }, { boxShadow: 'inset 0 0 0 2.5px rgba(46,158,79,0.6), 0 0 18px rgba(46,158,79,0.25)', duration: 0.35 }, 0.05);
        if (card) tl.fromTo(card, { y: 0 }, { y: -4, duration: 0.18, yoyo: true, repeat: 1 }, 0.05);
        if (s) tl.fromTo(s, { filter: 'drop-shadow(0px 0px 0px rgba(46,158,79,0))' }, { filter: 'drop-shadow(0px 0px 8px rgba(46,158,79,0.75))', duration: 0.3, yoyo: true, repeat: 1 }, 0.05);
        this.q4Clue(i, tl, 0.15);
        return tl;
      });
    },
    // a wrong drop: that box pulses soft orange and the label wobbles on its way back to the row
    q4Bad(i, labId) {
      const box = $('.slot')[i], lab = $('.lab[data-qa="lab-' + labId + '"]')[0];
      if (!G) return;
      add(() => {
        const tl = G.timeline();
        if (box) tl.fromTo(box, { boxShadow: '0 0 0 0 rgba(240,160,32,0)' }, { boxShadow: '0 0 0 6px rgba(240,160,32,0.45)', borderColor: '#f0a020', duration: 0.2, yoyo: true, repeat: 1 }, 0)
          .set(box, { clearProps: 'boxShadow,borderColor' });
        if (lab) tl.to(lab, { x: -8, duration: 0.07 }, 0).to(lab, { x: 7, duration: 0.08 }).to(lab, { x: -4, duration: 0.07 }).to(lab, { x: 0, duration: 0.08 }).set(lab, { clearProps: 'transform' });
        return tl;
      });
    },
    // all three matched: the shapes light up in turn
    q4Done() {
      if (!G) return;
      add(() => G.fromTo($('.q4s'), { filter: 'drop-shadow(0px 0px 0px rgba(46,158,79,0))' }, { filter: 'drop-shadow(0px 0px 9px rgba(46,158,79,0.7))', duration: 0.3, yoyo: true, repeat: 1, stagger: 0.25 }));
    },

    // screen 4: as Swiftee starts speaking the whole shape (outline, fill, corners, letters) grows to 120% about its own
    // centre (0.8 s), holds 0.5 s, and returns to exactly its original size (0.8 s) - ease-in-out, no bounce. Lines keep
    // their thickness while it grows (non-scaling stroke for the duration). Once per line playback.
    growFocus() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0], P = window.__trapP && window.__trapP();
      if (!G || !P) return;
      const cx = (P.A.x + P.B.x + P.C.x + P.D.x) / 4, cy = (P.A.y + P.B.y + P.C.y + P.D.y) / 4, S = 1.2, f = reduced ? 0 : 1;
      const lines = g ? Array.from(g.querySelectorAll('.edge, circle')) : [];
      add(() => {
        const tl = G.timeline();
        tl.call(() => lines.forEach((l) => l.setAttribute('vector-effect', 'non-scaling-stroke')), null, 0);
        if (g) tl.fromTo(g, { scale: 1 }, { scale: S, svgOrigin: cx + ' ' + cy, duration: 0.8 * f, ease: 'sine.inOut' }, 0)
          .to(g, { scale: 1, duration: 0.8 * f, ease: 'sine.inOut' }, 0.8 * f + 0.5);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: S, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.8 * f, ease: 'sine.inOut' }, 0)
          .to(d, { scale: 1, duration: 0.8 * f, ease: 'sine.inOut' }, 0.8 * f + 0.5);
        tl.call(() => { lines.forEach((l) => l.removeAttribute('vector-effect')); if (g) G.set(g, { clearProps: 'transform' }); if (d) G.set(d, { clearProps: 'transform' }); });
        return tl;
      });
    },

    // each side in turn (0.65 s apart): it thickens with a soft purple glow while its length label pulses, then settles
    sideTour(list, together, labelsTogether) {
      if (!G) return;
      const tags = $('.board .tag.mtag');
      add(() => {
        const tl = G.timeline();
        if (together) {
          const at = list.length * 0.65 + 0.1, els = together.map((k) => $('.e' + k)[0]).filter(Boolean);
          const labs = (labelsTogether || list.filter(([k]) => together.indexOf(k) >= 0).map(([, l]) => l)).map((l) => tags.find((x) => x.textContent.trim() === l && getComputedStyle(x).display !== 'none')).filter(Boolean);
          tl.to(els, { strokeWidth: 9, filter: 'drop-shadow(0px 0px 6px rgba(142,68,214,0.7))', duration: 0.35, ease: 'sine.out' }, at)
            .to(els, { strokeWidth: 5, filter: NOGLOW, duration: 0.45, ease: 'sine.inOut' }, at + 0.7)
            .set(els, { clearProps: 'strokeWidth,filter' }, at + 1.2);
          if (labs.length) tl.fromTo(labs, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.2, boxShadow: '0 0 0 4px rgba(142,68,214,0.3)', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
            .set(labs, { clearProps: 'boxShadow' }, at + 0.65);
        }
        list.forEach(([k, len], i) => {
          const e = $('.e' + k)[0], lab = tags.find((x) => x.textContent.trim() === len && getComputedStyle(x).display !== 'none'), at = i * 0.65;
          if (e) tl.to(e, { strokeWidth: 9, filter: 'drop-shadow(0px 0px 6px rgba(142,68,214,0.7))', duration: 0.25, ease: 'sine.out' }, at)
            .to(e, { strokeWidth: 5, filter: NOGLOW, duration: 0.35, ease: 'sine.inOut' }, at + 0.3)
            .set(e, { clearProps: 'strokeWidth,filter' }, at + 0.66);
          if (lab) tl.fromTo(lab, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.2, boxShadow: '0 0 0 4px rgba(142,68,214,0.3)', duration: 0.25, ease: 'sine.out', yoyo: true, repeat: 1 }, at)
            .set(lab, { clearProps: 'boxShadow' }, at + 0.55);
        });
        return tl;
      });
    },

    // legs compared side by side: each leg (with its length) lights up `gap` s after the last and they all stay lit
    // until `hold` s, so the comparison is still on screen while Swiftee says "different" / "same"; then they settle together
    legsHold(list, gap, hold) {
      if (!G) return;
      const tags = $('.board .tag.mtag');
      add(() => {
        const tl = G.timeline(), els = [], labs = [];
        list.forEach(([k, len], i) => {
          const e = $('.e' + k)[0], lab = tags.find((x) => x.textContent.trim() === len && getComputedStyle(x).display !== 'none'), at = i * gap;
          if (e) { els.push(e); tl.to(e, { strokeWidth: 9, filter: 'drop-shadow(0px 0px 6px rgba(142,68,214,0.7))', duration: 0.3, ease: 'sine.out' }, at); }
          if (lab) { labs.push(lab); tl.fromTo(lab, { xPercent: -50, yPercent: -50, scale: 1 }, { scale: 1.15, boxShadow: '0 0 0 4px rgba(142,68,214,0.3)', duration: 0.3, ease: 'back.out(2)' }, at); }
        });
        tl.to(els, { strokeWidth: 5, filter: NOGLOW, duration: 0.45, ease: 'sine.inOut' }, hold)
          .to(labs, { scale: 1, boxShadow: '0 0 0 0px rgba(142,68,214,0)', duration: 0.45, ease: 'sine.inOut' }, hold)
          .set(els, { clearProps: 'strokeWidth,filter' })
          .set(labs, { clearProps: 'boxShadow' });
        return tl;
      });
    },

    // Swiftee's laugh: a small bounce with a head tilt (her canvas only - her spot never changes) and a bubble wiggle
    laughBounce() {
      const sw = $('.swiftee canvas, .swiftee img'), bub = $('.bubble')[0];
      if (!G || reduced) return;
      add(() => G.timeline()
        .to(sw, { y: -10, rotation: -5, transformOrigin: '50% 90%', duration: 0.14, ease: 'sine.out', yoyo: true, repeat: 5 }, 0)
        .set(sw, { clearProps: 'transform' })
        .to(bub, { rotation: 2, duration: 0.1, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0)
        .set(bub, { clearProps: 'rotate,transform' }));
    },
    // a very subtle emphasis on the shape (board only, about 2%)
    boardPulse() {
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0], P = window.__trapP && window.__trapP();
      if (!G || !P) return;
      const cx = (P.A.x + P.B.x + P.C.x + P.D.x) / 4, cy = (P.A.y + P.B.y + P.C.y + P.D.y) / 4;
      add(() => {
        const tl = G.timeline();
        if (g) tl.fromTo(g, { scale: 1 }, { scale: 1.02, svgOrigin: cx + ' ' + cy, duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: 1.02, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.3, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        tl.call(() => { if (g) G.set(g, { clearProps: 'transform' }); if (d) G.set(d, { clearProps: 'transform' }); });
        return tl;
      });
    },

    // the parallel-arrow marks return once both parallel sides are back
    arrowsIn() { const els = $('.chev'); if (G && els.length) add(() => G.to(els, { opacity: 1, duration: 0.45, ease: 'sine.out', overwrite: 'auto' })); },

    // soft exit (no cut) for labels leaving with the screen change, e.g. numbers and letters on screen 3
    // screen 3 starts with every corner letter waiting (hidden) for its cue again
    lettersReset() { $('.tag.vlab').forEach((e) => e.removeAttribute('data-landed')); },
    fadeOut(sel) { const els = $(sel); if (G && els.length) add(() => G.to(els, { opacity: 0, duration: 0.35, ease: 'sine.out' })); },

    // screen 3: a corner letter arrives on its voice cue from its own corner, then a soft glow settles on it once
    letterIn(k, onLand) {
      const el = $('.tag.vlab.c' + k)[0];
      if (el) el.setAttribute('data-landed', '1'); // stays shown through the hand-over to the next screen (CSS .vlab.vin)
      if (!G || !el) { if (onLand) onLand(); return; }
      const d = { A: [-44, -44], B: [44, -44], C: [44, 44], D: [-44, 44] }[k];
      add(() => {
        centred(el);
        const tl = G.timeline();
        tl.fromTo(el, { opacity: 0, x: d[0], y: d[1], scale: 0.9 }, Object.assign({ opacity: 1, x: 0, y: 0, scale: 1, overwrite: 'auto' }, ENTER, { duration: reduced ? 0 : 0.55 }))
          .call(() => onLand && onLand(), null, 0.48)
          .fromTo(el, { textShadow: '0px 0px 0px rgba(232,40,122,0)' }, { textShadow: '0px 0px 10px rgba(232,40,122,0.55)', duration: 0.4, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.45);
        return tl;
      });
    },

    // screen 4: the previous shape fades out, then the four sides fly in - top from above, right from the right,
    // bottom from below, left from the left - each a glowing stroke that settles into the outline, starting just
    // before the previous one lands; a glow settles on the closed outline, then the corner dots and the fill fade in
    assemble() {
      if (!G) return;
      const sides = [['.eAB', 0, -64], ['.eBC', 64, 0], ['.eCD', 0, 64], ['.eDA', -64, 0]];
      add(() => {
        const tl = G.timeline();
        const edges = sides.map((s) => $(s[0])[0]).filter(Boolean), dots = $('.vdot'), fill = $('.shape-fill'), labels = $('.board .tag.vlab');
        tl.to(edges.concat(dots, fill, labels), { opacity: 0, duration: 0.3, ease: 'sine.out' }, 0);
        sides.forEach((s, i) => {
          const el = $(s[0])[0]; if (!el) return;
          // immediateRender off: the side keeps fading out with the old shape until its own entrance starts
          tl.fromTo(el, { opacity: 0, x: s[1], y: s[2], strokeWidth: 7, filter: GLOW },
            { opacity: 1, x: 0, y: 0, duration: reduced ? 0 : 0.55, ease: 'power3.out', immediateRender: false }, 0.45 + i * 0.6)
            .to(el, { strokeWidth: 5, filter: NOGLOW, duration: 0.3, ease: 'sine.out' }, '>-0.05');
        });
        tl.fromTo($('.outline-settle'), { opacity: 0 }, { opacity: 0.75, duration: 0.45, ease: 'sine.out' }, 3.0)
          .to($('.outline-settle'), { opacity: 0, duration: 0.85, ease: 'sine.inOut' }, '>')
          .to(dots, { opacity: 1, duration: 0.45, ease: 'sine.out' }, 3.1)
          .to(fill, { opacity: 1, duration: 0.9, ease: 'sine.out' }, 3.1);
        return tl;
      });
    },

    // screen 4: while the sides assemble, the whole shape is held slightly small and soft (it is still forming).
    // Applied only once the previous shape has faded out (assemble's 0.3 s exit), so the size change is never seen
    // and screen 3 -> 4 hands over without a jump.
    holdSmall(cx, cy) {
      if (!G) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline();
        if (g) tl.set(g, { scale: 0.88, opacity: 0.85, svgOrigin: cx + ' ' + cy }, 0.32);
        if (d) tl.set(d, { scale: 0.88, opacity: 0.85, transformOrigin: cx + 'px ' + cy + 'px' }, 0.32);
        return tl;
      });
    },
    // ...then, on Swiftee's cue, it comes forward once: 88% -> 100%, opacity up, a soft glow that swells and settles.
    // Ends exactly at scale 1 / opacity 1 / no glow, and stays still.
    growIn(cx, cy) {
      if (!G) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline(), dur = reduced ? 0 : 0.9;
        if (g) {
          tl.to(g, { scale: 1, opacity: 1, svgOrigin: cx + ' ' + cy, duration: dur, ease: 'power2.out' }, 0)
            .fromTo(g, { filter: 'drop-shadow(0px 0px 0px rgba(232,40,122,0))' },
              { filter: 'drop-shadow(0px 0px 12px rgba(232,40,122,0.45))', duration: dur * 0.45, ease: 'sine.out', yoyo: true, repeat: 1 }, 0);
        }
        if (d) tl.to(d, { scale: 1, opacity: 1, transformOrigin: cx + 'px ' + cy + 'px', duration: dur, ease: 'power2.out' }, 0);
        return tl;
      });
    },

    // "We call this a trapezium": the shape (and its labels) zooms up once about its own centre and eases back
    pop(cx, cy) {
      if (!G || reduced) return;
      const g = $('svg g.pop-g')[0], d = $('div.pop-g')[0];
      add(() => {
        const tl = G.timeline();
        if (g) tl.fromTo(g, { scale: 1 }, { scale: 1.07, svgOrigin: cx + ' ' + cy, duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1, repeatDelay: 0.04 }, 0);
        if (d) tl.fromTo(d, { scale: 1 }, { scale: 1.07, transformOrigin: cx + 'px ' + cy + 'px', duration: 0.28, ease: 'sine.out', yoyo: true, repeat: 1, repeatDelay: 0.04 }, 0);
        return tl;
      });
    },

    // dragged the wrong way: that side gives one short, small wiggle about its middle
    wiggle(side) {
      const el = $('.e' + side)[0];
      if (!G || !el || reduced) return;
      add(() => G.timeline()
        .to(el, { rotation: 1.6, transformOrigin: '50% 50%', duration: 0.09, ease: 'sine.out' })
        .to(el, { rotation: -1.4, duration: 0.11, ease: 'sine.inOut' })
        .to(el, { rotation: 0.8, duration: 0.1, ease: 'sine.inOut' })
        .to(el, { rotation: 0, duration: 0.12, ease: 'sine.out' }));
    }
  };
  window.Motion = Motion;
})();
