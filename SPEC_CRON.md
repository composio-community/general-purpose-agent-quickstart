# Spec: Agent-managed scheduled tasks (CRONs)

## Goal

Let the agent create, list, and cancel **per-user scheduled tasks** from chat. A task is a natural-language prompt + a cron expression. When a task is due, our backend re-runs the agent (with that user's Composio tools) using the saved prompt — no human in the chat.

## Use case (demo script for the video)

User in chat: *"Send me a Gmail summary of my unread emails every weekday at 9am."*

Agent calls `scheduleTask({ cronExpression: "0 9 * * 1-5", prompt: "Fetch unread Gmail from the last 24h, summarize the top 5, and email me the summary." })` → row inserted in `cron_jobs`.

To demo without waiting overnight, run `scripts/test-cron.sh make-due <id>` and curl the tick endpoint. Viewers see the agent re-run the same prompt autonomously, hitting the user's real Gmail through Composio.

User then in chat: *"Show my schedules"* → agent calls `listMySchedules()` → list rendered.
User: *"Cancel the morning briefing"* → agent calls `cancelSchedule({ id })` → row deleted.

## In scope (v1)

1. **`CronJob` table** in Postgres (Drizzle): `id, userId, cronExpression, timezone, prompt, enabled, nextRunAt, lastRunAt, lastError, lastOutput, createdAt`.
2. **One Vercel cron** in `vercel.json` ticking every minute → `/api/cron/tick`.
3. **`/api/cron/tick`** (GET): authenticates with `CRON_SECRET`, selects due rows, runs each agent inline (Composio tools loaded with `row.userId`), updates `nextRunAt` / `lastRunAt` / `lastError` / `lastOutput`.
4. **Three agent tools** added to chat:
   - `scheduleTask({ cronExpression, prompt, timezone? })`
   - `listMySchedules()` (also returns `lastOutput`)
   - `cancelSchedule({ id })`

   Each tool captures `session.user.id` from the chat route closure (same pattern as `createDocument`). No hardcoded userIds.
5. **`/admin/schedules` page** — list all schedules for the logged-in user with a delete button (calls `DELETE /api/schedules/:id`) and a collapsible "Last output" panel.
6. **`scripts/test-cron.sh`** — subcommands: `list`, `make-due <id> [offset]`, `trigger`, `status <id>`, `delete <id>`.

## Explicitly NOT in scope (v1)

These are deliberate cuts from the trustclaw pattern. They matter at scale but not for the tutorial demo. Mentioned at the end of the video as homework.

- **DB-level locking** (`lockedAt`, `lockedBy`, fencing tokens, atomic claim). v1 runs jobs serially in one tick handler — fine for a few users, dangerous if many concurrent crons fire and two ticks overlap.
- **Stale-lock recovery.** Without locking, not needed in v1.
- **Split claim/execute routes.** v1 runs everything inline in `/api/cron/tick`; risks the 60s function timeout if jobs are long.
- **Per-instance batching.** We're per-user, not per-instance.
- **Backfill on missed ticks.** If Vercel skips a tick, the job runs once on the next tick — not multiple catch-up runs.
- **Telegram delivery.** Output is whatever the agent does with its tools (e.g. it sends an email via Gmail). No separate channel yet.
- **Approval flow on schedule creation.** Agent creates schedules immediately; user can cancel.

## ⚠️ Local dev caveats (read before testing)

These are gotchas anyone working on this codebase will hit. Document them up front.

### 1. **Vercel crons do NOT fire on `pnpm dev`.**

Vercel's cron scheduler only exists on deployed Vercel infrastructure. There is no equivalent on localhost. So even if `vercel.json` is correct, your local `next dev` server will never auto-call `/api/cron/tick`.

To test locally, you MUST manually trigger:

```bash
./scripts/test-cron.sh trigger
```

Symptom of forgetting this: `lastRunAt = "never"` on `/admin/schedules` even though the job was scheduled hours ago. **Not a bug** — nothing is calling the tick route.

### 2. **Auth is bypassed in dev.**

`/api/cron/tick` skips the `Authorization: Bearer ${CRON_SECRET}` check when `NODE_ENV !== "production"`. This is so the local test script works without juggling secrets. **Production builds enforce the header**; Vercel auto-injects it for crons declared in `vercel.json`.

### 3. **Migrations hit whatever `POSTGRES_URL` points to.**

In this codebase, `.env.local`'s `POSTGRES_URL` is the **same Neon DB** as production. Running `pnpm db:migrate` locally migrates production. This is intentional for the tutorial (single DB simplifies the narrative) but be aware.

The build script `"build": "tsx lib/db/migrate && next build"` also re-runs migrations on every Vercel deploy. Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN`).

### 4. **Test workflow (local)**

```bash
# 1. In chat, ask the agent: "Schedule a task that says hello every minute."
# 2. Find the id:
./scripts/test-cron.sh list

# 3. Force it past nextRunAt (or wait):
./scripts/test-cron.sh make-due <id>

# 4. Fire the tick endpoint manually:
./scripts/test-cron.sh trigger

# 5. Verify lastRunAt advanced and lastOutput populated:
./scripts/test-cron.sh status <id>
# OR refresh /admin/schedules in the browser
```

### 5. **Production verification**

After deploy:

1. Vercel dashboard → Project → Settings → Cron Jobs. Confirm `/api/cron/tick` is registered with `* * * * *`.
2. Schedule a one-minute test job in chat on the deployed URL.
3. Wait ~90 seconds. Refresh `/admin/schedules`. `lastRunAt` should populate.
4. If it doesn't fire: check Vercel function logs for `[cron <id>]` lines, and that `CRON_SECRET` env var is set in prod.

## Plan (build order)

1. **Add `cron-parser` dep** for cron expression parsing + `computeNextRunAt`.
2. **Schema**: add `cron_jobs` to `lib/db/schema.ts`, generate migration with `pnpm db:generate`, push with `pnpm db:migrate`.
3. **Queries**: add `lib/db/queries.ts` helpers — `createCronJob`, `getDueCronJobs`, `updateCronJobAfterRun`, `getCronJobsByUserId`, `deleteCronJob`.
4. **Tick route**: `app/api/cron/tick/route.ts` — auth → select due → for each, build Composio session for `row.userId`, run `generateText` with `row.prompt` + tools, update row.
5. **Tools**: `lib/ai/tools/schedule-task.ts`, `list-my-schedules.ts`, `cancel-schedule.ts`. Wire into chat route's `localTools`.
6. **Schedules API**: `app/api/schedules/route.ts` (GET list) + `app/api/schedules/[id]/route.ts` (DELETE).
7. **Admin page**: `app/admin/schedules/page.tsx` — server component, lists user's schedules, client subcomponent for delete button.
8. **vercel.json**: change `/api/cron/demo` → `/api/cron/tick`.
9. **Test script**: rewrite `scripts/test-cron-demo.sh` → `scripts/test-cron.sh` with subcommands.

## Production correctness (v1)

- **Per-user isolation**: every row stores `userId`. The tick route loads Composio tools as `composio.create(row.userId).tools()`. No cross-user leakage.
- **Auth**:
  - Tick route requires `Authorization: Bearer ${CRON_SECRET}` in production. Vercel auto-injects this header for crons declared in `vercel.json`. Bypassed when `NODE_ENV !== "production"` so the test script works.
  - Schedules API + admin page require `auth()` session. Delete endpoint validates `WHERE id = $1 AND userId = $2`.
- **Guest users**: blocked from creating schedules (same gate as Composio in chat route).
- **Cron expression validation**: tools call `CronExpressionParser.parse()` from `cron-parser` and reject invalid input before insert.
- **Idempotency**: tick uses `nextRunAt <= NOW()` to claim rows; after run, recomputes `nextRunAt` from the cron expression. A duplicate tick within the same minute is safe (row already advanced).
- **Required env vars in prod**: `CRON_SECRET`, `POSTGRES_URL`, `COMPOSIO_API_KEY`, `AI_GATEWAY_API_KEY` (or OIDC), `AUTH_SECRET`.

## Files added/changed

| File | Action |
|---|---|
| `lib/db/schema.ts` | add `cronJob` table |
| `lib/db/queries.ts` | add 5 helpers |
| `lib/db/migrations/0001_third_morbius.sql` | new — creates `CronJob` table |
| `lib/db/migrations/0002_curious_korvac.sql` | new — adds `lastOutput` column |
| `lib/cron/cron-utils.ts` | new — `computeNextRunAt`, `validateCronExpression` |
| `lib/ai/tools/schedule-task.ts` | new |
| `lib/ai/tools/list-my-schedules.ts` | new |
| `lib/ai/tools/cancel-schedule.ts` | new |
| `app/(chat)/api/chat/route.ts` | wire 3 tools into `localTools` |
| `app/api/cron/tick/route.ts` | new |
| `app/api/schedules/route.ts` | new (GET) |
| `app/api/schedules/[id]/route.ts` | new (DELETE) |
| `app/admin/schedules/page.tsx` | new |
| `app/admin/schedules/delete-button.tsx` | new (client component) |
| `vercel.json` | retarget cron to `/api/cron/tick` |
| `scripts/test-cron.sh` | new |
| `package.json` | add `cron-parser` |

## Schema reference (for downstream agents)

```sql
CREATE TABLE "CronJob" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId"         uuid NOT NULL REFERENCES "User"("id"),
  "cronExpression" varchar(64) NOT NULL,           -- standard 5-field cron
  "timezone"       varchar(64) NOT NULL DEFAULT 'UTC',
  "prompt"         text NOT NULL,                  -- self-contained instruction
  "enabled"        boolean NOT NULL DEFAULT true,
  "nextRunAt"      timestamptz NOT NULL,           -- claim if <= now() AND enabled
  "lastRunAt"      timestamptz,                    -- when last fired
  "lastError"      text,                           -- error message if last run failed
  "lastOutput"     text,                           -- agent's final text output
  "createdAt"      timestamptz NOT NULL DEFAULT now()
);
```
