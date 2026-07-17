import type { CreationAction, CreationState } from '../../game/creation.ts'

interface Props {
  state: CreationState
  dispatch: (action: CreationAction) => void
}

export default function NameStep({ state, dispatch }: Props) {
  return (
    <div className="step">
      <h2 className="step-title">Who are you?</h2>
      <p className="step-lede">
        Your real name. Not a character&apos;s — yours. This one is for you, and it is the whole
        reason any of the rest of it will mean anything.
      </p>

      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          type="text"
          value={state.realName}
          onChange={(e) => dispatch({ type: 'setRealName', value: e.target.value })}
          placeholder="The name on your rent cheque"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={40}
        />
      </label>

      <label className="field">
        <span className="field-label">
          Stage name <span className="field-optional">optional</span>
        </span>
        <input
          className="input"
          type="text"
          value={state.stageName}
          onChange={(e) => dispatch({ type: 'setStageName', value: e.target.value })}
          placeholder="Leave it blank if you don't have one yet"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          maxLength={40}
        />
        <span className="field-help">
          This is who the world meets. You can leave it empty and decide later — or change it once
          you know who you turned out to be.
        </span>
      </label>
    </div>
  )
}
