import { useEffect, useState } from 'react'
import { PILLARS, LADDER } from './game/pillars.ts'
import type { Character } from './game/character.ts'
import type { LoopState } from './game/loop.ts'
import { exportSave, importSave, loadRun, saveRun } from './game/save.ts'
import {
  cloudConfigured,
  formatCode,
  getCode,
  hasCode,
  reconcile,
  setCode,
} from './game/cloudSave.ts'
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
  // Bumped after a cloud reconcile writes a fresher save locally, so the title
  // re-reads it and Continue reflects the run that actually came down.
  const [reload, setReload] = useState(0)

  // On boot, if the cloud is ahead of what's local, pull it down before the
  // player can pick Continue. Runs once; the local autosave takes over in-game.
  useEffect(() => {
    if (!cloudConfigured() || !hasCode()) return
    const local = loadRun()
    void reconcile(local?.character ?? null, local?.state ?? null).then((cloud) => {
      if (cloud) {
        saveRun(cloud.character, cloud.state)
        setReload((n) => n + 1)
      }
    })
  }, [])

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

  // A code entered from another device: adopt it, pull that slot, show Continue.
  const syncCode = (code: string) => {
    setCode(code)
    void reconcile(null, null).then((cloud) => {
      if (cloud) saveRun(cloud.character, cloud.state)
      setReload((n) => n + 1)
    })
  }

  return (
    <Title
      key={reload}
      onStart={() => setView('creating')}
      onContinue={resume}
      onImport={resume}
      onSyncCode={syncCode}
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
  onSyncCode: (code: string) => void
}

function Title({ onStart, onContinue, onImport, onSyncCode }: TitleProps) {
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

        {/* Cloud save — the recovery code that follows a run across devices. */}
        {cloudConfigured() && <CloudPanel onSyncCode={onSyncCode} />}

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

/**
 * Cloud save on the title: your recovery code (once a run has created one), to
 * back up and to type on another device. Recovery-code identity — no account, no
 * password. Only rendered when a backend is configured (SYNC_URL set).
 */
function CloudPanel({ onSyncCode }: { onSyncCode: (code: string) => void }) {
  const code = getCode()
  const [entry, setEntry] = useState('')
  const [copied, setCopied] = useState(false)
  const [entering, setEntering] = useState(false)

  const copy = () => {
    if (!code) return
    void navigator.clipboard?.writeText(formatCode(code)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="cloud-panel">
      {code && (
        <p className="cloud-code-line">
          <span className="cloud-label">Recovery code</span>
          <code className="cloud-code">{formatCode(code)}</code>
          <button className="link-btn" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </p>
      )}
      {code && (
        <p className="cloud-hint">
          Back this up. It's the only way to reach this save on another device or after your browser
          clears its storage.
        </p>
      )}

      {entering ? (
        <form
          className="cloud-enter"
          onSubmit={(e) => {
            e.preventDefault()
            if (entry.trim()) onSyncCode(entry)
          }}
        >
          <input
            className="input"
            type="text"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Paste a recovery code"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button className="btn btn-primary" type="submit" disabled={!entry.trim()}>
            Sync
          </button>
        </form>
      ) : (
        <button className="link-btn" onClick={() => setEntering(true)}>
          Have a code from another device?
        </button>
      )}
    </div>
  )
}

