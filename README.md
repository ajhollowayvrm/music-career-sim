# From the Bottom Up

*A music career simulator.* You start as a lowly musician with a cheap instrument, no fans, and rent
due, and you claw your way up — bedroom demos to sold-out rooms to, if you make it far enough,
funding festivals for the next generation.

It's an active-management career sim in the spirit of a tycoon/RPG: menus and decisions every turn,
not an idle clicker.

**[Read the full design doc → `docs/BRIEF.md`](docs/BRIEF.md)**

## Status

**Pre-alpha — designed, not built.** The design document is complete and is the source of truth;
none of the eighteen systems are implemented yet. What's here today is the project scaffold, the
Pages deploy pipeline, and a title screen. **Nothing is playable.**

| | |
| --- | --- |
| ✅ | Design doc (`docs/BRIEF.md`) — 18 sections, complete |
| ✅ | Vite + React + TypeScript scaffold, GitHub Pages deploy on push to `main` |
| ✅ | Installable iOS web app — offline-capable, safe-area aware |
| ✅ | Title screen |
| ⏳ | Everything else |

## The target platform

**An iPhone web app, added to the Home Screen from Safari.** Not a desktop site that happens to fit
a phone. This is a real constraint, not a preference — it decides layout, tap targets, and how the
app is expected to be launched.

Concretely, that means:

- **Mobile-first CSS.** The base rules in `src/styles/index.css` target a phone in portrait; the
  `min-width` blocks at the bottom of the file are the progressive enhancement for bigger screens.
  If a rule only matters on desktop, it belongs in a media query — don't invert this.
- **Standalone display.** The manifest sets `display: standalone` and `orientation: portrait`, so
  from the Home Screen it launches with no Safari chrome.
- **Safe areas.** The status bar is `black-translucent` and the viewport is `viewport-fit=cover`, so
  the app paints under the Dynamic Island and the home indicator. The `--safe-*` custom properties
  wrap `env(safe-area-inset-*)` and keep content clear. They're vars (not raw `env()` calls) so they
  can be overridden to test inset layout in a desktop browser, where `env()` is always 0.
- **Touch, not hover.** Tap targets are ≥44px (`--tap`, per Apple's HIG), press feedback is
  `:active`, and hover effects are behind `@media (hover: hover)` so they don't stick on touch.
  Any input must stay ≥16px or iOS auto-zooms the viewport on focus.
- **Offline.** The whole game is static, so the service worker precaches all of it — a run should
  work on the subway with no signal.

### Installing it on the phone

Open https://ajhollowayvrm.github.io/music-career-sim/ in Safari → Share → **Add to Home Screen**.

## Stack

**Vite 8 + React 19 + TypeScript 7**, deployed static to GitHub Pages.

The framework does deliberately little. The game is mostly pure simulation logic — the stat model,
chemistry, the events engine, the daily tick — which lives in `src/game/` as plain TypeScript with
no JSX and no React imports. React only renders menus and lists. Keep that boundary: it's what makes
the sim testable and the framework replaceable.

TypeScript earns its place here specifically because of design pillar 2 (*numbers are felt, not
shown*): a wrong trait value never appears on screen, so types are the earliest warning available.

## Development

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc, no emit
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
```

The dev server and preview both serve under the `/music-career-sim/` base path, not `/`.

### Regenerating the app icons

The icon PNGs are committed, so this is rare — only when the mark changes. Playwright is kept out of
`package.json` on purpose so CI never installs a browser it doesn't need:

```bash
npm i --no-save playwright && node tools/make-icons.mjs
```

Keep the bars in `tools/make-icons.mjs` in sync with `public/favicon.svg` by hand.

## Deployment

Pushing to `main` builds the app and publishes `dist/` to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

**Live:** https://ajhollowayvrm.github.io/music-career-sim/

Vite's `base` is the absolute `/music-career-sim/`, not `'./'`. That's load-bearing: a PWA's
`start_url` and `scope` must be absolute and must match where Pages actually serves the app, and a
relative base produces a manifest iOS won't honor for a Home Screen app. The cost is that the build
only works at that subpath.

## Layout

```
docs/BRIEF.md      the design doc — source of truth
src/game/          game systems and state — plain TS, no JSX, no React
src/components/    UI
src/styles/        CSS (mobile-first)
tools/             one-off build tools (icon generation)
public/            static assets — icons
```

## The build order (proposed)

Character creation is the natural first system: identity is fixed at creation and hidden forever
after, so it's the one surface that has to exist before any other system has something to read from.

1. **Character creation** (§2) — name, origin + keepsake, the interview, talents, genre multi-select
2. **The stat model** (§3) — the hidden trait/talent/leaning layer everything else reads
3. **The daily loop** (§5) — the clock, routes, and opportunity cost
4. **Songwriting & release** (§7) — composition vs. production, the release lifecycle
5. **Live gigs** (§9) — setlist craft, then performance micro-choices
6. **Finances & the fail state** (§12) — rent, the grace month, the cliff
7. …then the band (§8), gear (§10), items (§11), merch (§13), superfans (§14), awards (§15), the
   events engine (§16), and the macro ladder (§17)

The four design pillars in §1 are the tie-breakers. If a mechanic fights a pillar, the mechanic is
wrong — especially *numbers are felt, not shown*, which rules out surfacing raw stats in the UI.

### Known gaps

- **Save durability isn't solved.** Script-writable storage (localStorage/IndexedDB) can be evicted
  by Safari. For a game where a run is dozens of hours, an export/import save file is the honest
  mitigation — decide this before the first system that writes a save.
- **State architecture isn't decided.** A single game-state object behind a reducer is the likely
  shape, but nothing is committed yet. Settle it before system #2, not #6.
- §18 of the brief parks five deliberately-unresolved design questions.

---

Design: AJ · Systems & prototyping: Claude
