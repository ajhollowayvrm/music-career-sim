import type { LoopAction, LoopState } from '../../game/loop.ts'
import {
  buyBackPriceOf,
  costOfLosing,
  pawnPriceOf,
  weeksToReclaim,
  type Item,
} from '../../game/items.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * The safety net — BRIEF §11.
 *
 * "The inventory is the safety net you hollow out when the music isn't paying."
 * The whole panel is arranged as the liquidation ladder: the painless things
 * sit at the top and the things that cost you sit below, so descending it feels
 * like descending it. Nothing is hidden and nothing is blocked — §11's death
 * spiral is a decision you're allowed to make, warned but not stopped.
 */
export default function ItemsPanel({ state, dispatch }: Props) {
  // The ladder: least painful to lose first. Attachment is the sort, so the
  // console goes above the guitar goes above the keepsake.
  const owned = state.inventory
    .filter((i) => i.status.kind === 'owned')
    .slice()
    .sort((a, b) => a.attachment - b.attachment)
  const pawned = state.inventory.filter((i) => i.status.kind === 'pawned')

  return (
    <div className="things">
      <div className="board-head">
        <h2 className="step-title">Things</h2>
        <p className="step-lede">
          What you own is what stands between a bad month and the street. Sell the painless things
          first — you'll know when you're reaching too far down.
        </p>
      </div>

      {state.pawnForfeited.length > 0 && (
        <p className="board-warn">
          The pawnbroker's window closed on{' '}
          <strong>{state.pawnForfeited.join(', ')}</strong>. It's his now — buying it back costs
          full price and then some.
        </p>
      )}

      {owned.length === 0 && pawned.length === 0 && state.formerItems.length === 0 && (
        <p className="things-empty">You own nothing anyone would pay for. There's no floor left.</p>
      )}

      {owned.length > 0 && (
        <ul className="items">
          {owned.map((item) => (
            <OwnedItem key={item.id} item={item} dispatch={dispatch} />
          ))}
        </ul>
      )}

      {pawned.length > 0 && (
        <section className="items-section">
          <h3 className="items-heading">At the pawnbroker</h3>
          <ul className="items">
            {pawned.map((item) => {
              const weeks = weeksToReclaim(item, state.week)
              const price = item.status.kind === 'pawned' ? item.status.pawnPrice : 0
              const afford = state.money >= price
              return (
                <li key={item.id} className="item is-pawned">
                  <p className="item-name">{item.name}</p>
                  <p className={`item-reclaim${weeks <= 1 ? ' is-urgent' : ''}`}>
                    {weeks === 0
                      ? 'Last chance — reclaim it now or it goes for good.'
                      : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} left to reclaim.`}
                  </p>
                  <button
                    type="button"
                    className="song-btn"
                    disabled={!afford}
                    onClick={() => dispatch({ type: 'reclaimItem', itemId: item.id })}
                  >
                    {afford ? `Reclaim · £${price}` : `Reclaim · £${price} (short)`}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {state.formerItems.length > 0 && (
        <section className="items-section">
          <h3 className="items-heading">Gone</h3>
          <p className="items-subhead">Sold or forfeited. You can buy it back, at a price.</p>
          <ul className="items">
            {state.formerItems.map((item) => {
              const price = buyBackPriceOf(item)
              const afford = state.money >= price
              return (
                <li key={item.id} className="item is-gone">
                  <p className="item-name">{item.name}</p>
                  <button
                    type="button"
                    className="song-btn"
                    disabled={!afford}
                    onClick={() => dispatch({ type: 'buyBackItem', itemId: item.id })}
                  >
                    {afford ? `Buy back · £${price}` : `Buy back · £${price} (short)`}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

/** A single thing you still own: sell it outright, or pawn it and keep the rope. */
function OwnedItem({ item, dispatch }: { item: Item; dispatch: (action: LoopAction) => void }) {
  const warning = costOfLosing(item)
  return (
    <li className={`item${item.giftedBy !== null ? ' is-gift' : ''}`}>
      <p className="item-name">
        {item.name}
        {item.functional && <span className="item-tag">you use this</span>}
        {item.giftedBy !== null && <span className="item-tag is-gift">a gift</span>}
      </p>
      <p className="item-desc">{item.description}</p>
      {warning && <p className="item-warn">{warning}</p>}
      <div className="item-actions">
        <button type="button" className="song-btn" onClick={() => dispatch({ type: 'pawnItem', itemId: item.id })}>
          Pawn · £{pawnPriceOf(item)}
        </button>
        <button
          type="button"
          className="song-btn is-drop"
          onClick={() => dispatch({ type: 'sellItem', itemId: item.id })}
        >
          Sell · £{item.value}
        </button>
      </div>
    </li>
  )
}
