/**
 * The interview — BRIEF §2.
 *
 * This is the most important surface in the game. Identity is fixed and hidden,
 * so this is the ONLY place the real player gets authored, and the brief is
 * blunt that "the five-question version was too shallow — this should be a
 * richer interview."
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
 * The five topics §2 names by hand are all here: why you make music (q_why),
 * what you'd do for exposure (q_exposure), how a stage feels (q_stage), a flaky
 * bandmate (q_flake), a brutal review (q_review).
 *
 * Effects are roughly -2..+2 per trait. Keep the pull of any one question small:
 * a person comes out of the whole conversation, not one dramatic answer.
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
        effects: { integrity: 2, ambition: -1 },
      },
      {
        id: 'the_room',
        text: 'Because I want a room full of people screaming my words back at me.',
        effects: { ambition: 2, confidence: 1 },
      },
      {
        id: 'something_to_say',
        text: "Because I've got something to say and nobody else is saying it.",
        effects: { integrity: 1, ambition: 1, confidence: 1 },
      },
      {
        id: 'good_at_it',
        text: "Because I'm good at it, and it beats working.",
        effects: { discipline: -1, ambition: -1, warmth: 1 },
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
        effects: { integrity: 2, ambition: -1 },
      },
      {
        id: 'try_it',
        text: "I'd try their version. They might be right.",
        effects: { integrity: -1, industryTrust: 1, warmth: 1 },
      },
      {
        id: 'hate_it',
        text: "I'd do it, hate it, and take the feature.",
        effects: { ambition: 2, integrity: -2 },
      },
      {
        id: 'counter',
        text: "I'd counter — their edit as a B-side, my version stays the single.",
        effects: { industryTrust: 1, ambition: 1, confidence: 1 },
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
        effects: { confidence: 2 },
      },
      {
        id: 'hands_gone',
        text: "My hands are gone. They'll come back on the first chord.",
        effects: { confidence: -1, discipline: 1 },
      },
      {
        id: 'nauseous',
        text: "I'm nauseous and I'd pay real money to be anywhere else.",
        effects: { confidence: -2, integrity: 1 },
      },
      {
        id: 'elsewhere',
        text: "I'm somewhere else entirely until it starts.",
        effects: { confidence: -1, warmth: -1 },
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
        effects: { warmth: 2, discipline: -1 },
      },
      {
        id: 'replace',
        text: "I tell the others it's time to talk about replacing them.",
        effects: { warmth: -2, discipline: 2 },
      },
      {
        id: 'silent',
        text: 'I rehearse without them and say nothing about it.',
        effects: { warmth: -1, discipline: 1, confidence: -1 },
      },
      {
        id: 'fine',
        text: "It's fine. Rehearsal's overrated anyway.",
        effects: { discipline: -2, warmth: 1 },
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
        effects: { confidence: 2, ambition: 1 },
      },
      {
        id: 'theyre_right',
        text: "They're right. That's what scares me.",
        effects: { confidence: -2, integrity: 2 },
      },
      {
        id: 'forty_times',
        text: 'I read it forty times.',
        effects: { confidence: -2, ambition: 1 },
      },
      {
        id: 'didnt_read',
        text: "I didn't read it.",
        effects: { confidence: 1, integrity: 1, industryTrust: -1 },
      },
    ],
  },
  {
    id: 'q_2am',
    prompt: "It's 2am and the song isn't working.",
    answers: [
      { id: 'stay', text: 'I stay until it works.', effects: { discipline: 2, confidence: -1 } },
      { id: 'sleep', text: "I sleep. It'll still be there tomorrow.", effects: { discipline: -1, warmth: 1 } },
      {
        id: 'new_song',
        text: 'I abandon it and start a different one.',
        effects: { discipline: -2, ambition: 1 },
      },
      {
        id: 'since_tuesday',
        text: "I've been at this since Tuesday. I stay.",
        effects: { discipline: 2, ambition: 1, warmth: -1 },
      },
    ],
  },
  {
    id: 'q_rent',
    prompt: "Rent's due Friday and you're short.",
    answers: [
      { id: 'shifts', text: 'I pick up shifts.', effects: { discipline: 2, ambition: -1 } },
      {
        id: 'sell',
        text: 'I sell something I care about.',
        effects: { integrity: 1, ambition: 1, discipline: -1 },
      },
      {
        id: 'wedding',
        text: "I take the wedding gig and play other people's songs.",
        effects: { integrity: -2, discipline: 1 },
      },
      { id: 'borrow', text: 'I borrow it and figure it out later.', effects: { discipline: -2, warmth: 1 } },
    ],
  },
  {
    id: 'q_party',
    prompt: 'Someone at a party says they can get you in a room with an A&R.',
    answers: [
      {
        id: 'work_it',
        text: 'I work that room all night.',
        effects: { ambition: 2, industryTrust: 1, warmth: -1 },
      },
      {
        id: 'drummer',
        text: "I'd rather talk to the drummer in the corner.",
        effects: { warmth: 2, ambition: -1 },
      },
      {
        id: 'number',
        text: 'I give them my number and go home.',
        effects: { confidence: -1, integrity: 1 },
      },
      {
        id: 'dont_believe',
        text: "I don't believe them.",
        effects: { industryTrust: -2, confidence: -1 },
      },
    ],
  },
  {
    id: 'q_worst_month',
    prompt: 'The best song you ever wrote came out of the worst month of your life.',
    answers: [
      { id: 'worth_it', text: 'Worth it.', effects: { integrity: 1, ambition: 2, warmth: -1 } },
      { id: 'nothing_worth', text: "Nothing's worth that.", effects: { warmth: 2, ambition: -1 } },
      {
        id: 'where_songs_come_from',
        text: "That's just where songs come from.",
        effects: { integrity: 2, confidence: -1 },
      },
      {
        id: 'rather_be_ok',
        text: "I'd rather write worse songs and be okay.",
        effects: { warmth: 1, ambition: -2, discipline: -1 },
      },
    ],
  },
  {
    id: 'q_friends_band',
    prompt: "Your friend's band is better than yours.",
    answers: [
      { id: 'makes_me_work', text: 'Good. It makes me work.', effects: { ambition: 1, warmth: 1, discipline: 1 } },
      { id: 'happy_mostly', text: "I'm happy for them. Mostly.", effects: { warmth: 1, confidence: -1 } },
      { id: 'would_join', text: "I'd join them tomorrow if they asked.", effects: { ambition: -1, warmth: 2, confidence: -1 } },
      { id: 'eats_at_me', text: 'It eats at me.', effects: { ambition: 2, warmth: -2 } },
    ],
  },
  {
    id: 'q_contract',
    prompt: "A label wants to sign you. There's a clause you don't understand.",
    answers: [
      {
        id: 'sign',
        text: 'I sign. This is the chance.',
        effects: { industryTrust: 2, ambition: 2, discipline: -1 },
      },
      {
        id: 'find_someone',
        text: 'I find someone who can read it properly.',
        effects: { discipline: 2, industryTrust: -1 },
      },
      {
        id: 'designed_for_that',
        text: "A clause I don't understand is a clause built for that.",
        effects: { industryTrust: -2, integrity: 1 },
      },
      {
        id: 'ask_them',
        text: 'I ask them to explain it, and watch how they answer.',
        effects: { industryTrust: -1, confidence: 1, warmth: 1 },
      },
    ],
  },
  {
    id: 'q_credit',
    prompt: 'How does credit work on a song you co-wrote?',
    answers: [
      { id: 'even', text: 'Split evenly. Always. No exceptions.', effects: { warmth: 2, integrity: 1 } },
      {
        id: 'who_wrote_it',
        text: 'Whoever wrote it, wrote it. Put it on paper.',
        effects: { integrity: 2, warmth: -1 },
      },
      {
        id: 'the_part_they_remember',
        text: 'I wrote the part people remember. That should count for more.',
        effects: { ambition: 2, warmth: -2 },
      },
      {
        id: 'dont_care',
        text: "I don't care, as long as it's out in the world.",
        effects: { integrity: -1, warmth: 1, ambition: -1 },
      },
    ],
  },
  {
    id: 'q_support_slot',
    prompt: "You're offered a support slot on a tour you'd never listen to.",
    answers: [
      { id: 'rooms_are_rooms', text: 'Take it. Rooms are rooms.', effects: { ambition: 2, integrity: -1 } },
      {
        id: 'wrong_everything',
        text: 'No. Wrong crowd, wrong band, wrong reason.',
        effects: { integrity: 2, ambition: -1 },
      },
      {
        id: 'win_them_over',
        text: 'Take it, and win them over.',
        effects: { confidence: 2, ambition: 1 },
      },
      { id: 'for_money', text: 'Take it. I need the money.', effects: { integrity: -1, discipline: 1 } },
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
        effects: { ambition: -2, integrity: 1 },
      },
      {
        id: 'five_hundred',
        text: 'Five hundred people who know every word.',
        effects: { integrity: 1, warmth: 1 },
      },
      { id: 'arenas', text: 'Arenas. Say it out loud.', effects: { ambition: 2, confidence: 1 } },
      {
        id: 'catalog',
        text: "A catalog I'm not embarrassed by.",
        effects: { integrity: 2, ambition: -1, discipline: 1 },
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
