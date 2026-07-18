import { useState } from 'react'
import { GENRES } from '../../game/genres.ts'
import {
  MAX_THEMES,
  THEMES,
  describeFit,
  describeSoul,
  newSong,
  songFit,
} from '../../game/songs.ts'
import type { Character } from '../../game/character.ts'

interface Props {
  character: Character
  onStart: (
    title: string,
    genreId: string,
    themes: readonly string[],
    tempo: number,
    feel: number,
  ) => void
  onCancel: () => void
}

/**
 * Authoring a song — BRIEF §7.
 *
 * "The player authors as much as possible — title, genre, potential themes." The
 * identity is entirely the player's; nothing here is generated. Themes move no
 * number on purpose (see songs.ts) — they're what the song is about.
 *
 * The one piece of feedback is the fit read: §3's genre mismatch, said in prose
 * before you commit, because writing a whole song in a genre you don't love is a
 * real cost and you should feel it coming.
 */
export default function NewSongForm({ character, onStart, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [genreId, setGenreId] = useState<string | null>(null)
  const [themes, setThemes] = useState<readonly string[]>([])
  const [tempo, setTempo] = useState(0.5)
  const [feel, setFeel] = useState(0.5)

  const ready = title.trim().length > 0 && genreId !== null
  const draft = genreId ? newSong(0, title || 'x', genreId, themes, tempo, feel) : null
  const fit = draft ? songFit(draft, character) : null

  const toggleTheme = (t: string) =>
    setThemes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= MAX_THEMES ? prev : [...prev, t],
    )

  return (
    <div className="song-form">
      <h3 className="song-form-title">A new song</h3>

      <label className="field">
        <span className="field-label">Call it</span>
        <input
          className="input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Every song needs a name"
          autoCapitalize="words"
          enterKeyHint="done"
          maxLength={48}
        />
      </label>

      <p className="field-label">What is it</p>
      <ul className="genres">
        {GENRES.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className={`genre${genreId === g.id ? ' is-on' : ''}`}
              aria-pressed={genreId === g.id}
              onClick={() => setGenreId(g.id)}
            >
              {g.label}
            </button>
          </li>
        ))}
      </ul>

      {fit !== null && <p className="leaning-read">{describeFit(fit)}</p>}

      <p className="field-label">Its soul</p>
      <div className="soul-levers">
        <label className="soul-lever">
          <span className="soul-ends">
            <span>slow</span>
            <span>fast</span>
          </span>
          <input
            className="soul-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={tempo}
            aria-label="Tempo, slow to fast"
            onChange={(e) => setTempo(Number(e.target.value))}
          />
        </label>
        <label className="soul-lever">
          <span className="soul-ends">
            <span>tender</span>
            <span>furious</span>
          </span>
          <input
            className="soul-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={feel}
            aria-label="Feel, tender to furious"
            onChange={(e) => setFeel(Number(e.target.value))}
          />
        </label>
      </div>
      {draft && <p className="leaning-read">{describeSoul(draft, character)}</p>}

      <p className="field-label">
        What it&apos;s about <span className="field-optional">up to {MAX_THEMES}, optional</span>
      </p>
      <ul className="genres">
        {THEMES.map((t) => (
          <li key={t}>
            <button
              type="button"
              className={`genre${themes.includes(t) ? ' is-on' : ''}`}
              aria-pressed={themes.includes(t)}
              onClick={() => toggleTheme(t)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>

      <div className="song-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Never mind
        </button>
        <button
          type="button"
          className="btn btn-primary btn-grow"
          disabled={!ready}
          onClick={() => genreId && onStart(title, genreId, themes, tempo, feel)}
        >
          {ready ? 'Start writing' : title.trim() ? 'Pick a genre' : 'Give it a name'}
        </button>
      </div>
    </div>
  )
}
