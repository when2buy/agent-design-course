---
title: "专题介绍：从零构建微型 Claude Code 智能体"
excerpt: "12 个渐进式章节，从一个 30 行的 while 循环出发，一路演进到多智能体自治协作系统。每个章节只加一个机制，每个机制都能独立理解。"
isPremium: false
order: 0
readingTime: 8
tags: ["claude-code", "agent", "tutorial", "intro"]
---

# 从零构建微型 Claude Code：Bash is all you need

> *"The model is the agent. Our job is to give it tools and stay out of the way."*
>
> — [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)

这句话是整个专题的哲学基础。AI Agent 不是魔法，它的核心不过是一个 **while 循环** 加上一套工具。这个专题将带你从这个最小的起点出发，一步步构建出具备规划、记忆、任务调度、多智能体协作能力的完整系统。

---

## 核心模式：The Agent Loop

整个专题围绕一个核心循环展开：

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

用代码表示，这就是一个 Agent 的最小可行实现：

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

        # 模型没有调用工具 → 任务完成，退出循环
        if response.stop_reason != "tool_use":
            return

        # 执行所有工具调用，收集结果
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

**这不到 30 行代码就是整个智能体。** 后面 11 个章节都是在这个循环之上叠加机制，循环本身始终不变。

---

## 12 步学习路径

| 阶段 | 章节 | 箴言 |
|------|------|------|
| **第一阶段：基础循环与工具** | s01 Agent Loop | 一个循环和 Bash 就够了 |
| | s02 Tool Use | 加工具 = 加一个 handler |
| | s03 TodoWrite | 没有计划的 Agent 只会漂移 |
| **第二阶段：上下文与知识** | s04 Subagents | 大任务拆小，每个子任务干净的上下文 |
| | s05 Skills | 用到什么知识，临时加载什么知识 |
| | s06 Context Compact | 上下文总会满，要有办法腾地方 |
| **第三阶段：任务与后台** | s07 Task System | 大目标拆成小任务，排好序，记在磁盘上 |
| | s08 Background Tasks | 慢操作丢后台，Agent 继续想下一步 |
| **第四阶段：多智能体团队** | s09 Agent Teams | 任务太大一个人干不完，要能分给队友 |
| | s10 Team Protocols | 队友之间要有统一的沟通规矩 |
| | s11 Autonomous Agents | 队友自己看看板，有活就认领 |
| | s12 Worktree Isolation | 各干各的目录，互不干扰 |

---

## 设计哲学：无侵入叠加

这个系列最精妙的地方在于：**所有新功能都像洋葱皮一样包裹在核心循环之外，从不修改循环本身。**

```
s01: while loop + bash tool
s02: + dispatch map (多工具)
s03: + TodoManager (规划)
s04: + Subagent runner (子上下文)
s05: + SkillLoader (按需知识)
s06: + 三层压缩 (无限上下文)
s07: + TaskGraph (依赖关系)
s08: + BackgroundManager (并发)
s09: + TeammateManager (团队)
s10: + FSM protocols (协调)
s11: + idle cycle (自治)
s12: + worktree binding (隔离)
```

每加一层，能力提升一档，但底层循环从未改变。这是工程设计中**高内聚低耦合**最直观的示范。

---

## 快速上手

```bash
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt

# 配置 API Key
cp .env.example .env
echo "ANTHROPIC_API_KEY=your-key-here" >> .env

# 从第一个章节开始
python agents/s01_agent_loop.py

# 或者直接跳到终章
python agents/s_full.py
```

后续四篇文章将逐阶段深入每个机制的原理与实现细节。
