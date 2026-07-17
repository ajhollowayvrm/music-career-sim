/**
 * Cloud save — mirror the local run to DynamoDB (via the Lambda Function URL in
 * syncConfig) so a career survives a browser wiping its storage and follows you
 * to another device. Additive over save.ts: localStorage is still the instant,
 * offline-first layer; the cloud is a copy kept in step with a debounced push.
 *
 * IDENTITY IS A RECOVERY CODE, not an account (see aws/README.md). A high-entropy
 * code is generated once, kept in localStorage, and shown to the player to back
 * up. It's sent as a bearer token; the backend keys the save by sha256(code). One
 * code = one save slot, so a new career overwrites the same slot exactly as the
 * local single-slot model does — the player backs the code up once and it always
 * points at their current run. Enter the code on another device to pull the slot.
 *
 * CONFLICTS. Each local change stamps a logical `savedAt` (a wall-clock ms, kept
 * in localStorage as sync metadata — NOT in game state, so the reducer stays
 * pure). A push carries the `savedAt` it last synced against as `baseSavedAt`;
 * the backend compare-and-swaps on it, so if a second device moved the cloud on,
 * the push forks to an honest 409 instead of silently eating a session. On a 409
 * we stop auto-pushing and let the player pick a side.
 *
 * Saves gzip ~5-10× smaller via CompressionStream (everywhere the game runs:
 * iOS 16.4+, Chrome 80+); without it we upload raw JSON. The backend stores the
 * bytes opaquely (enc:'gz').
 */

import type { Character } from './character.ts'
import type { LoopState } from './loop.ts'
import { SAVE_VERSION, isRunOver, type SaveData } from './save.ts'
import { SYNC_URL } from './syncConfig.ts'

const CODE_KEY = 'ftbu:code' // the recovery code (the credential)
const SAVEDAT_KEY = 'ftbu:cloud-savedAt' // logical save time of the local data
const BASE_KEY = 'ftbu:cloud-base' // cloud savedAt this device last synced against (CAS token)
const AUTO_KEY = 'ftbu:cloud-auto' // '0' | '1' auto-sync toggle (default on)

export const cloudConfigured = (): boolean => !!SYNC_URL

/* -------------------------------------------------------------------------- */
/* The recovery code                                                           */
/* -------------------------------------------------------------------------- */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789' // no I/L/O/U — unambiguous
const CODE_LEN = 26

/** A fresh high-entropy code from the platform CSPRNG. */
function generateCode(): string {
  const bytes = new Uint8Array(CODE_LEN)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

export const getCode = (): string | null => localStorage.getItem(CODE_KEY)
export const hasCode = (): boolean => !!getCode()

/** The code for this install, generating and storing one the first time. */
export function ensureCode(): string {
  let code = getCode()
  if (!code) {
    code = generateCode()
    try {
      localStorage.setItem(CODE_KEY, code)
    } catch {
      // Storage unavailable — cloud sync just won't run; local play is fine.
    }
  }
  return code
}

/** Adopt a code entered on another device, and reset the sync bookkeeping. */
export function setCode(code: string): void {
  localStorage.setItem(CODE_KEY, normalizeCode(code))
  localStorage.removeItem(BASE_KEY)
  localStorage.removeItem(SAVEDAT_KEY)
}

/** Strip spacing/case a player might paste, back to the canonical code. */
export const normalizeCode = (code: string): string =>
  code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

export const codeLooksValid = (code: string): boolean => normalizeCode(code).length >= 16

/** Grouped for reading aloud / copying, e.g. ABCD-EFGH-JKMN-… */
export const formatCode = (code: string): string =>
  (normalizeCode(code).match(/.{1,4}/g) ?? []).join('-')

/* -------------------------------------------------------------------------- */
/* Sync status — one tiny observable so the UI isn't guessing                  */
/* -------------------------------------------------------------------------- */

export type SyncState = 'idle' | 'syncing' | 'ok' | 'offline' | 'error' | 'conflict'
export interface SyncStatus {
  readonly state: SyncState
  readonly message: string | null
}

let status: SyncStatus = { state: 'idle', message: null }
export const getSyncStatus = (): SyncStatus => status
export const SYNC_EVENT = 'ftbu-sync'

function setStatus(state: SyncState, message: string | null = null) {
  status = { state, message }
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: status }))
  } catch {
    // Non-browser context (tests) — nothing to notify.
  }
}

export const autoSyncOn = (): boolean => localStorage.getItem(AUTO_KEY) !== '0'
export const setAutoSync = (on: boolean): void => localStorage.setItem(AUTO_KEY, on ? '1' : '0')

/* -------------------------------------------------------------------------- */
/* Sync bookkeeping                                                            */
/* -------------------------------------------------------------------------- */

const localSavedAt = (): number => Number(localStorage.getItem(SAVEDAT_KEY)) || 0
const setLocalSavedAt = (ts: number): void => localStorage.setItem(SAVEDAT_KEY, String(ts))
const getBase = (): number | null => {
  const n = Number(localStorage.getItem(BASE_KEY))
  return n > 0 ? n : null
}
const setBase = (ts: number): void => localStorage.setItem(BASE_KEY, String(ts))

/** Called by the local autosave: stamp the change so the cloud can be compared. */
export function markLocalChange(): number {
  const ts = Date.now()
  setLocalSavedAt(ts)
  return ts
}

/* -------------------------------------------------------------------------- */
/* gzip                                                                        */
/* -------------------------------------------------------------------------- */

const canGzip = typeof CompressionStream !== 'undefined'

async function gzipToB64(str: string): Promise<string> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

async function gunzipFromB64(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

async function call(method: 'GET' | 'PUT', query = '', body?: unknown): Promise<Response> {
  const code = getCode()
  if (!code) throw Object.assign(new Error('no recovery code'), { code: 'nocode' })
  return fetch(SYNC_URL + query, {
    method,
    headers: {
      authorization: `Bearer ${code}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

/** The cloud's save metadata, without downloading the blob. Null if none. */
export async function peekCloud(): Promise<{ savedAt: number } | null> {
  if (!cloudConfigured() || !hasCode()) return null
  try {
    const res = await call('GET', '?peek=1')
    if (res.status === 404) return null
    if (!res.ok) return null
    const meta = (await res.json()) as { savedAt: number }
    return meta
  } catch {
    return null
  }
}

/** Pull the cloud save and decode it. Null if none, or if it's a finished run. */
export async function pullCloud(): Promise<SaveData | null> {
  if (!cloudConfigured() || !hasCode()) return null
  try {
    const res = await call('GET')
    if (res.status === 404) return null
    if (!res.ok) return null
    const row = (await res.json()) as { data: string; enc?: string; savedAt: number }
    const json = row.enc === 'gz' ? await gunzipFromB64(row.data) : row.data
    const data = JSON.parse(json) as SaveData
    if (data.version !== SAVE_VERSION || !data.character || !data.state) return null
    if (isRunOver(data.state)) return null
    // We now hold the cloud's revision — record it as our sync base.
    setLocalSavedAt(row.savedAt)
    setBase(row.savedAt)
    return data
  } catch {
    return null
  }
}

/**
 * Push the local run to the cloud. Debounced by the caller. `force` skips the
 * compare-and-swap (used to resolve a conflict in this device's favour).
 */
export async function pushCloud(
  character: Character,
  state: LoopState,
  opts: { force?: boolean } = {},
): Promise<void> {
  if (!cloudConfigured() || !hasCode() || isRunOver(state)) return
  setStatus('syncing')
  try {
    const savedAt = localSavedAt() || markLocalChange()
    const payload: SaveData = { version: SAVE_VERSION, character, state }
    const raw = JSON.stringify(payload)
    const enc = canGzip ? 'gz' : undefined
    const data = canGzip ? await gzipToB64(raw) : raw

    const res = await call('PUT', '', {
      data,
      enc,
      savedAt,
      version: SAVE_VERSION,
      ...(opts.force ? { force: true } : { baseSavedAt: getBase() ?? undefined }),
    })

    if (res.status === 409) {
      setStatus('conflict', 'This run also changed on another device.')
      return
    }
    if (res.status === 413) {
      setStatus('error', 'Save too large to sync.')
      return
    }
    if (!res.ok) {
      setStatus('error', `Sync failed (${res.status}).`)
      return
    }
    setBase(savedAt)
    setStatus('ok')
  } catch {
    // Almost always offline — the local save already happened, so this is benign.
    setStatus('offline')
  }
}

/**
 * On boot, decide who's ahead. Returns a save to load when the cloud is newer
 * than what's local (another device moved it on, or this device has nothing),
 * otherwise null and — if local is ahead — kicks a push. Newest-wins here;
 * mid-session forks are caught by the push CAS above.
 */
export async function reconcile(
  character: Character | null,
  state: LoopState | null,
): Promise<SaveData | null> {
  if (!cloudConfigured() || !hasCode() || !autoSyncOn()) return null
  const meta = await peekCloud()
  const local = localSavedAt()

  // Cloud has something and we're behind it (or have nothing) — take the cloud.
  if (meta && meta.savedAt > local) {
    return await pullCloud()
  }
  // We're ahead (or the cloud is empty) — send ours up, if we have one.
  if (character && state && !isRunOver(state)) {
    if (!meta || local > meta.savedAt) void pushCloud(character, state)
  }
  return null
}
