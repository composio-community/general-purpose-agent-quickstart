<h1 align="center">Build Your Own OpenClaw from Scratch with Composio, Vercel AI SDK, Telegram, and Supermemory</h1>

<p align="center">
  <img src="public/banner.png" alt="Banner" />
</p>

<p align="center">
  Start from the <a href="https://vercel.com/templates/next.js/chatbot">Vercel AI SDK Chatbot template</a>, follow the prompts below, and end up with the finished agent on the <code>main</code> branch of this repo — an AI agent that controls Gmail, Slack, Notion, Calendar, and 1000+ tools via <a href="https://composio.dev">Composio</a>.
</p>

<p align="center">
  <img src="public/demo.gif" alt="Demo: AI agent resolving a customer dispute across Slack, Notion, and Gmail" width="720" />
  <br/>
  <em>AI agent resolving a customer dispute across Slack, Notion, and Gmail</em>
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

### Part 1: Setup Vercel AI SDK Template

Deploy the chatbot template and run it locally. Out of the box you get a working chatbot with built-in tools (weather, documents, code sandbox) and access to multiple LLMs through the Vercel AI Gateway.

1. 1-Click Deploy the Vercel AI SDK's "Chatbot" template
2. Clone locally and run in your editor (Cursor, Claude Code, etc.)
3. Test built-in tools to see how tool calling works

### Part 2: Add Composio — Turn Your Chatbot Into an Agent

Technically Part 1 is already an agent — it can call tools and use the results. But its tools only work *inside the app*. It can write a document or check the weather, but it can't touch your Gmail, your calendar, or your CRM.

In Part 2, we plug in Composio so the agent can reach out and actually do things in the real apps you use every day. We only **augment the tool layer** — the chat UI, streaming flow, and server route all stay the same.

1. Install Composio: `pnpm add @composio/core @composio/vercel`
2. Grab your free API key from [composio.dev](https://composio.dev)
3. Paste the agent-ready setup prompt (below) into your AI editor — it handles the refactor
4. Add the UI fallback for dynamic tools and the Anthropic tool-call ID fix (prompts below)
5. Prompt your agent and authorize apps when it asks (one-click OAuth)

### Part 3: Deploy with Auth + Composio

Move from a hardcoded demo user to real per-user identity so every authenticated user gets their own connected accounts.

1. Set `AUTH_SECRET` in Vercel environment variables
2. Paste the auth-ready prompt (below) into your AI editor
3. Deploy to Vercel
4. Verify: logged-in users can connect external apps, guest users get local tools only

### Part 4: Cron — Scheduled Agent Tasks

> *Coming soon*

### Part 5: Telegram Bot

> *Coming soon*

### Part 6: Supermemory — Long-Term Agent Memory

> *Coming soon*

---

## Agent-Ready Prompts

Copy these into your AI editor (Cursor, Claude Code, Windsurf, etc.) to set up each part.

### Prompt: Add Composio to Chat Route

```
Given this example from Composio, adapt my Chatbot tools to use Composio.

Special Notes:
- Hardcode the user ID for now
- Assume my .env.local already has the Composio API key.
```

### Prompt: Dynamic Tool UI Fallback

Add this block to `components/chat/message.tsx` as a fallback renderer for any `tool-*` types that don't have a custom component (Composio introduces many dynamic tool names):

```tsx
if (type.startsWith("tool-")) {
  const { toolCallId, state } = part as {
    toolCallId: string;
    state: string;
  };
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;
  const errorText =
    "errorText" in part ? (part.errorText as string) : undefined;

  return (
    <Tool className="w-[min(100%,450px)]" defaultOpen={false} key={toolCallId}>
      <ToolHeader state={state as any} type={type as any} />
      <ToolContent>
        {input && <ToolInput input={input} />}
        {(state === "output-available" || state === "output-error") && (
          <ToolOutput
            errorText={errorText}
            output={
              output ? (
                <pre className="overflow-x-auto p-3 font-mono text-xs">
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : undefined
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
}
```

In `components/ai-elements/tool.tsx`, the label cleanup is already handled:

```ts
type === "dynamic-tool" ? toolName : type.replace(/^tool-/, "");
```

### Prompt: Anthropic Tool Call ID Fix

Composio generates tool call IDs with characters that Anthropic rejects. Add this to `app/(chat)/api/chat/route.ts`:

```ts
const TOOL_ID_INVALID_CHARS = /[^a-zA-Z0-9_-]/g;

function sanitizeToolCallIds(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (
        "toolCallId" in part &&
        typeof part.toolCallId === "string" &&
        part.toolCallId.length > 0
      ) {
        return {
          ...part,
          toolCallId: part.toolCallId.replace(TOOL_ID_INVALID_CHARS, "_"),
        };
      }
      return part;
    }),
  }));
}
```

Then use it when converting messages:

```ts
const modelMessages = await convertToModelMessages(
  sanitizeToolCallIds(uiMessages)
);
```

### Prompt: Production-Ready Auth

```
## What we're doing now

- We are moving from **demo identity** to **real per-user identity**.
- No hardcoded Composio user id anymore.
- Composio should use the logged-in app user (`session.user.id`).
- Keep auth flow **inline in chat** for now (no extra connect button/endpoints yet).
- Guest users should **not** connect/use Composio accounts.

## What we are not doing now

- No manual `manageConnections: false` flow yet.
- No custom callback route yet.
- No extra UI for connect/disconnect.
- No multi-account switching yet.

---

## Implementation Plan (small + safe)

1. Update `app/(chat)/api/chat/route.ts`
   - Remove hardcoded `COMPOSIO_EXTERNAL_USER_ID`.
   - Use `session.user.id` when creating Composio session.

2. Enforce guest restriction
   - If `session.user.type === "guest"`, do not inject Composio tools.
   - Continue with local tools only.

3. Keep current tool loop behavior
   - Keep merged tools pattern and fallback behavior.
   - If Composio init fails, log and continue local tools (no app crash).

4. Verify
   - Regular user: sees inline auth prompt when Gmail not connected.
   - Guest user: no Composio tool usage.
   - Chat streaming and existing tools still work.
   - Lint/type check clean.
```

---

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI, Anthropic, Google, xAI, and other model providers via AI Gateway
- [Composio](https://composio.dev)
  - One-click OAuth to connect Gmail, Slack, Notion, Calendar, CRM, and 1000+ tools
  - Handles token refresh, API edge cases, and auth infrastructure
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
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
