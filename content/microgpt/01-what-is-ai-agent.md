---
title: "什么是 AI Agent？"
excerpt: "深入理解 AI Agent 的定义、特征和与普通 LLM 的本质区别。"
isPremium: false
order: 1
readingTime: 8
tags: ["basics", "agent", "llm"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# 什么是 AI Agent？

## 核心定义

AI Agent 是一种能够**感知环境、做出决策、执行动作**的智能系统。与传统的 LLM 不同，Agent 不只是"回答问题"，而是能够主动地去**完成目标**。

```
用户输入目标 → Agent 规划 → 执行工具 → 观察结果 → 调整计划 → 完成目标
```

## Agent vs 普通 LLM 的区别

| 特性 | 普通 LLM | AI Agent |
|------|----------|----------|
| 交互方式 | 单轮问答 | 多轮自主循环 |
| 工具使用 | 无 | 可调用外部工具 |
| 记忆 | 无持久记忆 | 有短期/长期记忆 |
| 主动性 | 被动响应 | 主动规划执行 |

## Agent 的核心组件

### 1. 大脑（LLM）
Agent 的推理核心，负责理解任务、规划步骤、决策下一步行动。

### 2. 工具（Tools）
Agent 可以调用的外部能力：搜索引擎、代码执行、API 调用、数据库查询等。

### 3. 记忆（Memory）
- **短期记忆**：当前对话上下文（Context Window）
- **长期记忆**：向量数据库存储的历史信息

### 4. 规划（Planning）
Agent 如何分解复杂任务、制定执行计划。

## 第一个 Agent 示例

```python
from langchain.agents import initialize_agent, Tool

tools = [
    Tool(
        name="Search",
        func=search.run,
        description="用于搜索互联网信息"
    ),
    Tool(
        name="Calculator",
        func=calculator.run,
        description="用于数学计算"
    )
]

llm = OpenAI(temperature=0)
agent = initialize_agent(tools, llm, agent="zero-shot-react-description")

result = agent.run("特斯拉当前股价是多少？如果我买100股需要多少钱？")
print(result)
```

## 下一步

理解了基础定义后，下一节我们将深入了解 **Agent Loop**，这是 Agent 工作的核心引擎。
