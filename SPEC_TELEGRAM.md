# Spec: Agent over Telegram (the agent lives outside the browser)

## Goal

Let users talk to the same agent from a Telegram chat. Inbound message → agent runs with their Composio tools and shared memory → reply delivered as a Telegram message. **One Telegram bot serves all users of the app.** Users link their personal Telegram chat to their web account in one click, after which Telegram and the web app share the same identity, the same Composio connections, and the same memory.

## TLDR — one bot for the whole app

```
              ─── ONCE, BY YOU (the developer) ───
              │                                  │
              ▼                                  ▼
        BotFather /newbot              Vercel env vars
        → @your_app_bot                TELEGRAM_BOT_TOKEN=xxx
                                       TELEGRAM_BOT_USERNAME=your_app_bot
                                       TELEGRAM_WEBHOOK_SECRET=yyy

              ─── PER USER, FOREVER ───
              │
              ▼
        Web app → /admin/telegram → "Link Telegram"
        Sends /start <code> to @your_app_bot
        Done. ~10 seconds.
```

Users never see BotFather. They don't paste tokens. They just click a button.

## Use cases (demo script)

### 1. First-time link

User logs into web app, visits `/admin/telegram`, clicks **Link Telegram** → page shows `/start ABC12345` and a link to `t.me/your_app_bot` → user clicks, Telegram opens with the command prefilled, sends it → bot replies "Linked!" and the web page flips to ✓ Linked.

### 2. Cross-channel identity

User in Telegram: *"fetch my latest emails"* — uses the **same Gmail connection** they previously authorized in the web app. No second OAuth.

### 3. Cross-channel memory

User in web chat: *"remember I prefer concise replies."* (memory tool fires, fact stored under `containerTags: [user.id]`)

User later in Telegram: *"what do you know about how I like replies?"* → agent searches memory with the same `user.id` container → finds the fact → replies concisely.

## In scope

1. **Telegram bot** registered via [@BotFather](https://t.me/BotFather) **once** by the developer, token + username in env vars.
2. **Webhook handler** at `/api/telegram-webhook` — validates `x-telegram-bot-api-secret-token`, parses `update.message`, special-cases `/start <token>` for linking, dispatches the agent in `after()` for regular messages, returns `{ok:true}` immediately.
3. **`lib/telegram.ts`** — thin Bot API client: `sendTelegramMessage`, `getWebhookInfo`, `setWebhook`, `deleteWebhook`, `getBotInfo`.
4. **`/telegram` admin page** — bot info, webhook registration UI (for ngrok rotation during dev).
5. **`/admin/telegram` settings page** — per-user link/unlink UI for end users. This is what your customers see. Generates one-time link tokens, polls until linked.
6. **Account linking schema** — three columns on `User`:
   - `telegramChatId` (unique) — populated when linked
   - `telegramLinkToken` (unique) — short-lived pairing code
   - `telegramLinkTokenExpiresAt` — 10 min TTL
7. **Cross-channel identity** — both web chat and Telegram webhook resolve to the same `user.id` and pass it to:
   - `composio.create(user.id)` — same connections everywhere
   - `supermemoryTools(KEY, { containerTags: [user.id] })` — same memory everywhere
8. **Background execution via `after()`** — webhook returns 200 in <100ms; agent runs up to `maxDuration` seconds.

## Explicitly NOT in scope (v1)

- **Account linking between Telegram and the web app.** A user logged in to the web app (`User.id` in Postgres) is *not* the same identity as their Telegram chat. Per-app, per-channel Composio accounts. See "Multi-tenant / B2B section" below.
- **Group chats.** Webhook handler explicitly filters `chat.type === "private"`. Anything else is dropped.
- **File attachments / voice / images.** Only `message.text` is read.
- **Streaming responses.** We use `generateText` (one-shot) because Telegram doesn't have a "typing partial token" UX. Each agent turn is a single Telegram message.
- **Session memory across messages.** Each inbound message is a fresh agent turn — no message history. Pair with Supermemory if you want persistence (homework).
- **Chat history into the web app sidebar.** Telegram messages don't persist into the `Chat` / `Message_v2` tables.

## ⚠️ Local dev caveats (read before testing)

Anyone working on this codebase will hit these.

### 1. Telegram requires HTTPS for webhooks

The webhook URL must be public HTTPS — Telegram won't deliver to `localhost`. Two options for local dev:

- **ngrok** (used during this build): `ngrok http 3000` gives you `https://<random>.ngrok-free.app` → use that as the webhook URL.
- **Deployed preview**: every Vercel preview deploy gets a stable HTTPS URL; use that.

### 2. ngrok URLs change on every restart (free tier)

Each `ngrok http 3000` produces a new subdomain. After restarting ngrok, the registered webhook is dead and Telegram silently drops messages. Symptoms: no errors, just nothing happens.

**Fix**: re-register via the `/telegram` page or with curl:

```bash
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env.local | cut -d= -f2-)
SECRET=$(grep '^TELEGRAM_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
NEW_URL="https://<your-ngrok-host>/api/telegram-webhook"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${NEW_URL}\",\"secret_token\":\"${SECRET}\",\"allowed_updates\":[\"message\"]}"

# Verify
curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | python3 -m json.tool
```

### 3. Env vars require a dev server restart

Adding `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` to `.env.local` after `pnpm dev` is already running won't pick them up. Restart the dev server.

Symptom: webhook returns `503 {"error":"Telegram not configured"}`.

### 4. Webhook auth bypass is not optional

Anyone who guesses your webhook URL can POST malformed updates. Always set `TELEGRAM_WEBHOOK_SECRET` (any random string), and the handler's `timingSafeEqual` check rejects anything else. Telegram automatically includes the secret in the `x-telegram-bot-api-secret-token` header for every delivery if you registered with `secret_token`.

### 5. Test workflow (local)

```bash
# 1. Start ngrok
ngrok http 3000

# 2. Visit http://localhost:3000/telegram → "Register webhook"
#    (uses the ngrok URL automatically)

# 3. On your phone, open Telegram, search @<your_bot_username>, send any message.

# 4. Watch the dev terminal — should see:
#    POST /api/telegram-webhook 200 in <ms>

# 5. Agent reply should arrive in Telegram within 5–30s.
```

To simulate an inbound message without using Telegram (useful for CI / debugging):

```bash
SECRET=$(grep '^TELEGRAM_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
curl -X POST http://localhost:3000/api/telegram-webhook \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: ${SECRET}" \
  -d '{
    "update_id": 1,
    "message": {
      "message_id": 1,
      "date": '$(date +%s)',
      "chat": {"id": 123456789, "type": "private"},
      "from": {"id": 123456789, "first_name": "Test"},
      "text": "fetch my latest emails"
    }
  }'
```

(Reply will fail to deliver because chat_id is fake — that's expected; it proves the handler runs.)

### 6. Production verification

After deploy:

1. Re-register the webhook to point at the Vercel URL (one-time):
   ```bash
   curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-app.vercel.app/api/telegram-webhook","secret_token":"<secret>","allowed_updates":["message"]}'
   ```
2. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `COMPOSIO_API_KEY`, `AI_GATEWAY_API_KEY` (or OIDC) must be set in Vercel env vars.
3. Send a test message to the bot. Watch Vercel function logs for `POST /api/telegram-webhook`.

## Architecture

### Linking flow (one-time, per user)

```
Web app                                       Telegram
─────────                                     ────────

 ┌─ /admin/telegram ─────────────────────┐
 │ User clicks [Link Telegram]           │
 │  │                                    │
 │  ▼                                    │
 │ POST /api/telegram/link               │
 │  - generates 8-char token             │
 │  - UPDATE User SET                    │
 │      telegramLinkToken = "ABC12345",  │
 │      telegramLinkTokenExpiresAt =     │
 │      now() + 10min                    │
 │  - returns { token, botUsername }     │
 │  │                                    │
 │  ▼                                    │
 │ UI shows:                             │
 │   "Send /start ABC12345 to            │
 │    @your_app_bot"                     │
 │   [t.me/your_app_bot link]            │
 │                                       │
 │ Page polls /api/telegram/status       │
 │ every 3s                              │
 └───────────────────────────────────────┘
                                            ┌─ User taps t.me link ──────┐
                                            │ Opens Telegram app         │
                                            │ Sends: /start ABC12345     │
                                            │  │                         │
                                            │  ▼                         │
                                            │ Webhook receives,          │
                                            │ matches "/start <token>":  │
                                            │                            │
                                            │ UPDATE User SET            │
                                            │   telegramChatId = chat.id,│
                                            │   telegramLinkToken = NULL │
                                            │ WHERE                      │
                                            │   telegramLinkToken = "ABC │
                                            │   12345" AND not expired   │
                                            │  │                         │
                                            │  ▼                         │
                                            │ Bot replies "Linked!"      │
                                            └────────────────────────────┘
 ┌─ web page ────────────────────────────┐
 │ Status poll sees telegramChatId       │
 │ populated → flips to ✓ Linked         │
 └───────────────────────────────────────┘
```

### Steady-state message flow (after linking)

```
                   Telegram user sends message
                                │
                                ▼
                POST /api/telegram-webhook
                (with x-telegram-bot-api-secret-token)
                                │
                                ▼
                  ┌─────────────────────────────────┐
                  │ 1. timingSafeEqual secret check │
                  │ 2. Parse update                 │
                  │ 3. Look up user by chat.id:     │
                  │    SELECT * FROM "User"         │
                  │    WHERE telegramChatId =       │
                  │          message.chat.id        │
                  │ 4. If not found → reply         │
                  │    "Link from /admin/telegram"  │
                  │ 5. Else: after(runAgent(user))  │
                  │ 6. Return 200                   │
                  └────────────────┬────────────────┘
                                   │
                  (background, up to maxDuration)
                                   ▼
                  ┌─────────────────────────────────┐
                  │ runAgent(user, text):           │
                  │                                 │
                  │  composio.create(user.id)       │
                  │   ↓                             │
                  │  composioTools                  │
                  │                                 │
                  │  supermemoryTools(KEY, {        │
                  │    containerTags: [user.id]     │
                  │  })                             │
                  │   ↓                             │
                  │  memoryTools                    │
                  │                                 │
                  │  generateText({ tools: {...} }) │
                  │   ↓                             │
                  │  sendTelegramMessage(           │
                  │    chat.id, reply)              │
                  └─────────────────────────────────┘
```

### Why this gives cross-channel memory automatically

Both the **web chat route** and the **Telegram webhook** call:

```ts
supermemoryTools(API_KEY, { containerTags: [user.id] })
```

Same `containerTags` → same memory bucket. The agent's memory tools read/write the same store regardless of which channel it's running in.

```
            user.id = abc-123
                    │
   ┌────────────────┼────────────────┐
   ▼                ▼                ▼
 Web chat      Telegram chat      Cron job
   │                │                │
   └────────────────┴────────────────┘
                    │
                    ▼
       containerTags: ["abc-123"]
                    │
                    ▼
              SAME memory.

   "Remember I'm vegan" said in Telegram
   is recalled when web chat asks
   "what dietary restrictions do I have?"
```

## Multi-tenant story (resolved)

Earlier versions of this spec called this "homework." The build now does it properly.

### Three patterns, ranked

| Pattern | When to use | Code complexity |
|---|---|---|
| **A. One bot, account linking** (what we built) | Standard B2B/B2C SaaS. One bot serves all users. | This spec. ~80 lines. |
| **B. Per-Telegram-chat (unlinked) fallback** | Don't want a hard error if a stranger DMs the bot. | Reply with "link from /admin/telegram" — already in the webhook. |
| **C. One bot per customer org** (white-label) | Reseller/agency products. Each tenant has their own bot. | Out of scope. Add `botToken` per-tenant column, route webhook with tenant slug. |

### What about message history / sidebar sync?

Currently, Telegram messages don't appear in the web sidebar. To add (~30 lines):

- After each Telegram agent reply, INSERT into the linked user's `Chat` (auto-create one labelled "📱 Telegram" on first message), plus the corresponding `Message_v2` rows.
- Web sidebar shows the unified conversation.
- Skipped for this build to keep scope manageable. Pair with `Chat.source` enum if/when added.

## Core files

| File | Purpose |
|---|---|
| `lib/db/schema.ts` | `user` table gains `telegramChatId`, `telegramLinkToken`, `telegramLinkTokenExpiresAt` |
| `lib/db/queries.ts` | `createTelegramLinkToken`, `getUserByTelegramChatId`, `getUserByTelegramLinkToken`, `linkTelegramToUser`, `unlinkTelegram`, `getTelegramLinkStatus` |
| `app/api/telegram/link/route.ts` | POST — auth, generate token, return `{ token, botUsername }` |
| `app/api/telegram/unlink/route.ts` | POST — auth, clear `telegramChatId` |
| `app/api/telegram/status/route.ts` | GET — auth, return `{ linked, telegramChatId? }` for poll |
| `app/api/telegram-webhook/route.ts` | POST handler — secret check, `/start <token>` linking branch, regular message branch (chat.id → user lookup → run agent with user.id-scoped Composio + Supermemory) |
| `app/admin/telegram/page.tsx` | End-user settings UI (link/unlink) |
| `app/admin/telegram/link-button.tsx` | Client component for the linking flow |
| `lib/telegram.ts` | Bot API helpers: `sendTelegramMessage`, `getWebhookInfo`, `setWebhook`, `deleteWebhook`, `getBotInfo` |
| `app/telegram/page.tsx` | **Developer-only** webhook registration page (used during ngrok dev or first deploy) |
| `app/(chat)/api/chat/route.ts` | Wires Supermemory tools with `containerTags: [user.id]` to match the Telegram side |

## Required env vars

| Var | Where it comes from | Purpose |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) → `/newbot` | Authenticates calls to Telegram Bot API |
| `TELEGRAM_BOT_USERNAME` | Same — BotFather tells you the username (without `@`) | UI shows `t.me/<username>` link to the user |
| `TELEGRAM_WEBHOOK_SECRET` | You invent it (any random string, ≥32 chars recommended) | Header secret Telegram sends with every delivery — proves the request is from Telegram |
| `COMPOSIO_API_KEY` | [Composio dashboard](https://app.composio.dev) | Tool integrations |
| `SUPERMEMORY_API_KEY` | [Supermemory console](https://console.supermemory.ai) | Cross-channel memory (optional but unlocks the killer demo) |
| `AI_GATEWAY_API_KEY` *(or OIDC)* | Vercel AI Gateway | Model access |

## Reference docs

These are the canonical sources we built against. Bookmark them.

- **[Telegram Bot API](https://core.telegram.org/bots/api)** — full method reference. Search this page for `setWebhook`, `sendMessage`, `Update`, `Message`.
- **[Marvin's Marvellous Guide to All Things Webhook](https://core.telegram.org/bots/webhooks)** — webhook setup, IP allowlists, certs, debugging tips.
- **[Bots: An introduction for developers](https://core.telegram.org/bots)** — high-level overview, BotFather walkthrough.
- **[Bot API changelog](https://core.telegram.org/bots/api-changelog)** — track breaking changes.
- **[Bots FAQ](https://core.telegram.org/bots/faq)** — common gotchas.

### Specific methods used

- [`setWebhook`](https://core.telegram.org/bots/api#setwebhook) — register the URL Telegram should POST updates to. Accepts `secret_token` and `allowed_updates`.
- [`getWebhookInfo`](https://core.telegram.org/bots/api#getwebhookinfo) — see current registration, pending updates, last error.
- [`deleteWebhook`](https://core.telegram.org/bots/api#deletewebhook) — clear it (e.g. when switching to long polling locally).
- [`sendMessage`](https://core.telegram.org/bots/api#sendmessage) — send a reply. Supports `parse_mode: "Markdown"`.
- [`getMe`](https://core.telegram.org/bots/api#getme) — bot info / token validation.
- [`Update`](https://core.telegram.org/bots/api#update) — incoming payload shape.
- [`Message`](https://core.telegram.org/bots/api#message) — `chat.id`, `text`, `from`, etc.

## Production correctness (v1)

- **Per-chat isolation**: every webhook call uses `chat.id` as the Composio external user ID. No cross-chat leakage.
- **Auth**: `timingSafeEqual` on the secret header. Rejects everything that isn't from your registered Telegram webhook.
- **Group chats blocked**: `chat.type !== "private"` short-circuits to `{ok:true}` without running anything.
- **Telegram timeout safe**: handler responds in <100ms; agent runs in `after()` for up to `maxDuration: 300` seconds.
- **Reply length**: clipped to 4096 chars (Telegram's per-message limit).

## Build order (if rebuilding)

1. Create bot with [@BotFather](https://t.me/BotFather), copy token to `.env.local` as `TELEGRAM_BOT_TOKEN`.
2. Generate a random `TELEGRAM_WEBHOOK_SECRET` (any string).
3. Add `lib/telegram.ts` (Bot API client).
4. Add `app/api/telegram-webhook/route.ts` (handler).
5. Add `app/telegram/page.tsx` (admin UI).
6. Restart `pnpm dev`, start `ngrok http 3000`, register webhook via `/telegram`.
7. Send a test message from your phone.
