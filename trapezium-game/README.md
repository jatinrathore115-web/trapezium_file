# Trapezium — interactive lesson (final build)

One continuous, playable lesson: Swiftee walks the learner through parallel sides, bases and legs,
scalene / isosceles / right trapeziums and the angle rules, then five checks (CFUs) and a score screen.
Lengths and angles are measured live from the shape the learner has made.

The full screen-by-screen flow, mechanics, feedback and scoring are described in [GAME_DESIGN.md](GAME_DESIGN.md).

## Folder structure

```
trapezium-game/
├── index.html                  page + game markup (layout with {{bindings}}, no logic)
├── assets/
│   └── images/
│       ├── swiftee.webp            Swiftee still (shown until the animated sprite is ready)
│       ├── speech-bubble.webp      (unused: the bubble is now drawn in CSS)
│       ├── ice-panel.webp          glass board panel
│       ├── winter-background.webp  winter scene background (all screens)
│       └── snow-background.webp    (unused: previous background)
├── swiftee-assets/             Swiftee sprite sheets + manifest (the game reads atlas/swiftee.manifest.json
│                               and spritesheets/1x|2x; see swiftee-assets/README.md)
├── css/
│   ├── stage.css               page shell: letterboxes the 1920×1080 stage
│   └── game.css                game styles: bubble, Swiftee, board, labels, chips, buttons, CFUs, animations
├── js/
│   ├── vendor/
│   │   ├── dc-runtime.js       template + rendering runtime (from the Design canvas; bundles React 18)
│   │   └── gsap.min.js         GSAP 3.12.5 (local copy, so the game still runs offline)
│   ├── config.js               CONFIG: scale, starting shape, drag limits, snapping, timings, stars
│   ├── lesson-data.js          LESSON: every learning state and CFU, in play order (content as data)
│   ├── swiftee-manifest.js     GENERATED trimmed copy of the Swiftee manifest (works from file://)
│   ├── swiftee.js              Swiftee mascot: plays start → loop → stop expressions on a canvas
│   ├── game-engine.js          the game: narration, geometry, drags, ruler, CFUs, scoring, render values
│   ├── stage-fit.js            scales the stage to the window
│   ├── snowfall.js             slow background snowfall (behind the panel; off for reduced motion)
│   ├── confetti.js             one confetti burst from the top on each correct action (off for reduced motion)
│   └── motion.js               the choreographed animations on GSAP (shape build/assembly, side numbers, corner
│                               letters, traces, shape zoom, wiggle); reverted on every screen change
├── tools/
│   └── build-swiftee-manifest.js   regenerates js/swiftee-manifest.js after the sheets change
├── canvas-source/
│   ├── Main.dc.html            same game as one file, for re-importing into a Claude Design canvas
│   └── canvas.json
└── qa/                         automated tests (optional for running the game)
    ├── logic-test.js           headless test of every state and CFU (Node)
    ├── playthrough.js          real-browser playthrough + layout audit + console check (Playwright)
    ├── geometry-sweep.js       drags every corner through its full range, checks collisions
    ├── make-debug.py           builds qa/debug.html used by the sweep
    └── fake-speech.js · no-speech.js · native-speech.js   speech modes for the tests
```

Script load order (in `index.html`): `dc-runtime.js` → `gsap.min.js` → `config.js` → `lesson-data.js` → `swiftee-manifest.js` → `swiftee.js` → `walker.js` → `motion.js` → `game-engine.js`,
then `stage-fit.js` at the end of the body.

## Run it

| How | Steps |
|---|---|
| Open from disk | Double-click `index.html` (works offline; fonts need internet, otherwise system fonts are used). |
| Local server | `python3 -m http.server 8765` in this folder, then open `http://localhost:8765/`. |
| Host on the web | Upload the folder as-is: static files only, no build step. |

Stage: 1920 × 1080 (16:9), letterboxed to any window: desktop, laptop, tablet landscape.
Mouse, touch and pen all work.

## Editing

- **Words, lines, hints, feedback, CFU answers** → `js/lesson-data.js`
- **Snapping, drag limits, pacing, idle hints, stars** → `js/config.js`
- **Swiftee's expression on a line** → the line's `m` in `js/lesson-data.js` (default `talking`)
- **Swiftee's reactions** (idle, thinking time, praise, correct, wrong, idle hint, end) → `CONFIG.swiftee` in `js/config.js`
- **Colours, sizes, animations** → `css/game.css`
- **Layout / positions of screen elements** → `index.html` (inside `<x-dc>`)
- **Behaviour** → `js/game-engine.js` (sections: timers · audio · narration · idle hints · flow · ruler ·
  geometry · lesson interactions · CFU · render)

`LESSON` step fields: `lines` (`t` text, `s` spoken text, `chips`), `task` (extLegs, extBases, tapBases, tapLegs,
measure, dragB, tapAngles, dragD90, tapAD, dragD, dragC), `hint`, `idle`, `after`, `autoNext`,
`f` display flags, and for checks `cfu`, `opts` (`ok` / `fb`), `ok`.

## Lesson state map (storyboard PDF pages → build)

| # | State | Learner does | PDF page |
|---|---|---|---|
| 1 | Let's take a closer look at what Popo caught | — | 1–2 (same line; merged) |
| 2 | These two sides look like they will meet | — (hint dashes) | 3 |
| 3 | Let's extend them. | tap both legs → lines meet, "Woah! The sides meet." | 4 |
| 4 | Let's check the other pair of sides. | tap both bases → lines extend | 5 |
| 5 | They do not meet. | — (shape shifted 45 px left) | 6 |
| 6 | This means the sides are parallel to each other. | then "AB ∥ CD" card + voice "AB is parallel to CD" (card appears and AB, CD pulse yellow as the voice starts) | 7 |
| 7 | Definition: trapezium | — ("Trapezium") | 8 |
| 8 | The parallel sides are called bases. | — (AB, CD pulse yellow + "Base" callout) | 9 |
| 9 | And the non-parallel sides are called legs. | — (AD, BC pulse yellow on "legs" + "Legs" callout) | 10 |
| 10 | Let's measure the sides of this trapezium | drag the ruler onto a leg, or tap a leg | 11 |
| 11 | Different lengths → scalene trapezium | — | 12 |
| 12 | Make both legs equal | drag B (snaps at equal legs, auto-advances) | 13 |
| 13 | Legs equal → isosceles trapezium | — | 14 |
| 14 | Measure its angles | tap each corner | 15 |
| 15 | Make ∠A exactly 90° | drag D (snaps at 90°, auto-advances) | 16 |
| 16 | Another right angle → right trapezium | — | 17 |
| 17 | Add these two angles | tap ∠A and ∠D → "90° + 90° = 180°" | 18–19 |
| 18 | What if we change the shape? | drag D, live sum stays 180° | 20–21 |
| 19 | Same on the other leg? | drag C, live sum stays 180° | 22–23 |
| 20 | Angles on the same leg add up to 180° | — | 24 |
| 21 | Angle sum is 360° | — | 25 |
| 22–26 | CFU 1–5 (which is a trapezium · which type · missing angle · label the types (drag) · missing side) | answer; wrong answers lock red with a hint, retry allowed | 26 |
| 27 | Lesson complete: stars + first-try score, Play again | — | (added end screen) |

## Behaviour notes

- **Narration** uses the device's built-in speech voice; if none is available, words still reveal on a timer.
  On-screen words follow the voice's word events, at most one word ahead. Mute and replay are top right / on the bubble.
- **Geometry rules**: the bases stay parallel (corners only slide sideways); the shape cannot cross itself,
  a base cannot collapse, and angles stay between about 35° and 145°. The pair sums shown are always exactly 180°.
- **Locks**: Next unlocks only when the task is done; Next/Back ignore double taps; drags, the ruler and
  the CFU 4 check lock while they animate; idle hints (after 9 s, at most 3) never interrupt a drag.
- **Score**: a check counts only if it was right on the first try.

## QA (all passing on this build)

Requires Node 18+ and Playwright (`npm i -D playwright`). Start `python3 -m http.server 8765` in this folder first.

```
node qa/logic-test.js                          # headless: plays every state and CFU through the engine
node qa/playthrough.js mouse fake 1920x1080    # real browser playthrough + layout audit + console check
node qa/playthrough.js touch none 1024x768     # input: mouse|touch · speech: fake|none|native · any WxH
python3 qa/make-debug.py && node qa/geometry-sweep.js   # drags every corner through its whole range, checks collisions
```

Verified at 1920×1080, 1440×810, 1366×768, 1280×720, 1180×820 (touch) and 1024×768 (touch):
61 checks per playthrough (59 without the simulated voice), layout audit clean, geometry sweep clean,
no console errors or warnings. Screenshots and reports go to `qa-shots/`.

## QA (all passing on this build)

Requires Node 18+ and Playwright (`npm i -D playwright`). Start `python3 -m http.server 8765` in this folder first.

```
node qa/logic-test.js
node qa/playthrough.js mouse fake 1920x1080     # input: mouse|touch · speech: fake|none|native · any WxH
python3 qa/make-debug.py && node qa/geometry-sweep.js
```

## Known limits

- Fonts (Baloo 2, Nunito) load from Google Fonts; offline, system fonts are used and the layout still fits.
- Voice quality depends on the device's installed voices.
- `js/vendor/dc-runtime.js` bundles React; the game's own code (config, lesson data, engine) is plain JavaScript.

## Swiftee

Swiftee reacts to what is being said. Each narration line can name an expression (`m`); everything else comes from `CONFIG.swiftee`:

| Moment | Expression |
|---|---|
| Greeting | `waving` |
| Explaining | `talking` |
| Asking the learner to do something, asking a check question | `curious` |
| Wondering aloud ("What happens if we add…?"), check question open | `thinking` |
| A discovery ("Woah! The sides meet.", "They do not meet.") | `surprised` |
| Task done, praise | `happy` |
| Check answered correctly, lesson complete | `celebrating` |
| Wrong answer or tap | `confused` (encouraging) |
| Idle hint | `curious` |
| Nobody talking | `blinking` |

Every expression plays its start once, loops, then plays its stop before the next one, so changes never jump.
An expression stays at least `minHoldMs` and about as long as the line takes to read, even with the sound off.
Sheets load from `swiftee-assets/` (@2x only when Swiftee is drawn larger than 300 device pixels), and
`prefers-reduced-motion` shows still poses. If the sheets can't load, the still image stays.
After replacing the sheets, run `node tools/build-swiftee-manifest.js`.

`canvas-source/Main.dc.html` keeps the still Swiftee: the canvas copy can't load the sprite sheets.

## Hand nudge

When a tap or drag is expected and nothing is touched for `CONFIG.hand.idleMs` (8 s) after Swiftee stops talking,
a hand (`assets/images/hand-nudge.webp`) shows exactly where: the next side or corner to tap, the point to drag
(sliding the way that reaches the goal), or the Next button once a step is finished. A soft ring pulses from the
fingertip on each press. Any touch hides it; it returns only if the learner is idle again (at most
`CONFIG.hand.maxShows` times per step). On checks it never points at an answer: the open options glow together,
and on the labelling check it only presses a label. Targets are read from the page (`data-qa`), so the hand
stays on target if the layout changes.

## Spotlight layout (not used in the lesson)

`layout: 'spotlight'` on a step centres and enlarges the shape with a soft glow and moves Swiftee (mirrored, `pose`) to the
right. It was removed from the flow after "Woah! The sides meet." but is kept for reuse; position and size are `CONFIG.spotlight`.

## Focus screen

"Let's extend them." is its own instruction-only screen (`extendSay`: `autoAdvance`, `locked`: no Next, no Back) that moves on
as soon as the voice-over ends. The tapping screen that follows (`extend`, `layout: 'focus'`, no line of its own) opens with that
bubble fading out while the shape glides to centre stage. Back skips over screens that move on by themselves. The two sides to tap carry a pulsing yellow band (off once tapped); after 5 s with no
touch the hand presses the next side. Whenever Swiftee speaks again on this screen ("Woah! The sides meet.", a wrong-tap tip) the shape
steps back to make room for the bubble, then returns to centre when it fades. Spoken idle reminders are skipped here: the
hand guides instead. Timings and position: `CONFIG.focus` in `js/config.js`.

## Screen flow (no Next button)

There is no Next button for now (`CONFIG.flow.showNext: false` in `js/config.js` brings it back). A finished screen moves on
by itself `CONFIG.flow.advanceMs` (2.5 s) after its last line and voice-over end:

- narration screens: 2.5 s after Swiftee finishes;
- tasks: once done, after the praise line ("Woah! The sides meet.", "Perfect!") + 2.5 s;
- checks: after the correct answer and Swiftee's explanation + 2.5 s (a wrong answer never moves on);
- "Let's extend them." (`autoAdvance: 1`): immediately; a step's `autoAdvance` (ms) overrides the wait;
- lesson complete: stays (Play again).

If Swiftee starts talking again before the move (a tip, a hint), the wait restarts when that line ends. There is no Back button
either (`CONFIG.flow.showBack`); when shown, it skips instruction-only (`locked`) screens. The hand nudge only points at Next when the button is shown.

## Top navigation

Every screen has **Back** and **Next** in the top-right corner (`.topnav` in `index.html`, `.navbtn` in `css/game.css`), alongside
the automatic move-on. Back is greyed out on the first screen and skips instruction-only (`locked`) screens; Next is greyed out
on Lesson complete. Next works even before a task is done; skipping an unfinished drag task applies its result first (equal
legs, a right angle at A), so the screens after it still match the shape (`navNext()` in `js/game-engine.js`).

## Screen list

**Screens · N** (top-left) opens a panel of snapshots of every screen; tap one to open that screen directly (the shape is
rebuilt as if the earlier screens were done, see `jumpTo()`). The lesson does not move on while the panel is open.
Snapshots live in `assets/thumbs/NN.webp`; after changing screens run `node tools/build-thumbs.js` (needs Chrome or Edge).

## Lip-sync and word timing

The voice is the clock for every line (`say()` in `js/game-engine.js`). Nothing shows until the voice starts; Swiftee switches to her
`talking` animation at that instant (`SwifteeMascot.talk()`), moves her beak only while the voice speaks, closes it when it ends and
then shows the line's expression (`m`) for `CONFIG.swiftee.reactMs`. Each word appears when the voice reaches it: word-boundary
events are mapped to exact word offsets in the spoken text. Voices without boundary events use a paced reveal that starts with the
voice and learns its real speed after each line (`paceK`). With no voice at all, words and beak run on the paced timing.

## Measuring trip (screen 13)

Automatic (`auto: 1` on the step): after "Let's measure the sides of this trapezium." Swiftee flies onto corner A (`flapping`, shrinking
to `CONFIG.walker.size`) and measures A → B → C → D → A by herself. On each side she walks with her feet on the line (`measuring`), pulling a
tape out of the tape measure in her hand: the tape is anchored at the side's first corner, lies just outside the side with half-cm ticks and
cm numbers, and rises into her hand (exact per-frame hand points: `CONFIG.walker.tips`). The length label appears at the corner, the tape
stays laid out until the next side starts, and after the fourth side she flies home and the screen moves on. Code: `js/walker.js`,
`autoMeasure()` / `measureLeg()` in `js/game-engine.js`; timings in `CONFIG.walker`. The walk sheet comes from the draft
`swiftee-assets/source/drafts/swiftee-measuring-draft.png` via `node tools/build-measuring-sheet.js <png> 4 2` + `node tools/build-swiftee-manifest.js`.
