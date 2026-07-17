/**
 * Music awards — BRIEF §15.
 *
 * Modelled on the real majors: a prestige/critical show (the Grammy analogue), a
 * popularity/spectacle show (the VMA analogue), plus a genre category and a
 * breakthrough category. Each rewards something different, and the whole point is
 * that YOUR BUILD DECIDES WHICH ARE EVEN IN REACH — "critical darlings win the
 * serious awards with modest sales; chart monsters win the popular ones." It's
 * §1's multiple win conditions, echoed one rung down.
 *
 * PRESTIGE READS CRED (§4/§15); POPULARITY READS FOLLOWING. That split is the
 * spine of the module. A purist with 200 devoted followers can be up for — and
 * win — the serious award while never sniffing the popular one, and vice versa.
 *
 * CAMPAIGNING (§15). You can push for it: a charm offensive is cheap and modest,
 * a big performance slot swings the popular vote, and going all-out swings
 * everything — but an all-out push costs Cred, because the scene sees you being
 * thirsty. Not campaigning is always allowed; the nomination stands on its own.
 *
 * THE PAYOFF (§15): a win is a milestone. It spikes Following AND Cred and opens
 * doors. Losing a nomination still meant something — you were in the room.
 *
 * Pure and serializable. loop.ts runs the season, takes the campaign choice, and
 * books the results.
 */

import { clamp } from './traits.ts'
import { next, type Rng } from './rng.ts'
import { songQuality, type Song } from './songs.ts'

/** A year of weeks — the season comes round once a year. */
export const AWARDS_INTERVAL = 48

export type AwardCategory = 'prestige' | 'popular' | 'genre' | 'breakthrough'

export interface AwardShow {
  readonly category: AwardCategory
  readonly name: string
  /** What being up for it says about you. */
  readonly blurb: string
}

export const AWARD_SHOWS: Readonly<Record<AwardCategory, AwardShow>> = {
  prestige: {
    category: 'prestige',
    name: 'The critics’ award',
    blurb: 'The serious one. Modest sales, monster respect — they vote on the work.',
  },
  popular: {
    category: 'popular',
    name: 'The popular award',
    blurb: 'The big televised one. The crowd votes, and the crowd counts followers.',
  },
  genre: {
    category: 'genre',
    name: 'Best in your genre',
    blurb: 'Your corner of the map, judged by the people who live in it.',
  },
  breakthrough: {
    category: 'breakthrough',
    name: 'Breakthrough of the year',
    blurb: 'The one they only give you once, for the year you appeared out of nowhere.',
  },
}

export type CampaignApproach = 'none' | 'charm' | 'performance' | 'allout'

export interface Campaign {
  readonly id: CampaignApproach
  readonly label: string
  readonly blurb: string
  /** Money it costs to mount. */
  readonly cost: number
  /** Odds boost it buys, per category it applies to. */
  readonly boost: number
  /** Cred it costs — being seen as thirsty (§15). Only the all-out push. */
  readonly credCost: number
}

export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'none',
    label: 'Let it stand',
    blurb: 'No campaign. If the work is enough, it’s enough.',
    cost: 0,
    boost: 0,
    credCost: 0,
  },
  {
    id: 'charm',
    label: 'A charm offensive',
    blurb: 'Dinners, interviews, being gracious to the right people. Cheap, and it helps a little.',
    cost: 40,
    boost: 0.12,
    credCost: 0,
  },
  {
    id: 'performance',
    label: 'Take the performance slot',
    blurb: 'Play the ceremony. It swings the room that votes on numbers.',
    cost: 120,
    boost: 0.22,
    credCost: 0,
  },
  {
    id: 'allout',
    label: 'Go all-out',
    blurb: 'Everything, everywhere. It swings all of it — and the scene sees you wanting it this badly.',
    cost: 250,
    boost: 0.3,
    credCost: 0.08,
  },
]

export const campaignById = (id: CampaignApproach): Campaign =>
  CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0]!

export interface Nomination {
  readonly category: AwardCategory
  /** The base win chance before any campaign — from the stat this show reads. */
  readonly baseChance: number
}

export interface AwardResult {
  readonly category: AwardCategory
  readonly won: boolean
}

export interface AwardsState {
  readonly year: number
  readonly nominations: readonly Nomination[]
  readonly campaign: CampaignApproach | null
  /** Null until the ceremony has been run. */
  readonly results: readonly AwardResult[] | null
}

export interface AwardsContext {
  readonly cred: number
  readonly following: number
  readonly releasedSongs: readonly Song[]
  readonly year: number
}

/**
 * Who's nominated this season, and how strong each shot is. Prestige reads Cred
 * and the quality of the catalogue; popular reads Following; genre wants a
 * catalogue and some standing either way; breakthrough only comes round while
 * you're still new. Returns [] when you're not in anyone's conversation yet.
 */
export function nominationsFor(ctx: AwardsContext): Nomination[] {
  const noms: Nomination[] = []
  const released = ctx.releasedSongs.filter((s) => s.phase === 'released')
  if (released.length === 0) return noms

  const bestQuality = Math.max(...released.map(songQuality))
  const reach = clamp(Math.log10(Math.max(1, ctx.following)) / 4.3, 0, 1)

  // Prestige — the serious one. Cred first, quality behind it.
  if (ctx.cred >= 0.4 && bestQuality >= 0.5) {
    noms.push({ category: 'prestige', baseChance: clamp(ctx.cred * 0.6 + bestQuality * 0.2, 0.1, 0.8) })
  }
  // Popular — the numbers game.
  if (ctx.following >= 2500) {
    noms.push({ category: 'popular', baseChance: clamp(reach * 0.7, 0.1, 0.8) })
  }
  // Genre — a catalogue plus standing on either axis.
  if (released.length >= 2 && (ctx.cred >= 0.28 || ctx.following >= 900)) {
    noms.push({
      category: 'genre',
      baseChance: clamp(0.25 + ctx.cred * 0.3 + reach * 0.25, 0.15, 0.75),
    })
  }
  // Breakthrough — only while you're new, and only if you've actually arrived.
  if (ctx.year <= 2 && ctx.following >= 600 && released.length >= 1) {
    noms.push({ category: 'breakthrough', baseChance: clamp(0.3 + reach * 0.3, 0.2, 0.7) })
  }
  return noms
}

/** Run the ceremony: roll each nomination against its chance plus the campaign. */
export function runCeremony(
  nominations: readonly Nomination[],
  campaign: Campaign,
  rng: Rng,
): { results: AwardResult[]; rng: Rng } {
  const results: AwardResult[] = []
  let r = rng
  for (const nom of nominations) {
    const chance = clamp(nom.baseChance + campaign.boost, 0, 0.92)
    const roll = next(r)
    r = roll.rng
    results.push({ category: nom.category, won: roll.value < chance })
  }
  return { results, rng: r }
}

/**
 * What a win is worth (§15: "spikes Following and Cred and opens doors"). The
 * prestige win is mostly Cred; the popular win is mostly reach; genre and
 * breakthrough sit in between. Scaled off where you already are, so a win always
 * feels like a step up from here.
 */
export function winPayoff(
  category: AwardCategory,
  following: number,
): { followingDelta: number; credDelta: number } {
  switch (category) {
    case 'prestige':
      return { followingDelta: Math.round(200 + following * 0.15), credDelta: 0.14 }
    case 'popular':
      return { followingDelta: Math.round(600 + following * 0.35), credDelta: 0.03 }
    case 'genre':
      return { followingDelta: Math.round(300 + following * 0.2), credDelta: 0.08 }
    case 'breakthrough':
      return { followingDelta: Math.round(400 + following * 0.25), credDelta: 0.06 }
  }
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                          */
/* -------------------------------------------------------------------------- */

export function nominationLine(category: AwardCategory): string {
  const show = AWARD_SHOWS[category]
  return `Nominated: ${show.name}. ${show.blurb}`
}

export function resultLine(result: AwardResult): string {
  const show = AWARD_SHOWS[result.category]
  return result.won
    ? `You won ${show.name}. That opens doors that were shut this morning.`
    : `${show.name} went to someone else. You were in the room, though — that's new.`
}
