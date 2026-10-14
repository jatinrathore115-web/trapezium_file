# Voice-over

Every line Swiftee can say has a recorded clip in `assets/vo/` (Ogg Opus, 32 kbps, mono). The words in the dialogue box
appear in time with the clip, and Swiftee's beak moves only while it plays.

| File | What it is |
|---|---|
| `assets/vo/voNNN.ogg` | one clip per line, nothing else |
| `tools/vo_script.json` | every line: `id`, `line` (as shown), `spoken` (as said), `devanagari` (what the voice was given) |
| `js/vo-lines.js` | generated map, line as shown → `[clip, seconds]`; do not edit by hand |
| `js/voice.js` | the player |
| `tools/vo_build.js` | lists the lines, writes studio batch files, turns the studio's zips into clips and the map, writes the table below |

## The studio and its settings

The clips come from **Ai Wala Human By Aamir**
(https://ai-wala-human-by-aamir-809572708022.asia-southeast1.run.app/), tab *Batch Generation*:

- **Language: Hindi.** The studio first rewrites each line in the language's script with `gemini-3-flash-preview`, then
  speaks it with `gemini-3.1-flash-tts-preview`. English written in Devanagari ("We call this a trapezium." →
  "वी कॉल दिस ए ट्रैपीजियम।") is spoken as English with an Indian accent, and the words stay English.
- **Voice:** Female Teacher (Standard): Gemini voice Kore with a clear North Indian accent.
- **Format:** MP3 from the studio (24 kHz, mono). The game ships Ogg Opus, 32 kbps, mono.
- **Batch file:** an `.xlsx` with a header row and two columns, `filename` (the clip id) and `text` (the spoken form).
  Text Column = `text`, Filename Column = `filename`, Start Row = 1, Quantity = the number of rows, Concurrency =
  3 (Recommended).

**Rate limit.** The studio's proxy allows 100 requests per 15 minutes per IP (headers `ratelimit-limit`,
`ratelimit-remaining`, `ratelimit-reset`; over the limit it answers `429 Too many requests from this IP`). Each line takes
two requests, so one window voices about 48 lines. A big batch goes in chunks of `floor(remaining / 2) − 1` rows (at most
48), waiting out `ratelimit-reset` plus 30 s between chunks.

## The spoken form

The panel keeps the written line; only what the voice is given is rewritten (`spoken` in `tools/vo_script.json`):

- Symbols in words: `∠A` → "angle A", `°` → "degrees", `=` → "equals", `+` → "plus", side names spaced (`AB` → "A B"),
  `cm` → "centimetres". Commas group an equation: "120° + 60° = 180°" → "One hundred and twenty degrees, plus sixty
  degrees, equals one hundred and eighty degrees."
- **Numbers as English words** ("one hundred and eighty", "five point one"). The script step sometimes *translates* a
  digit into Hindi (3 → तीन), and then the voice says it in Hindi.
- "Woah" is said "Whoa"; screen 3 spells the name out ("quadrilateral, A, B, C, D").
- Sentences start with a capital, also when they start with a number.

**Devanagari check.** After a run, each line's Devanagari (logged from the script step) is compared with its spoken form:
no Hindi number words (एक दो तीन … पचास सौ, and compounds like सैंतीस), no English word translated rather than
transliterated, names and ordinals read correctly. Pace (characters of the spoken form ÷ seconds) should be about 6–22;
anything outside is listened to. A flagged line gets a corrected spoken form and is generated again on its own.

## Conversion

`node tools/vo_build.js build voiceovers_batch.zip [more.zip]` does it all, and is safe to run again:

1. reads the MP3s from the zips (only ids that are in `tools/vo_script.json`);
2. in headless Chrome: decodes each one at 48 kHz, trims the silence at both ends (keeping 60 ms), and encodes Opus at
   32 kbps mono with WebCodecs;
3. writes the packets into an Ogg file (RFC 7845): granule positions count 48 kHz samples, the pre-skip is the encoder's
   delay, and the last page's granule trims the padding;
4. measures every clip and regenerates `js/vo-lines.js`, lists any line that has no clip yet, and deletes clips no line
   uses.

It needs Node 22+ and Chrome or Edge (set `CHROME=/path/to/chrome` if it isn't found). No ffmpeg.

## How the game uses the clips

The hook is in `say()` (`js/game-engine.js`), the one function that puts Swiftee's lines in the dialogue box, so every
line (screen lines, feedback, idle reminders, the summary cards) goes through it.

- **Lookup** by the exact text the bubble shows (its line breaks as spaces). A voice-only line (`keep`) is looked up by its
  spoken text. Screen 33's "∠A is 120° now. Keep dragging until it shows 90°." is played as two clips back to back
  ("∠A is" + "120° now. Keep dragging…"), so all 376 corner/angle combinations need only 98 clips.
- **The clip is the clock.** Words appear by their share of the spoken line (numbers count as their spoken words), on the
  audio's own `currentTime`, finishing about 0.35 s before the clip ends. Cue words (`cueAt`, glows, pulses, chips) fire
  as their word appears; screen 3's corner letters fly in as each letter is said.
- **One `<audio>`**, unlocked by the Play tap on the front page (played muted, then paused), so tablets allow it.
- **Moving on** waits for the voice: a line counts as finished when its clip ends, then the usual `lineGapMs` pause.
  Safety net: a clip that never starts (4 s) or stops moving (2 s) ends its line, so nothing can stall.
- **Stopping.** A new line stops the previous clip; so do Next, Back, a screen jump and a restart.
- **Repeats.** The question put back after feedback is shown, not said again. Idle reminders are said.
- **No ducking:** the game has no music or ambience.
- **Prefetch.** After Play, every clip is fetched quietly, one at a time.
- **Off.** With no Ogg Opus support (`canPlayType('audio/ogg; codecs="opus"')` empty), with `?vo=0`, or if a clip is
  missing or `play()` is refused, the line falls back to what the game did before: the device's speech voice, or a timed
  reveal with no voice. Nothing crashes.
- **Testing speed:** `?vorate=2` plays the clips faster (0.5–4).

## Remaking a line

1. Edit its `spoken` in `tools/vo_script.json` (or, for a new or changed line, run `node tools/vo_build.js script` first:
   new lines get the next id and a spoken form to check).
2. `node tools/vo_build.js xlsx batch.xlsx vo123` (no ids: every line without a clip), then run `batch.xlsx` in the studio
   with the settings above and download the zip.
3. `node tools/vo_build.js build voiceovers_batch.zip`, then `node tools/vo_build.js doc` to refresh the table below.

## All clips

<!-- table:start -->
<!-- table:end -->
