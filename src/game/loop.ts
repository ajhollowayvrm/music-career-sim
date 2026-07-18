/**
 * The daily loop — BRIEF §5. Pure reducer, no React.
 *
 * Shape: plan a week, then watch it happen a day at a time. The week is the
 * planning surface; the DAY is still the clock, exactly as §5 insists.
 *
 * A booked gig (§9) takes its day and hands control to gig.ts, which is what the
 * day-at-a-time clock was preserved for: a gig is something you play, not
 * something that happens to you while the week resolves past it.
 *
 * Deliberately NOT here, because other sections own them:
 *   §8  the band — no bandmates, so no set-order arguments and no stamina to
 *       manage. Gigs are solo.
 *   §12 the fail state — money moves, but going broke doesn't end anything yet.
 *   §16 events — nothing interrupts a WEEK yet. Gigs have their own in-set
 *       events (§9 names them), but the engine that fires events into ordinary
 *       days is still §16's.
 */

import type { Character } from './character.ts'
import { makeRng, next, nextRange, type Rng } from './rng.ts'
import { resolveDay, type DayResult } from './resolve.ts'
import type { RouteId } from './routes.ts'
import {
  compositionCeiling,
  newSong,
  productionCeiling,
  sessionGain,
  type ReleaseChannel,
  type Song,
} from './songs.ts'
import { rollTrajectory, weeklyEarning } from './release.ts'
import {
  BACKLASH_CRED_COST,
  STARTING_CRED,
  STARTING_FOLLOWING,
  credFromRelease,
  followingFromRelease,
  rollBacklash,
} from './fame.ts'
import { clamp } from './traits.ts'
import { genreOf } from './songs.ts'
import { makeBandmate, makeBandmates, type Bandmate } from './bandmates.ts'
import {
  bandChemistry,
  bandCompositionCeiling,
  mateFit,
  nudgeAll,
  nudgeOne,
  pushedOut,
  startingChemistry,
  startingStanding,
  willQuit,
  type Band,
  type Chemistry,
} from './band.ts'
import { NIGHTLY_RECOVERY } from './week.ts'
import { VENUES, canPlay, venueById, type Venue } from './venues.ts'
import {
  COVER_ID,
  CROWD_MAX,
  GIG_EVENTS,
  allowsCovers,
  canFillSet,
  choicesFor,
  handlingFit,
  isCover,
  newGig,
  personaBreak,
  playCover,
  playSong,
  playableSongs,
  settleGig,
  type GigBeat,
  type GigEventId,
  type GigResult,
  type GigState,
} from './gig.ts'
import {
  DAYS_IN_WEEK,
  START_ENERGY,
  canPlayWeek,
  emptyPlan,
  type WeekPlan,
} from './week.ts'
import { assessRent, isEvicted, type RentEvent } from './finances.ts'
import type { OriginId } from './origins.ts'
import {
  buyBackItem,
  expirePawns,
  moodCostOfLosing,
  pawnItem as pawnItemOp,
  reclaimItem as reclaimItemOp,
  sellItem as sellItemOp,
  startingInventory,
  type Item,
} from './items.ts'
import { buyGear, gearById, gearRecordingBonus, ownsRecordingGear } from './gear.ts'
import {
  LABEL_INTEREST_THRESHOLD,
  applyRoyalties,
  deliverUnderDeal,
  isFulfilled,
  makeLabelOffer,
  signCredCost,
  signOffer,
  tickPatience,
  wouldDrop,
  type LabelDeal,
  type LabelOffer,
} from './label.ts'
import {
  STARTING_STRAIN,
  WEEKLY_STRAIN_DECAY,
  applyStrain,
  chainWeekly,
  dailyStrainDelta,
  resolveEvent,
  rollDailyEvent,
  startingChain,
  type ActiveEvent,
  type ChainState,
} from './events.ts'
import {
  MIN_ORDER,
  ageDrop,
  deadStockLoss,
  maxOrder,
  merchCredDelta,
  merchQuality,
  newDrop,
  orderCost,
  productById,
  weeklyMerchSales,
  type MerchDrop,
  type Scarcity,
} from './merch.ts'
import {
  ATTENTION_PER_WEEK,
  backlashSwing,
  collectorPower,
  criticDrag,
  crowdBump,
  curatorAmplification,
  driftFan,
  evangelistFollowing,
  makeSuperfan,
  nurture,
  superfanTargetCount,
  type Superfan,
} from './superfans.ts'
import {
  AWARDS_INTERVAL,
  campaignById,
  nominationsFor,
  runCeremony,
  winPayoff,
  type AwardsState,
  type CampaignApproach,
} from './awards.ts'
import { ageForWeek, evaluateEnding, forcedRetirement, rebrandCost, type Ending } from './career.ts'

/** Deducted every week — §12 will decide what happens when you can't pay it. */
export const COST_OF_LIVING = 200
export const STARTING_MONEY = 400
export const STARTING_MOOD = 60

/** The up-front price of a creator push (§4) — content costs, and it reads populist. */
export const CREATOR_PUSH_CRED_COST = 0.03
export const CREATOR_PUSH_MONEY_COST = 20

/**
 * A gig on the calendar (§9), which is what §5 means by a scheduled commitment
 * creating opportunity cost around it: the day is spoken for, and how you spend
 * the days either side decides whether you turn up sharp or wrecked.
 */
export interface Booking {
  readonly venueId: string
  readonly dayIndex: number
}

/** A gig night costs you the day, like any other. */
export const GIG_ENERGY = 20

export type LoopPhase =
  | 'planning'
  | 'resolving'
  | 'gig'
  | 'summary'
  | 'gameover'
  | 'awards'
  | 'ended'

export interface LoopState {
  readonly week: number
  readonly phase: LoopPhase
  readonly energy: number
  readonly mood: number
  readonly money: number
  readonly plan: WeekPlan
  /** §9. One gig a week, on a day you choose. */
  readonly booking: Booking | null
  /** The gig happening right now, if the week has reached it. */
  readonly gig: GigState | null
  /**
   * §9's tracked persona: the running mean of the registers you choose on stage,
   * -1 composed .. +1 feral, and how many nights it's built from. Going against
   * it is an event; you can't break a habit you haven't formed.
   */
  readonly persona: number
  readonly personaSamples: number
  /** Days resolved so far this week, in order. */
  readonly days: readonly DayResult[]
  /** Money taken by cost of living at the end of the week just played. */
  readonly lastCostOfLiving: number
  /**
   * §12. Weeks of grace left on overdue rent. 0 = square with the landlord;
   * above 0 = on notice, and it runs out into eviction. Persists across weeks —
   * only catching up or being evicted clears it.
   */
  readonly graceWeeksLeft: number
  /** §12. What rent did in the week just played, for the summary to speak. */
  readonly lastRentEvent: RentEvent
  /** §11. What you own — the safety net you hollow out to make rent. */
  readonly inventory: readonly Item[]
  /** §11. Things you've sold or let lapse at the pawnbroker — buy back at 3×. */
  readonly formerItems: readonly Item[]
  /** §11. Ids come from a counter, not Date/random — state stays serializable. */
  readonly nextItemId: number
  /** §11. Names of items a lapsed pawn window took this week, for the board. */
  readonly pawnForfeited: readonly string[]
  /** §16. Hidden pressure from hard living — drives the addiction chain. */
  readonly strain: number
  /** §16. Where the addiction→comeback chain currently stands. */
  readonly chain: ChainState
  /** §16. An event interrupting the week, waiting on an answer. Null = none. */
  readonly activeEvent: ActiveEvent | null
  /** §16. Outcomes of events this week, for the day log and the summary. */
  readonly eventLog: readonly string[]
  /** §13. Merch drops you've put out — each an inventory gamble. */
  readonly merch: readonly MerchDrop[]
  /** §13. Ids from a counter, not Date/random — state stays serializable. */
  readonly nextDropId: number
  /** §13. What merch paid in the week just played, for the summary. */
  readonly lastMerchRevenue: number
  /** §13. Money left dead in the box on runs that closed this week (a loss). */
  readonly lastDeadStock: number
  /** §14. Named faces inside the Following number — the people you can know. */
  readonly superfans: readonly Superfan[]
  /** §14. Attention spent tending fans this week. Finite — that's the mechanic. */
  readonly attentionUsed: number
  /** §14. Names of fans who emerged or curdled this week, for the summary. */
  readonly fanNews: readonly string[]
  /** §15. An awards season in progress, or null. Drives the 'awards' phase. */
  readonly awards: AwardsState | null
  /** §15/§17. Awards won across the run — a milestone counter. */
  readonly awardsWon: number
  /** §17. The rebranded stage name, or null to use the one from creation. */
  readonly stageName: string | null
  /** §17. Whether you've ever played a room — a milestone that can't un-happen. */
  readonly everPlayedGig: boolean
  /** §17. The ending, once the run is over by choice or by age. */
  readonly ending: Ending | null
  /** Everything you've ever written (§7). */
  readonly songs: readonly Song[]
  /** The song 'make music' days work on. Null = the bench is empty. */
  readonly activeSongId: number | null
  /** Ids come from a counter, not Date/random — state stays serializable. */
  readonly nextSongId: number
  /** What the catalog paid in the week just played. */
  readonly lastCatalogEarnings: number
  /** §4. Reach. Shown — the world counts it for you. */
  readonly following: number
  /** §4. Standing, 0..1. Never shown as a number. */
  readonly cred: number
  /** Reach gained in the week just played, for the summary. */
  readonly lastFollowingGain: number
  /** Titles of songs that triggered a backlash on release this week (§4). */
  readonly lastBacklash: readonly string[]
  /** The gig just played, for the week summary. */
  readonly lastGig: { readonly venueName: string; readonly result: GigResult } | null
  /** §8. The band, if you're in one. */
  readonly band: Band | null
  /** Bands looking for someone — what 'apply for bands' days turn up (§5). */
  readonly bandOffers: readonly BandOffer[]
  /** People who'd join the band you founded. */
  readonly recruits: readonly Bandmate[]
  readonly nextMateId: number
  /** §8: they make demands. One at a time, waiting on an answer. */
  readonly demand: Demand | null
  /** Things the band did this week, for the summary. */
  readonly bandNews: readonly string[]
  /** §4: the label you're signed to, or null (independent). */
  readonly label: LabelDeal | null
  /** §4: a deal on the table waiting on a yes or no, or null. */
  readonly labelOffer: LabelOffer | null
  /** Label news this week (signed, recouped, dropped), for the summary. */
  readonly labelNews: readonly string[]
  readonly rng: Rng
}

/** An existing band that would have you. §8: you can join and rise. */
export interface BandOffer {
  readonly id: number
  readonly name: string
  readonly members: readonly Bandmate[]
}

/** §8: "they can make demands, act on their own, and quit." */
export interface Demand {
  readonly mateId: number
  readonly text: string
  readonly acceptText: string
  readonly refuseText: string
}

export function initialLoopState(seed: number, originId?: OriginId): LoopState {
  // §11: the run starts with a keepsake (if we know the origin) and a few
  // sellable luxuries — the safety net §12 lets you hollow out.
  const { items, nextItemId } = startingInventory(originId, 1)
  return {
    week: 1,
    phase: 'planning',
    energy: START_ENERGY,
    mood: STARTING_MOOD,
    money: STARTING_MONEY,
    plan: emptyPlan(),
    booking: null,
    gig: null,
    persona: 0,
    personaSamples: 0,
    days: [],
    lastCostOfLiving: 0,
    graceWeeksLeft: 0,
    lastRentEvent: 'none',
    inventory: items,
    formerItems: [],
    nextItemId,
    pawnForfeited: [],
    strain: STARTING_STRAIN,
    chain: startingChain(),
    activeEvent: null,
    eventLog: [],
    merch: [],
    nextDropId: 1,
    lastMerchRevenue: 0,
    lastDeadStock: 0,
    superfans: [],
    attentionUsed: 0,
    fanNews: [],
    awards: null,
    awardsWon: 0,
    stageName: null,
    everPlayedGig: false,
    ending: null,
    songs: [],
    activeSongId: null,
    nextSongId: 1,
    lastCatalogEarnings: 0,
    following: STARTING_FOLLOWING,
    cred: STARTING_CRED,
    lastFollowingGain: 0,
    lastBacklash: [],
    lastGig: null,
    band: null,
    bandOffers: [],
    recruits: [],
    nextMateId: 1,
    demand: null,
    bandNews: [],
    label: null,
    labelOffer: null,
    labelNews: [],
    rng: makeRng(seed),
  }
}

/** How many ways the money splits. §6: a band shares it. */
export const shareCount = (state: LoopState): number =>
  state.band ? state.band.members.length + 1 : 1

export const splitMoney = (state: LoopState, amount: number): number =>
  Math.round(amount / shareCount(state))

export const songById = (state: LoopState, id: number | null): Song | undefined =>
  id === null ? undefined : state.songs.find((s) => s.id === id)

export const activeSong = (state: LoopState): Song | undefined =>
  songById(state, state.activeSongId)

/** Songs still being made — the bench. */
export const workbench = (state: LoopState): readonly Song[] =>
  state.songs.filter((s) => s.phase !== 'released')

export const released = (state: LoopState): readonly Song[] =>
  state.songs.filter((s) => s.phase === 'released')

export type LoopAction =
  | { type: 'setDay'; dayIndex: number; routeId: RouteId | null }
  | { type: 'clearPlan' }
  | { type: 'playWeek' }
  | { type: 'advanceDay'; character: Character }
  | { type: 'finishWeek' }
  | { type: 'nextWeek' }
  // §7
  | {
      type: 'startSong'
      title: string
      genreId: string
      themes: readonly string[]
      tempo: number
      feel: number
    }
  | { type: 'setActiveSong'; songId: number }
  | { type: 'callItWritten'; songId: number }
  | { type: 'releaseSong'; songId: number; channel: ReleaseChannel }
  | { type: 'abandonSong'; songId: number }
  // §4 — labels
  | { type: 'signLabel' }
  | { type: 'declineLabel' }
  | { type: 'leaveLabel' }
  // §9
  | { type: 'bookGig'; venueId: string; dayIndex: number }
  | { type: 'cancelBooking' }
  | { type: 'toggleSetlistSong'; songId: number }
  | { type: 'addCover' }
  | { type: 'removeFromSet'; index: number }
  | { type: 'startPerformance' }
  | { type: 'playNextSong'; character: Character }
  | { type: 'gigChoose'; choiceId: string }
  | { type: 'gigHandle'; handlingId: string }
  | { type: 'finishGig' }
  // §8
  | { type: 'foundBand'; name: string }
  | { type: 'joinBand'; offerId: number }
  | { type: 'recruit'; mateId: number }
  | { type: 'leaveBand' }
  | { type: 'answerDemand'; accept: boolean }
  // §11
  | { type: 'sellItem'; itemId: number }
  | { type: 'pawnItem'; itemId: number }
  | { type: 'reclaimItem'; itemId: number }
  | { type: 'buyBackItem'; itemId: number }
  // §10
  | { type: 'buyGear'; catalogId: string }
  // §16
  | { type: 'chooseEvent'; choiceId: string }
  // §14
  | { type: 'nurtureFan'; fanId: number }
  // §15
  | { type: 'campaignAwards'; approach: CampaignApproach }
  | { type: 'closeAwards' }
  // §17
  | { type: 'rebrand'; newName: string }
  | { type: 'retire' }
  // §13
  | {
      type: 'makeMerch'
      name: string
      productId: string
      tiedTo: string
      quantity: number
      price: number
      scarcity: Scarcity
      character: Character
    }

export function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'setDay': {
      if (state.phase !== 'planning') return state
      if (action.dayIndex < 0 || action.dayIndex >= DAYS_IN_WEEK) return state
      const plan = [...state.plan]
      // Tapping the route already there clears the day back to nothing.
      plan[action.dayIndex] = plan[action.dayIndex] === action.routeId ? null : action.routeId
      return { ...state, plan }
    }

    case 'clearPlan':
      return state.phase === 'planning' ? { ...state, plan: emptyPlan() } : state

    case 'playWeek':
      if (state.phase !== 'planning' || !canPlayWeek(state.plan)) return state
      // The board's pawn-forfeit notice has been read by now — clear it.
      return { ...state, phase: 'resolving', days: [], pawnForfeited: [] }

    case 'advanceDay': {
      if (state.phase !== 'resolving') return state
      // §16: a day can't advance while an event is waiting on an answer.
      if (state.activeEvent) return state
      const dayIndex = state.days.length
      if (dayIndex >= DAYS_IN_WEEK) return state

      // §9: the gig takes the day. Hand control to the two acts rather than
      // resolving this day automatically — the whole point of a gig is that you
      // play it, not that it happens to you.
      if (state.booking && state.booking.dayIndex === dayIndex) {
        // §14: a ride-or-die in the room lifts it before you play a note.
        const fresh = newGig(venueById(state.booking.venueId), dayIndex, state.following)
        return {
          ...state,
          phase: 'gig',
          gig: { ...fresh, crowd: clamp(fresh.crowd + crowdBump(state.superfans), 0, CROWD_MAX) },
        }
      }

      // An unplanned day is a rest day — §5: some days are nothing at all.
      const routeId: RouteId = state.plan[dayIndex] ?? 'rest'
      const song = activeSong(state)

      const { result, rng } = resolveDay({
        dayIndex,
        routeId,
        energy: state.energy,
        mood: state.mood,
        character: action.character,
        song,
        rng: state.rng,
      })

      // A day of music moves the song on the bench (§7). Talent sets the
      // ceiling; the day's quality decides how much of the remaining headroom
      // this session closes.
      let songs = state.songs
      if (routeId === 'make_music' && song && song.phase !== 'released') {
        songs = state.songs.map((s) => {
          if (s.id !== song.id) return s
          if (s.phase === 'writing') {
            // §8's trap: with a band, the ceiling is the BAND's — which is above
            // your solo ceiling when the chemistry is there and below it when it
            // isn't. A bad band doesn't fail to help; it stifles you.
            const ceiling =
              state.band && state.band.members.length > 0
                ? bandCompositionCeiling(action.character, state.band)
                : compositionCeiling(action.character)
            return {
              ...s,
              composition: s.composition + sessionGain(s.composition, ceiling, result.quality),
              writingSessions: s.writingSessions + 1,
            }
          }
          // §10: the recording ceiling reads the gear you own. Better rig, higher
          // cap; sell the rig and the cap drops with it.
          const prodCeiling = productionCeiling(
            action.character,
            gearRecordingBonus(state.inventory),
            ownsRecordingGear(state.inventory),
          )
          return {
            ...s,
            production: s.production + sessionGain(s.production, prodCeiling, result.quality),
            recordingSessions: s.recordingSessions + 1,
          }
        })
      }

      // §8 — what the day did to the people around you.
      let band = state.band
      let bandOffers = state.bandOffers
      let recruits = state.recruits
      let nextMateId = state.nextMateId
      let rngAfter = rng

      if (routeId === 'apply_bands' && !result.burntOut) {
        // §5's 'apply for bands' finally pays out. What turns up depends on
        // whether you have a room of your own: with a band you founded, people
        // answer YOUR ad; without one, you answer theirs.
        const found = rollBandContacts(state, result.quality, rngAfter, nextMateId)
        bandOffers = found.offers
        recruits = found.recruits
        nextMateId = found.nextMateId
        rngAfter = found.rng
      }

      if (band && band.members.length > 0 && !result.burntOut) {
        if (routeId === 'rehearse') {
          // Turning up and doing the work buys trust and respect. It does not
          // make anyone like you — that's the facets being independent (§8).
          band = nudgeAll(band, {
            professionalTrust: 0.05 + result.quality * 0.04,
            musicalRespect: result.quality * 0.05,
            friendship: 0.015,
          })
        }
        if (routeId === 'make_music' && song) {
          // §3's mismatch, from their side: writing music a member has no
          // feeling for costs you their respect, however good it is.
          const axes = genreOf(song).axes as unknown as Record<string, number>
          for (const m of band.members) {
            const fit = mateFit(m, axes)
            band = nudgeOne(band, m.id, {
              musicalRespect: (fit - 0.5) * 0.06,
              friendship: (fit - 0.55) * 0.03,
            })
          }
        }
        if (routeId === 'day_job' || routeId === 'creator') {
          // Days you spend being someone other than this band's member. They notice.
          band = nudgeAll(band, { professionalTrust: -0.012 })
        }
      }

      // §16: the day is done — hard living moves strain, and then the evening
      // may bring something you didn't schedule. The chain takes priority over
      // the one-offs; a fired event pauses the week until it's answered.
      const followingNow = state.following + result.followingDelta
      const strainAfter = applyStrain(
        state.strain,
        dailyStrainDelta(routeId, result.burntOut, state.mood),
      )
      const ev = rollDailyEvent(
        {
          strain: strainAfter,
          chain: state.chain,
          mood: result.moodAfter,
          energy: result.energyAfter,
          following: followingNow,
          cred: clamp(state.cred + result.credDelta, 0, 1),
          releasedSongs: released(state).length,
          ownedGear: state.inventory.filter((i) => i.status.kind === 'owned'),
          week: state.week,
        },
        rngAfter,
      )

      // Resolving a day never ends the week. It used to, and that silently ate
      // Sunday: the seventh day resolved and the screen flipped to the summary
      // in the same tick, so its report was never read. Closing the week is
      // 'finishWeek', which the player asks for once they've seen all seven.
      return {
        ...state,
        rng: ev.rng,
        days: [...state.days, result],
        songs,
        band,
        bandOffers,
        recruits,
        nextMateId,
        energy: result.energyAfter,
        mood: result.moodAfter,
        money: state.money + result.moneyDelta,
        following: followingNow,
        cred: clamp(state.cred + result.credDelta, 0, 1),
        strain: strainAfter,
        activeEvent: ev.event,
      }
    }

    case 'finishWeek': {
      if (state.phase !== 'resolving' || state.days.length < DAYS_IN_WEEK) return state
      const rngHere = state.rng

      // The catalog pays, then the bills land. Income arrives in dribs against a
      // lump sum — that squeeze is §12's whole point.
      
      // §4: what's out in the world also brings reach and standing, and which of
      // the two depends on where the song sits on the underground↔mainstream
      // axis. Mainstream reaches further; underground earns respect. Same songs,
      // opposite currencies — that's the fork.
      const followingGain = state.songs.reduce((sum, s) => sum + followingFromRelease(s), 0)
      const credGain = state.songs.reduce((sum, s) => sum + credFromRelease(s), 0)

      const aged = state.songs.map((s) =>
        s.phase === 'released'
          ? { ...s, weeksOut: s.weeksOut + 1, earnings: s.earnings + weeklyEarning(s) }
          : s,
      )

      // §6: a band shares the money. Songs written in the band are the band's.
      // §4: a record out under a label pays through the deal first — the label
      // takes its cut and the advance eats your royalties until it's recouped, so
      // a "signed and successful" week can still put £0 in your pocket. The deal
      // is threaded through the catalogue because the recoup balance falls as each
      // song pays.
      const bandShare = shareCount(state)
      let dealDuringWeek = state.label
      let myCatalog = 0
      for (const s of state.songs) {
        const gross = weeklyEarning(s)
        if (gross <= 0) continue
        let take = gross
        if (s.underLabel && dealDuringWeek) {
          const routed = applyRoyalties(dealDuringWeek, gross)
          dealDuringWeek = routed.deal
          take = routed.paidToArtist
        }
        if (s.writtenWithBand) take = take / bandShare
        myCatalog += Math.round(take)
      }

      // §8 — the weekly pass over the people. They act on their own.
      const after = runBandWeek(state, rngHere)

      // §12: the bills land, then rent is judged. Going under water serves
      // notice; a month of it still under water is eviction, and the run ends.
      // §13: the merch sells. A gig this week is the big multiplier — a room
      // that came for you. Revenue counts toward rent; dead stock on a run that
      // closes is money you fronted and won't get back. Kept as the player's,
      // not split (§13: it's your brand), unlike the door and the catalogue.
      const gigScore = state.lastGig ? state.lastGig.result.score : null
      const collectors = collectorPower(state.superfans)
      let merchRevenue = 0
      let merchCred = 0
      let deadStock = 0
      const merchAfter = state.merch.map((drop) => {
        if (drop.closed) return drop
        const { units, revenue } = weeklyMerchSales(drop, {
          following: state.following,
          gigScore,
          collectorPower: collectors,
        })
        merchRevenue += revenue
        merchCred += merchCredDelta(drop)
        const aged = ageDrop(drop, units)
        if (aged.closed) deadStock += deadStockLoss(aged)
        return aged
      })

      const moneyAfter = state.money + myCatalog + merchRevenue - COST_OF_LIVING
      const rent = assessRent(moneyAfter, state.graceWeeksLeft)

      // §16: where you are in the chain weighs on the week — the bottom stalls
      // your reach and drags your mood, recovery quietly heals — and strain
      // bleeds off a little, while recovery counts toward the comeback.
      const chainWk = chainWeekly(state.chain)
      const dampenedFollowingGain = Math.round(followingGain * chainWk.followingMult)
      const strainNext = applyStrain(state.strain, -WEEKLY_STRAIN_DECAY)
      const chainNext: ChainState = {
        ...state.chain,
        weeksRecovering:
          state.chain.stage === 'recovering'
            ? state.chain.weeksRecovering + 1
            : state.chain.weeksRecovering,
      }

      // §14: the people inside the number do their work, then the week cools the
      // ones you didn't tend. Curators amplify the release reach; evangelists
      // bring people; critics (fans you let curdle) bleed them away.
      const curatorBoost = 1 + curatorAmplification(state.superfans)
      const amplifiedFollowingGain = Math.round(dampenedFollowingGain * curatorBoost)
      const fanFollowing = evangelistFollowing(state.superfans) - criticDrag(state.superfans)
      const followingTotal = Math.max(0, state.following + amplifiedFollowingGain + fanFollowing)

      const fanNews: string[] = []
      let driftedFans = state.superfans.map((f) => {
        const after = driftFan(f)
        if (!f.critic && after.critic) fanNews.push(`${after.name} has turned on you.`)
        return after
      })

      // New faces step out of the crowd as the number grows (§14).
      const target = superfanTargetCount(followingTotal)
      let sfRng = after.rng
      let nextSfId = driftedFans.reduce((m, f) => Math.max(m, f.id), 0) + 1
      while (driftedFans.length < target) {
        const taken = driftedFans.map((f) => f.name)
        const made = makeSuperfan(nextSfId, taken, sfRng)
        driftedFans = [...driftedFans, made.fan]
        fanNews.push(`${made.fan.name} has become a real fan — one of the ones you could actually know.`)
        sfRng = made.rng
        nextSfId += 1
      }

      // §15: once a year the season comes round. If your build has put you in
      // anyone's conversation, a nomination is waiting after the summary.
      let awardsNext = state.awards
      if (state.week % AWARDS_INTERVAL === 0) {
        const year = state.week / AWARDS_INTERVAL
        const credNow = clamp(state.cred + credGain + merchCred, 0, 1)
        const noms = nominationsFor({ cred: credNow, following: followingTotal, releasedSongs: aged, year })
        if (noms.length > 0) awardsNext = { year, nominations: noms, campaign: null, results: null }
      }

      // §4: settle the deal for the week. The advance may have just earned back;
      // the label's patience ticks down between records, and a label still owed
      // records that has run out of patience drops you — you keep the advance,
      // but it costs standing and mood, and you're independent again.
      const labelNews = [...state.labelNews]
      let labelFinal = dealDuringWeek
      let labelCredHit = 0
      let labelMoodHit = 0
      if (dealDuringWeek) {
        if (state.label && state.label.recoupBalance > 0 && dealDuringWeek.recoupBalance <= 0) {
          labelNews.push('The advance is earned back. Your royalties reach you now.')
        }
        const ticked = tickPatience(dealDuringWeek)
        if (wouldDrop(ticked)) {
          labelNews.push(`${ticked.labelName} dropped you. You keep the advance; you keep nothing else.`)
          labelFinal = null
          labelCredHit = 0.08
          labelMoodHit = 12
        } else {
          labelFinal = ticked
        }
      }

      // §4: label interest builds with reach. Independent (or with a deal already
      // fulfilled) and known enough, a fresh offer can land after the summary.
      let labelOfferNext = state.labelOffer
      const canBeCourted = (labelFinal === null || isFulfilled(labelFinal)) && !state.labelOffer
      if (canBeCourted && followingTotal >= LABEL_INTEREST_THRESHOLD) {
        const roll = next(sfRng)
        sfRng = roll.rng
        const chance = clamp((followingTotal - LABEL_INTEREST_THRESHOLD) / 6000, 0.04, 0.4)
        if (roll.value < chance) {
          const made = makeLabelOffer(followingTotal, clamp(state.cred + credGain, 0, 1), sfRng)
          labelOfferNext = made.offer
          sfRng = made.rng
          labelNews.push(`${made.offer.labelName} want to talk. There's an offer on the table.`)
        }
      }

      return {
        ...after.state,
        songs: aged,
        phase: isEvicted(rent.event) ? 'gameover' : 'summary',
        money: moneyAfter,
        graceWeeksLeft: rent.graceWeeksLeft,
        lastRentEvent: rent.event,
        lastCostOfLiving: COST_OF_LIVING,
        lastCatalogEarnings: myCatalog,
        merch: merchAfter,
        lastMerchRevenue: merchRevenue,
        lastDeadStock: deadStock,
        following: followingTotal,
        cred: clamp(state.cred + credGain + merchCred - labelCredHit, 0, 1),
        mood: clamp(state.mood + chainWk.moodDelta - labelMoodHit, 0, 100),
        strain: strainNext,
        chain: chainNext,
        superfans: driftedFans,
        fanNews,
        awards: awardsNext,
        label: labelFinal,
        labelOffer: labelOfferNext,
        labelNews,
        lastFollowingGain:
          amplifiedFollowingGain +
          fanFollowing +
          state.days.reduce((s, d) => s + d.followingDelta, 0),
        rng: sfRng,
      }
    }

    case 'nextWeek': {
      if (state.phase !== 'summary') return state
      // §11: a pawn window that lapsed over the turn forfeits the item — it goes
      // to the sold pile, reclaimable only at the 3× buy-back now.
      const nextWeekNo = state.week + 1
      const lapsed = expirePawns(state.inventory, nextWeekNo)
      // §17: the curtain comes down on its own at 95, whatever else was pending.
      if (forcedRetirement(nextWeekNo)) {
        return { ...state, week: nextWeekNo, phase: 'ended', ending: endingFor(state, false) }
      }

      return {
        ...state,
        week: nextWeekNo,
        // §15: a pending nomination takes the screen before the new week's plan.
        phase: state.awards ? 'awards' : 'planning',
        inventory: lapsed.inventory,
        formerItems: [...state.formerItems, ...lapsed.forfeited],
        pawnForfeited: lapsed.forfeited.map((i) => i.name),
        plan: emptyPlan(),
        days: [],
        lastCostOfLiving: 0,
        // graceWeeksLeft is NOT reset — being behind on rent carries into next
        // week (§12). Only catching up or eviction clears it.
        lastRentEvent: 'none',
        lastCatalogEarnings: 0,
        lastMerchRevenue: 0,
        lastDeadStock: 0,
        lastFollowingGain: 0,
        lastBacklash: [],
        lastGig: null,
        gig: null,
        // §16: this week's events have been read in the summary — start clean.
        eventLog: [],
        // §14: a fresh week's attention, and last week's tending is spent.
        attentionUsed: 0,
        superfans: state.superfans.map((f) => ({ ...f, tendedThisWeek: false })),
        fanNews: [],
        // §4: label news was read in the summary — start the new week clean.
        labelNews: [],
      }
    }

    /* ---- §7 Songwriting ---------------------------------------------- */

    case 'startSong': {
      if (state.phase !== 'planning') return state
      if (!action.title.trim()) return state
      // §6: songs made in a band are the band's, and the money splits. Fixed at
      // the start — a song begun alone stays yours even if you join next week.
      const withBand = !!state.band && state.band.members.length > 0
      const song = {
        ...newSong(
          state.nextSongId,
          action.title,
          action.genreId,
          action.themes,
          action.tempo,
          action.feel,
        ),
        writtenWithBand: withBand,
      }
      return {
        ...state,
        songs: [...state.songs, song],
        // A new song goes straight on the bench — you started it to work on it.
        activeSongId: song.id,
        nextSongId: state.nextSongId + 1,
      }
    }

    case 'setActiveSong': {
      const song = songById(state, action.songId)
      if (!song || song.phase === 'released') return state
      return { ...state, activeSongId: action.songId }
    }

    case 'callItWritten': {
      const song = songById(state, action.songId)
      if (!song || song.phase !== 'writing') return state
      // No minimum. Releasing a half-written song is a legitimate bad decision,
      // and §5's whole posture is that the game warns rather than blocks.
      return {
        ...state,
        songs: state.songs.map((s) => (s.id === song.id ? { ...s, phase: 'recording' } : s)),
      }
    }

    case 'releaseSong': {
      if (state.phase !== 'planning') return state
      const song = songById(state, action.songId)
      if (!song || song.phase !== 'recording') return state

      // The channel (§4/§7) is fixed the moment it goes out — it decides the
      // song's reach, its standing, and its odds of catching, so the trajectory
      // is rolled AFTER it's set.
      const channel: ReleaseChannel = action.channel
      const released: Song = { ...song, channel }
      const rolled = rollTrajectory(released, state.rng)

      // §4: "any move that reads as selling out risks a backlash event." Only a
      // mainstream release, and only if you had standing to trade — a pop record
      // from someone with no Cred betrays nobody.
      const back = rollBacklash(released, state.cred, rolled.rng)

      // §14: your people move a backlash. Ride-or-dies defend you, softening the
      // Cred hit; critics you let curdle pile on and sharpen it.
      const swing = backlashSwing(state.superfans)
      const backlashCost = back.backlash
        ? BACKLASH_CRED_COST * clamp(1 - swing, 0.25, 1.75)
        : 0

      // §4: a creator push costs standing and a little money to make the content
      // up front — the price of the reach it buys, paid whether or not it catches.
      const pushCredCost = channel === 'creator' ? CREATOR_PUSH_CRED_COST : 0
      const pushMoneyCost = channel === 'creator' ? CREATOR_PUSH_MONEY_COST : 0

      // §4: signed? This record goes out through the label — it reaches further,
      // it counts against what you owe them, and its money runs through the deal.
      const underLabel = state.label !== null
      const labelAfter = state.label ? deliverUnderDeal(state.label) : null
      const labelNews =
        labelAfter && isFulfilled(labelAfter) && !isFulfilled(state.label!)
          ? [...state.labelNews, `That's the last record you owed ${labelAfter.labelName}. The deal is fulfilled.`]
          : state.labelNews

      return {
        ...state,
        rng: back.rng,
        money: state.money - pushMoneyCost,
        label: labelAfter,
        labelNews,
        songs: state.songs.map((s) =>
          s.id === song.id
            ? {
                ...s,
                channel,
                underLabel,
                phase: 'released',
                releasedWeek: state.week,
                weeksOut: 0,
                trajectory: rolled.trajectory,
              }
            : s,
        ),
        cred: clamp(state.cred - backlashCost - pushCredCost, 0, 1),
        lastBacklash: back.backlash ? [...state.lastBacklash, song.title] : state.lastBacklash,
        // It's out; it can't be worked on any more.
        activeSongId: state.activeSongId === song.id ? null : state.activeSongId,
      }
    }

    case 'abandonSong': {
      if (state.phase !== 'planning') return state
      const song = songById(state, action.songId)
      if (!song || song.phase === 'released') return state
      return {
        ...state,
        songs: state.songs.filter((s) => s.id !== song.id),
        activeSongId: state.activeSongId === song.id ? null : state.activeSongId,
      }
    }

    /* ---- §4 Labels --------------------------------------------------- */

    case 'signLabel': {
      // A re-sign is allowed (an old deal that's fulfilled gets replaced); a live
      // deal with records still owed is not — you can't sign two at once.
      if (!state.labelOffer) return state
      if (state.label && !isFulfilled(state.label)) return state
      const deal = signOffer(state.labelOffer)
      // The advance lands now (§12) — real money against the rent — and signing
      // reads as selling in, so it costs a little standing (§4).
      return {
        ...state,
        label: deal,
        labelOffer: null,
        money: state.money + deal.advance,
        cred: clamp(state.cred - signCredCost(state.cred), 0, 1),
        labelNews: [
          ...state.labelNews,
          `You signed to ${deal.labelName}. £${deal.advance} in the bank, and a run of records to make.`,
        ],
      }
    }

    case 'declineLabel': {
      if (!state.labelOffer) return state
      return { ...state, labelOffer: null }
    }

    case 'leaveLabel': {
      // Walking away is only clean once you've delivered what you owed.
      if (!state.label || !isFulfilled(state.label)) return state
      return {
        ...state,
        label: null,
        labelNews: [
          ...state.labelNews,
          `You and ${state.label.labelName} are done. You're independent again.`,
        ],
      }
    }

    /* ---- §8 The Band ------------------------------------------------- */

    case 'foundBand': {
      if (state.phase !== 'planning' || state.band || !action.name.trim()) return state
      // §8: founding buys you pull, not the band. It can still be taken off you.
      return {
        ...state,
        band: {
          name: action.name.trim(),
          members: [],
          chemistry: {},
          standing: startingStanding(true),
          founded: true,
          weeksTogether: 0,
        },
      }
    }

    case 'joinBand': {
      if (state.phase !== 'planning' || state.band) return state
      const offer = state.bandOffers.find((o) => o.id === action.offerId)
      if (!offer) return state

      const chemistry: Record<number, Chemistry> = {}
      for (const m of offer.members) chemistry[m.id] = startingChemistry(false)

      return {
        ...state,
        band: {
          name: offer.name,
          members: [...offer.members],
          chemistry,
          // You're the new one. You have not proved anything yet (§8).
          standing: startingStanding(false),
          founded: false,
          weeksTogether: 0,
        },
        bandOffers: [],
        bandNews: [`You are in ${offer.name} now. Nobody in it owes you anything yet.`],
      }
    }

    case 'recruit': {
      if (state.phase !== 'planning' || !state.band) return state
      const mate = state.recruits.find((m) => m.id === action.mateId)
      if (!mate || state.band.members.length >= 4) return state
      return {
        ...state,
        band: {
          ...state.band,
          members: [...state.band.members, mate],
          chemistry: { ...state.band.chemistry, [mate.id]: startingChemistry(true) },
        },
        recruits: state.recruits.filter((m) => m.id !== mate.id),
      }
    }

    case 'leaveBand':
      if (state.phase !== 'planning' || !state.band) return state
      return {
        ...state,
        band: null,
        demand: null,
        bandNews: [`You are out of ${state.band.name}. Back to the bedroom.`],
      }

    case 'answerDemand': {
      const demand = state.demand
      if (!demand || !state.band) return state
      const band = action.accept
        ? // Giving them what they want costs you the room's sense that you drive
          // it — you did what you were told.
          nudgeOne(
            { ...state.band, standing: clamp(state.band.standing - 0.06, 0, 1) },
            demand.mateId,
            { friendship: 0.12, musicalRespect: 0.05, professionalTrust: 0.08 },
          )
        : // Refusing holds your pull and costs you the person.
          nudgeOne(
            { ...state.band, standing: clamp(state.band.standing + 0.05, 0, 1) },
            demand.mateId,
            { friendship: -0.16, professionalTrust: -0.06 },
          )
      return {
        ...state,
        band,
        demand: null,
        bandNews: [...state.bandNews, action.accept ? demand.acceptText : demand.refuseText],
      }
    }

    /* ---- §11 Items & possessions ------------------------------------- */

    case 'sellItem': {
      // Managed between weeks, alongside everything else you plan (§5).
      if (state.phase !== 'planning') return state
      const item = state.inventory.find((i) => i.id === action.itemId)
      if (!item) return state
      const done = sellItemOp(state.inventory, action.itemId)
      if (!done) return state

      // §11: selling a gift wounds whoever gave it, if they're still around.
      let band = state.band
      let bandNews = state.bandNews
      if (item.giftedBy !== null && band && band.members.some((m) => m.id === item.giftedBy)) {
        band = nudgeOne(band, item.giftedBy, { friendship: -0.22, professionalTrust: -0.08 })
        const giver = band.members.find((m) => m.id === item.giftedBy)
        if (giver) bandNews = [...bandNews, `${giver.name.split(' ')[0]} gave you that. They know you sold it.`]
      }

      return {
        ...state,
        inventory: done.inventory,
        formerItems: [...state.formerItems, done.sold],
        money: state.money + done.cash,
        // §3: attachment is the price you pay in yourself, not just cash.
        mood: clamp(state.mood - moodCostOfLosing(item), 0, 100),
        band,
        bandNews,
      }
    }

    case 'pawnItem': {
      if (state.phase !== 'planning') return state
      const done = pawnItemOp(state.inventory, action.itemId, state.week)
      if (!done) return state
      // Pawning is reversible, so it costs no morale — you haven't really let go.
      return { ...state, inventory: done.inventory, money: state.money + done.cash }
    }

    case 'reclaimItem': {
      if (state.phase !== 'planning') return state
      const item = state.inventory.find((i) => i.id === action.itemId)
      if (!item || item.status.kind !== 'pawned') return state
      if (state.money < item.status.pawnPrice) return state
      const done = reclaimItemOp(state.inventory, action.itemId)
      if (!done) return state
      return { ...state, inventory: done.inventory, money: state.money - done.cost }
    }

    case 'buyBackItem': {
      if (state.phase !== 'planning') return state
      const done = buyBackItem(state.formerItems, action.itemId)
      if (!done || state.money < done.cost) return state
      return {
        ...state,
        formerItems: done.former,
        inventory: [...state.inventory, done.item],
        money: state.money - done.cost,
      }
    }

    /* ---- §10 Gear ---------------------------------------------------- */

    case 'buyGear': {
      if (state.phase !== 'planning') return state
      const gear = gearById(action.catalogId)
      // Buy what you can afford. §12: no credit — the shop takes cash you have.
      if (!gear || state.money < gear.price) return state
      const item = buyGear(gear, state.nextItemId, state.week)
      return {
        ...state,
        inventory: [...state.inventory, item],
        nextItemId: state.nextItemId + 1,
        money: state.money - gear.price,
      }
    }

    /* ---- §16 Events -------------------------------------------------- */

    case 'chooseEvent': {
      const active = state.activeEvent
      if (!active) return state
      const outcome = resolveEvent(
        active.id,
        action.choiceId,
        {
          strain: state.strain,
          chain: state.chain,
          mood: state.mood,
          energy: state.energy,
          following: state.following,
          cred: state.cred,
          releasedSongs: released(state).length,
          ownedGear: state.inventory.filter((i) => i.status.kind === 'owned'),
          week: state.week,
        },
        active.targetItemId,
      )
      const fx = outcome.effects

      // §16: a scrapped piece of gear goes to the sold pile, like anything lost
      // (§10/§11) — buy-back at 3× if you ever want it again.
      let inventory = state.inventory
      let formerItems = state.formerItems
      if (fx.removeItemId !== undefined) {
        const lost = state.inventory.find((i) => i.id === fx.removeItemId)
        if (lost) {
          inventory = state.inventory.filter((i) => i.id !== fx.removeItemId)
          formerItems = [...state.formerItems, { ...lost, status: { kind: 'owned' } }]
        }
      }

      const chain: ChainState = {
        stage: fx.chainTo ?? state.chain.stage,
        // Entering recovery restarts its clock; the comeback resets it to 0 too.
        weeksRecovering: fx.chainTo === 'recovering' ? 0 : state.chain.weeksRecovering,
        recovered: fx.setRecovered ? true : state.chain.recovered,
      }

      return {
        ...state,
        activeEvent: null,
        eventLog: [...state.eventLog, outcome.text],
        inventory,
        formerItems,
        money: state.money + (fx.money ?? 0),
        mood: clamp(state.mood + (fx.moodDelta ?? 0), 0, 100),
        following: Math.max(0, state.following + (fx.followingDelta ?? 0)),
        cred: clamp(state.cred + (fx.credDelta ?? 0), 0, 1),
        strain: applyStrain(state.strain, fx.strainDelta ?? 0),
        chain,
      }
    }

    /* ---- §15 Awards -------------------------------------------------- */

    case 'campaignAwards': {
      if (state.phase !== 'awards' || !state.awards || state.awards.results) return state
      const campaign = campaignById(action.approach)
      if (state.money < campaign.cost) return state

      const cer = runCeremony(state.awards.nominations, campaign, state.rng)

      // §15: a win spikes Following AND Cred. An all-out push has already cost
      // you Cred for looking thirsty — that's baked into the campaign.
      let following = state.following
      let cred = state.cred - campaign.credCost
      let won = 0
      for (const res of cer.results) {
        if (res.won) {
          won += 1
          const pay = winPayoff(res.category, following)
          following += pay.followingDelta
          cred += pay.credDelta
        }
      }

      return {
        ...state,
        rng: cer.rng,
        money: state.money - campaign.cost,
        following: Math.max(0, following),
        cred: clamp(cred, 0, 1),
        awardsWon: state.awardsWon + won,
        awards: { ...state.awards, campaign: action.approach, results: cer.results },
      }
    }

    case 'closeAwards': {
      if (state.phase !== 'awards' || !state.awards || !state.awards.results) return state
      return { ...state, phase: 'planning', awards: null }
    }

    /* ---- §17 The macro ladder ---------------------------------------- */

    case 'rebrand': {
      if (state.phase !== 'planning' || !action.newName.trim()) return state
      // §17: the outward name, not the inner self. The cost is recognition
      // thrown away, and it scales with how well-known you'd become.
      return {
        ...state,
        stageName: action.newName.trim(),
        following: Math.max(0, state.following - rebrandCost(state.following)),
      }
    }

    case 'retire': {
      if (state.phase !== 'planning') return state
      // §17: you choose the door. The ending is the whole run said back to you.
      return { ...state, phase: 'ended', ending: endingFor(state, true) }
    }

    /* ---- §14 Superfans ----------------------------------------------- */

    case 'nurtureFan': {
      if (state.phase !== 'planning') return state
      // §14: attention is finite. Spend it and it's gone until next week.
      if (state.attentionUsed >= ATTENTION_PER_WEEK) return state
      const fan = state.superfans.find((f) => f.id === action.fanId)
      if (!fan || fan.tendedThisWeek) return state
      return {
        ...state,
        superfans: state.superfans.map((f) => (f.id === fan.id ? nurture(f) : f)),
        attentionUsed: state.attentionUsed + 1,
      }
    }

    /* ---- §13 Merch --------------------------------------------------- */

    case 'makeMerch': {
      if (state.phase !== 'planning') return state
      // §13: you release it against a record or a tour, never from nowhere.
      const canTie = released(state).length > 0 || state.booking !== null
      if (!canTie) return state
      const product = productById(action.productId)
      const quantity = Math.round(action.quantity)
      if (quantity < MIN_ORDER || quantity > maxOrder(action.scarcity)) return state
      const cost = orderCost(product, quantity)
      // §12/§13: you front the inventory money. No credit — cash you have.
      if (state.money < cost) return state

      const drop = newDrop(
        state.nextDropId,
        action.name,
        product,
        action.tiedTo,
        quantity,
        Math.max(1, Math.round(action.price)),
        action.scarcity,
        merchQuality(action.character),
      )
      return {
        ...state,
        merch: [...state.merch, drop],
        nextDropId: state.nextDropId + 1,
        money: state.money - cost,
      }
    }

    /* ---- §9 Live Gigs ------------------------------------------------ */

    case 'bookGig': {
      if (state.phase !== 'planning') return state
      const venue = VENUES.find((v) => v.id === action.venueId)
      if (!venue || !canPlay(venue, state.following, state.cred)) return state
      // §9/#5: you need enough to fill the room — at a cover room a single
      // original will do, anywhere else you need a song for every slot.
      if (!canFillSet(venue, playableSongs(state.songs).length)) return state
      return { ...state, booking: { venueId: venue.id, dayIndex: action.dayIndex } }
    }

    case 'cancelBooking':
      return state.phase === 'planning' ? { ...state, booking: null } : state

    case 'toggleSetlistSong': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist') return state
      const venue = venueById(gig.venueId)
      const on = gig.setlist.includes(action.songId)
      if (!on && gig.setlist.length >= venue.slots) return state
      return {
        ...state,
        gig: {
          ...gig,
          // Order is the decision (§9), so this appends rather than sorting —
          // the sequence you build is the sequence you play.
          setlist: on
            ? gig.setlist.filter((id) => id !== action.songId)
            : [...gig.setlist, action.songId],
        },
      }
    }

    case 'addCover': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist') return state
      const venue = venueById(gig.venueId)
      if (!allowsCovers(venue) || gig.setlist.length >= venue.slots) return state
      // Covers stack, so they can't be toggled by id — each is just another
      // COVER_ID slot, removed by position (see removeFromSet).
      return { ...state, gig: { ...gig, setlist: [...gig.setlist, COVER_ID] } }
    }

    case 'removeFromSet': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist') return state
      if (action.index < 0 || action.index >= gig.setlist.length) return state
      return {
        ...state,
        gig: { ...gig, setlist: gig.setlist.filter((_, i) => i !== action.index) },
      }
    }

    case 'startPerformance': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist') return state
      const venue = venueById(gig.venueId)
      // #5: no thin sets — every slot is filled, with your songs or with covers.
      if (gig.setlist.length < venue.slots) return state
      return { ...state, gig: { ...gig, stage: 'performing', awaitingSong: true } }
    }

    case 'playNextSong': {
      const gig = state.gig
      if (!gig || gig.stage !== 'performing' || !gig.awaitingSong) return state
      const songId = gig.setlist[gig.played]
      if (songId === undefined) return state
      // A cover is a sentinel, not a catalogue song — it plays its own way.
      const song = isCover(songId) ? null : songById(state, songId)
      // A real song id that resolves to nothing is a corrupt set — bail.
      if (song === undefined) return state

      const { outcome, rng } =
        song === null
          ? playCover(gig.crowd, gig.fatigue, action.character, state.energy, state.mood, state.rng)
          : playSong(
              song,
              gig.crowd,
              gig.fatigue,
              action.character,
              state.energy,
              state.mood,
              state.rng,
            )
      const played = gig.played + 1
      const curve = [...gig.curve, outcome.crowd]
      const beats: GigBeat[] = [
        ...gig.beats,
        { kind: 'song', text: outcome.text, crowdAfter: outcome.crowd },
      ]

      // Last song — the set is done.
      if (played >= gig.setlist.length) {
        return {
          ...state,
          rng,
          gig: {
            ...gig,
            played,
            crowd: outcome.crowd,
            fatigue: outcome.fatigue,
            curve,
            beats,
            stage: 'result',
            awaitingSong: false,
          },
        }
      }

      // Between songs: sometimes the night has other ideas (§9).
      const eventRoll = next(rng)
      const eventIds: GigEventId[] = ['heckler', 'amp', 'booker']
      const pick = nextRange(eventRoll.rng, 0, eventIds.length)
      const fires = eventRoll.value < 0.22

      return {
        ...state,
        rng: fires ? pick.rng : eventRoll.rng,
        gig: {
          ...gig,
          played,
          crowd: outcome.crowd,
          fatigue: outcome.fatigue,
          curve,
          beats,
          awaitingSong: false,
          event: fires ? (eventIds[Math.floor(pick.value)] ?? 'heckler') : null,
        },
      }
    }

    case 'gigChoose': {
      const gig = state.gig
      if (!gig || gig.stage !== 'performing' || gig.awaitingSong || gig.event) return state
      const venue = venueById(gig.venueId)
      const choice = choicesFor(venue).find((c) => c.id === action.choiceId)
      if (!choice) return state
      return applyBeat(state, gig, venue, choice.register, choice.label)
    }

    case 'gigHandle': {
      const gig = state.gig
      if (!gig || !gig.event) return state
      const venue = venueById(gig.venueId)
      const event = GIG_EVENTS[gig.event]
      const handling = event.handlings.find((h) => h.id === action.handlingId)
      if (!handling) return state
      const after = applyBeat(state, gig, venue, handling.register, handling.label, handling.cost)
      return {
        ...after,
        // §9: "a graceful recovery might gain fans but cost money."
        money: state.money - (handling.cost ?? 0),
        gig: after.gig ? { ...after.gig, event: null } : null,
      }
    }

    case 'finishGig': {
      const gig = state.gig
      if (!gig || gig.stage !== 'result') return state
      const venue = venueById(gig.venueId)
      // Covers hold a room but earn no standing — only your own songs count
      // toward the Cred a night is worth (see settleGig).
      const originals = gig.setlist.filter((id) => !isCover(id)).length
      const originalFraction = gig.setlist.length > 0 ? originals / gig.setlist.length : 1
      const settled = settleGig(venue, gig.curve, 0, state.rng, originalFraction)
      const rng = settled.rng
      // §6: the band splits the door.
      const result: GigResult = {
        ...settled.result,
        money: splitMoney(state, settled.result.money),
      }

      // The gig IS the day — it takes the energy any other day would.
      const energyAfter = clamp(state.energy - GIG_ENERGY + NIGHTLY_RECOVERY, 0, 100)

      const dayResult: DayResult = {
        dayIndex: gig.dayIndex,
        // Not a route — a gig is its own thing. The label is what the log shows.
        routeId: 'rest',
        routeLabel: 'Gig',
        quality: result.score,
        band: result.score >= 0.66 ? 'good' : result.score >= 0.36 ? 'ok' : 'bad',
        energyAfter,
        moodAfter: clamp(state.mood + result.moodDelta, 0, 100),
        moneyDelta: result.money,
        followingDelta: result.followingGain,
        credDelta: result.credGain,
        burntOut: false,
        report: `${venue.name}. ${result.read}`,
      }

      return {
        ...state,
        rng,
        phase: 'resolving',
        gig: { ...gig, result },
        booking: null,
        days: [...state.days, dayResult],
        energy: energyAfter,
        mood: dayResult.moodAfter,
        money: state.money + result.money,
        following: state.following + result.followingGain,
        cred: clamp(state.cred + result.credGain, 0, 1),
        lastGig: { venueName: venue.name, result },
        everPlayedGig: true,
      }
    }
  }
}

const BAND_NAMES = [
  'Weekend Vacancy', 'The Long Way Round', 'Sundials', 'Cheap Rent',
  'Motorlight', 'The Undersigned', 'Petrol Blue', 'Nine Tenths',
]

/**
 * What a day of answering ads turns up — §5's 'apply for bands' route paying out
 * into §8.
 *
 * Which way it goes depends on whether you have a room of your own: found a band
 * and people answer YOUR ad; otherwise you answer theirs. Reach helps either
 * way, because §6 is explicit that a following is leverage "for founding or
 * leading your OWN band".
 */
function rollBandContacts(
  state: LoopState,
  quality: number,
  rng: Rng,
  nextMateId: number,
): { offers: readonly BandOffer[]; recruits: readonly Bandmate[]; nextMateId: number; rng: Rng } {
  const reach = clamp(Math.log10(Math.max(1, state.following)) / 4, 0, 1)
  const roll = next(rng)
  const chance = 0.35 + quality * 0.3 + reach * 0.2

  if (roll.value > chance) {
    return { offers: state.bandOffers, recruits: state.recruits, nextMateId, rng: roll.rng }
  }

  // You have a band: someone wants in.
  if (state.band) {
    if (state.band.members.length >= 4) {
      return { offers: state.bandOffers, recruits: state.recruits, nextMateId, rng: roll.rng }
    }
    const made = makeBandmate(nextMateId, roll.rng)
    return {
      offers: state.bandOffers,
      recruits: [...state.recruits, made.mate],
      nextMateId: nextMateId + 1,
      rng: made.rng,
    }
  }

  // No band: an existing one would have you.
  const sizeRoll = nextRange(roll.rng, 2, 3.99)
  const made = makeBandmates(Math.floor(sizeRoll.value), nextMateId, sizeRoll.rng)
  const nameRoll = nextRange(made.rng, 0, BAND_NAMES.length)
  const name = BAND_NAMES[Math.floor(nameRoll.value)] ?? 'The Band'

  return {
    offers: [
      ...state.bandOffers,
      { id: nextMateId, name, members: made.mates },
    ],
    recruits: state.recruits,
    nextMateId: nextMateId + made.mates.length,
    rng: nameRoll.rng,
  }
}

/**
 * The weekly pass over the band — §8: "they can make demands, act on their own,
 * and quit."
 *
 * This is where they stop being a stat block. Chemistry drifts, someone walks,
 * you get pushed out, or someone asks for the thing their agenda has wanted all
 * along.
 */
function runBandWeek(state: LoopState, rng: Rng): { state: LoopState; rng: Rng } {
  let band = state.band
  if (!band) return { state, rng }

  const news: string[] = [...state.bandNews]
  let r = rng

  band = { ...band, weeksTogether: band.weeksTogether + 1 }

  // Standing follows chemistry: the room gives the say to whoever it rates. §8's
  // emergent leadership — you can join and rise, or found and lose it.
  //
  // Slow on purpose: taking over a band you joined should be a career-length arc,
  // not a month. At this rate a well-liked newcomer needs ~10-15 weeks to go from
  // "not driving it" to having a real say, and a founder has to be genuinely bad
  // for a long time to lose the room.
  const chem = bandChemistry(band)
  band = { ...band, standing: clamp(band.standing + (chem - 0.5) * 0.12, 0, 1) }

  // §8: pushed out on a relationship/reliability threshold.
  if (pushedOut(band)) {
    return {
      state: {
        ...state,
        band: null,
        demand: null,
        bandNews: [
          ...news,
          `${band.name} had a conversation without you in it. You are not in ${band.name} any more.`,
        ],
      },
      rng: r,
    }
  }

  // Somebody walks.
  const leaving = band.members.find((m) => willQuit(band!, m))
  if (leaving) {
    const rest = band.members.filter((m) => m.id !== leaving.id)
    news.push(`${leaving.name} has quit. Nothing was keeping them.`)
    band = { ...band, members: rest }
  }

  // Somebody wants something. One at a time — a queue of demands is a to-do
  // list, and these are meant to be people.
  let demand = state.demand
  if (!demand && band.members.length > 0) {
    const roll = next(r)
    r = roll.rng
    if (roll.value < 0.28) {
      const whoRoll = nextRange(r, 0, band.members.length)
      r = whoRoll.rng
      const who = band.members[Math.floor(whoRoll.value)]
      if (who) demand = demandFrom(who)
    }
  }

  return { state: { ...state, band, demand, bandNews: news }, rng: r }
}

/** A demand shaped by what this person actually wants. */
function demandFrom(mate: Bandmate): Demand {
  const them = mate.name.split(' ')[0]
  switch (mate.agenda) {
    case 'wants_to_play_out':
      return {
        mateId: mate.id,
        text: `${them} wants to know why you are not playing more. "We are a band. Bands play."`,
        acceptText: `You told ${them} you would get more gigs booked. Now you have to.`,
        refuseText: `${them} did not like the answer.`,
      }
    case 'wants_the_work':
      return {
        mateId: mate.id,
        text: `${them} thinks the set is sloppy and wants more rehearsal. They are not wrong.`,
        acceptText: `${them} is happier. The diary is fuller.`,
        refuseText: `${them} has stopped bothering to say it.`,
      }
    case 'wants_a_say':
      return {
        mateId: mate.id,
        text: `${them} has been writing, and wants their songs in the set. Properly, with credit.`,
        acceptText: `${them} is in the songs now. It is not only your band any more.`,
        refuseText: `${them} took that badly, and will remember it.`,
      }
    case 'wants_it_big':
      return {
        mateId: mate.id,
        text: `${them} wants to know what the plan is. Not the vibe — the plan.`,
        acceptText: `You gave ${them} a plan. They are holding you to it.`,
        refuseText: `${them} is starting to think this is a hobby.`,
      }
    case 'wants_the_hang':
      return {
        mateId: mate.id,
        text: `${them} says nobody is enjoying this any more, and wants a night that is not about the band.`,
        acceptText: `You went out. It was not about the band. It helped.`,
        refuseText: `${them} thinks you have forgotten why anyone started.`,
      }
  }
}

/**
 * A between-songs beat: the choice or the handling lands, the room reacts, and
 * your persona takes another sample.
 *
 * §9's persona rule is applied here: a move that goes against how you normally
 * play is an event in itself, and whether it's delightful or alienating is the
 * room's call, not yours.
 */
function applyBeat(
  state: LoopState,
  gig: GigState,
  venue: Venue,
  register: number,
  label: string,
  _cost?: number,
): LoopState {
  const fit = handlingFit(register, venue)
  const brk = personaBreak(register, state.persona, state.personaSamples, venue)

  // The room decides. A fit of 1 is exactly what this room wanted.
  let swing = (fit - 0.5) * 26
  if (brk === 'delighted') swing += 14
  if (brk === 'alienated') swing -= 18

  const crowd = clamp(gig.crowd + swing, 0, CROWD_MAX)

  const text =
    brk === 'delighted'
      ? `${label} Nobody has seen you do that before. They will talk about it.`
      : brk === 'alienated'
        ? `${label} That is not you, and the room can tell.`
        : swing > 6
          ? `${label} It lands.`
          : swing < -6
            ? `${label} It does not land.`
            : label

  const samples = state.personaSamples + 1
  return {
    ...state,
    // Running mean — your style is what you actually keep doing.
    persona: (state.persona * state.personaSamples + register) / samples,
    personaSamples: samples,
    gig: {
      ...gig,
      crowd,
      awaitingSong: true,
      beats: [
        ...gig.beats,
        { kind: gig.event ? 'event' : 'choice', text, crowdAfter: crowd, ...(brk ? { personaBreak: brk } : {}) },
      ],
    },
  }
}

/**
 * The ending this run has earned — §17. Reads the accumulated state and hands it
 * to the build-dependent evaluator. Retiring by choice and ageing out share the
 * same door; only the framing differs.
 */
export function endingFor(state: LoopState, retiredByChoice: boolean): Ending {
  return evaluateEnding({
    following: state.following,
    cred: state.cred,
    money: state.money,
    strain: state.strain,
    recovered: state.chain.recovered,
    moodLow: state.mood < 25,
    age: ageForWeek(state.week),
    retiredByChoice,
  })
}

/** Money earned across the week just played. */
export const weekEarnings = (state: LoopState): number =>
  state.days.reduce((sum, d) => sum + d.moneyDelta, 0)

/**
 * Money, for display. The sign goes before the currency, not after it — plain
 * interpolation gives "£-59", which reads as a typo rather than as debt.
 *
 * Money is the one number the game shows (§12 makes it the game-over factor, so
 * it has to be countable); everything else is felt.
 */
export const formatMoney = (amount: number): string =>
  `${amount < 0 ? '−' : ''}£${Math.abs(amount)}`
