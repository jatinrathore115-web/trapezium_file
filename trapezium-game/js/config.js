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
  // spotlight screen: board moved/scaled from its usual spot (transform-origin = board top-left at 640,104).
  // Puts the shape (board centre ~260,228) at stage (560,358): mid-height, balanced against Swiftee on the right.
  spotlight: { scale: 1.35, tx: -431, ty: -54 },
  hand: { idleMs: 8000, showMs: 4400, maxShows: 4 }, // hand nudge: wait with no touch, time on screen, showings per step
  stars: [[5, 3], [3, 2], [0, 1]],   // [first-try correct >=, stars]
  // Swiftee's expressions (state names from swiftee-assets/atlas/swiftee.manifest.json).
  // A narration line's own m wins; these cover reactions and the pose held between lines.
  swiftee: {
    base: 'swiftee-assets/',
    talk: 'talking',       // default while a line is spoken
    idle: 'blinking',      // between lines and while the learner works on a task
    waiting: 'thinking',   // a check question is open: thinking time
    praise: 'happy',       // a task is completed
    correct: 'celebrating',// a check is answered correctly
    wrong: 'confused',     // a wrong answer or tap: encouraging, never punishing
    nudge: 'curious',      // idle hint
    done: 'happy',         // the lesson-complete screen, after the closing line
    minHoldMs: 900
  }
};
