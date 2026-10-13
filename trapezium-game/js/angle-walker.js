// =====================================================================
// ANGLE WALKER — screen 23: Swiftee measures the four angles with one protractor (a port of the Measuring Kit's walk).
// She walks out from her spot, carries the protractor to each corner, sets its centre on the vertex and its baseline
// along a side, holds it while the reading comes in, lifts it and moves on. After the last corner she walks home.
// Each frame of assets/images/swiftee-protractor.webp is one complete pose, bird and protractor together (poses in
// js/angle-frames.js). A frame is only turned a little from how it was drawn, so she stays near upright.
// Drawn on its own canvas (.angle-walk) in stage px, at the shape's real corners (engine.boardToStage).
// cancel() runs on every screen change: she disappears at once and no reading comes in later.
// =====================================================================
window.AngleWalker = class AngleWalker {
  constructor() {
    this.F = window.AngleMeasuringFrames;
    this.run = 0; this.pose = null; this.alpha = 0; this.sparks = []; this.loopOn = false;
    this.frame = this.F ? this.F.carry : 0;
    if (this.F) { const im = new Image(); im.decoding = 'async'; im.src = this.F.image; this.img = im; }
    this.draw = this.draw.bind(this);
  }
  get S() { return this.F.scale * CONFIG.angleWalk.scale; } // sheet px -> stage px
  canvas() { return document.querySelector('.angle-walk'); }

  // ---------- geometry ----------
  static inside(v, p) { // ray cast: is p inside polygon v
    let c = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      if ((v[i].y > p.y) !== (v[j].y > p.y) && p.x < (v[j].x - v[i].x) * (p.y - v[i].y) / (v[j].y - v[i].y) + v[i].x) c = !c;
    }
    return c;
  }
  // an angle in degrees, wrapped to -180..180
  static norm(a) { return ((a % 360) + 540) % 360 - 180; }
  // offset from the protractor's centre to her torso, for `frame` turned to `rotation` (stage px)
  bodyOffset(frame, rotation, k) {
    const P = this.F.poses[frame], o = P.bodyOffset, a = (rotation - P.angle) * Math.PI / 180, s = this.S * (k || 1);
    return { x: (Math.cos(a) * o.x - Math.sin(a) * o.y) * s, y: (Math.sin(a) * o.x + Math.cos(a) * o.y) * s };
  }
  // switch drawings without moving her: the pose shifts so the torso stays put; only the wing and protractor change
  selectPose(frame, rotation) {
    const old = this.bodyOffset(this.frame, this.pose.rotation, this.pose.k), next = this.bodyOffset(frame, rotation, this.pose.k);
    this.pose.x += old.x - next.x; this.pose.y += old.y - next.y;
    this.frame = frame; this.pose.rotation = rotation;
  }
  // the pose that puts her torso on `body` at size k, in the carry frame, not turned
  homePose(body, k) {
    const f = this.F.carry, a = this.F.poses[f].angle, o = this.bodyOffset(f, a, k);
    return { x: body.x - o.x, y: body.y - o.y, rotation: a, k: k };
  }

  // ---------- one eased move (smoothstep) of the pose. arc: { x, y } = how far the path bows out at its middle;
  // steps: how many footsteps, each a small bob. Resolves false if cancelled ----------
  tween(target, ms, progress, arc, steps) {
    const run = this.run, from = Object.assign({}, this.pose);
    if (target.rotation != null) target.rotation = from.rotation + AngleWalker.norm(target.rotation - from.rotation); // turn the short way
    return new Promise((res) => {
      let t0 = null;
      const tick = (now) => {
        if (run !== this.run) { res(false); return; }
        if (t0 == null) t0 = now;
        const t = Math.min(1, (now - t0) / Math.max(1, ms)), e = t * t * (3 - 2 * t);
        Object.keys(target).forEach((key) => { this.pose[key] = from[key] + (target[key] - from[key]) * e; });
        if (arc) { const b = Math.sin(Math.PI * t); this.pose.x += arc.x * b; this.pose.y += arc.y * b; }
        if (steps) this.pose.y -= Math.abs(Math.sin(Math.PI * t * steps)) * CONFIG.angleWalk.bob;
        if (progress) progress(e, t);
        if (t < 1) requestAnimationFrame(tick); else res(true);
      };
      requestAnimationFrame(tick);
    });
  }

  // o.verts: the corners in stage px, in walk order; o.home: { x, y, k } her torso at her spot, and her size there
  // relative to her size on the board; o.homeEl: her mascot element (faded out while she walks);
  // o.onReading(i): the protractor is on corner i, show its reading; o.onDone(): she is back home
  start(o) {
    this.cancel();
    const run = ++this.run, C = CONFIG.angleWalk, F = this.F, v = o.verts, n = v.length;
    const live = () => run === this.run;
    const homeEl = o.homeEl, homeOp = (t) => { if (homeEl) homeEl.style.opacity = String(t); };
    this.homeEl = homeEl;
    this.frame = F.carry;
    const homeK = o.home.k || C.homeK;
    this.pose = this.homePose(o.home, homeK);
    this.alpha = 0;
    this.loop();
    const corner = (i) => {
      if (!live()) return Promise.resolve(false);
      const p = v[i], prev = v[(i + n - 1) % n], next = v[(i + 1) % n], TAU = 2 * Math.PI;
      const a = Math.atan2(prev.y - p.y, prev.x - p.x), b = Math.atan2(next.y - p.y, next.x - p.x);
      let sweep = ((b - a) % TAU + TAU) % TAU;
      if (!AngleWalker.inside(v, { x: p.x + Math.cos(a + sweep / 2) * 2, y: p.y + Math.sin(a + sweep / 2) * 2 })) sweep -= TAU;
      // the drawn protractor opens above its baseline, so along this ray its half-disc lies inside the angle
      const base = sweep < 0 ? a : b;
      let rotation = base * 180 / Math.PI, chosen = 0, err = Infinity;
      F.poses.forEach((d, j) => { const dl = Math.abs(AngleWalker.norm(rotation - d.angle)); if (dl < err) { err = dl; chosen = j; } });
      // keep her body off the shape: the baseline may lie along either side of the corner (turned half round on the
      // other one). Of the drawings turned at most tiltMax, prefer her torso outside the shape, then the smallest turn
      const other = (base === a ? b : a) * 180 / Math.PI + 180;
      let best = null;
      [rotation, other].forEach((rot) => F.poses.forEach((d, j) => {
        const dl = Math.abs(AngleWalker.norm(rot - d.angle));
        if (dl > C.tiltMax) return;
        const ang = (rot - d.angle) * Math.PI / 180, bo = d.bodyOffset, s = this.S;
        const body = { x: p.x + (Math.cos(ang) * bo.x - Math.sin(ang) * bo.y) * s, y: p.y + (Math.sin(ang) * bo.x + Math.cos(ang) * bo.y) * s };
        const score = (AngleWalker.inside(v, body) ? 1000 : 0) + dl;
        if (!best || score < best.score) best = { score: score, rot: rot, frame: j };
      }));
      if (best && best.score < 1000) { rotation = AngleWalker.norm(best.rot); chosen = best.frame; }
      this.selectPose(chosen, rotation - 5); // carried 5° off, then lined up exactly at the corner (ALIGN)
      const out = a + sweep / 2 + Math.PI, carry = { x: p.x + Math.cos(out) * C.carryPx, y: p.y + Math.sin(out) * C.carryPx };
      const first = i === 0;
      // corner to corner her path bows outward round the side (away from the centre), so she never crosses the shape
      let hop = null;
      if (!first) {
        const m = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 }, c = v.reduce((o, q) => ({ x: o.x + q.x / n, y: o.y + q.y / n }), { x: 0, y: 0 });
        const L = Math.hypot(p.x - prev.x, p.y - prev.y) || 1;
        let nx = -(p.y - prev.y) / L, ny = (p.x - prev.x) / L;
        if (nx * (m.x - c.x) + ny * (m.y - c.y) < 0) { nx = -nx; ny = -ny; }
        hop = { x: nx * C.hop, y: ny * C.hop };
      }
      // MOVE_TO_VERTEX. The first time she walks out from her spot, shrinking to board size as she cross-fades
      // with her mascot element
      const walk = first ? this.walkOf(carry) : null;
      return this.tween(Object.assign({ rotation: rotation - 5, k: 1 }, carry), first ? walk.ms : C.moveMs, first ? (e) => {
        const seen = Math.min(1, e * 4); this.alpha = seen; homeOp(1 - seen);
      } : null, hop, first ? walk.steps : 0)
        .then((ok) => ok && this.tween({ x: p.x, y: p.y }, C.placeMs))                 // POSITION_PROTRACTOR: centre on the vertex
        .then((ok) => ok && this.tween({ rotation: rotation }, C.alignMs))              // ALIGN: baseline along the side
        .then((ok) => { if (ok && o.onReading) o.onReading(i); return ok && this.tween({}, C.measureMs + C.holdMs); }) // MEASURE + HOLD
        .then((ok) => ok && this.tween(carry, C.liftMs))                                // LIFT
        .then((ok) => {
          if (!ok) return false;
          if (i < n - 1) return corner(i + 1);
          // RETURN: walk home in the carry drawing, growing back to her own size, then fade back to the mascot element
          this.selectPose(F.carry, F.poses[F.carry].angle);
          const home = this.homePose(o.home, homeK), back = this.walkOf(home);
          return this.tween(Object.assign({}, home), back.ms, null, null, back.steps)
            .then((ok2) => ok2 && this.tween({}, C.fadeMs, (e) => { this.alpha = 1 - e; homeOp(e); }))
            .then((ok2) => { if (!ok2) return false; this.finish(); if (o.onDone) o.onDone(); return true; });
        });
    };
    corner(0);
  }
  // time and step count for a walk from where she is to `to`, at her walking pace
  walkOf(to) {
    const d = Math.hypot(to.x - this.pose.x, to.y - this.pose.y), C = CONFIG.angleWalk;
    return { ms: Math.max(C.firstMs, d / CONFIG.walker.strollPxPerMs), steps: Math.max(2, Math.round(d / C.stepPx)) };
  }
  // clear her pose and show the mascot element again
  finish() {
    this.pose = null; this.alpha = 0;
    if (this.homeEl) this.homeEl.style.opacity = '';
    this.homeEl = null;
  }
  // screen change: stop at once, clear the canvas and show the mascot element again
  cancel() {
    this.run++;
    this.finish();
    this.sparks = [];
    const cv = this.canvas();
    if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  }
  // a small burst of gold and white sparks round a reading as it comes in (stage px)
  sparkle(x, y) {
    if (!isFinite(x) || !isFinite(y)) return;
    this.sparks.push({ x: x, y: y, t0: performance.now(), run: this.run });
    this.loop();
  }

  // ---------- drawing ----------
  // the draw loop runs only while she or a sparkle is on screen
  loop() { if (!this.loopOn) { this.loopOn = true; requestAnimationFrame(this.draw); } }
  draw(now) {
    const cv = this.canvas();
    this.sparks = this.sparks.filter((s) => s.run === this.run && now - s.t0 < 700);
    if (!cv) { this.loopOn = false; return; }
    const c = cv.getContext('2d'), k = cv.width / 1280; // the canvas has more pixels than the 1280 px stage, for sharp edges
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const F = this.F, P = this.pose, im = this.img;
    if (P && this.alpha > 0 && im && im.complete && im.naturalWidth) {
      const s = this.S * (P.k || 1), cell = F.cell, f = this.frame;
      c.setTransform(k, 0, 0, k, 0, 0);
      c.translate(P.x, P.y);
      c.rotate((P.rotation - F.poses[f].angle) * Math.PI / 180); // turn only by the difference from how the frame was drawn
      c.globalAlpha = this.alpha;
      c.drawImage(im, (f % F.cols) * cell, Math.floor(f / F.cols) * cell, cell, cell, -F.anchor.x * s, -F.anchor.y * s, cell * s, cell * s);
      c.globalAlpha = 1;
    }
    this.sparks.forEach((sp) => {
      const t = (now - sp.t0) / 700, r = 6 + 26 * (1 - Math.pow(1 - t, 3)), a = 1 - t;
      c.setTransform(k, 0, 0, k, 0, 0);
      for (let j = 0; j < 8; j++) {
        const ang = j * Math.PI / 4 + 0.3, x = sp.x + Math.cos(ang) * r, y = sp.y + Math.sin(ang) * r, z = (j % 2 ? 3 : 4.5) * (1 - t * 0.5);
        c.globalAlpha = a; c.fillStyle = j % 2 ? '#ffffff' : '#ffc93c';
        c.beginPath(); c.moveTo(x, y - z); c.lineTo(x + z * 0.35, y - z * 0.35); c.lineTo(x + z, y); c.lineTo(x + z * 0.35, y + z * 0.35);
        c.lineTo(x, y + z); c.lineTo(x - z * 0.35, y + z * 0.35); c.lineTo(x - z, y); c.lineTo(x - z * 0.35, y - z * 0.35); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
    });
    if (this.pose || this.sparks.length) requestAnimationFrame(this.draw); else this.loopOn = false;
  }
};
