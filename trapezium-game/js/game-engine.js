// =====================================================================
// GAME ENGINE — state, narration, geometry, interactions and rendering values.
// Loaded after js/vendor/dc-runtime.js (which provides DCLogic) and the data files.
// The markup in index.html binds to the values returned by renderVals().
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
      line: "Hi! Ready to explore a new shape with me?", reveal: 99, talking: false, bub: 'bubA', bird: '',
      muted: this.state ? this.state.muted : false, done: true,
      ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, ang: {}, chips: [], toast: null,
      moved: false, dragging: null, picks: {}, cfuFirst: true, results: {},
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false },
      ruler: this.rulerHome(), rulerDrag: false, hand: null
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
    const C = CONFIG.swiftee;
    if (window.SwifteeMascot) {
      this.sw = new window.SwifteeMascot({ base: C.base, idle: C.idle, minHoldMs: C.minHoldMs, find: () => document.querySelector('.swiftee') });
      // every expression the lesson can ask for, so reactions never wait on the network
      const want = [C.talk, C.waiting, C.praise, C.correct, C.wrong, C.nudge, C.done];
      LESSON.steps.forEach((st) => (st.lines || []).concat(st.after || []).forEach((L) => { if (L.m) want.push(L.m); }));
      this.sw.warm(want.filter((x, i) => want.indexOf(x) === i));
    }
    this.start();
  }
  componentWillUnmount() { this.clearT(); this.cancelSpeech(); if (this.sw) this.sw.destroy(); }

  // ---------- Swiftee ----------
  pose(state) { if (this.sw) this.sw.play(state); }
  // what Swiftee does when nobody is talking
  restPose() {
    const C = CONFIG.swiftee, st = this.cur();
    if (st.pose) return st.pose;
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
    const pref = [/Google UK English Female/i, /Samantha/i, /Aria/i, /Jenny/i, /Female/i, /en-IN/i, /en-GB/i, /en-US/i];
    let pick = null;
    for (const re of pref) { pick = en.find((v) => re.test(v.name) || re.test(v.lang)); if (pick) break; }
    this.voice = pick || en[0] || null;
  }
  speechOf(t) {
    return t
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
  sfx(kind) {
    if (this.state.muted || !this.actx) return;
    const ctx = this.actx;
    try {
      const now = ctx.currentTime;
      const N = {
        tap: [[700, 0, 0.07]], pop: [[520, 0, 0.07], [780, 0.06, 0.09]],
        good: [[660, 0, 0.12], [880, 0.1, 0.12], [1175, 0.2, 0.24]],
        snap: [[990, 0, 0.08], [1320, 0.07, 0.14]],
        bad: [[240, 0, 0.16], [190, 0.13, 0.22]]
      }[kind] || [];
      N.forEach((n) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = kind === 'bad' ? 'square' : 'triangle';
        o.frequency.value = n[0];
        const peak = kind === 'bad' ? 0.06 : 0.16;
        g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime(peak, now + n[1] + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + n[2]);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + n[1]); o.stop(now + n[1] + n[2] + 0.03);
      });
    } catch (e) {}
  }

  // ---------- narration ----------
  // One line of VO with a word-by-word reveal. Words follow speech boundary events when the
  // voice reports them; otherwise a paced timer drives them. `done` fires once both the reveal
  // and the speech have finished. A newer say() (or a step change) cancels this one.
  say(L, done) {
    if (!L || !L.t) { if (done) done(); return; }
    const text = L.t;
    const sp = L.s || this.speechOf(text);
    const words = this.toWords(text);
    const tok = ++this.narrTok, t0 = Date.now();
    this.curLine = L;
    this.cancelSpeech();
    this.setState({ line: text, reveal: 0, talking: true, bub: this.state.bub === 'bubA' ? 'bubB' : 'bubA' });
    this.pose(L.m || CONFIG.swiftee.talk);
    let i = 0, rDone = false, sDone = false, fin = false, bMode = false, spoke = false;
    const live = () => tok === this.narrTok;
    const finish = () => {
      if (!live() || fin || !rDone || !sDone) return;
      fin = true;
      this.setState({ talking: false, reveal: words.length });
      // Swiftee keeps the line's expression about as long as it takes to read it, even when no voice plays
      const readMs = Math.min(3500, 0.7 * words.reduce((t, w) => t + pace(w), 0));
      this.tm(() => { if (live()) this.pose(this.restPose()); }, Math.max(0, readMs - (Date.now() - t0)));
      this.tm(() => { if (live() && done) done(); }, 420);
    };
    const revealAll = () => { if (!live()) return; i = words.length; this.setState({ reveal: i }); rDone = true; };
    const pace = (w) => 170 + 48 * w.length + (/[.!?,…]$/.test(w) ? 160 : 0);
    const tick = () => {
      if (!live() || rDone) return;
      // in boundary mode the timer may only run one word ahead of the voice
      if (!bMode || i < this.bIdx + 1) {
        i = Math.min(words.length, i + 1);
        this.setState({ reveal: i });
      }
      if (i >= words.length) { rDone = true; finish(); return; }
      this.tm(tick, pace(words[i - 1] || ''));
    };
    this.bIdx = 0;
    const s = this.synth();
    const canSpeak = !this.state.muted && s && typeof SpeechSynthesisUtterance !== 'undefined';
    if (!canSpeak) { sDone = true; this.tm(tick, 140); return; }
    const est = words.reduce((t, w) => t + pace(w), 0);
    try {
      const u = new SpeechSynthesisUtterance(sp);
      if (this.voice) u.voice = this.voice;
      u.lang = (this.voice && this.voice.lang) || 'en-GB';
      u.rate = 0.95; u.pitch = 1.25;
      const end = () => { if (!live() || sDone) return; sDone = true; revealAll(); finish(); };
      u.onstart = () => { spoke = true; };
      u.onend = end; u.onerror = end;
      u.onboundary = (ev) => {
        if (!live() || (ev.name && ev.name !== 'word')) return;
        bMode = true;
        const k = Math.min(words.length, Math.floor(((ev.charIndex || 0) / Math.max(1, sp.length)) * words.length) + 1);
        this.bIdx = k;
        if (k > i) { i = k; this.setState({ reveal: i }); if (i >= words.length) { rDone = true; finish(); } }
      };
      // Chrome can drop an utterance queued in the same tick as cancel(); give it a beat.
      this.tm(() => { if (live()) { try { s.speak(u); } catch (e) { end(); } } }, 60);
      this.tm(tick, 160);
      // watchdog: voices that never fire onend, or never start at all
      const watch = () => {
        if (!live() || sDone) return;
        let busy = true;
        try { busy = s.speaking || s.pending; } catch (e) { busy = false; }
        if (!busy && (spoke || rDone)) { end(); return; }
        this.tm(watch, 300);
      };
      this.tm(watch, 900);
      this.tm(() => { if (live() && !sDone) end(); }, est * 1.8 + 2500);
    } catch (e) { sDone = true; this.tm(tick, 140); }
  }
  // Step narration queue. Interjections (feedback, idle hints, replay) play over it and then
  // the queue carries on with its next line, so a step's later lines and chips are never lost.
  // keep a number and its unit, and short equations, on one line ("5 cm", "AB = 6 cm" never split)
  toWords(t) { return t.replace(/(\d) (cm)\b/g, '$1\u00a0$2').replace(/ ([=+\u2212]) /g, '\u00a0$1\u00a0').split(/[ \t\n]+/).filter(Boolean); }
  playLines(lines, done) {
    this.q = { lines: lines || [], i: 0, done: done, tok: this.stepTok };
    this.qNext();
  }
  qNext() {
    const q = this.q;
    if (!q || q.tok !== this.stepTok) return;
    if (q.i >= q.lines.length) { this.q = null; if (q.done) q.done(); this.armIdle(); return; }
    const L = q.lines[q.i++];
    if (L.chips) this.addChips(L.chips);
    this.say(L, () => this.qNext());
  }
  interject(L) {
    const tok = this.stepTok;
    this.say(L, () => { if (tok !== this.stepTok) return; if (this.q) this.qNext(); else this.armIdle(); });
  }
  addChips(cs) {
    const have = this.state.chips.map((c) => c.t);
    this.setState({ chips: this.state.chips.concat(cs.filter((c) => have.indexOf(c.t) < 0)) });
  }
  replay() {
    if (!this.state.started || !this.curLine) return;
    this.poke();
    this.interject(this.curLine);
  }
  toggleMute() {
    const m = !this.state.muted;
    this.setState({ muted: m });
    if (m) this.cancelSpeech();
  }

  // ---------- idle hints ----------
  needsInput() {
    const st = this.cur();
    return this.state.started && !this.state.done && !!(st.task || st.cfu);
  }
  armIdle() {
    this.armHand();
    if (this.idleId) { clearTimeout(this.idleId); this.T.delete(this.idleId); this.idleId = null; }
    if (!this.needsInput()) return;
    const tok = this.stepTok;
    this.idleId = this.tm(() => {
      this.idleId = null;
      if (tok !== this.stepTok || !this.needsInput()) return;
      if (this.drag || this.ld || this.rulerBusy || this.state.talking) { this.armIdle(); return; }
      if ((this.idleCount || 0) >= CONFIG.timing.idleMaxHints) return;
      this.idleCount = (this.idleCount || 0) + 1;
      const st = this.cur();
      this.interject({ m: CONFIG.swiftee.nudge, t: st.idle || (st.hint + '.') });
    }, CONFIG.timing.idleMs);
  }
  poke() { this.idleCount = 0; this.hideHand(); this.armIdle(); }

  // ---------- hand nudge ----------
  // After CONFIG.hand.idleMs with no touch while a tap or drag is expected, a hand shows exactly where
  // (and, for drags, which way). Any touch hides it and restarts the wait. On checks it never points at an
  // answer: the open options pulse together instead.
  handTarget() {
    const st = this.cur(), s = this.state, P = s.P;
    if (!s.started || st.end) return null;
    if (!s.done) {
      const first = (ks, skip) => ks.find((k) => !skip(k));
      const t = st.task;
      let k;
      if (t === 'extLegs') k = first(['DA', 'BC'], (x) => s.ext[x] > 0);
      if (t === 'extBases') k = first(['AB', 'CD'], (x) => s.ext[x] > 0);
      if (t === 'tapBases') k = first(['AB', 'CD'], (x) => s.tap[x]);
      if (t === 'tapLegs' || t === 'measure') k = first(['DA', 'BC'], (x) => s.tap[x]);
      if (k) return { qa: 'edge-' + k, kind: 'tap' };
      if (t === 'tapAngles') k = first(['A', 'B', 'C', 'D'], (x) => s.ang[x]);
      if (t === 'tapAD') k = first(['A', 'D'], (x) => s.ang[x]);
      if (k) return { qa: 'vtx-' + k, kind: 'tap' };
      // drags: slide toward the goal (equal legs, a right angle) or, when any change will do, inward
      const clamp = (v) => (Math.abs(v) < 12 ? 0 : Math.max(-70, Math.min(70, v)));
      if (t === 'dragB') return { qa: 'vtx-B', kind: 'drag', dx: clamp(P.C.x - (P.A.x - P.D.x) - P.B.x) || 60, dy: 0 };
      if (t === 'dragD90') return { qa: 'vtx-D', kind: 'drag', dx: clamp(P.A.x - P.D.x) || 60, dy: 0 };
      if (t === 'dragD') return { qa: 'vtx-D', kind: 'drag', dx: 60, dy: 0 };
      if (t === 'dragC') return { qa: 'vtx-C', kind: 'drag', dx: -60, dy: 0 };
      if (st.cfu === 4) {
        const c4 = s.c4, lab = this.labsDef().find((l) => !c4.locked[l.id] && !c4.at[l.id]);
        // press the label only: sliding it anywhere would hint at an answer
        return lab ? { qa: 'lab-' + lab.id, kind: 'tap' } : null;
      }
      if (st.cfu) return { kind: 'opts' };
      return null;
    }
    if (this.state.step < this.steps().length - 1) return { qa: 'next', kind: 'tap' };
    return null;
  }
  hideHand() { if (this.state.hand) this.setState({ hand: null }); }
  armHand() {
    if (this.state.hand) return; // already showing: only a touch (poke) or its own timer takes it down
    if (this.handId) { clearTimeout(this.handId); this.T.delete(this.handId); this.handId = null; }
    if (!this.handTarget() || (this.handShown || 0) >= CONFIG.hand.maxShows) return;
    const tok = this.stepTok;
    this.handId = this.tm(() => {
      this.handId = null;
      if (tok !== this.stepTok) return;
      // wait for Swiftee to finish and for hands to be off the board
      if (this.state.talking || this.drag || this.ld || this.rd || this.rulerBusy || this.state.c4.checking) { this.armHand(); return; }
      const T = this.handTarget();
      if (!T) return;
      let hand = { kind: T.kind, x: 0, y: 0, dx: T.dx || 0, dy: T.dy || 0, n: (this.handShown || 0) };
      if (T.qa) {
        if (typeof document === 'undefined') return;
        const el = document.querySelector('[data-qa="' + T.qa + '"]'), stage = document.querySelector('.stage');
        if (!el || !stage) return;
        const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), sc = sr.width / 1280 || 1;
        if (!r.width && !r.height) return;
        hand.x = Math.round((r.left + r.width / 2 - sr.left) / sc);
        hand.y = Math.round((r.top + r.height / 2 - sr.top) / sc);
        // near the bottom edge the hand would run off the stage: point down onto the target's top instead
        if (hand.y + 75 > 715) { hand.down = true; hand.y = Math.round((r.top - sr.top) / sc) + 8; }
      }
      this.handShown = (this.handShown || 0) + 1;
      this.setState({ hand: hand });
      // a few presses, then step back; it returns only if the learner is still idle
      this.handId = this.tm(() => { this.handId = null; if (tok === this.stepTok) { this.setState({ hand: null }, () => this.armHand()); } }, CONFIG.hand.showMs);
    }, CONFIG.hand.idleMs);
  }
  // Browsers only allow audio after a user gesture, so the first tap unlocks it.
  rootDown() { this.unlockAudio(); if (this.state.started) this.poke(); }
  unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.actx) this.actx = new AC();
      if (this.actx && this.actx.state === 'suspended') this.actx.resume();
    } catch (e) {}
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
  restart() { this.navAt = 0; this.start(); }
  clone(P) { return JSON.parse(JSON.stringify(P)); }
  goTo(i, fwd) {
    const st = this.steps()[i];
    if (!st) return;
    this.clearT();
    this.idleId = null; this.idleCount = 0; this.handId = null; this.handShown = 0;
    this.stepTok++; this.narrTok++;
    this.q = null;
    this.cancelSpeech();
    this.drag = null; this.ld = null; this.rd = null; this.rulerBusy = false; this.rulerLeg = null; this.pendingLeg = null; this.navAt = Date.now();
    let P;
    if (fwd || !this.snaps[i]) { P = this.clone(this.state.P); this.snaps[i] = this.clone(P); }
    else P = this.clone(this.snaps[i]);
    this.setState({
      step: i, P: P, done: !st.task && !st.cfu, ext: { DA: 0, BC: 0, AB: 0, CD: 0 }, tap: {}, ang: {}, chips: [], toast: null,
      moved: false, dragging: null, picks: {}, cfuFirst: true, bird: '', hand: null, line: '', reveal: 0, ruler: this.rulerHome(), rulerDrag: false,
      c4: { at: { iso: null, right: null, scal: null }, locked: {}, sel: null, drag: null, checking: false }
    });
    if (this.sw) this.sw.setFlip(st.layout === 'spotlight'); // on the right, Swiftee faces left toward the shape
    this.pose(this.restPose());
    this.playLines(st.lines, () => {});
  }
  navLocked() { return Date.now() - (this.navAt || 0) < CONFIG.timing.navLockMs; }
  next() {
    if (!this.state.done || this.navLocked()) return;
    if (this.state.step < this.steps().length - 1) { this.sfx('tap'); this.goTo(this.state.step + 1, true); }
  }
  back() {
    if (this.state.step <= 0 || this.navLocked()) return;
    this.sfx('tap'); this.goTo(this.state.step - 1, false);
  }
  finishTask() {
    if (this.state.done) return;
    this.setState({ done: true, toast: null });
    this.armIdle();
    this.sfx('good');
    this.cheer();
    const st = this.cur();
    const tok = this.stepTok, i = this.state.step;
    const go = () => { if (tok === this.stepTok && st.autoNext) this.goTo(i + 1, true); };
    if (st.after) this.playLines(st.after, () => this.tm(go, 250));
    else if (st.autoNext) this.tm(go, CONFIG.timing.autoNextMs);
  }
  cheer() { this.react(CONFIG.swiftee.praise); }
  oops(text) {
    this.sfx('bad');
    this.setState({ toast: text });
    this.interject({ m: CONFIG.swiftee.wrong, t: text });
    const tok = this.stepTok;
    if (this.toastId) { clearTimeout(this.toastId); this.T.delete(this.toastId); }
    this.toastId = this.tm(() => { if (tok === this.stepTok) this.setState({ toast: null }); }, 4200);
  }

  // ---------- ruler ----------
  rulerHome() { return Object.assign({}, CONFIG.ruler.home); }
  rulerTarget(leg) {
    const P = this.state.P;
    const p = leg === 'DA' ? P.D : P.B, q = leg === 'DA' ? P.A : P.C;
    const cx = (P.A.x + P.B.x + P.C.x + P.D.x) / 4, cy = (P.A.y + P.B.y + P.C.y + P.D.y) / 4;
    let th = Math.atan2(q.y - p.y, q.x - p.x);
    let o = p;
    const nx = -Math.sin(th), ny = Math.cos(th);
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    if (nx * (mx - cx) + ny * (my - cy) < 0) { th += Math.PI; o = q; }
    return { x: o.x, y: o.y, a: th * 180 / Math.PI };
  }
  rulerCenter(R) {
    const t = R.a * Math.PI / 180;
    return { x: R.x + Math.cos(t) * 160 - Math.sin(t) * 13, y: R.y + Math.sin(t) * 160 + Math.cos(t) * 13 };
  }
  animRuler(to, dur, then) {
    const tok = this.stepTok, from = Object.assign({}, this.state.ruler), t0 = Date.now();
    let da = to.a - from.a; while (da > 180) da -= 360; while (da < -180) da += 360;
    const f = () => {
      if (tok !== this.stepTok) return;
      const t = Math.min(1, (Date.now() - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.setState({ ruler: { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, a: from.a + da * e } });
      if (t < 1) this.tm(f, 16); else if (then) then();
    };
    f();
  }
  measureLeg(leg) {
    const s = this.state;
    if (s.done || s.tap[leg]) return;
    if (this.rulerBusy) { if (this.rulerLeg !== leg) this.pendingLeg = leg; return; }
    this.rulerBusy = true; this.rulerLeg = leg; this.pendingLeg = null;
    this.sfx('tap');
    this.animRuler(this.rulerTarget(leg), CONFIG.ruler.flyMs, () => {
      const tap = Object.assign({}, this.state.tap); tap[leg] = true;
      this.setState({ tap: tap, toast: null });
      this.sfx('pop');
      if (tap.DA && tap.BC) this.tm(() => this.finishTask(), 350);
      // hold on the leg so the reading is seen, then go straight to a queued leg or back home
      this.tm(() => {
        const nx = this.pendingLeg; this.pendingLeg = null;
        if (nx && !this.state.tap[nx]) { this.rulerBusy = false; this.rulerLeg = null; this.measureLeg(nx); return; }
        this.animRuler(this.rulerHome(), CONFIG.ruler.returnMs, () => {
          this.rulerBusy = false; this.rulerLeg = null;
          const later = this.pendingLeg; this.pendingLeg = null;
          if (later && !this.state.tap[later]) this.measureLeg(later);
        });
      }, this.pendingLeg ? CONFIG.ruler.returnMs : CONFIG.ruler.holdMs);
    });
  }

  rulerDown(e) {
    if (this.cur().task !== 'measure' || this.state.done || this.rulerBusy) return;
    const svg = e.currentTarget && e.currentTarget.ownerSVGElement;
    const p = svg && this.toSvg(svg, e);
    if (!p) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
    const R = this.state.ruler;
    this.rd = { svg: svg, ox: p.x - R.x, oy: p.y - R.y, sx: p.x, sy: p.y, moved: false };
    this.setState({ rulerDrag: true });
  }

  // ---------- geometry ----------
  dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
  nb(k) { return { A: ['D', 'B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C', 'A'] }[k]; }
  angle(P, k) {
    const n = this.nb(k), V = P[k], p = P[n[0]], q = P[n[1]];
    const ux = p.x - V.x, uy = p.y - V.y, vx = q.x - V.x, vy = q.y - V.y;
    const c = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  vals(P) {
    const a = Math.round(this.angle(P, 'A')), b = Math.round(this.angle(P, 'B'));
    return { A: a, D: 180 - a, B: b, C: 180 - b };
  }
  cm(px) {
    const v = Math.round((px / this.S) * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + ' cm';
  }
  inter(A, D, B, C) {
    const x1 = A.x, y1 = A.y, x2 = D.x, y2 = D.y, x3 = B.x, y3 = B.y, x4 = C.x, y4 = C.y;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  toSvg(svg, e) {
    try {
      const m = svg.getScreenCTM();
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(m.inverse());
    } catch (err) { return null; }
  }
  dragKey() {
    const st = this.cur(), s = this.state;
    if (st.task === 'dragB' && !s.done) return 'B';
    if (st.task === 'dragD90' && !s.done) return 'D';
    if (st.task === 'dragD') return 'D';
    if (st.task === 'dragC') return 'C';
    return null;
  }
  anim(key, then) {
    const tok = this.stepTok, t0 = Date.now(), dur = 850;
    const f = () => {
      if (tok !== this.stepTok) return;
      const t = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const ext = Object.assign({}, this.state.ext); ext[key] = Math.max(e, 0.001);
      this.setState({ ext: ext });
      if (t < 1) this.tm(f, 16); else if (then) then();
    };
    f();
  }

  // ---------- lesson interactions ----------
  tapEdge(edge) {
    const st = this.cur(), s = this.state;
    if (s.done) return;
    const isLeg = edge === 'DA' || edge === 'BC';
    if (st.task === 'extLegs') {
      if (!isLeg) return this.oops('Try a slanted side. Those are the ones that look like they will meet.');
      if (s.ext[edge] > 0) return;
      this.sfx('tap');
      this.anim(edge, () => {
        if (this.state.ext.DA >= 1 && this.state.ext.BC >= 1) { this.sfx('snap'); this.finishTask(); }
      });
    } else if (st.task === 'extBases') {
      if (isLeg) return this.oops('That one is slanted. Tap the top side or the bottom side.');
      if (s.ext[edge] > 0) return;
      this.sfx('tap');
      this.anim(edge, () => { if (this.state.ext.AB >= 1 && this.state.ext.CD >= 1) this.finishTask(); });
    } else if (st.task === 'measure') {
      if (!isLeg) return this.oops('Measure the legs. They are the slanted sides.');
      this.measureLeg(edge);
    } else if (st.task === 'tapBases' || st.task === 'tapLegs') {
      const wantLeg = st.task !== 'tapBases';
      if (isLeg !== wantLeg) {
        if (st.task === 'tapBases') return this.oops("That's a slanted side. Find the two sides that are parallel.");
        if (st.task === 'tapLegs') return this.oops("That's a base. The legs are the slanted sides.");
      }
      if (s.tap[edge]) return;
      const tap = Object.assign({}, s.tap); tap[edge] = true;
      this.setState({ tap: tap, toast: null });
      this.sfx('pop');
      const pair = wantLeg ? ['DA', 'BC'] : ['AB', 'CD'];
      if (tap[pair[0]] && tap[pair[1]]) this.tm(() => this.finishTask(), 250);
    }
  }
  tapVertex(k) {
    const st = this.cur(), s = this.state;
    if (s.done) return;
    if (st.task === 'tapAngles') {
      if (s.ang[k]) return;
      const ang = Object.assign({}, s.ang); ang[k] = true;
      this.setState({ ang: ang });
      this.sfx('pop');
      if (ang.A && ang.B && ang.C && ang.D) this.tm(() => this.finishTask(), 300);
    } else if (st.task === 'tapAD') {
      if (k !== 'A' && k !== 'D') return this.oops('Tap the angles at A and D. They sit on the same leg.');
      if (s.ang[k]) return;
      const ang = Object.assign({}, s.ang); ang[k] = true;
      this.setState({ ang: ang, toast: null });
      this.sfx('pop');
      if (ang.A && ang.D) this.tm(() => this.finishTask(), 250);
    }
  }
  down(k, e) {
    if (this.dragKey() !== k) return;
    const svg = e.currentTarget && e.currentTarget.ownerSVGElement;
    if (!svg) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.preventDefault) e.preventDefault();
    this.drag = { k: k, svg: svg, x0: this.state.P[k].x };
    this.setState({ dragging: k });
    this.sfx('tap');
  }
  move(e) {
    if (this.rd) return this.rulerMove(e);
    if (!this.drag) return;
    const p = this.toSvg(this.drag.svg, e);
    if (!p) return;
    const P = this.clone(this.state.P), k = this.drag.k;
    let x = p.x;
    // bases stay parallel (only x moves); the limits stop the shape crossing itself or going unreadably thin
    const Lm = CONFIG.limits, SL = Lm.maxLegRun;
    if (k === 'B') x = Math.max(P.A.x + Lm.minTop, P.C.x - SL, Math.min(P.C.x, x));
    if (k === 'D') x = Math.max(Lm.minX, P.A.x - SL, Math.min(P.C.x - Lm.minBottom, P.A.x + SL, x));
    if (k === 'C') x = Math.max(P.D.x + Lm.minBottom, P.B.x - SL, Math.min(Lm.maxX, P.B.x + SL, x));
    P[k].x = x;
    this.setState({ P: P, moved: this.state.moved || Math.abs(x - this.drag.x0) > 25 });
  }
  rulerMove(e) {
    const R = this.rd, p = this.toSvg(R.svg, e);
    if (!p) return;
    if (!R.moved && Math.hypot(p.x - R.sx, p.y - R.sy) < 5) return;
    R.moved = true;
    const x = Math.max(-200, Math.min(500, p.x - R.ox)), y = Math.max(-40, Math.min(420, p.y - R.oy));
    this.setState({ ruler: Object.assign({}, this.state.ruler, { x: x, y: y }) });
  }
  rulerUp() {
    const R = this.rd;
    this.rd = null;
    this.setState({ rulerDrag: false });
    if (!R.moved) { this.interject({ t: 'Drag the ruler onto one of the slanted sides.' }); return; }
    const c = this.rulerCenter(this.state.ruler), P = this.state.P;
    const legs = [['DA', P.D, P.A], ['BC', P.B, P.C]].filter((l) => !this.state.tap[l[0]])
      .map((l) => ({ k: l[0], d: Math.hypot(c.x - (l[1].x + l[2].x) / 2, c.y - (l[1].y + l[2].y) / 2) }))
      .sort((a, b) => a.d - b.d);
    if (legs.length && legs[0].d < 110) this.measureLeg(legs[0].k);
    else { this.rulerBusy = true; this.animRuler(this.rulerHome(), 350, () => { this.rulerBusy = false; }); }
  }
  up() {
    if (this.rd) return this.rulerUp();
    if (!this.drag) return;
    const k = this.drag.k;
    this.drag = null;
    this.setState({ dragging: null });
    this.checkDrag(k);
  }
  checkDrag(k) {
    const st = this.cur(), s = this.state, P = this.clone(s.P);
    if (st.task === 'dragB' && !s.done) {
      const ad = this.dist(P.A, P.D), bc = this.dist(P.B, P.C);
      if (Math.abs(ad - bc) < CONFIG.snap.equalLegsCm * this.S) {
        P.B.x = P.C.x - (P.A.x - P.D.x);
        this.setState({ P: P });
        this.sfx('snap');
        this.finishTask();
      } else if (s.moved) {
        this.interject({ t: bc > ad ? 'BC is still longer than AD. Keep dragging B.' : 'Now BC is shorter than AD. Drag B back a little.' });
      }
    } else if (st.task === 'dragD90' && !s.done) {
      const a = this.angle(P, 'A');
      if (Math.abs(a - 90) < CONFIG.snap.rightAngleDeg) {
        P.D.x = P.A.x;
        this.setState({ P: P });
        this.sfx('snap');
        this.finishTask();
      } else if (s.moved) {
        this.interject({ t: '∠A is ' + Math.round(a) + '° now. ' + (a > 90 ? 'Keep dragging D to the right.' : 'Drag D back to the left a little.') });
      }
    } else if ((st.task === 'dragD' || st.task === 'dragC') && !s.done && s.moved) {
      this.finishTask();
    }
  }

  // ---------- CFU ----------
  pick(o) {
    const st = this.cur(), s = this.state;
    if (s.done || s.picks[o.id]) return;
    const picks = Object.assign({}, s.picks);
    if (o.ok) {
      picks[o.id] = 'good';
      const results = Object.assign({}, s.results);
      if (results[st.id] === undefined) results[st.id] = s.cfuFirst;
      this.setState({ picks: picks, done: true, results: results });
      this.sfx('good'); this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      picks[o.id] = 'bad';
      this.setState({ picks: picks, cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: o.fb });
      this.poke();
    }
  }
  labPos(id) {
    const c4 = this.state.c4;
    if (c4.drag && c4.drag.id === id) return { x: c4.drag.x, y: c4.drag.y };
    if (c4.at[id]) { const sl = this.slotsDef().find((q) => q.id === c4.at[id]); return { x: 868 + 62, y: sl.y + 7 }; }
    const i = this.labsDef().findIndex((l) => l.id === id);
    return { x: 652 + i * 172, y: 450 };
  }
  labDown(id, e) {
    const c4 = this.state.c4;
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
  rootMove(e) {
    if (this.drag || this.rd) return this.move(e);
    const L = this.ld;
    if (!L) return;
    if (!L.moved && Math.hypot(e.clientX - L.sx, e.clientY - L.sy) < 6) return;
    L.moved = true;
    const px = (e.clientX - L.r.left) / L.sc, py = (e.clientY - L.r.top) / L.sc;
    this.setState({ c4: Object.assign({}, this.state.c4, { drag: { id: L.id, x: px - L.ox, y: py - L.oy }, sel: null }) });
  }
  rootUp(e) {
    if (this.drag || this.rd) return this.up(e);
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
    const slot = this.slotsDef().find((q) => px > 868 - 20 && px < 868 + 284 + 20 && py > q.y - 20 && py < q.y + 64 + 20);
    if (slot && !c4.checking) this.place(L.id, slot.id, c4);
    else { const at = Object.assign({}, c4.at); at[L.id] = null; this.setState({ c4: Object.assign(c4, { at: at }) }); }
  }
  slotTap(slotId) {
    const c4 = this.state.c4;
    if (!c4.sel || c4.checking || this.state.done) return;
    this.place(c4.sel, slotId, Object.assign({}, c4));
  }
  place(labId, slotId, c4) {
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
      this.sfx('good'); this.cheer();
      this.interject({ m: CONFIG.swiftee.correct, t: st.ok });
    } else {
      this.setState({ cfuFirst: false });
      this.sfx('bad');
      this.interject({ m: CONFIG.swiftee.wrong, t: 'Some labels went back. Look for the marks: equal legs, right angles, or neither.' });
      this.poke();
    }
  }

  // ---------- render ----------
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
    g.move = (e) => this.move(e);
    g.up = (e) => this.up(e);
    g.poly = [A, B, C, D].map((p) => r1(p.x) + ',' + r1(p.y)).join(' ');
    g.dA = seg(A, lerp(A, apex, 0.6), !!f.legHint);
    g.dB = seg(B, lerp(B, apex, 0.6), !!f.legHint);
    const met = !!f.met;
    g.xA = seg(A, lerp(A, apex, met ? 1 : s.ext.DA), (task === 'extLegs' && s.ext.DA > 0) || met);
    g.xB = seg(B, lerp(B, apex, met ? 1 : s.ext.BC), (task === 'extLegs' && s.ext.BC > 0) || met);
    g.apex = { x: r1(apex.x - 6.5), y: r1(apex.y - 6.5), d: dsp((task === 'extLegs' && s.done) || met) };
    const be = (key, p, q) => {
      const t = f.baseExt ? 1 : (task === 'extBases' ? s.ext[key] : 0);
      return seg({ x: p.x - (p.x + 10) * t, y: p.y }, { x: q.x + (530 - q.x) * t, y: q.y }, t > 0);
    };
    g.xAB = be('AB', A, B);
    g.xCD = be('CD', D, C);
    // edges
    const NAVY = '#17375e', OR = '#f08a24', PU = '#8e44d6';
    const baseCol = (k) => (st.id === 'bases' && s.tap[k] ? OR : NAVY);
    const legCol = (k) => ((st.id === 'legs' && s.tap[k]) || f.legsPurple ? PU : NAVY);
    g.eAB = seg(A, B, true, { c: baseCol('AB') });
    g.eCD = seg(C, D, true, { c: baseCol('CD') });
    g.eBC = seg(B, C, true, { c: legCol('BC') });
    g.eDA = seg(D, A, true, { c: legCol('DA') });
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
    g.tk = { p: tick(A, D) + tick(B, C), d: dsp(f.ticks || (task === 'dragB' && s.done && equal)) };
    // parallel chevrons
    const chev = (p, q) => {
      const x = (p.x + q.x) / 2, y = p.y;
      return 'M' + r1(x - 8) + ',' + r1(y - 6) + ' L' + r1(x - 2) + ',' + r1(y) + ' L' + r1(x - 8) + ',' + r1(y + 6) +
        ' M' + r1(x) + ',' + r1(y - 6) + ' L' + r1(x + 6) + ',' + r1(y) + ' L' + r1(x) + ',' + r1(y + 6);
    };
    g.ch = { p: chev(A, B) + ' ' + chev(D, C), d: dsp(f.par) };
    // angles
    const V = this.vals(P);
    const arcSet = (f.arcs || '') + (task === 'tapAngles' || task === 'tapAD' ? Object.keys(s.ang).join('') : '');
    const unit = (p, q) => { const L = this.dist(p, q) || 1; return { x: (q.x - p.x) / L, y: (q.y - p.y) / L }; };
    const aTag = {};
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const n = this.nb(k), Vk = P[k], u = unit(Vk, P[n[0]]), v = unit(Vk, P[n[1]]);
      const R = 24;
      const sx = Vk.x + u.x * R, sy = Vk.y + u.y * R, ex = Vk.x + v.x * R, ey = Vk.y + v.y * R;
      const cross = u.x * v.y - u.y * v.x;
      const show = arcSet.indexOf(k) >= 0;
      const isRight = Math.abs(this.angle(P, k) - 90) < 0.5;
      // when several angles light up together they draw in one after another
      const stag = (f.arcs || '').length > 1 ? ' d' + (f.arcs || '').indexOf(k) : '';
      g['a' + k] = { p: 'M' + r1(sx) + ',' + r1(sy) + ' A' + R + ',' + R + ' 0 0 ' + (cross > 0 ? 1 : 0) + ' ' + r1(ex) + ',' + r1(ey), d: dsp(show), cls: 'arc' + stag };
      const q = 15;
      g['r' + k] = {
        p: 'M' + r1(Vk.x + u.x * q) + ',' + r1(Vk.y + u.y * q) + ' L' + r1(Vk.x + u.x * q + v.x * q) + ',' + r1(Vk.y + u.y * q + v.y * q) + ' L' + r1(Vk.x + v.x * q) + ',' + r1(Vk.y + v.y * q),
        d: dsp(isRight && ((f.right && (k === 'A' || k === 'D')) || show))
      };

      const th = this.angle(P, k) * Math.PI / 180;
      const dl = Math.max(40, Math.min(70, 30 / Math.sin(th / 2)));
      let bx = u.x + v.x, by = u.y + v.y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      aTag[k] = { t: V[k] + '°', x: r1(Vk.x + bx * dl), y: r1(Vk.y + by * dl), cls: 'alab' + stag + (show ? '' : ' off') };
    });
    // vertices
    const dk = this.dragKey();
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const Vk = P[k], drag = dk === k;
      g['v' + k] = { x: r1(Vk.x), y: r1(Vk.y), r: drag ? 11 : 7, c: drag ? PU : NAVY, w: drag ? 4 : 3 };
      const tapV = (task === 'tapAngles' || task === 'tapAD') && !s.done;
      const pulse = tapV && !s.ang[k] && (task === 'tapAngles' || k === 'A' || k === 'D');
      g['k' + k] = {
        x: r1(Vk.x), y: r1(Vk.y), d: dsp(tapV || drag), cls: pulse ? 'vp' : '',
        cur: drag ? (s.dragging ? 'grabbing' : 'grab') : 'pointer',
        click: tapV ? () => this.tapVertex(k) : noop,
        down: drag ? (e) => this.down(k, e) : noop
      };
    });
    if (dk) {
      const Vk = P[dk], y0 = r1(Vk.y + (Vk.y < 280 ? -40 : 42)), x = r1(Vk.x);
      g.halo = { x: x, y: r1(Vk.y), d: dsp(!s.dragging) };
      g.arw = {
        p: 'M' + (x - 26) + ',' + y0 + ' L' + (x + 26) + ',' + y0,
        h: 'M' + (x - 40) + ',' + y0 + ' L' + (x - 27) + ',' + (y0 - 7) + ' L' + (x - 27) + ',' + (y0 + 7) + ' Z M' + (x + 40) + ',' + y0 + ' L' + (x + 27) + ',' + (y0 - 7) + ' L' + (x + 27) + ',' + (y0 + 7) + ' Z',
        d: dsp(!s.moved && !s.dragging)
      };
    } else {
      g.halo = { x: 0, y: 0, d: 'none' };
      g.arw = { p: 'M0,0', h: 'M0,0', d: 'none' };
    }
    const R = s.ruler || this.rulerHome();
    g.rl = {
      tf: 'translate(' + r1(R.x) + ' ' + r1(R.y) + ') rotate(' + r1(R.a) + ')',
      d: dsp(task === 'measure'),
      cur: s.done ? 'default' : (s.rulerDrag ? 'grabbing' : 'grab'),
      down: (e) => this.rulerDown(e)
    };
    // edge hit areas
    const edgeTask = ['extLegs', 'extBases', 'tapBases', 'tapLegs', 'measure'].indexOf(task) >= 0 && !s.done;
    const pulseEdge = (k) => {
      const leg = k === 'DA' || k === 'BC';
      if (task === 'extLegs') return leg && !(s.ext[k] > 0);
      if (task === 'extBases') return !leg && !(s.ext[k] > 0);
      if (task === 'measure') return leg && !s.tap[k];
      return false;
    };
    const hit = (k, p, q) => seg(p, q, edgeTask, { cls: edgeTask && pulseEdge(k) ? 'hitp' : '', click: edgeTask ? () => this.tapEdge(k) : noop });
    g.tAB = hit('AB', A, B); g.tBC = hit('BC', B, C); g.tCD = hit('CD', C, D); g.tDA = hit('DA', D, A);
    // labels: a fixed set of slots (hidden ones get "off") so each tag keeps its element and
    // only animates when it first appears
    const cx = (A.x + B.x + C.x + D.x) / 4, cy = (A.y + B.y + C.y + D.y) / 4;
    const tags = [];
    ['A', 'B', 'C', 'D'].forEach((k) => {
      const Vk = P[k]; let dx = Vk.x - cx, dy = Vk.y - cy; const L = Math.hypot(dx, dy) || 1;
      tags.push({ t: k, x: r1(Vk.x + dx / L * 25), y: r1(Vk.y + dy / L * 25), cls: 'vlab' });
    });
    ['A', 'B', 'C', 'D'].forEach((k) => tags.push(aTag[k]));
    // a tag beside a side, pushed out along the side's outward normal far enough that its box clears the line
    const side = (p, q, text, cls, show) => {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, L = this.dist(p, q) || 1;
      let nx = -(q.y - p.y) / L, ny = (q.x - p.x) / L;
      if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
      const hw = (text.length * 9.6 + 32) / 2, hh = 16;
      const off = hw * Math.abs(nx) + hh * Math.abs(ny) + 12;
      // outside the shape first; if the board edge would push it back onto the side, tuck it inside instead
      const need = hw * Math.abs(nx) + hh * Math.abs(ny) + 4;
      const place = (sg) => {
        const x = Math.max(hw - 8, Math.min(516 - hw, mx + sg * nx * off)), y = Math.max(18, Math.min(404, my + sg * ny * off));
        return { x: x, y: y, ok: Math.abs(nx * (x - mx) + ny * (y - my)) >= need };
      };
      let pos = place(1);
      if (!pos.ok) pos = place(-1);
      const x = pos.x, y = pos.y;
      return { t: text, x: r1(x), y: r1(y), cls: cls + (show ? '' : ' off') };
    };
    const isB = st.id === 'bases', isL = st.id === 'legs', isM = st.id === 'measure';
    tags.push(side(A, B, 'Base', 'btag', isB && !!s.tap.AB));
    tags.push(side(D, C, 'Base', 'btag', isB && !!s.tap.CD));
    tags.push(side(D, A, 'Leg', 'ltag', isL && !!s.tap.DA));
    tags.push(side(B, C, 'Leg', 'ltag', isL && !!s.tap.BC));
    tags.push(side(D, A, 'AD = ' + this.cm(ad), 'mtag', isM && !!s.tap.DA));
    tags.push(side(B, C, 'BC = ' + this.cm(bc), 'mtag', isM && !!s.tap.BC));
    const near = Math.abs(ad - bc) < CONFIG.snap.equalLegsCm * this.S;
    const eqCls = 'mtag' + ((task === 'dragB' && near) || st.id === 'iso' ? ' eq' : '');
    tags.push(side(D, A, this.cm(ad), eqCls, !!f.legLen));
    tags.push(side(B, C, this.cm(bc), eqCls, !!f.legLen));
    return { g: g, tags: tags, V: V };
  }

  renderVals() {
    const s = this.state, steps = this.steps(), st = this.cur();
    const isLesson = !st.cfu && !st.end;
    const words = this.toWords(s.line || '').map((w, i) => ({
      t: w, cls: i < s.reveal - 1 ? 'on' : (i === s.reveal - 1 ? (s.talking ? 'cur' : 'on') : '')
    }));
    const G = isLesson ? this.geo() : { g: {}, tags: [], V: {} };
    // chips
    let chips = s.chips.slice();
    const f = st.f || {};
    if (isLesson && f.eq === 'AD') chips = [{ t: G.V.A + '° + ' + G.V.D + '° = 180°', k: 'white' }];
    if (isLesson && f.eq === 'BC') chips = [{ t: G.V.B + '° + ' + G.V.C + '° = 180°', k: 'white' }];
    if (st.id === 'add' && s.done) chips = [{ t: G.V.A + '° + ' + G.V.D + '° = 180°', k: 'gold' }];
    // cfu options
    const optPulse = s.hand && s.hand.kind === 'opts';
    const mk = (o) => ({ id: o.id, t: o.t || o.id, cls: s.picks[o.id] || (optPulse && !s.done ? 'nudged' : ''), dis: !!s.picks[o.id] || s.done, pick: () => this.pick(o) });
    const c1 = {};
    if (st.cfu === 1) st.opts.forEach((o) => { c1[o.id] = mk(o); });
    const hasOpts = !!(st.cfu && st.cfu !== 1 && st.opts);
    const opts = hasOpts ? st.opts.map(mk) : [];
    // cfu4
    const c4 = s.c4;
    const labs = this.labsDef().map((l) => {
      const p = this.labPos(l.id);
      const cls = c4.locked[l.id] ? 'lock' : (c4.drag && c4.drag.id === l.id ? 'drag' : (c4.sel === l.id ? 'sel' : ''));
      return { id: l.id, t: l.t, x: Math.round(p.x), y: Math.round(p.y), cls: cls, down: (e) => this.labDown(l.id, e) };
    });
    const slots = this.slotsDef().map((q, i) => {
      const filled = Object.keys(c4.at).some((k) => c4.at[k] === q.id);
      return { id: q.id, y: q.y, cls: c4.sel && !filled ? 'hot' : '', t: filled ? '' : 'Drop label here', aria: 'Label slot for shape ' + (i + 1), tap: () => this.slotTap(q.id) };
    });
    // end
    const nRight = Object.keys(s.results).filter((k) => s.results[k]).length;
    const nStars = CONFIG.stars.find((r) => nRight >= r[0])[1];
    const lessonCount = steps.findIndex((x) => x.cfu === 1);
    let progressLabel;
    if (st.end) progressLabel = 'Done';
    else if (st.cfu) progressLabel = 'Check ' + st.cfu + ' / 5';
    else progressLabel = 'Step ' + (s.step + 1) + ' / ' + lessonCount;
    const isLastCfu = st.cfu === 5;
    const spot = st.layout === 'spotlight';
    return {
      rootMove: (e) => this.rootMove(e),
      rootUp: (e) => this.rootUp(e),
      start: () => this.start(),
      restart: () => this.restart(),
      replay: () => this.replay(),
      toggleMute: () => this.toggleMute(),
      next: () => this.next(),
      back: () => this.back(),
      muted: !!s.muted, unmuted: !s.muted, muteLabel: s.muted ? 'Turn sound on' : 'Turn sound off',
      notStarted: !s.started,
      isLesson: isLesson && s.started,
      isCfu1: st.cfu === 1, isCfu2: st.cfu === 2, isCfu3: st.cfu === 3, isCfu4: st.cfu === 4, isCfu5: st.cfu === 5,
      isEnd: !!st.end,
      g: G.g, tags: G.tags,
      words: words,
      bubCls: s.bub,
      // lesson steps share one board, so it only fades in when it first appears; each check fades in fresh
      fadeCls: st.cfu || st.end ? (s.step % 2 ? 'fadeA' : 'fadeB') : 'fadeA',
      birdCls: 'bird', // Swiftee's expressions are driven by pose() (js/swiftee.js), not by re-rendering
      chips: chips.map((c) => ({ t: c.t, k: c.k + (c.t.length > 20 ? ' long' : '') })),
      rootDown: () => this.rootDown(),
      wordSize: words.length > 15 ? 22 : 24,
      c1: c1, hasOpts: hasOpts, opts: opts, optTop: st.optTop || 376,
      labs: labs, slots: slots,
      stars: [0, 1, 2].map((i) => ({ cls: i < nStars ? 'on' : '' })),
      scoreText: 'You got ' + nRight + ' of 5 checks right on the first try.',
      progressW: Math.round((s.step / (steps.length - 1)) * 100) + '%',
      progressLabel: progressLabel,
      showNav: s.started && !st.end,
      backDisabled: s.step === 0,
      nextDisabled: !s.done,
      nextCls: s.done && !s.talking ? 'ready' : '',
      nextLabel: isLastCfu ? 'Finish' : 'Next',
      // spotlight: the board (shape + its labels) glides to centre stage and grows; Swiftee moves right; no bubble
      boardTf: spot ? 'translate(' + CONFIG.spotlight.tx + 'px, ' + CONFIG.spotlight.ty + 'px) scale(' + CONFIG.spotlight.scale + ')' : 'none',
      spotFill: spot ? 'spot' : '',
      swCls: spot ? 'swiftee spot' : 'swiftee',
      bubHide: !s.line ? 'gone' : '',
      // hand: fingertip lands on (x, y); drags travel (dx, dy). key restarts the animation on each showing
      handOn: !!(s.hand && s.hand.kind !== 'opts'),
      hand: s.hand && s.hand.kind !== 'opts'
        ? { cls: 'hand-nudge ' + s.hand.kind + (s.hand.down ? ' down' : ''), x: s.hand.x, y: s.hand.y, dx: s.hand.dx, dy: s.hand.dy }
        : { cls: 'hand-nudge', x: 0, y: 0, dx: 0, dy: 0 }
    };
  }
};
