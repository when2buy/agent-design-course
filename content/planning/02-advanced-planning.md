---
title: "高级规划框架：ToT、Plan-and-Execute、LATS"
excerpt: "超越 ReAct：Tree of Thought、Plan-and-Execute 等高级规划框架的原理与实现。"
isPremium: true
order: 2
readingTime: 18
tags: ["planning", "tot", "advanced"]
---

# 高级规划框架

## 1. Plan-and-Execute

**核心思想**：先制定完整计划，再逐步执行，而非边想边做。

```python
class PlanAndExecuteAgent:
    def __init__(self, planner_llm, executor_llm, tools):
        self.planner = planner_llm
        self.executor = executor_llm
        self.tools = tools

    def run(self, goal: str) -> str:
        # Phase 1: 规划
        plan = self.planner.complete(f"""
将以下目标分解为具体的执行步骤（JSON格式）:
目标: {goal}
""")
        steps = json.loads(plan)

        # Phase 2: 执行
        results = []
        for i, step in enumerate(steps):
            result = self.executor.run(
                step,
                context=f"已完成步骤: {results}",
                tools=self.tools
            )
            results.append({"step": step, "result": result})

            # 动态重规划（如果步骤失败）
            if "FAILED" in result:
                remaining = self.planner.replan(goal, results, steps[i+1:])
                steps = steps[:i+1] + remaining

        return self._synthesize(goal, results)
```

**优势：** 整体规划连贯，可提前识别所需资源，便于人类审核和干预。

## 2. Tree of Thoughts (ToT)

**核心思想**：用树搜索探索多条推理路径，选择最优解。

```
             [目标]
            /   |   \
       [方案A] [方案B] [方案C]
      /    \      |
  [A1] [A2] [B1] [A-fail]
    |
  [A1a] ← 最优路径
```

```python
class TreeOfThoughts:
    def __init__(self, llm, branching_factor=3, depth=4):
        self.llm = llm
        self.b = branching_factor
        self.d = depth

    def solve(self, problem: str) -> str:
        root = ThoughtNode(content=problem)
        return self._bfs_search(root)

    def _bfs_search(self, root):
        frontier = [root]

        for level in range(self.d):
            next_frontier = []

            for node in frontier:
                # 生成 b 个子思路
                thoughts = self._generate_thoughts(node, self.b)
                for thought in thoughts:
                    thought.score = self._evaluate_thought(thought)
                    next_frontier.append(thought)

            # Beam Search：保留得分最高的节点
            frontier = sorted(next_frontier, key=lambda x: x.score)[-self.b:]

            for node in frontier:
                if self._is_solution(node):
                    return node.content

        return max(frontier, key=lambda x: x.score).content

    def _evaluate_thought(self, thought) -> float:
        """让 LLM 评估思路质量（0-10分）"""
        score = self.llm.complete(f"评估以下思路解决问题的可能性（0-10分，仅返回数字）：\n{thought.content}")
        return float(score)
```

## 3. LATS (Language Agent Tree Search)

结合 **Monte Carlo Tree Search (MCTS)** 和 LLM，目前最先进的 Agent 规划框架之一：

```python
class LATSNode:
    def __init__(self, state, parent=None):
        self.state = state
        self.parent = parent
        self.children = []
        self.visits = 0
        self.value = 0.0

    @property
    def ucb_score(self):
        """UCB1 分数：平衡探索与利用"""
        if self.visits == 0:
            return float('inf')
        exploitation = self.value / self.visits
        exploration = math.sqrt(2 * math.log(self.parent.visits) / self.visits)
        return exploitation + exploration

class LATS:
    def run(self, goal: str) -> str:
        root = LATSNode(state={"goal": goal, "trajectory": []})

        for _ in range(self.n_simulations):
            node = self._select(root)        # 选择最有潜力的节点
            children = self._expand(node)   # 扩展新动作
            for child in children:
                reward = self._simulate(child)  # 模拟执行
                self._backprop(child, reward)   # 反向传播奖励

        return self._best_path(root)
```

## 如何选择规划框架？

| 任务类型 | 推荐框架 |
|---------|---------|
| 简单问答 | ReAct |
| 多步骤任务 | Plan-and-Execute |
| 创意/写作任务 | Tree of Thoughts |
| 复杂推理/游戏 | LATS |
| 长期自主任务 | Plan-and-Execute + 记忆 |

下一章：**多 Agent 系统** —— 当一个 Agent 不够用时。
