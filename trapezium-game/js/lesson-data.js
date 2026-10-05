// =====================================================================
// LESSON — every learning state and check, in play order.
//   lines: narration (t = on-screen text, s = optional spoken text, chips = labels shown with the line,
//          m = Swiftee's expression while saying it; default talking. reactions in CONFIG.swiftee)
//   task:  what the learner must do before Next unlocks (extLegs, extBases, tapBases, tapLegs, measure,
//          dragB, tapAngles, dragD90, tapAD, dragD, dragC); hint = how-to Swiftee says if the learner stalls (unless idle is set)
//   after: lines played once the task is done; autoNext: advance by itself after `after`
//   layout: 'spotlight' centres and enlarges the shape, moves Swiftee to the right (pose = held expression)
//   f:     board display flags (met = legs extended to where they meet, legHint, baseExt, par, legsPurple, legLen, ticks, arcs, right, eq)
//   cfu:   check number; opts (ok / fb feedback), ok = praise line
// =====================================================================
const LESSON = {
  steps: [
    { id: 'intro', lines: [{ m: 'waving', t: "Let's take a closer look at what Popo caught." }] },
    { id: 'meet', lines: [{ m: 'thinking', t: "Hmm… these sides look like they'll meet." }], f: { legHint: 1 } },
    { id: 'extend', lines: [{ m: 'curious', t: "Let's extend them and check!" }], task: 'extLegs', hint: 'Tap each slanted side to extend it',
      after: [{ m: 'surprised', t: 'They meet!' }] },
    // spotlight: no words. The shape moves to centre stage and glows; Swiftee, on the right, leans in and points at it
    { id: 'spot', lines: [], layout: 'spotlight', pose: 'curious', f: { met: 1 } },
    { id: 'other', lines: [{ m: 'curious', t: 'What about the other pair?' }], task: 'extBases', hint: 'Tap the top and bottom sides to extend them' },
    { id: 'parallel', lines: [{ m: 'surprised', t: "They don't meet. They're parallel!" }], f: { baseExt: 1 } },
    { id: 'abcd', lines: [{ t: 'So, AB is parallel to CD.', chips: [{ t: 'AB ∥ CD', k: 'white' }] }], f: { par: 1 } },
    { id: 'def', lines: [{ t: 'A quadrilateral with one pair of parallel sides is called a trapezium.', chips: [{ t: 'Trapezium', k: 'gold' }] }], f: { par: 1 } },
    { id: 'bases', lines: [{ t: 'The parallel sides are called the bases.' }], task: 'tapBases', hint: 'Tap the two parallel sides',
      after: [{ m: 'happy', t: 'Yes! These are the bases.' }], f: { par: 1 } },
    { id: 'legs', lines: [{ t: 'The other two sides are called the legs.' }], task: 'tapLegs', hint: 'Tap the two legs',
      after: [{ m: 'happy', t: 'Well done! These are the legs.' }], f: { par: 1 } },
    { id: 'measure', lines: [{ m: 'curious', t: "Let's measure the legs." }], task: 'measure', hint: 'Drag the ruler onto a leg, or tap a leg', idle: 'Drag the yellow ruler onto a slanted side, or just tap a leg.', f: { par: 1, legsPurple: 1 } },
    { id: 'scalene', lines: [{ t: 'The legs have different lengths.' }, { t: 'This is a scalene trapezium.', chips: [{ t: 'Scalene trapezium', k: 'gold' }] }],
      f: { par: 1, legsPurple: 1, legLen: 1 } },
    { id: 'equal', lines: [{ m: 'curious', t: 'Can you change it so both legs are equal?' }], task: 'dragB', hint: 'Drag point B along the top side', after: [{ m: 'happy', t: 'Perfect! Both legs are equal.' }], autoNext: 1,
      f: { par: 1, legsPurple: 1, legLen: 1 } },
    { id: 'iso', lines: [{ m: 'happy', t: 'Now the legs are equal!' }, { t: 'This is an isosceles trapezium.', chips: [{ t: 'Isosceles trapezium', k: 'gold' }] }],
      f: { par: 1, legsPurple: 1, legLen: 1, ticks: 1 } },
    { id: 'angles', lines: [{ m: 'curious', t: "Now, let's measure its angles." }], task: 'tapAngles', hint: 'Tap each corner to measure its angle', f: { par: 1, ticks: 1 } },
    { id: 'make90', lines: [{ m: 'curious', t: 'Can you make ∠A exactly 90°?' }], task: 'dragD90', hint: 'Drag point D along the bottom side', after: [{ m: 'happy', t: 'Perfect! ∠A is exactly 90°.' }], autoNext: 1, f: { par: 1, arcs: 'A' } },
    { id: 'right', lines: [{ m: 'surprised', t: 'Look! We made another right angle too!' }, { t: 'This is a right trapezium.', chips: [{ t: 'Right trapezium', k: 'gold' }] }],
      f: { par: 1, right: 1 } },
    { id: 'add', lines: [{ m: 'thinking', t: 'What happens if we add these two angles?' }], task: 'tapAD', hint: 'Tap ∠A and ∠D to add them',
      after: [{ m: 'surprised', t: 'They add up to 180°!' }], f: { par: 1, right: 1, arcs: 'AD' } },
    { id: 'change', lines: [{ m: 'curious', t: 'What if we change the shape?' }], task: 'dragD', hint: 'Drag point D and watch the angles',
      after: [{ m: 'surprised', t: 'The angles changed… but their sum is still 180°!' }], f: { par: 1, arcs: 'AD', eq: 'AD' } },
    { id: 'otherleg', lines: [{ m: 'thinking', t: 'Does the same thing happen on the other leg?' }], task: 'dragC', hint: 'Drag point C and watch the angles',
      after: [{ m: 'happy', t: 'This pair also adds up to 180°!' }], f: { par: 1, arcs: 'BC', eq: 'BC' } },
    { id: 'rule', lines: [{ t: 'Angles on the same leg of a trapezium add up to 180°.', chips: [{ t: '∠A + ∠D = 180°    ∠B + ∠C = 180°', k: 'gold' }] }],
      f: { par: 1, arcs: 'ABCD' } },
    { id: 'total', lines: [{ t: 'A trapezium is a quadrilateral, so the sum of all its angles is 360°.',
      chips: [{ t: '180° + 180° = 360°', k: 'white' }, { t: '∠A + ∠B + ∠C + ∠D = 360°', k: 'gold' }] }], f: { par: 1, arcs: 'ABCD' } },
    { id: 'cfu1', cfu: 1, idle: 'Look for the shape with exactly one pair of parallel sides.', hint: 'Check 1 of 5 · Which one is a trapezium?',
      lines: [{ m: 'curious', t: 'Which of these quadrilaterals is a trapezium? Look for one pair of parallel sides.' }],
      ok: 'Yes! Shape A has exactly one pair of parallel sides.',
      opts: [
        { id: 'A', ok: true },
        { id: 'B', fb: 'Shape B has two pairs of parallel sides. That makes it a parallelogram.' },
        { id: 'C', fb: 'Shape C has no parallel sides at all.' },
        { id: 'D', fb: 'Shape D has two pairs of parallel sides. That makes it a rectangle.' }
      ] },
    { id: 'cfu2', cfu: 2, idle: 'Look closely at the marks on the legs.', hint: 'Check 2 of 5 · Which type of trapezium?', optTop: 376,
      lines: [{ m: 'curious', t: 'What type of trapezium is this?' }],
      ok: 'Right! The marks show its legs are equal, so it is an isosceles trapezium.',
      opts: [
        { id: 's', t: 'Scalene trapezium', fb: 'Look at the little marks on the legs. They tell us the legs are equal.' },
        { id: 'i', t: 'Isosceles trapezium', ok: true },
        { id: 'r', t: 'Right trapezium', fb: 'There are no right angles in this shape. Look at the legs instead.' }
      ] },
    { id: 'cfu3', cfu: 3, idle: 'Remember, angles on the same leg add up to 180°.', hint: 'Check 3 of 5 · Find the missing angle', optTop: 380,
      lines: [{ m: 'curious', t: 'In this trapezium, ∠A = 68°. What is the value of ∠D?' }],
      ok: 'Correct! 68° + 112° = 180°.',
      opts: [
        { id: 'a', t: '68°', fb: 'Angles on the same leg add up to 180°, so ∠D is not equal to ∠A.' },
        { id: 'b', t: '112°', ok: true },
        { id: 'c', t: '122°', fb: 'Check your subtraction: 180° − 68° = ?' },
        { id: 'd', t: '180°', fb: '180° is the sum of ∠A and ∠D, not ∠D by itself.' }
      ] },
    { id: 'cfu4', cfu: 4, idle: 'Drag a label onto a shape, or tap a label and then tap a box.', hint: 'Check 4 of 5 · Drag each label to its shape',
      lines: [{ m: 'curious', t: 'Label each trapezium with the correct type.' }],
      ok: 'Brilliant! You labelled all three trapeziums.' },
    { id: 'cfu5', cfu: 5, idle: 'BC is a leg. What do you know about the legs of an isosceles trapezium?', hint: 'Check 5 of 5 · Find the missing side', optTop: 376,
      lines: [{ m: 'curious', t: 'In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC?' }],
      ok: 'Yes! In an isosceles trapezium the legs are equal, so BC = 5 cm.',
      opts: [
        { id: 'a', t: '4 cm', fb: 'BC is a leg. In an isosceles trapezium, both legs are equal.' },
        { id: 'b', t: '5 cm', ok: true },
        { id: 'c', t: '6 cm', fb: '6 cm is the top base AB. BC is a leg, like AD.' },
        { id: 'd', t: '10 cm', fb: '10 cm is the bottom base CD. BC is a leg, like AD.' }
      ] },
    { id: 'end', end: 1, lines: [{ m: 'celebrating', t: 'Amazing work! You know all about trapeziums now.' }] }
  ],
  cfu4: {
    labels: [{ id: 'iso', t: 'Isosceles trapezium' }, { id: 'right', t: 'Right trapezium' }, { id: 'scal', t: 'Scalene trapezium' }],
    slots: [{ id: 's0', ans: 'scal', y: 140 }, { id: 's1', ans: 'iso', y: 244 }, { id: 's2', ans: 'right', y: 348 }]
  }
};
