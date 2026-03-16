---
title: "Stage 1: The Loop, Tools, and Planning (s01–s03)"
excerpt: "Starting from a 30-line while loop, understand how agents work at the lowest level: the core loop, the tool dispatch map, and task planning with TodoWrite."
isPremium: false
order: 2
readingTime: 15
tags: ["claude-code", "agent", "stage1", "tools", "todo"]
series: "CLI Agent Pattern"
---

# Stage 1: The Building Blocks

This stage answers one question: **how do you turn a language model from a conversationalist into an actor?**

LLMs can reason about code, but they can't touch the real world — they can't read files, run tests, or check error output. Without a loop, you have to manually paste tool results back in. *You* are the loop.

The fix: automate that process. Let the model call tools, collect results, feed them back in, and loop — until the task is done.

---

## s01: The Agent Loop — One Loop & Bash Is All You Need

> **Mantra:** *"One tool + one loop = one agent"*

### The Problem

Without a loop:
1. User asks a question
2. Model answers and suggests running a command
3. User runs it, copies output, pastes it back
4. Model continues…

You are the loop.

### The Solution: Automate the Loop

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> |  Tool   |
| prompt |      |       |      | execute |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
              (loop until stop_reason != "tool_use")
```

One exit condition governs everything. The loop runs until the model stops calling tools.

### Full Implementation

```python
import anthropic, subprocess
from pathlib import Path

client = anthropic.Anthropic()
MODEL = "claude-opus-4-5"
SYSTEM = "You are a helpful coding agent."

TOOLS = [{
    "name": "bash",
    "description": "Run a bash command and return the output.",
    "input_schema": {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "The bash command to run"}
        },
        "required": ["command"]
    }
}]

def run_bash(command: str) -> str:
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=30
    )
    return (result.stdout + result.stderr).strip()[:50000]

def agent_loop(query: str):
    messages = [{"role": "user", "content": query}]
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            for block in response.content:
                if hasattr(block, "text"):
                    print(block.text)
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})

agent_loop("Create a file called hello.py that prints 'Hello, Agent!'")
```

Under 30 lines. **This is the entire agent.** The next 11 chapters add mechanisms on top — the loop never changes.

---

## s02: Tool Use — Adding a Tool = Adding a Handler

> **Mantra:** *"The loop doesn't move. Register new tools in the dispatch map."*

### The Problem

With only `bash`, all operations go through the shell. Two issues:

1. **Large attack surface**: commands like `cat` and `sed` behave unpredictably with special characters
2. **No path protection**: the model can accidentally operate outside the workspace

Dedicated tools (`read_file`, `write_file`) let you enforce sandboxing at the tool layer.

**Key insight: adding tools requires zero changes to the loop.**

### The Dispatch Map

```
+--------+      +-------+      +------------------+
|  User  | ---> |  LLM  | ---> | Tool Dispatch    |
| prompt |      |       |      | {                |
+--------+      +---+---+      |   bash: run_bash |
                    ^           |   read: run_read |
                    |           |   write: run_write|
                    +-----------+   edit: run_edit  |
                    tool_result | }                 |
                                +------------------+
```

### Full Implementation

```python
from pathlib import Path

WORKDIR = Path.cwd()

def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]

def run_write(path: str, content: str) -> str:
    target = safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
    return f"Written {len(content)} chars to {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    target = safe_path(path)
    content = target.read_text()
    if old_text not in content:
        return f"Error: old_text not found in {path}"
    target.write_text(content.replace(old_text, new_text, 1))
    return f"Edited {path}"

# Dispatch map: adding a tool = adding one line here
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}
```

The loop dispatches by name — identical to s01:

```python
for block in response.content:
    if block.type == "tool_use":
        handler = TOOL_HANDLERS.get(block.name)
        output = handler(**block.input) if handler else f"Unknown tool: {block.name}"
        results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
```

**Adding a tool = adding a handler + a schema. The loop never changes.**

---

## s03: TodoWrite — An Agent Without a Plan Just Drifts

> **Mantra:** *"List the steps before you start. Completion rate doubles."*

### The Problem

In multi-step tasks, the model loses track — redoing completed work, skipping steps, going off-topic.

Why: as the conversation grows, tool results flood the context and dilute the system prompt's influence. A 10-step refactor might execute steps 1–3 correctly, then improvise, because steps 4–10 have been pushed out of effective attention.

### The Solution: TodoManager + Nag Reminder

```
Agent loop...
       |
   rounds_since_todo >= 3?
       |
   inject <reminder> into tool_result
       |
   LLM is forced to update todo before continuing
```

### Full Implementation

```python
class TodoManager:
    def __init__(self):
        self.items = []

    def update(self, items: list) -> str:
        """Enforce: only one task can be in_progress at a time."""
        if sum(1 for i in items if i.get("status") == "in_progress") > 1:
            raise ValueError("Only one task can be in_progress at a time.")
        self.items = items
        return self.render()

    def render(self) -> str:
        if not self.items:
            return "No todos."
        icons = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}
        return "\n".join(
            f"{icons.get(i['status'], '[ ]')} {i['id']}: {i['text']}"
            for i in self.items
        )

TODO = TodoManager()
TOOL_HANDLERS["todo"] = lambda **kw: TODO.update(kw["items"])
```

Nag reminder injected when the model ignores its todo list:

```python
rounds_since_todo = 0

# Inside the agent loop, after collecting results:
if used_todo:
    rounds_since_todo = 0
else:
    rounds_since_todo += 1

if rounds_since_todo >= 3 and results:
    results.insert(0, {
        "type": "text",
        "text": "<reminder>Update your todos before continuing.</reminder>",
    })
```

"Only one in_progress at a time" enforces sequential focus. The nag reminder creates accountability — ignore your plan, and the system asks why.

---

## Stage 1 Summary

- **s01** — the minimal viable agent: 30 lines, one loop
- **s02** — expanded toolset with path sandboxing; extensible without touching the loop
- **s03** — planning constraint; transforms "random execution" into "ordered progress"

Next: Stage 2 — what happens when a task is too large for a single context, or domain knowledge is too broad to stuff into the system prompt?
