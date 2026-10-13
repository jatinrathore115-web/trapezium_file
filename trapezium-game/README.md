# Trapezium Adventure

A playable lesson about trapeziums for children. Swiftee the bird walks the learner through parallel sides, bases and legs,
scalene, isosceles and right trapeziums, and the angle rule (angles on the same leg add up to 180°), then five checks.
Lengths and angles are always measured from the shape on screen, including shapes the learner drags.

The screen-by-screen design (what each screen says, shows and asks) is in [GAME_DESIGN.md](GAME_DESIGN.md).

## Run it

Static files only, no build step.

- **Local:** in this folder run `python3 -m http.server 8765`, then open http://localhost:8765/
- **From disk:** double-click `index.html` (works offline; without internet the fonts fall back to system fonts)
- **Web:** deploy this folder as-is (on Vercel, set the project's root directory to `trapezium-game`)

The stage is 1920 × 1080 and scales to fit any window. Mouse, touch and pen all work.

## The lesson

| Screens | Part |
|---|---|
| 1–15 | What is a trapezium: quadrilaterals, sides that meet and sides that don't, parallel sides, bases and legs |
| 16–22 | Types by sides: Swiftee measures the sides with a tape, scalene, drag A to make the legs equal, isosceles |
| 23–35 | Angles: Swiftee measures the angles with a protractor, same-leg angles add to 180°, supplementary angles, right trapezium |
| 36–37 | Well done, and the summary (eight idea cards) |
| 38–42 | Five scored checks |
| 43 | Lesson complete |

## Folder

```
trapezium-game/
├── index.html            the page and the game's markup (a template: {{bindings}} are filled by the engine)
├── css/
│   ├── stage.css         fits the 1920 × 1080 stage to the window
│   └── game.css          all game styles and CSS animations
├── js/
│   ├── vendor/           dc-runtime.js (template runtime, bundles React) and gsap.min.js
│   ├── config.js         tuning: shapes, limits, timings, sounds, Swiftee's reactions
│   ├── lesson-data.js    every screen as data, in play order (lines, cues, tasks, questions)
│   ├── game-engine.js    the game: narration, navigation, geometry, drags, checks, values for the markup
│   ├── motion.js         the GSAP animations each screen plays (cleared on every screen change)
│   ├── swiftee.js        Swiftee's expressions and lip-sync on a canvas
│   ├── swiftee-manifest.js   generated list of Swiftee's sprite sheets
│   ├── walker.js         screen 16: Swiftee measures the sides with her tape
│   ├── angle-walker.js   screen 23: Swiftee measures the angles with one protractor
│   ├── angle-frames.js   the protractor poses
│   ├── summary.js        screen 37: the summary cards
│   ├── intro.js          the cabin intro between the front page and screen 1
│   ├── stage-fit.js, snowfall.js, confetti.js
├── assets/
│   ├── images/           backgrounds, panels, the front-page banner, buttons, Swiftee extras
│   └── audio/            the correct / incorrect sounds
├── swiftee-assets/       Swiftee's sprite sheets (spritesheets/1x, 2x and extra/) and their manifest
├── tools/                Node scripts that rebuild Swiftee's measuring sheet and manifest
└── qa/                   logic-test.js (headless test of every screen) and fake-speech.js
```

## Editing

- **Words, cues, tasks, questions, feedback:** `js/lesson-data.js` (the comment at the top lists every option)
- **Timings, shapes, limits, Swiftee's default reactions:** `js/config.js`
- **Swiftee's expression for a line:** the line's `m` in `js/lesson-data.js`
- **Colours, sizes, CSS animations:** `css/game.css`
- **Where things sit on screen:** `index.html` (inside `<x-dc>`)
- **Behaviour:** `js/game-engine.js`; scripted animations: `js/motion.js`

## How it works

- **Rendering.** `index.html` is a template. `renderVals()` in `game-engine.js` returns every value it binds, and the
  runtime re-renders when the state changes.
- **Narration.** Each line is spoken with the device's speech voice. Words appear as the voice reaches them, Swiftee's
  beak moves only while she speaks, and cue words (`cueAt`) fire animations at the exact word. Without a voice, the words
  are paced on a timer instead.
- **Screens.** Navigation is manual: Back and Next sit top right, and "Screen N of 43" (top left) jumps to any screen.
  Skipping an unfinished drag applies its result, so later screens still match the shape.
- **Shapes.** The bases always stay parallel: corners only slide sideways, within limits that keep the shape readable.
- **Front page.** The banner fills the stage; the Play button unlocks sound and starts the intro.
- **Intro** (`js/intro.js`). The camera pushes in on Swiftee's cabin, the learner rings the doorbell (it rings by itself
  after a few seconds), the door swings open and Swiftee hops out to say hello; then the camera pulls back to the
  lesson's landscape and screen 1 begins. Skip jumps straight to screen 1. `CONFIG.flow.intro: false` turns it off.

## Tests

`qa/logic-test.js` plays every screen and check through the engine without a browser (Node):

```
node qa/logic-test.js
```

## Rebuilding Swiftee's sheets

After changing the sprite sheets, regenerate the manifest with `node tools/build-swiftee-manifest.js`. To rebuild the tape
walk from its drawing: `node tools/build-measuring-sheet.js swiftee-assets/source/drafts/swiftee-measuring-draft.png 4 2`,
then rebuild the manifest. See `swiftee-assets/README.md`.

## Limits

- Fonts (Baloo 2, Nunito) load from Google Fonts.
- Voice quality depends on the device's installed voices.
