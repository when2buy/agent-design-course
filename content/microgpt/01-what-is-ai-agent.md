---
title: "What is an AI Agent?"
excerpt: "A deep dive into the definition, characteristics, and fundamental difference between an AI Agent and a plain LLM."
isPremium: false
order: 1
readingTime: 8
tags: ["basics", "agent", "llm"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# What is an AI Agent?

## Core Definition

An AI Agent is an intelligent system capable of **perceiving its environment, making decisions, and executing actions**. Unlike a plain LLM, an Agent doesn't just "answer questions" — it actively works to **accomplish goals**.

```
User sets goal → Agent plans → Executes tools → Observes results → Adjusts plan → Goal achieved
```

## Agent vs. Plain LLM

| Property | Plain LLM | AI Agent |
|----------|-----------|----------|
| Interaction | Single-turn Q&A | Multi-turn autonomous loop |
| Tool use | None | Can call external tools |
| Memory | No persistent memory | Short-term + long-term memory |
| Initiative | Passive responder | Active planner & executor |

## Core Components of an Agent

### 1. Brain (LLM)
The reasoning core — understands tasks, plans steps, and decides what to do next.

### 2. Tools
External capabilities the agent can invoke: web search, code execution, API calls, database queries, etc.

### 3. Memory
- **Short-term**: The current conversation context (context window)
- **Long-term**: Historical information stored in a vector database

### 4. Planning
How the agent decomposes complex tasks and forms an execution plan.

## Your First Agent

```python
from langchain.agents import initialize_agent, Tool

tools = [
    Tool(
        name="Search",
        func=search.run,
        description="Search the internet for up-to-date information"
    ),
    Tool(
        name="Calculator",
        func=calculator.run,
        description="Perform mathematical calculations"
    )
]

llm = OpenAI(temperature=0)
agent = initialize_agent(tools, llm, agent="zero-shot-react-description")

result = agent.run("What is Tesla's current stock price? How much would 100 shares cost?")
print(result)
```

## What's Next

Now that you understand the core definition, the next article dives into the **Agent Loop** — the engine that makes autonomous execution possible.
