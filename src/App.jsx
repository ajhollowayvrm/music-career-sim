import { PILLARS, LADDER } from './game/pillars.js'

const REPO_URL = 'https://github.com/ajhollowayvrm/music-career-sim'

export default function App() {
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
          <button className="btn btn-primary" disabled>
            New Career
          </button>
          <a className="btn btn-ghost" href={`${REPO_URL}/blob/main/docs/BRIEF.md`}>
            Read the design doc
          </a>
        </div>
        <p className="status">
          <span className="dot" aria-hidden="true" />
          Pre-alpha — the design is written, the systems aren&apos;t built yet. Nothing here is
          playable.
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
          Design: AJ · Systems &amp; prototyping: Claude ·{' '}
          <a href={REPO_URL}>source</a>
        </p>
      </footer>
    </div>
  )
}
