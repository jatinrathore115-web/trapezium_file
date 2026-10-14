# Swiftee's sprite sheets

The winter scarf is a generated transparent accessory in `../assets/images/winter-scarf-flat.png`,
drawn over the original frames by `../js/winter-scarf.js`. It follows the frame's
neck position and rotation at both resolutions, including the tape walk and all
eight protractor poses. The still-image fallback also wears it. Original sheets,
timings, lip-sync and ping-pong playback are preserved.

The scarf uses simple cartoon shading in the deep Christmas red of the front-page banner, a chunky collar just
below the beak whose ends tuck in at the body's edge, and a short tail. `winter-scarf.js` composites it with the bird before applying scene opacity,
and restores the original foreground wings above it using `scarf-occlusion.js`.
This avoids painting the scarf across raised wings or fading it as a separate
layer. Blinking uses a fixed neck anchor so eyelid changes do not move the scarf.
Rebuild the foreground registrations with `python3 tools/build-scarf-occlusion.py`
(Pillow); repeated masks are stored once. The original textured scarf is retained
as an unused source reference.

Artwork: built-in imagegen, using `swiftee.webp` as the style reference and the
previous scarf as the redesign target. Prompt: a transparent scarf-only sprite
in Swiftee's flat 2D cartoon style, coral-red fill, dark-red cel shadow, off-white
paired stripes and simple snowflake, a narrow curved collar with rounded ends
and a short downward fringed tail; no knit texture, gloss, outlines or drop shadow.

`../js/scarf-anchors.js` registers 1,635 frames across 83 sprite clips, the
protractor sheet and the still image. After changing source artwork or rebuilding
the manifest, run `python3 tools/build-scarf-anchors.py` from the game directory
(requires Pillow). The builder reads images to locate the mint cheeks; it does
not modify them. Peeping clips clip the scarf behind the wall; frames with no
visible face have no scarf. Left-facing protractor poses mirror the accessory.

Open `../qa/animations.html` to play or scrub all 84 animated clips at 1x or 2x.
Some original start/stop sheets contain doubled, translucent poses. Their scarf
registration interpolates between clean endpoints; the game's existing mascot
player already skips those legacy transitions and cross-fades between loops.

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
