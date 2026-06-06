# Part 5: Telegram — Let Users Chat From Anywhere

========== PART 1 — WHY TELEGRAM ==========

## [SPEAKER NOTE] Why Telegram

You might have seen popular AI tools living inside messaging apps like iMessage, Slack, Discord, or Telegram.

And from a product standpoint, that makes sense.

This is basically a distribution problem: meet users where they already are.

There are way more active smartphones in the world than laptops and desktop computers. So if your AI agent only lives inside a browser tab, you're making users come to you instead of putting the agent where they already spend time.

Since ChatGPT came out, most people have interacted with AI inside a web app. You go to ChatGPT, Claude, or some other website. That usually means you're talking to AI when you're already on your laptop.

But what do you always have on you?

Your phone.

So in this section, we're going to make our agent accessible through the Telegram mobile app.

The key idea is that Telegram is not a separate agent. It's just another front door into the same app.

Same user information. Same Composio tools. Same Supermemory bucket. Same soul.

## [SHOW ON SCREEN] Telegram Why Diagram

Show `tutorial/excalidraw/11-telegram-same-agent.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Same Agent, New Channel

Our web app and Telegram both point to the same agent runtime.

Once the Telegram chat is linked to the web user, both channels use the same `user.id`.

That is what makes the whole thing work.

If I connected Gmail on the web app, Telegram can use that same Gmail connection. If the agent remembered something in the web app, Telegram can search that same Supermemory bucket. If the agent has a soul, Telegram uses that same soul too.

========== PART 2 — SETUP OVERVIEW ==========

## [SHOW ON SCREEN] What We're Going To Do

Show `tutorial/excalidraw/12-telegram-setup-steps.excalidraw`.

## [SPEAKER NOTE] Setup Overview

This setup might sound complicated, but the pieces are pretty simple.

First, we create a Telegram bot with BotFather. This gives us a bot token. Even tools like OpenClaw use this same general setup for Telegram.

## [SHOW ON SCREEN] BotFather Screenshot

Show `tutorial/screenshots/botfather-create-bot.png`.

This is the basic flow:

1. Message BotFather with `/newbot`.
2. Choose a display name.
3. Choose a username that ends in `bot`.
4. Copy the bot token and username into `.env.local`.

Generate a webhook secret:

```bash
openssl rand -hex 16
```

Then add:

```text
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=your_random_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

We'll replace `NEXT_PUBLIC_APP_URL` with the ngrok URL later, after the Telegram code exists.

Do not show your real bot token on screen. The screenshot in the repo is redacted.

## [SPEAKER NOTE] Continue Setup Overview

Second, we create a webhook secret. This is basically a password Telegram sends with each request so our app can verify the request really came from Telegram.

Third, because we're developing locally and Telegram needs a public HTTPS URL, we use ngrok.

One-liner: ngrok is a temporary public tunnel to your local app. It gives Telegram a real URL, and forwards those requests to `localhost`.

Fourth, we copy that ngrok URL into `.env.local` so our app knows its public URL.

Fifth, we register our webhook URL.

And finally, the user links their Telegram account from the app.

## [SPEAKER NOTE] Stop Before Testing Telegram

Important: at this point, the bot exists, but our app still does not know how to receive Telegram messages.

So don't test `/start` yet. Plain `/start` will not do anything useful until after we build the Telegram feature, register the webhook, and generate a link token from `/admin/telegram`.

========== PART 3 — BUILD WITH AGENT-READY PROMPT ==========

## 🤖 [SHOW ON SCREEN] Agent-Ready Prompt

Open README → **🤖 Agent-Ready Prompt 5 — Telegram bot + account linking + cross-channel agent**.

Copy the prompt into Cursor.

## [SPEAKER NOTE] Prompt Overview

There are three main pieces in this prompt.

First is the Telegram Bot API wrapper. These are helper functions for sending messages, registering the webhook, and checking bot info.

Second is the webhook route. This is the listener where Telegram sends incoming messages.

Third is the linking system. This maps a Telegram chat ID to one of our app users.

We also add a `TelegramTurn` table. Telegram does not have the same chat sidebar as the web app, and every Telegram message is a standalone webhook request, so we store the last few turns ourselves.

## [SHOW ON SCREEN] After Cursor Finishes

Run the migration:

```bash
pnpm db:generate && pnpm db:migrate
```

Then restart the dev server so it picks up the new code and env vars.

```bash
pnpm dev
```

========== PART 4 — STOP BEFORE NGROK + DEMO SETUP ==========

## [SHOW ON SCREEN] Install ngrok

If you already have ngrok installed, this command is fine to run again. Homebrew will just say it is already installed or upgrade it.

```bash
brew install ngrok
```

Then connect ngrok to your account. You only need to do this once per machine.

```bash
ngrok config add-authtoken <your-ngrok-authtoken>
```

You can get the authtoken from the ngrok dashboard after creating a free account.

## [SHOW ON SCREEN] Terminal — Start ngrok

Open a second terminal window and run:

```bash
ngrok http 3000
```

Keep this terminal running while testing Telegram locally.

Copy the HTTPS forwarding URL. It should look something like:

```text
https://abc123.ngrok-free.app
```

## [SHOW ON SCREEN] Update `.env.local`

Open `.env.local` and set:

```text
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
```

Use your actual ngrok URL. Do not add `/api/telegram-webhook` here — just the base URL.

Then restart the dev server again so Next.js picks up the new public URL.

```bash
pnpm dev
```

## [SPEAKER NOTE] ngrok Gotcha

On the free ngrok plan, this URL changes when you restart ngrok.

So if Telegram stops hitting your local app, the first thing to check is whether your ngrok URL changed. If it did, update `.env.local`, restart `pnpm dev`, and register the webhook again.

========== PART 5 — BEFORE WEBHOOK EXPLANATION ==========

## [SHOW ON SCREEN] What Is A Webhook Diagram

Show `tutorial/excalidraw/13a-what-is-a-webhook.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Webhook Mental Model

A webhook is how Telegram taps our app on the shoulder.

Instead of our app constantly asking Telegram, "do you have any new messages?", Telegram sends the message to our app the moment it arrives.

That's why we need a webhook URL.

## [SHOW ON SCREEN] Webhook Flow Diagram

Show `tutorial/excalidraw/13-telegram-webhook-flow.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Webhook Flow

Before we go too deep, here's the simple definition.

A webhook is just a URL where another service can send your app an event.

In our case, the event is: "a Telegram user sent the bot a message."

So the flow is:

1. The user sends a message in Telegram.
2. Telegram posts that message to our webhook route.
3. Our app checks the secret header.
4. Our app finds the linked user by `telegramChatId`.
5. We run the same agent runtime.
6. We send the answer back with the Telegram Bot API.

The agent can use Composio, Supermemory, and the saved soul because everything maps back to the same app user.

The webhook should return quickly, so our route responds right away and runs the agent work in the background with `after()`.

## [SHOW ON SCREEN] Register Webhook

Now we need to tell Telegram where our app lives.

The `.env.local` update only tells our app, "my public URL is this ngrok URL."

But Telegram still does not know where to send messages for this bot.

So we open our debug page:

Open:

```text
/telegram
```

Click **Register webhook**.

That button calls Telegram's `setWebhook` API. Conceptually, we're telling Telegram:

```text
When someone messages this bot,
send the update to:
NEXT_PUBLIC_APP_URL/api/telegram-webhook
```

So yes, this registration is happening on Telegram's side. Our app stores the URL in `.env.local`, then we register that URL with Telegram.

When we register the webhook, we also send a few important options:

1. `secret_token` — Telegram sends this back in the `X-Telegram-Bot-Api-Secret-Token` header.
2. `allowed_updates: ["message"]` — we only want normal messages for v1.
3. `drop_pending_updates: true` — useful in local dev so old Telegram updates do not replay after you reconnect ngrok.

If this fails, check three things:

1. `ngrok http 3000` is still running.
2. `NEXT_PUBLIC_APP_URL` matches the current ngrok HTTPS URL.
3. The dev server was restarted after editing `.env.local`.

Also check `getWebhookInfo` on the `/telegram` page. Telegram reports useful errors there, like the last delivery error and pending update count.

If you see `307 Temporary Redirect`, that usually means your app's auth proxy or middleware is redirecting Telegram instead of letting the webhook route run. The webhook route must bypass auth because Telegram is not a logged-in browser user.

One more gotcha: Telegram has two ways to receive updates — polling with `getUpdates`, or push with `setWebhook`. Once a webhook is set, `getUpdates` will not work until you delete the webhook.

========== PART 6 — LINKING DEMO ==========

## [SHOW ON SCREEN] Linking Demo

Show:

1. `/admin/telegram`
2. Click **Link Telegram**
3. Send `/start <token>` to the bot — not plain `/start`
4. Telegram replies "Linked"
5. Web page flips to linked

## [SPEAKER NOTE] Linking Demo

The linking flow connects a Telegram chat to a user in our app.

After the user clicks **Link Telegram**, we generate a short one-time token.

Then the user sends `/start <token>` to the bot. The token matters — plain `/start` does not link the account.

When the webhook sees that token, it writes the Telegram chat ID onto the user's row in Postgres.

From that point on, when that Telegram chat sends a message, we know exactly which app user it belongs to.

========== PART 7 — BEFORE SECOND LIVE DEMO ==========

## [SHOW ON SCREEN] Live Demo

From Telegram, send:

```text
what do you know about me?
```

Then send:

```text
fetch my latest emails
```

## [SPEAKER NOTE] Live Demo

Now that Telegram is linked, I can ask what it knows about me.

It should search Supermemory and recall the same facts that were created in the web app.

Then I can ask it to fetch my latest emails.

This uses the same Composio Gmail connection. I do not need to OAuth again from Telegram because Telegram is linked to the same app user.

========== PART 8 — CONCLUSION ==========

## [SPEAKER NOTE] Conclusion

Now our agent is no longer trapped in the browser.

Users can talk to the same agent from Telegram, with the same tools, the same memory, and the same personality.

That is a big product upgrade. Instead of only being able to talk to the agent in a web app, users can talk to it from a messaging app they already use every day.

In the next section, we'll add one of the most powerful OpenClaw-style features: scheduled jobs. This is where the agent starts to feel more hands-off.
