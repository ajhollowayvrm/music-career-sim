/**
 * Items & possessions — BRIEF §11.
 *
 * "The inventory is the safety net you hollow out when the music isn't paying."
 * §12 built the cliff; this is the rope. Possessions can be SOLD to make rent,
 * and that's the buffer between a bad month and eviction.
 *
 * THE LIQUIDATION LADDER (§11). You sell painless luxuries first — the console,
 * the bike, the records — and only in real desperation do you reach the guitar.
 * The ladder isn't enforced; it's the shape of the choices. Every item carries
 * an `attachment` (how much it costs your morale to let go) and a `functional`
 * flag (whether losing it sets your earning power back), and those two are what
 * make the bottom of the ladder a genuinely different decision from the top.
 *
 * SELL vs PAWN, and buy-back (§11):
 *   - PAWN: a fraction of the value now, and you can reclaim it at that same
 *     price inside a window. Less cash, but reversible — the honest move when
 *     you're only a few weeks from a gig cheque.
 *   - SELL: the full value now, and it's gone. Buy it back later and you pay
 *     about 3×. More cash today, punishing to undo.
 * Let a pawn window lapse and the item is as good as sold: forfeit, and only
 * reclaimable at the 3× buy-back like anything else you sold.
 *
 * THE DEATH SPIRAL (§11): "selling functional gear to survive lowers next
 * month's earning power." §11 owns whether you still HAVE the thing; §10 owns
 * what having it is worth. So a functional item here carries a prose warning and
 * the irreversibility, and when §10 lands it attaches the numeric recording
 * effect that makes selling your rig literally lower the quality of what you cut
 * next. The hook is `functional`; §10 fills the number.
 *
 * GIFTS (§11): a gift from a bandmate or mentor remembers who gave it, and
 * selling it wounds them. The giving is §8's and §16's to trigger; the cost of
 * betraying it lives here.
 */

import type { OriginId } from './origins.ts'
import { originById } from './origins.ts'
import { makeRng, nextRange, type Rng } from './rng.ts'

/** A fraction of the value, paid now, reclaimable at the same price. */
export const PAWN_FRACTION = 0.4
/** What buying back a sold (or forfeited) item costs, against its value. */
export const BUYBACK_MULTIPLIER = 3
/** Weeks you have to reclaim a pawned item before it's forfeit. */
export const PAWN_WINDOW_WEEKS = 6

export type ItemCategory = 'instrument' | 'gear' | 'transport' | 'luxury' | 'keepsake'

/** Where an item is right now. Owned and pawned items both sit in the inventory. */
export type ItemStatus =
  | { readonly kind: 'owned' }
  | { readonly kind: 'pawned'; readonly pawnPrice: number; readonly reclaimByWeek: number }

export interface Item {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly category: ItemCategory
  /** A clean sale's worth. Pawn pays a fraction; buy-back costs a multiple. */
  readonly value: number
  /**
   * How much losing it hurts, 0..1. Orders the ladder and scales the mood hit.
   * Luxuries ~0; your instrument high; a keepsake near the top.
   */
  readonly attachment: number
  /**
   * Losing it sets your earning power back (§11's death spiral). Pure luxuries
   * are false — they're only cash. §10 makes this literal via recordingBonus.
   */
  readonly functional: boolean
  /**
   * §10: how much this piece raises the production ceiling (§7). Gear is the big
   * recording lever; instruments help a little; luxuries not at all (0). This is
   * what makes selling functional gear a real earning-power cut — the recordings
   * you cut without it are worse.
   */
  readonly recordingBonus: number
  /**
   * §10: the week it entered your hands. Signature gear emerges from long
   * ownership and use — this is how "over time" is measured.
   */
  readonly acquiredWeek: number
  /** §11: a gift. The bandmate's id, if this came from one of them. */
  readonly giftedBy: number | null
  readonly status: ItemStatus
}

export const pawnPriceOf = (item: Item): number => Math.round(item.value * PAWN_FRACTION)
export const buyBackPriceOf = (item: Item): number => Math.round(item.value * BUYBACK_MULTIPLIER)

export const isPawned = (item: Item): boolean => item.status.kind === 'pawned'
export const isOwned = (item: Item): boolean => item.status.kind === 'owned'

/**
 * The mood a sale costs, as points. Attachment is the whole story — selling the
 * console you never play is free; selling the guitar you learned on is not. §3
 * owns mood, so this returns a delta for the reducer to clamp in.
 */
export const moodCostOfLosing = (item: Item): number => Math.round(item.attachment * 22)

/* -------------------------------------------------------------------------- */
/* Starting inventory                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The keepsake as a possession — §2's promise made sellable. Three of the four
 * origins hand you your instrument; the choir kid's hymnal is the one keepsake
 * that isn't functional, only precious. Either way it sits near the bottom of
 * the ladder: high attachment, the last thing you'd let go.
 */
const KEEPSAKE_ITEM: Readonly<
  Record<
    OriginId,
    { category: ItemCategory; value: number; attachment: number; functional: boolean; recordingBonus: number }
  >
> = {
  // The hymnal is precious, not gear: no recording lever, only morale (§7/§3).
  choir_kid: { category: 'keepsake', value: 30, attachment: 0.95, functional: false, recordingBonus: 0 },
  // An instrument helps the recording a little; a rig helps it a lot.
  garage_self_taught: { category: 'instrument', value: 140, attachment: 0.8, functional: true, recordingBonus: 0.05 },
  bedroom_producer: { category: 'gear', value: 320, attachment: 0.82, functional: true, recordingBonus: 0.11 },
  open_mic_lifer: { category: 'instrument', value: 180, attachment: 0.85, functional: true, recordingBonus: 0.05 },
}

/**
 * The painless top of the ladder — believable clutter a broke musician owns and
 * can turn into rent. Deliberately generic and non-functional: selling any of
 * these costs you nothing but the thing itself, which is exactly why they go
 * first. Values total roughly two weeks of rent — a real but shallow buffer.
 */
const LUXURIES: ReadonlyArray<Omit<Item, 'id' | 'status' | 'acquiredWeek'>> = [
  {
    name: 'Games console',
    description: 'Barely touched since the writing took over. Someone would give you £120 for it tonight.',
    category: 'luxury',
    value: 120,
    attachment: 0.08,
    functional: false,
    recordingBonus: 0,
    giftedBy: null,
  },
  {
    name: 'A half-decent bike',
    description: "Gets you across town. You'd walk, if it came to it.",
    category: 'transport',
    value: 90,
    attachment: 0.2,
    functional: false,
    recordingBonus: 0,
    giftedBy: null,
  },
  {
    name: 'A box of records',
    description: 'The collection. A few of them are worth more than you paid, which is not the point of them.',
    category: 'luxury',
    value: 75,
    attachment: 0.35,
    functional: false,
    recordingBonus: 0,
    giftedBy: null,
  },
]

/**
 * The inventory a run starts with: the origin's keepsake (if the character is
 * known at init) plus the luxuries that make a ladder to climb down. Pure and
 * seeded — no Date, no Math.random — so a run stays reproducible and saveable.
 */
export function startingInventory(
  originId: OriginId | undefined,
  startId: number,
): { items: Item[]; nextItemId: number } {
  const items: Item[] = []
  let id = startId

  if (originId) {
    const spec = KEEPSAKE_ITEM[originId]
    const keepsake = originById(originId).keepsake
    items.push({
      id: id++,
      name: keepsake.name,
      description: keepsake.description,
      category: spec.category,
      value: spec.value,
      attachment: spec.attachment,
      functional: spec.functional,
      recordingBonus: spec.recordingBonus,
      acquiredWeek: 1,
      giftedBy: null,
      status: { kind: 'owned' },
    })
  }

  for (const lux of LUXURIES) {
    items.push({ ...lux, id: id++, acquiredWeek: 1, status: { kind: 'owned' } })
  }

  return { items, nextItemId: id }
}

/* -------------------------------------------------------------------------- */
/* The operations — pure, returning the next inventory and the cash moved      */
/* -------------------------------------------------------------------------- */

/** Pawn an owned item: cash now, a window to reclaim it at the same price. */
export function pawnItem(
  inventory: readonly Item[],
  itemId: number,
  currentWeek: number,
): { inventory: Item[]; cash: number } | null {
  const item = inventory.find((i) => i.id === itemId)
  if (!item || !isOwned(item)) return null
  const price = pawnPriceOf(item)
  return {
    cash: price,
    inventory: inventory.map((i) =>
      i.id === itemId
        ? { ...i, status: { kind: 'pawned', pawnPrice: price, reclaimByWeek: currentWeek + PAWN_WINDOW_WEEKS } }
        : i,
    ),
  }
}

/** Reclaim a pawned item within its window, paying the pawn price back. */
export function reclaimItem(
  inventory: readonly Item[],
  itemId: number,
): { inventory: Item[]; cost: number } | null {
  const item = inventory.find((i) => i.id === itemId)
  if (!item || item.status.kind !== 'pawned') return null
  return {
    cost: item.status.pawnPrice,
    inventory: inventory.map((i) => (i.id === itemId ? { ...i, status: { kind: 'owned' } } : i)),
  }
}

/**
 * Sell an owned item outright: full value now, and it leaves the inventory for
 * the "sold" pile, reclaimable only at the buy-back price.
 */
export function sellItem(
  inventory: readonly Item[],
  itemId: number,
): { inventory: Item[]; sold: Item; cash: number } | null {
  const item = inventory.find((i) => i.id === itemId)
  if (!item || !isOwned(item)) return null
  return {
    cash: item.value,
    sold: item,
    inventory: inventory.filter((i) => i.id !== itemId),
  }
}

/** Buy back something you sold (or let lapse at the pawnbroker), at 3×. */
export function buyBackItem(
  former: readonly Item[],
  itemId: number,
): { former: Item[]; item: Item; cost: number } | null {
  const item = former.find((i) => i.id === itemId)
  if (!item) return null
  return {
    cost: buyBackPriceOf(item),
    item: { ...item, status: { kind: 'owned' } },
    former: former.filter((i) => i.id !== itemId),
  }
}

/**
 * Move on any pawned items whose window has closed. Called at the week turn:
 * a lapsed pawn is forfeit — it leaves the inventory for the sold pile, where
 * getting it back costs the full 3×.
 */
export function expirePawns(
  inventory: readonly Item[],
  newWeek: number,
): { inventory: Item[]; forfeited: Item[] } {
  const forfeited: Item[] = []
  const kept: Item[] = []
  for (const item of inventory) {
    if (item.status.kind === 'pawned' && newWeek > item.status.reclaimByWeek) {
      forfeited.push({ ...item, status: { kind: 'owned' } })
    } else {
      kept.push(item)
    }
  }
  return { inventory: kept, forfeited }
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                          */
/* -------------------------------------------------------------------------- */

/** Weeks left to reclaim a pawned item, for the panel's countdown. */
export const weeksToReclaim = (item: Item, currentWeek: number): number =>
  item.status.kind === 'pawned' ? Math.max(0, item.status.reclaimByWeek - currentWeek) : 0

/**
 * The warning shown before you let something go — the part that makes the
 * bottom of the ladder feel different from the top. Null for painless luxuries,
 * where there's nothing to warn about.
 */
export function costOfLosing(item: Item): string | null {
  if (item.giftedBy !== null) {
    return "It was a gift. Selling it is the kind of thing that gets remembered."
  }
  if (item.functional && item.attachment >= 0.6) {
    return "This is how you make the music. Sell it and you're setting yourself back to claw the money back."
  }
  if (item.functional) {
    return "You use this. Losing it makes the next stretch harder, not easier."
  }
  if (item.attachment >= 0.5) {
    return "You'd feel this one."
  }
  return null
}

// Kept for parity with the other modules' RNG-seeded helpers, and so a future
// event (§16) can spawn a found/gifted item without reaching for Math.random.
export const itemRng = (seed: number): Rng => makeRng(seed)
export const jitter = (rng: Rng, lo: number, hi: number): { value: number; rng: Rng } =>
  nextRange(rng, lo, hi)
