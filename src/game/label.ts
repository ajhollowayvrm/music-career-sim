/**
 * Labels — BRIEF §4 (Following "unlocks ... label interest"), §6 (crossover),
 * §12 (the economy). Pure; no React.
 *
 * A label is the populist bargain made concrete. Reach buys you an offer; the
 * offer buys you a lump of money now and a machine that gets your records heard —
 * and the price is a cut of everything they earn, a run of records you now OWE,
 * and the advance hanging over you as a debt against your own royalties.
 *
 * THE RECOUPMENT TRAP is the heart of it. The advance is not a gift, it is a loan
 * against money you haven't made yet: your royalties pay it back before you see a
 * penny of them. So the classic story falls straight out of the numbers — you
 * took four grand, you're "successful", and you're still seeing £0 a week because
 * the four grand hasn't earned itself back. Meanwhile the label's cut is doing
 * fine. (See applyRoyalties.)
 *
 * NOT §17. This is the player SIGNING TO a label. Becoming your OWN label is the
 * Benefactor endgame (career.ts) and a different thing entirely — keep the two
 * apart in prose.
 */

import { next, nextRange, type Rng } from './rng.ts'
import { clamp } from './traits.ts'

/** Following at which labels start paying attention (§4). */
export const LABEL_INTEREST_THRESHOLD = 800

/** How much further a release under a label reaches — their promo machine (§4). */
export const LABEL_REACH_MULT = 2.2

/** Weeks a label will wait for your next record before it loses patience. */
export const LABEL_PATIENCE = 8

/** Cred lost when you sign — the scene reads it, scaled by what you had to trade. */
export const signCredCost = (cred: number): number => clamp(cred * 0.16, 0, 0.14)

const LABEL_NAMES: readonly string[] = [
  'Tin Roof Records',
  'Northern Line',
  'Cheap Gold',
  'Halflight',
  'Big Small Records',
  'Paper Aeroplane',
  'The Undertow',
  'Motor City Tapes',
]

/** A deal on the table — §4's "label interest", decidable. */
export interface LabelOffer {
  readonly labelName: string
  /** Paid to you the moment you sign — real money against the rent (§12). */
  readonly advance: number
  /** Your share of what your records earn, once the advance is recouped. 0..1. */
  readonly royaltyRate: number
  /** How many records they want out of you. */
  readonly songsOwed: number
}

/** A signed deal — the ongoing state §6 calls "label vs. independent". */
export interface LabelDeal {
  readonly labelName: string
  readonly advance: number
  readonly royaltyRate: number
  /** Records still owed before the deal is fulfilled. */
  readonly songsOwed: number
  /** Records put out under the deal so far. */
  readonly released: number
  /** Advance still to be earned back out of your royalties before you see any. */
  readonly recoupBalance: number
  /** Weeks left before the label loses patience waiting for the next record. */
  readonly patienceLeft: number
  /** Set the week a fulfilled deal is dropped or completed, for the UI. */
  readonly dropped: boolean
}

/** True once you've delivered everything you owed — free to leave or re-sign. */
export const isFulfilled = (deal: LabelDeal): boolean => deal.songsOwed <= 0

/** True while the advance still hangs over your royalties. */
export const isRecouping = (deal: LabelDeal): boolean => deal.recoupBalance > 0

/**
 * Generate an offer. Terms follow §4's two currencies: REACH buys the advance
 * and the size of the machine, so a big following gets a big cheque; STANDING is
 * leverage, so Cred buys you a better royalty. A viral nobody gets money and a
 * bad split; a respected act with modest reach gets a small advance and keeps
 * more of what it earns.
 */
export function makeLabelOffer(following: number, cred: number, rng: Rng): { offer: LabelOffer; rng: Rng } {
  const a = next(rng)
  const nameIdx = Math.floor(a.value * LABEL_NAMES.length) % LABEL_NAMES.length
  const b = nextRange(a.rng, 0.85, 1.15)
  const advance = Math.round((600 + following * 0.6) * b.value)
  const c = nextRange(b.rng, -0.02, 0.02)
  const royaltyRate = clamp(0.12 + cred * 0.16 + c.value, 0.1, 0.32)
  const d = next(c.rng)
  const songsOwed = 3 + Math.floor(d.value * 3) // 3..5

  return {
    offer: {
      labelName: LABEL_NAMES[nameIdx] ?? 'A label',
      advance,
      royaltyRate,
      songsOwed,
    },
    rng: d.rng,
  }
}

/** Sign an offer into an active deal. The advance becomes the recoup balance. */
export function signOffer(offer: LabelOffer): LabelDeal {
  return {
    labelName: offer.labelName,
    advance: offer.advance,
    royaltyRate: offer.royaltyRate,
    songsOwed: offer.songsOwed,
    released: 0,
    recoupBalance: offer.advance,
    patienceLeft: LABEL_PATIENCE,
    dropped: false,
  }
}

/** Book a record delivered under the deal — decrements what you owe, resets the clock. */
export function deliverUnderDeal(deal: LabelDeal): LabelDeal {
  return {
    ...deal,
    released: deal.released + 1,
    songsOwed: Math.max(0, deal.songsOwed - 1),
    patienceLeft: LABEL_PATIENCE,
  }
}

/**
 * Route one record's weekly gross through the deal. The label always keeps its
 * cut; your royalty is what's left of your share after the advance eats into it.
 * Until the advance is recouped you pocket nothing here — you already spent it.
 */
export function applyRoyalties(deal: LabelDeal, gross: number): { deal: LabelDeal; paidToArtist: number } {
  const artistRoyalty = gross * deal.royaltyRate
  if (deal.recoupBalance <= 0) {
    return { deal, paidToArtist: artistRoyalty }
  }
  const applied = Math.min(artistRoyalty, deal.recoupBalance)
  return {
    deal: { ...deal, recoupBalance: Math.max(0, deal.recoupBalance - applied) },
    paidToArtist: artistRoyalty - applied,
  }
}

/**
 * The weekly patience tick, run when no record went out under the deal this week.
 * A label that's still owed records and has run out of patience drops you — you
 * keep the advance (the recoup is forgiven), but it costs standing and stings.
 */
export function tickPatience(deal: LabelDeal): LabelDeal {
  if (isFulfilled(deal)) return deal
  return { ...deal, patienceLeft: Math.max(0, deal.patienceLeft - 1) }
}

export const wouldDrop = (deal: LabelDeal): boolean =>
  !isFulfilled(deal) && deal.patienceLeft <= 0

/* -------------------------------------------------------------------------- */
/* Saying it out loud — pillar 2: the advance is money (a shown number), the   */
/* rest is prose.                                                              */
/* -------------------------------------------------------------------------- */

/** The royalty split, in plain words rather than a percentage. */
export function describeRoyalty(rate: number): string {
  if (rate < 0.14) return 'You keep a small slice of what your records earn.'
  if (rate < 0.2) return 'You keep about a fifth of what your records earn.'
  if (rate < 0.27) return 'You keep about a quarter of what your records earn.'
  return 'You keep close to a third of what your records earn — a good split.'
}

/** What you still owe, in words. */
export function describeCommitment(deal: LabelDeal): string {
  if (isFulfilled(deal)) return 'You have delivered everything you owed them. The deal is done.'
  if (deal.songsOwed === 1) return 'They want one more record out of you.'
  return `They want ${deal.songsOwed} more records out of you.`
}

/** Where the advance stands, in words. */
export function describeRecoup(deal: LabelDeal): string {
  if (deal.recoupBalance <= 0) {
    return 'The advance is earned back. Your royalties are your own now.'
  }
  const paid = deal.advance - deal.recoupBalance
  const frac = deal.advance > 0 ? paid / deal.advance : 1
  if (frac < 0.15) return 'You are still working off the advance. None of it has earned back yet.'
  if (frac < 0.6) return 'You are chipping away at the advance, but it still hangs over your royalties.'
  return 'The advance is nearly earned back. Not long before the royalties start reaching you.'
}

/** The patience warning, when the label is getting restless. */
export function describePatience(deal: LabelDeal): string | null {
  if (isFulfilled(deal)) return null
  if (deal.patienceLeft <= 2) return 'The label is getting restless. They want the next record, soon.'
  if (deal.patienceLeft <= 4) return 'They are waiting on the next record.'
  return null
}
