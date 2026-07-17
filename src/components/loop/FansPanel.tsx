import type { LoopAction, LoopState } from '../../game/loop.ts'
import {
  ATTENTION_PER_WEEK,
  describeWarmth,
  typeBlurb,
  typeLabel,
} from '../../game/superfans.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * Superfans — BRIEF §14. The faces inside the number. The panel makes the
 * finitude physical: you have a fixed amount of attention this week, it's
 * spent as you tend to people, and the ones you leave are visibly cooling. You
 * can't keep everyone warm, and the panel never pretends otherwise.
 */
export default function FansPanel({ state, dispatch }: Props) {
  const fans = state.superfans
  const left = ATTENTION_PER_WEEK - state.attentionUsed

  return (
    <div className="fans">
      <div className="board-head">
        <h2 className="step-title">Your people</h2>
        <p className="step-lede">
          Real people inside the number. You can only reach out to so many in a week — tend the ones
          you can, and know the rest are cooling.
        </p>
      </div>

      {fans.length === 0 ? (
        <p className="things-empty">
          Nobody has stepped out of the crowd yet. Keep growing, and faces start to appear.
        </p>
      ) : (
        <>
          <p className="attention">
            {left > 0 ? (
              <>
                <strong>{left}</strong> {left === 1 ? 'person' : 'people'} you can reach out to this
                week.
              </>
            ) : (
              "That's all the attention you have this week."
            )}
          </p>

          <ul className="fan-list">
            {fans.map((fan) => (
              <li key={fan.id} className={`fan${fan.critic ? ' is-critic' : ''}`}>
                <p className="fan-name">
                  {fan.name}
                  <span className={`fan-type${fan.critic ? ' is-critic' : ''}`}>
                    {fan.critic ? 'Critic' : typeLabel(fan.type)}
                  </span>
                </p>
                <p className="fan-blurb">{typeBlurb(fan.type)}</p>
                <p className="fan-warmth">{describeWarmth(fan)}</p>
                <button
                  type="button"
                  className="song-btn"
                  disabled={fan.tendedThisWeek || left <= 0}
                  onClick={() => dispatch({ type: 'nurtureFan', fanId: fan.id })}
                >
                  {fan.tendedThisWeek
                    ? 'Reached out this week'
                    : fan.critic
                      ? 'Try to make it right'
                      : 'Reach out'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
