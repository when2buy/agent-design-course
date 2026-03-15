---
title: "RAG for Agents：检索增强的正确打开方式"
excerpt: "把 RAG 接入 Agent 不是把向量库挂上去就完事——本文讲清楚 Naive RAG 的问题、Advanced RAG 的改进，以及 Agentic RAG 如何让检索本身也变成一个可规划的行动。"
isPremium: false
order: 8
readingTime: 16
tags: ["rag", "vector-db", "retrieval", "embedding"]
---

# RAG for Agents：检索增强的正确打开方式

> 🚧 **内容即将上线** — 本文正在撰写中，敬请期待。

## 预告内容

- Naive RAG 的三大痛点：召回不准、切片错误、Context Pollution
- Advanced RAG：HyDE、多路召回、Reranker
- Agentic RAG：让 Agent 自己决定"要不要检索、检索什么"
- 向量数据库选型：Pinecone / Qdrant / pgvector 横向对比
- Embedding 模型选择与多语言支持
- 实战：为 Agent 实现一个文档知识库工具

---

*想优先看到这篇文章？在下方留言告诉我们！*
