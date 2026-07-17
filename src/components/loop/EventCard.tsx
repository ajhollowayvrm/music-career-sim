import type { ActiveEvent } from '../../game/events.ts'

interface Props {
  event: ActiveEvent
  onChoose: (choiceId: string) => void
}

/**
 * An event, mid-week — BRIEF §16. It takes over the day's turn: no advancing
 * until it's answered, the same way a gig owns its night. The chain beats (a
 * crutch, the bottom, the return) come through here too, and the writing is
 * doing the work §16 asks — recovery has to read as the strong choice, so the
 * card never editorialises the options; it lays them out and lets the player
 * decide who they are.
 */
export default function EventCard({ event, onChoose }: Props) {
  return (
    <div className="event-card" role="group" aria-label={event.title}>
      <p className="event-eyebrow">Something came up</p>
      <h3 className="event-title">{event.title}</h3>
      <p className="event-text">{event.text}</p>
      <div className="event-choices">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="btn btn-primary btn-grow"
            onClick={() => onChoose(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}
