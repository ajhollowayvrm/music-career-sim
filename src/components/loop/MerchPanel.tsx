import { useState } from 'react'
import type { Character } from '../../game/character.ts'
import { released, type LoopAction, type LoopState } from '../../game/loop.ts'
import { venueById } from '../../game/venues.ts'
import {
  MERCH_PRODUCTS,
  MIN_ORDER,
  describeDrop,
  maxOrder,
  orderCost,
  productById,
  type Scarcity,
} from '../../game/merch.ts'

interface Props {
  state: LoopState
  character: Character
  dispatch: (action: LoopAction) => void
}

/**
 * Merch — BRIEF §13. The whole panel is arranged around the three tensions: the
 * order size is the cash gamble, the price is the Cred-vs-cash call (with the
 * scene's reaction said out loud before you commit), and the name and product
 * are the brand. You can only make it against a record or a tour.
 */
export default function MerchPanel({ state, character, dispatch }: Props) {
  const out = released(state)
  const booking = state.booking
  const canTie = out.length > 0 || booking !== null

  const live = state.merch.filter((d) => !d.closed)
  const done = state.merch.filter((d) => d.closed)

  return (
    <div className="merch">
      <div className="board-head">
        <h2 className="step-title">Merch</h2>
        <p className="step-lede">
          You front the money and eat what doesn&apos;t sell. A gig is where it moves — a room that
          came for you.
        </p>
      </div>

      {!canTie && (
        <p className="board-warn">
          Nothing to hang it on yet. Put a song out or book a room first — merch rides on a record or
          a tour.
        </p>
      )}

      {live.length > 0 && (
        <ul className="drops">
          {live.map((d) => (
            <li key={d.id} className="drop">
              <p className="drop-name">
                {d.name}
                {d.scarcity === 'limited' && <span className="item-tag">limited</span>}
              </p>
              <p className="drop-facts">
                {productById(d.productId).label} · £{d.price} · {d.sold}/{d.quantity} sold
              </p>
              <p className="drop-status">{describeDrop(d)}</p>
            </li>
          ))}
        </ul>
      )}

      {canTie && <MerchForm state={state} character={character} dispatch={dispatch} />}

      {done.length > 0 && (
        <section className="items-section">
          <h3 className="items-heading">Past runs</h3>
          <ul className="drops">
            {done.map((d) => (
              <li key={d.id} className="drop is-closed">
                <p className="drop-name">{d.name}</p>
                <p className="drop-facts">
                  {d.sold}/{d.quantity} sold
                </p>
                <p className="drop-status">{describeDrop(d)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** The design surface: product, brand, the order gamble, and the pricing call. */
function MerchForm({ state, character, dispatch }: Props) {
  const out = released(state)
  const tieOptions = [
    ...out.map((s) => s.title),
    ...(state.booking ? [`the ${venueById(state.booking.venueId).name} show`] : []),
  ]

  const [productId, setProductId] = useState(MERCH_PRODUCTS[0]!.id)
  const [name, setName] = useState('')
  const [tiedTo, setTiedTo] = useState(tieOptions[0] ?? '')
  const [scarcity, setScarcity] = useState<Scarcity>('open')
  const product = productById(productId)
  const [quantity, setQuantity] = useState(50)
  const [price, setPrice] = useState(product.fairPrice)

  const cap = maxOrder(scarcity)
  const clampedQty = Math.max(MIN_ORDER, Math.min(cap, Math.round(quantity) || MIN_ORDER))
  const cost = orderCost(product, clampedQty)
  const afford = state.money >= cost
  const priceRatio = price / product.fairPrice

  const pricingRead =
    scarcity === 'limited'
      ? 'A limited run — fans expect it to cost, and they want it more for being scarce.'
      : priceRatio > 1.4
        ? 'The scene will call this a gouge. It will cost you a little standing every week it sells.'
        : priceRatio < 0.85
          ? 'Priced like a gift. It will fly, and nobody will hold it against you.'
          : 'A fair price. It moves without anyone raising an eyebrow.'

  const onProduct = (id: string) => {
    setProductId(id)
    // Reset the price to the new product's fair mark so the read makes sense.
    setPrice(productById(id).fairPrice)
  }

  return (
    <div className="song-form">
      <h3 className="song-form-title">Make a drop</h3>

      <p className="field-label">What</p>
      <ul className="genres">
        {MERCH_PRODUCTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`genre${productId === p.id ? ' is-on' : ''}`}
              aria-pressed={productId === p.id}
              onClick={() => onProduct(p.id)}
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="drop-blurb">{product.blurb}</p>

      <label className="field">
        <span className="field-label">Call it</span>
        <input
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={product.label}
          autoCapitalize="words"
          maxLength={40}
        />
      </label>

      <label className="field">
        <span className="field-label">Tied to</span>
        <select className="input" value={tiedTo} onChange={(e) => setTiedTo(e.target.value)}>
          {tieOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <p className="field-label">How you sell it</p>
      <div className="merch-toggle">
        <button
          type="button"
          className={`genre${scarcity === 'open' ? ' is-on' : ''}`}
          onClick={() => setScarcity('open')}
        >
          Open run
        </button>
        <button
          type="button"
          className={`genre${scarcity === 'limited' ? ' is-on' : ''}`}
          onClick={() => {
            setScarcity('limited')
            setQuantity((q) => Math.min(q, maxOrder('limited')))
          }}
        >
          Limited
        </button>
      </div>

      <label className="field">
        <span className="field-label">
          How many <span className="field-optional">you front £{product.unitCost} each</span>
        </span>
        <input
          className="input"
          type="number"
          value={quantity}
          min={MIN_ORDER}
          max={cap}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>

      <label className="field">
        <span className="field-label">
          Price <span className="field-optional">fair is £{product.fairPrice}</span>
        </span>
        <input
          className="input"
          type="number"
          value={price}
          min={1}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </label>
      <p className="leaning-read">{pricingRead}</p>

      <div className="song-form-actions">
        <button
          type="button"
          className="btn btn-primary btn-grow"
          disabled={!afford || !tiedTo}
          onClick={() =>
            dispatch({
              type: 'makeMerch',
              name,
              productId,
              tiedTo,
              quantity: clampedQty,
              price: Math.max(1, Math.round(price)),
              scarcity,
              character,
            })
          }
        >
          {afford ? `Order ${clampedQty} · £${cost}` : `£${cost} — you can't front that`}
        </button>
      </div>
    </div>
  )
}
