---
title: "Agent Loop：Agent 的核心运行机制"
excerpt: "理解 Think-Act-Observe 循环，掌握 Agent 自主执行的根本原理。"
isPremium: false
order: 2
readingTime: 10
tags: ["basics", "loop", "react"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Agent Loop：核心运行机制

## The AgentLoop

Agent 的核心是一个不断循环的过程：**Think（思考）→ Act（行动）→ Observe（观察）→ 重复**。

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

## ReAct 框架示例

```
Thought: 我需要搜索特斯拉的当前股价
Action: Search
Action Input: "Tesla stock price today"
Observation: Tesla (TSLA) is trading at $248.50

Thought: 现在我知道股价了，需要计算100股的总价
Action: Calculator
Action Input: 248.50 * 100
Observation: 24850

Thought: 我已经得到了答案
Final Answer: 特斯拉当前股价为 $248.50，购买100股需要 $24,850。
```

## 实现一个简单的 Agent Loop

```python
def agent_loop(goal: str, tools: dict, llm, max_steps=10):
    """简单的 Agent Loop 实现"""
    history = []

    for step in range(max_steps):
        # 1. Think: 让 LLM 决定下一步行动
        prompt = build_prompt(goal, history, tools)
        response = llm.complete(prompt)

        # 2. 解析 LLM 的决定
        if "Final Answer:" in response:
            return extract_final_answer(response)

        action, action_input = parse_action(response)

        # 3. Act: 执行工具
        observation = tools[action](action_input) if action in tools else f"Tool '{action}' not found"

        # 4. Observe: 记录观察结果
        history.append({
            "thought": response,
            "action": action,
            "input": action_input,
            "observation": observation
        })

    return "Max steps reached without completion"
```

## 停止条件

Agent Loop 的关键挑战之一是**何时停止**：

1. **任务完成**：LLM 输出 `Final Answer`
2. **最大步数**：防止无限循环（建议 10-20 步）
3. **错误处理**：工具调用失败时的降级策略
4. **置信度阈值**：当结果满足质量要求时停止

## 常见陷阱

- **无限循环**：没有设置最大步数
- **幻觉行动**：LLM 调用不存在的工具
- **上下文溢出**：长对话超出 context window

下一节我们进入**工具调用（Tool Use）**的设计和实现。
