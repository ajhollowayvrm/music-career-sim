import { useState } from 'react'
import { PILLARS, LADDER } from './game/pillars.ts'
import type { Character } from './game/character.ts'
import CreationFlow from './components/creation/CreationFlow.tsx'
import CareerLoop from './components/loop/CareerLoop.tsx'

const REPO_URL = 'https://github.com/ajhollowayvrm/music-career-sim'

type View = 'title' | 'creating' | 'playing'

interface Run {
  readonly character: Character
  /** Seeds the run's RNG so a career is reproducible (see game/rng.ts). */
  readonly seed: number
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
        onQuit={() => {
          setRun(null)
          setView('title')
        }}
      />
    )
  }

  return <Title onStart={() => setView('creating')} />
}

function Title({ onStart }: { onStart: () => void }) {
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
          <button className="btn btn-primary" onClick={onStart}>
            New Career
          </button>
          <a className="btn btn-ghost" href={`${REPO_URL}/blob/main/docs/BRIEF.md`}>
            Read the design doc
          </a>
        </div>
        <p className="status">
          <span className="dot" aria-hidden="true" />
          Pre-alpha — author a musician, plan your weeks, write songs, put them out, play them to a
          room, and find (or wreck) a band. Nothing is saved.
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

