---
title: "The Agent Loop: How Agents Actually Run"
excerpt: "Understand the Think–Act–Observe cycle — the fundamental engine behind every autonomous AI Agent."
isPremium: false
order: 2
readingTime: 10
tags: ["basics", "loop", "react"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# The Agent Loop: How Agents Actually Run

## The Core Loop

At the heart of every agent is a single repeating process: **Think → Act → Observe → Repeat**.

```
┌─────────────────────────────────┐
│           AGENT LOOP            │
│                                 │
│  Goal ──→ Think ──→ Act         │
│            ↑         │          │
│            └─ Observe ←┘        │
│                                 │
│  Until: Task Complete           │
└─────────────────────────────────┘
```

## ReAct Trace Example

```
Thought: I need to look up Tesla's current stock price.
Action: Search
Action Input: "Tesla stock price today"
Observation: Tesla (TSLA) is trading at $248.50

Thought: Now I know the price. I need to calculate the cost of 100 shares.
Action: Calculator
Action Input: 248.50 * 100
Observation: 24850

Thought: I have all the information needed.
Final Answer: Tesla's current price is $248.50. Buying 100 shares would cost $24,850.
```

## Implementing a Minimal Agent Loop

```python
def agent_loop(goal: str, tools: dict, llm, max_steps=10):
    """A minimal Agent Loop implementation."""
    history = []

    for step in range(max_steps):
        # 1. Think: ask the LLM what to do next
        prompt = build_prompt(goal, history, tools)
        response = llm.complete(prompt)

        # 2. Parse the LLM's decision
        if "Final Answer:" in response:
            return extract_final_answer(response)

        action, action_input = parse_action(response)

        # 3. Act: execute the chosen tool
        if action in tools:
            observation = tools[action](action_input)
        else:
            observation = f"Tool '{action}' not found."

        # 4. Observe: record the result for the next iteration
        history.append({
            "thought": response,
            "action": action,
            "input": action_input,
            "observation": observation
        })

    return "Max steps reached without completing the task."
```

## When to Stop

One of the key challenges of the Agent Loop is knowing **when to stop**:

1. **Task complete**: The LLM outputs `Final Answer`
2. **Max steps**: Prevents infinite loops (recommend 10–20 steps)
3. **Error handling**: Graceful degradation when a tool fails
4. **Confidence threshold**: Stop when the result meets a quality bar

## Common Pitfalls

- **Infinite loops**: Forgetting to set a max-step limit
- **Hallucinated actions**: The LLM calls a tool that doesn't exist
- **Context overflow**: Long multi-step runs exceed the context window

Next up: **Tool Use** — how to design tools that agents can call reliably.
