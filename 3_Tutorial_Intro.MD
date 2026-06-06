# Tutorial Intro

## [SPEAKER NOTE] Opening

Hello and welcome. In this video, we're going to build an AI agent that we can chat with through Telegram that has persistent memory, so it learns from every conversation.

This agent will be able to actually do things for you.

We're going to take major inspiration from OpenClaw, which is an AI agent that runs on your local machine and does all of this, plus a little bit more.

Let's take a quick look at how OpenClaw works.

## [SHOW ON SCREEN] OpenClaw

Open `https://openclaw.ai`.

Show:

- Hero section
- "AI that actually does things"
- Integrations / apps
- GitHub stars if visible

## [SPEAKER NOTE] OpenClaw Walkthrough

Here on OpenClaw AI, we can see that OpenClaw is the AI that actually does things. It clears your inbox, sends emails, checks you in for flights, all from the messaging app that you already use.

This is why I think OpenClaw went viral. It has 371,000 stars on GitHub, and it's one of the fastest-growing open-source projects of all time because it has over 50 integrations. It can connect to the tools that you use to start automating workflows for you.

I'm sure you've used ChatGPT. Let's say you use a tool like ChatGPT to help you write an email. It's a very manual process. You chat with an AI over and over again until it gets your email right.

What if you wanted a tool that went through all of your emails every single day at 9:00 am and created drafts for you in your voice, so that you could just review and click send if they're ready to go?

That's basically the value benefit of OpenClaw. It can connect to your tools like Gmail, learn from your style over time, and everything runs on your machine. You can control which AI model you use, and your state data stays on your local PC. It doesn't live on Claude.ai or ChatGPT.com.

## What We're Building

## [SHOW ON SCREEN] Demo The Finished App

Show:

- Live AI agent
- Telegram chat
- Persistent memory
- Model switcher
- File attachments
- UI updates from Vercel AI SDK

## [SPEAKER NOTE] What We're Building
All right so first I'll show you a quick demo of what we're going to be building. I'm here on my deployed Vercel app, which is what we'll be using to actually deploy the finished application. Here we have a UI where we can toggle the sidebar and create new chats. I'm already signed in here as my testing composer Gmail. We can toggle dark mode here.

Let's just start a chat where we're going to basically switch to, let's say, Claude Sonnet, but you can also switch to any of the available models here from the Vercel AI Gateway router, which is what we're using to actually get all these models here. In this video, we also have a $5 free Vercel AI Gateway router credit. That's included in your account. More on that later.

I'm just going to actually use one of these test prompts. I'm going to ask it, "What's the weather in San Francisco?" We can see here that it uses the tool Get Weather. It generates this dynamic weather UI so it can actually get the latest weather, take that data, put it into this UI, and render it for us. I'll say, "Write a for loop using Python," and it's going to call the appropriate tool. It uses this code UI tool and puts the UI in this nice little code block for us. We can create new chats just like this.

The third dynamic UI we can create is this UI prompt. We can create files just like this, and we can actually edit these files just by adding follow-up prompts. 
## Learning Objectives

## [SPEAKER NOTE] Learning Objectives

By the end of this video, you should be able to understand how an AI agent works.

You'll have a fully working version that you can deploy and start serving to users today.

It can also serve as a valuable starting point for any other AI agent that you want to build in the future.

## Who Am I?

## [SPEAKER NOTE] Who Am I?

And a quick note on who I am.

I'm a Developer Relations Engineer at Composio, and I'm also a Cursor Ambassador. I've taught thousands of people how to use AI with tools like Cursor and Composio, and I'm using these tools myself as a full-stack developer and someone who just likes to build apps in their free time.

I think in 2026 it's also really important to know how to use these AI tools in your workflow. I'll be dropping a few tips throughout as we use Cursor, but you can apply these same agent coding principles to Codex, Claude Code, or whatever coding agent you prefer using.

## Disclaimers

## [SPEAKER NOTE] Do I Need To Know How To Code?

You're probably wondering by now, "Do I need to know how to code?"

You could probably guess that no, we're going to be using a lot of AI to write most of this code. Your job is still to understand what is happening so you can review changes and guide it, because even if you use an official template from Vercel, even a template isn't perfect.

Knowing how to use AI will help you troubleshoot bugs and build new features securely.

In this tutorial, we will be using Cursor. It has a free Hobby plan with limited agent requests and no credit card required. The project is agent-agnostic. You can use Claude Code, Codex, OpenCode, or any other coding agent and just follow along with the same prompts.

You can use the same Vercel AI starting kit, or you can clone the final repo by checking out the GitHub link in the description.

## [SPEAKER NOTE] Costs And Vendor Lock-In

I also want to be transparent about costs here if you're wondering about vendor lock-in or which of these tools you have to pay for.

Obviously, when you use an AI agent like Cursor or Claude Code, these are going to require a credit card to sign up for their pro plans if you want premier AI models.

There are some great university programs, like `cursor.com/students`, where if you sign up with your university email, you can get a free year of Cursor Pro. There's also a Codex for Students plan as well, which I highly recommend you apply for if you're still in school.

Like I mentioned, you don't need to use an AI code editor for this. You can definitely build these things out manually, or view the code in the source repo if you want to understand some of the changes that I made.

The purpose of this video is more so to give you an understanding of how AI agents work, how you can build them locally, and what tools you can use, like Supermemory, Composio, and Cursor, to help speed things up and make your life a little bit easier.

## Agenda

## [ON SCREEN]: Show This Diagram On Excalidraw

Use this while explaining the agenda.

## [SPEAKER NOTE FOR DIAGRAM] Agenda

This course is gonna be pretty simple.

First, we're gonna clone the Vercel AI Chatbot template.

Second, we're gonna connect to our apps using Composio.

Third, we'll hook up some of the more OpenClaw-like features, like being able to message our agent from Telegram, adding cron so that you can set up workflows automatically, and adding a `soul.md` file so that your agent has a personality and can learn from your chats.
