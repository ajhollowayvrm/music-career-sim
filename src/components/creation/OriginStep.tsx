import { ORIGINS } from '../../game/origins.ts'
import type { CreationAction, CreationState } from '../../game/creation.ts'

interface Props {
  state: CreationState
  dispatch: (action: CreationAction) => void
}

export default function OriginStep({ state, dispatch }: Props) {
  return (
    <div className="step">
      <h2 className="step-title">Where did you come from?</h2>
      <p className="step-lede">
        A story, not a class. Wherever you started, you can still become anything — this only
        decides what you already had in your hands.
      </p>

      <ul className="origins">
        {ORIGINS.map((origin) => {
          const selected = state.originId === origin.id
          return (
            <li key={origin.id}>
              <button
                type="button"
                className={`origin-card${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => dispatch({ type: 'chooseOrigin', originId: origin.id })}
              >
                <span className="origin-label">{origin.label}</span>
                <span className="origin-story">{origin.story}</span>
                <span className="keepsake">
                  <span className="keepsake-name">{origin.keepsake.name}</span>
                  <span className="keepsake-desc">{origin.keepsake.description}</span>
                  <span className="keepsake-benefit">{origin.keepsake.benefit}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
