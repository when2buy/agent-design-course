---
title: "Skill Systems: Pluggable Capability Bundles for Agents"
excerpt: "A Skill isn't a tool and it isn't a prompt — it's a design pattern that bundles tools, context, and instructions into a hot-swappable capability module. This article covers the philosophy, directory structure, dynamic loading, and how skills let your agent architecture evolve without rewrites."
isPremium: false
order: 4
readingTime: 12
tags: ["skill", "modularity", "agent-design", "prompt-engineering"]
---

# Skill Systems: Pluggable Capability Bundles for Agents

## The Problem: Agents That Try to Do Everything

When you first build an agent, the temptation is to dump every capability into one system prompt and one tool list. It works at first. Then the product team asks for "just one more feature."

Over time you end up with a **monolithic mega-agent**: a system prompt that's three pages long, 40 tools registered at startup, and a model that's increasingly confused about which tool to use for which situation.

The likelihood of the agent choosing the wrong tool grows with the number of tools available. A medical assistant that also has access to web scraping, email sending, and code execution tools is harder to control than one with only three domain-specific tools.

The solution isn't to build separate agents for every use case — it's to design your agent so capabilities can be **composed dynamically** at runtime.

## What Is a Skill?

A Skill is a **bundled capability unit** that combines:

```
Skill = Tools + Instructions + Context + References
```

It's not just a function (that's a tool). It's not just a prompt (that's instructions). A Skill is a self-contained module that a host agent can activate on demand.

Think of it like a professional's specialty certification. A consultant might be qualified in project management, financial modeling, AND UX research — but they only apply the relevant expertise for each engagement, not all three at once.

### Skill vs Tool vs Prompt

| | **Tool** | **Prompt** | **Skill** |
|---|---|---|---|
| What it is | A callable function | Text instructions | A bundled module |
| Contains code | ✅ | ❌ | ✅ |
| Contains instructions | ❌ | ✅ | ✅ |
| Contains reference docs | ❌ | ❌ | ✅ |
| Hot-swappable | ❌ | Sometimes | ✅ |
| Self-describing | Partially | No | ✅ |

## Anatomy of a Skill

A skill lives in a directory and follows a convention:

```
skills/
├── weather/
│   ├── SKILL.md          # Description, usage, when to activate
│   ├── scripts/
│   │   └── get_weather.py  # Tool implementations
│   └── references/
│       └── wttr-api.md    # API docs the agent may need
│
├── github/
│   ├── SKILL.md
│   ├── scripts/
│   │   ├── search_issues.py
│   │   ├── create_pr.py
│   │   └── review_code.py
│   └── references/
│       ├── github-api.md
│       └── pr-conventions.md
│
└── data-analysis/
    ├── SKILL.md
    ├── scripts/
    │   ├── run_pandas.py
    │   └── generate_chart.py
    └── references/
        └── pandas-cheatsheet.md
```

### The SKILL.md File

`SKILL.md` is the skill's self-description. The agent reads it to understand what the skill does and when to use it:

```markdown
# Weather Skill

## When to use this skill
Activate when the user asks about:
- Current weather conditions in any city
- Weather forecasts (up to 7 days)
- Temperature comparisons between cities

## When NOT to use
- Historical weather data (use a different data source)
- Severe weather alerts (not supported)

## Tools available
- `get_weather(city: str)` — Current conditions
- `get_forecast(city: str, days: int)` — Multi-day forecast

## Notes
- Use wttr.in API (no key required)
- City names work in any language
- Use `?format=3` for compact one-line format
```

## Dynamic Skill Loading

The power of skills comes from **loading them at runtime** based on context, not at startup for every conversation.

### Pattern 1: User-Triggered Activation

The agent reads skill descriptions, selects relevant ones for the task, and loads only those:

```python
import os
import importlib.util
from pathlib import Path

class SkillSystem:
    def __init__(self, skills_dir: str):
        self.skills_dir = Path(skills_dir)
        self._available = self._discover_skills()

    def _discover_skills(self) -> dict[str, dict]:
        """Read all SKILL.md files and build an index."""
        skills = {}
        for skill_dir in self.skills_dir.iterdir():
            skill_md = skill_dir / "SKILL.md"
            if skill_md.exists():
                skills[skill_dir.name] = {
                    "description": skill_md.read_text(),
                    "path": skill_dir,
                }
        return skills

    def select_skills(self, user_request: str, llm) -> list[str]:
        """Ask the LLM which skills are needed for this request."""
        skill_list = "\n".join(
            f"- {name}: {info['description'][:200]}"
            for name, info in self._available.items()
        )
        prompt = f"""Available skills:
{skill_list}

User request: {user_request}

Which skills (if any) should be activated? Return a JSON list of skill names."""
        return llm.json(prompt)  # e.g. ["weather", "data-analysis"]

    def load_skill(self, skill_name: str) -> list[callable]:
        """Load and return the tools from a skill."""
        skill_path = self._available[skill_name]["path"] / "scripts"
        tools = []
        for script in skill_path.glob("*.py"):
            spec = importlib.util.spec_from_file_location(script.stem, script)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            # Convention: each module exposes a `TOOLS` list
            if hasattr(module, "TOOLS"):
                tools.extend(module.TOOLS)
        return tools
```

Usage:

```python
skill_system = SkillSystem("./skills")
active_skill_names = skill_system.select_skills(user_request, llm)
active_tools = []
for name in active_skill_names:
    active_tools.extend(skill_system.load_skill(name))

agent.set_tools(active_tools)
response = agent.run(user_request)
```

### Pattern 2: Role-Based Skill Sets

Different user roles get different skill bundles — same agent, different capability surface:

```python
ROLE_SKILLS = {
    "free_user": ["weather", "search"],
    "pro_user":  ["weather", "search", "data-analysis", "github"],
    "enterprise": ["weather", "search", "data-analysis", "github", "internal-db", "crm"],
}

def get_skills_for_user(user: User) -> list[str]:
    return ROLE_SKILLS.get(user.tier, ROLE_SKILLS["free_user"])
```

This is exactly the "Dynamic Agents" pattern: the same agent adapts its behavior, tools, and capabilities based on runtime signals like user roles. No need to maintain separate agents for each tier.

### Pattern 3: Task-Phase Skill Loading

A long-running agent can swap skill sets as it moves through task phases:

```python
class ResearchAgent:
    async def run(self, query: str):
        # Phase 1: gather information
        async with skills(["web-search", "pdf-reader"]) as phase1_tools:
            raw_data = await self.gather(query, phase1_tools)

        # Phase 2: analyze
        async with skills(["data-analysis", "statistics"]) as phase2_tools:
            analysis = await self.analyze(raw_data, phase2_tools)

        # Phase 3: write up
        async with skills(["document-writer", "citation-formatter"]) as phase3_tools:
            report = await self.write(analysis, phase3_tools)

        return report
```

Each phase only loads what it needs. The agent's context stays focused.

## Evolving Your Architecture Through Skills

Skills let you grow your agent iteratively without rewrites.

The pattern works like this:

1. **Start minimal.** Build the agent with one or two skills. Solve the burning problem well.
2. **Watch what users ask for next.** If users keep requesting a capability you don't have, that's a signal.
3. **Add a skill, not a sprawl.** Package the new capability as a skill with its own SKILL.md, tools, and references.
4. **If a skill becomes unwieldy,** split it into two skills with clearer separation.
5. **If two skills are always activated together,** consider combining them — or creating a dedicated sub-agent.

Compare this to the alternative: adding tool after tool directly to the agent until nobody knows what it does anymore.

```
❌ Month 1:  agent + 3 tools (works great)
   Month 3:  agent + 15 tools (some confusion)
   Month 6:  agent + 40 tools (nobody knows why half of these exist)

✅ Month 1:  agent + 1 skill (weather)
   Month 3:  agent + 3 skills (weather, github, analysis) — each self-contained
   Month 6:  agent + 5 skills — some graduate to dedicated sub-agents when they grow
```

## Skill Discovery in Practice

A well-designed skill system can be self-documenting. When a new developer joins and asks "what can this agent do?", they just look at the skills directory:

```bash
$ ls skills/
data-analysis/   email/   github/   google-calendar/   jira/   weather/

$ cat skills/github/SKILL.md
# GitHub Skill
Activate when: user mentions PRs, issues, repos, code review...
```

Skills also serve as the agent's **capability inventory** — useful for internal tools, customer-facing documentation, and debugging when the agent does the wrong thing.

## When Skills Should Become Sub-agents

Skills are right for adding capabilities to a single agent. At some point, a capability becomes complex enough to warrant its own agent:

| | **Keep as Skill** | **Promote to Sub-agent** |
|---|---|---|
| Tool count | 2-5 | 6+ tools |
| Failure impact | Low | High (needs its own error handling) |
| State | Stateless | Needs its own conversation state |
| Latency | Real-time | Can run async in background |
| Reuse | Used by one agent | Used by multiple orchestrators |

```python
# Small: keep as skill
class CalculatorSkill:
    tools = [add, subtract, multiply, divide]

# Large: promote to sub-agent
class FinancialAnalysisAgent:
    skills = [market-data, portfolio-analysis, risk-modeling, report-generation]
    # This is now a standalone agent that other orchestrators can call
```

## Skill System in OpenClaw

OpenClaw's skill system demonstrates this pattern in production. Each skill lives in its own directory:

```
~/.openclaw/skills/
├── weather/
│   └── SKILL.md          # "Get weather forecasts via wttr.in..."
├── github/
│   └── SKILL.md          # "Interact with GitHub using gh CLI..."
├── digitalocean/
│   └── SKILL.md          # "Manage DigitalOcean droplets..."
└── hf-buckets/
    └── SKILL.md          # "Upload/download to HuggingFace Buckets..."
```

When a user says "deploy a new server," the agent scans skill descriptions, identifies `digitalocean` as relevant, loads its `SKILL.md`, and follows its instructions — without the weather or GitHub tools polluting the tool context.

The agent stays focused. The architecture stays clean. And new capabilities ship as new directories, not as modifications to existing code.
