/**
 * Routes — BRIEF §5.
 *
 * The six routes are named in the brief verbatim: apply for bands, make your own
 * music, grind the YouTube/creator path, rehearse, work a day job, go out and
 * network. Rest is the seventh, because §5 is explicit that "not every day
 * forces a choice — some days are rest or nothing at all". Resting is a real
 * move here, not a forfeit.
 *
 * A route costs energy and pays out in whatever its owning system tracks. Most
 * of those systems don't exist yet (§6 creator, §7 songwriting, §8 bands), so
 * for now a route moves the state the loop actually owns — energy, mood, money,
 * and a progress counter its future system will consume. `owedBy` names who owes
 * the real payoff. Nothing here fakes a system it doesn't have.
 */

import type { TalentId } from './talents.ts'

export type RouteId =
  | 'rest'
  | 'day_job'
  | 'rehearse'
  | 'make_music'
  | 'creator'
  | 'network'
  | 'apply_bands'

export interface Route {
  readonly id: RouteId
  readonly label: string
  /** Imperative, short — this is a button on a phone. */
  readonly short: string
  readonly blurb: string
  /** Energy spent. Rest spends none; see week.ts for recovery. */
  readonly energy: number
  /** Talents that make this day go better. Empty = skill doesn't apply. */
  readonly talents: readonly TalentId[]
  /** Which brief section owes this route its real payoff. */
  readonly owedBy: string
}

export const ROUTES: readonly Route[] = [
  {
    id: 'rest',
    label: 'Rest',
    short: 'Rest',
    blurb: 'Nothing. Sleep in, see nobody, let your hands stop aching.',
    energy: 0,
    talents: [],
    owedBy: '§5',
  },
  {
    id: 'day_job',
    label: 'Work a day job',
    short: 'Day job',
    blurb: 'A shift. It pays, it costs you the day, and it costs you something else.',
    energy: 18,
    talents: [],
    owedBy: '§12 Finances',
  },
  {
    id: 'rehearse',
    label: 'Rehearse',
    short: 'Rehearse',
    blurb: 'Run the set until your hands know it without you.',
    energy: 15,
    talents: ['stagePresence', 'voice', 'guitar'],
    owedBy: '§9 Live Gigs',
  },
  {
    id: 'make_music',
    label: 'Make your own music',
    short: 'Make music',
    blurb: 'Write. Record. Get something down that did not exist this morning.',
    energy: 22,
    // Writing leans on these; recording leans on Production instead. resolve.ts
    // picks by the song's phase — this list is the writing case (§7).
    talents: ['lyrics', 'creativity', 'composition'],
    owedBy: '§7 — built. Days here go into the song on the bench.',
  },
  {
    id: 'creator',
    label: 'Grind the creator path',
    short: 'Creator',
    blurb: 'Film, cut, post, reply. The treadmill pays in reach, and it takes a toll.',
    energy: 20,
    talents: ['production', 'creativity'],
    owedBy: '§6 Solo/Creator, §4 Following',
  },
  {
    id: 'network',
    label: 'Go out and network',
    short: 'Network',
    blurb: 'Be in the room. Talk to people. Some of them matter.',
    energy: 16,
    talents: ['stagePresence'],
    owedBy: '§8 The Band, §14 Superfans',
  },
  {
    id: 'apply_bands',
    label: 'Apply for bands',
    short: 'Apply',
    blurb: 'Answer the ads. Send the messages. Wait.',
    energy: 12,
    talents: ['voice', 'guitar', 'keys', 'drums', 'bass'],
    owedBy: '§8 The Band',
  },
]

export const routeById = (id: RouteId): Route => {
  const found = ROUTES.find((r) => r.id === id)
  if (!found) throw new Error(`Unknown route: ${id}`)
  return found
}

/** Rest is offered apart from the rest — it isn't one option among six. */
export const ACTION_ROUTES: readonly Route[] = ROUTES.filter((r) => r.id !== 'rest')
