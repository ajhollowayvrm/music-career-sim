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

Clicking 14 interview questions through individual tool calls is slow. `browser_evaluate` with real
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
'[role=status]'                    // "Question 4 of 14. 3 answered."
```

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

## Gotchas found the hard way

- Origin re-selection **resets the talent spread** on purpose (a different origin is a different
  head-start). Verify points return to 10, not that the old spread survives.
- The interview's Back walks one question at a time; the progress ticks are the jump.
- HTML entities (`&rsquo;`) in `src/game/*.ts` strings render **literally** — those are plain
  strings, not JSX. Use a real apostrophe in a double-quoted string.
