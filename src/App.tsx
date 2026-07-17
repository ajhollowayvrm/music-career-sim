import { useState } from 'react'
import { PILLARS, LADDER } from './game/pillars.ts'
import type { Character } from './game/character.ts'
import type { LoopState } from './game/loop.ts'
import { exportSave, importSave, loadRun } from './game/save.ts'
import CreationFlow from './components/creation/CreationFlow.tsx'
import CareerLoop from './components/loop/CareerLoop.tsx'

const REPO_URL = 'https://github.com/ajhollowayvrm/music-career-sim'

type View = 'title' | 'creating' | 'playing'

interface Run {
  readonly character: Character
  /** Seeds the run's RNG so a career is reproducible (see game/rng.ts). */
  readonly seed: number
  /** A resumed run's state, or undefined to start fresh. */
  readonly savedState?: LoopState
}

export default function App() {
  const [view, setView] = useState<View>('title')
  const [run, setRun] = useState<Run | null>(null)

  if (view === 'creating') {
    return (
      <CreationFlow
        onQuit={() => setView('title')}
        onComplete={(character) => {
          // The only place a seed is drawn. Everything downstream is pure.
          setRun({ character, seed: Math.floor(Math.random() * 2 ** 31) })
          setView('playing')
        }}
      />
    )
  }

  if (view === 'playing' && run) {
    return (
      <CareerLoop
        character={run.character}
        seed={run.seed}
        savedState={run.savedState}
        onQuit={() => {
          setRun(null)
          setView('title')
        }}
      />
    )
  }

  const resume = (character: Character, state: LoopState) => {
    setRun({ character, seed: state.rng.seed, savedState: state })
    setView('playing')
  }

  return (
    <Title
      onStart={() => setView('creating')}
      onContinue={resume}
      onImport={resume}
    />
  )
}

/** Download the current save as a file the player keeps (see game/save.ts). */
function downloadSave(character: Character, state: LoopState) {
  const blob = new Blob([exportSave(character, state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'from-the-bottom-up-save.json'
  a.click()
  URL.revokeObjectURL(url)
}

interface TitleProps {
  onStart: () => void
  onContinue: (character: Character, state: LoopState) => void
  onImport: (character: Character, state: LoopState) => void
}

function Title({ onStart, onContinue, onImport }: TitleProps) {
  // Read the autosave once, on render — cheap, and it decides whether Continue
  // shows at all.
  const saved = loadRun()

  const handleImport = (file: File) => {
    file.text().then((text) => {
      const data = importSave(text)
      if (data) onImport(data.character, data.state)
    })
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">working title</p>
        <h1 className="title">
          From the
          <br />
          Bottom Up
        </h1>
        <p className="tagline">a music career simulator</p>
        <p className="pitch">
          You start as a lowly musician with a cheap instrument, no fans, and rent due, and you claw
          your way up — bedroom demos to sold-out rooms to, if you make it far enough, funding
          festivals for the next generation.
        </p>
        <div className="actions">
          {saved && (
            <button
              className="btn btn-primary"
              onClick={() => onContinue(saved.character, saved.state)}
            >
              Continue — week {saved.state.week}
            </button>
          )}
          <button className={`btn ${saved ? 'btn-ghost' : 'btn-primary'}`} onClick={onStart}>
            New Career
          </button>
          <a className="btn btn-ghost" href={`${REPO_URL}/blob/main/docs/BRIEF.md`}>
            Read the design doc
          </a>
        </div>

        {/* The save the player owns — the honest mitigation for storage that can
            be evicted on iOS (see game/save.ts). */}
        <div className="save-tools">
          {saved && (
            <button className="link-btn" onClick={() => downloadSave(saved.character, saved.state)}>
              Export save
            </button>
          )}
          <label className="link-btn">
            Import save
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
              }}
            />
          </label>
        </div>

        <p className="status">
          <span className="dot" aria-hidden="true" />
          Pre-alpha — author a musician, plan your weeks, write songs, put them out, play them to a
          room, find (or wreck) a band, and see it through to an ending. Your run saves as you play.
        </p>
      </header>

      <main>
        <section className="section">
          <h2 className="section-title">Design pillars</h2>
          <ul className="pillars">
            {PILLARS.map((p) => (
              <li key={p.title} className="pillar">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">The shape of a run</h2>
          <ol className="ladder">
            {LADDER.map((rung) => (
              <li key={rung}>{rung}</li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>
          Design: AJ · Systems &amp; prototyping: Claude · <a href={REPO_URL}>source</a>
        </p>
      </footer>
    </div>
  )
}

