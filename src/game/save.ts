/**
 * Saving & load — the persistence layer.
 *
 * Deferred until last, by decision (README "Known gaps"), and it paid off exactly
 * as intended: every value in src/game is a plain serializable object — no class
 * instances, no Date, no functions, ids from counters, the RNG a bare number —
 * so a save is a straight JSON.stringify of the character and the run state.
 * There is nothing bespoke to serialize. KEEP IT THAT WAY: the day something in
 * game state stops being plain data is the day this stops being three lines.
 *
 * DURABILITY (README "Known gaps"). On iOS, Safari can evict script-writable
 * storage (localStorage/IndexedDB) under pressure, so localStorage alone is a
 * convenience, not a guarantee. The honest mitigation is an export/import save
 * file the player owns — so this module provides both: an autosave to
 * localStorage for the common case, and a downloadable save the player can keep.
 *
 * ONE SLOT (README "Known gaps", question b). A run is a single autosave slot —
 * one career at a time, which fits a game about one life in music. A second slot
 * would be another key here and a picker in the UI; nothing structural stops it.
 *
 * The version tag is the seam for migrations. There are none yet — a version
 * mismatch simply discards the save rather than loading a shape the code no
 * longer understands. Bump SAVE_VERSION when the state shape changes, and add a
 * migration here if an old save is worth carrying forward.
 */

import type { Character } from './character.ts'
import type { LoopState } from './loop.ts'
import type { RouteId } from './routes.ts'
import type { Song } from './songs.ts'

const SAVE_KEY = 'ftbu:save'
export const SAVE_VERSION = 3

export interface SaveData {
  readonly version: number
  readonly character: Character
  readonly state: LoopState
}

/**
 * v1 → v2: the song "soul" levers (tempo/feel), the release channel and label
 * flag on songs, and the label subsystem on the run.
 */
function v1tov2(data: SaveData): SaveData {
  const s = data.state as LoopState & { songs?: readonly Partial<Song>[] }
  const songs = (s.songs ?? []).map((song) => ({
    ...(song as Song),
    tempo: song.tempo ?? 0.5,
    feel: song.feel ?? 0.5,
    channel: song.channel ?? ('streaming' as const),
    underLabel: song.underLabel ?? false,
  })) as readonly Song[]
  const upgraded: LoopState = {
    ...(data.state as LoopState),
    songs,
    label: (data.state as Partial<LoopState>).label ?? null,
    labelOffer: (data.state as Partial<LoopState>).labelOffer ?? null,
    labelNews: (data.state as Partial<LoopState>).labelNews ?? [],
  }
  return { version: 2, character: data.character, state: upgraded }
}

/**
 * v2 → v3: the two-slot day (a plan day is now a list of activities, not a
 * single route or null) and projects/EPs/albums. An old single-route day becomes
 * a one-activity day; a null day becomes an empty (rest) day. Every new run field
 * has a safe default, so nobody's playtest career dies to the feature update.
 */
function v2tov3(data: SaveData): SaveData {
  const old = data.state as unknown as { plan?: readonly (RouteId | null)[]; songs?: readonly Partial<Song>[] }
  const plan = (old.plan ?? []).map((r) => (r ? [r] : [])) as unknown as LoopState['plan']
  const songs = (old.songs ?? []).map((song) => ({
    ...(song as Song),
    projectId: (song as Partial<Song>).projectId ?? null,
  })) as readonly Song[]
  const upgraded: LoopState = {
    ...(data.state as LoopState),
    plan,
    songs,
    projects: (data.state as Partial<LoopState>).projects ?? [],
    nextProjectId: (data.state as Partial<LoopState>).nextProjectId ?? 1,
    lastProject: (data.state as Partial<LoopState>).lastProject ?? null,
  }
  return { version: 3, character: data.character, state: upgraded }
}

/**
 * Carry an older run forward one version at a time. Every migration backfills
 * safe defaults, so a save is upgraded rather than discarded — a playtest career
 * shouldn't die to a feature update. A shape older than we understand is still
 * discarded rather than force-fed.
 */
function migrate(data: SaveData): SaveData | null {
  let current = data
  if (current.version === 1) current = v1tov2(current)
  if (current.version === 2) current = v2tov3(current)
  return current.version === SAVE_VERSION ? current : null
}

/** The one thing that decides a save is done — you don't resume a finished run. */
export const isRunOver = (state: LoopState): boolean =>
  state.phase === 'gameover' || state.phase === 'ended'

/* -------------------------------------------------------------------------- */
/* localStorage — the autosave                                                 */
/* -------------------------------------------------------------------------- */

/** Write the run. Swallows storage errors (quota, private mode) — a failed
 *  autosave must never take down the game the player is in the middle of. */
export function saveRun(character: Character, state: LoopState): void {
  try {
    const data: SaveData = { version: SAVE_VERSION, character, state }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable or full. The player can still export a file.
  }
}

/** Read the run, or null if there's nothing valid to resume. */
export function loadRun(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SaveData
    if (!parsed.character || !parsed.state) return null
    // An older shape is carried forward where we can, discarded where we can't.
    const data = migrate(parsed)
    if (!data) return null
    if (isRunOver(data.state)) return null
    return data
  } catch {
    return null
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to do — a save we can't read we also can't clear, and that's fine.
  }
}

/** Is there a run worth offering to continue? Cheap enough to call on render. */
export const hasSave = (): boolean => loadRun() !== null

/* -------------------------------------------------------------------------- */
/* Export / import — the save the player owns                                  */
/* -------------------------------------------------------------------------- */

/** The save as a JSON string, for a file the player keeps. */
export function exportSave(character: Character, state: LoopState): string {
  const data: SaveData = { version: SAVE_VERSION, character, state }
  return JSON.stringify(data, null, 2)
}

/** Parse an imported file back into a save, or null if it isn't one we can use. */
export function importSave(text: string): SaveData | null {
  try {
    const parsed = JSON.parse(text) as SaveData
    if (!parsed.character || !parsed.state) return null
    return migrate(parsed)
  } catch {
    return null
  }
}
