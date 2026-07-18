/**
 * Gear — BRIEF §10, a sub-economy on top of §11's items.
 *
 * "Gear is its own economy of instruments, rigs, recording chains, content gear,
 * and transport — each both a performance factor and a cash sink." §11 built the
 * ownership; this builds the shop and, more importantly, what owning the stuff is
 * WORTH.
 *
 * GEAR MATTERS MOST FOR RECORDING (§10). "For live shows it's the player, not
 * the gear." So there is deliberately NO live effect here — gigs (§9) stay
 * skill-only, and "you graduate off your own gear" is already true for free,
 * because at every venue you play the room's rig and your own never enters the
 * calculation. The whole lever is on the studio side: each piece raises the
 * production ceiling (§7), which is exactly the hook §7 and §11 left open.
 *
 * THE DEATH SPIRAL, MADE LITERAL (§11). Because recording quality reads the gear
 * you own, selling your rig to make rent doesn't just cost you the cash value —
 * the next thing you cut is measurably worse, so you earn less, so you're closer
 * to selling the next thing. §11 warned about it in prose; §10 puts the number
 * behind the warning.
 *
 * NO BUILT-IN CRED (§10). "Gear has no built-in Cred rating." Buying the
 * expensive thing doesn't buy you standing. What it can buy, slowly, is a
 * SIGNATURE: a piece you've kept and recorded through for long enough becomes
 * part of your sound — association, not a purchase (see isSignature).
 *
 * RARE, DRAMATIC FAILURES are §16's, not a maintenance tax here. §10 is explicit
 * that gear failure is an EVENT — the amp dies right before the big gig — not a
 * constant upkeep cost, so this module never degrades or charges upkeep.
 */

import { clamp } from './traits.ts'
import type { Item, ItemCategory } from './items.ts'

/** Owned recording gear can't lift the ceiling past this on its own. */
export const MAX_GEAR_BONUS = 0.4

/** Weeks of ownership before a piece can become part of your sound. */
export const SIGNATURE_WEEKS = 24

/** A thing you can buy. It becomes a plain §11 Item the moment you own it. */
export interface GearForSale {
  readonly catalogId: string
  readonly name: string
  readonly description: string
  readonly category: ItemCategory
  /** Price to buy, and (per §11) the value a later sale is worth. */
  readonly price: number
  /** How much it raises the production ceiling (§7). The reason to buy it. */
  readonly recordingBonus: number
  /** How much it'd cost your morale to sell later (§11). */
  readonly attachment: number
}

/**
 * The shop. A ladder of recording spend from a first real mic to an outboard
 * preamp — every price a genuine dent against £200/wk rent and songs that barely
 * pay (§7, §12), so kitting out a studio is an investment you commit to, not
 * loose change. The bonuses stack toward MAX_GEAR_BONUS, so the early pieces
 * move the needle most and a full rig hits diminishing returns.
 */
export const GEAR_CATALOG: readonly GearForSale[] = [
  // The starter tier (§10, #2). Cheap enough to kit out a first bedroom rig from
  // the £400 you begin with — and the whole point of it: until you own SOMETHING
  // here, recording is a laptop-lid demo (see NO_GEAR_PENALTY in songs.ts). The
  // first mic is the one that lifts the penalty; the rest is the climb.
  {
    catalogId: 'usb_mic',
    name: 'A USB mic',
    description: 'Not a good mic. But a mic — the end of singing into the laptop and hoping.',
    category: 'gear',
    price: 45,
    recordingBonus: 0.04,
    attachment: 0.25,
  },
  {
    catalogId: 'pop_filter',
    name: 'A pop filter',
    description: 'A little mesh hoop that stops every "p" and "b" from thumping the mic. Cheap, and you hear it.',
    category: 'gear',
    price: 15,
    recordingBonus: 0.02,
    attachment: 0.1,
  },
  {
    catalogId: 'audio_interface',
    name: 'An audio interface',
    description: 'A proper box between you and the laptop. Cleaner in, lower latency, room to grow.',
    category: 'gear',
    price: 70,
    recordingBonus: 0.05,
    attachment: 0.3,
  },
  {
    catalogId: 'interface_mic',
    name: 'A real condenser mic',
    description: 'The end of recording into a laptop lid. Suddenly your voice sounds like your voice.',
    category: 'gear',
    price: 180,
    recordingBonus: 0.08,
    attachment: 0.4,
  },
  {
    catalogId: 'treatment',
    name: 'Acoustic panels for the room',
    description: 'Foam and rockwool on the worst reflections. Nobody sees it; everybody hears it.',
    category: 'gear',
    price: 140,
    recordingBonus: 0.06,
    attachment: 0.3,
  },
  {
    catalogId: 'monitors',
    name: 'A pair of studio monitors',
    description: "Now you hear what's actually there, not what the headphones flattered you into thinking.",
    category: 'gear',
    price: 260,
    recordingBonus: 0.1,
    attachment: 0.45,
  },
  {
    catalogId: 'better_guitar',
    name: 'A guitar that stays in tune',
    description: 'It holds the tuning through a whole take and the intonation is honest up the neck.',
    category: 'instrument',
    price: 420,
    recordingBonus: 0.07,
    attachment: 0.55,
  },
  {
    catalogId: 'preamp',
    name: 'An outboard preamp',
    description: 'The expensive box that the records you love all went through, or ones like it.',
    category: 'gear',
    price: 480,
    recordingBonus: 0.14,
    attachment: 0.5,
  },
]

export const gearById = (catalogId: string): GearForSale | undefined =>
  GEAR_CATALOG.find((g) => g.catalogId === catalogId)

/**
 * Buy a piece: it becomes an owned, functional §11 Item. Pure — the id and the
 * acquisition week are passed in, so the run stays serializable and reproducible.
 */
export function buyGear(gear: GearForSale, itemId: number, currentWeek: number): Item {
  return {
    id: itemId,
    name: gear.name,
    description: gear.description,
    category: gear.category,
    value: gear.price,
    attachment: gear.attachment,
    functional: true,
    recordingBonus: gear.recordingBonus,
    acquiredWeek: currentWeek,
    giftedBy: null,
    status: { kind: 'owned' },
  }
}

/**
 * The total recording lift from everything you currently own — the number
 * productionCeiling (§7) adds on top of talent. Pawned and sold gear doesn't
 * count: you can't record through a mic that's at the pawnbroker, which is the
 * death spiral's teeth.
 */
export function gearRecordingBonus(inventory: readonly Item[]): number {
  const sum = inventory
    .filter((i) => i.status.kind === 'owned')
    .reduce((total, i) => total + i.recordingBonus, 0)
  return clamp(sum, 0, MAX_GEAR_BONUS)
}

/**
 * Whether you own ANY recording gear at all — the switch on §10's soft gate.
 * Own nothing that helps a recording and you're cutting laptop-lid demos
 * (NO_GEAR_PENALTY in songs.ts); own even the cheapest mic and the penalty lifts.
 * Pawned/sold gear doesn't count — a mic at the pawnbroker records nothing.
 */
export const ownsRecordingGear = (inventory: readonly Item[]): boolean =>
  inventory.some((i) => i.status.kind === 'owned' && i.recordingBonus > 0)

/**
 * Whether a piece has become part of your sound — §10's signature. Not bought:
 * earned by keeping and using it. Kept long enough, and with a catalogue behind
 * you that it helped make, a piece stops being equipment and starts being yours.
 */
export function isSignature(item: Item, currentWeek: number, releasedSongs: number): boolean {
  if (!item.functional || item.status.kind !== 'owned') return false
  return currentWeek - item.acquiredWeek >= SIGNATURE_WEEKS && releasedSongs >= 3
}

/** The signature, said out loud — flavour only, per §10's "no built-in Cred". */
export function describeSignature(item: Item): string {
  return `${item.name} has been on everything you've made for long enough that people hear it as part of you now.`
}
