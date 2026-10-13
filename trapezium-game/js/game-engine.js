// =====================================================================
// GAME ENGINE: state, narration, geometry, interactions and render values.
// Loads after js/vendor/dc-runtime.js (which provides DCLogic) and the data files.
// index.html binds to the values returned by renderVals().
// =====================================================================
window.TrapeziumGame = class TrapeziumGame extends DCLogic {
  constructor(props) {
    super(props);
    this.T = new Set();
    this.stepTok = 0;
    this.narrTok = 0;
    this.snaps = {};
    this.drag = null;
    this.ld = null;
    this.state = this.fresh(false);
  }

  // ---------- data ----------
  get S() { return CONFIG.pxPerCm; }
  initP() {
    const S = this.S, c = CONFIG.start, H = c.height, yb = c.baseY, yt = yb - H;
    const ax = c.D + Math.sqrt((c.legAD * S) * (c.legAD * S) - H * H);
    const bx = c.C - Math.sqrt((c.legBC * S) * (c.legBC * S) - H * H);
    return { A: { x: ax, y: yt }, B: { x: bx, y: yt }, C: { x: c.C, y: yb }, D: { x: c.D, y: yb } };
  }
  fresh(started) {
    return {
      started: started, step: 0, P: this.initP(),
      line: "Hi! Ready to explore a new shape with me?", reveal: 99, talking: false, bub: 'bubA',
      muted: this.state ? this.state.muted : false, done: true,
      ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, chips: [],
      moved: false, dragging: null, picks: {}, cfuFirst: true, results: {},
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false },
      hand: null, bubOff: false, centered: false, glow: null, callout: null, emph: {}
    };
  }
  steps() { return LESSON.steps; }
  cur() { return this.steps()[this.state.step]; }
  labsDef() { return LESSON.cfu4.labels; }
  slotsDef() { return LESSON.cfu4.slots; }


  // ---------- timers ----------
  tm(fn, ms) {
    const id = setTimeout(() => { this.T.delete(id); fn(); }, ms);
    this.T.add(id);
    return id;
  }
  clearT() { this.T.forEach((id) => clearTimeout(id)); this.T.clear(); }
  componentDidMount() {
    window.__trapP = () => this.state.P;
    const C = CONFIG.swiftee;
    if (window.SwifteeMascot) {
      this.sw = new window.SwifteeMascot({ base: C.base, idle: C.idle, minHoldMs: C.minHoldMs, find: () => document.querySelector('.swiftee') });
      // preload every expression the lesson uses, so reactions never wait on the network
      const want = ['measuring', C.talk, C.waiting, C.praise, C.correct, C.wrong, C.nudge, C.done];
      LESSON.steps.forEach((st) => (st.lines || []).concat(st.after || []).forEach((L) => { if (L.m) want.push(L.m); }));
      this.sw.warm(want.filter((x, i) => want.indexOf(x) === i));
    }
    // browsers only let sound start on a real user activation - on touch screens that is the finger lifting (pointerup /
    // touchend / click), not touching down. Resume the audio on each of those until it runs, so the first tap on a
    // tablet is never silent
    this.wakeAudio = () => { if (!this.actx || this.actx.state !== 'running') this.unlockAudio(); };
    ['pointerup', 'touchend', 'click', 'keydown'].forEach((n) => document.addEventListener(n, this.wakeAudio, true));
    if (!CONFIG.flow.cover) this.start(); // otherwise the front page waits for Play (coverGo)
  }
  // Front page Play. The tap is the user gesture browsers need before they allow voice and sound.
  coverGo() {
    if (this.state.started || this.coverBusy) return;
    this.coverBusy = true;
    this.unlockAudio();
    this.sfx('chime');
    this.setState({ coverLeaving: true });
    // start screen 1 underneath just after the button pops, so the cover fades into the lesson
    setTimeout(() => this.start(), 220);
    setTimeout(() => { this.coverBusy = false; this.setState({ coverLeaving: false }); }, 900);
  }
  componentWillUnmount() { ['pointerup', 'touchend', 'click', 'keydown'].forEach((n) => document.removeEventListener(n, this.wakeAudio, true)); this.clearT(); this.cancelSpeech(); if (this.sw) this.sw.destroy(); }
  componentDidUpdate() {
    this.fitBubble();
    // screen list just opened: scroll the current screen into view
    if (this.state.navOpen && !this.navShown && typeof document !== 'undefined') {
      const el = document.querySelector('.thumb.cur');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    this.navShown = !!this.state.navOpen;
  }

  // ---------- screen list (top-left) ----------
  // Jumping to a screen rebuilds the shape it expects, as if every screen before it was completed.
  // A step with `shape` starts from a preset (CONFIG.angleShape, or rightShape); only x changes.
  applyShape(st, P) {
    if (!st.shape) return P;
    P = this.clone(P);
    const S = st.shape === 'right' ? CONFIG.rightShape : CONFIG.angleShape;
    ['A', 'B', 'C', 'D'].forEach((k) => { P[k].x = S[k]; });
    return P;
  }
  // the shape a screen leaves behind once its task is done
  taskResult(st, P) {
    P = this.clone(P);
    if (st.task === 'dragA') P.A.x = P.D.x + (P.C.x - P.B.x);
    if (st.morph) { const f = st.morph[st.morph.length - 1]; P.A.x = f.A; P.B.x = f.B; }
    if (st.task === 'dragFree') P.B.x -= 40;
    if (st.task === 'drag90') P.A.x = P.D.x;
    return P;
  }
  jumpTo(i) {
    if (!this.state.started) this.start(); // a jump skips the front page
    if (i === this.state.step) { this.setState({ navOpen: false }); return; }
    let P = this.initP();
    this.snaps = {};
    for (let j = 0; j < i; j++) { P = this.applyShape(this.steps()[j], P); this.snaps[j] = this.clone(P); P = this.taskResult(this.steps()[j], P); }
    this.setState({ P: P, navOpen: false });
    this.sfx('tap');
    this.navAt = 0;
    this.goTo(i, true);
  }

  // Shrink the speech bubble to its widest line (wrapped text otherwise keeps the box at full width).
  // Measures in layout px, which ignore the stage scale. Hidden words still take up space, so the size
  // is right from the first word.
  fitBubble() {
    if (typeof document === 'undefined') return;
    const box = document.querySelector('.bubble'), txt = box && box.querySelector('.bubble-text');
    if (!txt) return;
    const key = (this.state.line || '') + '|' + txt.style.fontSize;
    if (key === this.fitKey) return;
    this.fitKey = key;
    box.style.width = '';
    if (!box.offsetWidth) { this.fitKey = null; return; } // hidden right now: fit when it shows
    const rows = {};
    txt.querySelectorAll('.w:not(.brk)').forEach((w) => {
      const r = rows[w.offsetTop] || (rows[w.offsetTop] = { l: Infinity, r: -Infinity });
      r.l = Math.min(r.l, w.offsetLeft); r.r = Math.max(r.r, w.offsetLeft + w.offsetWidth);
    });
    const widest = Math.max(0, ...Object.keys(rows).map((k) => rows[k].r - rows[k].l));
    if (!widest) return;
    const cs = getComputedStyle(box);
    const chrome = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    box.style.width = Math.ceil(widest + chrome + 3) + 'px';
    // refit when a web font finishes loading (it changes the widths)
    if (!this.fontHook && document.fonts && document.fonts.addEventListener) {
      this.fontHook = true;
      document.fonts.addEventListener('loadingdone', () => { this.fitKey = null; this.fitBubble(); });
      if (document.fonts.ready) document.fonts.ready.then(() => { this.fitKey = null; this.fitBubble(); });
    }
  }

  // ---------- Swiftee ----------
  pose(state) { if (this.sw) this.sw.play(state); }
  // what Swiftee does when nobody is talking
  restPose() {
    const C = CONFIG.swiftee, st = this.cur();
    if (this.state.measuring) return 'measuring'; // tape-measure walk while a side is measured
    if (st.end) return C.done;
    if (st.cfu && !this.state.done) return C.waiting;
    return C.idle;
  }
  // a short reaction that settles back on its own unless a line takes over
  react(state, ms) {
    this.pose(state);
    const tok = this.narrTok;
    this.tm(() => { if (tok === this.narrTok && !this.state.talking) this.pose(this.restPose()); }, ms || 1800);
  }

  // ---------- audio ----------
  synth() { try { return (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null; } catch (e) { return null; } }
  cancelSpeech() { const s = this.synth(); if (s) { try { s.cancel(); } catch (e) {} } }
  pickVoice() {
    const s = this.synth(); if (!s) return;
    let vs = [];
    try { vs = s.getVoices() || []; } catch (e) { vs = []; }
    const en = vs.filter((v) => /^en/i.test(v.lang));
    // Indian English voices first, then other clear female English voices
    const pref = [/Neerja/i, /Heera/i, /Google .*Hindi|en-IN.*Google|Google.*India/i, /en-IN/i, /Google UK English Female/i, /Samantha/i, /Aria/i, /Jenny/i, /Female/i, /en-GB/i, /en-US/i];
    let pick = null;
    for (const re of pref) { pick = en.find((v) => re.test(v.name) || re.test(v.lang)); if (pick) break; }
    this.voice = pick || en[0] || null;
  }
  // bubble text as the voice should read it (symbols and side names spelled out)
  speechOf(t) {
    return t
      .replace(/\s*\n\s*/g, ' ') // bubble line breaks are layout only
      .replace(/∠\s?([A-D])/g, 'angle $1')
      .replace(/∥/g, ' is parallel to ')
      .replace(/\b(AB|BC|CD|AD|DC)\b/g, (m) => m.split('').join(' '))
      .replace(/(\d+)\s?cm\b/g, '$1 centimetres')
      .replace(/°/g, ' degrees')
      .replace(/−/g, ' minus ')
      .replace(/\+/g, ' plus ')
      .replace(/=/g, ' equals ')
      .replace(/…/g, ', ');
  }
  // Recorded effects (CONFIG.sounds) are decoded once so they play instantly, in step with the confetti.
  // An <audio> element is the fallback for pages opened from disk, where fetch is blocked.
  loadSounds() {
    if (this.sndBuf) return;
    this.sndBuf = {}; this.sndEl = {};
    Object.keys(CONFIG.sounds || {}).forEach((k) => {
      const src = CONFIG.sounds[k];
      try { const a = new Audio(src); a.preload = 'auto'; this.sndEl[k] = a; } catch (e) {}
      if (!this.actx || typeof fetch === 'undefined') return;
      fetch(src).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => this.actx.decodeAudioData(b, ok, no)))
        .then((buf) => { this.sndBuf[k] = buf; }).catch(() => {});
    });
  }
  playSound(kind) {
    try {
      const buf = this.sndBuf && this.sndBuf[kind];
      if (buf && this.actx) {
        const src = this.actx.createBufferSource(), g = this.actx.createGain();
        g.gain.value = CONFIG.soundVolume;
        src.buffer = buf; src.connect(g); g.connect(this.actx.destination); src.start();
        return true;
      }
      const el = this.sndEl && this.sndEl[kind];
      if (el) { const a = el.cloneNode(); a.volume = CONFIG.soundVolume; const p = a.play(); if (p && p.catch) p.catch(() => {}); return true; }
    } catch (e) {}
    return false;
  }
  // Which parts of the shape a line names, and at which word: [{ i, parts }]. Parts are 'aA'..'aD' (angles),
  // 'AB' 'BC' 'CD' 'DA' (sides) and 'vA'..'vD' (vertices). A lone letter is a vertex only after "vertex",
  // "point" or "corner", so the article "A" never counts.
  partCues(words) {
    const clean = (w) => (w || '').replace(/[^A-Za-z∠]/g, '');
    const side = (p, q) => ({ AB: 'AB', BA: 'AB', BC: 'BC', CB: 'BC', CD: 'CD', DC: 'CD', DA: 'DA', AD: 'DA' })[p + q];
    const one = (w) => /^[A-D]$/.test(w);
    const cues = [];
    words.forEach((raw, i) => {
      const w = clean(raw), prev = clean(words[i - 1]).toLowerCase(), next = clean(words[i + 1]);
      let parts = null, m;
      if ((m = /^∠([A-D])$/.exec(w))) parts = ['a' + m[1]];
      else if (/^[A-D]{2}$/.test(w) && side(w[0], w[1])) parts = [side(w[0], w[1])];
      else if (one(w) && /^(vertex|point|corner)$/.test(prev)) parts = ['v' + w];
      else if (one(w) && one(next) && !one(clean(words[i - 1])) && side(w, next)) parts = [side(w, next)]; // spoken "A B"
      else if (/^legs$/i.test(w)) parts = ['DA', 'BC']; // plural only: "a leg" names one, not both
      else if (/^bases$/i.test(w)) parts = ['AB', 'CD'];
      if (parts) cues.push({ i: i, parts: parts, done: false });
    });
    return cues;
  }
  // A corner letter flies in from its corner and its dot grows as it lands. Letters land at least
  // CONFIG.letters.minGapMs apart, so A, B, C, D keep their rhythm even when several cues fire at once.
  revealLetter(k) {
    const now = Date.now(), at = Math.max(now, (this.letterAt || 0) + CONFIG.letters.minGapMs);
    this.letterAt = at;
    const go = () => {
      Motion.letterIn(k, () => this.emphasize(['v' + k]));
    };
    if (at > now) Motion.wait((at - now) / 1000, go); else go();
  }
  // named parts grow, hold briefly, then shrink back (CSS transitions do the easing)
  emphasize(parts, onDone) {
    const tok = this.stepTok;
    this.setState({ emph: Object.assign({}, this.state.emph, parts.reduce((o, k) => { o[k] = 1; return o; }, {})) });
    this.tm(() => {
      if (tok !== this.stepTok) return;
      const e = Object.assign({}, this.state.emph); parts.forEach((k) => { delete e[k]; });
      this.setState({ emph: e }, () => { if (onDone) onDone(); });
    }, CONFIG.emph.holdMs);
  }
  sfx(kind) {
    if (this.state.muted) return;
    if (CONFIG.sounds && CONFIG.sounds[kind] && this.playSound(kind)) return;
    if (!this.actx) return;
    const ctx = this.actx;
    try {
      const now = ctx.currentTime;
      // synthesized fallback; each note is [freq, start, length, optional glide-to freq]
      const N = {
        tap: [[700, 0, 0.07]], pop: [[520, 0, 0.07], [780, 0.06, 0.09]],
        good: [[660, 0, 0.12], [880, 0.1, 0.12], [1175, 0.2, 0.24]],
        snap: [[990, 0, 0.08], [1320, 0.07, 0.14]],
        bad: [[240, 0, 0.16], [190, 0.13, 0.22]],
        // softer effects, played quieter
        draw: [[520, 0, 0.18, 760]], shimmer: [[1320, 0, 0.08], [1760, 0.05, 0.08], [2093, 0.1, 0.14]],
        whoosh: [[300, 0, 0.24, 900]], morph: [[440, 0, 0.3, 640]], chime: [[784, 0, 0.12], [1047, 0.08, 0.22]],
        tick: [[1600, 0, 0.035]], warm: [[523, 0, 0.14], [659, 0.08, 0.14], [784, 0.16, 0.28]],
        flourish: [[659, 0, 0.1], [784, 0.07, 0.1], [988, 0.14, 0.1], [1319, 0.21, 0.3]]
      }[kind] || [];
      const soft = ['draw', 'shimmer', 'whoosh', 'morph', 'chime', 'tick', 'warm', 'flourish'].indexOf(kind) >= 0;
      N.forEach((n) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = kind === 'bad' ? 'square' : 'triangle';
        o.frequency.setValueAtTime(n[0], now + n[1]);
        if (n[3]) o.frequency.exponentialRampToValueAtTime(n[3], now + n[1] + n[2]);
        const peak = kind === 'bad' ? 0.06 : soft ? 0.06 : 0.16;
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(peak, now + n[1] + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + n[1]); o.stop(now + n[1] + n[2] + 0.03);
      });
    } catch (e) {}
  }

  // ---------- narration ----------
  // Speak one line. The voice is the clock: each word shows as the voice reaches it, and Swiftee's beak moves
  // only while it speaks. Voices without word-boundary events get a paced reveal instead; with no voice at
  // all, the paced reveal and the beak run on their own.
  say(L, done) {
    const keep = !!(L && L.keep); // voice-only: the bubble keeps showing the previous line
    if (!L || (!L.t && !keep) || (keep && !L.s)) { if (done) done(); return; }
    const text = keep ? this.state.line : L.t;
    const words = this.toWords(keep ? L.s : text);
    // spoken text, and where each displayed word starts in it
    let sp, offs = null;
    if (L.s) {
      sp = L.s;
      const toks = []; sp.replace(/\S+/g, (m, at) => { toks.push(at); return m; });
      if (toks.length === words.length) offs = toks;
    } else {
      const parts = words.map((w) => this.speechOf(w).trim());
      offs = []; let at = 0;
      parts.forEach((p) => { offs.push(at); at += p.length + 1; });
      sp = parts.join(' ');
    }
    const wordAt = (ci) => {
      if (offs) { let k = 0; while (k < offs.length && offs[k] <= ci) k++; return Math.max(1, k); }
      return Math.min(words.length, Math.floor((ci / Math.max(1, sp.length)) * words.length) + 1);
    };
    const setReveal = (n) => {
      if (!keep) this.setState({ reveal: n });
      if (atIdx >= 0 && n >= atIdx + 1) highlight();
      if (pAt >= 0 && n >= pAt + 1) firePulse();
      if (chipsAt >= 0 && n >= chipsAt + 1) scheduleChipsAt();
      if (fAt >= 0 && n >= fAt + 1) fireFocus();
      if (lgAt >= 0 && n >= lgAt + 1) fireLegs();
      emphCues.forEach((c) => { if (!c.done && n >= c.i + 1) { c.done = true; if (tok === this.narrTok) {
        const ang = L.angleCues ? c.parts.filter((k) => /^a[A-D]$/.test(k)) : [];
        if (ang.length) { this.sfx('pop'); ang.forEach((k) => Motion.angleFocus(k[1])); } else this.emphasize(c.parts, () => c.parts.forEach(showDelayedChips)); } } });
      wordCues.forEach((c) => { if (n >= c.i + 1) fireCue(c); });
    };
    // cueAt: { word: fnName | { fn, sfx } }, each animation runs as the voice reaches its word
    const wordCues = Object.keys(L.cueAt || {}).map((w) => {
      const v = L.cueAt[w], i = words.findIndex((x) => x.toLowerCase().replace(/[^a-z0-9-]/g, '').indexOf(w) >= 0); // an equation like "∠A = 120°" counts as one word
      return { i: i, call: typeof v === 'function' ? v : null, fn: typeof v === 'string' ? v : v.fn, sfx: v.sfx, done: false };
    }).filter((c) => c.i >= 0);
    const fireCue = (c) => { if (c.done || tok !== this.narrTok) return; c.done = true; if (c.call) { c.call(); return; } if (c.sfx) this.sfx(c.sfx); if (typeof this[c.fn] === 'function') this[c.fn](); else if (Motion[c.fn]) Motion[c.fn](); };
    // a part of the shape named in the line (∠A, AB, vertex A, legs, bases) grows briefly as the voice says it
    const emphCues = L.noEmph ? [] : this.partCues(words); // noEmph: the line animates its parts its own way
    // letters: each corner letter spoken on its own ("A, B, C, D") flies in as the voice says it
    const letterCues = [];
    if (L.letters) sp.replace(/\b([A-D])\b/g, (m, k, at) => { letterCues.push({ k: k, at: at, done: false }); return m; });
    const fireLetter = (c) => { if (!c.done && tok === this.narrTok) { c.done = true; this.revealLetter(c.k); } };
    // pulse: the shape zooms once on the pulseAt word (or as the line ends); chipsAt: the chips come in on that word.
    // Both use the word's last mention, since the name usually comes at the end of the line.
    const pAt = L.pulse && L.pulseAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.pulseAt) === 0).lastIndexOf(true) : -1;
    const chipsAt = L.chipsAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.chipsAt) === 0).lastIndexOf(true) : -1;
    let chipsAtScheduled = false, chipsAtQueued = false;
    const showChipsAt = () => {
      if (!L.chips || chipsAtScheduled || tok !== this.narrTok) return;
      chipsAtScheduled = true;
      this.addChips(L.chips);
      this.sfx('snap');
    };
    const scheduleChipsAt = () => {
      if (chipsAtScheduled || chipsAtQueued) return;
      chipsAtQueued = true;
      const delay = L.chipsAfterPulse ? 620 : 0;
      this.tm(showChipsAt, delay);
    };
    // focusAt: the line's glow pair comes into focus (the others dim) as that word is said
    const fAt = L.focusAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.focusAt) === 0).indexOf(true) : -1;
    let focused = false;
    const fireFocus = () => { if (!L.focusAt || focused || tok !== this.narrTok) return; focused = true; Motion.focusPair(L.glow || []); };
    // legsAt: both legs are shown equal as that word is said (or as the line ends)
    const lgAt = L.legsAt ? words.map((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.legsAt) === 0).indexOf(true) : -1;
    let legged = false;
    const fireLegs = () => { if (!L.legsAt || legged || tok !== this.narrTok) return; legged = true; Motion.equalLegs(); };
    let pulsed = false;
    const firePulse = () => {
      if (!L.pulse || pulsed || tok !== this.narrTok) return;
      pulsed = true;
      const P = this.state.P;
      Motion.pop((P.A.x + P.B.x + P.C.x + P.D.x) / 4, (P.A.y + P.B.y + P.C.y + P.D.y) / 4);
    };
    let cardShown = !(keep && L.chips); // a voice-only line adds its chips when the voice starts (showCard)
    // chipsAfterParts: the chips wait until each listed part has been named and has grown
    const chipsAfterParts = L.chipsAfterParts || [];
    const pulsedChipParts = {};
    const showDelayedChips = (part) => {
      if (!chipsAfterParts.length || chipsAfterParts.indexOf(part) < 0 || pulsedChipParts[part]) return;
      pulsedChipParts[part] = true;
      if (chipsAfterParts.every((k) => pulsedChipParts[k]) && tok === this.narrTok) {
        cardShown = true;
        this.addChips(L.chips);
        this.sfx('snap');
        this.setState({}, () => Motion.chipPop());
      }
    };
    let glowOn = false;
    // glowAt: the highlight waits for that word
    const atIdx = L.glowAt ? words.findIndex((w) => w.toLowerCase().replace(/[^a-z-]/g, '').indexOf(L.glowAt) === 0) : -1;
    const highlight = () => {
      if (tok !== this.narrTok) return;
      if (L.glow && !glowOn) { glowOn = true; this.setState({ glow: L.glow }); }
      if (L.callout && this.state.callout !== L.callout) this.setState({ callout: L.callout }, () => Motion.calloutIn(L.glow)); // the "Base" / "Leg" pills
    };
    const showCard = () => {
      if (tok !== this.narrTok) return;
      if (!cardShown && !chipsAfterParts.length) { cardShown = true; this.addChips(L.chips); }
      if (atIdx < 0) highlight();
    };
    const tok = ++this.narrTok;
    this.curLine = L;
    this.cancelSpeech();
    if (keep) this.setState({ talking: true });
    else this.setState({ line: text, reveal: 0, talking: true, bub: this.state.bub === 'bubA' ? 'bubB' : 'bubA', bubOff: false, centered: false });
    if (L.m) this.preloadPose(L.m);
    let i = 0, rDone = false, sDone = false, fin = false, bMode = false, spoke = false, started = false, mouthOn = false, tStart = 0;
    const live = () => tok === this.narrTok;
    const mouth = (on) => {
      if (!live() || on === mouthOn) return;
      mouthOn = on;
      if (this.sw) this.sw.talk(on, on ? null : (L.m || this.restPose()));
    };
    const finish = () => {
      if (!live() || fin || !rDone || !sDone) return;
      fin = true;
      mouth(false);
      // anything still waiting for a word that was never reached (voice cut short) happens now
      highlight();
      letterCues.forEach(fireLetter);
      this.setState(Object.assign(keep ? { talking: false } : { talking: false, reveal: words.length }, L.glow && atIdx < 0 ? { glow: null } : {}));
      if (L.glow && atIdx >= 0) this.tm(() => { if (live()) this.setState({ glow: null }); }, 1500); // a glow that waited for its word lingers a moment
      firePulse();
      if (chipsAt < 0) scheduleChipsAt();
      else if (!chipsAtScheduled) scheduleChipsAt();
      fireFocus();
      fireLegs();
      wordCues.forEach(fireCue);
      if (L.pairEnd) this.tm(() => { if (live()) Motion.anglesTogether(L.pairEnd); }, 250); // both named angles glow together
      // optsAfter: the answers slide in once the question has been asked
      if (this.cur().optsAfter && !this.state.qc && !this.state.done) {
        this.tm(() => { if (live()) { this.sfx('pop'); this.setState({ qc: true }); } }, L.pairEnd ? 700 : 300);
      }
      // Swiftee holds the line's expression for a beat, then settles
      if (L.m) this.tm(() => { if (live()) this.pose(this.restPose()); }, CONFIG.swiftee.reactMs);
      this.tm(() => { if (live() && done) done(); }, CONFIG.timing.lineGapMs); // a beat to take the line in before the next
      // qFocus (check 2): after a pause the question shape glides to the centre and the answers come in (qc)
      if (this.cur().qFocus && !this.state.done) {
        const Q = CONFIG.qFocus;
        this.tm(() => {
          if (!live()) return;
          if (!this.qText(this.cur())) this.setState({ bubOff: true }); // a static question keeps the bubble
          if (!this.state.qc) this.tm(() => { if (live()) { this.setState({ qc: true }); this.armHand(); } }, Q.fadeMs);
        }, Q.holdMs);
      }
      // layout 'focus' (screen 7): while the task runs, the bubble fades and the shape moves to centre stage
      if (this.cur().layout === 'focus' && !this.state.done) {
        const F = CONFIG.focus;
        this.tm(() => {
          if (!live()) return;
          this.setState({ bubOff: true });
          this.tm(() => { if (live()) { this.setState({ centered: true }); this.focusAt = Date.now(); this.armHand(); } }, F.fadeMs);
        }, F.holdMs);
      }
    };
    const revealAll = () => { if (!live()) return; i = words.length; setReveal(i); rDone = true; };
    // estimated time per word; paceK corrects it from how fast the real voice spoke earlier lines
    const nominal = (w) => (170 + 48 * w.length + (/[.!?,…]$/.test(w) ? 160 : 0)) / CONFIG.timing.speechRate;
    const pace = (w) => nominal(w) * (this.paceK || 1.18);
    // paced reveal, used when the voice gives no word positions
    const tick = () => {
      if (!live() || rDone || bMode) return;
      // until the voice speed is learned, the last word waits for the voice to end
      if (i < words.length - 1 || sDone || this.paceK) { i = Math.min(words.length, i + 1); setReveal(i); }
      if (i >= words.length) { rDone = true; finish(); return; }
      this.tm(tick, pace(words[i - 1] || ''));
    };
    const begin = () => { // the voice (or the silent fallback) has started
      if (!live() || started) return;
      started = true; tStart = performance.now();
      showCard(); mouth(true);
      if (L.onStart && Motion[L.onStart]) Motion[L.onStart](); // an animation that starts with the line
      if (letterCues.length) { // estimated letter times, in case the voice sends no word boundaries
        const est = words.reduce((t, w) => t + nominal(w), 0) * (this.paceK || 1.18);
        letterCues.forEach((c) => this.tm(() => { if (!bMode) fireLetter(c); }, est * c.at / Math.max(1, sp.length)));
      }
      tick();
    };
    const s = this.synth();
    const canSpeak = !this.state.muted && s && typeof SpeechSynthesisUtterance !== 'undefined';
    if (!canSpeak) {
      sDone = true; // no voice: the words pace themselves and the beak moves while they appear
      this.tm(() => { begin(); }, 140);
      const silentEnd = () => { if (!live()) return; if (rDone) { mouth(false); finish(); } else this.tm(silentEnd, 120); };
      this.tm(silentEnd, 300);
      return;
    }
    const est = words.reduce((t, w) => t + nominal(w), 0) * 1.4;
    try {
      const u = new SpeechSynthesisUtterance(sp);
      if (this.voice) u.voice = this.voice;
      u.lang = (this.voice && this.voice.lang) || 'en-GB';
      u.rate = CONFIG.timing.speechRate; u.pitch = 1.25;
      const end = () => {
        if (!live() || sDone) return;
        if (started && !bMode && tStart) { // learn this voice's speed, erring slow so words never run ahead of it
          const ratio = (performance.now() - tStart) / Math.max(1, words.reduce((t, w) => t + nominal(w), 0));
          if (ratio > 0.4 && ratio < 3) this.paceK = Math.max(0.6, 0.5 * (this.paceK || 1.18) + 0.5 * ratio * 1.06);
        }
        sDone = true; begin(); mouth(false); letterCues.forEach(fireLetter); revealAll(); finish();
      };
      u.onstart = () => { spoke = true; begin(); };
      u.onend = end; u.onerror = end;
      u.onboundary = (ev) => {
        if (!live() || (ev.name && ev.name !== 'word')) return;
        bMode = true; begin();
        letterCues.forEach((c) => { if ((ev.charIndex || 0) >= c.at) fireLetter(c); });
        const k = wordAt(ev.charIndex || 0);
        if (k > i) { i = k; setReveal(i); }
      };
      // Chrome can drop an utterance queued in the same tick as cancel(), so wait a moment
      this.tm(() => { if (live()) { try { s.speak(u); } catch (e) { end(); } } }, 60);
      // some voices never fire onstart: begin once the engine reports speaking, or after a grace period
      const kick = (n) => {
        if (!live() || started || sDone) return;
        let busy = false; try { busy = s.speaking && !s.pending; } catch (e) {}
        if (busy || n > 20) { begin(); return; }
        this.tm(() => kick(n + 1), 80);
      };
      this.tm(() => kick(0), 200);
      // watchdog for voices that never fire onend, or never start at all
      const watch = () => {
        if (!live() || sDone) return;
        let busy = true;
        try { busy = s.speaking || s.pending; } catch (e) { busy = false; }
        if (!busy && (spoke || started)) { end(); return; }
        this.tm(watch, 300);
      };
      this.tm(watch, 900);
      this.tm(() => { if (live() && !sDone) end(); }, est * 1.8 + 2500);
    } catch (e) { sDone = true; begin(); }
  }
  preloadPose(state) { if (this.sw && this.sw.m) this.sw.preload(state); }
  // split a line into words, keeping "5 cm" and short equations like "AB = 6 cm" together
  toWords(t) { return t.replace(/(\d) (cm)\b/g, '$1\u00a0$2').replace(/ ([=+\u2212]) /g, '\u00a0$1\u00a0').split(/[ \t\n]+/).filter(Boolean); }
  // A screen's narration queue. Interjections (feedback, idle hints) play over it, then the queue
  // carries on with its next line, so later lines and chips are never lost.
  playLines(lines, done) {
    this.q = { lines: lines || [], i: 0, done: done, tok: this.stepTok };
    this.qNext();
  }
  qNext() {
    const q = this.q;
    if (!q || q.tok !== this.stepTok) return;
    if (q.i >= q.lines.length) { this.q = null; if (q.done) q.done(); this.armIdle(); return; }
    const L = q.lines[q.i++];
    if (L.chips && !L.keep && !L.holdChips) this.addChips(L.chips); // voice-only and held chips come in later, timed to the voice
    this.say(L, () => this.qNext());
  }
  interject(L) {
    const tok = this.stepTok;
    this.say(L, () => { if (tok !== this.stepTok) return; if (this.q) this.qNext(); else { this.armIdle(); this.maybeAdvance(true); } this.qBack(); });
  }
  // After a feedback line, put the question back in the bubble (shown, not spoken again), so the
  // learner can always read what is being asked.
  qBack() {
    const st = this.cur(), tok = this.stepTok, q = this.qText(st);
    if (!q || this.state.done) return;
    this.tm(() => { if (tok === this.stepTok && !this.state.done && !this.state.talking) this.setState({ line: q, reveal: 999, bubOff: false }); }, 1600);
  }
  // a check or practice screen's question: its qStatic text, or else its last line
  qText(st) {
    if (st.qStatic) return st.qStatic;
    if (!(st.cfu || st.practice) || !(st.lines || []).length) return null;
    return st.lines[st.lines.length - 1].t;
  }
  addChips(cs) {
    const have = this.state.chips.map((c) => c.t);
    this.setState({ chips: this.state.chips.concat(cs.filter((c) => have.indexOf(c.t) < 0)) });
  }

  // ---------- idle hints ----------
  needsInput() {
    const st = this.cur();
    return this.state.started && !this.state.done && !!(st.task || st.cfu || st.opts);
  }
  // after a quiet spell Swiftee repeats the question or a hint (at most idleMaxHints times per screen)
  armIdle() {
    this.armHand();
    if (this.idleId) { clearTimeout(this.idleId); this.T.delete(this.idleId); this.idleId = null; }
    if (!this.needsInput() || this.cur().layout === 'focus' || this.state.swAway || this.cur().auto || this.cur().noIdle) return;
    if (this.cur().explore && this.state.explored) return; // exploring freely: no reminders
    const tok = this.stepTok;
    this.idleId = this.tm(() => {
      this.idleId = null;
      if (tok !== this.stepTok || !this.needsInput()) return;
      if (this.state.swAway) return; // no reminder while Swiftee is out measuring
      if (this.drag || this.ld || this.rulerBusy || this.state.talking) { this.armIdle(); return; }
      if ((this.idleCount || 0) >= CONFIG.timing.idleMaxHints) return;
      this.idleCount = (this.idleCount || 0) + 1;
      const st = this.cur();
      const q = this.qText(st);
      this.interject({ m: CONFIG.swiftee.nudge, t: q || st.idle || (st.hint + '.') }); // checks: the reminder is the question, word for word
    }, CONFIG.timing.idleMs);
  }
  poke() { this.idleCount = 0; this.hideHand(); this.armIdle(); }

  // ---------- hand nudge ----------
  // When a tap or drag is expected and nothing happens for CONFIG.hand.idleMs, a hand shows where (and for
  // drags, which way). Any touch hides it and restarts the wait. On checks it never points at an answer;
  // the options pulse together instead.
  handTarget() {
    const st = this.cur(), s = this.state, P = s.P;
    if (!s.started || st.end) return null;
    if (st.explore && s.explored) return null; // exploring freely: no more pointing
    if (!s.done) {
      const t = st.task;
      // drags slide toward the goal (equal legs, a right angle), or inward when any change will do
      const clamp = (v) => (Math.abs(v) < 12 ? 0 : Math.max(-70, Math.min(70, v)));
      if (t === 'dragFree') return { qa: 'vtx-B', kind: 'drag', dx: -60, dy: 0 };
      if (t === 'drag90') return { qa: 'vtx-A', kind: 'drag', dx: clamp(P.D.x - P.A.x) || -60, dy: 0 };
      if (t === 'dragA') return { qa: 'vtx-A', kind: 'drag', dx: clamp(P.D.x + (P.C.x - P.B.x) - P.A.x) || -60, dy: 0 };
      if (st.cfu === 4) {
        const c4 = s.c4, lab = this.labsDef().find((l) => !c4.locked[l.id] && !c4.at[l.id]);
        // press the label only: sliding it anywhere would hint at an answer
        return lab ? { qa: 'lab-' + lab.id, kind: 'tap' } : null;
      }
      if (st.cfu || st.opts) return { kind: 'opts' };
      return null;
    }
    if (CONFIG.flow.showNext && this.state.step < this.steps().length - 1 && st.autoAdvance == null) return { qa: 'next', kind: 'tap' };
    return null;
  }
  hideHand() { if (this.state.hand) this.setState({ hand: null }); }
  armHand(extraMs) {
    if (this.state.hand) return; // already showing: only a touch (poke) or its own timer takes it down
    if (this.handId) { clearTimeout(this.handId); this.T.delete(this.handId); this.handId = null; }
    // handOnce: one demo gesture as the screen opens, and none once the learner has touched the shape
    const once = !!this.cur().handOnce && !this.state.done;
    if (once && this.touched) return;
    if (!this.handTarget() || (this.handShown || 0) >= (once ? 1 : CONFIG.hand.maxShows)) return;
    const focus = this.cur().layout === 'focus' && !this.state.done;
    if (focus && !this.state.centered) return; // re-armed once the shape reaches centre stage
    const tok = this.stepTok;
    this.handId = this.tm(() => {
      this.handId = null;
      if (tok !== this.stepTok) return;
      // wait for Swiftee to finish and for hands to be off the board
      if (this.state.talking || this.drag || this.ld || this.rulerBusy || this.state.c4.checking) { this.armHand(); return; }
      if (once && this.touched) return;
      const T = this.handTarget();
      if (!T) return;
      let hand = { kind: T.kind, x: 0, y: 0, dx: T.dx || 0, dy: T.dy || 0, n: (this.handShown || 0), once: once };
      if (T.qa) {
        if (typeof document === 'undefined') return;
        const el = document.querySelector('[data-qa="' + T.qa + '"]'), stage = document.querySelector('.stage');
        if (!el || !stage) return;
        const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
        if (!r.width && !r.height) return;
        hand.x = Math.round((r.left + r.width / 2 - sr.left) / sc);
        hand.y = Math.round((r.top + r.height / 2 - sr.top) / sc);
        // near the bottom edge the hand would leave the stage, so it points down at the target's top instead
        if (hand.y + 75 > 715) { hand.down = true; hand.y = Math.round((r.top - sr.top) / sc) + 8; }
      }
      this.handShown = (this.handShown || 0) + 1;
      this.setState({ hand: hand });
      if (this.cur().idleFx && Motion[this.cur().idleFx]) Motion[this.cur().idleFx]();
      // show for a while, then hide; it comes back only if the learner is still idle
      this.handId = this.tm(() => { this.handId = null; if (tok === this.stepTok) { this.setState({ hand: null }, () => this.armHand()); } }, once ? CONFIG.hand.onceMs : CONFIG.hand.showMs);
    }, (once ? CONFIG.hand.onceDelayMs : focus ? CONFIG.focus.handMs + Math.max(0, (this.focusAt || 0) + CONFIG.focus.moveMs - Date.now()) : (this.cur().handMs || CONFIG.hand.idleMs)) + (extraMs || 0));
  }
  // Browsers only allow audio after a user gesture, so the first tap unlocks it.
  rootDown() { this.unlockAudio(); if (this.state.started) this.poke(); }
  unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.actx) this.actx = new AC();
      if (this.actx && this.actx.state === 'suspended') this.actx.resume();
    } catch (e) {}
    this.loadSounds();
  }

  // ---------- flow ----------
  start() {
    if (this.state.started && this.state.step === 0 && Date.now() - (this.navAt || 0) < 800) return;
    this.unlockAudio();
    const s = this.synth();
    if (s) { this.pickVoice(); try { s.onvoiceschanged = () => this.pickVoice(); } catch (e) {} }
    this.snaps = {};
    this.setState(this.fresh(true));
    this.goTo(0, true);
  }
  clone(P) { return JSON.parse(JSON.stringify(P)); }
  // Show screen i. Going forward the shape carries on from the current one; going back restores the
  // shape saved when the screen was first shown.
  goTo(i, fwd) {
    const st = this.steps()[i];
    if (!st) return;
    this.clearT();
    this.idleId = null; this.idleCount = 0; this.handId = null; this.handShown = 0; this.touched = false; this.overWig = false; this.letterAt = 0; this.morphing = false; this.settleWaiting = false; this.misses = 0; this.misses4 = {};
    this.prevLine = this.state.line;
    if (this.wk) this.wk.hide();
    if (this.aw) this.aw.cancel(); // stop screen 23's protractor walk so no late reading comes in
    this.stepTok++; this.narrTok++;
    if (window.Summary) Summary.stop(); // stop screen 37's summary
    Motion.cueReset(); // clear cue marks left by the last screen
    // Stop the last screen's animations and remove their inline styles. This must run after the tokens move on,
    // so callbacks from tweens being reverted see a stale token and change nothing.
    Motion.clear();
    this.q = null;
    this.cancelSpeech();
    this.drag = null; this.ld = null; this.rulerBusy = false; this.navAt = Date.now();
    let P;
    if (fwd || !this.snaps[i]) { P = this.applyShape(st, this.clone(this.state.P)); this.snaps[i] = this.clone(P); }
    else P = this.clone(this.snaps[i]);
    this.setState({
      step: i, P: P, done: !st.task && !st.cfu && !st.opts, ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, chips: [],
      moved: false, dragging: null, picks: {}, cfuFirst: true, hand: null, bubOff: false, centered: false, glow: null, callout: null, emph: {}, qc: false, trace: null, build: null, numsGone: false, explored: false, angFocus: null, symAng: false, linesDone: false, rFound: {}, rAll: false, labsIn: false, measuring: null, tape: null, swAway: false, line: '', reveal: 0,
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false }
    });
    if (st.layout === 'focus' && !(st.lines || []).length && !this.state.done) {
      this.setState({ line: fwd ? this.prevLine || '' : '', reveal: 999, bubOff: true, centered: true });
      this.focusAt = Date.now();
    }
    this.pose(this.restPose());
    this.setState({}, () => this.stepMotion(st)); // once the new screen is drawn
    const lines = () => this.playLines(st.lines, () => {
      this.setState({ linesDone: true }); // the screen's own lines are over (later feedback lines don't count)
      // screen 16: after her line the bubble fades, then she walks out to measure the sides
      if (st.task === 'measure' && st.auto) this.tm(() => { this.setState({ bubOff: true }); this.tm(() => this.autoMeasure(), CONFIG.focus.fadeMs + 150); }, 1200);
      // screen 23: the same, then she measures the angles with the protractor
      else if (st.task === 'measureAngles' && st.auto) this.tm(() => { this.setState({ bubOff: true }); this.tm(() => this.autoAngles(), CONFIG.focus.fadeMs + 150); }, CONFIG.angleWalk.leadMs);
      else if (st.task === 'extLegs' && st.auto) this.autoExtend(['DA', 'BC']);
      else if (st.task === 'extBases' && st.auto) {
        // extendDelay (screen 8): a pause after the line (its own gap counts), a soft glow on both bases, then the extension
        if (st.extendDelay != null) { const tok = this.stepTok; this.tm(() => { if (tok !== this.stepTok) return; Motion.softGlow(['AB', 'CD']); this.tm(() => this.autoExtend(['AB', 'CD']), 650); }, Math.max(0, st.extendDelay - CONFIG.timing.lineGapMs)); }
        else this.autoExtend(['AB', 'CD']);
      }
      else if (st.summary && window.Summary) Summary.start(this); // screen 37: the summary cards, one by one
      else this.maybeAdvance(true);
    });
    // voiceDelay (ms): Swiftee waits for the screen's opening animation before she speaks
    if (st.voiceDelay) this.tm(lines, st.voiceDelay); else lines();
  }
  // a short lock after each screen change, so a double tap cannot skip a screen
  navLocked() { return Date.now() - (this.navAt || 0) < CONFIG.timing.navLockMs; }
  next() {
    if (!this.state.done || this.navLocked()) return;
    if (this.state.step < this.steps().length - 1) { this.sfx('tap'); this.goTo(this.state.step + 1, true); }
  }
  back() {
    if (this.state.step <= 0 || this.navLocked()) return;
    // skip back over screens that move on by themselves, or Back would bounce straight forward again
    let i = this.state.step - 1;
    while (CONFIG.flow.autoAdvance && i > 0 && this.steps()[i].locked) i--;
    this.sfx('tap'); this.goTo(i, false);
  }
  // Top-right Next: moves on even if the screen is unfinished (unless it has lockNext). Skipping a drag task
  // applies its result first, so the screens after it still match the shape.
  navNext() {
    if (this.cur().lockNext && !this.state.done) return;
    const i = this.state.step;
    if (i >= this.steps().length - 1 || this.navLocked()) return;
    if (!this.state.done) {
      const st = this.cur(), P = this.clone(this.state.P);
      if (st.task === 'dragA') P.A.x = P.D.x + (P.C.x - P.B.x);
      if (st.task === 'dragFree' && !this.state.explored) P.B.x -= 40;
      if (st.task === 'drag90') P.A.x = P.D.x;
      this.setState({ P: P });
    }
    this.sfx('tap');
    this.goTo(i + 1, true);
  }
  // Screens 30 and 31: the two angle sums, one pair at a time (A and D in focus first, then B and C).
  sumSteps() {
    const tok = this.stepTok, live = () => tok === this.stepTok, V = this.vals(this.state.P);
    const box = (t, r) => ({ t: t, r: r, k: 'gold sumstep' });
    const at = (ms, fn) => this.tm(() => { if (live()) fn(); }, ms);
    if (this.cur().sumSteps === 'sym') { // screen 31: the angle values turn into names, then each sum resolves
      const cs = [box('∠A + ∠D ', '= 180°'), box('∠B + ∠C ', '= 180°')];
      this.setState({ angFocus: 'AD', chips: cs }, () => Motion.wedgeGrow('AD', 0.35));
      at(500, () => this.setState({ symAng: true }, () => Motion.angleNames()));
      at(1500, () => { this.sfx('snap'); Motion.sumResolve(0, false); });
      at(3000, () => this.setState({ angFocus: 'BC' }, () => Motion.wedgeGrow('BC')));
      at(3700, () => { this.sfx('snap'); Motion.sumResolve(1, true); });
      return;
    }
    // screen 30, built like screen 25: each box starts as "∠A + ∠D = ?", the measured angles fly in from the shape
    // and it resolves to 180°; then the same for ∠B + ∠C, whose box stays faded until its turn
    this.setState({ angFocus: 'AD', chips: [] }, () => {
      Motion.wedgeGrow('AD', 0.35);
      Motion.eqStartAt({ i: 0, keys: 'AD', dx: -172, pair: 1 });
      Motion.eqStartAt({ i: 1, keys: 'BC', dx: 172, pair: 1, dim: 1 });
    });
    at(800, () => Motion.eqFlyAt(0));
    at(2400, () => Motion.eqResultAt(0, () => this.sfx('snap')));
    at(4000, () => this.setState({ angFocus: 'BC' }, () => Motion.wedgeGrow('BC')));
    at(4500, () => Motion.eqFlyAt(1));
    at(6100, () => Motion.eqResultAt(1, () => this.sfx('snap')));
  }
  // Screen 34: the learner's right angle glows; on "another" its partner on the same leg (also 90°, since the
  // two add up to 180°) pops and joins the glow.
  anotherStart() {
    const P = this.state.P, right = ['A', 'B', 'C', 'D'].filter((k) => Math.abs(this.angle(P, k) - 90) < 0.5);
    const partner = { A: 'D', D: 'A', B: 'C', C: 'B' };
    let first = this.first90 && right.indexOf(this.first90) >= 0 ? this.first90 : right[0];
    if (!first) return;
    this.another = { first: first, other: partner[first] };
    this.setState({ angFocus: first });
  }
  anotherReveal() {
    const a = this.another;
    if (!a) return;
    this.sfx('chime');
    this.setState({ angFocus: a.first + a.other }, () => Motion.anglePop(a.other));
  }
  // screen 29 (explore): Done is the only way to finish; repeat taps do nothing
  doneExplore() {
    const st = this.cur();
    if (!st.explore || !this.state.explored || this.doneTok === this.stepTok || this.state.step >= this.steps().length - 1) return;
    this.doneTok = this.stepTok;
    this.sfx('tap');
    this.setState({ done: true });
    this.goTo(this.state.step + 1, true);
  }
  finishTask() {
    if (this.state.done) return;
    this.setState({ done: true, hand: null }); // task done: the hand has nothing left to point at
    this.armIdle();
    const st = this.cur();
    if (st.auto) { this.sfx('good'); this.react(CONFIG.swiftee.praise); } // Swiftee did it: no confetti for the learner
    else this.cheer();
    if (st.okCheck) this.setState({}, () => Motion.okCheck()); // a soft sparkle burst
    if (st.after) this.playLines(st.after, () => this.maybeAdvance(true));
    else this.maybeAdvance(false);
  }
  // every correct learner action: the correct sound and a confetti burst together, then praise
  cheer() {
    this.sfx('good');
    if (window.Confetti) window.Confetti.burst();
    this.react(CONFIG.swiftee.praise);
  }
  // Move a finished screen on by itself, a set time after its last line. Called whenever narration goes quiet;
  // does nothing until the screen's task or check is done, and never leaves the last screen.
  maybeAdvance(afterLine) {
    if (this.advId) { clearTimeout(this.advId); this.T.delete(this.advId); this.advId = null; }
    const st = this.cur(), i = this.state.step, tok = this.stepTok;
    // with autoAdvance off only Next / Back change the screen, except steps with autoNext (ms after the voice
    // ends), which flow straight on; screens 1-3 run this way as one continuous intro
    if (!CONFIG.flow.autoAdvance && st.autoNext == null) return;
    if (!this.state.done || st.end || i >= this.steps().length - 1) return;
    const wait = st.autoNext != null ? st.autoNext : st.autoAdvance != null ? st.autoAdvance : CONFIG.flow.advanceMs;
    this.advId = this.tm(() => {
      this.advId = null;
      // if Swiftee is talking again (a hint, feedback), that line's end schedules the move afresh
      if (tok !== this.stepTok || this.state.talking || this.drag || this.ld) return;
      if (this.state.navOpen) { this.maybeAdvance(false); return; } // screen list open: wait until it closes
      const bd = this.state.build; // a building shape (screen 1) finishes its outline glow and fill fade first
      if (st.build && !(bd && bd.done && !bd.settle)) { this.maybeAdvance(false); return; }
      this.goTo(i + 1, true);
    }, Math.max(0, wait - (afterLine ? CONFIG.timing.lineGapMs : 0))); // a finished line has already paused lineGapMs
  }
  oops(text) {
    this.sfx('bad');
    this.interject({ m: CONFIG.swiftee.wrong, t: text });
  }

  // ---------- screen animations and measuring ----------
  // measuring goes one side at a time, clockwise from the top
  measureOrder() { return ['AB', 'BC', 'CD', 'DA']; }
  activeSide() {
    const s = this.state;
    if (this.cur().task !== 'measure' || s.done || s.measuring) return null;
    return this.measureOrder().find((k) => !s.tap[k]) || null;
  }
  // a side's two corners, in the order Swiftee walks them
  walkEnds(leg) { const P = this.state.P; return { AB: [P.A, P.B], BC: [P.B, P.C], CD: [P.C, P.D], DA: [P.D, P.A] }[leg]; }
  // convert between board (SVG) coordinates and stage px
  boardToStage(p) {
    const svg = typeof document !== 'undefined' && document.querySelector('.stage svg[aria-label="Trapezium ABCD"]');
    const stage = svg && document.querySelector('.stage');
    if (!svg || !stage) return null;
    const m = svg.getScreenCTM(), sr = stage.getBoundingClientRect(), k = sr.width / 1280 || 1;
    const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y;
    const q = pt.matrixTransform(m);
    return { x: (q.x - sr.left) / k, y: (q.y - sr.top) / k };
  }
  stageToBoard(p) {
    const svg = p && typeof document !== 'undefined' && document.querySelector('.stage svg[aria-label="Trapezium ABCD"]');
    if (!svg) return null;
    const sr = document.querySelector('.stage').getBoundingClientRect(), k = sr.width / 1280 || 1;
    const pt = svg.createSVGPoint(); pt.x = sr.left + p.x * k; pt.y = sr.top + p.y * k;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  // Screens 7 and 8: one side at a time, a glowing line draws along the side, then its dotted extension
  // draws on (legs AD then BC, or bases AB then CD). On screen 7 it waits for the shape to reach centre stage.
  autoExtend(keys) {
    const tok = this.stepTok, live = () => tok === this.stepTok && !this.state.done;
    if (!live()) return;
    if (this.cur().layout === 'focus') {
      if (!this.state.centered) { this.tm(() => this.autoExtend(keys), 100); return; }
      const wait = (this.focusAt || 0) + CONFIG.focus.moveMs + 300 - Date.now();
      if (wait > 0) { this.tm(() => this.autoExtend(keys), wait); return; }
    }
    const isLegs = this.cur().task === 'extLegs';
    // Legs glow from D to A (then C to B) and extend toward the point where they meet; bases glow from the
    // middle out and extend from both ends. The glow eases in and the dotted line eases out at the same speed,
    // so the motion runs through the corner without a stop.
    const sp = CONFIG.trace.pxPerMs;
    const run = (ms, ease, set, done) => Motion.value(0, 1, ms / 1000, ease, (e) => { if (live()) set(e); }, () => { if (live()) done(); });
    const trace = (k, then) => {
      if (!live()) return;
      const P = this.state.P;
      const ends = { DA: [P.D, P.A], BC: [P.C, P.B], AB: [P.A, P.B], CD: [P.D, P.C] }[k], from = ends[0], to = ends[1];
      let extLen;
      if (isLegs) {
        const ap = this.inter(P.A, P.D, P.B, P.C) || { x: (P.A.x + P.B.x) / 2, y: P.A.y - 60 };
        extLen = this.dist(to, ap);
      } else extLen = Math.max(from.x + 10, 530 - to.x); // bases run out to both board edges (see be())
      this.sfx('tap');
      // 1. the glow: legs draw corner to corner; bases grow from the middle out to both ends
      const mid = !isLegs, glowLen = this.dist(from, to) * (mid ? 0.5 : 1);
      run(Math.max(350, glowLen / sp), 'sine.in', (e) => this.setState({ trace: { from: from, to: to, t: e, out: false, mid: mid, leg: isLegs } }), () => {
        // 2. the glow fades off the side as the dotted extension draws on
        this.setState({ trace: { from: from, to: to, t: 1, out: true, mid: mid, leg: isLegs } });
        run(Math.max(250, extLen / sp), 'sine.out', (e) => {
          const ext = Object.assign({}, this.state.ext); ext[k] = Math.max(e, 0.001);
          this.setState({ ext: ext });
        }, () => { this.setState({ trace: null }); Motion.wait(CONFIG.trace.gapMs / 1000, then); });
      });
    };
    trace(keys[0], () => trace(keys[1], () => { if (live()) { if (isLegs) this.sfx('snap'); this.finishTask(); } }));
  }
  // Screen 1: the outline draws itself in one stroke, D -> A -> B -> C -> D, without stopping at the corners.
  // Then the outline glow settles and the fill fades in.
  runBuild() {
    const tok = this.stepTok, P = this.state.P, Bc = CONFIG.build;
    const total = this.dist(P.D, P.A) + this.dist(P.A, P.B) + this.dist(P.B, P.C) + this.dist(P.C, P.D);
    Motion.value(0.001, total, total / Bc.pxPerMs / 1000, 'sine.inOut', (d) => {
      if (tok === this.stepTok) this.setState({ build: { d: d, done: false } });
    }, () => {
      if (tok !== this.stepTok) return;
      this.setState({ build: { d: total, done: true, settle: true, fill: true }, trace: null }, () => Motion.settle());
      this.tm(() => { if (tok === this.stepTok) this.setState({ build: { d: total, done: true, settle: false, fill: true } }); }, Bc.settleMs);
    });
  }
  // Screen 28, on "change": the corners pulse, then A and B glide through the morph frames. Only x moves, so the
  // bases stay parallel, and each frame goes through setState so the angles update live.
  shapeMorph() {
    const st = this.cur(), tok = this.stepTok;
    if (!st.morph || this.morphing) return;
    this.morphing = true;
    Motion.vertexPulse();
    const P0 = this.state.P;
    Motion.morph({ A: P0.A.x, B: P0.B.x }, st.morph, (o) => {
      if (tok !== this.stepTok) return;
      const P = this.clone(this.state.P); P.A.x = o.A; P.B.x = o.B; this.setState({ P: P });
    }, () => this.sfx('tap'), () => {
      if (tok !== this.stepTok) return;
      this.morphing = false;
      if (this.settleWaiting) { this.settleWaiting = false; this.shapeSettle(); }
    });
  }
  // screen 28, on "trapezium": the new shape settles with a gentle bounce (after the morph, if it is still running)
  shapeSettle() {
    if (this.morphing) { this.settleWaiting = true; return; }
    this.sfx('pop');
    const P = this.state.P;
    Motion.settleShape((P.A.x + P.B.x + P.C.x + P.D.x) / 4, (P.A.y + P.B.y + P.C.y + P.D.y) / 4);
  }
  // screen 29, on "change": a guide hand drags vertex A sideways and back while the sums update live
  demoDrag() {
    const tok = this.stepTok, x0 = this.state.P.A.x, dx = -55;
    if (this.state.done) return;
    if (typeof document !== 'undefined') {
      const el = document.querySelector('[data-qa="vtx-A"]'), stage = document.querySelector('.stage');
      if (el && stage) {
        const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
        this.setState({ hand: { kind: 'drag', once: true, n: 99, x: Math.round((r.left + r.width / 2 - sr.left) / sc), y: Math.round((r.top + r.height / 2 - sr.top) / sc), dx: Math.round(dx * 1.15), dy: 0 } });
      }
    }
    const setX = (x) => { if (tok !== this.stepTok || this.drag) return; const P = this.clone(this.state.P); P.A.x = x; this.setState({ P: P }); };
    this.sfx('tap');
    Motion.wait(0.45, () => Motion.value(x0, x0 + dx, 0.75, 'sine.inOut', setX, () => {
      Motion.value(x0 + dx, x0, 0.75, 'back.out(1.4)', setX, () => { if (tok === this.stepTok) this.setState({ hand: null }); });
    }));
  }
  // screen 18, on "legs": both legs glow together and their lengths pulse
  legsTogether() {
    const P = this.state.P, d = (a, b) => this.cm(this.dist(P[a], P[b]));
    Motion.legsHold([['DA', d('D', 'A')], ['BC', d('B', 'C')]], 0, 1.4); // held through "same length?"
  }
  // screen 18, "Let's find out.": a chime, the legs glow once more and the board pulses gently
  findOut() {
    this.sfx('chime');
    this.legsTogether();
    Motion.boardPulse();
  }
  // screen 21, on "isosceles": the equal lengths turn into equal marks, then the name label pops in
  isoName() {
    const tok = this.narrTok;
    this.sfx('whoosh');
    Motion.lensToTicks();
    this.tm(() => { if (tok === this.narrTok) this.showTitle(); }, 900);
  }
  // the line's name label pops in on its cue word (holdChips keeps it back until then)
  showTitle() {
    const L = this.curLine;
    if (!L || !L.chips) return;
    this.addChips(L.chips);
    this.sfx('pop');
    this.setState({}, () => Motion.titlePop());
  }
  // screen 35: the learner taps the 90° corners; a wrong corner wiggles its leg. All found: cheer.
  rightTap(k) {
    const P = this.state.P;
    if (Math.abs(this.angle(P, k) - 90) > 0.5) { this.sfx('bad'); Motion.wiggle(k === 'A' || k === 'D' ? 'DA' : 'BC'); this.interject({ m: 'thinking', t: 'That angle is not 90°. Look for the square corners.' }); return; }
    if (this.state.rFound[k]) return;
    const f = Object.assign({}, this.state.rFound, { [k]: 1 }), all = ['A', 'B', 'C', 'D'].filter((x) => Math.abs(this.angle(P, x) - 90) < 0.5).every((x) => f[x]);
    this.sfx('pop');
    Motion.rightFound(k);
    this.setState({ rFound: f, rAll: all }, () => { if (all) { this.cheer(); Motion.rightAll(); Motion.okCheck(); } });
  }
  // what a screen animates once it is drawn (GSAP, js/motion.js)
  stepMotion(st) {
    if (st !== this.cur()) return;
    if (st.sumSteps) this.sumSteps();
    // focusAng: the pair's wedges grow in from the start (a line with angleCues grows them one by one instead)
    if (st.f && st.f.focusAng && !((st.lines || [])[0] || {}).angleCues) Motion.wedgeGrow(st.f.focusAng, 0.35);
    if (st.build) { Motion.hideFill(); this.tm(() => this.runBuild(), CONFIG.build.delayMs); }
    if (st.sideNums) Motion.sideNums((i) => this.emphasize([['AB', 'BC', 'CD', 'DA'][i]]));
    // screen 3: the side numbers fade out, then are dropped so no later redraw can flash them back; the corner
    // letters start hidden and fly in on their voice cues
    if (st.letterIn) { Motion.lettersReset(); Motion.fadeOut('.tag.snum'); const tok = this.stepTok; this.tm(() => { if (tok === this.stepTok) this.setState({ numsGone: true }); }, 450); }
    if (st.dimIn) Motion.dimAngles(st.dimIn); // angles dimmed on the last screen start dimmed, with no flash
    if (st.entryPop) Motion.entryPop();
    if (st.hero) Motion.heroIn();
    if (st.enterFx && Motion[st.enterFx]) Motion[st.enterFx]();
    if (st.summary && window.Summary) Summary.enter(this); // screen 37: set up the summary layer
  }
  // screen 16: measure the sides one after another
  autoMeasure() {
    const tok = this.stepTok;
    const nextSide = () => {
      if (tok !== this.stepTok || this.state.done) return;
      const k = this.activeSide();
      if (k) this.measureLeg(k, nextSide);
    };
    nextSide();
  }
  // Where Swiftee's feet are (stage px) and how tall she is drawn, read from her element so the measuring
  // walk starts and ends wherever the screen puts her.
  homeFeet() {
    const W = CONFIG.walker, el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), b = el && this.elBox(el);
    const base = (window.SWIFTEE_MANIFEST && SWIFTEE_MANIFEST.baselineY && SWIFTEE_MANIFEST.baselineY.normalized) || 0.877;
    return b ? { x: b.x + b.w / 2, y: b.y + b.h * base } : { x: W.homeX, y: W.homeY };
  }
  homeSize() {
    const el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee'), b = el && this.elBox(el);
    return b ? b.h : CONFIG.walker.homeSize;
  }
  // Screen 16: Swiftee walks along one side laying her tape measure, then its length shows.
  // Without a page (headless test) the same steps run on timers.
  measureLeg(leg, then) {
    const s = this.state;
    if (s.done || s.tap[leg] || this.rulerBusy) return;
    if (this.cur().task === 'measure' && leg !== this.activeSide()) return; // only the next side in order
    this.rulerBusy = true; // a measuring walk is under way
    this.setState({ measuring: leg, tape: { leg: leg, t: 0 }, hand: null });
    this.sfx('tap');
    const tok = this.stepTok, W = CONFIG.walker, ends = this.walkEnds(leg);
    const lenCm = this.dist(ends[0], ends[1]) / this.S;
    const walkMs = Math.max(900, lenCm * W.msPerCm);
    const wk = this.walker();
    const live = () => tok === this.stepTok;
    const arrive = () => {
      if (!live()) return;
      const tap = Object.assign({}, this.state.tap); tap[leg] = true;
      // the tape lies flat along the whole side until the next side starts
      this.setState({ tap: tap, tape: Object.assign({}, this.state.tape, { t: 1, tip: null }) });
      this.sfx('pop');
      this.rulerBusy = false;
      if (tap.AB && tap.BC && tap.CD && tap.DA) {
        // all four measured: she walks home, then the screen carries on
        const home = () => { if (!live()) return; this.setState({ measuring: null, swAway: false, tape: null }); if (wk) wk.hide(); this.pose(this.restPose()); this.tm(() => this.finishTask(), 250); };
        if (wk) { const from = this.boardToStage(ends[1]); this.tm(() => { if (live() && from) wk.stroll(from, this.homeFeet(), W.size, this.homeSize(), home); else home(); }, 450); }
        else this.tm(home, 450);
      } else {
        this.setState({ measuring: null }); // a short beat on the corner, then the next side
        if (then) this.tm(then, CONFIG.walker.pauseMs);
      }
    };
    const walkIt = () => {
      if (!live()) return;
      const from = wk && this.boardToStage(ends[0]), to = wk && this.boardToStage(ends[1]);
      if (wk && from && to) wk.walk(from, to, walkMs, (t) => { if (live()) this.setState({ tape: { leg: leg, t: t, tip: this.stageToBoard(wk.tip()) } }); }, arrive);
      else this.tm(arrive, 300);
    };
    if (wk && !this.state.swAway) {
      // first side: she walks from where she stands to the side's first corner
      const to = this.boardToStage(ends[0]);
      this.setState({ swAway: true });
      if (to) wk.stroll(this.homeFeet(), to, this.homeSize(), W.size, walkIt); else walkIt();
    } else walkIt();
  }
  walker() {
    if (typeof document === 'undefined' || !window.SwifteeWalker || !document.querySelector('.walker')) return null;
    return this.wk || (this.wk = new window.SwifteeWalker(CONFIG.swiftee.base));
  }
  // Screen 23: Swiftee carries a protractor round A, B, C, D (js/angle-walker.js). Each angle and its value
  // appear while she holds the protractor there; then she walks home and the screen is done. With reduced
  // motion, or no page (headless test), all four angles show at once.
  autoAngles() {
    const tok = this.stepTok, live = () => tok === this.stepTok && !this.state.done;
    if (!live()) return;
    const keys = ['A', 'B', 'C', 'D'], P = this.state.P, aw = this.angleWalker();
    const verts = aw ? keys.map((k) => this.boardToStage(P[k])) : [];
    const end = () => { if (live()) this.finishTask(); };
    if (!aw || Motion.reduced || verts.some((v) => !v)) { this.sfx('pop'); Motion.anglesIn(); this.tm(end, 2600); return; }
    aw.start({
      verts: verts, home: this.homeBody(), homeEl: document.querySelector('.stage .swiftee'),
      onReading: (i) => {
        if (!live()) return;
        const k = keys[i], lab = document.querySelector('.stage .tag.alab.l' + k);
        this.sfx('pop');
        Motion.angleIn(k);
        const c = lab && this.elToStage(lab);
        if (c) this.tm(() => { if (live()) aw.sparkle(c.x, c.y); }, 180);
      },
      onDone: () => { if (live()) { this.pose(this.restPose()); this.tm(end, 200); } }
    });
  }
  angleWalker() {
    if (typeof document === 'undefined' || !window.AngleWalker || !window.AngleMeasuringFrames || !document.querySelector('.angle-walk')) return null;
    return this.aw || (this.aw = new window.AngleWalker());
  }
  // an element's box (top-left x, y and w, h) and its middle, in stage px
  elBox(el) {
    const stage = document.querySelector('.stage'), r = el.getBoundingClientRect(), sr = stage && stage.getBoundingClientRect();
    if (!sr || (!r.width && !r.height)) return null;
    const k = sr.width / 1280 || 1;
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  }
  elToStage(el) { const b = this.elBox(el); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; }
  // Swiftee's body centre where she stands (stage px) and her scale there (k): where the protractor walk
  // starts and ends
  homeBody() {
    const el = typeof document !== 'undefined' && document.querySelector('.stage .swiftee .swiftee-still'), b = el && this.elBox(el);
    const k = CONFIG.angleWalk.homeK * (b ? b.h / 198 : 1); // homeK is for her full size (the still is 198 px tall)
    return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 + 14 * b.h / 198, k: k } : { x: CONFIG.walker.homeX + 3, y: CONFIG.walker.homeY - 95, k: k };
  }

  // ---------- geometry ----------
  dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
  // the two neighbours of each corner
  nb(k) { return { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[k]; }
  // interior angle at corner k, in degrees
  angle(P, k) {
    const n = this.nb(k), V = P[k], p = P[n[0]], q = P[n[1]];
    const ux = p.x - V.x, uy = p.y - V.y, vx = q.x - V.x, vy = q.y - V.y;
    const c = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  // angle values as shown: D and C are 180 minus A and B, so each leg's pair always adds up to exactly 180
  vals(P) {
    const a = Math.round(this.angle(P, 'A')), b = Math.round(this.angle(P, 'B'));
    return { A: a, D: 180 - a, B: b, C: 180 - b };
  }
  // a length in px as a label: "5 cm", "4.5 cm"
  cm(px) {
    const v = Math.round((px / this.S) * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + ' cm';
  }
  // where line AD meets line BC (null if they are parallel)
  inter(A, D, B, C) {
    const x1 = A.x, y1 = A.y, x2 = D.x, y2 = D.y, x3 = B.x, y3 = B.y, x4 = C.x, y4 = C.y;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  // pointer position in board (SVG) coordinates
  toSvg(svg, e) {
    try {
      const m = svg.getScreenCTM();
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(m.inverse());
    } catch (err) { return null; }
  }
  // screen 20: only A can be dragged
  dragKey() {
    const st = this.cur(), s = this.state;
    return st.task === 'dragA' && !s.done ? 'A' : null;
  }
  // ---------- lesson interactions ----------
  // screens 29 and 33: any corner can be dragged
  anyCorner() { const t = this.cur().task; return (t === 'dragFree' || t === 'drag90') && !this.state.done; }
  canDrag(k) { return this.dragKey() === k || this.anyCorner(); }
  down(k, e) {
    if (!this.canDrag(k)) return;
    if (this.cur().lockTalk && this.state.talking && !this.state.explored) return; // listen first: the corners respond once she has finished
    const svg = e.currentTarget && e.currentTarget.ownerSVGElement;
    if (!svg) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
    this.drag = { k: k, svg: svg, x0: this.state.P[k].x };
    this.touched = true; // the learner has started: no more demo hand
    if (this.handId) { clearTimeout(this.handId); this.T.delete(this.handId); this.handId = null; }
    this.setState({ dragging: k, hand: null });
    this.sfx('tap');
  }
  move(e) {
    if (!this.drag) return;
    const p = this.toSvg(this.drag.svg, e);
    if (!p) return;
    const P = this.clone(this.state.P), k = this.drag.k;
    let x = p.x;
    // bases stay parallel (only x moves); the limits stop the shape crossing itself or going unreadably thin
    const Lm = CONFIG.limits, SL = Lm.maxLegRun;
    if (k === 'B') x = Math.max(P.A.x + Lm.minTop, P.C.x - SL, Math.min(P.C.x, x));
    if (k === 'A') x = Math.max(Lm.minX, P.D.x - SL, Math.min(P.B.x - Lm.minTop, P.D.x + SL, x));
    if (k === 'D') x = Math.max(Lm.minX, P.A.x - SL, Math.min(P.C.x - Lm.minBottom, P.A.x + SL, x));
    if (k === 'C') x = Math.max(P.D.x + Lm.minBottom, P.B.x - SL, Math.min(Lm.maxX, P.B.x + SL, x));
    P[k].x = x;
    // screen 20: once AD matches BC (or the drag jumps past it between two moves), A locks at the
    // equal-legs point and the task is done straight away
    if (this.cur().task === 'dragA' && k === 'A' && !this.state.done) {
      const bc = this.dist(P.B, P.C), adNow = this.dist(P.A, P.D), adWas = this.dist(this.state.P.A, P.D);
      const exact = Math.abs(adNow - bc) < CONFIG.snap.exactCm * this.S, crossed = (adWas - bc) * (adNow - bc) < 0;
      if (exact || crossed) {
        P.A.x = P.D.x + (P.C.x - P.B.x);
        this.drag = null;
        this.setState({ P: P, moved: true, dragging: null });
        this.finishTask();
        return;
      }
    }
    this.setState({ P: P, moved: this.state.moved || Math.abs(x - this.drag.x0) > 25 });
    this.overDrag(k, x);
  }
  // wrongRight: { cm, side }. Dragging the corner right (the wrong way) more than cm from its start wiggles that
  // side with the incorrect sound. It fires on crossing the limit only, at most once per CONFIG.drag.wrongGapMs.
  overDrag(k, x) {
    const W = this.cur().wrongRight, start = this.snaps[this.state.step];
    if (!W || !start || this.state.done) return;
    const over = x - start[k].x > W.cm * this.S;
    if (over && !this.overWig && Date.now() - (this.wigAt || 0) > CONFIG.drag.wrongGapMs) {
      this.wigAt = Date.now();
      this.sfx('bad');
      Motion.wiggle(W.side);
    }
    this.overWig = over;
  }
  up() {
    if (!this.drag) return;
    const k = this.drag.k;
    this.dragMoved = Math.abs(this.state.P[k].x - this.drag.x0) > 2;
    this.drag = null;
    this.setState({ dragging: null });
    this.checkDrag(k);
  }
  // check a finished drag against the screen's task
  checkDrag(k) {
    const st = this.cur(), s = this.state, P = this.clone(s.P);
    if (st.task === 'dragA' && !s.done) {
      const ad = this.dist(P.A, P.D), bc = this.dist(P.B, P.C);
      if (Math.abs(ad - bc) < CONFIG.snap.exactCm * this.S) { // usually already caught while dragging
        P.A.x = P.D.x + (P.C.x - P.B.x);
        this.setState({ P: P });
        this.finishTask();
      } else if (s.moved) { // anything else (5.2 cm, 4.8 cm...) is not correct yet
        if (Date.now() - (this.wigAt || 0) > 2500) this.sfx('bad'); // skip it if a wrong-way wiggle just played it
        this.interject({ t: 'AD is ' + this.cm(ad) + '. ' + (ad > bc ? 'Keep dragging A' : 'Drag A back a little') + ' until it shows exactly ' + this.cm(bc) + '.' });
      }
    } else if (st.task === 'dragFree' && st.explore && !s.done) {
      // explore (screen 29): drags just reshape, with no check and no success feedback. The first real drag
      // unlocks Done and plays the screen's `after` lines, if any.
      if (!this.dragMoved) return;
      this.sfx('tick');
      if (!s.explored) {
        this.setState({ explored: true, hand: null });
        if (this.idleId) { clearTimeout(this.idleId); this.T.delete(this.idleId); this.idleId = null; }
        if (st.after) this.playLines(st.after, () => {});
      }
    } else if (st.task === 'drag90' && !s.done && s.moved) {
      // screen 33: snap when the dragged corner's leg is close to a right angle
      const left = k === 'A' || k === 'D', a = this.angle(P, left ? 'A' : 'B');
      if (Math.abs(a - 90) < CONFIG.snap.rightAngleDeg) {
        if (k === 'A') P.A.x = P.D.x; if (k === 'D') P.D.x = P.A.x; if (k === 'B') P.B.x = P.C.x; if (k === 'C') P.C.x = P.B.x;
        this.first90 = k; // screen 34 reveals this corner's partner on the same leg
        this.setState({ P: P });
        this.finishTask();
      } else {
        this.sfx('bad'); this.interject({ t: '∠' + k + ' is ' + Math.round(this.angle(P, k)) + '° now. Keep dragging until it shows 90°.' });
      }
    }
  }

  // ---------- CFU ----------
  // an answer tapped on a check or practice screen; results keep whether each check was right first time
  pick(o) {
    const st = this.cur(), s = this.state;
    if (s.done || s.picks[o.id]) return;
    const picks = Object.assign({}, s.picks);
    if (o.ok) {
      picks[o.id] = 'good';
      const results = Object.assign({}, s.results);
      if (results[st.id] === undefined && !st.practice) results[st.id] = s.cfuFirst;
      let okChips = st.okChips;
      if (st.okSum) { const V = this.vals(s.P); okChips = [{ t: st.okSum.map((k) => V[k] + '°').join(' + ') + ' = 180°', k: 'gold eqpair-' + st.okSum.join('') }]; }
      if (st.okFx) this.setState({}, () => Motion[st.okFx](o));
      this.setState({ picks: picks, done: true, results: results, chips: okChips || s.chips }, () => {
        if (st.okSum) { Motion.anglesTogether(st.okSum); Motion.chipPop(); Motion.chipGlow(0.35); }
      });
      this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      picks[o.id] = 'bad';
      this.misses = (this.misses || 0) + 1;
      if (st.badFx) Motion[st.badFx](this.misses);
      this.setState({ picks: picks, cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: o.fb });
      this.poke();
    }
  }
  // check 4: where a label sits (being dragged, in a slot, or in the row below)
  labPos(id) {
    const c4 = this.state.c4;
    if (c4.drag && c4.drag.id === id) return { x: c4.drag.x, y: c4.drag.y };
    if (c4.at[id]) { const sl = this.slotsDef().find((q) => q.id === c4.at[id]); return c4.locked[id] ? { x: 840 + 4, y: sl.y + 4 } : { x: 840 + 42, y: sl.y + 4 }; } // a locked label widens to fill its slot (CSS .lab.lock)
    const i = this.labsDef().findIndex((l) => l.id === id);
    return { x: 556 + i * 216, y: 476 }; // three 208-wide labels, 8 apart
  }
  labDown(id, e) {
    const c4 = this.state.c4;
    if (this.cur().labelsAt && !this.state.labsIn) return; // labels arrive with the instruction
    if (c4.locked[id] || c4.checking || this.state.done || this.ld) return;
    const tgt = e.currentTarget;
    const root = tgt && tgt.closest ? tgt.closest('.stage') : null;
    if (!root) return;
    const r = root.getBoundingClientRect(), sc = r.width / 1280 || 1;
    const pos = this.labPos(id);
    const px = (e.clientX - r.left) / sc, py = (e.clientY - r.top) / sc;
    this.ld = { id: id, r: r, sc: sc, ox: px - pos.x, oy: py - pos.y, sx: e.clientX, sy: e.clientY, moved: false };
    try { tgt.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
  }
  // pointer moves on the stage: a corner drag, or a label drag once it has moved a few px
  rootMove(e) {
    if (this.drag) return this.move(e);
    const L = this.ld;
    if (!L) return;
    if (!L.moved && Math.hypot(e.clientX - L.sx, e.clientY - L.sy) < 6) return;
    L.moved = true;
    const px = (e.clientX - L.r.left) / L.sc, py = (e.clientY - L.r.top) / L.sc;
    this.setState({ c4: Object.assign({}, this.state.c4, { drag: { id: L.id, x: px - L.ox, y: py - L.oy, px: px, py: py }, sel: null }) });
  }
  // A label let go without moving is a tap that selects it (then slotTap places it).
  // One dropped outside a slot goes back.
  rootUp(e) {
    if (this.drag) return this.up(e);
    const L = this.ld;
    if (!L) return;
    this.ld = null;
    const c4 = Object.assign({}, this.state.c4, { drag: null });
    if (!L.moved) {
      c4.sel = c4.sel === L.id ? null : L.id;
      this.setState({ c4: c4 });
      this.sfx('tap');
      return;
    }
    const px = (e.clientX - L.r.left) / L.sc, py = (e.clientY - L.r.top) / L.sc;
    const slot = this.slotsDef().find((q) => px > 840 - 20 && px < 840 + 284 + 20 && py > q.y - 20 && py < q.y + 64 + 20);
    if (slot && !c4.checking) this.place(L.id, slot.id, c4);
    else { const at = Object.assign({}, c4.at); at[L.id] = null; this.setState({ c4: Object.assign(c4, { at: at }) }); }
  }
  slotTap(slotId) {
    const c4 = this.state.c4;
    if (!c4.sel || c4.checking || this.state.done) return;
    this.place(c4.sel, slotId, Object.assign({}, c4));
  }
  // put a label in a slot; once all three are placed they are checked together (unless the step is instant)
  place(labId, slotId, c4) {
    if (this.cur().instant) return this.place1(labId, slotId, c4);
    const at = Object.assign({}, c4.at);
    for (const k in at) { if (at[k] === slotId && k !== labId) { if (c4.locked[k]) return this.setState({ c4: c4 }); at[k] = null; } }
    at[labId] = slotId;
    this.setState({ c4: Object.assign({}, c4, { at: at, sel: null, drag: null }) });
    this.sfx('pop');
    if (at.iso && at.right && at.scal) {
      this.setState({ c4: Object.assign({}, this.state.c4, { checking: true }) });
      const tok = this.stepTok;
      this.tm(() => { if (tok === this.stepTok) this.check4(); }, 380);
    }
  }
  // instant checking (check 4, screen 41): each drop is checked on the spot. A right one locks in; a wrong one
  // goes back to the row, and after two misses with the same label its shape's clue lights up as a hint.
  place1(labId, slotId, c4) {
    const st = this.cur(), slots = this.slotsDef(), sl = slots.find((q) => q.id === slotId), idx = slots.indexOf(sl);
    const at = Object.assign({}, c4.at);
    const taken = Object.keys(c4.locked).some((k) => c4.locked[k] && c4.at[k] === slotId);
    if (sl && sl.ans === labId && !taken) {
      at[labId] = slotId;
      const locked = Object.assign({}, c4.locked, { [labId]: true });
      this.setState({ c4: Object.assign({}, c4, { at: at, locked: locked, sel: null, drag: null }) }, () => Motion.q4Ok(idx));
      this.sfx('snap');
      if (['iso', 'right', 'scal'].every((k) => locked[k])) {
        const s = this.state, results = Object.assign({}, s.results);
        if (results[st.id] === undefined) results[st.id] = s.cfuFirst;
        this.setState({ done: true, results: results }, () => Motion.q4Done());
        this.tm(() => { this.cheer(); this.interject({ m: CONFIG.swiftee.correct, t: st.ok }); }, 450);
      }
      return;
    }
    at[labId] = null;
    this.misses4 = this.misses4 || {};
    const m = (this.misses4[labId] = (this.misses4[labId] || 0) + 1);
    this.setState({ c4: Object.assign({}, c4, { at: at, sel: null, drag: null }), cfuFirst: false }, () => Motion.q4Bad(idx, labId));
    this.sfx('bad');
    if (m >= 2) this.tm(() => Motion.q4Clue(slots.findIndex((q) => q.ans === labId)), 500);
    this.interject({ m: CONFIG.swiftee.wrong, t: m >= 2 ? 'Watch the glowing clue. Which shape has that mark?' : 'Try again! Look closely at the shapes.' });
    this.poke();
  }
  // check 4, on "labels": the labels slide in and can now be dragged; a hand shows one drag
  q4LabelsIn() {
    if (this.state.labsIn) return;
    this.setState({ labsIn: true }, () => { this.sfx('pop'); Motion.q4Labels(); });
    const tok = this.stepTok;
    this.tm(() => {
      if (tok !== this.stepTok || this.ld || this.state.done || typeof document === 'undefined') return;
      const el = document.querySelector('[data-qa="lab-right"]'), stage = document.querySelector('.stage');
      if (!el || !stage) return;
      const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
      this.setState({ hand: { kind: 'drag', once: true, n: 99, x: Math.round((r.left + r.width / 2 - sr.left) / sc), y: Math.round((r.top + r.height / 2 - sr.top) / sc), dx: 40, dy: -70 } });
      this.tm(() => { if (tok === this.stepTok) this.setState({ hand: null }); }, CONFIG.hand.onceMs);
    }, 1400);
  }
  // check all three placed labels together: right ones lock, wrong ones go back
  check4() {
    const st = this.cur(), s = this.state, c4 = s.c4;
    const at = Object.assign({}, c4.at), locked = Object.assign({}, c4.locked);
    let all = true;
    Object.keys(at).forEach((k) => {
      const sl = this.slotsDef().find((q) => q.id === at[k]);
      if (sl && sl.ans === k) locked[k] = true; else { at[k] = null; all = false; }
    });
    this.setState({ c4: Object.assign({}, c4, { at: at, locked: locked, checking: false }) });
    if (all) {
      const results = Object.assign({}, s.results);
      if (results[st.id] === undefined) results[st.id] = s.cfuFirst;
      this.setState({ done: true, results: results });
      this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      this.setState({ cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: 'Some labels went back. Look for the marks: equal legs, right angles, or neither.' });
      this.poke();
    }
  }

  // ---------- render ----------
  // everything drawn on the board: sides, extensions, marks, angles and labels
  geo() {
    const s = this.state, st = this.cur(), f = st.f || {}, P = s.P, task = st.task;
    const A = P.A, B = P.B, C = P.C, D = P.D;
    const dsp = (b) => (b ? 'inline' : 'none');
    const r1 = (v) => Math.round(v * 10) / 10;
    const seg = (p, q, show, extra) => Object.assign({ x1: r1(p.x), y1: r1(p.y), x2: r1(q.x), y2: r1(q.y), d: dsp(show) }, extra || {});
    const lerp = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    const noop = () => {};
    const apex = this.inter(A, D, B, C) || { x: (A.x + B.x) / 2, y: A.y - 60 };
    const g = {};
    g.poly = [A, B, C, D].map((p) => r1(p.x) + ',' + r1(p.y)).join(' ');
    // legGlow (screens 5-6): AD and BC are drawn bolder, so the learner knows which two sides "will meet"
    const waitFocusG = st.layout === 'focus' && !s.centered;
    const said = (k) => !!(s.glow && s.glow.indexOf(k) >= 0);
    const glowLeg = (k) => !!f.legGlow || said(k) || (task === 'extLegs' && !st.auto && !s.done && !waitFocusG && !(s.ext[k] > 0));
    const act = task === 'measure' ? this.activeSide() : null;
    const meas = (k) => task === 'measure' && (!!s.tap[k] || s.measuring === k);
    // A highlighted ("lit") side is drawn a little bolder in its own colour (.edge.lit), never with a coloured
    // band: legGlow, a line's glow, or the side being measured.
    const lit = {};
    const light = (k, on) => { lit[k] = st.auto ? on : (on || act === k || meas(k)); };
    light('DA', glowLeg('DA'));
    light('BC', glowLeg('BC'));
    const glowBase = (k) => said(k) || (task === 'extBases' && !st.auto && !s.done && !waitFocusG && !(s.ext[k] > 0));
    light('AB', glowBase('AB'));
    light('CD', glowBase('CD'));
    // the measuring tape (screen 16)
    {
      const tp = s.tape, ends = tp ? this.walkEnds(tp.leg) : null;
      if (ends) {
        const L = this.dist(ends[0], ends[1]) || 1, ux = (ends[1].x - ends[0].x) / L, uy = (ends[1].y - ends[0].y) / L;
        const cx = (A.x + B.x + C.x + D.x) / 4, cy = (A.y + B.y + C.y + D.y) / 4;
        let nx = -uy, ny = ux; if (nx * (ends[0].x - cx) + ny * (ends[0].y - cy) < 0) { nx = -nx; ny = -ny; }
        const off = 7, p0 = { x: ends[0].x + nx * off, y: ends[0].y + ny * off }; // the tape lies alongside the side, outside it
        const foot = { x: p0.x + ux * L * tp.t, y: p0.y + uy * L * tp.t }, tip = tp.tip || foot;
        g.tape = { p: 'M' + r1(p0.x) + ',' + r1(p0.y) + ' L' + r1(foot.x) + ',' + r1(foot.y) + ' L' + r1(tip.x) + ',' + r1(tip.y), d: 'inline' };
        let tk = '';
        for (let hh = 0; hh * this.S / 2 <= L * tp.t + 0.01; hh++) { // a tick every half cm
          const q = { x: p0.x + ux * hh * this.S / 2, y: p0.y + uy * hh * this.S / 2 }, len = hh % 2 ? 2.5 : 4.5;
          tk += 'M' + r1(q.x - nx * len) + ',' + r1(q.y - ny * len) + ' L' + r1(q.x + nx * len) + ',' + r1(q.y + ny * len) + ' ';
        }
        g.tapeTk = { p: tk || 'M0,0', d: 'inline' };
      } else {
        g.tape = { p: 'M0,0', d: 'none' }; g.tapeTk = { p: 'M0,0', d: 'none' };
      }
    }
    // leg extensions toward the point where the legs meet (screen 7)
    g.xA = seg(A, lerp(A, apex, s.ext.DA), task === 'extLegs' && s.ext.DA > 0);
    g.xB = seg(B, lerp(B, apex, s.ext.BC), task === 'extLegs' && s.ext.BC > 0);
    g.apex = { cx: r1(apex.x), cy: r1(apex.y), d: dsp(task === 'extLegs' && s.done) }; // round marker where the legs meet
    // screens 7-8: the glow being drawn along a side before its dotted extension
    const tr = s.trace, tm = tr && tr.mid ? lerp(tr.from, tr.to, 0.5) : null; // bases grow from the middle out
    g.trace = tr ? seg(tm ? lerp(tm, tr.from, tr.t) : tr.from, lerp(tm || tr.from, tr.to, tr.t), true, { cls: 'trace' + (tr.out ? ' out' : '') + (tr.leg ? ' leg' : '') }) : seg(D, D, false, { cls: 'trace' });
    // base extensions out to both board edges (drawn on screen 8, shown in full with baseExt)
    const be = (key, p, q) => {
      const t = f.baseExt ? 1 : (task === 'extBases' ? s.ext[key] : 0);
      return seg({ x: p.x - (p.x + 10) * t, y: p.y }, { x: q.x + (530 - q.x) * t, y: q.y }, t > 0);
    };
    g.xAB = be('AB', A, B);
    g.xCD = be('CD', D, C);
    // edges (NAVY is actually the outline's hot pink; PU is the purple)
    const NAVY = '#e8287a', PU = '#8e44d6';
    // swapCol (screens 8-9): the bases AB, DC take the purple and the legs AD, BC the pink
    const baseCol = () => (st.swapCol ? PU : NAVY);
    // the legs are purple from screen 5 (meet) onward
    const purpleFrom = this.steps().findIndex((x) => x.id === 'meet');
    const purple = purpleFrom >= 0 && s.step >= purpleFrom;
    const legCol = () => (st.swapCol ? NAVY : purple ? PU : NAVY);
    // emph: the side is being named by the voice; lit: it is highlighted
    const eCls = (k) => 'e' + k + (s.emph && s.emph[k] ? ' emph' : '') + (lit[k] ? ' lit' : '');
    // build (screen 1): the pen draws D -> A -> B -> C -> D, leaving each finished edge behind, and each corner
    // appears as the pen reaches it (s.build, from runBuild)
    const bd = st.build ? (s.build || { d: 0 }) : null, building = !!(bd && !bd.done);
    const bOrder = [['DA', D, A], ['AB', A, B], ['BC', B, C], ['CD', C, D]], bAt = {};
    { let acc = 0; bOrder.forEach((e) => { const L = this.dist(e[1], e[2]); bAt[e[0]] = { s: acc, L: L, p: e[1], q: e[2] }; acc += L; }); }
    const edgeOn = (k) => !building || bd.d >= bAt[k].s + bAt[k].L - 0.01;
    const vOn = (k) => !building || (k === 'D' ? bd.d > 0 : bd.d >= bAt[{ A: 'AB', B: 'BC', C: 'CD' }[k]].s - 0.01);
    if (building && bd.d > 0) {
      const cur = bOrder.map((e) => bAt[e[0]]).find((e) => bd.d < e.s + e.L) || bAt.CD;
      g.trace = seg(cur.p, lerp(cur.p, cur.q, Math.min(1, (bd.d - cur.s) / cur.L)), true, { cls: 'trace' });
    }
    g.ol = { d: dsp(!!(bd && bd.settle)) };
    g.eAB = seg(A, B, edgeOn('AB'), { c: baseCol('AB'), cls: eCls('AB') });
    g.eCD = seg(C, D, edgeOn('CD'), { c: baseCol('CD'), cls: eCls('CD') });
    g.eBC = seg(B, C, edgeOn('BC'), { c: legCol('BC'), cls: eCls('BC') });
    g.eDA = seg(D, A, edgeOn('DA'), { c: legCol('DA'), cls: eCls('DA') });
    // the "Base" / "Leg" callout (screens 14-15): a pill just outside each side's midpoint, joined to it by a
    // short tail. Bases: above AB and below CD. Legs: level, left of AD and right of BC.
    {
      const legs = s.callout === 'legs';
      const show = (s.callout === 'bases' && !s.tap.AB && !s.tap.CD) || (legs && !s.tap.DA && !s.tap.BC);
      const W = legs ? 64 : 78, H = 32, cx0 = (A.x + B.x + C.x + D.x) / 4, cy0 = (A.y + B.y + C.y + D.y) / 4;
      // dir 'v' points straight up or down (bases), 'h' straight left or right (legs)
      const pill = (p, q, dir) => {
        const vert = dir === 'v', horiz = dir === 'h';
        const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, L = this.dist(p, q) || 1;
        let nx = vert ? 0 : horiz ? (m.x < cx0 ? -1 : 1) : -(q.y - p.y) / L, ny = vert ? (m.y < cy0 ? -1 : 1) : horiz ? 0 : (q.x - p.x) / L;
        if (!vert && !horiz && nx * (m.x - cx0) + ny * (m.y - cy0) < 0) { nx = -nx; ny = -ny; }
        // the tail starts clear of the stroke and, on the bases, of the parallel arrows (about 12 px off the line)
        const ext = (W / 2) * Math.abs(nx) + (H / 2) * Math.abs(ny), dot = vert ? 17 : 10, gap = 12;
        const c = { x: m.x + nx * (dot + gap + ext), y: m.y + ny * (dot + gap + ext) };
        const d0 = { x: m.x + nx * dot, y: m.y + ny * dot }, e = { x: c.x - nx * ext, y: c.y - ny * ext };
        return { x: r1(c.x - W / 2), y: r1(c.y - H / 2), tx: r1(c.x), ty: r1(c.y + 6), dx: r1(d0.x), dy: r1(d0.y),
          stem: 'M' + r1(d0.x) + ',' + r1(d0.y) + ' L' + r1(e.x) + ',' + r1(e.y) };
      };
      g.cal = { d: dsp(show), cls: legs ? 'cal-legs' : 'cal-bases', tb: dsp(!legs), tl: dsp(legs), w: W,
        p1: legs ? pill(D, A, 'h') : pill(A, B, 'v'), p2: legs ? pill(B, C, 'h') : pill(D, C, 'v') };
    }
    // equal-leg ticks
    const ad = this.dist(A, D), bc = this.dist(B, C);
    const equal = Math.abs(ad - bc) < 0.5;
    const tick = (p, q) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, L = this.dist(p, q) || 1;
      const dx = (q.x - p.x) / L, dy = (q.y - p.y) / L, nx = -dy, ny = dx;
      let out = '';
      [-3, 3].forEach((k) => {
        const cx = mx + dx * k, cy = my + dy * k;
        out += 'M' + r1(cx - nx * 9) + ',' + r1(cy - ny * 9) + ' L' + r1(cx + nx * 9) + ',' + r1(cy + ny * 9) + ' ';
      });
      return out;
    };
    // okCheck sparkles, beside the right-hand side once the task is done
    { const ox = Math.min(540, Math.max(B.x, C.x) + 62), oy = Math.max(20, B.y - 34);
      g.okc = { tf: 'translate(' + r1(ox) + ' ' + r1(oy) + ')', d: dsp(!!st.okCheck && s.done && (!st.rightTap || !!s.rAll)) }; }
    g.tk = { p: tick(A, D) + tick(B, C), d: dsp(f.ticks || (task === 'dragA' && s.done && equal)) };
    // parallel chevrons
    const chev = (p, q) => {
      const x = (p.x + q.x) / 2, y = p.y;
      // drawn over a white halo (.chev-halo in index.html) so they read on any side colour
      return 'M' + r1(x - 10) + ',' + r1(y - 8) + ' L' + r1(x - 2) + ',' + r1(y) + ' L' + r1(x - 10) + ',' + r1(y + 8) +
        ' M' + r1(x) + ',' + r1(y - 8) + ' L' + r1(x + 8) + ',' + r1(y) + ' L' + r1(x) + ',' + r1(y + 8);
    };
    g.ch = { p: chev(A, B) + ' ' + chev(D, C), d: dsp(f.par) };
    // angles
    const V = this.vals(P);
    const arcSet = f.arcs || '';
    const unit = (p, q) => { const L = this.dist(p, q) || 1; return { x: (q.x - p.x) / L, y: (q.y - p.y) / L }; };
    const aTag = {}, em = s.emph || {}, r90 = []; // em: parts the voice-over is naming right now
    // After screen 23 the angles are already measured, so they just stay (no draw-in again). fa: the angles in
    // focus glow and the others dim (angFocus can move during a screen, as in sumSteps).
    const angIdx = this.steps().findIndex((x) => x.id === 'angles'), known = angIdx >= 0 && s.step > angIdx, fa = s.angFocus || f.focusAng;
    const livePair = s.dragging ? (s.dragging === 'A' || s.dragging === 'D' ? 'AD' : 'BC') : ''; // a corner changes the two angles on its leg
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const n = this.nb(k), Vk = P[k], u = unit(Vk, P[n[0]]), v = unit(Vk, P[n[1]]);
      const R = 24;
      const sx = Vk.x + u.x * R, sy = Vk.y + u.y * R, ex = Vk.x + v.x * R, ey = Vk.y + v.y * R;
      const cross = u.x * v.y - u.y * v.x;
      const show = arcSet.indexOf(k) >= 0;
      const isRight = Math.abs(this.angle(P, k) - 90) < 0.5;
      // when several angles light up together they draw in one after another
      const stag = (f.arcs || '').length > 1 ? ' d' + (f.arcs || '').indexOf(k) : '';
      const look = (known && (f.arcs || '').indexOf(k) >= 0 ? ' still' : '') + (fa ? (fa.indexOf(k) >= 0 ? ' glow' : ' dim') : '') +
        (st.explore && s.dragging && livePair.indexOf(k) >= 0 ? ' live' : ''); // explore: the dragged leg's two angles glow while they change
      // at exactly 90° the arc gives way to the square right-angle mark
      g['a' + k] = { p: 'M' + r1(sx) + ',' + r1(sy) + ' A' + R + ',' + R + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + r1(ex) + ',' + r1(ey), d: dsp(show && !isRight), cls: 'arc a' + k + stag + look + (em['a' + k] ? ' emph' : '') + (st.anglesIn ? ' pre' : ''), o: r1(Vk.x) + 'px ' + r1(Vk.y) + 'px' };
      // wedges (from screen 23 on): the angle filled in, out to the arc's outer edge so the arc is its rim. They follow
      // the arc's glow / dim and grow in from the corner when the angle comes into focus.
      const RW = R + 3.5, wsx = Vk.x + u.x * RW, wsy = Vk.y + u.y * RW, wex = Vk.x + v.x * RW, wey = Vk.y + v.y * RW;
      g['w' + k] = { p: 'M' + r1(Vk.x) + ',' + r1(Vk.y) + ' L' + r1(wsx) + ',' + r1(wsy) + ' A' + RW + ',' + RW + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + r1(wex) + ',' + r1(wey) + ' Z', d: dsp((known || !!st.anglesIn) && show && !isRight), cls: 'wedge w' + k + look + (st.anglesIn ? ' pre' : '') };
      // the square right-angle mark
      const q = 15;
      g['r' + k] = {
        p: 'M' + r1(Vk.x + u.x * q) + ',' + r1(Vk.y + u.y * q) + ' L' + r1(Vk.x + u.x * q + v.x * q) + ',' + r1(Vk.y + u.y * q + v.y * q) + ' L' + r1(Vk.x + v.x * q) + ',' + r1(Vk.y + v.y * q),
        d: dsp(isRight && (f.right || show))
      };

      const th = this.angle(P, k) * Math.PI / 180;
      // The value sits inside its corner on the angle's bisector, pushed out just far enough to clear the arc and
      // both sides. It is sized by the value even when the name shows (screen 31), so names sit where values were.
      const lbl = V[k] + '°', hw = (lbl.length * 9.5 + 12) / 2, hh = 11.5;
      const clearOf = (cx, cy) => {
        const sideGap = (w) => Math.abs((cx - Vk.x) * w.y - (cy - Vk.y) * w.x) - (hw * Math.abs(w.y) + hh * Math.abs(w.x));
        const near = Math.hypot(Math.max(0, Math.abs(cx - Vk.x) - hw), Math.max(0, Math.abs(cy - Vk.y) - hh));
        return sideGap(u) >= 5 && sideGap(v) >= 5 && near >= R + 5;
      };
      let bx0 = u.x + v.x, by0 = u.y + v.y; const bl0 = Math.hypot(bx0, by0) || 1; bx0 /= bl0; by0 /= bl0;
      let dl = R + 8; while (dl < 120 && !clearOf(Vk.x + bx0 * dl, Vk.y + by0 * dl)) dl += 2;
      let bx = u.x + v.x, by = u.y + v.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      if (st.right90 && isRight) r90.push({ t: '90°', x: r1(Vk.x + bx * 46), y: r1(Vk.y + by * 46), cls: 'alab r90 r90' + k });
      aTag[k] = { t: s.symAng ? '∠' + k : V[k] + '°', x: r1(Vk.x + bx * dl), y: r1(Vk.y + by * dl), cls: 'alab l' + k + stag + look + (show ? '' : ' off') + (em['a' + k] ? ' emph' : '') + (st.anglesIn ? ' pre' : '') };
    });
    // vertices: the dots and their touch targets
    const dk = this.dragKey();
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const anyV = this.anyCorner(), Vk = P[k], drag = dk === k || anyV;
      g['v' + k] = { x: r1(Vk.x), y: r1(Vk.y), r: vOn(k) ? (drag ? 11 : 7) + (em['v' + k] ? 4 : 0) : 0, c: drag ? PU : NAVY, w: drag ? 4 : 3 };
      const tapV = !!st.rightTap && (s.linesDone || !s.talking); // listen first; after that taps work even while she answers a wrong one
      const pulse = tapV && (k === 'A' || k === 'D');
      g['k' + k] = {
        x: r1(Vk.x), y: r1(Vk.y), d: dsp(tapV || drag), cls: pulse || (anyV && !s.dragging) ? 'vp' : '',
        cur: drag ? (s.dragging ? 'grabbing' : 'grab') : 'pointer',
        click: tapV ? () => this.rightTap(k) : noop,
        down: drag ? (e) => this.down(k, e) : noop
      };
    });
    // screen 20: a halo and a two-way arrow on A until the learner moves it
    if (dk) {
      // with the top side's length showing, the arrow sits left of the corner so both stay readable
      const Vk = P[dk], y0 = r1(Vk.y + (Vk.y < 280 ? -40 : 42)), x = r1(Vk.x - (dk === 'A' && f.sideLen ? 44 : 0));
      g.halo = { x: r1(Vk.x), y: r1(Vk.y), d: dsp(!s.dragging) };
      g.arw = {
        p: 'M' + (x - 26) + ',' + y0 + ' L' + (x + 26) + ',' + y0,
        h: 'M' + (x - 40) + ',' + y0 + ' L' + (x - 27) + ',' + (y0 - 7) + ' L' + (x - 27) + ',' + (y0 + 7) + ' Z M' + (x + 40) + ',' + y0 + ' L' + (x + 27) + ',' + (y0 - 7) + ' L' + (x + 27) + ',' + (y0 + 7) + ' Z',
        d: dsp(!s.moved && !s.dragging)
      };
    } else {
      g.halo = { x: 0, y: 0, d: 'none' };
      g.arw = { p: 'M0,0', h: 'M0,0', d: 'none' };
    }
    // labels: a fixed set of slots (hidden ones get "off") so each tag keeps its element and
    // only animates when it first appears
    const cx = (A.x + B.x + C.x + D.x) / 4, cy = (A.y + B.y + C.y + D.y) / 4;
    const tags = [];
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const Vk = P[k]; let dx = Vk.x - cx, dy = Vk.y - cy; const L = Math.hypot(dx, dy) || 1;
      // letterIn (screen 3): each corner letter stays hidden until the voice says it, then flies in from its corner
      const lin = st.letterIn ? ' vin c' + k : '';
      tags.push({ t: k, x: r1(Vk.x + dx / L * 25), y: r1(Vk.y + dy / L * 25), cls: 'vlab' + (vOn(k) ? '' : ' off') + (st.sideNums ? ' off' : '') + lin });
    });
    ['A', 'B', 'C', 'D'].forEach((k) => tags.push(aTag[k]));
    r90.forEach((x) => tags.push(x));
    // a tag beside a side, pushed out along the side's outward normal far enough that its box clears the line
    const side = (p, q, text, cls, show) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, L = this.dist(p, q) || 1;
      let nx = -(q.y - p.y) / L, ny = (q.x - p.x) / L;
      if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
      // hh: half the pill's height; the top and bottom sides get a wider gap to clear their parallel arrows
      const hw = (text.length * 9.6 + 32) / 2, hh = 18;
      const off = hw * Math.abs(nx) + hh * Math.abs(ny) + 14 + 8 * Math.abs(ny);
      // outside the shape first; if the board edge would push it back onto the side, tuck it inside instead
      const need = hw * Math.abs(nx) + hh * Math.abs(ny) + 4;
      const place = (sg) => {
        const x = Math.max(hw - 70, Math.min(516 - hw, mx + sg * nx * off)) /* the panel has room left of the board */, y = Math.max(18, Math.min(404, my + sg * ny * off));
        return { x: x, y: y, ok: Math.abs(nx * (x - mx) + ny * (y - my)) >= need };
      };
      let pos = place(1);
      if (!pos.ok) pos = place(-1);
      const x = pos.x, y = pos.y;
      return { t: text, x: r1(x), y: r1(y), cls: cls + (show ? '' : ' off') };
    };
    // The angle sums (f.sums) sit in a row below the shape, each under its own leg, since there is no room beside
    // the legs. They stay inside the panel and at least SUM_GAP apart, spreading out when the legs close in.
    {
      const on = !!f.sums;
      const tL = V.A + '° + ' + V.D + '° = 180°', tR = V.B + '° + ' + V.C + '° = 180°';
      const hw = (t) => (t.length * 9.6 + 32) / 2, wL = hw(tL), wR = hw(tR), SUM_GAP = 16;
      const lo = -110, hi = 560; // the panel's inner edges, in board x
      let xL = (A.x + D.x) / 2, xR = (B.x + C.x) / 2;
      const need = wL + wR + SUM_GAP;
      if (xR - xL < need) { const m = (xL + xR) / 2; xL = m - need / 2; xR = m + need / 2; }
      if (xL - wL < lo) { const d = lo - (xL - wL); xL += d; xR = Math.max(xR, xL + need); }
      if (xR + wR > hi) { const d = xR + wR - hi; xR -= d; xL = Math.min(xL, xR - need); }
      let yS = Math.max(D.y, C.y) + 62;
      // explore (screen 29): a fixed row centred in the panel; only the values change, and the dragged leg's box glows
      if (st.explore) { const mid = (lo + hi) / 2; xL = mid - 126; xR = mid + 126; yS = Math.max(D.y, C.y) + 72; } // clear of the D and C letters
      const fixCls = st.explore ? ' fixed' : '', liveL = st.explore && livePair === 'AD' ? ' live' : '', liveR = st.explore && livePair === 'BC' ? ' live' : '';
      tags.push({ t: tL, x: r1(xL), y: r1(yS), cls: 'mtag sum sumL' + fixCls + liveL + (on ? '' : ' off') }); // A + D: orange / yellow
      tags.push({ t: tR, x: r1(xR), y: r1(yS), cls: 'mtag sum sumR' + fixCls + liveR + (on ? '' : ' off') }); // B + C: purple / blue
    }
    // side lengths, outside each side (on screen 16 each shows once its side has been measured)
    const isM = st.id === 'measure';
    tags.push(side(D, A, this.cm(ad), 'mtag mDA', isM && !!s.tap.DA)); // values only, no side names
    tags.push(side(B, C, this.cm(bc), 'mtag mBC', isM && !!s.tap.BC));
    tags.push(side(A, B, this.cm(this.dist(A, B)), 'mtag mAB', isM && !!s.tap.AB));
    tags.push(side(D, C, this.cm(this.dist(D, C)), 'mtag mCD', isM && !!s.tap.CD));
    tags.push(side(D, A, this.cm(ad), 'mtag mleg mDA', !!f.legLen)); // mXX: each length label can be animated on its own
    tags.push(side(B, C, this.cm(bc), 'mtag mleg mBC', !!f.legLen));
    tags.push(side(A, B, this.cm(this.dist(A, B)), 'mtag mAB', !!f.sideLen));
    tags.push(side(D, C, this.cm(this.dist(D, C)), 'mtag mCD', !!f.sideLen));
    // sideNums (screen 2): the sides are numbered 1 top, 2 right, 3 bottom, 4 left; each number flies in from its side
    {
      const on = !!(st.sideNums || (st.letterIn && !s.numsGone)), gone = ''; // still shown on screen 3 while they fade out
      tags.push(side(A, B, '1', 'snum n1 from-top' + gone, on));
      tags.push(side(B, C, '2', 'snum n2 from-right' + gone, on));
      tags.push(side(D, C, '3', 'snum n3 from-bottom' + gone, on));
      tags.push(side(D, A, '4', 'snum n4 from-left' + gone, on));
    }
    return { g: g, tags: tags, V: V };
  }

  // the values index.html binds to
  renderVals() {
    const s = this.state, steps = this.steps(), st = this.cur();
    const isLesson = !st.cfu && !st.end && !st.noBoard;
    // a newline forces a break in the bubble; the break is not a word, so reveal timing is unchanged
    let wi = 0;
    const words = [];
    (s.line || '').split('\n').forEach((part, li) => {
      if (li) words.push({ t: '', cls: 'brk' });
      this.toWords(part).forEach((w) => { const i = wi++; words.push({ t: w, cls: i < s.reveal - 1 ? 'on' : (i === s.reveal - 1 ? (s.talking ? 'cur' : 'on') : '') }); });
    });
    const G = isLesson ? this.geo() : { g: {}, tags: [], V: {} };
    const chips = s.chips.slice();
    // answer buttons
    const mk = (o) => ({ id: o.id, t: o.t || o.id, cls: s.picks[o.id] || '', dis: !!s.picks[o.id] || s.done, pick: () => this.pick(o) });
    const c1 = {};
    if (st.cfu === 1) st.opts.forEach((o) => { c1[o.id] = mk(o); });
    // Screen-change fade class. Combined classes are built here because the template runtime drops a class
    // attribute that starts with a binding and holds two bindings ("{{a}} {{b}}").
    const fadeV = st.cfu || st.end ? (s.step % 2 ? 'fadeA' : 'fadeB') : 'fadeA';
    // qFocus / optsAfter: the answers stay hidden until qc is set
    const hasOpts = !!(st.opts && st.cfu !== 1) && (!(st.qFocus || st.optsAfter) || s.qc || s.done);
    const opts = hasOpts ? st.opts.map(mk) : [];
    // check 4: labels and drop slots
    const c4 = s.c4;
    const labs = this.labsDef().map((l) => {
      const p = this.labPos(l.id);
      const cls = (c4.locked[l.id] ? 'lock' : (c4.drag && c4.drag.id === l.id ? 'drag' : (c4.sel === l.id ? 'sel' : ''))) + (st.labelsAt && !s.labsIn ? ' pre' : '');
      return { id: l.id, t: l.t, x: Math.round(p.x), y: Math.round(p.y), cls: cls, down: (e) => this.labDown(l.id, e) };
    });
    const slots = this.slotsDef().map((q, i) => {
      const filled = Object.keys(c4.at).some((k) => c4.at[k] === q.id);
      const d = c4.drag, over = !filled && d && d.px > 840 - 20 && d.px < 840 + 284 + 20 && d.py > q.y - 20 && d.py < q.y + 64 + 20;
      // Empty slots brighten while a label is held or selected, and any empty slot lights up under a held
      // label (lighting only the right one would give the answer away).
      const okHere = Object.keys(c4.at).some((k) => c4.at[k] === q.id && c4.locked[k]);
      const cls = filled ? 'filled' + (okHere ? ' ok' : '') : over ? 'hot' : (c4.sel || d) ? 'ready' : 'empty';
      return { id: q.id, y: q.y, cls: cls, t: '', aria: 'Drop zone for shape ' + (i + 1), tap: () => this.slotTap(q.id) };
    });
    const isLastCfu = st.cfu === 5;
    // scene: the ice panel on the right, Swiftee and her bubble on the left; the measuring room, summary and
    // hero screens rearrange it in CSS
    const tf = (c) => 'translate(' + c.tx + 'px, ' + c.ty + 'px) scale(' + c.scale + ')';
    return {
      rootMove: (e) => this.rootMove(e),
      rootUp: (e) => this.rootUp(e),
      next: () => this.next(),
      back: () => this.back(),
      navNext: () => this.navNext(),
      screensLabel: 'Screen ' + (s.step + 1) + ' of ' + steps.length, // current position; tap to open the screen list
      navOpen: !!s.navOpen,
      toggleScreens: () => this.setState({ navOpen: !this.state.navOpen }),
      closeScreens: () => this.setState({ navOpen: false }),
      // screen list entries: number and first line (checks show "Check N"); the full line is the tooltip
      thumbs: steps.map((x, i) => ({
        n: i + 1,
        label: x.cfu ? 'Check ' + x.cfu : x.end ? 'Lesson complete' : (x.lines && x.lines[0] && x.lines[0].t ? x.lines[0].t.replace(/\n/g, ' ') : x.id),
        cls: i === s.step ? 'thumb cur' : 'thumb',
        title: 'Screen ' + (i + 1) + (x.lines && x.lines[0] && x.lines[0].t ? ': ' + x.lines[0].t.replace(/\n/g, ' ') : ''),
        go: () => this.jumpTo(i)
      })),
      navBack: () => this.back(),
      navBackDis: s.step === 0,
      navNextDis: s.step >= steps.length - 1 || (!!st.lockNext && !s.done), // lockNext: solve the screen first
      isLesson: isLesson && s.started,
      isCfu1: st.cfu === 1, isCfu2: st.cfu === 2, isCfu3: st.cfu === 3, isCfu4: st.cfu === 4, isCfu5: st.cfu === 5,
      isEnd: !!st.end,
      isRecap: st.layout === 'recap',
      g: G.g, tags: G.tags,
      words: words,
      // a line with its own breaks keeps exactly those lines: the bubble widens instead of wrapping again
      bubCls: s.bub + ((s.line || '').indexOf('\n') >= 0 ? ' manual' : ''),
      // lesson steps share one board, so it only fades in when it first appears; each check fades in fresh
      fadeCls: fadeV,
      birdCls: 'bird', // Swiftee's expressions are driven by pose() (js/swiftee.js), not by re-rendering
      // a pair equation (∠A + ∠D or ∠B + ∠C) gets the pair's straight-angle picture (CSS .eqpair-*)
      chips: chips.map((c) => ({ t: c.t, r: c.r || '', k: c.k + (c.t.length > 20 ? ' long' : '') + (/∠A|∠D/.test(c.t) ? ' eqpair-AD' : /∠B|∠C/.test(c.t) ? ' eqpair-BC' : '') })), // r: a result part animated on its own (screens 30-31)
      rootDown: () => this.rootDown(),
      showCover: !s.started || !!s.coverLeaving, coverCls: 'cover' + (s.coverLeaving ? ' leaving' : ''), coverGo: () => this.coverGo(),
      // explore (screen 29): Done pops in after the first real drag
      showDone: !!st.explore && !!s.explored, doneExplore: () => this.doneExplore(),
      wordSize: wi > 15 || (s.line || '').length > 80 ? 22 : 24, // long lines get the smaller size
      c1: c1, hasOpts: hasOpts, opts: opts,
      // qFocus: the shape centred in the panel with the answers in a row under it; otherwise the usual right column
      optTop: st.qFocus && s.qc ? CONFIG.qFocus.optTop : st.optTop || 376, optLeft: st.qFocus && s.qc ? CONFIG.qFocus.cx - CONFIG.qFocus.optW / 2 : CONFIG.scene.chipLeft + 8,
      optW: st.qFocus && s.qc ? CONFIG.qFocus.optW : 504, optCls: fadeV + (st.qFocus ? ' opts-in' : st.optsAfter ? ' opts-in quick' : '') + (st.softWrong ? ' soft-wrong' : ''),
      qx: CONFIG.qFocus.cx - 250, qy: s.qc ? CONFIG.qFocus.shapeTop : CONFIG.qFocus.shapeTop0, chipTop: st.chipTop || CONFIG.scene.chipTop, chipLeft: CONFIG.scene.chipLeft,
      celebrate: st.id === 'wellDone',
      labs: labs, slots: slots,
      showNav: s.started && !st.end,
      backDisabled: s.step === 0 || !!st.locked || !CONFIG.flow.showBack,
      backCls: st.locked || !CONFIG.flow.showBack ? 'auto' : '',
      nextDisabled: !s.done,
      nextCls: CONFIG.flow.showNext && st.autoAdvance == null ? (s.done && !s.talking ? 'ready' : '') : 'auto', // screens move on by themselves
      nextLabel: isLastCfu ? 'Finish' : 'Next',
      sceneCls: 'scene' + (st.noPanel ? ' nopanel' : '') + (st.hero ? ' hero' : '') + (st.hero && st.end ? ' endhero' : '') + (st.summary ? ' summary' : '') + (st.room === 'measure' ? ' measure-room' : ''), // hero (screen 43): Swiftee centre stage, no board
      boardTf: st.room === 'measure' ? tf(CONFIG.measureRoom) : 'translate(' + CONFIG.scene.boardX + 'px, ' + (st.boardShiftY || 0) + 'px)',
      boardCls: fadeV + (st.shapePre ? ' shape-pre' : '') + (st.parStrong ? ' par-strong' : '') + (st.lenPre ? ' len-pre' : '') + (st.tickPre ? ' tick-pre' : '') + (st.chevPre ? ' chev-pre' : '') + (st.legsSet ? ' legs-set' : '') + (st.right90 && st.r90Pre ? ' r90pre' : ''),
      // pulse: the shape and its labels zoom once about the shape's centre
      popO: s.P ? Math.round((s.P.A.x + s.P.B.x + s.P.C.x + s.P.D.x) / 4) + 'px ' + Math.round((s.P.A.y + s.P.B.y + s.P.C.y + s.P.D.y) / 4) + 'px' : 'center',
      swCls: s.swAway ? 'swiftee away' : 'swiftee',
      bubHide: !s.line || s.swAway ? 'gone' : (s.bubOff ? 'away' : ''),
      // hand: the fingertip lands on (x, y); drags travel (dx, dy). On checks ('opts') the answers pulse instead
      handOn: !!(s.hand && s.hand.kind !== 'opts'),
      hand: s.hand && s.hand.kind !== 'opts'
        ? { cls: 'hand-nudge ' + s.hand.kind + (s.hand.down ? ' down' : '') + (s.hand.once ? ' once' : ''), x: s.hand.x, y: s.hand.y, dx: s.hand.dx, dy: s.hand.dy }
        : { cls: 'hand-nudge', x: 0, y: 0, dx: 0, dy: 0 }
    };
  }
};
