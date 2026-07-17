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

// Songs (§7)
'.loop-tabs .tab'                  // Week / Songs — ONLY rendered while planning
'.songs .btn-primary'              // start a new song
'.song-form-actions .btn-primary'  // confirm the new song
'.song-card' / '.song-card.is-out' // bench / released
'.song-read'                       // progress or fit prose
'.song-btn'                        // call it written / put it out / bin it
'.leaning-read'                    // fit prose in the new-song form

// Fame (§4)
'.vital-following'                 // the figure in the status bar
'.standing'                        // the summary block: Following + Cred prose
'.standing-gap'                    // the reach-vs-respect gap line (§6)
'.backlash'                        // a release that read as selling out

// Gigs (§9)
'.venue' / '.venue-day'            // a room; its day buttons (booking)
'.venue-locked'                    // why a room won't have you
'.booked-line'                     // what's booked this week
'.setlist-item'                    // act one: the set, in order
'.genre' (inside .gig)             // the setlist picker reuses the chip class
'.crowd-fill'                      // the meter — read style.width, never text
'.beat'                            // act two: what just happened
'.gig-event' / '.answer'           // an in-set event and its handlings
```

Reload between runs for a clean slate — chaining runs via "Back to the start" inside one
`browser_evaluate` is where the driving scripts break.

Traps when driving the loop:

- A day row **toggles** — check `aria-expanded !== 'true'` before clicking it open, or you'll close
  the one you just opened.
- Resolving a week takes **eight** clicks, not seven: seven days, then "How the week went". Loop
  until `.ledger` exists rather than counting.
- **The tabs only exist while planning.** If a script left you on the summary or mid-week,
  `.loop-tabs` is absent and every tab query returns null. Click through to planning first.

Typing into the name field needs React's value setter, not `input.value =`:

```js
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
setter.call(input, 'Name'); input.dispatchEvent(new Event('input', { bubbles: true }))
```

## What's worth checking

- **No numbers on screen after creation** (pillar 2). Traits, leanings, song quality and **Cred**
  surface as prose only. Three sanctioned exceptions, each because the world genuinely counts it for
  you: talent pips at creation (§2 asks for a point-spend), money (§12's game-over factor), and
  Following (§4/§14 — an aggregate number every platform shows you). **Cred must never appear as a
  number or a bar** — that's the whole asymmetry of §4.
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

### After touching gigs (§9)

**The one thing that must hold is that pacing changes the night.** Probe it headlessly by running
`playSong` over the same songs in different orders — all-loud must score WORSE than
loud/loud/breather/loud. The first cut failed this silently: the crowd hit the ceiling by song two,
so fatigue never bit and every order scored the same. A broken version looks exactly like a working
one from the UI.

Also worth driving: a room you can't get into shows its reason (not hidden); the booked gig owns its
day on the week board and that day can't be re-planned; and the crowd meter is a **bar**, never a
number.

### After touching fame (§4)

The fork is the thing to check, and it's slow to reach by hand — building real Cred takes ~30 weeks,
so drive the reducer in a scratch script rather than the browser for anything Cred-dependent
(backlash especially). What must hold:

- Creator grind → Following climbs fast, Cred bleeds → the gap line reads "More people know your
  name than respect it."
- Underground releases + network → Cred climbs, Following crawls → "The people who matter rate you."
- Backlash fires **only** on a mainstream release **and** only with Cred to lose. A pop record from
  a nobody must roll 0% — you cannot betray people who were never there.

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
- Resolving a day and closing the week are separate actions on purpose. They were one, and the
  seventh day resolved and flipped to the summary in the same tick — Sunday's report was never
  shown, every week. If you drive the reducer directly (the tools do), `finishWeek` is where the
  bills and catalog land; skip it and you measure a week that never paid rent.
- Money is rendered with `formatMoney`, not `£{n}` — plain interpolation gives "£-59".
- `.pick-cost` carries a ` energy` suffix via `::after` from the week board. Reusing it elsewhere
  renders "Rent Day ▲ energy". Chip/marker classes are not free to borrow.
- A gig day's `DayResult` uses `routeId: 'rest'` with a `routeLabel` override, because a gig isn't a
  route. Read `d.routeLabel ?? route.short` or the log calls a gig "Rest".
