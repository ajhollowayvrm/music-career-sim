/**
 * Cloud backend wiring — the Function URL printed by `sam deploy` (see
 * aws/README.md). It's a PUBLIC identifier (just an endpoint): safe to commit,
 * and useless without a player's recovery code.
 *
 * Leave SYNC_URL blank to disable cloud sync entirely — the game still saves
 * locally exactly as before. Overridable at build time via VITE_SYNC_URL.
 */
export const SYNC_URL: string = import.meta.env?.VITE_SYNC_URL || ''
