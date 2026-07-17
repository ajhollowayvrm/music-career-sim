import { INTERVIEW } from '../../game/interview.ts'
import type { CreationAction, CreationState } from '../../game/creation.ts'

interface Props {
  state: CreationState
  dispatch: (action: CreationAction) => void
}

/**
 * One question per screen. It's a conversation, not a form (§2) — so answering
 * moves you on by itself, and there's no Next button to press underneath.
 */
export default function InterviewStep({ state, dispatch }: Props) {
  const question = INTERVIEW[state.questionIndex]
  if (!question) return null

  const chosen = state.answers[question.id]
  const answeredCount = INTERVIEW.filter((q) => state.answers[q.id] !== undefined).length

  return (
    <div className="step">
      {/* Tappable, because Back only walks one question at a time — without
          this, backing out of a 14-question interview is 14 presses. */}
      <div className="interview-progress">
        {INTERVIEW.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className="tick-btn"
            aria-label={`Question ${i + 1}${state.answers[q.id] !== undefined ? ', answered' : ''}`}
            aria-current={i === state.questionIndex ? 'step' : undefined}
            onClick={() => dispatch({ type: 'goToQuestion', index: i })}
          >
            <span
              className={[
                'tick',
                state.answers[q.id] !== undefined ? 'is-done' : '',
                i === state.questionIndex ? 'is-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        Question {state.questionIndex + 1} of {INTERVIEW.length}. {answeredCount} answered.
      </p>

      <h2 className="question">{question.prompt}</h2>
      {question.aside && <p className="question-aside">{question.aside}</p>}

      <ul className="answers">
        {question.answers.map((answer) => {
          const selected = chosen === answer.id
          return (
            <li key={answer.id}>
              <button
                type="button"
                className={`answer${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() =>
                  dispatch({ type: 'answer', questionId: question.id, answerId: answer.id })
                }
              >
                {answer.text}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="interview-note">
        There are no right answers here, and you will never be shown a score. Answer as yourself.
      </p>
    </div>
  )
}
