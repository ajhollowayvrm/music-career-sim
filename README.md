# From the Bottom Up

*A music career simulator.* You start as a lowly musician with a cheap instrument, no fans, and rent
due, and you claw your way up — bedroom demos to sold-out rooms to, if you make it far enough,
funding festivals for the next generation.

It's an active-management career sim in the spirit of a tycoon/RPG: menus and decisions every turn,
not an idle clicker.

**[Read the full design doc → `docs/BRIEF.md`](docs/BRIEF.md)**

## Status

**Pre-alpha, and playable.** Author a musician, plan your weeks, write songs, put them out, play them
to a room, and find (or wreck) a band. The design document is complete and remains the source of
truth; eight of its eighteen systems are built. Nothing is saved.

| | |
| --- | --- |
| ✅ | Design doc (`docs/BRIEF.md`) — 18 sections, complete |
| ✅ | Vite + React + TypeScript scaffold, GitHub Pages deploy on push to `main` |
| ✅ | Installable iOS web app — offline-capable, safe-area aware |
| ✅ | **Character creation (§2)** — name, origin, a 7-question interview, talent + taste, confirm |
| ✅ | **The loop (§5)** — plan a week, watch it resolve a day at a time, settle up |
| ✅ | **Songwriting & release (§7)** — author a song, write it, record it, put it out |
| ✅ | **Fame (§4)** — Following vs Cred, the purist/populist fork, selling out and backlash |
| ✅ | **Live gigs (§9)** — book a room, craft a set, play it; pacing, persona, disasters |
| ✅ | **The band (§8)** — full agents, multi-faceted chemistry, the trap, emergent leadership |
| ✅ | **Finances & the fail state (§12)** — rent, the one grace month, eviction ends the run |
| ✅ | **Items & possessions (§11)** — the liquidation ladder: sell, pawn, buy back, forfeit |
| ⏳ | §16 the events engine, §10 gear, §13 merch, §14 superfans, §15 awards |
| ⏳ | §17 the macro ladder — the arc above all of it |

The interview is **seven questions**. §2 rejects a five-question version as too shallow, so five is
the floor; seven is AJ's call. The five topics the brief names by hand are fixed and not up for
cutting — why you make music, the stage, a flaky bandmate, exposure, a brutal review. The two
discretionary slots are the contract (the only real driver of Industry Trust) and the closer.

### The clock: the week plans, the day resolves

§5 says "the clock is DAILY, not weekly", and it still is. The **week is the planning surface** —
seven days laid out at once under a projected energy curve — but it **resolves one day at a time**.
That split is deliberate and load-bearing: §5's own example (skip the party and play the gig sharp,
or go and pay for it with tomorrow's performance) only means anything at day granularity, and §16's
events need somewhere to interrupt from. A pure weekly turn would delete both. Don't collapse it.

Energy is what makes a plan a plan: roughly four action days a week is comfortable, five is
break-even, six bleeds, seven collapses — so rest is a real move, not a forfeit. Money pulls the
other way. Three shifts a week is the only solvent plan, and it's the one that grinds your mood
down; mood then feeds back into how good your music is. **No plan is a free win**, and that trade is
the loop. It falls out of the constants in `week.ts` and `resolve.ts` rather than being scripted,
which is exactly why it's easy to break — see the check below.

### Songs (§7)

A song's **identity** is the player's — title, genre, themes, all authored, none generated. Its
**quality** is hidden and comes in §7's two dimensions: Composition (from Lyrics/Creativity, which
§2 says drive quality more than raw playing) and Production (from Production talent; §10 owes this
one a gear lever). Talent sets the ceiling, sessions only approach it with diminishing returns, so
"call it written" is a real decision — and the song tells you in prose when there's nothing left to
add, because a decision made blind is a coin toss, not a decision.

This is also where **your leanings finally cost you something**. §3: "genre mismatch — your fixed
leaning versus the music you're actually making — lowers happiness." Writing music you love is the
best day in the game; writing music you don't is a net-negative day even though you spent it on
music. The pivot is deliberately set so a mismatch hurts more than a match helps, and burnout
suppresses the joy entirely — without that, a wrecked, bankrupt player writing music they love
climbs to maximum mood.

**Songs barely pay in money, on purpose.** A release earns £29–104 over its life against £200/wk of
rent; even a viral spike is about one week's rent. That's not a tuning miss — early music *is* a
rounding error, which is §12's whole tension. What a release actually buys is **reach and standing**
(§4), weighted by where its genre sits on the underground↔mainstream axis. Gigs (§9) and merch (§13)
are still owed. **Don't inflate the money to compensate.**

### Fame (§4): one number shown, one never

§4 makes fame two stats in tension. **Following** is reach and **Cred** is authenticity, and chasing
one actively costs the other.

**Following is a figure on screen; Cred never is.** That isn't a pillar-2 exception so much as the
same rule money gets: the world counts your followers *for* you and puts the number in your face
whether you asked or not (§14 calls it "an aggregate number"). Nobody anywhere can tell you what
your scene credibility is, so Cred only ever comes back as prose. The asymmetry is the design — the
thing you can measure is the thing that pulls at you, and the thing you can't is the thing you lose
without noticing.

The fork is real, measured over 20 weeks from the same character:

| Strategy | Following | Cred |
| --- | --- | --- |
| Creator grind + pop releases | 1028 | 0.00 — *"More people know your name than respect it."* |
| Music + network + punk releases | 206 | 0.69 — *"People whose opinion you care about take you seriously."* |
| Hybrid (creator + punk) | 834 | 0.20 — the treadmill eats the records' standing |

Selling out only costs you if you had something to sell: backlash needs a mainstream release **and**
Cred above ~0.3. A pop record from a nobody betrays nobody, and rolls 0%.

**Cred is built by paying dues** (§4), and gigs (§9) are where. Records and being in the scene get
you known; the rooms take you the rest of the way, and a blinding night in a small room is worth more
standing than a flat one in a big one.

### Live gigs (§9): two acts

The strategist, then the performer. Book a room (gated by §4 — this is what Following was promised to
unlock), craft a set, then play it song by song against a crowd-energy meter.

**Pacing decides the night, and that's the easiest thing here to break.** Same four songs, order
alone, at the back room:

| Set | Curve | Score |
| --- | --- | --- |
| all loud | 60 → 63 → 60 → 56 | 0.58 — the room tires and goes backwards |
| all quiet | 53 → 55 → 58 → 61 | 0.59 — never lifts |
| peak early, dribble out | 60 → 63 → 60 → 63 | 0.62 |
| loud, loud, breather, loud | 60 → 63 → 66 → 72 | 0.68 |
| quiet open, build, close big | 53 → 62 → 65 → 75 | **0.69** |

The first cut of this had a big lift and a warm opening: the crowd hit the ceiling by song two,
fatigue never bit, and a set of nothing but bangers scored *identically* to a well-paced one. The
constants in `gig.ts` (`FATIGUE_PER_INTENSITY`, `LOUD_SONG_COST`, `openingCrowd`) are tuned so
fatigue outruns the lift — **re-probe them if you touch them**, because a broken version looks
exactly like a working one.

**There is no correct way to handle a disaster** — only a way that fits the room. §9: "some scenes
expect a chaotic, poor reaction (à la Nirvana), so reacting 'badly' can be authentic and
crowd-pleasing in the right room." Each venue has a `sceneRaw`, and handlings are scored against it:
going feral in the back room (`sceneRaw -0.7`) is the gig; the same move on a support slot
(`+0.3`) ends the tour.

**The persona is tracked.** Your on-stage choices average into a register (composed ↔ feral) over
your career, and once it's settled (six nights) a choice that breaks it is an event in itself —
delightful or alienating, depending on whether the room wanted it.

Gear is deliberately not read here. §9 is explicit: it's the player, not the gear.

### The band (§8)

The brief calls it the richest system in the game, and three of its lines are load-bearing:

**Bandmates are full agents — "basically another you".** Same shape as the player: fixed traits, fixed
leanings, talents, plus an agenda they act on. Their leanings matter as much as yours — §3's genre
mismatch runs both ways, so writing music your guitarist has no feeling for costs you their respect,
however good the song is.

**Chemistry is multi-faceted and must stay that way.** Musical respect, personal friendship and
professional trust move *independently*, so you can be "loved and disrespected, or trusted by someone
who can't stand you". **Never average them into one bar** — the contradictions are the whole point,
and they only read as a person in a sentence:

> *"Joss thinks you are the real thing and would not cross the road for you."*
> *"Joss likes you enormously and does not rate you at all."*
> *"Joss is fond of you and has stopped expecting you to turn up."*

**A bad band is a trap.** Low chemistry doesn't fail to help — it drags your songs *below* your solo
ceiling. Measured against a solo ceiling of 0.73:

| Chemistry | Band ceiling | vs solo |
| --- | --- | --- |
| 0.00 | 0.38 | **−48%** — stifled |
| 0.35 | 0.54 | −25% |
| 0.65 | 0.69 | −5% |
| 0.80 | 0.76 | +5% |
| 1.00 | 0.85 | +18% |

Note the band ceiling pools *everyone's* writing, so `bandFactor` alone doesn't tell you whether the
band helps — a room of weak writers can sit above factor 1.0 and still leave you worse off.
`describeBandWorth` compares the real ceilings for exactly this reason; it once read from the factor
and told players the band was helping while their ceiling was down 5%.

**Leadership is emergent.** Founding buys pull (0.7) not ownership; joining starts you at 0.25.
Standing follows chemistry slowly — taking over a band you joined is a career-length arc, ~10–15
weeks, not a month. You can be pushed out on a trust/standing threshold, and members quit when
nothing is keeping them.

### How a day reads

§3 says the fixed traits "filter self-perception", so a day is resolved in two parts. What happened
is a hidden quality number (talent, discipline, energy, mood, luck). How you read it is a clause
chosen by **Confidence**. Two characters can have the identical day and read it differently — the
shaky one can't hold onto a good session, the certain one shrugs off a bad one. That split is what
lets the numbers stay hidden and still be felt (pillar 2).

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

### Checking the loop

Pillar 2 hides energy, mood and quality behind prose, so a loop that has quietly become solvable
looks exactly like one that hasn't. Run this after touching any constant in `week.ts` or
`resolve.ts`:

```bash
npx -y esbuild tools/week-balance.ts --bundle --platform=node --format=esm \
  --outfile=/tmp/week-balance.mjs && node /tmp/week-balance.mjs
```

It prints four weeks of each canned plan (a read — you're looking for no plan that's comfortable
*and* solvent *and* rising in mood), then asserts one hard invariant and exits non-zero if it
breaks: **the board's burnout warning must equal what the week actually does.** Those are computed
in two places and have drifted apart once already.

It has earned its keep repeatedly: it caught five action days ending every week at full energy, mood
ratcheting to 100 and pinning, every day landing in the middle band so the perception filter never
fired, and a mood death-spiral with no way back.

### Checking the trait model

The interview is the only thing that authors personality, and pillar 2 hides the result — so a trait
that can't reach an extreme is a bug you can never see in play. Run this after adding, cutting, or
retuning any interview question:

```bash
npx -y esbuild tools/trait-range.ts --bundle --platform=node --format=esm \
  --outfile=/tmp/trait-range.mjs && node /tmp/trait-range.mjs
```

It exits non-zero if any trait can no longer read high or low. It has already earned its keep: at
seven questions, Integrity could only fall to 0.40 and so could never read low, which quietly broke
"no right answers".

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

- **Saving and persistence: deferred by decision (2026-07-16).** Nothing is persisted — a reload
  discards the run. This is a known, accepted state, not an oversight. When it's picked up, the two
  questions are (a) durability: Safari can evict script-writable storage (localStorage/IndexedDB),
  so an export/import save file is the honest mitigation, and (b) whether a run is one save slot or
  many. The groundwork is already laid: every value in `src/game/` is a plain serializable object
  with no class instances, `Date`, or functions, so persistence should be additive rather than a
  refactor. **Keep it that way** — it's the whole reason deferring this is cheap.
- **State architecture: settled.** One plain state object behind a pure reducer, colocated with the
  system it belongs to (see `src/game/creation.ts`). React holds it via `useReducer`; the reducer
  itself imports nothing from React.
- §18 of the brief parks five deliberately-unresolved design questions.

---

Design: AJ · Systems & prototyping: Claude
