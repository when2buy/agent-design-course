---
title: "Pattern: Build a Micro Claude Code Agent from Scratch"
excerpt: "12 progressive chapters, starting from a 30-line while loop and evolving into a multi-agent autonomous collaboration system. Each chapter adds exactly one mechanism — each mechanism stands alone."
isPremium: false
order: 1
readingTime: 8
tags: ["claude-code", "agent", "tutorial", "intro"]
series: "CLI Agent Pattern"
---

# CLI Agent Pattern: Bash Is All You Need

> *"The model is the agent. Our job is to give it tools and stay out of the way."*
>
> — [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)

This quote is the philosophical foundation of the entire series. An AI Agent is not magic — at its core it's nothing more than a **while loop** plus a set of tools. This series walks you from that minimal starting point to a complete system with planning, memory, task scheduling, and multi-agent collaboration.

---

## The Core Pattern: The Agent Loop

The entire series revolves around one central loop:

```
User --> messages[] --> LLM --> response
                                   |
                         stop_reason == "tool_use"?
                            /              \
                          yes              no
                           |               |
                     execute tools     return text
                     append results
                     loop back --> messages[]
```

In code, this is the minimal viable agent implementation:

```python
def agent_loop(query: str):
    messages = [{"role": "user", "content": query}]

    while True:
        response = client.messages.create(
            model=MODEL,
            system=SYSTEM,
            messages=messages,
            tools=TOOLS,
            max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        # Model didn't call a tool → task done, exit loop
        if response.stop_reason != "tool_use":
            return

        # Execute all tool calls and collect results
        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

**This is under 30 lines. This is the entire agent.** The next 11 chapters each add one mechanism on top of this loop — the loop itself never changes.

---

## 12-Step Learning Path

| Stage | Chapter | Mantra |
|-------|---------|--------|
| **Stage 1: Loop & Tools** | s01 Agent Loop | One loop + Bash = an agent |
| | s02 Tool Use | Adding a tool = adding a handler |
| | s03 TodoWrite | An agent without a plan just drifts |
| **Stage 2: Context & Knowledge** | s04 Subagents | Split big tasks; each subtask gets a clean context |
| | s05 Skills | Load knowledge on demand, not upfront |
| | s06 Context Compact | Context always fills up — you need a way to clear it |
| **Stage 3: Tasks & Background** | s07 Task System | Break goals into tasks, order them, persist them to disk |
| | s08 Background Tasks | Slow ops go async; the agent keeps thinking |
| **Stage 4: Multi-Agent Teams** | s09 Agent Teams | Tasks too big for one agent — delegate to teammates |
| | s10 Team Protocols | Teammates need agreed communication rules |
| | s11 Autonomous Agents | Teammates scan the board and self-assign tasks |
| | s12 Worktree Isolation | Each agent works in its own directory, no interference |

---

## Design Philosophy: Non-Invasive Layering

The elegance of this series: **every new capability wraps around the core loop like an onion layer — the loop itself is never modified.**

```
s01: while loop + bash tool
s02: + dispatch map (multi-tool)
s03: + TodoManager (planning)
s04: + Subagent runner (clean sub-contexts)
s05: + SkillLoader (on-demand knowledge)
s06: + 3-layer compaction (infinite context)
s07: + TaskGraph (dependency tracking)
s08: + BackgroundManager (concurrency)
s09: + TeammateManager (team)
s10: + FSM protocols (coordination)
s11: + idle cycle (autonomy)
s12: + worktree binding (isolation)
```

Each layer upgrades capability by one level. The underlying loop never changes. This is the most hands-on demonstration of **high cohesion, low coupling** you'll find anywhere.

---

## Quick Start

```bash
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt

# Configure API key
cp .env.example .env
echo "ANTHROPIC_API_KEY=your-key-here" >> .env

# Start from chapter one
python agents/s01_agent_loop.py

# Or jump straight to the final version
python agents/s_full.py
```

The next four articles walk through each stage in depth.
