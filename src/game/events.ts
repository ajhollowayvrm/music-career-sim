/**
 * The random events engine — BRIEF §16.
 *
 * "A life in music is a stream of things you didn't schedule." This is the
 * system the daily clock was kept for: §5's week resolves a day at a time
 * precisely so §16 has somewhere to interrupt from. An event fires into a
 * resolved day and pauses the week on a choice — the same way a gig (§9) takes
 * over the screen, but smaller and unbidden.
 *
 * TWO KINDS (§16): one-offs (a viral clip, a scathing review, a fan letter, a
 * feature offer, a gear failure) and multi-stage CHAINS. The engine keeps a
 * chain's state on the run and lets it escalate over weeks.
 *
 * THE MARQUEE CHAIN — addiction → comeback (§16). Lifestyle choices raise a
 * hidden STRAIN: hard partying (going out to network) and stress (running on
 * empty, or grinding with your mood on the floor). Left to climb, it escalates —
 * a crutch forms, performances slip, and you hit rock bottom. From the bottom,
 * checking into rehab leads to recovery and a comeback that's worth more than
 * any single, because the story of the return moves people. Ignore it at the
 * bottom and it all comes apart.
 *
 * RECOVERY IS THE STRONG, HUMAN CHOICE — NOT A PUNISHMENT (§16). The framing is
 * load-bearing: the rehab path is the one the game rewards, and the writing here
 * has to carry that. The doom is what happens when you DON'T choose it.
 *
 * PURE, and no import of loop.ts. Events describe what should happen as plain
 * EventEffects; loop.ts is the only thing that applies them to the run. That's
 * what keeps the state serializable (§ saving) and the dependency graph acyclic.
 */

import { next, nextRange, type Rng } from './rng.ts'
import { clamp } from './traits.ts'
import type { RouteId } from './routes.ts'
import type { Item } from './items.ts'

/* -------------------------------------------------------------------------- */
/* Strain — the hidden pressure behind the marquee chain                       */
/* -------------------------------------------------------------------------- */

/** Hidden, 0..1, like every other felt number (pillar 2). */
export const STARTING_STRAIN = 0

export const CRUTCH_AT = 0.5
export const SLIPPING_AT = 0.72
export const BOTTOM_AT = 0.9
/** Weeks in recovery before the comeback lands. */
export const RECOVERY_WEEKS = 4

/**
 * What a single day does to strain. Partying (going out) and stress (burnout, or
 * grinding with a floored mood) raise it; rest brings it down; doing the work you
 * love takes the tiniest edge off. Tuned so the chain is a lifestyle pattern you
 * fall into over a month of hard living, never a bolt from a clear sky.
 */
export function dailyStrainDelta(routeId: RouteId, burntOut: boolean, mood: number): number {
  let d = 0
  if (routeId === 'network') d += 0.055 // the party half of "going out"
  if (burntOut) d += 0.05 // stress: running on nothing
  if (mood < 30) d += 0.03 // grinding while low
  if (routeId === 'rest') d -= 0.06
  if (routeId === 'make_music' || routeId === 'rehearse') d -= 0.01
  return d
}

/** A slow weekly bleed, so strain isn't a one-way ratchet. */
export const WEEKLY_STRAIN_DECAY = 0.02

/* -------------------------------------------------------------------------- */
/* The addiction chain's state                                                 */
/* -------------------------------------------------------------------------- */

export type AddictionStage = 'clear' | 'crutch' | 'slipping' | 'bottom' | 'recovering'

export interface ChainState {
  readonly stage: AddictionStage
  /** Weeks spent in recovery, counting toward the comeback. */
  readonly weeksRecovering: number
  /** True once a comeback has landed — the return really happened. */
  readonly recovered: boolean
}

export const startingChain = (): ChainState => ({
  stage: 'clear',
  weeksRecovering: 0,
  recovered: false,
})

/**
 * The weekly weight of where you are in the chain — felt beyond the event beats.
 * Slipping and the bottom drag on mood and stall your reach; recovery quietly
 * heals. Applied in finishWeek.
 */
export function chainWeekly(chain: ChainState): { moodDelta: number; followingMult: number } {
  switch (chain.stage) {
    case 'slipping':
      return { moodDelta: -3, followingMult: 0.9 }
    case 'bottom':
      return { moodDelta: -7, followingMult: 0.75 }
    case 'recovering':
      return { moodDelta: 2, followingMult: 1 }
    default:
      return { moodDelta: 0, followingMult: 1 }
  }
}

/* -------------------------------------------------------------------------- */
/* Effects — what an event asks the run to do                                  */
/* -------------------------------------------------------------------------- */

export interface EventEffects {
  readonly money?: number
  readonly moodDelta?: number
  readonly followingDelta?: number
  readonly credDelta?: number
  readonly strainDelta?: number
  readonly chainTo?: AddictionStage
  readonly setRecovered?: boolean
  /** Gear scrapped in a failure — loop.ts moves it to the sold pile (§10/§11). */
  readonly removeItemId?: number
}

export interface EventChoice {
  readonly id: string
  readonly label: string
}

/** The event as presented — serializable, rendered at fire time. */
export interface ActiveEvent {
  readonly id: EventId
  readonly title: string
  readonly text: string
  readonly choices: readonly EventChoice[]
  /** The item a gear-failure event is about, if any. */
  readonly targetItemId?: number
}

/** The result of answering — the line the log shows, and what to apply. */
export interface EventOutcome {
  readonly text: string
  readonly effects: EventEffects
}

export type EventId =
  | 'crutch'
  | 'slipping'
  | 'bottom'
  | 'comeback'
  | 'viral'
  | 'review'
  | 'fanletter'
  | 'feature'
  | 'gearfail'

export interface EventContext {
  readonly strain: number
  readonly chain: ChainState
  readonly mood: number
  readonly energy: number
  readonly following: number
  readonly cred: number
  readonly releasedSongs: number
  readonly ownedGear: readonly Item[]
  readonly week: number
}

/* -------------------------------------------------------------------------- */
/* Resolving a chosen event                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Apply a choice. Kept as one switch so the whole consequence table reads top to
 * bottom — every event's outcomes in one place, next to the text that set them
 * up. `targetItemId` carries the specific item for gear failure.
 */
export function resolveEvent(
  id: EventId,
  choiceId: string,
  ctx: EventContext,
  targetItemId: number | undefined,
): EventOutcome {
  switch (id) {
    /* ---- the addiction chain ---- */
    case 'crutch':
      return choiceId === 'ease'
        ? {
            text: 'You eased off. It was easier to do now than it would ever be again.',
            effects: { strainDelta: -0.3 },
          }
        : {
            text: 'You told yourself you had it handled. People do.',
            effects: { chainTo: 'crutch' },
          }

    case 'slipping':
      return choiceId === 'help'
        ? {
            text: 'You called someone before it got worse. That took more than pushing on would have.',
            effects: { chainTo: 'recovering', strainDelta: -0.4, moodDelta: -4 },
          }
        : {
            text: 'You pushed through. The shows got harder to remember afterwards.',
            effects: { chainTo: 'slipping', moodDelta: -6 },
          }

    case 'bottom':
      return choiceId === 'rehab'
        ? {
            // §16: the strong, human choice — and the one the game rewards.
            text: 'You checked yourself in. It is the hardest and the bravest thing in this whole game, and it is the start of the way back.',
            effects: { chainTo: 'recovering', strainDelta: -0.6, followingDelta: -Math.round(ctx.following * 0.1), moodDelta: -6 },
          }
        : {
            // §16: ignore it at the bottom and it all comes apart.
            text: 'You kept going. It came apart anyway — the money, the shows, the people who were still answering.',
            effects: {
              followingDelta: -Math.round(ctx.following * 0.2),
              credDelta: -0.1,
              money: -Math.round(120 + ctx.following * 0.05),
              moodDelta: -14,
            },
          }

    case 'comeback':
      // §16: worth more than any single — the story of the return moves people.
      return {
        text: 'You came back, and the room was fuller than you left it. People do not forget a return like that.',
        effects: {
          chainTo: 'clear',
          setRecovered: true,
          strainDelta: -0.5,
          followingDelta: Math.round(150 + ctx.following * 0.25),
          credDelta: 0.12,
          moodDelta: 18,
        },
      }

    /* ---- one-offs ---- */
    case 'viral':
      return {
        text: `A clip of you caught, properly caught. ${Math.round(300 + ctx.following * 0.6)} new followers before you'd finished your coffee.`,
        effects: { followingDelta: Math.round(300 + ctx.following * 0.6), credDelta: -0.02 },
      }

    case 'review':
      return choiceId === 'shrug'
        ? {
            text: 'You let it go. The people who liked you still like you.',
            effects: { moodDelta: -5 },
          }
        : {
            text: 'You fired back online. It made the review the story, and not in your favour.',
            effects: { moodDelta: -3, followingDelta: -Math.round(ctx.following * 0.04), credDelta: -0.04 },
          }

    case 'fanletter':
      return {
        text: 'A letter, an actual letter, about what one of your songs got somebody through. You read it twice.',
        effects: { moodDelta: 10, credDelta: 0.02 },
      }

    case 'feature':
      return choiceId === 'take'
        ? {
            text: 'You took the feature. Their audience met yours, and some of them stayed.',
            effects: { followingDelta: Math.round(200 + ctx.following * 0.15), credDelta: -0.03 },
          }
        : {
            text: 'You passed. It was not you, and you knew it, and the people who know you would have known it too.',
            effects: { credDelta: 0.03 },
          }

    case 'gearfail':
      return choiceId === 'repair'
        ? {
            text: 'You paid to bring it back to life. It cost, but you record through it tomorrow.',
            effects: { money: -Math.round(repairCost(ctx, targetItemId)) },
          }
        : {
            text: "You let it go. That's one less thing between you and the quality you had.",
            effects: targetItemId !== undefined ? { removeItemId: targetItemId } : {},
          }
  }
}

/** What it costs to bring a failed piece back — a chunk of its value. */
function repairCost(ctx: EventContext, targetItemId: number | undefined): number {
  const item = ctx.ownedGear.find((i) => i.id === targetItemId)
  return item ? Math.max(40, item.value * 0.4) : 60
}

/* -------------------------------------------------------------------------- */
/* Firing — what interrupts a given day                                        */
/* -------------------------------------------------------------------------- */

/**
 * Decide whether a resolved day gets interrupted, and by what. The chain always
 * takes priority: if strain has pushed you to the next rung, that's the event
 * that fires. Otherwise there's a small chance of a one-off, weighted by where
 * your career actually is — you can't go viral with nothing out, and no fan
 * writes to a stranger.
 */
export function rollDailyEvent(ctx: EventContext, rng: Rng): { event: ActiveEvent | null; rng: Rng } {
  // 1. The chain escalates on its own schedule, driven by strain.
  const chainEvent = chainEventFor(ctx)
  if (chainEvent) return { event: chainEvent, rng }

  // 2. A one-off, sometimes. Base rate is low — texture, not a slot machine.
  const roll = next(rng)
  if (roll.value > ONE_OFF_CHANCE) return { event: null, rng: roll.rng }

  return pickOneOff(ctx, roll.rng)
}

const ONE_OFF_CHANCE = 0.09

/** The chain event owed by the current strain and stage, or null. */
function chainEventFor(ctx: EventContext): ActiveEvent | null {
  const { chain, strain } = ctx
  if (chain.stage === 'clear' && strain >= CRUTCH_AT) {
    return {
      id: 'crutch',
      title: 'A habit',
      text: 'It started as the thing that took the edge off after a show. Lately it is the thing you plan the show around. You could still walk it back.',
      choices: [
        { id: 'ease', label: 'Ease off now' },
        { id: 'deny', label: "You've got it handled" },
      ],
    }
  }
  if (chain.stage === 'crutch' && strain >= SLIPPING_AT) {
    return {
      id: 'slipping',
      title: 'Slipping',
      text: 'You missed a rehearsal, then a whole set was a blur you had to be told about. It is in the music now. People are starting to notice.',
      choices: [
        { id: 'help', label: 'Get help now' },
        { id: 'push', label: 'Push through it' },
      ],
    }
  }
  if (chain.stage === 'slipping' && strain >= BOTTOM_AT) {
    return {
      id: 'bottom',
      title: 'The bottom',
      text: "You cannot pretend this is under control any more, and neither can anyone around you. This is the bottom. What happens next is the whole thing.",
      choices: [
        { id: 'rehab', label: 'Check yourself in' },
        { id: 'push', label: 'Keep going' },
      ],
    }
  }
  if (chain.stage === 'recovering' && chain.weeksRecovering >= RECOVERY_WEEKS) {
    return {
      id: 'comeback',
      title: 'The return',
      text: 'You are steady. You have been steady for a while now, and you are ready to play again. Word got round that you are back.',
      choices: [{ id: 'return', label: 'Play the return show' }],
    }
  }
  return null
}

/** Weighted pick among the one-offs that make sense right now. */
function pickOneOff(ctx: EventContext, rng: Rng): { event: ActiveEvent | null; rng: Rng } {
  const options: Array<{ weight: number; make: () => ActiveEvent }> = []

  // Viral: needs something out and some reach to amplify.
  if (ctx.releasedSongs > 0) {
    options.push({
      weight: 1 + ctx.following / 4000,
      make: () => ({
        id: 'viral',
        title: 'It caught',
        text: 'A clip of one of your songs is going around, and it is not you sharing it. The number is climbing while you watch.',
        choices: [{ id: 'ok', label: 'Watch it climb' }],
      }),
    })
  }
  // A review, once there's a record to review and someone to read it.
  if (ctx.releasedSongs > 0 && ctx.following > 60) {
    options.push({
      weight: 1,
      make: () => ({
        id: 'review',
        title: 'A bad review',
        text: 'Someone with a platform took your record apart. Some of it is fair, which is the part that stings.',
        choices: [
          { id: 'shrug', label: 'Let it go' },
          { id: 'fire', label: 'Fire back' },
        ],
      }),
    })
  }
  // A fan letter, once there are fans.
  if (ctx.following > 150) {
    options.push({
      weight: 0.9,
      make: () => ({
        id: 'fanletter',
        title: 'A letter',
        text: 'Somebody wrote to you. Not a comment — a letter, about a song of yours and a night it got them through.',
        choices: [{ id: 'read', label: 'Read it' }],
      }),
    })
  }
  // A feature offer, once you're worth featuring.
  if (ctx.following > 400) {
    options.push({
      weight: 0.8,
      make: () => ({
        id: 'feature',
        title: 'A feature',
        text: 'A bigger artist wants you on a track. It would put you in front of a lot of new people. It is also not quite your kind of thing.',
        choices: [
          { id: 'take', label: 'Take it' },
          { id: 'pass', label: 'Pass' },
        ],
      }),
    })
  }
  // Gear failure — rare, dramatic, and only if you own something to fail (§10).
  const gear = ctx.ownedGear.filter((i) => i.recordingBonus > 0)
  if (gear.length > 0) {
    options.push({
      weight: 0.5,
      make: () => {
        // Deterministic pick from the seeded roll is done by the caller; here we
        // just take the most valuable piece, so the failure is one that matters.
        const target = gear.reduce((a, b) => (b.value > a.value ? b : a))
        return {
          id: 'gearfail',
          title: 'It died',
          text: `${target.name} gave out. It picked its moment, the way they do. You can pay to fix it, or make do without.`,
          choices: [
            { id: 'repair', label: 'Pay to fix it' },
            { id: 'scrap', label: 'Make do without' },
          ],
          targetItemId: target.id,
        }
      },
    })
  }

  if (options.length === 0) return { event: null, rng }

  const total = options.reduce((s, o) => s + o.weight, 0)
  const pick = nextRange(rng, 0, total)
  let acc = 0
  for (const o of options) {
    acc += o.weight
    if (pick.value <= acc) return { event: o.make(), rng: pick.rng }
  }
  return { event: options[options.length - 1]!.make(), rng: pick.rng }
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Strain, in words — surfaced only when it's high enough to be worth a warning,
 * and never as a number. The game's honest tap on the shoulder before the chain
 * takes it out of your hands.
 */
export function describeStrain(strain: number, stage: AddictionStage): string | null {
  if (stage === 'recovering') return 'You are getting better. Keep at it.'
  if (stage === 'slipping' || stage === 'bottom') {
    return 'This is not sustainable, and some part of you knows it.'
  }
  if (strain >= CRUTCH_AT) return 'You have been living hard. It is starting to leave a mark.'
  if (strain >= 0.35) return 'You have been burning it at both ends.'
  return null
}

export const applyStrain = (strain: number, delta: number): number => clamp(strain + delta, 0, 1)
