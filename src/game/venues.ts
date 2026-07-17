/**
 * Venues — BRIEF §9, gated by §4.
 *
 * §4 says Following "unlocks auditions, bookings, and label interest". This is
 * where that promise gets paid: the rooms open up as your reach grows, and Cred
 * opens the ones that reach alone can't buy. A viral nobody can get into a lot
 * of rooms; the DIY basement is not one of them.
 *
 * Each room has a SCENE — where it sits on §2's raw↔polished axis. That's what
 * makes §9's disaster clause work: "some scenes and genres expect a chaotic,
 * poor reaction (à la Nirvana), so reacting 'badly' can be authentic and
 * crowd-pleasing in the right room". Losing your temper in a basement is the
 * gig; losing it on a support slot is the end of the tour.
 */

export interface Venue {
  readonly id: string
  readonly name: string
  readonly blurb: string
  /** §4 gates the door. */
  readonly minFollowing: number
  readonly minCred: number
  readonly capacity: number
  /** Flat fee. A good night adds a little on top (see gig.ts). */
  readonly pay: number
  /** Cred a blinding night here is worth. §4: this is the main source. */
  readonly credWeight: number
  /**
   * What the room expects, on raw↔polished. -1 = they want it to fall apart,
   * +1 = they want it tight. Decides whether chaos reads as authentic or as a
   * disaster.
   */
  readonly sceneRaw: number
  /** How many songs the slot is. */
  readonly slots: number
}

export const VENUES: readonly Venue[] = [
  {
    id: 'open_mic',
    name: 'The open mic',
    blurb: 'Tuesday. Three songs. Eleven people and a bartender who is not listening.',
    minFollowing: 0,
    minCred: 0,
    capacity: 14,
    pay: 0,
    credWeight: 0.012,
    sceneRaw: -0.2,
    slots: 3,
  },
  {
    id: 'pub_back',
    name: 'The back room',
    blurb: 'Behind a pub, low ceiling, PA held together with tape. Everyone here chose to be here.',
    minFollowing: 40,
    minCred: 0.04,
    capacity: 45,
    pay: 40,
    credWeight: 0.022,
    sceneRaw: -0.7,
    slots: 4,
  },
  {
    id: 'small_venue',
    name: 'A proper small venue',
    blurb: 'A real stage, a real engineer, and a room that has seen better bands than you.',
    minFollowing: 250,
    minCred: 0.18,
    capacity: 150,
    pay: 120,
    credWeight: 0.032,
    sceneRaw: -0.2,
    slots: 5,
  },
  {
    id: 'support',
    name: 'A support slot',
    blurb: 'Thirty minutes in front of somebody else’s crowd. They did not come for you.',
    minFollowing: 1000,
    minCred: 0.28,
    capacity: 500,
    pay: 250,
    credWeight: 0.042,
    sceneRaw: 0.3,
    slots: 5,
  },
  {
    id: 'headline',
    name: 'Your own headline show',
    blurb: 'Your name on the poster, your name on the tickets. Every one of them came for you.',
    minFollowing: 3500,
    minCred: 0.42,
    capacity: 900,
    pay: 700,
    credWeight: 0.055,
    sceneRaw: 0.5,
    slots: 6,
  },
]

export const venueById = (id: string): Venue => {
  const found = VENUES.find((v) => v.id === id)
  if (!found) throw new Error(`Unknown venue: ${id}`)
  return found
}

export const canPlay = (venue: Venue, following: number, cred: number): boolean =>
  following >= venue.minFollowing && cred >= venue.minCred

/** Why a door is shut, in the game's voice — never "requirement not met". */
export function whyLocked(venue: Venue, following: number, cred: number): string | null {
  const needReach = following < venue.minFollowing
  const needCred = cred < venue.minCred
  if (!needReach && !needCred) return null
  if (needReach && needCred) return 'Nobody here has heard of you, and nobody here vouches for you.'
  if (needReach) return 'Not enough people know your name to fill this.'
  return 'They will not book someone the scene has not vouched for.'
}
