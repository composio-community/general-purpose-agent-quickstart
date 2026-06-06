# Part 6: Heartbeat — Let The Agent Run On A Schedule

========== PART 1 — WHY HEARTBEAT ==========

## [SPEAKER NOTE] Why Heartbeat

Up until now we've had to message our agent in a manual, turn-based way. That means unless you're constantly chatting with it, it isn't doing anything for you.

Like most people messaging ChatGPT or Claude, the AI can only do things when you start the conversation off. But to make truly usable; our agent should act more like an employee - once we've discussed how we like to do things, it should be able to go and do those things by itself. 

And that's what we're going to build next.

Instead of an agent that only works when you message it, we're going to give it a heartbeat — the ability to wake up on its own and run pre-defined workflows.

We're taking a lot of inspiration from OpenClaw's heartbeat here. If you go to the OpenClaw showcase, you'll see people running daily family meal-planning systems, swarms of AI agents, and heat maps generated from workout logs. The unifying idea is the same: we specify a task to our agent, it  runs it on a schedule - completely hands off.

========== PART 2 — HOW VERCEL CRON WORKS ==========

## [SHOW ON SCREEN] Heartbeat Diagram

Show `tutorial/excalidraw/14-cron-heartbeat-flow.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] How Vercel Cron Works

The simplest way to think about this is that we're creating a scheduling tool. In software engineering, these are called cron jobs.

We're going to use Vercel Cron, which calls one URL on a predetermined schedule. In our case, that URL is `/api/cron/tick`.

The flow is:

1. The user asks the agent in chat: "schedule this every day at 9 AM."
2. The agent calls a `scheduleTask` tool, which writes a row into Postgres.
3. Every day, Vercel hits `/api/cron/tick` on a schedule.
4. That route checks the database for jobs that are due and runs the agent for each one with the saved prompt.

So Vercel Cron is not storing every user's schedule for us. Vercel Cron is just the heartbeat. Our database stores the user-created schedules.

## [SPEAKER NOTE FOR DIAGRAM] The Schedule Task Tool

We already have Composio tools, weather tools, and Supermemory tools. Now we're adding another tool called `scheduleTask`.

When the user says something like "schedule this every day at 9 AM," the model picks up the task and the time. It calls `scheduleTask` with both, and that adds a new row to the cron jobs table.

========== PART 3 — DEMO PREVIEW ==========

## [SHOW ON SCREEN] Live Demo

In chat, ask:

```text
Every morning at 9, summarize my latest emails and tell me if anything is urgent.
```

Show:

1. `scheduleTask` tool call.
2. `/admin/schedules` shows the row.
3. Click **Run now** on the row → tick runs that job.
4. `lastOutput` updates on the page.

## [SPEAKER NOTE] Live Demo

The agent calls `scheduleTask`, which writes a row to the database. That row stores the user ID, the cron expression, the timezone, and the prompt that should run later.

When the tick route runs, it finds due jobs and re-runs the agent with the saved prompt. That means the scheduled job can still use Gmail, memory, and the same per-user tool access.

We're also adding a **Run now** button on the admin page so we can trigger a single job manually. That way we don't have to wait for the daily cron tick to confirm the workflow works.

========== PART 4 — BUILD WITH AGENT-READY PROMPT ==========

## 🤖 [SHOW ON SCREEN] Agent-Ready Prompt

Open README → **🤖 Agent-Ready Prompt 6 — Agent-managed cron schedules**.

Copy the prompt into Cursor.

## [SPEAKER NOTE] Prompt Overview

There are three main components to this prompt.

First, we add a new `CronJob` table to hold all the scheduled jobs.

Second, we add three tools the model can call: `scheduleTask` to create new ones, `listMySchedules` to see what's coming up, and `cancelSchedule` to remove one.

Third, we add the `/api/cron/tick` route. This is the URL Vercel Cron hits on a schedule. We also build the `/admin/schedules` page so users can see their jobs, delete them, and manually run any single job with a **Run now** button.
## [SPEAKER NOTE] Test The Scheduled Task

Okay, so it looks like it's done. Let's go test this out and make sure it works.

Here I'm just going to ask my chatbot, "Hey! Check my emails."

It uses the Composio search tool and execute tool to fetch my 10 latest emails.

Then I tell it that every day at 9:00 am I want to look at my last 5 emails and create a draft for them.

It schedules a task, creates the right cron expression — this just means every day at 9:00 am — and sets the time zone for me, which I can check and change manually if I want.

It then creates the prompt that's going to run every single day: "Fetch my 5 most recent Gmails, including the ones I already sent."

This is what's actually going to get executed every single day, and we can see the result that it worked properly.

I ask my agent to list my scheduled tasks, and once again it calls one of the new tools we made, which is "List my schedules."

There are no inputs for this. It just lists all the schedules, and we can then see the exact same schedule that we just made — 9:00 am.

You can see the full prompt there, and then the agent summarises it for us.

If we go to `localhost:3000/admin/schedules`, we can see the task here. I'm actually just going to run it right here to make sure everything's working.

Finally, we can delete the task if we don't want it.

========== PART 5 — HOBBY PLAN NOTE ==========

## [SPEAKER NOTE] Quick Note On Hobby Plan

Because we're on the free Vercel Hobby plan, Vercel Cron only supports daily expressions, not minute-level. That means the tick route only runs once per day in production.

For this tutorial that's fine — the point is the architecture. Vercel wakes up the app on a schedule, and our database decides which user jobs are due.

If you want minute-level checks in production, upgrade to Vercel Pro or use any external cron service that hits `/api/cron/tick` with the same `CRON_SECRET`.

========== PART 6 — CONCLUSION ==========

## [SPEAKER NOTE] Conclusion

Now our agent has a heartbeat. It can run actively without the user chatting with it.

At this point we have the full loop:

- a chat UI
- real tools
- persistent memory
- personality
- Telegram access
- scheduled tasks that run while you're sleeping

In the final section, we'll go over a quick production checklist for getting all of this running properly when you serve it to real users. See you there.
