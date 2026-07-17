import type { LoopAction, LoopState } from '../../game/loop.ts'
import { released } from '../../game/loop.ts'
import {
  buyBackPriceOf,
  costOfLosing,
  pawnPriceOf,
  weeksToReclaim,
  type Item,
} from '../../game/items.ts'
import { GEAR_CATALOG, describeSignature, isSignature } from '../../game/gear.ts'

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
  const releasedCount = released(state).length
  // §10: don't offer a piece you already own — the lift doesn't stack twice.
  const ownedNames = new Set(state.inventory.map((i) => i.name))

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
            <OwnedItem
              key={item.id}
              item={item}
              signature={isSignature(item, state.week, releasedCount)}
              dispatch={dispatch}
            />
          ))}
        </ul>
      )}

      {/* §10: the gear shop. Recording is where gear is the big lever, so this is
          an investment in the quality of what you cut — never in Cred. */}
      <section className="items-section">
        <h3 className="items-heading">The shop</h3>
        <p className="items-subhead">
          Gear is the lever on your recordings, and nowhere else — a show is the player, not the
          rig. It buys quality, never respect.
        </p>
        <ul className="items">
          {GEAR_CATALOG.map((gear) => {
            const have = ownedNames.has(gear.name)
            const afford = state.money >= gear.price
            return (
              <li key={gear.catalogId} className={`item is-shop${have ? ' is-owned' : ''}`}>
                <p className="item-name">{gear.name}</p>
                <p className="item-desc">{gear.description}</p>
                <button
                  type="button"
                  className="song-btn is-buy"
                  disabled={have || !afford}
                  onClick={() => dispatch({ type: 'buyGear', catalogId: gear.catalogId })}
                >
                  {have ? 'Owned' : afford ? `Buy · £${gear.price}` : `£${gear.price} (short)`}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

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
function OwnedItem({
  item,
  signature,
  dispatch,
}: {
  item: Item
  signature: boolean
  dispatch: (action: LoopAction) => void
}) {
  const warning = costOfLosing(item)
  return (
    <li className={`item${item.giftedBy !== null ? ' is-gift' : ''}${signature ? ' is-signature' : ''}`}>
      <p className="item-name">
        {item.name}
        {signature && <span className="item-tag is-signature">your sound</span>}
        {item.functional && <span className="item-tag">you use this</span>}
        {item.giftedBy !== null && <span className="item-tag is-gift">a gift</span>}
      </p>
      <p className="item-desc">{item.description}</p>
      {signature && <p className="item-signature">{describeSignature(item)}</p>}
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
