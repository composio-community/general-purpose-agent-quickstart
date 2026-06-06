# Part 7: Deployment — Get The Agent On A Real Domain

## [SPEAKER NOTE] Why Deployment Matters

Up to now everything has been running on `localhost:3000`. The only reason Telegram works at all in dev is because we punched a hole through ngrok, and the cron tick has to be triggered with a script.

In production we don't need any of that. The production URL is already public HTTPS, so Telegram can hit it directly. Vercel Cron can fire on its own schedule. There's no ngrok and no manual trigger script.

What changes from dev to prod is small: a different domain in env vars, re-registering the Telegram webhook against that domain, and a `CRON_SECRET` so cron is protected.

## [SPEAKER NOTE] What Stays The Same

The code itself doesn't change. Every part we built — Composio per-user identity, Supermemory container tags, the soul column, the Telegram webhook handler, the cron tick — all of it works in production unchanged.

That matters because most of the production hardening is just environment variables and one re-registration step.

## [SHOW ON SCREEN] Deploy

```bash
vercel deploy --prod
```

## [SPEAKER NOTE] Migrations Apply Automatically

The chatbot template's `package.json` runs `tsx lib/db/migrate && next build`, so Drizzle migrations run on every deploy.

If you added schema changes for soul, Telegram, or cron and forgot to commit a migration, the deploy will fail at this step. Fix it by running `pnpm db:generate` locally, committing the new migration file, and redeploying.

## [SHOW ON SCREEN] Set Production Environment Variables

In Vercel: **Project → Settings → Environment Variables → Production**.

Open the README → **Part 7: Deploying to Production** for the full checklist.

The big ones:

- `AUTH_SECRET`
- `POSTGRES_URL`
- `COMPOSIO_API_KEY`
- `SUPERMEMORY_API_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
- `CRON_SECRET`

## [SPEAKER NOTE] Why NEXT_PUBLIC_APP_URL Matters Most

The single most important env var to get right is `NEXT_PUBLIC_APP_URL`.

In dev it pointed at the ngrok URL. In production it has to point at the production domain. If it's still set to localhost or an old ngrok URL, the Telegram webhook registration step will register the wrong URL with Telegram and nothing will work.

Set it to your production domain — `https://your-app.vercel.app` or your custom domain — before re-registering the webhook.

## [SHOW ON SCREEN] Re-Register Telegram Webhook

```text
https://your-app.vercel.app/telegram
```

Click **Register webhook**.

## [SPEAKER NOTE] Why Re-Registering Telegram Is Required

The webhook URL lives on Telegram's servers, not ours. In dev we registered the ngrok URL. Telegram has no idea we deployed to a different domain unless we tell it.

So this step is the production equivalent of what we did in dev: open `/telegram` (now on the production domain) and click **Register webhook**. The button calls Telegram's `setWebhook` API with the new URL.

Once registered, Telegram will keep sending updates to the production URL across deploys. We don't need to re-register on every deploy. Only when the URL changes — say, switching to a custom domain.

## [SPEAKER NOTE] Don't Use The Preview URL

One important gotcha: do not use a Vercel preview URL.

Preview deploys have Vercel Deployment Protection enabled by default, which returns 401 to any request without a logged-in browser session. Telegram is not a browser, so the webhook would fail with 401 errors and you'd see them in `getWebhookInfo`.

Always register the production domain.

## [SHOW ON SCREEN] Confirm Telegram Is Healthy

After registering, check `/telegram` again. Look for:

- `pending_update_count = 0`
- `last_error_message` empty

## [SPEAKER NOTE] Vercel Cron In Production

Vercel Cron only fires on production deployments, never on previews. That's why during development we used a local script to trigger the tick manually.

In production, Vercel reads `vercel.json`, finds the cron entry, and starts firing the schedule automatically. We don't have to register anything ourselves.

Two things matter here. First, `CRON_SECRET` must be set in the production env. Vercel automatically sends it as `Authorization: Bearer ${CRON_SECRET}` on every cron call, and our tick route validates it.

Second, on the Hobby plan, Vercel Cron only allows daily expressions. If `vercel.json` has anything sub-daily, the deploy fails. Pro and Enterprise allow per-minute.

## [SPEAKER NOTE] maxDuration For The Cron Tick

One more cron-specific thing worth knowing.

The default function timeout is 300 seconds on Hobby and up to 800 seconds on Pro. Our tick route runs the agent for every due job sequentially, so if you have many jobs or slow tool calls, you can hit the timeout.

If that happens, set `export const maxDuration = 60` (or higher) on the tick route file. Beyond that, you'd want a queue, but that's out of scope for v1.

## [SPEAKER NOTE] Auth.js Is Basically Free

Auth.js v5 auto-detects the host on Vercel, so production deployment is essentially: set `AUTH_SECRET` in the production env vars and we're done.

No `AUTH_URL`, no `NEXTAUTH_URL`, no extra config. The same JWT cookies that work in dev work in production.

If you want to invalidate every session — say, after a security incident — just rotate `AUTH_SECRET`.

## [SPEAKER NOTE] Composio Production Polish

Composio works in production with no code changes. Same `COMPOSIO_API_KEY`, same per-user `session.user.id` scoping.

The one optional polish is using your own OAuth credentials per toolkit instead of Composio's shared/managed ones. The benefit is that users see your app's name on the OAuth consent screen instead of "Composio", plus higher rate limits and custom scopes if you need them.

To set this up, register an OAuth app with each provider you use, set the redirect URI to `https://backend.composio.dev/api/v3.1/toolkits/auth/callback`, and create a custom auth config in the Composio dashboard.

Until you do that, Composio's managed credentials keep working. This is a polish step, not a blocker.

## [SPEAKER NOTE] Supermemory In Production

Supermemory needs nothing extra. Set `SUPERMEMORY_API_KEY` in the production env and the same `containerTags: [user.id]` keeps user isolation working across the web app and Telegram in production.

## [SPEAKER NOTE] Watch Out For Deployment Protection

One more production-only gotcha worth saying out loud.

Vercel Deployment Protection has a setting called Standard Protection. If you turn it on for production, every request needs a logged-in browser session. That blocks Telegram and it blocks Vercel Cron, because neither of them is a browser.

The simple path is to leave production protection off. If you have to keep it on for compliance reasons, use Vercel's Protection Bypass for Automation and forward the bypass header from the webhook and cron routes.

By default, production is unprotected, so most projects don't need to do anything here.

## [SHOW ON SCREEN] Final Verify

- Sign in on the production URL.
- `/admin` shows Composio connections.
- DM the bot from Telegram → uses the same Gmail OAuth from the web app.
- `/admin/schedules` shows scheduled jobs; `lastRunAt` updates after the next tick fires.

## [SPEAKER NOTE] Conclusion

That's deployment.

Most of it was setting environment variables. The only thing we actually had to "do" was re-register the Telegram webhook against the production domain, because Telegram needs to know where to deliver messages and it doesn't auto-discover that.

The same code that ran in dev now runs in production, with the same per-user identity, the same memory bucket per user, the same soul, and the same scheduled jobs.

Now it's a real product, on a real domain, that real users can sign up and use.


x.com/shawnbuilds


All right, this last section is just the quick checklist for taking the agent from local to production.

1. First, update `NEXT_PUBLIC_APP_URL`. In local dev, this pointed at the ngrok URL so Telegram could reach our machine. In production, it needs to point at the real Vercel URL.
2. Then commit the project and push it to GitHub.
3. After that, double-check the production environment variables from the README. The important ones are the app URL, Telegram secrets, Composio, Supermemory, Postgres, auth, and cron.
4. Once the app is live, open `/telegram` on the production domain and register the webhook again.

That's it. If something breaks, open an issue on GitHub or message me on Twitter and I'll help debug it.