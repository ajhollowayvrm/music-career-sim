import type { LoopAction, LoopState } from '../../game/loop.ts'
import { formatMoney } from '../../game/loop.ts'
import { CAMPAIGNS, nominationLine, resultLine } from '../../game/awards.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * Awards season — BRIEF §15. Two beats: the nominations (with the campaign call)
 * and the ceremony. The campaign is the decision — a charm offensive is cheap, a
 * performance slot swings the popular vote, and going all-out swings everything
 * but costs you Cred for looking thirsty. Letting it stand is always there.
 */
export default function AwardsNight({ state, dispatch }: Props) {
  const awards = state.awards
  if (!awards) return null

  // Results in — the ceremony's been run.
  if (awards.results) {
    const wins = awards.results.filter((r) => r.won).length
    return (
      <div className="creation">
        <main className="creation-body">
          <div className="awards">
            <p className="awards-eyebrow">The ceremony</p>
            <h2 className="awards-title">{wins > 0 ? (wins === 1 ? 'You won.' : 'A big night.') : 'Not this year.'}</h2>
            <ul className="awards-results">
              {awards.results.map((r) => (
                <li key={r.category} className={`awards-result${r.won ? ' is-won' : ''}`}>
                  {resultLine(r)}
                </li>
              ))}
            </ul>
            <div className="resolve-actions">
              <button
                type="button"
                className="btn btn-primary btn-grow"
                onClick={() => dispatch({ type: 'closeAwards' })}
              >
                Back to it
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Nominations in — the campaign call.
  return (
    <div className="creation">
      <main className="creation-body">
        <div className="awards">
          <p className="awards-eyebrow">Awards season · year {awards.year}</p>
          <h2 className="awards-title">You&apos;re nominated.</h2>
          <ul className="awards-noms">
            {awards.nominations.map((n) => (
              <li key={n.category} className="awards-nom">
                {nominationLine(n.category)}
              </li>
            ))}
          </ul>

          <h3 className="confirm-title">How hard do you push?</h3>
          <div className="awards-campaigns">
            {CAMPAIGNS.map((c) => {
              const afford = state.money >= c.cost
              return (
                <button
                  key={c.id}
                  type="button"
                  className="campaign"
                  disabled={!afford}
                  onClick={() => dispatch({ type: 'campaignAwards', approach: c.id })}
                >
                  <span className="campaign-label">
                    {c.label}
                    {c.cost > 0 && <span className="campaign-cost">{formatMoney(-c.cost)}</span>}
                  </span>
                  <span className="campaign-blurb">{c.blurb}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
