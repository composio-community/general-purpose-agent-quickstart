<h1 align="center">Build Your Own OpenClaw from Scratch with Composio, Vercel AI SDK, Telegram, and Supermemory</h1>

<p align="center">
  Start from the <a href="https://vercel.com/templates/next.js/chatbot">Vercel AI SDK Chatbot template</a>, follow the prompts below, and end up with the finished agent on the <code>main</code> branch of this repo — an AI agent that controls Gmail, Slack, Notion, Calendar, and 1000+ tools via <a href="https://composio.dev">Composio</a>.
</p>

<p align="center">
  <img src="public/demo.gif" alt="Demo: AI agent resolving a customer dispute across Slack, Notion, and Gmail" width="720" />
</p>

<p align="center">
  <a href="#tutorial"><strong>Tutorial</strong></a> ·
  <a href="#agent-ready-prompts"><strong>Agent-Ready Prompts</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

---

## Architecture

```
           Entry Points
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   Next.js      │ │   Telegram     │ │  Vercel Cron   │
│   Chat UI      │ │   Webhook      │ │  (scheduled)   │
│                │ │  (optional)    │ │  (optional)    │
└───────┬────────┘ └───────┬────────┘ └───────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   Your Agent (Next.js API Route)             │
│           built with AI SDK: streamText · tool calling       │
└──────────┬──────────────────────────────┬────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────┐    ┌────────────────────────────────┐
│   Vercel AI Gateway     │    │        Composio                │
│  OpenAI · Anthropic     │    │  One-click OAuth · token mgmt  │
│  Google · xAI · etc.    │    │                                │
│  $5/mo free credits     │    │  Gmail · Slack · Notion        │
│                         │    │  Calendar · CRM · 1000+        │
└─────────────────────────┘    └────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Optional Extensions                       │
│  Supermemory (long-term memory · wraps the LLM as middleware)│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      Infrastructure                          │
│          Neon Postgres  ·  Vercel Blob  ·  Auth.js           │
└──────────────────────────────────────────────────────────────┘
```

**Your agent** lives in a Next.js API route, built with the **AI SDK** (an open-source TypeScript library for streaming, tool calling, and model routing). **Next.js** is the default chat UI, with **Telegram** and **Vercel Cron** as optional entry points — same agent, different trigger. **Composio** provides tools for external apps (Gmail, Slack, etc.) that merge into the agent's tool loop at runtime. **Vercel AI Gateway** routes to any model provider with free monthly credits. **Supermemory** optionally wraps the model so the agent remembers past conversations across sessions.

---

## Tutorial

**Build order (matches the video):**

| # | Part | What it adds |
|---|---|---|
| 1 | Chat | Vercel AI SDK chatbot template — chat UI, models, local tools |
| 2 | Hands | Composio tools (Gmail, Slack, Notion, 1000+) |
| 3 | Memory | Supermemory — durable cross-session facts |
| 4 | Soul | `User.soul` + conversational onboarding |
| 5 | Anywhere | Telegram bot + account linking |
| 6 | Heartbeat | Agent-created cron schedules |

Every part is self-contained: the env vars you need, the explanation, and the agent-ready prompts you paste into your AI editor.

### Part 1: Setup Vercel AI SDK Template

Deploy the chatbot template and run it locally. Out of the box you get a working chatbot with built-in tools (weather, documents, code sandbox) and access to multiple LLMs through the Vercel AI Gateway.

1. 1-Click Deploy the Vercel AI SDK's "Chatbot" template
2. Clone locally and run in your editor (Cursor, Claude Code, etc.)
3. Test built-in tools to see how tool calling works

### Part 2: Add Composio — Turn Your Chatbot Into an Agent

Technically Part 1 is already an agent — it can call tools and use the results. But its tools only work *inside the app*. It can write a document or check the weather, but it can't touch your Gmail, your calendar, or your CRM.

In Part 2, we plug in Composio so the agent can reach out and actually do things in the real apps you use every day. We only **augment the tool layer** — the chat UI, streaming flow, and server route all stay the same. We wire it to per-user identity (`session.user.id`) from the start so every authenticated user gets their own connected accounts.

**Steps:**

1. Install Composio: `pnpm add @composio/core @composio/vercel`
2. Grab your free API key from [composio.dev](https://composio.dev) → set `COMPOSIO_API_KEY` in `.env.local`
3. Paste **Prompt 2A** (below) into your AI editor — it handles the refactor, per-user auth, and an `/admin` debug page
4. Paste **Prompt 2B** (below) — three small polish fixes (tool ID sanitizer, dynamic tool UI, more models)
5. Prompt your agent and authorize apps when it asks (one-click OAuth)
6. Verify: logged-in users can connect external apps, guest users get local tools only

#### Prompt 2A — Composio + Per-User Auth + Admin

Wires Composio into the existing chat route with real per-user identity, gates guests, and adds a debug `/admin` page.

````text
Add Composio tools to the existing Vercel AI SDK chat route, per-user.

Requirements:
- Keep existing chat UI, streaming, and local tools.
- External user id = session.user.id. Never hardcoded.
- Guests (session.user.type === "guest") get no Composio tools.
- Composio failures log + fall back to local tools. Never crash chat.
- Merge Composio tools into the tools object passed to streamText.
- Assume COMPOSIO_API_KEY is set.

Composio setup — use the Tool Router session API only:
    const composio = new Composio({ provider: new VercelProvider() });
    const tools = await (await composio.create(session.user.id)).tools();
Do NOT use composio.tools.get / toolkits.authorize / connectedAccounts.initiate — those hit a deprecated endpoint. The meta-tools (COMPOSIO_SEARCH_TOOLS, COMPOSIO_MANAGE_CONNECTIONS, …) handle auth links and execution natively.

Gotchas:
- Do not restrict experimental_activeTools to a hardcoded name list — it filters out dynamic Composio tools.
- Sanitize part.toolCallId to ^[a-zA-Z0-9_-]+$ before convertToModelMessages (Anthropic rejects otherwise).
- Add a generic tool-* fallback in the message renderer or Composio tool calls render as nothing.

/admin page (Next.js connection() + Suspense, per-user):
- Show user id, user type, connected accounts with status badges, active toolkits, available toolkits.
- Handle guest and missing-COMPOSIO_API_KEY states.
- composio.connectedAccounts.list({ userIds: [id] }) is fine here (read path isn't deprecated).

Verify:
- Regular user, Gmail not connected → auth link inline in chat.
- Regular user, Gmail connected → emails fetched.
- Guest → no Composio tools; local tools work.
- /admin renders correctly for guest, no-connections, with-connections, missing-config.

Docs:
- https://www.npmjs.com/package/@composio/vercel
- https://docs.composio.dev/reference/sdk-reference/typescript/connected-accounts (v3 guardrails)
- https://composio.dev/toolkits/composio/framework/ai-sdk

````

#### Prompt 2B — Polish (Tool ID Fix + Dynamic Tool UI + More Models)

Run after Prompt 2A lands. Three fixes in one pass.

````text


Expand the model list (lib/ai/models.ts)
   - Use @Browser to open https://vercel.com/ai-gateway/models and pick 3-5 popular current models I don't already have (e.g. latest Claude, GPT, Gemini, Grok, DeepSeek, Kimi).
   - For each: add an entry to chatModels with a sensible id, label, description, and gatewayOrder if relevant.
   - Don't break existing models. Keep DEFAULT_CHAT_MODEL pointing at a model that exists.

Verify:
- The model picker in the UI shows the new models and they actually stream when selected.
````

### Part 3: Memory — Supermemory

The agent has hands but no memory. Tell it your name in one chat, open a new chat, and it has no idea who you are. We fix that with [Supermemory](https://supermemory.ai) — a managed memory layer the model writes to and reads from as just another tool.

**Why a managed service instead of a Postgres column:** memory is messy. You want fuzzy search, automatic profile-building, dedup, and ranking — not a hand-rolled `notes` table. Supermemory exposes three model-callable tools (`addMemory`, `searchMemories`, `getProfile`) and we scope every call to `containerTags: [user.id]`. Same tag = same memory bucket, which is what later makes the cross-channel demo (web → Telegram) work without extra plumbing.

**Get an API key:**

1. Sign up at [supermemory.ai](https://supermemory.ai). Free tier: 1M tokens + 10K queries/month, no credit card.
2. Dashboard → API keys → create one.
3. Add to `.env.local`: `SUPERMEMORY_API_KEY=sm_...`
4. Restart `pnpm dev`.

**Steps:**

1. Install: `pnpm add @supermemory/tools`
2. Paste **Prompt 3** below.
3. Test: tell the agent your name, start a new chat, ask "what do you know about me?" — it should call `searchMemories` and recall.

#### Prompt 3 — Wire Supermemory into the chat route

````text
Add Supermemory as a third tool source in app/(chat)/api/chat/route.ts, alongside the existing local tools and Composio tools.

Context:
- Use @supermemory/tools/ai-sdk → supermemoryTools(API_KEY, { containerTags: [session.user.id] }).
- Preserve the existing chatbot route structure.
- Keep the existing getComposioToolsForUser(session.user.id) helper and existing systemPrompt({ requestHints, supportsTools, hasComposioTools }) flow.
- Same gating as Composio, plus tool support: only initialize memory tools if supportsTools is true, SUPERMEMORY_API_KEY is set, and session.user.type === "regular".
- If init fails, log and continue — never crash the chat.
- Merge into the existing tools object: { ...localTools, ...composioTools, ...memoryTools }.
- Preserve all existing chat behavior: streaming, title generation, rate limits, tool approval flow, message saving, local tools, and Composio tools.

Also update lib/ai/prompts.ts (regularPrompt) with operational rules for the memory tools:
- addMemory: store any durable fact worth recalling later — about the user (name, preferences, constraints), about their world (people, projects, companies, decisions), or anything they explicitly ask you to remember. Catch casual phrasings too ("oh btw I'm vegan", "remember that the launch is March 12"). Skip ephemeral context (today's mood, one-off questions). Canonicalize on write — "call me Shawn" / "refer to me as Shawn" / "my name is Shawn" all store as "The user's preferred name is Shawn." Don't store the assistant's identity, instructions, or persona.
- searchMemories: direct semantic search over stored memories. Prefer it for specific recall ("what's my name?", "when's the launch?", "what did I decide about pricing?").
- getProfile: returns Supermemory's synthesized profile (static + dynamic buckets) and may include search results when given a query. Prefer it for broad personalization ("what do you know about me?"). If getProfile returns empty buckets, fall back to searchMemories before saying you don't know.
- Always check memory BEFORE answering questions that could plausibly be in memory — don't say "I don't know" without calling at least one of these tools first.

Verify:
- Tell the agent "refer to me as X" → it calls addMemory and stores "The user's preferred name is X."
- New chat → "what's my name?" → it calls searchMemories (not just getProfile) and recalls.
- New chat → "what do you know about me?" → it calls getProfile.
- Guest user → no memory tools, no errors.
````

---

### Part 4: Soul — Agent Identity + Onboarding

Right now your agent has no personality and no concept of who *it* is — every session starts fresh with the same generic system prompt. Inspired by OpenClaw's `SOUL.md`, we give each user a per-user **soul**: a markdown blob defining the agent's voice, principles, and boundaries. We also add a conversational onboarding flow so first-time users get a personalized soul without filling out a form.

**Why a column, not a file:** OpenClaw is a desktop app where the agent reads `~/.openclaw/SOUL.md`. We're SaaS with N users — per-user files are a deployment problem. So `soul` becomes a single nullable column on `User` (markdown text, max 4K chars). Null → fall back to `DEFAULT_SOUL`.

**Why conversational onboarding:** TrustClaw uses a 7-step wizard. We don't. When `User.soul IS NULL` and the user is non-guest, we prepend an `ONBOARDING_PROMPT` to the system prompt and let the agent itself collect a name + style preference + one fact across 2-3 turns, then call a `setSoul` tool to commit. Next turn, soul is non-null, onboarding prompt drops off. The agent is the state machine; the prompt is its rulebook.

**No new env vars** — this part is all schema + prompts.

**Steps:**

1. Paste **Prompt 4** below.
2. Run `pnpm db:generate && pnpm db:migrate`.
3. Sign up as a new user → first message should trigger the onboarding flow → after 2-3 turns, agent calls `setSoul`.
4. Visit `/admin/agent` → confirm your custom soul shows up; test "Reset to default".

#### Prompt 4 — Soul column, onboarding, and `/admin/agent`

````text
Add a per-user agent identity ("soul") with conversational onboarding.

Goal: give each signed-in user a persistent agent personality. This is separate from long-term memory: memory stores facts about the user, while soul stores who the agent is and how it should behave.

1. Schema (lib/db/schema.ts)
   - Add nullable text column `soul` to the User table.
   - Run pnpm db:generate then pnpm db:migrate.

2. Queries (lib/db/queries.ts)
   - Add getUserSoul({ userId }) and updateUserSoul({ userId, soul }).

3. Prompt assembler (lib/ai/prompts.ts)
   - Export DEFAULT_SOUL with this markdown:
     ## Who You Are
     You are a personal AI agent — not a generic chatbot. You have persistent memory when memory tools are available, and access to the user's tools through Composio when connected.
     - Be genuinely helpful, not performatively helpful. Skip filler and get to the point.
     - Have opinions. An assistant with no personality is a search engine with extra steps.
     - Be resourceful before asking. Check available memory, tools, and context before asking the user.
     - Be careful with external actions like sending emails or posting messages. Be bold with internal actions like reading, organizing, drafting, and remembering.
     - Treat the user's data with respect.
   - Export buildSoulPrompt(soul): returns DEFAULT_SOUL if null/empty, else wraps in "## Who You Are" if no heading present.
   - Export ONBOARDING_PROMPT — instructs the agent to collect the user's preferred agent name + communication style over 2-3 conversational turns, then call setSoul.
   - If addMemory is already available, ONBOARDING_PROMPT may tell the model to store user facts like the user's name with addMemory. If memory tools are not available, do not call or mention addMemory.
   - Make the distinction explicit: user facts belong in memory; the agent's name, voice, principles, and boundaries belong in soul.
   - Include escape hatches: if the user says "skip", "use defaults", refuses a name, or onboarding has gone on for ~3 turns, call setSoul with a reasonable default and move on.
   - Extend the existing systemPrompt function to accept soul and needsOnboarding, while preserving existing prompt sections such as request hints, Composio instructions, and artifacts rules.
   - Compose the prompt in this order: onboarding block if needed, buildSoulPrompt(soul), regularPrompt, then the existing optional sections.

4. setSoul tool (lib/ai/tools/set-soul.ts)
   - Takes { soul: string } (20-4000 chars), calls updateUserSoul.
   - Wired into localTools in app/(chat)/api/chat/route.ts ONLY for non-guest users.

5. Chat route wiring (app/(chat)/api/chat/route.ts)
   - const soul = await getUserSoul({ userId: session.user.id });
   - const needsOnboarding = !soul && session.user.type !== "guest";
   - Pass both to systemPrompt(...).

6. /admin/agent page
   - Server component reads soul + DEFAULT_SOUL.
   - Client subcomponent: textarea, Save button (PATCH), Reset to default button (PATCH null).
   - Read-only preview of DEFAULT_SOUL beneath.

7. API route (app/api/agent/soul/route.ts)
   - GET: return current soul. Auth required, non-guest only.
   - PATCH: { soul: string | null } — null/empty clears to default.

Verify:
- New signup → first message → agent runs onboarding (asks name/style), then commits via setSoul.
- /admin/agent → shows the new soul, Save persists, Reset clears.
- Guest user → ONBOARDING_PROMPT never injected, setSoul tool not exposed.
- Existing chats still work for users with soul already set.
````

---

### Part 5: Anywhere — Telegram

Right now the agent only lives in your browser tab. Telegram lets your users talk to the **same agent** from their phone — same identity, same Composio connections, same memory. One bot serves all users; each user clicks one button to link their personal Telegram chat to their web account.

**Why bother:** OpenClaw's killer feature is "any chat app". You don't open a website to talk to your assistant — you DM it. We do this with a single Telegram bot you (the developer) register once via BotFather. Users never see BotFather, never paste tokens — they just click "Link Telegram" in `/admin/telegram`.

**Get a bot token (one-time, by you):**

1. Open Telegram, search [@BotFather](https://t.me/BotFather), `/newbot`.
2. Pick a name + username (must end in `bot`).
3. BotFather returns a token. Add to `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=123456789:AA...
   TELEGRAM_BOT_USERNAME=your_app_bot
   TELEGRAM_WEBHOOK_SECRET=<any random string, e.g. openssl rand -hex 16>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Restart `pnpm dev`.

**Local dev requires public HTTPS** — Telegram won't deliver to `localhost`. Use [ngrok](https://ngrok.com): `ngrok http 3000`. The ngrok URL changes on free-tier restarts, so you'll re-register the webhook from `/telegram` each time.

**Steps:**

1. Paste **Prompt 5** below.
2. Run `pnpm db:generate && pnpm db:migrate`.
3. Start ngrok → visit `/telegram` → "Register webhook".
4. As a logged-in user, visit `/admin/telegram` → click "Link Telegram" → tap the `t.me/your_bot` link → send `/start <code>`.
5. DM the bot from your phone: "fetch my latest emails" → uses the same Gmail OAuth you connected on the web.

#### Prompt 5 — Telegram bot + account linking + cross-channel agent

````text
Add a Telegram channel for the agent. One bot for the whole app, per-user account linking.

Implement v1 only: private DMs, account linking, text messages, and one-shot agent replies. Do NOT build group chats, file uploads, voice messages, or streaming.

Build Telegram as its own channel: the webhook receives DMs, links them to a signed-in user, runs the agent with generateText, and replies through the Telegram Bot API.

Install and wire anything missing before building the Telegram route:
- If @supermemory/tools is missing, install it and use supermemoryTools(SUPERMEMORY_API_KEY, { containerTags: [user.id] }).
- If a Composio helper already exists, reuse it. If not, add a small helper that returns Composio tools for a user id.

1. Schema (lib/db/schema.ts)
   - Add to User: telegramChatId (varchar, unique), telegramLinkToken (varchar, unique), telegramLinkTokenExpiresAt (timestamptz).
   - Add new TelegramTurn table: id, telegramChatId, role ("user"|"assistant"), content (text), createdAt.
   - TelegramTurn is working memory for the Telegram chat. Key it by telegramChatId; do not require a userId column.
   - pnpm db:generate && pnpm db:migrate.

2. lib/telegram.ts — thin Bot API client
   - sendTelegramMessage, getWebhookInfo, setWebhook, deleteWebhook, getBotInfo.
   - All read TELEGRAM_BOT_TOKEN from env.
   - Use NEXT_PUBLIC_APP_URL when building user-facing links back to the web app.

3. Webhook handler (app/api/telegram-webhook/route.ts)
   - Validates x-telegram-bot-api-secret-token via timingSafeEqual against TELEGRAM_WEBHOOK_SECRET.
   - Filters chat.type !== "private" (drop groups).
   - Special-case "/start <token>": look up User by telegramLinkToken (and not expired), set telegramChatId, clear token, reply "Linked!".
   - If user sends "/start" with no valid token, reply with instructions to link from /admin/telegram.
   - Regular messages: dispatch agent in after(), return {ok:true} immediately.
   - Agent dispatch: load user via getUserByTelegramChatId, build Composio tools for that user, build supermemoryTools(SUPERMEMORY_API_KEY, { containerTags: [user.id] }), load last 10 TelegramTurn rows for working memory, generateText (one-shot, NOT streamText), persist both turns, sendTelegramMessage.
   - Use the existing regularPrompt plus a short Telegram brevity rule.
   - Use stopWhen: stepCountIs(8) or similar so Composio meta-tools can search, connect, and execute across multiple tool steps.

4. Linking API
   - POST /api/telegram/link: generate 8-char token, set User.telegramLinkToken + 10min expiry, return { token, botUsername, deepLink, expiresInMinutes }.
   - GET /api/telegram/status: returns { linked: boolean, telegramChatId? }.
   - POST /api/telegram/unlink: clears telegramChatId and any link token fields for the current user.

5. /admin/telegram page (end-user)
   - "Link Telegram" button → calls POST /link → shows "Send /start ABC12345 to @your_bot" + t.me link.
   - Polls /status every 3s until linked.
   - Unlink button calls POST /unlink.

6. /telegram page (developer debug)
   - Shows getBotInfo + getWebhookInfo.
   - "Register webhook" button (auto-detects host, registers /api/telegram-webhook).
   - "Delete webhook" button.

Verify:
- BotFather token + secret in .env.local, dev server restarted.
- ngrok running, /telegram shows webhook registered.
- /admin/telegram → link → DM bot → "fetch my latest emails" uses the same Gmail you OAuthed on web.
- Cross-channel memory: tell Telegram "remember I prefer concise replies" → ask in web chat "what do you know about my style?" → recalls.
````

---

### Part 6: Heartbeat — Cron Schedules

The agent only runs when you talk to it. To match OpenClaw's "9 AM email summary" behavior, we let the agent **schedule itself**: in chat, the user says *"send me a Gmail summary every weekday at 9 AM"*, and the agent calls a `scheduleTask` tool that inserts a row in `cron_jobs`. A Vercel cron tick fires on your configured platform schedule, picks up due rows, and re-runs the agent with that user's tools.

**Why agent-managed instead of a UI form:** users don't want to learn cron syntax. The agent translates natural language → `cron-parser` validates it → row inserted. Same for listing and cancelling. The whole interface is the chat.

**Get a cron secret:**

1. `openssl rand -hex 32` → add to `.env.local` as `CRON_SECRET=...`.
2. After deploy, set the same value in Vercel → Project → Environment Variables. Vercel auto-injects this header for crons declared in `vercel.json`.

**Vercel Hobby plan limits ([docs](https://vercel.com/docs/cron-jobs/usage-and-pricing)) — read this carefully:**

| | Hobby | Pro / Enterprise |
|---|---|---|
| Min interval | **Once per day** | Once per minute |
| Scheduling precision | Hourly ±59 min (e.g. `0 1 * * *` fires somewhere in the 1 AM hour) | Per-minute |
| Cron jobs / project | 100 | 100 |

**A sub-daily expression in `vercel.json` will fail deployment on Hobby**, e.g. `0 * * * *` errors with: *"Hobby accounts are limited to daily cron jobs."*

This affects **only the platform tick** (`vercel.json` → `/api/cron/tick`), not what users can schedule in chat. Two-tier reality:

- **Hobby**: `vercel.json` cron ticks once per day → users *can* create `* * * * *` rows in chat, but the agent only checks for due rows once daily, so the most frequent real-world execution is daily.
- **Pro**: `vercel.json` cron ticks every minute → user-created `* * * * *` rows actually fire every minute.

For local dev this doesn't matter — `./scripts/test-cron.sh trigger` calls the tick endpoint manually, and the agent runs whatever's due regardless of the platform schedule.

**Steps:**

1. Install: `pnpm add cron-parser`
2. Paste **Prompt 6** below.
3. Run `pnpm db:generate && pnpm db:migrate`.
4. In chat: *"Schedule a task that says hello every minute."* (works locally; on deployed Hobby, will only actually fire once per day)
5. Local test: `./scripts/test-cron.sh list` → `make-due <id>` → `trigger` → check `lastRunAt`.
6. Visit `/admin/schedules` to see the schedule + last output.

#### Prompt 6 — Agent-managed cron schedules

````text
Add per-user scheduled tasks the agent can create, list, and cancel from chat.

Implement v1 only: users can create, list, cancel, and locally test scheduled tasks. Do NOT build DB locking, a split claim/execute worker, retries, queues, or Telegram delivery yet.

This feature requires Composio and Supermemory in the scheduled run. If Composio helpers, @supermemory/tools, or SUPERMEMORY_API_KEY are missing, add them and wire them the same way the chat route does.

1. Schema (lib/db/schema.ts)
   - Add CronJob table:
     id (uuid PK), userId (uuid FK → User), cronExpression (varchar 64), timezone (varchar 64, default 'UTC'),
     prompt (text), enabled (bool, default true), nextRunAt (timestamptz),
     lastRunAt (timestamptz?), lastError (text?), lastOutput (text?), createdAt (timestamptz).
   - pnpm db:generate && pnpm db:migrate.

2. Queries (lib/db/queries.ts)
   - createCronJob, getDueCronJobs, updateCronJobAfterRun, getCronJobsByUserId, deleteCronJob.

3. lib/cron/cron-utils.ts
   - validateCronExpression(expr): uses CronExpressionParser.parse() from cron-parser and returns { valid: true } or { valid: false, error: string }.
   - computeNextRunAt(expr, timezone): returns Date.

4. Three agent tools (lib/ai/tools/)
   - schedule-task.ts → tool({ cronExpression, prompt, timezone? }), validates expr, inserts row, captures session.user.id from closure.
   - list-my-schedules.ts → returns all schedules for session.user.id including lastOutput.
   - cancel-schedule.ts → deleteCronJob WHERE id = $1 AND userId = session.user.id.
   - Wire all three into localTools in app/(chat)/api/chat/route.ts. Block guest users; only regular signed-in users can create schedules.

5. Tick route (app/api/cron/tick/route.ts, GET)
   - Auth: require Authorization: Bearer ${CRON_SECRET} in production. Bypass when NODE_ENV !== "production" so test script works.
   - Select due rows (nextRunAt <= NOW() AND enabled).
   - For each due row: build Composio tools for row.userId, build supermemoryTools(SUPERMEMORY_API_KEY, { containerTags: [row.userId] }), then generateText with row.prompt + tools.
   - Reuse the project's existing Composio helper if one exists, so the chat route and cron route do not drift.
   - Update lastRunAt, lastOutput (final text), lastError (if thrown), nextRunAt (computeNextRunAt).

6. Schedules API
   - GET /api/schedules → user's schedules.
   - DELETE /api/schedules/:id → guarded WHERE id = $1 AND userId = session.user.id.

7. /admin/schedules page
   - Server component lists schedules.
   - Delete button (client subcomponent calls DELETE).
   - Collapsible "Last output" panel.

8. vercel.json
   - Default to Hobby-compatible: { "crons": [{ "path": "/api/cron/tick", "schedule": "0 0 * * *" }] } (daily at midnight UTC).
   - Hobby plans REJECT sub-daily expressions at deploy time (https://vercel.com/docs/cron-jobs/usage-and-pricing). If on Pro, change to "* * * * *" for per-minute ticks.
   - Hobby precision is hourly ±59 min — "0 1 * * *" fires somewhere in the 1 AM hour, not exactly at 1:00.

9. scripts/test-cron.sh
   - Subcommands: list, make-due <id> [offset], trigger, status <id>, delete <id>.
   - Used to test locally since Vercel crons don't fire on pnpm dev.
   - Requires POSTGRES_URL in .env.local and psql installed locally. jq is optional but useful for formatted output.

Verify:
- In chat: "schedule hello every minute" → row inserted, no validation errors.
- ./scripts/test-cron.sh list → shows row.
- make-due <id> → trigger → lastRunAt populated, lastOutput non-null.
- /admin/schedules → row visible, delete works.
- Guest users blocked from creating schedules.
````

---

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI, Anthropic, Google, xAI, and other model providers via [Vercel AI Gateway](https://vercel.com/ai-gateway)
- [Composio](https://composio.dev)
  - One-click OAuth to connect Gmail, Slack, Notion, Calendar, CRM, and 1000+ tools
  - Handles token refresh, API edge cases, and auth infrastructure
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev/)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. Models are configured in `lib/ai/models.ts` with per-model provider routing. Included models: Mistral, Moonshot, DeepSeek, OpenAI, and xAI.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

Template source: https://github.com/vercel/chatbot

## Environment Variables Cheatsheet

All optional services degrade gracefully — set what you need for the parts you're building.

| Var | Required for | How to get |
|---|---|---|
| `AUTH_SECRET` | All parts (Auth.js sessions) | `openssl rand -base64 32` |
| `POSTGRES_URL` | All parts (chats, soul, schedules) | Vercel Marketplace → [Neon](https://vercel.com/marketplace/neon) |
| `AI_GATEWAY_API_KEY` | Non-Vercel deploys (auto via OIDC on Vercel) | [vercel.com/ai-gateway](https://vercel.com/ai-gateway) — $5 free / 30 days |
| `COMPOSIO_API_KEY` | Part 2 (tools) | [dashboard.composio.dev](https://dashboard.composio.dev) → Settings → API Keys |
| `SUPERMEMORY_API_KEY` | Part 3 (memory) | [supermemory.ai](https://supermemory.ai) → API Keys (free: 1M tokens/mo) |
| `TELEGRAM_BOT_TOKEN` | Part 5 (Telegram) | [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_BOT_USERNAME` | Part 5 (Telegram) | Same as above (the `_bot` username) |
| `TELEGRAM_WEBHOOK_SECRET` | Part 5 (Telegram) | `openssl rand -hex 16` |
| `CRON_SECRET` | Part 6 (cron) | `openssl rand -hex 32` |
| `REDIS_URL` *(optional)* | Resumable streams + prod rate limiting | Vercel Marketplace → Upstash |

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).
