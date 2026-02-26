---
title: "ReAct 框架：推理与行动的结合"
excerpt: "掌握 ReAct 框架的原理，这是当今最广泛使用的 Agent 规划范式。"
isPremium: false
order: 1
readingTime: 10
tags: ["planning", "react", "reasoning"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# ReAct 框架：推理与行动的结合

## 论文背景

ReAct（Reasoning + Acting）由 Google 研究员于2022年提出，核心思想是让 LLM 交替进行**推理**（Reasoning）和**行动**（Acting），并利用行动的**观察结果**来指导下一步推理。

## ReAct 的运作流程

```
问题: 大卫·贝克汉姆出生年份是什么？他出生时的英国首相是谁？

Thought 1: 我需要找到贝克汉姆的出生年份
Action 1: Search[大卫·贝克汉姆出生日期]
Observation 1: 大卫·贝克汉姆生于1975年5月2日

Thought 2: 贝克汉姆出生于1975年，现在需要找1975年的英国首相
Action 2: Search[1975年英国首相]
Observation 2: 1975年英国首相是哈罗德·威尔逊（Harold Wilson）

Thought 3: 我已经得到了所有信息
Final Answer: 贝克汉姆出生于1975年，当时的英国首相是哈罗德·威尔逊
```

## 为什么 ReAct 有效？

**对比：只推理（Chain of Thought）**
```
问题: 今天苹果股价是多少？
CoT: 苹果公司股票代码是 AAPL，我估计大概170-180美元左右。❌ 猜测，不准确
```

**ReAct：推理指导行动**
```
Thought: 需要获取 AAPL 的实时股价，使用股价查询工具
Action: GetStockPrice[AAPL]
Observation: AAPL 当前价格: $189.30

Final Answer: 苹果（AAPL）当前股价为 $189.30 ✅ 准确
```

## 实现 ReAct Agent

```python
REACT_PROMPT = """你是一个 AI 助手，通过推理-行动循环完成任务。

可用工具：{tools}

格式：
Thought: [你的推理过程]
Action: [工具名称]
Action Input: [工具输入]
Observation: [工具返回结果]
... (可以重复多次)
Final Answer: [最终答案]

问题: {question}
"""

class ReActAgent:
    def __init__(self, tools: dict, llm):
        self.tools = tools
        self.llm = llm

    def run(self, question: str) -> str:
        prompt = REACT_PROMPT.format(
            tools=self._format_tools(),
            question=question
        )

        for _ in range(10):  # 最多10步
            response = self.llm.complete(prompt)

            if "Final Answer:" in response:
                return response.split("Final Answer:")[-1].strip()

            action, action_input = self._parse_action(response)
            observation = self.tools[action](action_input)
            prompt += f"{response}\nObservation: {observation}\n"

        return "无法在规定步骤内完成任务"
```

## ReAct 的局限性

1. **单线程**：每次只能执行一个动作
2. **无回溯**：执行错误后难以"撤销"
3. **上下文长度**：多步骤后 prompt 过长

这些局限催生了更高级的规划框架，如 **Tree of Thought** 和 **Plan-and-Execute**。
