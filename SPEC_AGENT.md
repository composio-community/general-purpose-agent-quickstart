# Spec: Agent prompt architecture (soul, working memory, persistent memory)

## Goal

Give the agent three distinct memory layers so it (a) feels like a *who* with a stable identity, (b) doesn't lose the thread inside a single conversation, and (c) remembers durable facts across all channels (web + Telegram + future cron).

This file is the canonical reference for how the system prompt is assembled and where each piece of state lives. If you're new to the codebase, read this before `SPEC_TELEGRAM.md` or `SPEC_CRON.md`.

## TLDR

```
SYSTEM PROMPT (per request, every channel)
├── 1. SOUL              who the agent is        ← User.soul (or DEFAULT_SOUL)
├── 2. regularPrompt     tool/memory rules       ← constant in code
├── 3. requestHints      geo, time               ← from request
├── 4. artifactsPrompt   doc/sheet/code rules    ← web only
└── 5. (channel-specific brevity rule, if any)

MESSAGES (per request)
├── working memory   last N turns                ← Postgres
└── new user message

TOOLS (per request)
├── local            schedule/document tools     ← code
├── composio         Gmail / Calendar / 500+     ← composio.create(userId)
└── supermemory      addMemory / searchMemories  ← scoped by containerTags:[userId]
                     / getProfile
```

Cross-channel learning happens via **(supermemory)** sharing one `containerTag` per user. Cross-channel identity happens via **(soul)** living on `User`. Working memory is **per-channel** (web has `Message_v2` + `Chat`, Telegram has `TelegramTurn`).

## Layer 1: Soul (agent identity)

### What it is

A markdown blob that defines *who the agent is* — voice, principles, boundaries. Not what the user did, not what tools exist. Just the agent's character.

> "SOUL.md defines who the agent is; MEMORY.md captures what the agent has learned." — [OpenClaw docs](https://www.openclawplaybook.ai/guides/openclaw-soul-md-guide/)

We store it as a single nullable column on `User`:

```ts
soul: text("soul"),  // markdown, max 4000 chars in the API
```

Null → use `DEFAULT_SOUL` from `lib/ai/prompts.ts`. Non-null → use as-is, prepended to every system prompt.

### Default soul

Distilled from TrustClaw's `assembleSoulPrompt` (in `/Users/shawnesquivel/GitHub/trustclaw/src/server/api/routers/trustclaw/createInstance.ts`). The principles are theirs; we shortened the prose:

- Be genuinely helpful, not performatively. No "Great question!" filler.
- Have opinions.
- Be resourceful before asking — check memory, check tools, then ask.
- Earn trust: careful with external actions (sending emails), bold with internal ones (reading, organizing, remembering).
- You're a guest in someone's digital life; treat their data with respect.

### How to edit it

End-user UI: [`/admin/agent`](http://localhost:3000/admin/agent). One textarea, Save button, Reset to default button. Read-only preview of the default beneath. ~110 lines client + 60 lines server (`app/admin/agent/`, `app/api/agent/soul/route.ts`).

The textarea takes raw markdown. If you write content that doesn't start with a heading, the assembler wraps it in `## Who You Are`. If it does start with a heading (`#` / `##`), it's used verbatim. Lets users either fill in a slot or take full control.

### Why a column, not a separate `soul.md` file

OpenClaw is a desktop product where the agent reads `~/.openclaw/SOUL.md` at startup. We're SaaS with N users; per-user filesystem files would be a deployment problem. TrustClaw made the same call — they store `soulPrompt` as a column on `ComposioClawInstance`. We follow that pattern.

### What we deliberately skipped

- **Onboarding wizard** (TrustClaw has 7 steps: name, writing style, personality, emoji, lore, model, integrations). Overkill for a tutorial. New users get `DEFAULT_SOUL` until they bother to customize.
- **Separate columns for `identityPrompt` / `userPrompt` / `lore`**. One column. KISS.
- **Versioning / history.** Edits overwrite. Add an audit table later if you care.

## Layer 2: Working memory (recent conversation)

### Why it exists

Telegram delivers each message stateless. Without working memory, "its sushi" right after "what's your favourite food?" gets misread as identity. Working memory pins the last few turns so the model has context.

### Storage per channel

| Channel | Table | Loaded as |
|---|---|---|
| Web | `Chat` + `Message_v2` (already provided by the Vercel AI chatbot template) | All messages of the active `Chat`, via `getMessagesByChatId(chatId)` |
| Telegram | `TelegramTurn` (`SPEC_TELEGRAM.md` → "Working memory") | Last 10 rows for `telegramChatId`, via `getRecentTelegramTurns({ telegramChatId, limit: 10 })` |

Both are prepended to the model's `messages` array on every request. Same idea, two implementations, because the channels have different lifecycle assumptions: web users explicitly start new chats, Telegram users send a single forever-stream of DMs.

### Caps

- **Web**: full chat history loaded (template default; no compaction yet).
- **Telegram**: hard count cap of 10. Token-aware caps + summarization are the next step (see `/Users/shawnesquivel/GitHub/trustclaw/src/server/api/routers/trustclaw/agent/context/` for the reference algorithm).

## Layer 3: Persistent memory (durable facts)

### What it is

The agent's long-term memory of the user — name, preferences, ongoing projects, anything worth remembering past a single conversation. We don't roll our own; we use **Supermemory** with one `containerTag` per `user.id`.

### Tools (model-driven)

`supermemoryTools(API_KEY, { containerTags: [userId] })` exposes three relevant tools to the model:

| Tool | When the model uses it |
|---|---|
| `addMemory({ memory })` | When the user shares a durable fact ("my name is Shawn", "I'm vegan", "the project is called Sage") |
| `searchMemories({ informationToGet, ... })` | When answering a question that depends on prior facts ("what do you know about me?") |
| `getProfile({ containerTag, query? })` | Same as searchMemories but returns Supermemory's auto-built static + dynamic profile |

The model decides when to call each. We do **not** auto-fetch the profile on every turn (would add latency for nothing). The prompt rules (see `regularPrompt` in `lib/ai/prompts.ts`) tell the model to be aggressive with `addMemory` — even on casual phrasings — and to call `searchMemories` / `getProfile` before answering questions about the user.

### Cross-channel guarantee

Web and Telegram (and future cron) all do:

```ts
supermemoryTools(API_KEY, { containerTags: [user.id] })
```

Same tag → same memory bucket. A fact saved from Telegram is recallable from web on the next turn. The "killer demo" of this app rides entirely on this property.

### What Supermemory is *not*

- It's **not** a chat log. Don't use it to store turn-by-turn history; that's Layer 2's job.
- It's **not** a replacement for the soul. Soul is about the agent. Supermemory is about the user.
- The agent can hallucinate stored memories if the prompt is weak. The aggressive write rule in `regularPrompt` mitigates this; verify with `getProfile` after a few interactions.

## Composition (file-by-file)

### Where each layer is read

| Layer | Web (`app/(chat)/api/chat/route.ts`) | Telegram (`app/api/telegram-webhook/route.ts`) |
|---|---|---|
| Soul | `getUserSoul({ userId })` → passed to `systemPrompt({ ..., soul })` | `linkedUser.soul` from `getUserByTelegramChatId` → `buildSoulPrompt(soul)` |
| Working memory | `getMessagesByChatId({ id: chatId })` (template default) | `getRecentTelegramTurns({ telegramChatId, limit: 10 })` |
| Persistent | `supermemoryTools(KEY, { containerTags: [user.id] })` | Same |

### Prompt assembler

`lib/ai/prompts.ts`:

```ts
export const DEFAULT_SOUL = `## Who You Are ...`;

export function buildSoulPrompt(soul: string | null | undefined): string {
  // empty → default; otherwise wrap in "## Who You Are" if no heading
}

export const regularPrompt = `... Memory rules ...`; // tool-use directives

export const systemPrompt = ({ requestHints, supportsTools, soul }) => {
  return [
    buildSoulPrompt(soul),         // 1. soul
    regularPrompt,                 // 2. base + memory rules
    getRequestPromptFromHints(...) // 3. geo
    artifactsPrompt,               // 4. web-only docs/sheets
  ].join("\n\n");
};
```

Telegram doesn't go through `systemPrompt()` (no artifacts, no `requestHints`). It hand-assembles `${soul}\n\n${regularPrompt}\n\n${telegramBrevityRule}` instead — same first two layers, channel-specific tail.

## API surface

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/agent/soul` | GET | session, non-guest | Read current soul |
| `/api/agent/soul` | PATCH | session, non-guest | Replace soul (body: `{ soul: string \| null }`); empty/null clears to default |

Guest users (anonymous sessions) can't customize their soul — there's no point if the account is ephemeral.

## Required env vars

Already covered in the channel-specific specs; for completeness:

| Var | Layer | Purpose |
|---|---|---|
| `SUPERMEMORY_API_KEY` | Persistent memory | Without it, the agent gets no Supermemory tools — graceful degradation, but the killer demo doesn't work |
| `COMPOSIO_API_KEY` | (Tools, not memory) | External integrations |
| `AI_GATEWAY_API_KEY` *(or OIDC)* | Model access | All channels |
| Postgres connection | Soul + working memory | `User.soul`, `TelegramTurn`, `Message_v2` |

## What this does *not* implement

These are deliberate omissions, ranked by how much they'd improve the agent if added:

1. **Context compaction.** When the conversation runs long, summarize the older half into a structured `<summary>` block (Goal / Decisions / Progress / Next Steps). TrustClaw does this; we don't. Without it, web chats grow unboundedly and eventually exceed the model context window.
2. **Memory flush before compaction.** Force the model to extract durable facts to Supermemory before the working memory gets summarized away. TrustClaw does this; we rely on the model writing memories incrementally.
3. **Profile injection.** Auto-call `getProfile(userId)` once per session and inject the result into the system prompt. Saves the model a tool round trip. Not done because the latency cost is per-turn and most turns don't need it.
4. **Onboarding flow.** Multi-step wizard to fill out a personalized soul. Currently you just open `/admin/agent` and write into the textarea.
5. **Per-channel soul overrides.** Maybe you want a sterner agent on Telegram than web. Today: same soul, both channels.

References for adding any of these: `/Users/shawnesquivel/GitHub/trustclaw/src/server/api/routers/trustclaw/agent/CLAUDE.md` (architecture); pi-mono and OpenClaw repos cited in that doc (algorithms).

## Glossary

- **Soul**: layer 1 — agent identity, stored on `User`.
- **Working memory**: layer 2 — last N turns of the current conversation, stored per-channel.
- **Persistent memory**: layer 3 — durable facts, stored in Supermemory under `containerTags: [userId]`.
- **Container tag**: Supermemory's tenant key. We use the user's UUID. Don't reuse across users.
- **`regularPrompt`**: the constant base prompt with memory/tool directives. Lives in `lib/ai/prompts.ts`.
- **`DEFAULT_SOUL`**: the fallback agent persona when `User.soul` is null.

## Reference docs

- **[Supermemory: User Profiles](https://supermemory.ai/docs/user-profiles)** — how `getProfile` builds static + dynamic profiles automatically from your memories.
- **[Supermemory: Quickstart](https://supermemory.ai/docs/quickstart)** — `addMemory` / `searchMemories` reference.
- **[OpenClaw: SOUL.md guide](https://www.openclawplaybook.ai/guides/openclaw-soul-md-guide/)** — the canonical source for the soul concept.
- **[OpenClaw: MEMORY.md guide](https://www.openclawplaybook.ai/guides/openclaw-memory-md-guide/)** — the persistent-memory equivalent (we use Supermemory instead of a markdown file).
- **TrustClaw agent runtime** — `/Users/shawnesquivel/GitHub/trustclaw/src/server/api/routers/trustclaw/agent/CLAUDE.md` — full architecture for the next-step features (compaction, memory flush, context pruning).
