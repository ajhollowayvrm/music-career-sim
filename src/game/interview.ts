/**
 * The interview — BRIEF §2.
 *
 * This is the most important surface in the game. Identity is fixed and hidden,
 * so this is the ONLY place the real player gets authored.
 *
 * Rules taken straight from §2:
 *
 *  - Scenario-based, answered AS YOURSELF. Not "pick a personality"; put the
 *    real you in and let the world respond to it.
 *  - NO RIGHT ANSWERS. Every answer moves something; none is the good one. If an
 *    option ever reads as the obviously-correct pick, it's written wrong.
 *  - NO VISIBLE STATS. The player never learns what moved. `effects` exists only
 *    for the engine.
 *
 * LENGTH: seven, set by AJ. §2 rejects a five-question version as too shallow,
 * so five is the floor, not the target. The five topics the brief names by hand
 * are all here and are not up for cutting: why you make music (q_why), the stage
 * (q_stage), a flaky bandmate (q_flake), what you'd do for exposure
 * (q_exposure), a brutal review (q_review). The two discretionary picks are
 * q_contract — the only question that meaningfully moves Industry Trust, which
 * would otherwise be left undetermined — and q_made_it, the closer.
 *
 * The order is an arc: inward, then the stage, then other people, then the
 * temptation, then judgement, then the industry, then the horizon.
 *
 * Effects are roughly -2..+2 per trait. With only seven questions the reachable
 * range per trait is narrow, so traits.ts tunes STEP to match this count — if
 * you add or cut questions here, re-check that tuning.
 */

import type { TraitEffects } from './traits.ts'

export interface Answer {
  readonly id: string
  readonly text: string
  readonly effects: TraitEffects
}

export interface Question {
  readonly id: string
  /** The scene. Second person, present tense — it's happening to you. */
  readonly prompt: string
  /** Optional beat under the prompt, for air. */
  readonly aside?: string
  readonly answers: readonly Answer[]
}

export const INTERVIEW: readonly Question[] = [
  {
    id: 'q_why',
    prompt: 'Why do you make music?',
    aside: 'Not the answer you give in interviews. The real one.',
    answers: [
      {
        id: 'cant_not',
        text: "Because I can't not. It's the only thing that quiets my head.",
        effects: { integrity: 2, ambition: -1, discipline: 1 },
      },
      {
        id: 'the_room',
        text: 'Because I want a room full of people screaming my words back at me.',
        effects: { ambition: 2, confidence: 1, warmth: -1 },
      },
      {
        id: 'something_to_say',
        text: "Because I've got something to say and nobody else is saying it.",
        effects: { integrity: 2, ambition: 1, confidence: 1, industryTrust: -1 },
      },
      {
        id: 'good_at_it',
        text: "Because I'm good at it, and it beats working.",
        // Integrity down: a trade, not a calling. Integrity needs somewhere to
        // fall across the set, or a cynic reads back as a purist.
        effects: { discipline: -2, ambition: -1, warmth: 1, integrity: -1 },
      },
    ],
  },
  {
    id: 'q_stage',
    prompt: "You're four seconds from walking on. What's your body doing?",
    answers: [
      {
        id: 'waiting',
        text: "Nothing. I've been waiting all day for this.",
        effects: { confidence: 2, ambition: 1 },
      },
      {
        id: 'hands_gone',
        text: "My hands are gone. They'll come back on the first chord.",
        effects: { confidence: -1, discipline: 2 },
      },
      {
        id: 'nauseous',
        text: "I'm nauseous and I'd pay real money to be anywhere else.",
        effects: { confidence: -2, integrity: 1, ambition: -1 },
      },
      {
        id: 'elsewhere',
        text: "I'm somewhere else entirely until it starts.",
        effects: { confidence: -1, warmth: -2 },
      },
    ],
  },
  {
    id: 'q_flake',
    prompt: 'Your bandmate no-shows rehearsal. Third time this month.',
    answers: [
      {
        id: 'check_in',
        text: "I call and ask if they're okay.",
        effects: { warmth: 2, discipline: -1, industryTrust: 1 },
      },
      {
        id: 'replace',
        text: "I tell the others it's time to talk about replacing them.",
        effects: { warmth: -2, discipline: 2, ambition: 1 },
      },
      {
        id: 'silent',
        text: 'I rehearse without them and say nothing about it.',
        // Not dishonest exactly, but you're avoiding the straight conversation.
        effects: { warmth: -1, discipline: 2, confidence: -1, integrity: -1 },
      },
      {
        id: 'fine',
        text: "It's fine. Rehearsal's overrated anyway.",
        effects: { discipline: -2, warmth: 1, industryTrust: 1 },
      },
    ],
  },
  {
    id: 'q_exposure',
    prompt:
      'A blog with real reach wants to feature you — if you re-record the song the way they think it should go.',
    answers: [
      {
        id: 'no',
        text: 'No. The song is the song.',
        effects: { integrity: 2, ambition: -1, industryTrust: -1 },
      },
      {
        id: 'try_it',
        text: "I'd try their version. They might be right.",
        effects: { integrity: -1, industryTrust: 2, warmth: 1 },
      },
      {
        id: 'hate_it',
        text: "I'd do it, hate it, and take the feature.",
        effects: { ambition: 2, integrity: -2, industryTrust: 1 },
      },
      {
        id: 'counter',
        text: "I'd counter — their edit as a B-side, my version stays the single.",
        effects: { industryTrust: 1, ambition: 1, confidence: 2 },
      },
    ],
  },
  {
    id: 'q_review',
    prompt: "A reviewer calls your record 'competent and forgettable.'",
    answers: [
      {
        id: 'prove_it',
        text: "They're wrong, and the next one will prove it.",
        effects: { confidence: 2, ambition: 2, discipline: 1 },
      },
      {
        id: 'theyre_right',
        text: "They're right. That's what scares me.",
        effects: { confidence: -2, integrity: 2, discipline: 1 },
      },
      {
        id: 'forty_times',
        text: 'I read it forty times.',
        effects: { confidence: -2, ambition: 1, warmth: -1 },
      },
      {
        id: 'didnt_read',
        text: "I didn't read it.",
        effects: { confidence: 1, integrity: 1, industryTrust: -2 },
      },
    ],
  },
  {
    id: 'q_contract',
    prompt: "A label wants to sign you. There's a clause you don't understand.",
    answers: [
      {
        id: 'sign',
        text: 'I sign. This is the chance.',
        // Signing what you haven't read is a small betrayal of the work.
        effects: { industryTrust: 2, ambition: 2, discipline: -2, integrity: -1 },
      },
      {
        id: 'find_someone',
        text: 'I find someone who can read it properly.',
        effects: { discipline: 2, industryTrust: -1, warmth: 1 },
      },
      {
        id: 'designed_for_that',
        text: "A clause I don't understand is a clause built for that.",
        effects: { industryTrust: -2, integrity: 2, warmth: -1 },
      },
      {
        id: 'ask_them',
        text: 'I ask them to explain it, and watch how they answer.',
        effects: { industryTrust: -1, confidence: 2, warmth: 1 },
      },
    ],
  },
  {
    id: 'q_made_it',
    prompt: "In ten years, what does 'made it' look like?",
    aside: 'Last one. Be honest.',
    answers: [
      {
        id: 'rent_paid',
        text: "Rent paid by music. That's the whole dream.",
        effects: { ambition: -2, integrity: 2, warmth: 1 },
      },
      {
        id: 'five_hundred',
        text: 'Five hundred people who know every word.',
        effects: { integrity: 2, warmth: 2, industryTrust: -1 },
      },
      {
        id: 'arenas',
        text: 'Arenas. Say it out loud.',
        // The size of the room over the worth of the work.
        effects: { ambition: 2, confidence: 2, industryTrust: 1, integrity: -1 },
      },
      {
        id: 'catalog',
        text: "A catalog I'm not embarrassed by.",
        effects: { integrity: 2, ambition: -1, discipline: 2 },
      },
    ],
  },
]

/** Answers are keyed by question id. */
export type InterviewAnswers = Readonly<Record<string, string>>

export const answerFor = (question: Question, answerId: string | undefined): Answer | undefined =>
  question.answers.find((a) => a.id === answerId)

export const effectsFromAnswers = (answers: InterviewAnswers): TraitEffects[] =>
  INTERVIEW.flatMap((q) => {
    const chosen = answerFor(q, answers[q.id])
    return chosen ? [chosen.effects] : []
  })
