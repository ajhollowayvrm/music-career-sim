# From the Bottom Up

*A music career simulator.* You start as a lowly musician with a cheap instrument, no fans, and rent
due, and you claw your way up — bedroom demos to sold-out rooms to, if you make it far enough,
funding festivals for the next generation.

It's an active-management career sim in the spirit of a tycoon/RPG: menus and decisions every turn,
not an idle clicker. The web is the first target platform.

**[Read the full design doc → `docs/BRIEF.md`](docs/BRIEF.md)**

## Status

**Pre-alpha — designed, not built.** The design document is complete and is the source of truth;
none of the eighteen systems are implemented yet. What's here today is the project scaffold (Vite +
React), the Pages deploy pipeline, and a title screen. **Nothing is playable.**

### What's built

| | |
| --- | --- |
| ✅ | Design doc (`docs/BRIEF.md`) — 18 sections, complete |
| ✅ | Vite + React scaffold, GitHub Pages deploy on push to `main` |
| ✅ | Title screen |
| ⏳ | Everything else |

### The build order (proposed)

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

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Deployment

Pushing to `main` builds the app and publishes `dist/` to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Vite's `base` is set to `'./'` so the
built asset URLs resolve from the project subpath.

**Live:** https://ajhollowayvrm.github.io/music-career-sim/

## Layout

```
docs/BRIEF.md      the design doc — source of truth
src/game/          game systems and state (no JSX)
src/components/    UI
src/styles/        CSS
```

---

Design: AJ · Systems & prototyping: Claude
