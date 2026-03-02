---
title: "第二阶段：上下文与知识管理 (s04 - s06)"
excerpt: "深入探讨智能体如何管理庞杂的任务、动态加载知识以及压缩历史对话。"
isPremium: false
order: 2
readingTime: 7
tags: ["claude-code", "agent", "stage2", "context"]
---

### 第二阶段：保持清晰的大脑

随着任务复杂度的提升，单一的对话上下文会迅速膨胀并变得混乱。本阶段通过三个会话解决信息过载的问题：

#### s04：子智能体 (Subagents)

> **箴言：** _"Break big tasks down; each subtask gets a clean context"（将大任务拆解；每个子任务获得一个干净的上下文）_ [6]。

为了防止主对话历史被琐碎的执行细节淹没，我们引入了子智能体。子智能体使用独立的 `messages[]` 数组来处理被拆解下来的子任务，从而保持主对话的干净整洁 [6]。

#### s05：技能库 (Skills)

> **箴言：** _"Load knowledge when you need it, not upfront"（在需要时加载知识，而不是一开始就加载）_ [6]。

传统的做法是将所有背景知识塞进系统提示词（system prompt）中，这极大地浪费了 Token。更好的模式是按需加载：知识应该通过工具执行的结果（tool_result）动态注入到上下文中 [6]。

#### s06：上下文压缩 (Context Compact)

> **箴言：** _"Context will fill up; you need a way to make room"（上下文总会被填满；你需要一种方法来腾出空间）_ [6]。

无论怎样优化，对话上下文最终都会达到上限。为了支持无限长度的对话会话，我们需要引入三层压缩策略（three-layer compression strategy），主动为新的思考腾出必要的空间 [6]。
