---
title: "Stage 2: Context & Knowledge Management (s04–s06)"
excerpt: "Subagents keep the main conversation clean. The skill system loads knowledge on demand. Three-layer compaction solves context overflow. Stage 2 is about staying sane at scale."
isPremium: false
order: 3
readingTime: 18
tags: ["claude-code", "agent", "stage2", "context", "subagent", "skills"]
series: "CLI Agent Pattern"
---

# Stage 2: Keeping the Brain Clear

Stage 1 answered "how do you make an agent act?" Stage 2 answers the harder question: **as tasks grow more complex and context grows larger, how do you stop the agent from losing its mind?**

Three core challenges:
1. Execution details of large tasks contaminate the main conversation context
2. Stuffing all domain knowledge into the system prompt wastes tokens
3. Long conversations will eventually overflow the context window

Three corresponding solutions: **subagents, skill systems, context compaction**.

---

## s04: Subagents — Every Subtask Gets a Clean Context

> **Mantra:** *"Split big tasks into small ones. Each subtask gets a fresh context."*

### The Problem

The longer an agent works, the fatter the `messages` array gets. Every file read and command output stays in context forever.

Example: "What test framework does this project use?" might require reading 5 files — but the parent agent only needs one word: "pytest". Yet the full content of those 5 files is now permanently lodged in the main conversation, consuming precious context window space.

### The Solution: Isolated Contexts

```
Parent agent                     Subagent
+------------------+             +------------------+
| messages=[...]   |             | messages=[]      | <-- fresh, clean
|                  |  dispatch   |                  |
| tool: task       | ----------> | while tool_use:  |
|   prompt="..."   |             |   call tools     |
|                  |  summary    |   append results |
|   result = "..." | <---------- | return last text |
+------------------+             +------------------+

Parent context stays clean. Subagent context is discarded.
```

The parent only receives the subagent's final summary — not the entire history of intermediate steps.

### Implementation

```python
TASK_TOOL = {
    "name": "task",
    "description": (
        "Spawn a subagent with a fresh context to handle a subtask. "
        "Use this for any task that would pollute your context. "
        "Returns only the final summary."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Full task description for the subagent"}
        },
        "required": ["prompt"]
    }
}

def run_subagent(prompt: str) -> str:
    """
    Launch a subagent with messages=[].
    Only the final text response is returned to the parent.
    The subagent's full tool-call history is discarded.
    """
    sub_messages = [{"role": "user", "content": prompt}]

    for _ in range(30):  # safety cap
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tools=CHILD_TOOLS,  # note: no "task" tool — no recursive spawning
            max_tokens=8000,
        )
        sub_messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return "Subagent completed with no text output."

        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
        sub_messages.append({"role": "user", "content": results})

    return "Subagent reached step limit."

TOOL_HANDLERS["task"] = lambda **kw: run_subagent(kw["prompt"])
```

**Before subagents** (analyzing 10 files): ~60 messages, ~25,000 tokens.
**After**: ~8 messages, ~3,000 tokens.

---

## s05: Skill System — Load Knowledge On Demand

> **Mantra:** *"Inject via tool_result, not system prompt."*

### The Problem

You want the agent to follow domain-specific workflows: git conventions, test patterns, code review checklists.

**Bad approach**: stuff it all in the system prompt. 10 skills × 2,000 tokens = 20,000 tokens of overhead on every API call, most of it irrelevant.

**Good approach**: two-layer injection — the system prompt lists skill names; full content is loaded only when called.

### Two-Layer Knowledge Injection

```
System prompt (Layer 1 — always present, cheap):
+--------------------------------------+
| You are a coding agent.              |
| Skills available:                    |
|   - git: Git workflow helpers        |  ~100 tokens per skill
|   - test: Testing best practices     |
+--------------------------------------+

When model calls load_skill("git") (Layer 2 — on demand, expensive):
+--------------------------------------+
| tool_result:                         |
| <skill name="git">                   |
|   Full git workflow guide...         |  ~2000 tokens, only when needed
| </skill>                             |
+--------------------------------------+
```

### Implementation

```python
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        for skill_file in sorted(skills_dir.rglob("SKILL.md")):
            text = skill_file.read_text()
            meta, body = self._parse_frontmatter(text)
            name = meta.get("name", skill_file.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def get_descriptions(self) -> str:
        """Short descriptions → system prompt (cheap)"""
        return "\n".join(
            f"  - {name}: {s['meta'].get('description', '')}"
            for name, s in self.skills.items()
        )

    def get_content(self, name: str) -> str:
        """Full content → tool_result (on demand)"""
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'. Available: {list(self.skills.keys())}"
        return f'<skill name="{name}">\n{skill["body"]}\n</skill>'

SKILL_LOADER = SkillLoader(Path("skills"))

# Layer 1: inject descriptions into system prompt
SYSTEM = f"""You are a coding agent.

Skills available (load with load_skill when relevant):
{SKILL_LOADER.get_descriptions()}"""

# Layer 2: tool for on-demand full content
TOOL_HANDLERS["load_skill"] = lambda **kw: SKILL_LOADER.get_content(kw["name"])
```

**Token savings**: from ~20,000 constant overhead to ~500 (routine) + ~2,500 (when a skill is actually needed).

---

## s06: Context Compaction — Three Layers for Unlimited Sessions

> **Mantra:** *"Context always fills up. You need a way to clear it."*

### The Problem

Reading a 1,000-line file costs ~4,000 tokens. Read 30 files, run 20 commands, and you're past 100k tokens. Without compaction, an agent simply can't work on large codebases.

### Three-Layer Compaction Strategy

```
Before each LLM call:
        |
[Layer 1: micro_compact] — silent, every round
  Replace tool_result from 3+ rounds ago with
  "[Previous result, compacted]"
        |
[Check: tokens > 50,000?]
   no → continue
   yes → [Layer 2: auto_compact]
           Save full transcript to .transcripts/
           LLM summarizes the conversation
           Replace all messages with [summary]
                    |
            [Layer 3: compact tool]
              Model proactively calls this
              Same summarization mechanism
```

### Implementation

```python
def micro_compact(messages: list) -> list:
    """Silent: replace old tool_result content with placeholders."""
    KEEP_RECENT = 3
    tool_results = [
        (i, j, part)
        for i, msg in enumerate(messages)
        if msg["role"] == "user" and isinstance(msg.get("content"), list)
        for j, part in enumerate(msg["content"])
        if isinstance(part, dict) and part.get("type") == "tool_result"
    ]
    for i, j, part in tool_results[:-KEEP_RECENT]:
        if len(str(part.get("content", ""))) > 100:
            part["content"] = "[Previous result, compacted to save context]"
    return messages

def auto_compact(messages: list) -> list:
    """Save transcript to disk, then replace messages with LLM summary."""
    ts = int(time.time())
    transcript_path = Path(".transcripts") / f"transcript_{ts}.jsonl"
    transcript_path.parent.mkdir(exist_ok=True)
    transcript_path.write_text("\n".join(json.dumps(m, default=str) for m in messages))

    summary_response = client.messages.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            "Summarize this conversation for continuity. Include: goals, progress, "
            "files changed, pending tasks, key findings.\n\n" +
            json.dumps(messages, default=str)[:80000]
        }],
        max_tokens=2000,
    )
    summary = summary_response.content[0].text

    return [
        {"role": "user",      "content": f"[Context compressed]\n\n{summary}"},
        {"role": "assistant", "content": "Understood. Continuing from summary."},
    ]
```

**The full history is preserved on disk in `.transcripts/`. Nothing is actually lost — it's just moved out of the active context.**

---

## Stage 2 Summary

- **s04 Subagents**: the main context stays clean; subtask "process" doesn't pollute it
- **s05 Skill system**: knowledge loads on demand; no stale overhead in the system prompt
- **s06 Compaction**: three progressive layers; a single session can handle arbitrarily large tasks

Together, the agent's "brain" stays sharp regardless of how much work accumulates.

Next: Stage 3 — persistent task graphs and background concurrency.
