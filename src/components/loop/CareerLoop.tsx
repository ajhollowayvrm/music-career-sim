import { useReducer, useState } from 'react'
import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { initialLoopState, loopReducer, workbench } from '../../game/loop.ts'
import { canPlayWeek } from '../../game/week.ts'
import WeekBoard, { VitalsBar } from './WeekBoard.tsx'
import DayResolve from './DayResolve.tsx'
import WeekSummary from './WeekSummary.tsx'
import SongsPanel from './SongsPanel.tsx'
import GigsPanel from './GigsPanel.tsx'
import GigNight from './GigNight.tsx'
import BandPanel from './BandPanel.tsx'
import ItemsPanel from './ItemsPanel.tsx'
import GameOver from './GameOver.tsx'

interface Props {
  character: Character
  seed: number
  onQuit: () => void
}

type Tab = 'week' | 'songs' | 'gigs' | 'band' | 'things'

/** §5 The Daily Loop: plan a week, watch it happen a day at a time, settle up. */
export default function CareerLoop({ character, seed, onQuit }: Props) {
  // §11 seeds the origin's keepsake into the starting inventory, so the init
  // needs the character — a lazy initializer threads it through the seed.
  const [state, dispatch] = useReducer(loopReducer, seed, (s) =>
    initialLoopState(s, character.originId),
  )
  const [tab, setTab] = useState<Tab>('week')

  const planning = state.phase === 'planning'
  const benchCount = workbench(state).length

  // §12: the run is over. Eviction takes the whole screen — no vitals, no tabs,
  // nothing to plan. There is no coming back from this one.
  if (state.phase === 'gameover') {
    return <GameOver state={state} character={character} onQuit={onQuit} />
  }

  // §9 takes the whole screen — a gig is not a sidebar.
  if (state.phase === 'gig') {
    return (
      <div className="creation">
        <VitalsBar state={state} />
        <main className="creation-body">
          <GigNight state={state} character={character} dispatch={dispatch} />
        </main>
      </div>
    )
  }

  return (
    <div className="creation">
      <header className="creation-header">
        <button type="button" className="creation-quit" onClick={onQuit}>
          Leave
        </button>
        <span className="creation-step">{billedAs(character)}</span>
      </header>

      <VitalsBar state={state} />

      {/* Songs are managed between weeks, not mid-week — once the week is
          running you live with the plan you made. */}
      {planning && (
        <div className="loop-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'week'}
            className={`tab${tab === 'week' ? ' is-active' : ''}`}
            onClick={() => setTab('week')}
          >
            Week {state.week}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'songs'}
            className={`tab${tab === 'songs' ? ' is-active' : ''}`}
            onClick={() => setTab('songs')}
          >
            Songs
            {benchCount > 0 && <span className="tab-badge">{benchCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'gigs'}
            className={`tab${tab === 'gigs' ? ' is-active' : ''}`}
            onClick={() => setTab('gigs')}
          >
            Rooms
            {state.booking && <span className="tab-badge">1</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'band'}
            className={`tab${tab === 'band' ? ' is-active' : ''}`}
            onClick={() => setTab('band')}
          >
            Band
            {/* A demand is someone waiting on an answer — it shouldn't be
                findable only by chance. */}
            {state.demand && <span className="tab-badge is-urgent">!</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'things'}
            className={`tab${tab === 'things' ? ' is-active' : ''}`}
            onClick={() => setTab('things')}
          >
            Things
            {/* A lapsed pawn or overdue rent both make the safety net urgent. */}
            {(state.pawnForfeited.length > 0 || state.graceWeeksLeft > 0) && (
              <span className="tab-badge is-urgent">!</span>
            )}
          </button>
        </div>
      )}

      <main className="creation-body">
        {planning && tab === 'week' && <WeekBoard state={state} dispatch={dispatch} />}
        {planning && tab === 'songs' && (
          <SongsPanel state={state} character={character} dispatch={dispatch} />
        )}
        {planning && tab === 'gigs' && <GigsPanel state={state} dispatch={dispatch} />}
        {planning && tab === 'band' && (
          <BandPanel state={state} character={character} dispatch={dispatch} />
        )}
        {planning && tab === 'things' && <ItemsPanel state={state} dispatch={dispatch} />}
        {state.phase === 'resolving' && (
          <DayResolve
            state={state}
            onNext={() => dispatch({ type: 'advanceDay', character })}
            onFinish={() => dispatch({ type: 'finishWeek' })}
          />
        )}
        {state.phase === 'summary' && (
          <WeekSummary state={state} onNext={() => dispatch({ type: 'nextWeek' })} />
        )}
      </main>

      {planning && tab === 'week' && (
        <footer className="creation-actions">
          <button
            type="button"
            className="btn btn-primary btn-grow"
            disabled={!canPlayWeek(state.plan)}
            onClick={() => dispatch({ type: 'playWeek' })}
          >
            Play the week
          </button>
        </footer>
      )}
    </div>
  )
}
