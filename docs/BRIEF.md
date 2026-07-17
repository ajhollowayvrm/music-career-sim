# FROM THE BOTTOM UP

*a music career simulator*

**GAME DESIGN DOCUMENT** · working title

- **Design:** AJ
- **Systems & prototyping:** Claude

> This document is the source of truth for the game's design. It is the verbatim
> content of the original design doc, restructured for the repo. Build status is
> tracked in [`../README.md`](../README.md); unresolved questions live in
> [Section 18](#18-open-threads-to-resolve).

---

## 1. The Vision

You start as a lowly musician with a cheap instrument, no fans, and rent due, and you claw your way up — bedroom demos to sold-out rooms to, if you make it far enough, funding festivals for the next generation. It is an active-management career sim in the spirit of a tycoon/RPG: menus and decisions every turn, not an idle clicker. First target platform is the web.

### Design pillars

- **Author yourself, then inhabit that person.** Your personality and musical taste are set at creation and stay fixed. The point is to put the real you into the game and see how the world responds — not to have the game reshape who you are.
- **Numbers are felt, not shown.** The underlying stats are hidden. The player experiences them through flavor, consequences, and the way the world reacts.
- **Every path is meaningful, with real downsides.** Solo or band, purist or populist, underground or arena — each is a legitimate way to 'make it,' and each is great precisely because you've accepted its costs.
- **A career with a shape.** The daily grind adds up to an arc with milestones, multiple win conditions, and endings beyond going broke.

---

## 2. Character Creation

Because identity is fixed and hidden, creation is the single most important surface in the game — it is the whole place where the real you is authored. It should feel like authoring a musician, never like filling out a form.

### Name

The player enters a real name (which grounds the game as personal) and an optional stage name. The stage name is who the world meets, it can be left blank at first, and it can be changed later in the career.

### Origin (background)

A story, not a class. Each origin gives a talent head-start, quietly seeds personality, and hands the player a keepsake item that has a real gameplay benefit — never pure flavor. Crucially, an origin never locks talents: a church-choir kid can still become a guitar monster. Example origins and their keepsakes:

| Origin | Keepsake | Benefit |
| --- | --- | --- |
| Choir kid | Grandmother's hymnal | A harmony/writing edge and a morale anchor |
| Garage self-taught | Free-but-buzzy pawn guitar | Gig and record from day one |
| Bedroom producer | Cracked laptop | The recording/YouTube path open immediately |
| Open-mic lifer | Road-worn acoustic | A stage-presence edge |

### The interview (personality)

Personality is authored through a deep set of scenario-based questions answered as yourself — why you make music, what you'd do for exposure, how a stage feels, how you handle a flaky bandmate or a brutal review. There are no visible stats and no right answers; the game reads the answers into the hidden trait model and it stays that way. The five-question version was too shallow — this should be a richer interview.

### Talents

Skill is separate from taste and temperament. The player spends points across a talent list that explicitly includes **LYRICS** and **CREATIVITY** as their own dimensions, distinct from instruments and from general composition. Lyrics and Creativity drive song quality and originality more than raw playing does — so a strong-lyrics, strong-creativity, mid-instrument build is a genuine singer-songwriter/auteur whose songs carry the weight rather than the chops.

### Your sound (leanings)

Taste is authored as a genre **MULTI-SELECT** — pick every genre you actually love. Behind the scenes those genres average into a smooth position on three musical-value axes:

- Raw ↔ Polished
- Roots ↔ Experimental
- Underground ↔ Mainstream

…which is what band-fit is measured against. Averaged (not rigid single-genre matching) is deliberate: nobody only likes one genre. The genre picker sits right next to talent allocation so the player can flip between them and try builds.

---

## 3. The Stat Model

Stats live in three domains, and the player's fixed personality is simply the slow trait layer inside each — it acts as a perception filter, coloring how you see yourself, others, and music.

- **Self.** Fast state (Energy, Mood) plus fixed traits (Confidence, Discipline, Integrity, Ambition). These filter self-perception.
- **Others / the world.** Earned standing (Reputation) and per-person relationships, plus fixed traits (Warmth, Industry Trust). These filter how you read other people's intentions.
- **Music.** Talent (learnable skill) kept separate from leanings (fixed taste). Genre mismatch — your fixed leaning versus the music you're actually making — lowers happiness.

The player's relationship to performing (stage confidence, nerves) can change over a career, but the core inner self stays fixed.

---

## 4. Fame: Following vs. Cred

Fame is two stats in tension, not one.

- **Following** is reach — it unlocks auditions, bookings, and label interest.
- **Scene Cred** is authenticity — the respect of purists and real fans.

The two pull against each other. YouTube and shortcuts grow Following fast but can cost Cred; Cred is built slowly by paying dues at gigs; and any move that reads as selling out risks a backlash event. Chasing one actively costs the other, which makes 'purist vs. populist' a real strategic fork rather than flavor.

---

## 5. The Daily Loop & Routes

The clock is **DAILY**, not weekly. Not every day forces a choice — some days are rest or nothing at all. On active days the player picks a route:

- Apply for bands
- Make your own music
- Grind the YouTube/creator path
- Rehearse
- Work a day job
- Go out and network

Scheduled gigs sit on the calendar and create opportunity-cost tension around them — the classic example being whether to skip a party (and play the gig sharp) or attend it (and maybe meet an exec, at the cost of tomorrow's performance).

---

## 6. Two Paths: Band vs. Solo / Creator

Both the band path and the solo/creator (YouTube) path can reach the 'made it' stage; they are different roads with different costs.

- **Solo.** Full creative control and 100% of the money, minus 100% of the costs — plus a content-treadmill energy/mood drain and a soft fame ceiling you can't break alone.
- **Band.** Shared money, split songwriting credit, decisions gated by bandmate buy-in, and scheduling-conflict events — but a higher ceiling and morale that buffers the bad days.

**Crossover** (grounded in how this really works): a following is leverage mainly with labels and bookers, and for founding or leading your OWN band. Getting brought into an established band as a hired name is possible but triggers a fan-backlash beat (a Cred hit and member friction), because scenes are split on the 'viral musician' — there's a real credibility gap between online reach and live chops. A band can also leverage a member's following.

---

## 7. Songwriting & Release

Song-making scales with the career: bedroom demos alone early, then something larger once you're in a band. The player authors as much as possible — title, genre, potential themes (but not full lyrics, which are too hard to make mechanically meaningful). The song's quality is abstract underneath, but its identity is the player's.

- **Solo vs. band.** Solo songwriting is harder but gives full creative control. Band songwriting can be better than solo — but only as good as your chemistry with the members. A low-chemistry band can produce worse songs than you'd make alone (see [Section 8](#8-the-band-chemistry--bonding)).
- **Two quality dimensions.** Composition (the writing) and Production (the recording). Production is where gear matters most ([Section 10](#10-gear-a-sub-economy)).
- **Lifecycle.** A release spikes and then decays by default. Exceptions give the catalog a life of its own: a song can slow-burn into popularity over time (a sleeper), or a single track can go viral (e.g. on TikTok) and spike on its own.

---

## 8. The Band: Chemistry & Bonding

**The richest system in the game.** Each bandmate is a full agent — 'basically another you,' with fixed personality, leanings, skill, and their own agenda; they can make demands, act on their own, and quit.

- **Multi-faceted chemistry.** Relationships are deliberately complex — not one bond bar but several independent facets, such as musical respect, personal friendship, and professional trust. You can be loved and disrespected, or trusted by someone who can't stand you.
- **A bad band is a trap.** Low chemistry can make the band actively worse than going solo — you get stifled creatively, and your song quality drops below your solo ceiling. A band is only an upgrade when the chemistry is there.
- **Emergent leadership.** Standing/pull is not fixed by who started the band. Founding gives you a lot more pull to begin with, but you can join a band and rise to become its leader, and you can found a band and get pushed out. Bad choices (unreliability, credit-grabbing, ego clashes) can get you kicked out on a relationship/reliability threshold.

---

## 9. Live Gigs

A gig is two acts: the strategist, then the performer.

- **Craft the setlist.** Choose songs and order them — where the loud ones go, where the crowd breathes, how you close. Pacing and the energy curve matter as much as raw song quality.
- **Perform, with micro-choices.** Between songs, small in-the-moment calls — banter, reading the room, handling events (a heckler, a dying amp, a booker in the back) — steer a live crowd-energy meter.
- **It's the player, not the gear.** Skill carries a show; gear barely moves it, and at big venues you're on the house rig anyway.
- **A tracked persona.** The game remembers your normal performance style, so deviating (a mellow performer suddenly going feral) reads as a genuine event — delightful or alienating. Performance choices expand as the career goes on.
- **The band on stage.** Same as solo, but the band may want a say in the set order (accept, or insist on changes, depending on chemistry/standing); you manage every member's stamina; and each performer has on-nights and off-nights, so even a great band can have the wheels come off.
- **Dynamic crowds.** Crowds evolve, especially once you're well known.
- **Disaster stakes depend on handling AND scene.** A graceful recovery might gain fans but cost money; a really bad handling can lose you everything. But some scenes and genres expect a chaotic, poor reaction (à la Nirvana), so reacting 'badly' can be authentic and crowd-pleasing in the right room — reading your own scene is part of the skill.

---

## 10. Gear (a sub-economy)

Gear is its own economy of instruments, rigs, recording chains, content gear, and transport — each both a performance factor and a cash sink.

- **Live vs. studio.** For live shows it's the player, not the gear. Gear matters MOST for recording — that's where quality is the big lever.
- **You graduate off your own gear.** Early and in DIY rooms your rig matters; as you rise you just use the venue's backline and PA, and your own gear stops mattering for shows.
- **Dramatic, rare failures.** Not a constant maintenance tax — the amp dies right before the big gig, occasionally, as an event.
- **Functional, but staples emerge.** Gear has no built-in Cred rating, but a specific piece or a particular stage/set design can become your signature over time through repeated use and association.

---

## 11. Items & Possessions

The player owns things — and the inventory is the safety net you hollow out when the music isn't paying. Possessions can be **SOLD** to make rent, which is the buffer between you and game over ([Section 12](#12-finances--the-fail-state)).

- **The liquidation ladder.** Sell painless luxuries first; only in real desperation do you reach the prized guitar. Selling functional gear to survive lowers next month's earning power — the death spiral.
- **Sell vs. pawn, and buy-back.** Pawned items are reclaimable at their pawn price within a window; sold items are gone unless you buy them back later, at roughly 3× the price.
- **Items as milestones and gifts.** Items double as milestones earned on the way up; bandmates or mentors can gift gear, and selling a gift damages that relationship.

---

## 12. Finances & the Fail State

Money is the game-over factor: **failing to make rent is how you lose.** The core financial tension is lumpy income (gigs, a viral spike, a sync check) against steady bills (rent, cost of living) that hit every month regardless.

- **The cliff has one step of grace.** Miss rent and you get one grace month; miss again and it's eviction.
- **The label advance is a loan against a target.** Signing pays big up front, but it's recouped against a sales target (a set number of albums/streams). Until you sell enough, you stay in the hole — a flop leaves you genuinely chained.
- **City is flavor, not a money lever.** Cost of living doesn't vary much by city; the city is scene and vibe, not an economic mechanic.

---

## 13. Merch

Merch is three tensions at once: a cash-flow gamble (you front inventory money and eat whatever doesn't sell — dead stock is a real loss, while ordering too little leaves money on the table), a Cred-vs-cash pricing call, and a brand-identity expression.

- **Brand, Creativity, and effort.** Merch ties to your brand and Creativity and takes real effort to make; you release it tied to an album, single, or tour.
- **Where it sells, and scarcity.** Gigs, online, and eventually big-box stores — but scarcity matters: a limited drop or show-/in-person-only item becomes especially valuable to fans.

---

## 14. Superfans

Following is an aggregate number; superfans are individuals inside it — named people the player can actually know and interact with. It's a relational layer that turns a scoreboard into faces. Different superfan 'types' pay off differently:

- An **evangelist** grows Following
- A **collector** clears your limited drops
- A **curator** amplifies you online
- A **ride-or-die** boosts crowds and defends you in a backlash

Attention is finite, so nurturing some means neglecting others — and a neglected superfan can curdle into your loudest critic.

---

## 15. Music Awards

Modeled on the real majors: a Grammy-style prestige/critical show, a VMA-style popularity/spectacle show, plus genre and breakthrough categories — each rewarding something different.

- **Prestige vs. Following.** Critical darlings win the serious awards with modest sales; chart monsters win the popular ones. Your build and path decide which are even in reach — a direct echo of the multiple win conditions.
- **Campaigning.** You can push for a nomination with label muscle, a charm offensive, or a big performance slot — but an all-out campaign costs Cred if you're seen as thirsty.
- **The payoff.** A win is a milestone: it spikes Following and Cred and opens doors.

---

## 16. The Random Events Engine

A life in music is a stream of things you didn't schedule, so a random events engine drives the texture of a career. Events range from one-offs (a viral clip, a gear failure, a feature offer, a scathing review, a fan letter) to multi-stage chains.

**The addiction → comeback chain.** The marquee chain. Lifestyle choices (hard partying, stress) raise strain until an escalating arc fires: a crutch forms, performances start slipping, and you hit rock bottom. From there, checking into rehab leads to recovery and a comeback that's worth more than any single — the story of the return moves people. Ignore it at the bottom and it all comes apart. **Recovery is framed as the strong, human choice, not a punishment.**

---

## 17. The Macro Ladder

The arc above the daily loops — the rungs, the milestones, the multiple definitions of 'making it,' and how a run ends. The player's imagined run traces the whole shape:

> Solo songs → solo singles and albums → collabs with other artists (features, a collab album, maybe a relationship) → a rebrand or two → the grind (join a band, go viral, a YouTube channel, or keep going solo) → the coming-out party (breakthrough) → chained to a label → breaking the chain by starting your own label or joining a friend's → the big time → the Benefactor endgame.

### New verbs the arc introduces

- **Collabs.** Making music with other artists — features, collab albums, and possible romantic/relationship arcs.
- **Rebrands.** Reinventing the outward brand and image (distinct from the fixed inner self). The cost scales with fame: a small/early rebrand barely matters, but rebranding once you're well known destroys brand recognition and can lose you following.
- **The Benefactor endgame (playable).** At the top you flip from climber to patron: you run your own label with your own album on it, and you can throw your own festival stacked with just your roster of artists. The climber becomes the ladder.

### How a run ends

A run ends when the player chooses to retire, or automatically at age 95. Going broke is only the worst door. Endings are build-dependent and plural — for example:

- **The Scene Legend** — an underground/purist ending: modest devoted following, monster Cred
- **The Stadium Star** — the mainstream/ambitious ending
- **The Benefactor** — the mogul arc
- Plus arcs like a burnout, a quiet fade, or a late-career comeback

Your character has a win condition that fits who you are.

---

## 18. Open Threads (to resolve)

A few deliberately-unresolved questions, parked here so nothing's lost:

1. **Rebrand mechanics:** exact costs/benefits and how much of a Following/Cred reshuffle a late rebrand triggers.
2. **Collabs & artist relationships:** how deep the other-artist relationship system goes (features, feuds, romances as their own sub-system).
3. **The Benefactor management layer:** how hands-on running the label and festival actually plays.
4. **The two ladders:** how independent band vs. solo stay, and the exact soft ceiling on a purely solo career.
5. **Inner growth:** whether anything inner beyond stage confidence is ever allowed to grow (currently only the relationship to performing changes).

---

## Appendix: A Note on the Whole

Sixteen interlocking systems, one fixed identity at the center of them, and a career that runs from a cheap instrument in a bedroom to a festival with your name on it. The through-line is the first design pillar: the game never tells you who to be — you bring that — it just builds a world honest enough to respond to it.
