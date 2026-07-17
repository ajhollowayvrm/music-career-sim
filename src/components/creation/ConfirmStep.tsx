import { originById } from '../../game/origins.ts'
import { describeLeanings } from '../../game/genres.ts'
import { TALENTS, pips } from '../../game/talents.ts'
import { TRAIT_IDS, describeTrait } from '../../game/traits.ts'
import { billedAs, type Character } from '../../game/character.ts'

interface Props {
  character: Character
}

/**
 * The person, reflected back. This is the payoff of the interview and the whole
 * point of pillar 1 — author yourself, then inhabit that person.
 *
 * Traits appear here as PROSE and nothing else. §2 says the interview has no
 * visible stats and "it stays that way", so there is no score, no bar, and no
 * number: only the quiet lines that a strong trait earns. Most people read back
 * as unremarkable on most axes, and that's correct.
 */
export default function ConfirmStep({ character }: Props) {
  const origin = originById(character.originId)

  const portrait = TRAIT_IDS.map((id) => describeTrait(id, character.traits[id])).filter(
    (line): line is string => line !== null,
  )

  const strongest = [...TALENTS]
    .map((t) => ({ talent: t, value: character.talents[t.id] }))
    .filter((t) => t.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="step">
      <h2 className="step-title">This is you.</h2>

      <div className="portrait">
        <p className="portrait-name">{billedAs(character)}</p>
        {character.stageName.trim() && (
          <p className="portrait-realname">{character.realName}, offstage</p>
        )}
        <p className="portrait-origin">{origin.label}</p>
      </div>

      <section className="confirm-block">
        <h3 className="confirm-title">What you carry</h3>
        <p className="confirm-keepsake">
          <strong>{origin.keepsake.name}</strong> — {origin.keepsake.description}
        </p>
      </section>

      {portrait.length > 0 && (
        <section className="confirm-block">
          <h3 className="confirm-title">What the room will notice</h3>
          <ul className="portrait-lines">
            {portrait.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="confirm-block">
        <h3 className="confirm-title">Your sound</h3>
        <p className="confirm-taste">{describeLeanings(character.leanings)}</p>
      </section>

      <section className="confirm-block">
        <h3 className="confirm-title">What you can do</h3>
        <ul className="confirm-talents">
          {strongest.map(({ talent, value }) => (
            <li key={talent.id}>
              <span>{talent.label}</span>
              <span className="pips">{pips(value)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="confirm-warning">
        Who you are is fixed from here. Your skills will grow and your name can change, but the
        person answering those questions is the person you play. That is the point.
      </p>
    </div>
  )
}
