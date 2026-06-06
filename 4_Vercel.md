# Vercel AI SDK Template

## Overview

## [ON SCREEN]: Show Agent Body / Brain / Hands Diagram

Use the diagram while explaining:

- Body = UI the user sees
- Brain = model through Vercel AI Gateway
- Hands = tools like Gmail, Slack, Linear, Notion, GitHub

## [SPEAKER NOTE] Overview

Alright, in this section, here's a quick outline of how we're going to be building things.

We've already gone over the intro. The first thing we're going to do is build the UI up using the Vercel AI SDK. This is going to be the body, or what the user sees on the outside.

You can think of the brain of this agent as being the AI models. Whether that's Claude Sonnet, whether that's Kimi 2.5, or an open-source model, these are the things living as the brain so that your agent can do things in the real world.

What actually defines an agent?

An AI agent is a software program that can perceive its own environment, reason, plan, and autonomously execute multi-step tasks to achieve a specific goal, often using external tools.

The tools in this case are any apps that you already use in your personal life or business. That could be communication tools like Slack and Gmail, productivity tools like Linear and Notion, or developer tools like GitHub.

You can think of these tools as being the actual hands of your AI agent.

Anytime our AI agent runs a tool, it's essentially looking at a description of all the things it has available, using its brain to determine which tool it should use, and then going ahead and using that tool.

The better the brain, the better this tends to work. If you're using Claude Sonnet 4.6, it's probably going to be better at planning, executing, and using the right tool than a cheaper open-source model like Kimi 2.5, which just doesn't have the same intelligence level as the latest GPT or Anthropic models.

## Tutorial Part

## [SHOW ON SCREEN] Open The Template

Open the repo README or YouTube description, then go to:

```text
https://vercel.com/templates/next.js/chatbot
```

Click **Deploy**.

## [SPEAKER NOTE] Open The Template

Okay, in this section of the tutorial, first we'll go to the Vercel.com templates Next.js chatbot.

You can go to the README file of the GitHub repo to get this link. We're on step one here, part one, and we can just click the link here, or you can check out the YouTube description.

We're going to go to the Vercel.com templates Next.js chatbot, and we're just going to click Deploy here. If you don't already have a Vercel account, you can sign up or sign in.

## [SHOW ON SCREEN] Project Resources

During deploy:

1. Connect GitHub if needed.
2. Create a private repository.
3. Use the default project name or rename it.
4. Pick your Vercel team.
5. Add the default project resources:
   - Neon
   - Upstash Redis
   - Vercel Blob

## [SPEAKER NOTE] Project Resources

Now we'll set up the project resources so we can hook up our GitHub account if we haven't already connected it to Vercel.

Then we'll create a private repository name. I'll just use the default here, `chatbot`, and I'll use my default Vercel team, which is my Hobby plan.

Then we'll go ahead and add all of the default project resources to our app.

The first one is Neon. This is where our chats get stored. Neon is a serverless Postgres database, which is one of the most popular database types in the world, just hosted for us by Neon. This is also where our user signup data is going to go.

The auth service that Next.js uses here is Auth.js. You can read more about it on their website, but the important thing is that it hooks into Next.js really easily and stores user data in our database.

The second service is Upstash Redis. This is used for things like rate limiting and resumable streams. We don't need to deeply understand Redis for this tutorial, but it's one of the services that helps make the chatbot production-ready.

And finally, we have Vercel Blob. This allows us to use file uploads so users can upload additional files in their chats.

In the background, Vercel is going to provision these services for us and automatically inject the relevant environment variables, like the Redis URL or the `BLOB_READ_WRITE_TOKEN`, into our project environment settings so that our deployed app can pick those up at runtime.

As always, never commit your `.env` file or `.env.local` file, or you'll expose secrets that may allow other people to control your AI, database, storage, and auth provider accounts.

## [SHOW ON SCREEN] Run Locally

Run:

```bash
npm i -g vercel
vercel link
vercel env pull
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

Then open:

```text
http://localhost:3000
```

## [SPEAKER NOTE] Run Locally

Okay, next we're going to set this up locally.

First, we'll run `npm i -g vercel`. This installs the Vercel CLI locally.

Then we'll run `vercel link`. This links our local instance with our Vercel and GitHub accounts. You can verify this by checking the `.vercel` folder that it creates.

Then we can run `vercel env pull`. This downloads our environment variables into the local project.

Then we can go back to our README and copy these commands:

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

`pnpm` is our package manager. `pnpm install` installs the dependencies. `pnpm db:migrate` sets up the database and applies the schema changes. Then `pnpm dev` starts the app on our local computer at `localhost:3000`.

## [SHOW ON SCREEN] Test The Template

In the local app, test:

```text
Write a for loop for me in Python.
```

Then test:

```text
What's the weather in San Francisco?
```

Optionally test document creation:

```text
Write me a short essay about AI agents.
```

## [SPEAKER NOTE] Test The Template

So out of the box, you're going to see that the Vercel AI SDK uses the Vercel AI Gateway router. This gives us access to a lot of the latest models like Claude Sonnet, Kimi 2.5, DeepSeek, and GPT.

We can test this by asking it to write a for loop for us in Python. You can see that it generates a code block for us, which is a nice little UI touch.

It has similar UIs if we ask for weather or if we ask it to write documents. That's what I like about starting from this template. We're not just getting an API route. We're getting a whole chat experience with streaming, model selection, tool calls, and dynamic UI.

## [SHOW ON SCREEN] Rate Limiting

Show `lib/ratelimit.ts`.

Then show Vercel dashboard:

```text
Vercel Dashboard -> AI Gateway
```

## [SPEAKER NOTE] Rate Limiting And AI Gateway Credits

The last thing that we will see here out of the box from Vercel, which I really love, is that they've included rate limiting.

What this means is that because it costs money, or Vercel credits in this case, to interact with our chatbot, you can imagine that there could be bad actors who spam our chatbot and use up all the credits that we're giving to users.

What Vercel has done really nicely here for us out of the box is given us rate limiting. If guest users spam the chatbot, they'll get IP rate limited, so the chatbot will stop replying to them.

By default, this is 10 messages per hour at the time of filming, but you can go into `lib/ratelimit.ts` and bump this up to maybe 100 messages so that it doesn't block you while you're testing.

If you want to look up how many credits you currently have, you can go to your Vercel dashboard, go to your projects on the left-hand side, and search for AI Gateway.

Vercel gives you $5 every 30 days just for testing. You can increase this if you're starting to present the app to users. It refreshes every month, and they don't upcharge you for tokens, so you're not paying some marked-up rate for using the Vercel AI Gateway router feature.
