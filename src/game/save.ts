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

const SAVE_KEY = 'ftbu:save'
export const SAVE_VERSION = 1

export interface SaveData {
  readonly version: number
  readonly character: Character
  readonly state: LoopState
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
    const data = JSON.parse(raw) as SaveData
    // A save from an older shape is discarded, not force-fed to newer code.
    if (data.version !== SAVE_VERSION || !data.character || !data.state) return null
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
    const data = JSON.parse(text) as SaveData
    if (data.version !== SAVE_VERSION || !data.character || !data.state) return null
    return data
  } catch {
    return null
  }
}
