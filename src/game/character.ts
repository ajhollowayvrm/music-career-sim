/**
 * The finished character — BRIEF §2 and §3.
 *
 * Everything here is plain data: no classes, no Date, no functions. That's what
 * keeps saving additive later (README "Known gaps") rather than a refactor.
 * Please keep it that way.
 */

import { type Leanings, averageLeanings } from './genres.ts'
import { type OriginId, originById } from './origins.ts'
import { type InterviewAnswers, effectsFromAnswers } from './interview.ts'
import { type TalentSpread, emptySpread, TALENT_IDS } from './talents.ts'
import { type Traits, resolveTraits } from './traits.ts'

export interface Character {
  /** The real name. §2: this grounds the game as personal. */
  readonly realName: string
  /** Who the world meets. May be empty — §2 lets it be blank, and change later. */
  readonly stageName: string
  readonly originId: OriginId

  /** Fixed forever (§3). Never rendered as a number. */
  readonly traits: Traits
  /** Fixed forever (§2). Never rendered as a number. */
  readonly leanings: Leanings
  /** The genres actually picked, kept so the player's authorship survives. */
  readonly genreIds: readonly string[]
  /** Learnable — this one is allowed to grow (§3). */
  readonly talents: TalentSpread
}

/** The name the world uses: stage name if there is one, else the real one. */
export const billedAs = (c: Pick<Character, 'realName' | 'stageName'>): string =>
  c.stageName.trim() || c.realName.trim()

/** An origin's head-start, as a full spread. */
export function baseTalents(originId: OriginId): TalentSpread {
  const spread = emptySpread()
  const origin = originById(originId)
  for (const id of TALENT_IDS) {
    spread[id] = origin.talentHeadStart[id] ?? 0
  }
  return spread
}

export interface CharacterDraft {
  readonly realName: string
  readonly stageName: string
  readonly originId: OriginId
  readonly answers: InterviewAnswers
  readonly talents: TalentSpread
  readonly genreIds: readonly string[]
}

/**
 * Collapses the draft into the person. This is the moment identity freezes: the
 * origin's quiet seeds and every interview answer are summed here, once, and the
 * result is fixed for the rest of the run (§2, §3).
 */
export function finalizeCharacter(draft: CharacterDraft): Character {
  const origin = originById(draft.originId)

  return {
    realName: draft.realName.trim(),
    stageName: draft.stageName.trim(),
    originId: draft.originId,
    // Origin seeds personality "quietly" (§2) — same pile as the interview, and
    // the player is never told which of the two moved what.
    traits: resolveTraits([origin.seeds, ...effectsFromAnswers(draft.answers)]),
    leanings: averageLeanings(draft.genreIds),
    genreIds: [...draft.genreIds],
    talents: { ...draft.talents },
  }
}
