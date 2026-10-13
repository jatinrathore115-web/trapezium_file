// =====================================================================
// CHILLY - the running gag. Swiftee introduces her friend Chilly the snowman in the intro (outside her cabin); after
// that, on a few screens, once Swiftee has finished, he drops by: the snow beside her wobbles and puffs with a rustle,
// he pops up calling "Psst, Swiftee!", asks a funny mix-up question in his own (deeper) voice and bubble, Swiftee
// answers with the real idea, Chilly laughs and hops back into the snow. Each mix-up is a common one, so the joke
// also teaches.
// A step opts in with gag: { chilly: '...', swiftee: '...' } (js/lesson-data.js); call: '...' replaces "Psst, Swiftee!".
// Chilly.visit(engine, gag, done, spot) runs it (spot 'cabin': the intro's place for him, 'end': the last screen's); Chilly.stop() (every
// screen change) clears it at once.
// Art: assets/images/snowman.webp, four 300 x 300 poses in a row: ask, hop, laugh, happy; snow-drift.webp in front of him.
// =====================================================================
(function () {
  const G = window.gsap;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const FRAME = { ask: 0, hop: 1, laugh: 2, happy: 3 };

  const Chilly = {
    run: 0,
    visit(engine, gag, done, spot) {
      this.stop();
      const root = document.querySelector('.stage .chilly-root');
      if (!root || !gag) { done(); return; }
      root.classList.remove('cabin', 'end'); if (spot) root.classList.add(spot);
      const run = ++this.run, eng = engine, tok = eng.stepTok;
      const live = () => run === this.run && tok === eng.stepTok && root.isConnected;
      this.root = root; this.ctx = G ? G.context(() => {}) : null;
      const R = reduced() || !G, D = (s) => (R ? 0 : s);
      eng.gagOn = true;
      // stay: he stays on (laughing) after the visit instead of hopping away (the end screen's closer)
      const end = () => { if (run === this.run) { eng.gagOn = false; if (!gag.stay) this.stop(); } if (live() || tok === eng.stepTok) done(); };

      root.innerHTML = '';
      const body = document.createElement('div'); body.className = 'chilly'; root.appendChild(body);
      const drift = document.createElement('div'); drift.className = 'chilly-drift'; root.appendChild(drift); // he rises from behind it
      const bub = document.createElement('div'); bub.className = 'chilly-bubble'; root.appendChild(bub);
      const frame = (k) => { body.style.backgroundPosition = (FRAME[k] * 100 / 3) + '% 0'; };
      const tl = (fn) => new Promise((res) => { if (!live()) { res(); return; } if (!G) { res(); return; } this.ctx.add(() => { const t = fn(); t.eventCallback('onComplete', () => res()); }); });

      // his line: the bubble pops in with his words (key words orange), spoken in a lower, slower voice
      const speak = (text) => new Promise((res) => {
        if (!live()) { res(); return; }
        const word = (w) => '<span class="' + (/^(trapezium|legs?|isosceles|angles?|right|left|parallel|sides?)[?!.,]*$/i.test(w) ? 'key' : '') + '">' + w + '</span>';
        bub.innerHTML = text.split('\n').map((ln) => ln.split(' ').map(word).join(' ')).join('<br>');
        if (G) this.ctx.add(() => G.fromTo(bub, { opacity: 0, scale: 0.6, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: D(0.35), ease: 'back.out(2)' }));
        const s = eng.synth(), words = text.split(/\s+/).length, fallback = 700 + words * 380;
        let fin = false; const finish = () => { if (fin) return; fin = true; setTimeout(res, 500); };
        if (!s || eng.state.muted || typeof SpeechSynthesisUtterance === 'undefined') { setTimeout(finish, fallback); return; }
        try {
          eng.cancelSpeech();
          const u = new SpeechSynthesisUtterance(eng.speechOf(text));
          if (eng.voice) u.voice = eng.voice;
          u.lang = (eng.voice && eng.voice.lang) || 'en-GB'; u.rate = 0.82; u.pitch = 0.55;
          u.onend = finish; u.onerror = finish;
          setTimeout(() => { if (live()) { try { s.speak(u); } catch (e) { finish(); } } else finish(); }, 60);
          setTimeout(finish, fallback * 2 + 2000); // a voice that never ends
        } catch (e) { setTimeout(finish, fallback); }
      });
      const sway = () => { if (G && !R) this.ctx.add(() => G.to(body, { rotation: 3, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 95%' })); };

      // a few puffs of snow thrown up from the drift (stage px, from its top edge)
      const puff = (n) => {
        if (R) return;
        const d = drift.getBoundingClientRect(), r = root.getBoundingClientRect(), k = root.offsetWidth / r.width;
        const x0 = (d.left - r.left) * k, w = d.width * k, y0 = (d.top - r.top) * k + 24;
        for (let i = 0; i < n; i++) {
          const f = document.createElement('i'), s = 10 + Math.random() * 14; f.className = 'chilly-puff'; root.appendChild(f);
          f.style.left = (x0 + w * (0.25 + Math.random() * 0.5)) + 'px'; f.style.top = y0 + 'px'; f.style.width = f.style.height = s + 'px';
          this.ctx.add(() => G.timeline({ onComplete: () => f.remove() })
            .fromTo(f, { x: 0, y: 0, opacity: 0.95, scale: 0.6 }, { x: (Math.random() - 0.5) * 120, y: -60 - Math.random() * 70, scale: 1.2, duration: 0.45, ease: 'power2.out' })
            .to(f, { y: '+=36', opacity: 0, duration: 0.5, ease: 'power1.in' }));
        }
      };

      // 1. a heads-up first, so he never just appears: the drift settles on the ground, wobbles and puffs with a rustle,
      //    then boing! he pops up out of it
      frame('hop');
      tl(() => G.timeline()
        .fromTo(drift, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: D(0.3), ease: 'sine.out' }, 0)
        .call(() => { eng.sfx('rustle'); puff(8); }, null, D(0.45))
        .to(drift, { keyframes: [{ rotation: -3, scaleY: 1.08 }, { rotation: 3, scaleY: 0.96 }, { rotation: -2, scaleY: 1.05 }, { rotation: 0, scaleY: 1 }], duration: D(0.6), ease: 'sine.inOut', transformOrigin: '50% 100%' }, D(0.45))
        .call(() => { eng.sfx('rustle'); puff(7); }, null, D(1.2))
        .to(drift, { keyframes: [{ rotation: 3, scaleY: 1.1 }, { rotation: -2, scaleY: 0.97 }, { rotation: 0, scaleY: 1 }], duration: D(0.45), ease: 'sine.inOut', transformOrigin: '50% 100%' }, D(1.2))
        .call(() => { eng.sfx('boing'); puff(12); }, null, D(1.65))
        .fromTo(body, { y: 290, scaleY: 1.1 }, { y: -26, scaleY: 1, duration: D(0.42), ease: 'power2.out' }, D(1.65)) // (out of sight below until then)
        .to(body, { y: 0, duration: D(0.38), ease: 'bounce.out' })
        .to(body, { scaleY: 0.92, scaleX: 1.06, duration: D(0.08), yoyo: true, repeat: 1, transformOrigin: '50% 100%' }))
        // 2. "Psst, Swiftee!" - she turns to him in surprise - then his mix-up question (her bubble steps aside)
        .then(() => {
          if (!live()) return;
          frame('ask'); sway(); eng.setState({ bubOff: true }); eng.pose('surprised');
          return speak(gag.call || 'Psst, Swiftee!');
        })
        .then(() => {
          if (!live()) return;
          eng.pose('curious');
          return speak(gag.chilly);
        })
        // 3. Swiftee answers with the real idea
        .then(() => {
          if (!live()) return;
          if (G) this.ctx.add(() => G.to(bub, { opacity: 0, scale: 0.85, duration: D(0.25) }));
          return new Promise((res) => eng.say({ m: gag.m || 'happy', t: gag.swiftee }, () => res()));
        })
        // 4. he laughs, then hops back down into the snow
        .then(() => {
          if (!live()) return;
          frame('laugh'); eng.sfx('giggle');
          if (gag.stay) return tl(() => G.timeline().to(body, { y: -14, duration: D(0.16), ease: 'sine.out', yoyo: true, repeat: 3 }).call(() => frame('happy'), null, D(0.75)));
          return tl(() => G.timeline()
            .to(body, { y: -14, duration: D(0.16), ease: 'sine.out', yoyo: true, repeat: 3 })
            .call(() => frame('happy'), null, D(0.75))
            .to({}, { duration: D(0.6) })
            .call(() => { frame('hop'); eng.sfx('whoosh'); })
            .to(body, { y: -24, duration: D(0.2), ease: 'power2.out' })
            .to(body, { y: 230, duration: D(0.45), ease: 'power2.in' })
            .to(drift, { opacity: 0, duration: D(0.3) }));
        })
        .then(end);
    },
    // put him straight on his spot, standing in his drift (screen 44 opens on him beside Swiftee)
    place(engine, spot, pose) {
      this.stop();
      const root = document.querySelector('.stage .chilly-root');
      if (!root) return;
      root.classList.remove('cabin', 'end'); if (spot) root.classList.add(spot);
      root.innerHTML = '<div class="chilly"></div><div class="chilly-drift"></div>';
      this.root = root; this.ctx = G ? G.context(() => {}) : null;
      this.pose(pose || 'happy');
    },
    // change his pose while he stays on screen (ask, hop, laugh, happy)
    pose(k) {
      const b = this.root && this.root.querySelector('.chilly');
      if (b && FRAME[k] != null) b.style.backgroundPosition = (FRAME[k] * 100 / 3) + '% 0';
    },
    stop() {
      this.run++;
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      if (this.root) { this.root.innerHTML = ''; this.root.classList.remove('cabin', 'end'); }
      this.root = null;
    }
  };
  window.Chilly = Chilly;
})();
