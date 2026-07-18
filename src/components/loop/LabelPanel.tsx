import {
  LABEL_INTEREST_THRESHOLD,
  describeCommitment,
  describePatience,
  describeRecoup,
  describeRoyalty,
  isFulfilled,
  type LabelOffer,
} from '../../game/label.ts'
import { formatFollowing } from '../../game/fame.ts'
import type { LoopAction, LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * Labels — BRIEF §4. The player signing TO a label (not §17's becoming one).
 *
 * Pillar 2 holds: the advance is money, so it's a figure; the split, the debt,
 * and what you owe are all prose. The whole trap — advance now, £0 royalties
 * until it recoups, records you still owe — is meant to be legible without a
 * single ratio on screen.
 */
export default function LabelPanel({ state, dispatch }: Props) {
  const { label, labelOffer } = state

  return (
    <div className="label-panel">
      <div className="board-head">
        <h2 className="step-title">Labels</h2>
        <p className="step-lede">
          A label is money now and a machine to get you heard — for a cut of everything, a run of
          records you owe, and an advance that hangs over your royalties until it earns itself back.
        </p>
      </div>

      {labelOffer && (
        <OfferCard
          offer={labelOffer}
          canSign={!label || isFulfilled(label)}
          onSign={() => dispatch({ type: 'signLabel' })}
          onDecline={() => dispatch({ type: 'declineLabel' })}
        />
      )}

      {label ? (
        <div className="label-deal">
          <h3 className="songs-head">Signed to {label.labelName}</h3>
          <p className="label-line">Advance taken: <strong>£{label.advance}</strong></p>
          <p className="label-line">{describeRoyalty(label.royaltyRate)}</p>
          <p className="label-line">{describeRecoup(label)}</p>
          <p className="label-line">{describeCommitment(label)}</p>
          {describePatience(label) && <p className="label-warn">{describePatience(label)}</p>}

          {isFulfilled(label) && (
            <button
              type="button"
              className="btn btn-ghost btn-block label-leave"
              onClick={() => dispatch({ type: 'leaveLabel' })}
            >
              Go independent
            </button>
          )}
        </div>
      ) : (
        !labelOffer && <NoDeal following={state.following} />
      )}
    </div>
  )
}

function OfferCard({
  offer,
  canSign,
  onSign,
  onDecline,
}: {
  offer: LabelOffer
  canSign: boolean
  onSign: () => void
  onDecline: () => void
}) {
  return (
    <div className="label-offer">
      <p className="event-eyebrow">An offer on the table</p>
      <h3 className="label-offer-name">{offer.labelName}</h3>
      <p className="label-line">
        An advance of <strong>£{offer.advance}</strong>, in your hand the day you sign.
      </p>
      <p className="label-line">{describeRoyalty(offer.royaltyRate)}</p>
      <p className="label-line">
        In return they want{' '}
        {offer.songsOwed === 1 ? 'one record' : `${offer.songsOwed} records`} out of you.
      </p>
      <p className="label-line label-fine">
        The advance is a loan against your own royalties — you’ll see nothing of your share until it
        earns back. Their machine will get you heard, and signing will cost you a little standing.
      </p>
      <div className="label-offer-actions">
        <button type="button" className="btn btn-ghost btn-grow" onClick={onDecline}>
          Turn it down
        </button>
        <button
          type="button"
          className="btn btn-primary btn-grow"
          disabled={!canSign}
          onClick={onSign}
        >
          Sign it
        </button>
      </div>
      {!canSign && (
        <p className="label-fine">Finish the deal you’re in before you sign another.</p>
      )}
    </div>
  )
}

function NoDeal({ following }: { following: number }) {
  if (following >= LABEL_INTEREST_THRESHOLD) {
    return (
      <p className="label-quiet">
        You’re on the labels’ radar now. An offer could come at the end of any week — keep the reach
        growing and it will.
      </p>
    )
  }
  return (
    <p className="label-quiet">
      No label has come calling. They notice reach, not records — around{' '}
      {formatFollowing(LABEL_INTEREST_THRESHOLD)} following is where they start to look.
    </p>
  )
}
