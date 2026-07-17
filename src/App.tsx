import { useState } from 'react'
import { PILLARS, LADDER } from './game/pillars.ts'
import { billedAs, type Character } from './game/character.ts'
import { originById } from './game/origins.ts'
import CreationFlow from './components/creation/CreationFlow.tsx'

const REPO_URL = 'https://github.com/ajhollowayvrm/music-career-sim'

type View = 'title' | 'creating' | 'created'

export default function App() {
  const [view, setView] = useState<View>('title')
  const [character, setCharacter] = useState<Character | null>(null)

  if (view === 'creating') {
    return (
      <CreationFlow
        onQuit={() => setView('title')}
        onComplete={(c) => {
          setCharacter(c)
          setView('created')
        }}
      />
    )
  }

  if (view === 'created' && character) {
    return <DayOne character={character} onRestart={() => setView('title')} />
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
          Pre-alpha — character creation works. The career it leads to doesn&apos;t exist yet, and
          nothing is saved.
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

/**
 * Where the daily loop (§5) will start. It doesn't exist yet, and this screen
 * says so rather than pretending — the scaffold stays honest.
 */
function DayOne({ character, onRestart }: { character: Character; onRestart: () => void }) {
  const origin = originById(character.originId)
  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">day one</p>
        <h1 className="title day-one-title">{billedAs(character)}</h1>
        <p className="tagline">{origin.label}</p>
        <p className="pitch">
          You have {origin.keepsake.name.toLowerCase()}, no fans, and rent due. This is where the
          daily loop would pick you up.
        </p>
        <p className="status">
          <span className="dot" aria-hidden="true" />
          §5 The Daily Loop isn&apos;t built yet — this run ends here. Nothing is saved, so leaving
          discards this person.
        </p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={onRestart}>
            Back to the start
          </button>
        </div>
      </header>
    </div>
  )
}
