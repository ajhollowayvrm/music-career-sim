/**
 * Merch — BRIEF §13.
 *
 * "Merch is three tensions at once," and all three have to be live at the point
 * of the decision or it's just a vending machine:
 *
 *  1. A CASH-FLOW GAMBLE. You front the inventory money and eat whatever doesn't
 *     sell — dead stock is a real loss — while ordering too little leaves money
 *     on the table. The order size IS the gamble, and §12's economy is what
 *     gives it teeth: fronting a big run when rent is due is a genuine risk.
 *  2. A CRED-vs-CASH PRICING CALL. Price it high and each sale earns more but
 *     fewer people buy and the scene notices the gouge (a Cred cost). Price it
 *     fair and it moves, cheaply, and nobody holds it against you.
 *  3. BRAND IDENTITY. It ties to your brand and your Creativity — a strong
 *     Creativity makes better merch that sells through, so the auteur build pays
 *     off here too. You release it against a record or a tour, never from
 *     nowhere.
 *
 * WHERE IT SELLS, AND SCARCITY (§13). Online it trickles against your reach; a
 * gig is where it really moves, because that's a room full of people who came
 * for you. A LIMITED drop leans into scarcity — it sells hotter and the price
 * doesn't read as greed, because fans value the scarce thing — but you can only
 * order so many, so you cap your own upside. The collectors who clear a limited
 * drop are §14's to name.
 *
 * Pure and serializable, like the rest of src/game. loop.ts fronts the cash,
 * runs the weekly sell, and books the takings.
 */

import { clamp } from './traits.ts'
import type { Character } from './character.ts'
import { MAX_TALENT_AT_CREATION } from './talents.ts'

/** How many weeks a drop actively sells before it's run its course. */
export const MERCH_RUN_WEEKS = 8

export type Scarcity = 'open' | 'limited'

/** A product you can make. The unit cost is what you front per item. */
export interface MerchProduct {
  readonly id: string
  readonly label: string
  readonly blurb: string
  readonly unitCost: number
  /** The fair asking price — pricing above this is the gouge, below is a gift. */
  readonly fairPrice: number
  /** How much a room wants one, before your reach and pricing. */
  readonly baseAppeal: number
}

export const MERCH_PRODUCTS: readonly MerchProduct[] = [
  {
    id: 'poster',
    label: 'A screen-printed poster',
    blurb: 'Cheap to make, cheap to buy, and it ends up on a wall where other people see it.',
    unitCost: 2,
    fairPrice: 8,
    baseAppeal: 1.1,
  },
  {
    id: 'shirt',
    label: 'A t-shirt',
    blurb: 'The workhorse. A good one is a walking advert; a bad one is dead stock in a box.',
    unitCost: 7,
    fairPrice: 20,
    baseAppeal: 1,
  },
  {
    id: 'tote',
    label: 'A tote bag',
    blurb: 'Low cost, steady seller, and it turns your name into something people carry around.',
    unitCost: 4,
    fairPrice: 12,
    baseAppeal: 0.8,
  },
  {
    id: 'vinyl',
    label: 'A vinyl pressing',
    blurb: 'The object fans actually treasure — expensive to press, and worth the most when it runs out.',
    unitCost: 11,
    fairPrice: 28,
    baseAppeal: 0.7,
  },
]

export const productById = (id: string): MerchProduct =>
  MERCH_PRODUCTS.find((p) => p.id === id) ?? MERCH_PRODUCTS[0]!

/** A run of merch you've put out into the world. */
export interface MerchDrop {
  readonly id: number
  /** Authored — the brand is the player's (§13). */
  readonly name: string
  readonly productId: string
  /** What it hangs off: a song title, or "the tour". */
  readonly tiedTo: string
  readonly quantity: number
  readonly price: number
  readonly scarcity: Scarcity
  readonly unitCost: number
  /** Hidden — from Creativity at design time. Better merch sells through. */
  readonly quality: number
  readonly sold: number
  readonly weeksOut: number
  readonly closed: boolean
}

/** Order caps: a limited drop is deliberately scarce, an open one isn't. */
export const maxOrder = (scarcity: Scarcity): number => (scarcity === 'limited' ? 150 : 1000)
export const MIN_ORDER = 20

/** What making one of these will cost you up front — the money you're risking. */
export const orderCost = (product: MerchProduct, quantity: number): number =>
  Math.round(product.unitCost * quantity)

/** Merch quality from Creativity — the brand made mechanical (§13). */
export function merchQuality(character: Character): number {
  const c = character.talents.creativity / MAX_TALENT_AT_CREATION
  return clamp(0.35 + c * 0.55, 0.35, 0.9)
}

export function newDrop(
  id: number,
  name: string,
  product: MerchProduct,
  tiedTo: string,
  quantity: number,
  price: number,
  scarcity: Scarcity,
  quality: number,
): MerchDrop {
  return {
    id,
    name: name.trim() || product.label,
    productId: product.id,
    tiedTo,
    quantity,
    price,
    scarcity,
    unitCost: product.unitCost,
    quality,
    sold: 0,
    weeksOut: 0,
    closed: false,
  }
}

/* -------------------------------------------------------------------------- */
/* The weekly sell                                                            */
/* -------------------------------------------------------------------------- */

export interface MerchWeekContext {
  readonly following: number
  /** A gig this week is a room full of buyers — the big multiplier (§13). */
  readonly gigScore: number | null
}

/**
 * Units a drop moves in a week, and what that pays. The three tensions all live
 * in this one function: reach and a gig set the potential, price throttles the
 * conversion (and the gouge), Creativity and scarcity lift it, and it fades over
 * the run so a drop left open forever doesn't sell forever.
 */
export function weeklyMerchSales(
  drop: MerchDrop,
  ctx: MerchWeekContext,
): { units: number; revenue: number } {
  const remaining = drop.quantity - drop.sold
  if (drop.closed || remaining <= 0) return { units: 0, revenue: 0 }

  const product = productById(drop.productId)

  // Online trickle: a small slice of your reach buys, per week.
  let demand = ctx.following * 0.005 * product.baseAppeal

  // A gig is where it really moves — a captive room that came for you, and a
  // bigger act draws a bigger room (following gates venue size, so it stands in
  // for capacity). This is the multiplier §13 promises.
  if (ctx.gigScore !== null) {
    demand += (25 + ctx.following * 0.03) * product.baseAppeal * (0.4 + ctx.gigScore)
  }

  // Better merch (Creativity) sells through.
  demand *= 0.6 + drop.quality * 0.8

  // Price throttles conversion: fair sells at full rate, a gouge halves it, a
  // gift lifts it. A limited run is largely exempt — fans expect it to cost.
  const priceRatio = drop.price / product.fairPrice
  const priceFactor = clamp(2 - priceRatio, 0.25, 1.25)
  demand *= drop.scarcity === 'limited' ? Math.max(priceFactor, 0.9) : priceFactor

  // Scarcity sells hot: urgency now.
  if (drop.scarcity === 'limited') demand *= 1.35

  // Fades over the run.
  demand *= 1 / (1 + drop.weeksOut * 0.28)

  const units = Math.max(0, Math.min(remaining, Math.round(demand)))
  return { units, revenue: units * drop.price }
}

/**
 * The Cred cost of how you priced it, per week it's selling. Gouging (well over
 * fair, on an open run) nicks your standing; scarcity is exempt, because fans
 * expect the limited thing to cost. Fair or generous pricing costs nothing.
 */
export function merchCredDelta(drop: MerchDrop): number {
  if (drop.scarcity === 'limited') return 0
  const product = productById(drop.productId)
  const over = drop.price / product.fairPrice
  return over > 1.4 ? -0.004 * (over - 1.4) * 10 : 0
}

/** Advance a drop by a week's sales; close it when it's spent or run its course. */
export function ageDrop(drop: MerchDrop, unitsSold: number): MerchDrop {
  const sold = drop.sold + unitsSold
  const weeksOut = drop.weeksOut + 1
  const closed = sold >= drop.quantity || weeksOut >= MERCH_RUN_WEEKS
  return { ...drop, sold, weeksOut, closed }
}

/** Dead stock left on a closed run — money you fronted and never got back (§13). */
export const deadStockLoss = (drop: MerchDrop): number =>
  drop.closed ? (drop.quantity - drop.sold) * drop.unitCost : 0

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                         */
/* -------------------------------------------------------------------------- */

/** How a live drop is doing, in words — never the hidden quality. */
export function describeDrop(drop: MerchDrop): string {
  const remaining = drop.quantity - drop.sold
  if (drop.closed) {
    if (remaining <= 0) return 'Sold out. You could have made more.'
    return `Run over. ${remaining} left in the box — that's money you won't get back.`
  }
  const through = drop.sold / drop.quantity
  if (through >= 0.8) return 'Nearly gone. It caught.'
  if (through >= 0.4) return 'Moving steadily.'
  if (through >= 0.1) return 'Trickling out.'
  return 'Barely moved yet. It needs a gig in front of it.'
}
