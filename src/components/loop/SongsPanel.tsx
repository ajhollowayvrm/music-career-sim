import { useState } from 'react'
import type { Character } from '../../game/character.ts'
import { gearRecordingBonus, ownsRecordingGear } from '../../game/gear.ts'
import { activeSong, released, workbench, type LoopAction, type LoopState } from '../../game/loop.ts'
import { describeRelease } from '../../game/release.ts'
import {
  canBundle,
  EP_MIN,
  PROJECT_MAX,
  kindForCount,
  projectKindLabel,
} from '../../game/project.ts'
import {
  compositionCeiling,
  describeChannel,
  describeFeel,
  describeFit,
  describeProgress,
  describeTempo,
  genreOf,
  productionCeiling,
  songFit,
  type ReleaseChannel,
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
  const [releasingId, setReleasingId] = useState<number | null>(null)
  const [buildingProject, setBuildingProject] = useState(false)
  const bench = workbench(state)
  const out = released(state)
  const active = activeSong(state)
  const gearBonus = gearRecordingBonus(state.inventory)
  const ownsGear = ownsRecordingGear(state.inventory)
  // Anything recorded — on the bench and unreleased, or already out as a single —
  // can be compiled into an EP or album (§7).
  const bundleable = state.songs.filter(canBundle)

  if (buildingProject) {
    return (
      <ProjectForm
        songs={bundleable}
        signed={state.label !== null}
        onCancel={() => setBuildingProject(false)}
        onRelease={(title, songIds, channel) => {
          dispatch({ type: 'releaseProject', title, songIds, channel })
          setBuildingProject(false)
        }}
      />
    )
  }

  if (starting) {
    return (
      <NewSongForm
        character={character}
        onCancel={() => setStarting(false)}
        onStart={(title, genreId, themes, tempo, feel) => {
          dispatch({ type: 'startSong', title, genreId, themes, tempo, feel })
          setStarting(false)
        }}
      />
    )
  }

  const releasingSong = releasingId !== null ? bench.find((s) => s.id === releasingId) : undefined
  if (releasingSong) {
    return (
      <ReleaseForm
        song={releasingSong}
        signed={state.label !== null}
        onCancel={() => setReleasingId(null)}
        onRelease={(channel) => {
          dispatch({ type: 'releaseSong', songId: releasingSong.id, channel })
          setReleasingId(null)
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

      {/* §7: once you've made a few, put them out together as a body of work. */}
      {bundleable.length >= EP_MIN && (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setBuildingProject(true)}
        >
          Put out an EP or album
        </button>
      )}

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
                gearBonus={gearBonus}
                ownsGear={ownsGear}
                onRelease={setReleasingId}
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
            {out.map((song) => {
              const project =
                song.projectId !== null
                  ? state.projects.find((p) => p.id === song.projectId)
                  : undefined
              return (
                <li key={song.id} className="song-card is-out">
                  <SongIdentity song={song} />
                  {project && (
                    <p className="song-project">
                      {projectKindLabel(project.kind)}: <em>{project.title}</em>
                    </p>
                  )}
                  <p className="song-read">{describeRelease(song)}</p>
                  <p className="song-earnings">
                    {describeChannel(song.channel)} · earned <strong>£{song.earnings}</strong> since
                    week {song.releasedWeek}
                  </p>
                </li>
              )
            })}
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
        <span className="song-soul">
          {' '}
          · {describeTempo(song.tempo)}, {describeFeel(song.feel)}
        </span>
        {song.themes.length > 0 && <span className="song-themes"> · {song.themes.join(', ')}</span>}
      </p>
    </div>
  )
}

interface BenchProps {
  song: Song
  character: Character
  isActive: boolean
  gearBonus: number
  ownsGear: boolean
  onRelease: (songId: number) => void
  dispatch: (action: LoopAction) => void
}

function BenchSong({ song, character, isActive, gearBonus, ownsGear, onRelease, dispatch }: BenchProps) {
  const writing = song.phase === 'writing'
  // Progress is judged against THIS character's ceiling — "nothing left to add"
  // means nothing left for them. Recording also reads the gear you own (§10): no
  // rig, and the ceiling is a demo whatever your talent.
  const progress = writing
    ? describeProgress(song.composition, compositionCeiling(character))
    : describeProgress(song.production, productionCeiling(character, gearBonus, ownsGear))
  const sessions = writing ? song.writingSessions : song.recordingSessions
  const laptopLid = !writing && !ownsGear

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

      {laptopLid && (
        <p className="song-warn">
          You are recording into a laptop. It will sound like it — a mic and an interface from the
          shop are the difference between a demo and a record.
        </p>
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
          <button type="button" className="song-btn is-go" onClick={() => onRelease(song.id)}>
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

/* -------------------------------------------------------------------------- */
/* Putting it out — the channel choice (§4/§7)                                */
/* -------------------------------------------------------------------------- */

interface ReleaseProps {
  song: Song
  /** Signed acts release through the label (Phase E). */
  signed: boolean
  onRelease: (channel: ReleaseChannel) => void
  onCancel: () => void
}

function ReleaseForm({ song, signed, onRelease, onCancel }: ReleaseProps) {
  return (
    <div className="song-form">
      <h3 className="song-form-title">Putting out “{song.title}”</h3>
      <p className="step-lede">
        How it goes out decides who hears it — and what it costs you. This can’t be undone.
      </p>

      {signed && (
        <p className="leaning-read">
          Your label handles the release now. Their machine gets it heard; their cut comes out of
          what it earns.
        </p>
      )}

      <div className="release-choices">
        <button type="button" className="release-choice" onClick={() => onRelease('streaming')}>
          <span className="release-choice-name">Put it up yourself</span>
          <span className="release-choice-desc">
            Streaming, quietly. It finds people slowly and it stays yours — the scene still counts
            it. Costs you nothing but the wait.
          </span>
        </button>
        <button type="button" className="release-choice" onClick={() => onRelease('creator')}>
          <span className="release-choice-name">Push it on the feeds</span>
          <span className="release-choice-desc">
            YouTube, TikTok, all of it. Far more people, far faster, and a better shot at catching —
            but making the content costs money, and the scene rates it less.
          </span>
        </button>
      </div>

      <div className="song-form-actions">
        <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>
          Not yet
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Putting out a body of work — the EP/album builder (§7)                     */
/* -------------------------------------------------------------------------- */

interface ProjectProps {
  /** Everything you could put on a record: unreleased songs and singles already out. */
  songs: readonly Song[]
  signed: boolean
  onRelease: (title: string, songIds: readonly number[], channel: ReleaseChannel) => void
  onCancel: () => void
}

function ProjectForm({ songs, signed, onRelease, onCancel }: ProjectProps) {
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<readonly number[]>([])

  const toggle = (id: number) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= PROJECT_MAX ? p : [...p, id],
    )

  const kind = kindForCount(picked.length)
  const bench = songs.filter((s) => s.phase !== 'released')
  const out = songs.filter((s) => s.phase === 'released')

  return (
    <div className="song-form">
      <h3 className="song-form-title">Put out a record</h3>
      <p className="step-lede">
        Collect your songs into an EP or an album and drop them together. A body of work reaches
        further than the same songs dribbled out one by one — and it earns you the kind of standing a
        single never will.
      </p>

      <label className="field">
        <span className="field-label">What's it called?</span>
        <input
          className="input"
          value={title}
          maxLength={40}
          placeholder={kind === 'album' ? 'Your album' : 'Your EP'}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <p className="project-count">
        {picked.length < EP_MIN
          ? `Pick at least ${EP_MIN}. Two to five is an EP; six or more is an album.`
          : `${picked.length} songs — ${kind ? projectKindLabel(kind) : ''}.`}
      </p>

      {bench.length > 0 && (
        <>
          <h4 className="songs-head">Unreleased — these go out for the first time</h4>
          <ul className="project-pick-list">
            {bench.map((s) => (
              <ProjectPick key={s.id} song={s} on={picked.includes(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </ul>
        </>
      )}

      {out.length > 0 && (
        <>
          <h4 className="songs-head">Already out — putting these on it is a reissue</h4>
          <ul className="project-pick-list">
            {out.map((s) => (
              <ProjectPick key={s.id} song={s} on={picked.includes(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </ul>
        </>
      )}

      {signed ? (
        <>
          <p className="leaning-read">
            Your label puts the record out. Their machine gets it heard; their cut comes out of what
            it earns.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!kind}
            onClick={() => onRelease(title, picked, 'streaming')}
          >
            {kind ? `Release the ${projectKindLabel(kind).toLowerCase()}` : 'Pick more songs'}
          </button>
        </>
      ) : (
        <div className="release-choices">
          <button
            type="button"
            className="release-choice"
            disabled={!kind}
            onClick={() => onRelease(title, picked, 'streaming')}
          >
            <span className="release-choice-name">Put it out yourself</span>
            <span className="release-choice-desc">
              Streaming. It finds people over time and it stays yours — the scene counts it.
            </span>
          </button>
          <button
            type="button"
            className="release-choice"
            disabled={!kind}
            onClick={() => onRelease(title, picked, 'creator')}
          >
            <span className="release-choice-name">Push it on the feeds</span>
            <span className="release-choice-desc">
              Far more people, far faster — but the campaign costs money, and the scene rates it less.
            </span>
          </button>
        </div>
      )}

      <div className="song-form-actions">
        <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>
          Not yet
        </button>
      </div>
    </div>
  )
}

function ProjectPick({ song, on, onToggle }: { song: Song; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={`project-pick${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={onToggle}
      >
        <span className="project-pick-check" aria-hidden="true">
          {on ? '✓' : ''}
        </span>
        <span className="project-pick-body">
          <span className="project-pick-title">{song.title}</span>
          <span className="project-pick-meta">
            {genreOf(song).label} · {describeTempo(song.tempo)}, {describeFeel(song.feel)}
          </span>
        </span>
      </button>
    </li>
  )
}
