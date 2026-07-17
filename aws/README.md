# Cloud save (AWS)

The run saves locally (localStorage) as always; this backend adds an optional
**cloud copy** so a career survives a browser wiping its storage and follows you to
another device — without accounts. Identity is a **recovery code**: the client holds a
high-entropy code, sends it as a bearer token, and the save is keyed by `sha256(code)`.
The backend never stores the code, only its hash, so only its holder can touch the save.
There is no sign-up and no PII. Lose the code and you fall back to the export file.

```
GitHub Pages PWA ──HTTPS──> Lambda Function URL   (Authorization: Bearer <recovery code>)
                                └── GET/PUT /      DynamoDB music-career-sim-saves
                                                   (id = save#<sha256(code)>, …)
```

`GET /?peek=1` returns save metadata only (`savedAt`, `version`) so a boot check doesn't
download the blob; `PUT` takes `baseSavedAt` for a compare-and-swap (a second device
forks to an honest `409` instead of clobbering), and `enc:'gz'` — the client gzips the
save and the Lambda stores the bytes opaquely. A one-deep `#prev` slot is snapshotted
before any forced overwrite, so a bad "keep this device" is undoable.

Everything is sized for the **always-free** AWS tier:

- **Lambda + Function URL** — 1M requests/month always free; no API Gateway (its free
  tier expires after 12 months).
- **DynamoDB provisioned 5 RCU / 5 WCU** — within the always-free 25/25; on-demand would
  bill per request from the first one.

## Deploy (one time)

Prereqs: AWS CLI configured (`aws configure`) + the AWS SAM CLI.

```bash
cd aws
sam build
sam deploy --stack-name music-career-sim-save --resolve-s3 --capabilities CAPABILITY_IAM \
  --region us-west-2 --no-confirm-changeset
```

The **Outputs** section prints the `FunctionUrl`.

## Wire it to the app

Put the `FunctionUrl` output in **`src/game/syncConfig.ts`** (it's a public identifier —
safe to commit; useless without a player's recovery code):

```ts
export const SYNC_URL = 'https://….lambda-url.us-west-2.on.aws/'
```

Leave `SYNC_URL` blank to disable cloud sync entirely — the game still saves locally.
Commit + push; GitHub Pages rebuilds and cloud save goes live on the title screen.
