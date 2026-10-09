# Trapezium Game — Game Flow & Mechanics

A guided, voice-led lesson on **trapeziums** for young learners. The mascot **Swiftee** narrates every screen while the
shape on an ice panel draws, moves and highlights itself in step with her words. The learner taps and drags at key
moments, then answers five scored checks.

- **41 screens** in one fixed sequence: 34 learning screens, 5 checks, 1 lesson-complete screen.
- **Navigation is manual**: the learner moves on with **Next** / **Back** (top right). Only the opening intro
  (Screens 1→2→3→4) and Screen 18 (after "Let's find out.") move on by themselves.
- Runs in the browser from local files (no server, no build step). Open `index.html`.

---

## 1. Learning outcomes

By the end the learner can:

1. Recognise a **quadrilateral** (a 4-sided polygon) and a **trapezium** (a quadrilateral with at least one pair of
   parallel sides).
2. Name the parts: the parallel sides are **bases**, the other two are **legs**.
3. Tell the three types apart: **scalene** (legs of different lengths), **isosceles** (equal legs) and **right**
   (one leg perpendicular to the bases — two 90° corners).
4. Use the angle rule: **angles on the same leg add up to 180°** (they are **supplementary**).

---

## 2. Screen layout

Every screen uses one 16:9 composition (1280 × 720 stage, scaled to the window):

| Area | Content |
|---|---|
| Left, on the snow | **Swiftee** and her **speech bubble** (text appears word by word with the voice) |
| Right | The **ice panel** — the shape, labels, answer options |
| Top left | **"Screen N of 41"** — opens a list of screen thumbnails to jump to any screen |
| Top right | **Back** / **Next** |

Exception: **Screen 34** (finale) hides the ice panel — Swiftee flies to the centre on her own.

**Colour language (kept on every screen)**

| Element | Colour |
|---|---|
| Shape outline / fill | hot pink / soft lilac |
| Parallel-side arrows | orange |
| Legs AD and BC | purple (#8e44d6) from Screen 5 to the end of the lesson. They remain purple through narration, animations, and interactions. Screens 1–4 use pink. Glows drawn along a leg use the same purple. |
| ∠A · ∠B · ∠C · ∠D | orange · purple · blue · yellow |
| Equal / correct | green |
| Name labels ("Trapezium", "Scalene trapezium"…) | cream box, teal border |

---

## 3. Full screen flow

### Part 1 — What is a trapezium? (Screens 1–15)

| # | Swiftee says | What happens |
|---|---|---|
| 1 | "Remember we learnt about quadrilaterals earlier." | Empty panel; a glowing pen draws the shape D→A→B→C→D, a glow settles, the fill fades in. Moves on by itself. |
| 2 | "Any polygon with 4 sides is called a quadrilateral." | Numbers **1–4** fly in from each side's direction (top, right, bottom, left). Moves on by itself. |
| 3 | "We can call it quadrilateral ABCD." | Letters **A, B, C, D** fly in from their corners exactly as each is spoken. Moves on by itself. |
| 4 | "This is a special type of quadrilateral." / "Let's see what makes it special." | As Swiftee starts speaking the shape grows to 120% (0.8 s), holds 0.5 s, and returns to its exact original size (0.8 s) — ease-in-out, from its centre. |
| 5 | "These two sides look like they will meet." | The two legs are emphasised. |
| 6 | "Let's extend them." | Legs AD and BC remain purple. |
| 7 | *(after)* "Woah! The sides meet." | Legs stay purple. **Automatic**: a glowing line runs D→A then turns into a dotted extension; then C→B. They meet at a point. |
| 8 | "Let's check the other pair of sides." | **Automatic**: each base glows from its middle outwards, then extends as dotted lines both ways. |
| 9 | "They do not meet." | The extended bases stay. |
| 10 | "This means the sides are parallel to each other." / *(voice)* "A B is parallel to C D." | The bases step out, then return one by one as "A B" and "C D" are spoken; parallel arrows appear. Label **AB ∥ CD**. |
| 11 | "So this quadrilateral has one pair of parallel sides." | — |
| 12 | "We call this a trapezium." | The shape zooms once on "trapezium". Label **Trapezium**. |
| 13 | "A quadrilateral with at least one pair of parallel sides is called a trapezium." | Legs AD and BC solid purple from the first frame. On "one pair…": AB then DC draw in and pulse together. |
| 14 | "The parallel sides are called bases." | AB then CD get a subtle highlight sweep; two **yellow** "Base" labels pop in one by one on "bases". Nothing else moves. |
| 15 | "The other two sides are called legs." | AD then BC (purple) get a subtle highlight sweep; two **purple** "Leg" labels pop in on "legs". |

### Part 2 — Types by sides (Screens 16–22)

| # | Swiftee says | What happens |
|---|---|---|
| 16 | "Let's measure the sides of this trapezium." | **Automatic**: Swiftee flies onto the shape and walks each side with a tape measure. Lengths appear outside the shape: **3 cm, 5 cm, 9 cm, 7 cm**. Once all four are measured she reacts: "Woah! All the sides of this trapezium are of different lengths." |
| 17 | "This type of trapezium which has sides of different lengths is called a scalene trapezium." | On "different": AB, BC, CD, DA glow purple one by one with their lengths (3, 5, 9, 7 cm). On "scalene": the **Scalene trapezium** label pops in (hidden until then). |
| 18 | "Look! Its legs are of different length too." / *(Swiftee laughs: "Hee hee hee!")* / "What if the legs were the same length?" / "Let's find out." | AD (7 cm) then BC (5 cm) glow with their lengths, then both together; Swiftee laughs (giggle sound, bounce, bubble wiggle); both legs glow together on "legs"; on "Let's find out." a chime and a tiny board pulse — then on to Screen 19 by itself. The shape and lengths do not change here. |
| 19 | "Let's change its shape a little." | — |
| 20 | "Drag vertex A so that both the legs are of equal length." | **Learner drags A** (see §4.3). Correct only when AD reads **exactly 5 cm**. *(after)* "Perfect! Both legs are equal." |
| 21 | "A trapezium where legs are of same length is called an isosceles trapezium." | Goes straight to the explanation (no repeat celebration). On "same": both legs reveal together, pulse, equal-leg ticks and both "5 cm" labels appear. On "isosceles": the **Isosceles trapezium** label pops in. |
| 22 | "We know all about the sides of a trapezium." | The isosceles shape glides into the angle shape (A 120°, B 105°, C 75°, D 60°); zooms once on "trapezium". |

### Part 3 — Angles (Screens 23–33)

| # | Swiftee says | What happens |
|---|---|---|
| 23 | "Let's look at its angles." | On "angles": arcs and values come in **A → B → C → D**, each from its corner. All values sit inside the shape. From here on, shown angles stay in place (no draw-in replay on later screens). |
| 24 | "Did you notice something?" | Angles already in place. After a short beat **120° (A)** and **60° (D)** get a soft warm glow; 105° and 75° fade back to 35%. |
| 25 | "∠A and ∠D add up to 180°." | The sum is built in the formula box. As the line starts: 120° and 60° glow, 105° and 75° stay faded, and **∠A + ∠D = ?** rises in. "add": copies of 120° and 60° lift off the shape (originals stay) and glide into the ∠A / ∠D places. "180": **180°** pops in; **120° + 60° = 180°** holds ~1.5 s, then the box settles to **∠A + ∠D = 180°**. |
| 26 | "That means they are supplementary angles." | A and D pulse; on "supplementary" copies of the 120° and 60° wedges fly together into a **straight 180°** angle; on "angles" the equation glows. |
| 27 | "What about ∠B and ∠C?" | **Practice question** (not scored): 105° and 75° keep a soft glow, 120° and 60° fade back (as on Screen 24); ∠B then ∠C focus, then glow together; answers slide in: **90° · 180° ✓ · 360°**. Correct shows **105° + 75° = 180°**. |
| 28 | "What if we change the shape of this trapezium?" | **Automatic**: the top corners glide through three trapeziums (angles update live, bases stay parallel), then settles with a gentle bounce. No other effects. |
| 29 | "Drag any vertex to change the angles. Notice the sum of angles." | A guide hand drags A on "change"; on "sum" each pair pulses with its sum panel. Then **free exploration**: any corner, as many times as wanted, no checking or success feedback. The two sums sit in a **fixed row** under the shape (equal boxes, only the values change); while a corner is dragged, its leg's two angles and their sum glow softly; a soft tick on release. The first real drag enables **Done** (centred under the sums); no feedback line, since the live sums already show it. Only **Done** moves on (once). |
| 30 | "No matter the shape, the angles always add up to 180°." | Two steps, one pair at a time (boxes fixed in place). **A and D** glow (B, C fade back) while the first box turns ∠A + ∠D into the measured values, shows "= ?", then resolves to **= 180°** with a soft halo. Focus moves to **B and C** (A, D fade back) and the second box does the same; its **= 180°** gets the stronger pulse. |
| 31 | "So in any trapezium, angles on the same leg always add up to 180°." | The general rule: the angle values on the shape turn into their names (**∠A, ∠B, ∠C, ∠D**, soft pop). Then the same two steps as Screen 30: **A and D** glow (B, C fade back) and the first box's **= 180°** pulses; focus moves to **B and C** and the second box's **= 180°** gets the stronger pulse. Boxes read ∠A + ∠D = 180° and ∠B + ∠C = 180°. |
| 32 | "Drag any vertex to make any angle 90°." | **Learner drags** until a corner reaches 90° (snaps when within 5°). *(after)* "Great job! One of the angles is a right angle." |
| 33 | "This type of trapezium where two of its angles are right angles is called a right angled trapezium." | A fixed right trapezium draws itself; "angles" draws A's 90° square, "right" lights the L at A then D's square, "called" brings in **Right trapezium**. Then the learner can **tap the 90° corners** to discover them. |

### Part 4 — Wrap-up (Screens 34–35)

| # | Swiftee says | What happens |
|---|---|---|
| 34 | "Great job! Now you know all about trapeziums." | Panel fades; Swiftee flies to the centre, hovers, with a warm glow, two small stars and sparkles. |
| 35 | "Let's recall what we learnt today." then the summary lines | **Animated summary** (§5): four big cards — Definition, Parts, Types, Angles — one at a time, explained by Swiftee with the card text in sync, each collected into a row, then a 2×2 recap. Nothing to tap. |

### Part 5 — Checks (Screens 36–40, scored) and end (41)

| # | Question | Answers (✓ = correct) | Interaction |
|---|---|---|---|
| 36 | "Which of these quadrilaterals is a trapezium? Look for one pair of parallel sides." | 4 shape cards; the yellow one ✓ | Tap a card. A wrong card traces its sides one by one to show no pair is parallel. |
| 37 | "What type of trapezium is this?" | Scalene · **Isosceles ✓** · Right | Bubble fades, shape glides up, answers come in one by one. |
| 38 | "In this trapezium, ∠A = 120°. What is the value of ∠D?" | 120° · **60° ✓** · 50° · 180° | Voice-synced A → AD → "?" at D; hint **120° + ? = 180°**; see §4.5. |
| 39 | "Label each trapezium with the correct type." / "Drag a label onto a shape, or tap a label and then tap a box." | Purple → **Scalene**, green → **Isosceles**, pink → **Right** | Drag labels to boxes, each drop checked instantly; see §4.6. |
| 40 | "In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC?" | 4 cm · **5 cm ✓** · 6 cm · 10 cm | Tap an answer. |
| 41 | "Amazing work! You know all about trapeziums now." | — | **Lesson complete** card with stars and **Play again**. |

---

## 4. Mechanics

### 4.1 Narration & synchronisation

- Swiftee's voice is the **browser's speech synthesis** (English voice, slightly raised pitch, rate 0.95). There are no
  recorded voice files; the spoken text comes from the lesson data.
- The bubble reveals **word by word** following the voice's word-timing events; voices without them use a paced
  fallback that never runs ahead of the voice.
- Animations are tied to **spoken words** ("cue words"), not timers — e.g. letters appear as each is said, the shape
  zooms on "trapezium". If a voice skips a cue, the animation still plays once when the line ends.
- Parts of the shape named in a line (∠A, AB, "legs", "bases", "vertex A") briefly grow as they are spoken.
- Swiftee changes expression per line (curious, happy, surprised, thinking…) and reacts to right/wrong answers.

### 4.2 Navigation

- **Next / Back** always available (except Back on Screen 1, Next on Screen 41).
- Next on an unfinished drag screen applies that drag's result first, so later screens still match the shape.
- **Screen list** (top left) jumps to any screen; the shape is rebuilt as if every earlier screen had been completed.
- Every screen change stops speech, sounds and animations and resets the screen's state; returning replays the screen.
- Automatic moves only: Screens 1→2→3→4 (one continuous intro) and Screen 18→19 after "Let's find out."

### 4.3 Shape dragging (Screens 20, 29, 32)

- Only the **x** position of a corner moves, so **AB stays parallel to DC** at all times.
- Limits stop the shape crossing itself or becoming unreadably thin (angles stay roughly 35°–145°; corners stay in the
  board).
- Side lengths and angles are **computed from the real coordinates** every frame (1 cm = 40 px); angle pairs always sum
  to 180°.
- Mouse and touch via pointer events with pointer capture.

| Screen | Goal | Correct when | Wrong / feedback |
|---|---|---|---|
| 20 | Make the legs equal by dragging A | AD reads **exactly 5 cm** (= BC) — succeeds the moment it does, A snaps to the exact spot | Release elsewhere: "AD is 5.2 cm. Keep dragging A until it shows exactly 5 cm."; dragging A to the right (wrong way) wiggles BC with the incorrect sound. One demo hand at the start. |
| 29 | Explore angles | Learner taps **Done** (enabled after the first real drag) | No wrong answer, no auto-complete, no confetti. Guide hand demo first; dragging is unlimited. |
| 32 | Make a corner 90° | A corner within 5° of 90° (snaps to exactly 90°) | Release short: "∠B is 98° now. Keep dragging until it shows 90°." |

### 4.4 Tapping

- **Screen 33**: after the voice, tap corners — a 90° corner pulses green; another says "That angle is not 90°. Look for
  the square corners."; finding both lights the vertical side with a soft sparkle.
- **Checks**: tap answer cards (Screens 27, 36, 37, 38, 40). A wrong card is marked and can't be tapped again.

### 4.5 Answer questions (Screens 27, 36, 37, 38, 40)

- Cards: glossy raised buttons that lift on hover and squash when pressed.
- **Correct**: card turns green, correct sound + confetti, Swiftee celebrates and says the praise line.
- **Wrong**: card turns red (orange on Screen 38) and shakes, incorrect sound, Swiftee gives that option's specific
  feedback; the learner tries again.
- Screen 38 extras: hint **120° + ? = 180°**; after 2 wrong answers it becomes **180° − 120° = ?**; the correct answer
  flies "60°" from the card to corner D and shows **120° + 60° = 180°**.

### 4.6 Drag & match (Screen 39)

- Each row is a "challenge strip": the shape on its own card, a small connector, then its answer slot.
- Labels arrive with the instruction ("…correct type") and can only be dragged then (or tap a label, then a box). The
  second line highlights the chips on "drag", the rows on "shape" and the tap flow on "tap"; then a ghost hand shows
  one drag. Waiting chips float gently.
- **Next stays disabled until all three are matched.**
- A held label makes the box under it glow blue.
- **Right drop**: snaps and locks, box and its row glow green, the shape repeats its clue.
- **Wrong drop**: box pulses orange, label wobbles back to the row, "Not that one. Look at the marks on each shape.";
  after two misses with the same label, its correct shape replays its clue.
- Shape clues (never the name): scalene — legs traced one after the other; isosceles — both legs glow together, ticks
  pop; right — right-angle squares draw, vertical leg glows.
- All three matched: shapes glow in turn, one success sound + confetti, "Brilliant! You labelled all three trapeziums."

### 4.7 Hints

- **Hand nudge**: after a period with no touch (usually 8 s; 3 s on Screens 29, 38, 39) a hand shows where to tap
  or which way to drag. On question screens all options pulse together — it never points at the answer.
- **Spoken idle hint**: after 9 s Swiftee says the screen's idle line (max 3 times per screen).

### 4.8 Scoring

- Only the five checks (Screens 36–40) are scored; Screen 27 is practice.
- A check counts as **right only if answered correctly on the first try**.
- Stars on the lesson-complete screen: **5 right → 3 stars**, **3–4 → 2 stars**, **0–2 → 1 star**.
- **Play again** restarts from Screen 1.

---

## 5. Screen 35 — animated summary

Built in `js/summary.js`. Explanation only — **nothing to tap**. One **big ice card** at a time fills the right of the
screen (glossy ice face, cyan glowing rim, white corner highlights); Swiftee peeks from behind its left edge. On each card
the shape pops in, Swiftee explains, the parts she names light up and the card's text pops in **on her words**; then the
card shrinks into the collection row below. A mini card appears in the row only once collected — no empty placeholders.

| Card | Swiftee says | Lights up / card text |
|---|---|---|
| Definition | "A trapezium is a quadrilateral with one pair of opposite sides parallel." / "These two sides are parallel. They never meet!" | sides pulse → "4 sides"; bases glow + arrows → "one pair of parallel sides"; "AB ∥ DC" |
| Parts | bases → legs → "four corners are called vertices" | yellow bases → "Bases"; purple legs → "Legs"; corner dots grow → "Vertices" |
| Types | scalene → isosceles → right (one shape changes) | unequal tick marks → "Scalene"; equal ticks → "Isosceles"; two 90° squares → "Right" |
| Angles | "…same leg add up to 180 degrees" / "On the other leg too…" / "…supplementary" | A 110° + D 70° → "110° + 70° = 180°"; B 120° + C 60° → "120° + 60° = 180°"; "Supplementary angles" |

Then the four collected cards open into a **2×2 recap** ("One pair of parallel sides." · "Bases, legs, vertices." ·
"Scalene, isosceles, right." · "Same-leg angles add to 180°."), Swiftee closes with "Wonderful! … You are ready for
the next adventure!" and one celebration plays. Next works at any time.

---

## 6. Feedback, sound & motion

**Sounds**

| Sound | Used for |
|---|---|
| Correct (recorded `assets/audio/correct.mp3`) | Every correct learner action, together with a confetti burst |
| Incorrect (recorded `assets/audio/incorrect.mp3`) | Every wrong action |
| Soft synthesised tones | Taps, pops, snaps; on Screen 35 also draw, shimmer, whoosh, morph, chime, tick, warm chime, flourish |

There is no background music.

**No check-mark icons.** Success is never shown with a ✓ / check-circle icon — only with soft green highlights,
glows, gentle bounces, small sparkles and the success sound. (Equal-side tick marks on shapes are geometry, not UI.)

**Motion principles**

- Animations explain the maths (sides that meet / never meet, wedges forming 180°, equal legs revealed together).
- Short eases (about 0.3–0.7 s), one emphasis at a time, no continuous blinking.
- Angle arcs and labels always stay **inside** the trapezium (arcs are clipped to the shape).
- `prefers-reduced-motion`: big movements are skipped or shortened; the lesson still works.

---

## 7. Shapes used

| Shape | Where | Corners / measures |
|---|---|---|
| Opening scalene trapezium | Screens 1–20 | AB 3 cm, BC 5 cm, CD 9 cm, AD 7 cm (height √24 cm) |
| Isosceles (after Screen 20) | Screens 20–21 | AB 7 cm, CD 9 cm, legs 5 cm |
| Angle shape | Screens 22–28 | A 120°, B 105°, C 75°, D 60° |
| Right trapezium | Screen 33 | A 90°, D 90°, B ≈ 118°, C ≈ 62° (vertical left leg) |
| Learner-made shapes | Screens 29–32 | whatever the learner drags (always a valid trapezium) |

---

## 8. Technical overview

| File | Role |
|---|---|
| `index.html` | The page and its template (screen markup bound to the engine's values) |
| `js/vendor/dc-runtime.js` | Template + rendering runtime (bundles React) |
| `js/vendor/gsap.min.js` | GSAP 3.12.5 animation library (local copy) |
| `js/config.js` | Tuning values: scale, shapes, drag limits, snapping, timings, sounds, stars |
| `js/lesson-data.js` | **Every screen as data**: lines, cue words, tasks, options, feedback, per-screen options |
| `js/game-engine.js` | The game: narration, geometry, drags, checks, scoring, navigation, rendering values |
| `js/motion.js` | All choreographed animations (GSAP); reset on every screen change |
| `js/summary.js` | Screen 35 interactive summary (cards, questions, collection, recap) |
| `js/swiftee.js`, `js/walker.js` | Swiftee's expressions and the Screen 16 walking/measuring sprite |
| `js/confetti.js`, `js/snowfall.js` | Success confetti and background snow |
| `css/game.css` | Styles and small state transitions |
| `tools/build-thumbs.js` | Regenerates the screen-list thumbnails (`assets/thumbs/`) in headless Chrome |

**Editing content**: most changes are made in `js/lesson-data.js` — the text of a line (`t`), what is spoken if different
(`s`), Swiftee's expression (`m`), cue words (`cueAt`, `pulseAt`, `growAt`, …), the task (`task`), answer options
(`opts` with `ok` / `fb`). The comment block at the top of that file lists every option. After adding, removing or
reordering screens, run `node tools/build-thumbs.js` to refresh the thumbnails.

**Known limits**

- Voice depends on the browser's installed speech voices (quality and accent vary by device).
- Swiftee's poses come from her sprite sheet; gestures not in it (e.g. wing raise, looking sideways) are not available.
