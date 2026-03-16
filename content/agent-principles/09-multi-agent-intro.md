---
title: "Multi-Agent System Architecture"
excerpt: "When a single agent isn't powerful enough — how to design collaborative multi-agent systems that divide, specialize, and conquer."
isPremium: false
order: 9
readingTime: 16
tags: ["multi-agent", "orchestration", "crewai"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Multi-Agent System Architecture

## Why Multi-Agent?

Single agents have natural limits:
- **Context length**: Complex task histories don't fit in one context window
- **Specialization**: One agent can't simultaneously excel at coding, writing, research, and analysis
- **Parallelism**: Some subtasks can run concurrently
- **Reliability**: Multiple agents cross-checking each other reduces errors

## Three Multi-Agent Architectures

### 1. Hierarchical

```
         ┌─────────────┐
         │ Orchestrator │ ← decomposes tasks, delegates work
         └──────┬──────┘
      ┌─────────┼─────────┐
      ↓         ↓         ↓
 [Research]  [Writing]  [Review]
   Agent       Agent      Agent
```

```python
class OrchestratorAgent:
    def run(self, goal: str) -> str:
        subtasks = self._decompose(goal)

        results = {}
        for task in subtasks:
            agent_name = self._route(task)
            results[task] = self.sub_agents[agent_name].run(task)

        return self._synthesize(goal, results)

    def _route(self, task: str) -> str:
        """Decide which sub-agent handles this task."""
        prompt = f"Task: {task}\nAvailable agents: {list(self.sub_agents.keys())}\nPick the best agent (return name only):"
        return self.llm.complete(prompt).strip()
```

### 2. Collaborative

Agents communicate through a message bus:

```python
class CollaborativeSystem:
    async def run(self, goal: str) -> str:
        self.message_bus.publish("task", {"goal": goal})

        # Agents subscribe and self-assign
        results = await asyncio.gather(*[
            agent.listen_and_work(self.message_bus)
            for agent in self.agents
        ])

        return self._aggregate(results)
```

### 3. Competitive (LLM-as-Judge)

Multiple agents propose solutions; a judge selects the best:

```python
class CompetitiveSystem:
    def run(self, goal: str) -> str:
        proposals = [agent.propose(goal) for agent in self.agents]

        judge_prompt = f"""
Goal: {goal}
Proposals:
{format_proposals(proposals)}

Select the best proposal and explain why:
"""
        verdict = self.judge_llm.complete(judge_prompt)
        return extract_winner(verdict, proposals)
```

## Choosing the Right Architecture

| Scenario | Architecture |
|----------|--------------|
| Clear task decomposition | Hierarchical |
| Collaborative creative work | Collaborative |
| High-stakes decisions | Competitive |
| Research + synthesis | Hierarchical + Collaborative hybrid |
