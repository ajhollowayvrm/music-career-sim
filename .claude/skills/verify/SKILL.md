---
name: verify
description: Build and drive From the Bottom Up in a real mobile viewport to see a change working. Use when verifying any change to the game UI or systems.
---

# Verify — From the Bottom Up

The target is an iPhone web app. **Verify at 440×956 (iPhone 17 Pro Max portrait), not desktop.**
A change that looks right at 1280px and breaks at 440px is a failed change here.

## Build and serve

```bash
npm run build                          # tsc + vite; PWA output confirms the config loaded
npx vite preview --port 4181 &         # serves at /music-career-sim/, NOT /
curl -s -o /dev/null -w "%{http_code}" http://localhost:4181/music-career-sim/
```

**The base path is `/music-career-sim/`.** Hitting `/` gives a 404 and looks like a broken build.

A successful build prints a `PWA v1.x … precache N entries` block. **If that block is missing, the
PWA plugin didn't run** — check no stray `vite.config.js` exists next to `vite.config.ts`, because
Vite resolves `.js` first and silently shadows the `.ts` config with no error.

## Drive it

Playwright MCP. Resize first, then navigate:

```
browser_resize 440 × 956
browser_navigate http://localhost:4181/music-career-sim/
```

The whole app is client-side with no persistence, so every reload is a clean slate — no fixture
setup, no teardown.

### Driving the creation flow fast

Clicking through the interview one tool call at a time is slow. `browser_evaluate` with real
`.click()` calls drives the actual React handlers (this is still the real UI, not import-and-call):

```js
// Selectors that matter
'.creation-actions .btn-primary'   // Continue / Begin
'.creation-actions .btn-ghost'     // Back
'.origin-card'                     // origin cards
'.answer'                          // interview answers
'.tick-btn'                        // jump to question N
'.talent-row'                      // one per talent; has [aria-label^="Raise"|"Lower"] + .pips
'.genre'                           // genre chips
'.points'                          // points-left copy
'.leaning-read'                    // the taste prose
'.portrait-lines li'               // the trait prose on the confirm screen
'[role=status]'                    // "Question 4 of 7. 3 answered."

// The loop (§5)
'.day-btn'                         // a day row; aria-expanded says if its picker is open
'.pick'                            // a route inside an open day picker
'.day-energy-fill'                 // projected end-of-day energy (style.width)
'.day.is-spent'                    // days the plan burns you on
'.board-warn' / '.board-note'      // the warning / the neutral read
'.board-clear'                     // clear the week
'.log-entry' / '.log-report'       // resolved days
'.ledger-row' / '.summary-read'    // week summary
```

Reload between runs for a clean slate — chaining runs via "Back to the start" inside one
`browser_evaluate` is where the driving scripts break.

Two traps when driving the week board: a day row **toggles**, so check
`aria-expanded !== 'true'` before clicking it open or you'll close the one you just opened; and the
resolve screen's button becomes "How the week went" on the last day, so a naive 7-click loop sails
straight past the summary into the next week's board.

Typing into the name field needs React's value setter, not `input.value =`:

```js
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
setter.call(input, 'Name'); input.dispatchEvent(new Event('input', { bubbles: true }))
```

## What's worth checking

- **No numbers on screen after creation** (pillar 2). Traits and leanings surface as prose only.
  Talent pips at creation are the sanctioned exception (§2 asks for a point-spend).
- **No `§n` refs in player-facing copy.** Brief references belong in comments. Quick check:
  `/§\d/.test(document.querySelector('.creation-body').innerText)` should be false.
- **Tap targets ≥44px**, and no horizontal overflow:
  `document.documentElement.scrollWidth > window.innerWidth` must be false.
- **Safe areas.** `env()` is 0 in a desktop browser, so override the vars to simulate an iPhone:
  `:root{--safe-top:59px;--safe-bottom:34px}` — content must still clear both.

### After touching the loop

Run the balance probe — it's a read plus one hard gate (the board's burnout warning must equal what
the week actually burns; those drifted apart once already):

```bash
npx -y esbuild tools/week-balance.ts --bundle --platform=node --format=esm \
  --outfile=/tmp/week-balance.mjs && node /tmp/week-balance.mjs
```

Then drive it: plan an overbooked week (7 action days) and confirm the board **warns but does not
block**, and that the count it warns with is the count the week delivers. Plan a sane week (3 shifts,
2 music, 2 rest) and confirm no warning. Check the day reports carry a self-read clause that varies
with the character's Confidence — that's §3's perception filter, and it's the thing most likely to
silently stop working.

### After touching the interview or traits

Run the trait-range check — a trait that can't reach an extreme is invisible in play, because
pillar 2 hides the numbers:

```bash
npx -y esbuild tools/trait-range.ts --bundle --platform=node --format=esm \
  --outfile=/tmp/trait-range.mjs && node /tmp/trait-range.mjs
```

Then drive a deliberate **purist** run and a deliberate **sellout** run and read the portrait on the
confirm screen. They must describe recognisably different people; if one pole reads blank, a trait
has lost its range.

## Gotchas found the hard way

- Origin re-selection **resets the talent spread** on purpose (a different origin is a different
  head-start). Verify points return to 10, not that the old spread survives.
- The interview's Back walks one question at a time; the progress ticks are the jump.
- HTML entities (`&rsquo;`) in `src/game/*.ts` strings render **literally** — those are plain
  strings, not JSX. Use a real apostrophe in a double-quoted string.
- Outcome copy must not contradict its own mechanic. Rest always restores energy whatever the roll,
  so a bad rest day is about how it *felt* (restless), never "it did not help".
- A line that prints every day of a burnt week needs variants. One fixed sentence seven times reads
  as a bug, not as exhaustion.
- `npm run build 2>&1 | tail` reports **tail's** exit code, not tsc's. Redirect to a file and check
  `$?` or a type error looks like a green build.
