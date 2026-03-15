---
title: "[系统设计] 设计一个自动 Code Review Agent"
excerpt: "来自 GitHub / Anthropic 的高频题。Agent 需要理解 PR diff、调用静态分析工具、生成结构化评论，并能识别安全漏洞。本文提供完整架构 + 工具链设计。"
isPremium: true
order: 2
readingTime: 22
tags: ["interview", "system-design", "code-review", "devtools"]
company: "GitHub / Anthropic（变体）"
difficulty: "Medium"
series: "系统设计题"
---

# [系统设计] 设计一个自动 Code Review Agent

> 🔒 **PRO 内容** — 升级 Pro 解锁完整设计方案与评分标准。

## 题目原文

> "请设计一个 AI Code Review Agent，接入 GitHub PR 流程，要求：
> - 自动分析 PR diff，生成 inline review comments
> - 能调用 linter、SAST 工具等静态分析结果作为上下文
> - 能识别常见安全漏洞（SQL 注入、XSS、敏感信息泄露）
> - Review 结果需有解释，不能只说「这里有问题」
> - 支持 10 个并发 PR，延迟 < 60 秒
>
> 请描述架构，并重点讲清楚 Agent 的 Tool 设计和 Prompt 策略。"

---

## 考察维度（考官视角）

1. **工具设计**：如何把 diff 切片成 Agent 能处理的粒度？
2. **上下文管理**：大型 PR 的 diff 会超出 context window，如何处理？
3. **多工具协调**：linter 结果、SAST 结果、代码本身如何融合？
4. **输出格式控制**：如何确保输出是结构化的 GitHub review comment 格式？
5. **安全识别**：Agent 是否能真正"理解"安全漏洞，还是只是模板匹配？

> 完整方案、架构图、Prompt 设计见 PRO 内容 👆
