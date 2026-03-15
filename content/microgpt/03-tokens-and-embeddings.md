---
title: "Tokens & Embeddings：语言模型如何「看」世界"
excerpt: "LLM 不理解文字，它只处理数字。本文从 Token 切分到高维向量空间，解释为什么 AI 能理解「国王 - 男 + 女 ≈ 女王」，以及这对 Agent 设计意味着什么。"
isPremium: false
order: 3
readingTime: 10
tags: ["tokens", "embeddings", "llm-basics", "microgpt"]
---

# Tokens & Embeddings：语言模型如何「看」世界

> 🚧 **内容即将上线** — 本文正在撰写中，敬请期待。

## 预告内容

- Tokenization：BPE、WordPiece 的工作原理
- 为什么 "tokenization" 可能被切成 3 个 Token
- Embedding：把词变成向量的本质是什么
- 向量空间里的语义运算
- Context Window 的真正含义与 Agent 设计影响
- 实战：用 `tiktoken` 计算 Token 数量与成本

---

*想优先看到这篇文章？在下方留言告诉我们！*
