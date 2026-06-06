# Tutorial Notes Moved Out Of Script

These notes were moved out of `2_TUTORIAL.md` so that file can stay focused on the recording transcript and on-screen guidance.

## 1. Source Code

## Source Code

Everything in this tutorial is open source. Mention this in the first minute of the video and pin it in the description.

- Repo: `https://github.com/shawnesquivel/OpenClaw-Clone-Composio-VercelAI`
- Live demo: `https://vercel-ai-composio.vercel.app`

**Teleprompter — say this within the first minute:**

> Everything I'm building today is open source. The full repo is linked in the description — feel free to fork it, deploy your own copy, or use it as a reference if you get stuck following along.

---

## 2. Early Security Honesty Section

## What We're NOT Building (Security Honesty)

Most of the loud security criticism of OpenClaw — "it's a live virus", "32K leaked API keys", "run it in an airgapped VM" — comes from things OpenClaw does that **our build does not do**, not from things we cleverly fixed.

Be straight with viewers about this. We sidestep the headline risks; we don't solve them.

| Concern people raise about OpenClaw | What our build does instead |
|---|---|
| Runs on your local machine with shell + filesystem access | Runs as a Next.js app on Vercel. No shell, no local filesystem. |
| Agent can write and hot-reload its own skills (arbitrary code) | Fixed tool set defined in code. Model can only call tools we registered. |
| Reports of leaked API keys in user databases | Composio + provider keys live in server env vars. Per-user OAuth is brokered by Composio, not stored as raw tokens in our DB. |
| Direct attack surface on a personal machine | Standard web app: Auth.js sessions, per-user + per-IP rate limiting. |

**What we still do not address in this tutorial — be honest about this on camera:**

- **Prompt injection** — a malicious email or webpage could try to convince the agent to exfil data via a tool call. We don't have guardrails for this.
- **Tool-call confirmation** — the agent can send emails or post to Slack without an "are you sure?" step. Fine for a demo; would not be acceptable in production.
- **Audit log / kill switch** — Composio's dashboard shows tool calls, but we don't ship a per-user pause/revoke UI.
- **Encryption beyond defaults** — we use whatever Neon/Supermemory provide. We don't add app-level field encryption for memories.

**Teleprompter — security framing:**

> Quick honest moment. If you read the comments under any OpenClaw video, half of them are about security. "It's a live virus", "leaked API keys", "only run it in an airgapped VM", that kind of thing.
>
> Most of those concerns don't apply to what we're building, but not because I'm a security genius — they don't apply because we're building a different shape of app. OpenClaw runs on your own machine with full system access and writes its own skills at runtime. Ours is a normal web app on Vercel. No shell, no filesystem access, fixed tool set.
>
> What I'm not going to claim is that this app is "secure". I'm not adding prompt injection guardrails, I'm not adding a confirmation step before the agent sends an email, and I'm not building an audit log UI. Those are real things you'd want in production. They're out of scope for a tutorial focused on the core agent loop. Just want you to know what's in and what's out.

---

## 3. Resources

## Resources

- Source code: `https://github.com/shawnesquivel/OpenClaw-Clone-Composio-VercelAI`
- Composio dashboard: `https://dashboard.composio.dev`
- Composio Startup Program: `https://composio.dev/startups` — mention this video in the "How did you find out about Composio?" field and we'll do our best to get you in
- Supermemory docs: `https://supermemory.ai/docs`
- Supermemory pricing: `https://supermemory.ai/pricing` — Free tier covers 1M tokens / 10K queries per month, no credit card
- Telegram Bot API: `https://core.telegram.org/bots/api`
- Spec docs in the repo: `SPEC_AGENT.md`, `SPEC_TELEGRAM.md`, `SPEC_CRON.md`
- Cursor pricing: `https://cursor.com/pricing`
- Cursor students: `https://cursor.com/students`
- Claude for Education: `https://www.anthropic.com/news/introducing-claude-for-education`
- Codex for Students: `https://developers.openai.com/codex/students`
- OpenCode: `https://opencode.ai`

## 4. Viewer Notes

## Viewer Notes

- Do not commit `.env.local`.
- Rate limiting: guest users get 10 messages per hour. `lib/ai/entitlements.ts` and `lib/ratelimit.ts` control this. Don't explain the code, just show it works.
- The template ships with a geolocation block in the system prompt. We remove it later because it leaks the user's city into agent replies without them sharing it. Mention this when it comes up in Part 5.

---

## 5. Viewer Notes

## Viewer Notes

- Use a strong model for multi-hop demos. Claude Sonnet 4.6 is the default here.
- Native Composio is used here because it's fewer moving parts. MCP is better for multi-runtime setups but adds complexity for a first project.
- The free tier is enough for this tutorial. If you're at an early-stage startup and want more headroom, Composio runs a Startup Program (3 months unlimited credits + priority support) at `https://composio.dev/startups`. Mention this video in the "How did you find out about Composio?" field and we'll do our best to get you in.

---

## 6. Viewer Notes

## Viewer Notes

- Supermemory's free plan covers 1M tokens and 10K search queries per month, with no credit card. That's enough to build and demo this. Pricing: `https://supermemory.ai/pricing`.
- Memory is keyed by `containerTags: [user.id]`, so the same bucket is reused later when we add Telegram. Don't change the tag scheme — that's what makes cross-channel recall work in Part 6.

---

## 7. Viewer Notes

## Viewer Notes

- Telegram webhooks require public HTTPS. Use ngrok locally.
- `/telegram` is a developer debug page. `/admin/telegram` is what your users see.
- Telegram messages don't appear in the web sidebar. Separate for tutorial simplicity.

---

## 8. Viewer Notes / Gotchas

# Viewer Notes / Gotchas

Keep at the bottom. Reference during the video only when relevant.

## AI Gateway Credits

Vercel AI Gateway gives $5 of free credits every 30 days. Better models are more reliable for multi-step tool chains. If a cheaper model fails a workflow, try Claude Sonnet before concluding the integration is broken.

## Service Pricing

All three external services have free tiers that cover this tutorial end-to-end:

- **Composio** — free for individual builders. Early-stage startups can apply to the Startup Program (`https://composio.dev/startups`) for 3 months of unlimited credits and priority support. If a viewer applies, ask them to mention this video in the "How did you find out about Composio?" field.
- **Supermemory** — free plan: 1M tokens + 10K search queries / month, unlimited storage and users, no credit card. Pricing: `https://supermemory.ai/pricing`.
- **Vercel AI Gateway** — $5 of free credits every 30 days. Plenty for the demos in this video.

Don't oversell any of these on camera — just mention that they're free to start and the Startup Program exists if anyone watching is building a real product.

## Redis

Used for resumable streams and production rate limiting. The app works without it. Don't over-explain. Show Upstash homepage if you need something on screen.

## Rate Limiting

Show it works if you want. `lib/ai/entitlements.ts` controls per-user limits. `lib/ratelimit.ts` controls per-IP limits. Don't explain the implementation.

## Privacy: IP Geo Removed

The Vercel template injects `geolocation(request)` into every system prompt. We removed it. If the model sees city/country, it might surface it unprompted — e.g., baking the user's location into their soul during onboarding without them saying it. Weather works fine without it; `getWeather` accepts a city name and geocodes itself.

## Database / Migrations

`schema.ts` is the source of truth. Drizzle generates migration files. `db:migrate` applies them.

```bash
pnpm db:generate  # after editing schema.ts
pnpm db:migrate   # applies to database
```

## Telegram Gotchas

- Webhooks require public HTTPS. Use ngrok locally.
- ngrok URL changes on free tier. Re-register webhook each restart.
- Include the full path: `/api/telegram-webhook`.
- Old `last_error_message` can be stale in Telegram's webhook info. Trust `pending_update_count`.

## Cron

- Vercel Hobby: daily cron only.
- Local testing: `scripts/test-cron.sh`.
- Cron output goes to `lastOutput` in the database, not to a web chat message.

## What We Are Not Building

- Context compaction / summarization (TrustClaw has this — see `/Users/shawnesquivel/GitHub/trustclaw/src/server/api/routers/trustclaw/agent/CLAUDE.md`).
- Memory inspector page.
- Unified web + Telegram chat sidebar.
- Multi-org accounts.
- White-label bots per customer.

---

## 9. YouTube Chapters

# YouTube Chapters

1. Intro: what we're building
2. Deploy the chatbot template
3. Hands: Composio tools
4. Per-user auth + admin
5. Memory: Supermemory
6. Soul + onboarding
7. Anywhere: Telegram
8. Heartbeat: cron jobs
9. Final demo
10. Gotchas
