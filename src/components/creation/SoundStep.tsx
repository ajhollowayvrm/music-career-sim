import { useState } from 'react'
import { GENRES, averageLeanings, describeLeanings } from '../../game/genres.ts'
import { MAX_TALENT_AT_CREATION, TALENTS, pips, type Talent } from '../../game/talents.ts'
import { baseTalents } from '../../game/character.ts'
import { pointsLeft, type CreationAction, type CreationState } from '../../game/creation.ts'

interface Props {
  state: CreationState
  dispatch: (action: CreationAction) => void
}

type Tab = 'talents' | 'sound'

const GROUPS = ['The songs', 'The playing', 'The room'] as const

/**
 * §2 wants the genre picker "right next to talent allocation so the player can
 * flip between them and try builds". A phone has no "next to", so they share one
 * step behind a toggle — flipping is one tap and nothing is lost either way.
 */
export default function SoundStep({ state, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>('talents')

  const left = pointsLeft(state)
  const base = state.originId ? baseTalents(state.originId) : null
  const leanings = averageLeanings(state.genreIds)

  return (
    <div className="step">
      <h2 className="step-title">What can you do, and what do you love?</h2>
      <p className="step-lede">
        Two different questions. Skill is not taste — you can be brilliant at music you have no
        feeling for, and that gap will cost you later.
      </p>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'talents'}
          className={`tab${tab === 'talents' ? ' is-active' : ''}`}
          onClick={() => setTab('talents')}
        >
          Talents{left > 0 && <span className="tab-badge">{left}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sound'}
          className={`tab${tab === 'sound' ? ' is-active' : ''}`}
          onClick={() => setTab('sound')}
        >
          Your sound
          {state.genreIds.length > 0 && <span className="tab-badge">{state.genreIds.length}</span>}
        </button>
      </div>

      {tab === 'talents' ? (
        <div className="tab-panel" role="tabpanel">
          <p className={`points${left === 0 ? ' is-done' : ''}`}>
            {left > 0
              ? `${left} point${left === 1 ? '' : 's'} left to spend`
              : 'Every point spent. This is who you are on day one.'}
          </p>

          {GROUPS.map((group) => (
            <div key={group} className="talent-group">
              <h3 className="talent-group-title">{group}</h3>
              {TALENTS.filter((t) => t.group === group).map((talent) => (
                <TalentRow
                  key={talent.id}
                  talent={talent}
                  value={state.talents[talent.id]}
                  floor={base ? base[talent.id] : 0}
                  canAdd={left > 0}
                  dispatch={dispatch}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="tab-panel" role="tabpanel">
          <p className="points">
            Pick every genre you actually love. Not what you plan to make — what you put on.
          </p>

          <ul className="genres">
            {GENRES.map((genre) => {
              const on = state.genreIds.includes(genre.id)
              return (
                <li key={genre.id}>
                  <button
                    type="button"
                    className={`genre${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => dispatch({ type: 'toggleGenre', genreId: genre.id })}
                  >
                    {genre.label}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Taste in prose. Pillar 2 forbids showing the axes themselves. */}
          {state.genreIds.length > 0 && <p className="leaning-read">{describeLeanings(leanings)}</p>}
        </div>
      )}
    </div>
  )
}

interface RowProps {
  talent: Talent
  value: number
  floor: number
  canAdd: boolean
  dispatch: (action: CreationAction) => void
}

function TalentRow({ talent, value, floor, canAdd, dispatch }: RowProps) {
  const seeded = floor > 0
  return (
    <div className="talent-row">
      <div className="talent-info">
        <span className="talent-label">
          {talent.label}
          {seeded && (
            <span className="talent-seeded" title="A head-start from your origin">
              from your past
            </span>
          )}
        </span>
        <span className="talent-blurb">{talent.blurb}</span>
      </div>

      <div className="stepper">
        <button
          type="button"
          className="step-btn"
          onClick={() => dispatch({ type: 'adjustTalent', talentId: talent.id, delta: -1 })}
          disabled={value <= floor}
          aria-label={`Lower ${talent.label}`}
        >
          −
        </button>
        <span className="pips" aria-label={`${talent.label}: ${value} of ${MAX_TALENT_AT_CREATION}`}>
          {pips(value)}
        </span>
        <button
          type="button"
          className="step-btn"
          onClick={() => dispatch({ type: 'adjustTalent', talentId: talent.id, delta: 1 })}
          disabled={!canAdd || value >= MAX_TALENT_AT_CREATION}
          aria-label={`Raise ${talent.label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
