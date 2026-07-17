import { useMemo, useReducer } from 'react'
import {
  STEPS,
  canAdvance,
  creationReducer,
  draftFrom,
  initialCreationState,
  pointsLeft,
  type CreationState,
} from '../../game/creation.ts'
import { finalizeCharacter, type Character } from '../../game/character.ts'
import { INTERVIEW } from '../../game/interview.ts'
import NameStep from './NameStep.tsx'
import OriginStep from './OriginStep.tsx'
import InterviewStep from './InterviewStep.tsx'
import SoundStep from './SoundStep.tsx'
import ConfirmStep from './ConfirmStep.tsx'

interface Props {
  onComplete: (character: Character) => void
  onQuit: () => void
}

const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  name: 'Your name',
  origin: 'Your past',
  interview: 'The interview',
  sound: 'Talent & taste',
  confirm: 'This is you',
}

export default function CreationFlow({ onComplete, onQuit }: Props) {
  const [state, dispatch] = useReducer(creationReducer, initialCreationState)

  const draft = draftFrom(state)
  // Only meaningful on the confirm step, but it must be computed unconditionally
  // — hooks can't sit behind a branch.
  const character = useMemo(
    () => (state.step === 'confirm' && draft ? finalizeCharacter(draft) : null),
    [state.step, draft],
  )

  const stepNumber = STEPS.indexOf(state.step) + 1
  const ready = canAdvance(state)
  const isFirstScreen = state.step === 'name'

  // The interview has no Next of its own: answering advances it. The button only
  // reappears on the last question, once it's been answered.
  const showNext =
    state.step !== 'interview' ||
    (state.questionIndex === INTERVIEW.length - 1 && state.answers[INTERVIEW[INTERVIEW.length - 1]!.id] !== undefined)

  return (
    <div className="creation">
      <header className="creation-header">
        <button type="button" className="creation-quit" onClick={onQuit}>
          Leave
        </button>
        <span className="creation-step">
          {STEP_LABELS[state.step]}
          <span className="creation-count">
            {stepNumber}/{STEPS.length}
          </span>
        </span>
      </header>

      <main className="creation-body">
        {state.step === 'name' && <NameStep state={state} dispatch={dispatch} />}
        {state.step === 'origin' && <OriginStep state={state} dispatch={dispatch} />}
        {state.step === 'interview' && <InterviewStep state={state} dispatch={dispatch} />}
        {state.step === 'sound' && <SoundStep state={state} dispatch={dispatch} />}
        {state.step === 'confirm' && character && <ConfirmStep character={character} />}
      </main>

      {/* Bottom-anchored: this is the thumb zone on a phone. */}
      <footer className="creation-actions">
        {!isFirstScreen && (
          <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'back' })}>
            Back
          </button>
        )}
        {state.step === 'confirm' ? (
          <button
            type="button"
            className="btn btn-primary btn-grow"
            onClick={() => character && onComplete(character)}
          >
            Begin
          </button>
        ) : (
          showNext && (
            <button
              type="button"
              className="btn btn-primary btn-grow"
              disabled={!ready}
              onClick={() => dispatch({ type: 'next' })}
            >
              {ready ? 'Continue' : hintFor(state)}
            </button>
          )
        )}
      </footer>
    </div>
  )
}

/**
 * Says what's actually missing, in the game's voice — never "invalid input".
 * Takes the whole state, not just the step: the sound step has two halves and a
 * static hint tells you to spend points you've already spent.
 */
function hintFor(state: CreationState): string {
  switch (state.step) {
    case 'name':
      return 'Your name first'
    case 'origin':
      return 'Choose where you started'
    case 'interview':
      return 'Answer every one'
    case 'sound': {
      const needsPoints = pointsLeft(state) > 0
      const needsGenres = state.genreIds.length === 0
      if (needsPoints && needsGenres) return 'Spend your points, pick your loves'
      if (needsPoints) return 'Spend your points'
      return 'Pick what you love'
    }
    case 'confirm':
      return 'Continue'
  }
}
