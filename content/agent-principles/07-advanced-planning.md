---
title: "Advanced Planning: ToT, Plan-and-Execute, LATS"
excerpt: "Beyond ReAct: Tree of Thought, Plan-and-Execute, and other advanced planning frameworks — principles, tradeoffs, and implementation."
isPremium: true
order: 7
readingTime: 18
tags: ["planning", "tot", "advanced"]
---

# Advanced Planning Frameworks

## 1. Plan-and-Execute

**Core idea**: Make a complete plan first, then execute step by step — rather than reasoning on the fly.

```python
class PlanAndExecuteAgent:
    def __init__(self, planner_llm, executor_llm, tools):
        self.planner = planner_llm
        self.executor = executor_llm
        self.tools = tools

    def run(self, goal: str) -> str:
        # Phase 1: Planning
        plan = self.planner.complete(f"""
Break the following goal into concrete execution steps (JSON format):
Goal: {goal}
""")
        steps = json.loads(plan)

        # Phase 2: Execution
        results = []
        for i, step in enumerate(steps):
            result = self.executor.run(
                step,
                context=f"Completed so far: {results}",
                tools=self.tools
            )
            results.append({"step": step, "result": result})

            # Dynamic replanning if a step fails
            if "FAILED" in result:
                remaining = self.planner.replan(goal, results, steps[i+1:])
                steps = steps[:i+1] + remaining

        return self._synthesize(goal, results)
```

**Advantages**: Coherent top-down plan, required resources identified upfront, easy for humans to review and intervene.

## 2. Tree of Thoughts (ToT)

**Core idea**: Use tree search to explore multiple reasoning paths in parallel, selecting the best.

```
             [Goal]
            /   |   \
       [Plan A] [Plan B] [Plan C]
      /    \        |
  [A1]  [A2]    [B1]   [A-fail]
...
```

```python
class TreeOfThoughts:
    def __init__(self, llm, beam_width=3, max_depth=4):
        self.llm = llm
        self.beam_width = beam_width
        self.max_depth = max_depth

    def solve(self, problem: str) -> str:
        root = ThoughtNode(problem)
        beam = [root]

        for depth in range(self.max_depth):
            candidates = []
            for node in beam:
                # Generate child thoughts
                children = self._generate_thoughts(node, n=self.beam_width)
                candidates.extend(children)

            # Score and prune
            scored = self._score_thoughts(candidates, problem)
            beam = sorted(scored, key=lambda x: x.score, reverse=True)[:self.beam_width]

            # Check for solved node
            for node in beam:
                if self._is_solution(node):
                    return node.thought

        return beam[0].thought  # return best attempt
```

**Best for**: Math problems, code generation, any task where exploring multiple approaches has clear value.

## 3. LATS (Language Agent Tree Search)

Combines Monte Carlo Tree Search with LLM reasoning:

```python
class LATS:
    def __init__(self, llm, tools, simulations=10):
        self.llm = llm
        self.tools = tools
        self.simulations = simulations

    def solve(self, goal: str) -> str:
        root = Node(state=goal)

        for _ in range(self.simulations):
            # Selection: navigate to most promising leaf
            node = self._select(root)

            # Expansion: generate new actions
            children = self._expand(node)

            # Simulation: rollout from child
            reward = self._simulate(children[0])

            # Backpropagation: update scores up the tree
            self._backpropagate(children[0], reward)

        return self._best_path(root)
```

## When to Use Which

| Scenario | Recommended Approach |
|----------|----------------------|
| Fact lookup, simple Q&A | ReAct |
| Multi-step project with clear milestones | Plan-and-Execute |
| Math reasoning, code generation | Tree of Thought |
| Complex search with evaluation | LATS |
| Most production use cases | ReAct + dynamic replanning |
