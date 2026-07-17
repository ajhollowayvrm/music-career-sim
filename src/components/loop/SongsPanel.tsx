import { useState } from 'react'
import type { Character } from '../../game/character.ts'
import { activeSong, released, workbench, type LoopAction, type LoopState } from '../../game/loop.ts'
import { describeRelease } from '../../game/release.ts'
import {
  compositionCeiling,
  describeFit,
  describeProgress,
  genreOf,
  productionCeiling,
  songFit,
  type Song,
} from '../../game/songs.ts'
import NewSongForm from './NewSongForm.tsx'

interface Props {
  state: LoopState
  character: Character
  dispatch: (action: LoopAction) => void
}

/**
 * The catalog — BRIEF §7.
 *
 * Nothing here shows composition or production as a number (pillar 2). What the
 * song is — title, genre, themes — is the player's; how good it is comes back as
 * prose.
 */
export default function SongsPanel({ state, character, dispatch }: Props) {
  const [starting, setStarting] = useState(false)
  const bench = workbench(state)
  const out = released(state)
  const active = activeSong(state)

  if (starting) {
    return (
      <NewSongForm
        character={character}
        onCancel={() => setStarting(false)}
        onStart={(title, genreId, themes) => {
          dispatch({ type: 'startSong', title, genreId, themes })
          setStarting(false)
        }}
      />
    )
  }

  return (
    <div className="songs">
      <div className="board-head">
        <h2 className="step-title">Your songs</h2>
        <p className="step-lede">
          Days you spend making music go into whatever is on the bench. Nothing on the bench means
          nothing to show for the day.
        </p>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={() => setStarting(true)}>
        Start a new song
      </button>

      {bench.length > 0 && (
        <>
          <h3 className="songs-head">On the bench</h3>
          <ul className="song-list">
            {bench.map((song) => (
              <BenchSong
                key={song.id}
                song={song}
                character={character}
                isActive={active?.id === song.id}
                dispatch={dispatch}
              />
            ))}
          </ul>
        </>
      )}

      {out.length > 0 && (
        <>
          <h3 className="songs-head">Out in the world</h3>
          <ul className="song-list">
            {out.map((song) => (
              <li key={song.id} className="song-card is-out">
                <SongIdentity song={song} />
                <p className="song-read">{describeRelease(song)}</p>
                <p className="song-earnings">
                  Earned <strong>£{song.earnings}</strong> since week {song.releasedWeek}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {bench.length === 0 && out.length === 0 && (
        <p className="songs-empty">
          You have not written anything yet. That is what the bedroom is for.
        </p>
      )}
    </div>
  )
}

function SongIdentity({ song }: { song: Song }) {
  return (
    <div className="song-identity">
      <p className="song-title">{song.title}</p>
      <p className="song-meta">
        {genreOf(song).label}
        {song.themes.length > 0 && <span className="song-themes"> · {song.themes.join(', ')}</span>}
      </p>
    </div>
  )
}

interface BenchProps {
  song: Song
  character: Character
  isActive: boolean
  dispatch: (action: LoopAction) => void
}

function BenchSong({ song, character, isActive, dispatch }: BenchProps) {
  const writing = song.phase === 'writing'
  // Progress is judged against THIS character's ceiling — "nothing left to add"
  // means nothing left for them.
  const progress = writing
    ? describeProgress(song.composition, compositionCeiling(character))
    : describeProgress(song.production, productionCeiling(character))
  const sessions = writing ? song.writingSessions : song.recordingSessions

  return (
    <li className={`song-card${isActive ? ' is-active' : ''}`}>
      <SongIdentity song={song} />

      <p className="song-phase">
        {writing ? 'Writing' : 'Recording'}
        {sessions > 0 && (
          <span className="song-sessions">
            {' '}
            · {sessions} {sessions === 1 ? 'session' : 'sessions'}
          </span>
        )}
        {isActive && <span className="song-bench-flag">on the bench</span>}
      </p>

      {sessions > 0 ? (
        <p className="song-read">{progress}</p>
      ) : (
        <p className="song-read">{describeFit(songFit(song, character))}</p>
      )}

      <div className="song-actions">
        {!isActive && (
          <button
            type="button"
            className="song-btn"
            onClick={() => dispatch({ type: 'setActiveSong', songId: song.id })}
          >
            Work on this
          </button>
        )}
        {writing ? (
          <button
            type="button"
            className="song-btn is-go"
            onClick={() => dispatch({ type: 'callItWritten', songId: song.id })}
          >
            Call it written
          </button>
        ) : (
          <button
            type="button"
            className="song-btn is-go"
            onClick={() => dispatch({ type: 'releaseSong', songId: song.id })}
          >
            Put it out
          </button>
        )}
        <button
          type="button"
          className="song-btn is-drop"
          onClick={() => dispatch({ type: 'abandonSong', songId: song.id })}
        >
          Bin it
        </button>
      </div>
    </li>
  )
}
