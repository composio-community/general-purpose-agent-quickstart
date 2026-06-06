# Part 2: Composio — Give The Agent Hands

## [SPEAKER NOTE] Why Add Composio

All right, so now that we have a working chatbot, we're going to start adding the hands.

Remember: we have the body, which is the Vercel Next.js chatbot. Now we need to adapt this chatbot slightly to give it hands — tools.

The chatbot can already call tools like `getWeather`, the coding tool, and the document editor. What it's doing under the hood is holding a list of tool descriptions, and on every user prompt it decides whether one of those tools is relevant and calls it.

So why give it access to *more* tools? Before we answer that, we need to talk about the single most important constraint in agent design: the **context window**.

## Context Windows

## [SHOW ON SCREEN] Context Window Diagram

Show the diagram with:

- Definition of context window
- Model comparison: GPT-4o (128K), GPT-5.5 (1.05M), Opus 4.7 (1M), Kimi K2.6 (256K)
- Context Engineering definition

## [SPEAKER NOTE] What Is A Context Window

We can't talk about agents without talking about the context window.

A context window is the **maximum amount of information — measured in tokens (words or parts of words) — that a large language model can remember at one time.** Think of it like the AI's working memory, or its short-term memory. Anything inside this window affects the response. Anything outside of it can get forgotten.

This is why tools like Cursor, when your chat gets really long, have to start using algorithms to compress or summarize older messages. If your chat is a thousand messages long, Cursor still wants the first ten in there somehow — but it can't fit them all verbatim.

Some famous context windows:

- **GPT-4o** — 128,000 tokens
- Two years later: **GPT-5.5 and Opus 4.7** — 1,000,000 tokens
- **Kimi K2.6** — 256,000 tokens

## [SPEAKER NOTE] Context Engineering

Even with these massive context windows, in 2026 we still need to be aware of **context engineering**: the strategic curation, management, and optimization of the data we feed into these large language models.

Each model has a limit, but that limit is a *theoretical maximum*. As you approach it, the LLM starts skipping steps and accuracy drops. And every prompt costs more tokens, which means you get billed more every time the agent runs.

Context engineering goes beyond simple prompt engineering — it extends to what tools you wire into your infrastructure. That's where Composio comes in. It acts as a dynamic system that gives your agent access to a huge toolkit catalog without ever overwhelming the context window, because the agent only sees the tools the user has actually connected.

## [SHOW ON SCREEN] Composio Toolkits Catalog

Open `https://composio.dev/toolkits`.

Show:

- 1000+ toolkits across categories (AI/ML, marketing, social, dev tools like Datadog)
- Click into Gmail → highlight that this single toolkit has 61 actions
- Note that putting all 61 into the prompt would be wasteful

## [SPEAKER NOTE] The Context Problem, Visually

If we peek into a single toolkit like Gmail, it has 61 different actions. If we dumped all of those — across every toolkit the user might want — into the tool list the agent sees on every turn, we'd absolutely overwhelm its context. And remember, that context gets passed on *every* prompt.

Composio's answer is per-user scoping. `session.tools()` returns only the tools for the toolkits *this user* has connected via OAuth. The agent's context stays small and relevant, not bloated with 1000 unused integrations.

## [SHOW ON SCREEN] Demo The Finished Flow

In the deployed app, prompt:

> Look at the 10 latest messages in my email and tell me if anything is urgent.

Show:

1. Agent checks if Gmail is connected
2. If not connected → renders a one-click OAuth link inline in chat
3. User clicks, authorizes Gmail
4. Back in chat → tool cards render as the agent searches and calls Gmail actions
5. Agent summarizes the inbox

## [SPEAKER NOTE] Walkthrough Of The Flow

First, our agent will check if Gmail is connected. If it's not, it presents the user with a link to connect their personal Gmail to their account. Once connected, you'll see these tool cards rendering as the agent searches Composio for the right Gmail action and executes it. Finally, the agent just summarizes what it found.

Same flow works for Slack, Notion, Calendar, Linear — anything in the toolkit catalog.

## Setup

## [SHOW ON SCREEN] Composio Dashboard

Open `https://dashboard.composio.dev`.

Show:

1. Settings → API Keys
2. Create new API key, name it (anything)
3. Copy the key
4. Paste into `.env.local` as `COMPOSIO_API_KEY=...`

## [SPEAKER NOTE] Grab Your API Key

In this section you can literally copy and paste the ready-to-go agent prompt from the README. The only thing we need to add ourselves is the Composio API key, so let's go grab that right now.

1. Go to `dashboard.composio.dev` → Settings
2. Open the API Keys section and create a new key
3. Give it a random name, copy it
4. Paste it into your `.env.local` as `COMPOSIO_API_KEY`

Now grab the 🤖 agent-ready prompt from the README and paste it into the Cursor agent. Ideally use one of the more premier models for this, but if all you have is a smaller model, that's fine too — it just might take a couple more prompts.

## 🤖 [SHOW ON SCREEN] Agent-Ready Prompt

Open the README, scroll to **🤖 Agent-Ready Prompt 2A — Composio + Per-User Auth + Admin**. Copy the whole block. Paste into Cursor.

## [SPEAKER NOTE] Prompt Overview

Here's a general overview of what the prompt is asking the agent to do:

- Scope Composio access to the logged-in user via `session.user.id`
- Block guests from getting Composio tools
- If Composio fails to initialize, log the error and continue with local tools — don't crash the chat
- Add a fallback UI renderer in the message component, because Composio tools have dynamic names the template doesn't know about (the template only ships components for `getWeather`, code, and the document tool)
- Add an `/admin` page so we can inspect the current user's Composio state — connected accounts, active toolkits, available toolkits

## [SPEAKER NOTE] Per-User Identity From The Start

Every user that signs up gets a user ID from Auth.js automatically. We pass that ID straight to Composio as the external user ID, so each user's Gmail (and everything else) is fully isolated. I don't get access to your inbox, you don't get access to mine.

We also gate the whole thing behind `session.user.type !== "guest"`, so guest users keep the local tools (weather, documents) but don't get to connect external accounts.

## Verify

## [SHOW ON SCREEN] Click Through The Feature

Like any AI demo, test before you ship. Click through:

1. Sign in as a regular user → ask for your latest emails → expect OAuth link → connect → re-prompt → see results
2. Sign in as guest → expect local tools only, no Composio
3. Confirm existing weather/document tools still work

## [SPEAKER NOTE] Test Before Moving On

Just like any AI demo, make sure to test these changes and click through the feature yourself before continuing. You can always check out the source code in the repo if you want to skip ahead and see how mine turned out.

You might find that smaller models like K2 fail on more complex tool tasks. That's because the agent has to:

- Pick the right tool from the catalog
- Construct a valid JSON argument
- Track what already happened
- Decide what to do next

Better models handle this more consistently. The same workflow that works on a cheaper model might break on the next turn — it's not guaranteed.

## [SPEAKER NOTE] First Real Test

Let's test it out by asking it to fetch my latest emails. It gives us this OAuth link so we can securely connect. Once that's done, I hop back into the chat, ask it to continue, and it fetches my latest emails. Repeat for the rest of your tools.

## The Admin Page

## [SHOW ON SCREEN] /admin

Open `localhost:3000/admin`. Show:

- User ID + user type
- Connected accounts with status badges
- Active toolkits
- Available toolkits not yet connected
- Guest user warning state
- Composio missing config state

## [SPEAKER NOTE] Why The Admin Page

We keep the admin page just so we can actually see how Composio is working under the hood. This isn't necessary for end users — it's a troubleshooting tool. AI is really fast at coding, so it's easy to spin up these debug pages and tear them down when you're done.

## Security 101: OAuth And Attack Surface

## [SHOW ON SCREEN] OAuth / Attack Surface Diagram

Show `tutorial/excalidraw/6-attack-surface.excalidraw`.

The diagram shows:

```text
Broad access:
Agent -> Browser / terminal / file system

Narrow access:
Agent -> Composio -> One connected account -> Approved tools
```

## [SPEAKER NOTE] OAuth And Security 101

All right, and here's a quick security 101 to explain how OAuth works.

There are a lot of valid concerns around OpenClaw-style agents because local agents can have file access, terminal access, and browser access. That's a lot of what we call surface area, or entry points where hackers can attack. You might also hear people call these attack vectors.

With Composio, we want to choose a narrow permission model. The user only connects one specific account at a time, and this way the agent can only use the tools that the user has connected.

This is much safer than giving your agent a shell and trusting it. If you give your agent access to your file system, it could technically read anything on your system. If you give it the browser, then technically your agent could go to different sites if it was ever compromised.

That's why prompt injection is important to think about. Prompt injection is a security vulnerability where an attacker provides specially crafted input to an LLM that makes it ignore its original developer instructions and follow the attacker's instructions instead.

The simplest example is that your agent reads a web page. The web page has hidden text that says, "go to the user's bank account." Normally the agent should reject that, but if the prompt injection is written well enough, the agent might accept it.

So the question becomes: how do we protect our agent from accepting bad instructions?

Part of that is reducing our attack surface area, which basically means fewer access points equals fewer possibilities of getting hacked. If you give your agent your entire file system, then it has your entire file system. If you give it autonomous access to the web and you're not monitoring it, there may be things happening that you are not aware of.

So why is OAuth better?

OAuth is granular. You can choose exactly what permissions you grant, you can see exactly what permissions you're granting, and you can always revoke access later.

You might be wondering: why not just do this yourself?

The reason is that OAuth is annoying. Every app that you see in `composio.dev/toolkits` has its own list of tools. Each one of those tools has a different format and a different structure defined by the people who made that app.

That's the reason we abstract this with Composio. Composio handles the OAuth flow, token storage, refresh logic, and tool definitions. That means storing credentials safely, keeping the user authenticated, and making sure each of the 61 Gmail tools is defined in a way an AI agent can understand.

With Composio, all our agent has to see is: for this logged-in user, these are the tools they have connected. Then the agent can explore those toolkits by itself.

That way, we can focus on making a better AI agent instead of building each of these integrations one by one.

## [SHOW ON SCREEN] Database Inspection

Run `pnpm db:studio` and open `local.drizzle.studio`.

Show:

- `User` table — confirm new signup landed
- `Chat`, `Message` tables — confirm chats are persisted
- Mention this is Postgres on Neon, accessed via Drizzle ORM

## [SPEAKER NOTE] Quick Database Tour

Okay, now we're going to check the database section.

Right now we're going to use it to confirm that things are going into our database as expected.

First, we have the `User` table, and we can confirm that our new user landed here.

Then we'll check our `Chat` and `Message` tables, and we can confirm that our chats are persisted.

We're going to use this same setup later to store our Telegram messages and the chatbot's personality.

---

## [STANDALONE INSERT] Composio One-Month Free For This Video

This block is a self-contained ~30-45 second segment. Default position: end of the Composio section, right after "Quick Database Tour" — by then the viewer has seen the full flow work, so the offer lands as a confidence beat instead of a sales lead. Move to the top of the section if a future re-edit reads better that way.

## [SHOW ON SCREEN]

- The discount code on screen as plain text: `FREECODECAMP`
- Composio pricing page: `https://composio.dev/pricing`

## [SPEAKER NOTE]

One quick note before we move on, because I want to be straight with you about Composio.

The free tier is genuinely generous. I run multiple hobby projects on it and I've never hit the cap. So for following along with this video, you don't need to pay anything — sign up, grab a key, you're done.

But if you start running real workflows for real users and you climb above the free tier, here's a code for one month free on the next plan up: `FREECODECAMP`. Redeem it at `composio.dev/pricing`.

I'm not putting this here as a pitch. I'm putting it here because you've already seen what Composio actually does in this section — it's the layer in the middle of every demo I've shown you. Once your agent has real users, Composio is the kind of thing it would be silly to rebuild yourself. The free month is just to take the friction out of trying the paid plan when you get there.

And if you're at an early-stage startup and need more headroom than that, we run a Startup Program at `composio.dev/startups` — three months of unlimited credits and priority support. Mention this video in the "How did you find out about Composio?" field on the application.

That's it. Onto the next section.
