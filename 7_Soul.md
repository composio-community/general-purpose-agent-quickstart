# Part 4: Soul — Give The Agent A Personality

## [SPEAKER NOTE] What The Soul Is

In this section, we're going to create the soul of our AI agent.

If memory is about the user, the soul is about your agent's personality. The soul is just a fancy word for the system prompt, and it defines how we want our agent to act.

So if the user says "my name is Shawn", that goes into Supermemory. But the agent's name, how it likes to talk, the length of its replies — all of that lives in the soul.

## [SHOW ON SCREEN] Soul Diagram

Show `tutorial/excalidraw/9-soul-identity-flow.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Memory vs Soul

The soul sits in the system prompt.

Memory stores facts about the user. The soul defines the agent's identity — its name, voice, principles, and boundaries.

## [SHOW ON SCREEN] Working Demo

Open the finished demo, ask the agent:

```text
what's your name?
```

It should answer with the soul-defined name (e.g. "Ki — your personal AI agent").

## [SPEAKER NOTE] Onboarding Idea

We're going to add a new feature: if the soul hasn't been defined yet for the user, the agent runs onboarding as a conversation instead of putting a long form on the screen.

Show `tutorial/excalidraw/10b-soul-onboarding-flow.excalidraw`.

When a signed-in user has no soul yet, we inject an onboarding prompt into the system prompt. The agent asks a couple of questions, stores user facts with `addMemory`, and then calls `setSoul` to commit the agent's identity into the database.

After that, we shouldn't see the onboarding prompt anymore — the saved soul gets prepended to the system prompt on every future message.

## [SHOW ON SCREEN] Prompt Stack Diagram

Show `tutorial/excalidraw/10-soul-prompt-stack.excalidraw`.

## [SPEAKER NOTE FOR DIAGRAM] Prompt Stack

This is what gets assembled into the system prompt on every message:

1. Onboarding prompt — only if `User.soul` is null.
2. Soul — the agent's identity.
3. Regular prompt, tool rules, current messages, tools.

The model isn't responding from nothing. It's responding with identity, memory rules, tools, and the current conversation assembled together.

## 🤖 [SHOW ON SCREEN] Agent-Ready Prompt

Open README → **🤖 Agent-Ready Prompt 4 — Soul column, onboarding, and `/admin/agent`**.

Copy the prompt into Cursor.

## [SPEAKER NOTE] Prompt Overview

This prompt is a little bigger because it touches the UI, the database, and a new admin page so we can debug everything is working.

- **Database**: add a nullable `soul` column to the user. New users start with an empty soul.
- **Prompt**: if `User.soul` is null, inject the onboarding prompt. If it's already defined, use the saved soul as-is.
- **`setSoul` tool**: a new tool we add to the model so it can commit the generated identity to the database.
- **`/admin/agent`**: a debug page where we can see what the agent wrote and manually edit it if we want.

## 🤖 [SHAWN: COPY AND PASTE PROMPT]

Paste 🤖 Agent-Ready Prompt 4 from the README into Cursor. Use the project root as context.

## [SPEAKER NOTE] Live Demo

After Cursor finishes, walk through it:

1. Reset the soul from `/admin/agent` (or sign up a fresh user).
2. Send `hi`.
3. Agent asks for the user's name → user answers → `addMemory` fires.
4. Agent asks what to call itself and the preferred vibe.
5. `setSoul` writes the agent identity to the database.
6. Refresh `/admin/agent` to see the generated soul.
7. Start a new chat and ask "what's your name?" → agent answers with its soul-defined name.

## [SPEAKER NOTE] Conclusion

Now our agent doesn't just remember the user — it also has a stable identity.

User facts live in Supermemory. The agent's personality lives in `User.soul`.

That gives us the two pieces we need before we move outside the browser: the agent knows who it is, and it can remember who the user is.
