# Swiftee's sprite sheets

The sheets the game uses to animate Swiftee, exported from the Swiftee Rive rig.

```
spritesheets/1x/swiftee_<anim>@1x.webp   one sheet per animation, 256 × 256 cells
spritesheets/2x/swiftee_<anim>@2x.webp   the same at 512 × 512 (used when Swiftee is drawn larger than 300 device px)
extra/swiftee_measuring@1x|2x.webp       the tape-measure walk (screen 16), built from source/drafts/
extra/extra.json                         its frame data
atlas/swiftee.manifest.json              the index of every animation: grid, frame count, fps, start / loop / stop
source/drafts/swiftee-measuring-draft.png   the drawing the measuring walk is cut from
```

## How the sheets work

- Every frame of every animation sits in the same cell size with the character centred, so any frame can follow any
  other without a jump. Frames are deliberately not trimmed.
- Frames run left to right, then top to bottom. Frame `i` is at column `i % cols`, row `floor(i / cols)`.
- 20 fps. The manifest's `baselineY` (87.7 % down the cell) is the standing foot line.
- Expressions are full states: play `<state>_start` once, loop `<state>`, then play `<state>_stop` once
  (e.g. `wave_start` → `waving` → `wave_stop`). The manifest resolves the names.

## In the game

`js/swiftee-manifest.js` is a trimmed copy of the manifest, so the game also works when opened from disk. The game plays
the expressions named in `js/lesson-data.js` (each line's `m`) and in `CONFIG.swiftee`.

After changing any sheet, rebuild that copy:

```
node tools/build-swiftee-manifest.js
```

To rebuild the measuring walk from its drawing (4 columns × 2 rows), then rebuild the manifest:

```
node tools/build-measuring-sheet.js swiftee-assets/source/drafts/swiftee-measuring-draft.png 4 2
```
