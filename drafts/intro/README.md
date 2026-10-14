# Draft: the cabin intro

The intro that used to play between the front page and screen 1. It's taken out of the game for launch and kept here
so it can come back. This folder is outside `trapezium-game/`, so it isn't deployed.

After Play, the camera pushes in on Swiftee's snowy cabin through a gust of snow. The doorbell rings and the door
swings open. Swiftee hops out and says hello in four lines ("Oh, hello there! I'm Swiftee." … "It's called a
trapezium. Let's go and explore it!"), then flies off as the camera pulls back onto the lesson's landscape. Skip ends
it at once.

```
js/intro.js                      the intro (window.Intro: play(engine, done), finish(), stop())
css/intro.css                    its styles (cut from css/game.css)
assets/images/cabin-door-*.webp  the closed and open cabin pictures
assets/images/cabin-door-*.png   masks for the door leaf and the doorway
assets/audio/doorbell.m4a, door-open.m4a, sleigh-bells.m4a
```

## Putting it back

1. Copy the files back into the game: `js/intro.js` into `trapezium-game/js/`, the images into
   `trapezium-game/assets/images/`, the sounds into `trapezium-game/assets/audio/`. Paste `css/intro.css` at the end
   of `trapezium-game/css/game.css`.
2. `index.html`: load it after `summary.js` with `<script src="js/intro.js"></script>`, and add its container after
   the summary's `sum-root` block:
   ```html
   <sc-if value="{{showIntro}}" hint-placeholder-val="{{ false }}">
   <div class="intro-root"></div>
   </sc-if>
   ```
3. `js/config.js`: add the sounds and the switch:
   ```js
   sounds: { good: ..., bad: ...,
     dingdong: 'assets/audio/doorbell.m4a', door: 'assets/audio/door-open.m4a', jingle: 'assets/audio/sleigh-bells.m4a' },
   flow: { ..., intro: true },
   ```
4. `js/game-engine.js`:
   - In `coverGo()`, start the intro instead of screen 1:
     `setTimeout(() => (CONFIG.flow.intro && window.Intro ? this.startIntro() : this.start()), 220);`
   - Add the two hooks:
     ```js
     startIntro() {
       this.setState({ intro: true, line: '', reveal: 0, bubOff: false });
       this.pose(CONFIG.swiftee.idle);
       this.setState({}, () => Intro.play(this, () => this.endIntro()));
     }
     endIntro() {
       if (!this.state.intro) return;
       this.cancelSpeech(); this.narrTok++;
       this.setState({ intro: false });
       this.start();
     }
     ```
   - `componentWillUnmount()`: call `if (window.Intro) Intro.stop();` first.
   - `renderVals()`:
     - `showCover: (!s.started && !s.intro) || !!s.coverLeaving, showIntro: !!s.intro`
     - add `' intro'` to `sceneCls` while `s.intro`
     - keep the snowflake bar hidden while `s.intro`
   - The idle antics should also wait while `this.state.intro`.
