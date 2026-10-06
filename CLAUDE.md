# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`cassette-player/` is a browser music player styled as a cassette tape deck. It is plain HTML/CSS/JS: no build step, no package manager, no dependencies, no tests. The user communicates in Spanish; UI text and code comments are in Spanish.

## Running

Open `cassette-player/index.html` directly in a browser (on Windows: `Start-Process cassette-player\index.html`). No server is needed. Songs are local files the user picks or drags in; they are held as `blob:` object URLs in memory only and are lost on reload. Node.js is not installed on this machine, so there is no CLI syntax check; verify in the browser console.

## Architecture

**State is expressed as CSS classes on `#deck`; CSS does all the animation.** `app.js` never animates directly. It toggles:
- `.tape-in`: the cassette slides down from the space above the deck into the bay.
- `.door-closed`: the glass door rotates shut (hinged at the bottom, `rotateX`).
- `data-mode` = `empty | loading | stop | play | pause | ff | rew`: drives reel spin (`animation-play-state`, faster duration for ff/rew, reversed for rew), key "latched" styling, and the LCD blink.

**Timing is shared between CSS and JS.** `INSERT_MS` and `DOOR_MS` in `app.js` must match `--insert-ms` and `--door-ms` in `styles.css`. JS awaits these delays (`wait()`) instead of listening for `transitionend`.

**All animated actions are serialized through `enqueue()`**, a promise chain. This matters because changing tracks is eject → swap `audio.src` and label → insert → play. Any new command that touches the tape or deck state should go through `enqueue` so it can't overlap a running animation.

**The Web Audio graph is created lazily in `ensureAudioGraph()`**, which must be called *synchronously* inside a user-gesture handler (before `enqueue`), because of browser autoplay policy. The `<audio>` element feeds `createMediaElementSource` → destination plus a channel splitter → two analysers for the L/R VU meter.

**A single `requestAnimationFrame` loop (`frame()`)** updates everything continuous: the tape-pack radii in the SVG (`#packL`/`#packR`, area-preserving between `PACK_MIN` and `PACK_MAX`), the LCD time, the seek slider fill, and the VU segments.

**Layout coupling:** the cassette SVG (viewBox 400×250) lives inside `.cassette-slot` within `.bay`. Its "out" position is a `translateY` computed from `--bay-w`, and `.stage-space` above the deck is sized from the same variable so the floating cassette has room. If you change the bay size or aspect ratio, adjust both. The `.spindle` positions in `.bay-back` are hand-aligned to the SVG hub centers (x=130/270, y=115).

The playlist is styled as the tape's paper J-card (`.jcard`), beside the deck on wide screens. It uses `contain: size` so a long track list doesn't stretch the grid rows; the `<ol>` scrolls instead. Below 1100px the layout is a single column and `contain` is removed.

**UI text is bilingual (Spanish/English).** All strings live in `cassette-player/i18n.js` (`window.I18N.es` / `.en`, loaded before `app.js`). Static HTML text is tagged with `data-i18n` (textContent), `data-i18n-aria` (aria-label) and `data-i18n-title` (title); `applyLanguage()` in `app.js` swaps them and re-renders JS-set text (LCD status via `statusText()`, the empty cassette label and LCD hint via `tr()`). New user-visible text must be added to both languages in `i18n.js`, never hardcoded. The choice persists in `localStorage` (`tapedeck-lang`); the default comes from the browser language.

Slider fills use a `--p` CSS variable set by `setRangeFill()`. The cassette label stripe color comes from `--stripe` on `#deck`, taken from the `STRIPES` palette indexed by track number.
