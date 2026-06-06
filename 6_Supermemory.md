# Part 3: Supermemory — Give The Agent Long-Term Memory

## [SPEAKER NOTE] Quick Recap

All right, so quick recap of what we've built so far, going back to our body analogy.

First, we built the body with the Vercel chatbot template. This is what the user interacts with and sees.

Then we gave the agent hands with Composio, so now it can connect to tools like Gmail, Notion, and GitHub.

We connected the agent to models through Vercel AI Gateway.

And we added the latest models so we can get better intelligence in our AI agent.

Right now, the agent still has one big missing piece that really improves the usability of a chatbot: long-term memory.

Supermemory is a managed memory layer for AI apps that lets the agent store, search, and recall important facts about the user across conversations.

You could build this yourself with a database, embeddings, search, and ranking, but Supermemory abstracts that so we can treat memory as another optional tool in our agent.

You can go to `supermemory.ai/pricing` to see how their pricing works.

At the time of recording, they have $5 of monthly usage built in. They also have a startup and research program where you can get $1,000 in free credits, so it's worth applying if you want to keep building with Supermemory.

## [SHOW ON SCREEN] Body Analogy Diagram

Show `tutorial/excalidraw/7-supermemory-body-analogy.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Body Analogy

If the LLM is the brain that reasons in the moment, and the context window is the short-term memory, we can think of Supermemory as the long-term memory.

This is where the agent stores important facts that it can remember later and only bring up when they're relevant.

Within Supermemory, our agent can store important facts like:

- name
- preferences
- projects you're working on
- other important nuances it picks up through chatting with you over time

The important thing is that this memory lives across conversations. If you create a new chat, the normal chat context is gone. Without long-term memory, the agent will not remember what your name is.

## [SHOW ON SCREEN] Prompt / Tool Diagram

Show `tutorial/excalidraw/8-supermemory-prompt-flow.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] What Happens In The Prompt

The way this works is pretty simple.

We're going to use Supermemory as another tool, just like we did with Composio.

The model will see tools like `addMemory`, `searchMemories`, and `getProfile`.

When the user says something worth remembering, like "my name is Shawn," the model can say, "Hey, I should remember this fact for later," and then call `addMemory`.

Then later, if the user says something like "fill in this form for me," the chatbot should remember that the user's name is Shawn.

It can do that by using either `searchMemories` or `getProfile`, depending on the type of fact.

The key thing here is that we're not dumping every memory into the prompt on every single message. That would be slow and expensive.

Instead, the system prompt gives the model rules for when it should use the memory tools.

So let's check out that setup in the README.

## [SHOW ON SCREEN] Setup

Open the README and show **Part 3: Memory — Supermemory**.

Then show:

```text
SUPERMEMORY_API_KEY=sm_...
```

## [SPEAKER NOTE] Setup

This setup is pretty simple.

First, we're going to create a Supermemory API key.

Then we're going to store it in our `.env.local` file, and also in our Vercel environment variables for production.

Then we're going to install the Supermemory tools package.

After that, we're going to copy the agent prompt from the README and paste it into Cursor.

The key implementation detail here is that the container tags should include `session.user.id`.

That means each user's memories go into their own memory bucket.

Later on, when we add Telegram, the Telegram bot will still use that same user ID. So memories are shared across the web app and the Telegram interface.

## [SHOW ON SCREEN] Supermemory API Key

Go to Supermemory, create an account, open settings, and copy the API key.

Then add it to `.env.local`:

```text
SUPERMEMORY_API_KEY=sm_...
```

Then go to the Vercel dashboard for the chatbot project and add the same key to the production environment variables.

## 🤖 [SHOW ON SCREEN] Agent-Ready Prompt

Open README → **🤖 Agent-Ready Prompt 3 — Wire Supermemory into the chat route**.

Copy the prompt into Cursor.

## [SPEAKER NOTE] Cursor Prompt Overview

Now we're ready for the Cursor prompt.

I'll grab the prompt from the README, paste it into Cursor, and tag the repo folder so Cursor has the right project context.

This prompt is asking the agent to do three things.

First, add Supermemory to the list of tool definitions, where we already have local tools like the weather tool and the Composio tools.

Second, enable memory for signed-in users, while making sure guest users do not get long-term memory.

Third, add the system prompt rules so the model knows when to store and recall memories.

That way, our agent knows when to use memory instead of trying to answer from the current chat alone.

## [SHOW ON SCREEN] Live Demo

In web chat:

```text
My name is Shawn.
```

Show the `addMemory` tool call.

Then start a new chat and ask:

```text
What's my name?
```

Show the `searchMemories` or `getProfile` tool call.

## [SPEAKER NOTE] Live Demo

All right, so now that Cursor is done, we'll review the changes one by one.

Everything looks good here, so I'll accept the changes and then test it in the chat.

First, I'll say: "My name is Shawn."

Now we'll watch the tool calls and see if it calls `addMemory`.

Great, it looks like it called `addMemory`.

Now I'm going to start a new chat, where it should not have my name in the current chat context window.

I'll ask: "What's my name?"

And you can see here that it calls `searchMemories` to figure out what my name is.

That's the whole point of this section. The model is not guessing from the current chat. It's reaching into persistent memory.

## [SPEAKER NOTE] Conclusion

Now our agent has a body, a brain, hands, and long-term memory.

We can chat with our agent, it can call tools, and it can remember durable facts across new conversations, which makes it feel a lot more personal.

The next thing we need to do is add personality.

In the next section, we'll add the agent's soul.
