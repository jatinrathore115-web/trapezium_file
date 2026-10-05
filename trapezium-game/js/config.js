// =====================================================================
// CONFIG — tuning values for the board, snapping, pacing and limits.
// =====================================================================
const CONFIG = {
  pxPerCm: 40,                       // board scale: 1 cm = 40 board px
  start: { D: 45, C: 475, baseY: 340, height: 170, legAD: 5, legBC: 7 }, // opening scalene shape (cm for legs)
  limits: { minTop: 90, minBottom: 160, maxLegRun: 243, minX: 16, maxX: 478 }, // keeps the shape readable (angles ~35°–145°)
  snap: { equalLegsCm: 0.3, rightAngleDeg: 3 },
  ruler: { home: { x: 110, y: 382, a: -3 }, flyMs: 600, holdMs: 700, returnMs: 450 },
  timing: { idleMs: 9000, idleMaxHints: 3, navLockMs: 450, autoNextMs: 1200 },
  stars: [[5, 3], [3, 2], [0, 1]]    // [first-try correct >=, stars]
};
