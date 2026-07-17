// From the Bottom Up — cloud save Lambda (behind a Function URL).
//
// Identity is a RECOVERY CODE, not an account. Every request carries it as
// `Authorization: Bearer <code>`; the save is keyed by sha256(code), so the code
// never leaves the client in stored form and only its holder can read or write
// that save. There is no sign-up and no PII — losing the code means falling back
// to the export file, which is the trade the player was told about up front.
//
//   GET  /                  -> the caller's save { data, savedAt, version }  (404 if none)
//   GET  /?peek=1           -> metadata only { savedAt, version }            (404 if none)
//   GET  /?prev=1           -> the one-deep backup save                      (404 if none)
//   PUT  / { data, savedAt, -> { ok, savedAt }
//            version,           409 if baseSavedAt no longer matches the cloud (CAS fork),
//            baseSavedAt?,      413 if data > 350KB
//            force?, backup?, enc? }
//
// @aws-sdk/client-dynamodb ships with the Node 20 runtime; sha256 is node:crypto.
// No third-party dependencies.
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { createHash } from 'node:crypto'

const ddb = new DynamoDBClient({})
const TABLE = process.env.TABLE_NAME

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

/** The DynamoDB key for a recovery code — the code is never stored, only its hash. */
const keyFor = (code) => `save#${createHash('sha256').update(code).digest('hex')}`

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || 'GET'
  const path = event?.rawPath || event?.requestContext?.http?.path || '/'
  try {
    if (path !== '/') return json(404, { error: 'not found' })

    // Function URL payloads lowercase header names.
    const auth = event?.headers?.authorization || ''
    const code = (auth.startsWith('Bearer ') ? auth.slice(7) : auth).trim()
    // A real code is long and high-entropy; anything short is a bad request, and
    // we never want an empty code to collapse everyone onto one shared row.
    if (code.length < 16) return json(401, { error: 'unauthorized' })
    const id = keyFor(code)

    if (method === 'GET') {
      // ?prev=1: the one-deep backup slot (rotated before forced overwrites).
      const q = event?.queryStringParameters || {}
      const key = q.prev ? `${id}#prev` : id
      const r = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { id: { S: key } } }))
      if (!r.Item) return json(404, { error: 'not found' })
      const meta = {
        savedAt: r.Item.savedAt ? Number(r.Item.savedAt.N) : 0,
        version: r.Item.version ? Number(r.Item.version.N) : null,
      }
      // ?peek=1: metadata only — the client checks "is the cloud ahead?" on every
      // boot without downloading the whole blob just to read a timestamp.
      if (q.peek) return json(200, meta)
      return json(200, { ...meta, data: r.Item.data?.S ?? null, enc: r.Item.enc?.S })
    }

    if (method === 'PUT') {
      let body
      try {
        body = JSON.parse(event?.body || '{}')
      } catch {
        return json(400, { error: 'bad json' })
      }
      const { data, savedAt, version } = body
      if (typeof data !== 'string' || !data) return json(400, { error: 'missing data' })
      // DynamoDB items cap at 400KB. Reject early with a nameable status instead of
      // a ValidationException 500. A run's save is a few KB, so this is a backstop.
      if (data.length > 350_000) return json(413, { error: 'too large' })
      const enc = body.enc === 'gz' ? 'gz' : null // client gzips; stored opaquely
      const ts = Number(savedAt) || Date.now()
      const base = Number(body.baseSavedAt) > 0 ? Number(body.baseSavedAt) : null
      const force = body.force === true

      // Snapshot the current save to the one-deep #prev slot before any overwrite
      // that could destroy history — a forced push (conflict "keep this device") or
      // a push the client marks `backup`. One extra item, far inside the free tier,
      // and it makes a catastrophic overwrite undoable.
      if (force || body.backup === true) {
        const cur = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { id: { S: id } } }))
        if (cur.Item) {
          await ddb.send(
            new PutItemCommand({
              TableName: TABLE,
              Item: { ...cur.Item, id: { S: `${id}#prev` }, backedUpAt: { N: String(Date.now()) } },
            }),
          )
        }
      }

      try {
        await ddb.send(
          new PutItemCommand({
            TableName: TABLE,
            Item: {
              id: { S: id },
              data: { S: data },
              ...(enc ? { enc: { S: enc } } : {}),
              savedAt: { N: String(ts) },
              version: { N: String(Number(version) || 0) },
              updatedAt: { N: String(Date.now()) },
            },
            // force: deliberate overwrite (the #prev snapshot above already ran).
            // baseSavedAt: compare-and-swap — only overwrite the exact revision the
            //   client last synced against, so any fork (second device, clock skew)
            //   is an honest 409 instead of newest-wins silently eating a session.
            // neither (first save): only create if nothing's there.
            ...(force
              ? {}
              : base !== null
                ? {
                    ConditionExpression: 'attribute_not_exists(id) OR savedAt = :base',
                    ExpressionAttributeValues: { ':base': { N: String(base) } },
                  }
                : {
                    ConditionExpression: 'attribute_not_exists(id) OR savedAt <= :ts',
                    ExpressionAttributeValues: { ':ts': { N: String(ts) } },
                  }),
          }),
        )
      } catch (e) {
        if (e?.name === 'ConditionalCheckFailedException') {
          const cur = await ddb.send(new GetItemCommand({ TableName: TABLE, Key: { id: { S: id } } }))
          return json(409, { error: 'stale', savedAt: cur.Item?.savedAt ? Number(cur.Item.savedAt.N) : 0 })
        }
        throw e
      }
      return json(200, { ok: true, savedAt: ts })
    }

    return json(405, { error: 'method not allowed' })
  } catch (e) {
    return json(500, { error: String(e?.message || e) })
  }
}
