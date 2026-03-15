---
title: "Skill System：按需加载的 Agent 能力包"
excerpt: "Skills 不是工具，也不是 Prompt——它是把工具、上下文、指令打包成可插拔能力模块的设计模式。本文介绍 Skill 的设计哲学、目录结构与动态加载机制。"
isPremium: false
order: 4
readingTime: 12
tags: ["skill", "modularity", "agent-design", "prompt-engineering"]
---

# Skill System：按需加载的 Agent 能力包

> 🚧 **内容即将上线** — 本文正在撰写中，敬请期待。

## 预告内容

- 什么是 Skill，它与 Tool、Plugin 的区别
- Skill 的典型目录结构：SKILL.md + scripts/ + references/
- 动态加载：Agent 如何在运行时决定读取哪个 Skill
- 实战：为 Agent 写一个 GitHub Skill
- Skill vs RAG：什么时候用哪个？
- OpenClaw 的 Skill 系统设计解析

---

*想优先看到这篇文章？在下方留言告诉我们！*
