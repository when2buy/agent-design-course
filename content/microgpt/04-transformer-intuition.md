---
title: "Transformer 直觉：Self-Attention 到底在做什么"
excerpt: "不推公式，只讲直觉。Attention 机制其实是在问「这个词和其他哪些词最相关？」本文用信息检索的视角，让你真正理解 Transformer 的核心思想。"
isPremium: false
order: 4
readingTime: 12
tags: ["transformer", "attention", "llm-basics", "microgpt"]
---

# Transformer 直觉：Self-Attention 到底在做什么

> 🚧 **内容即将上线** — 本文正在撰写中，敬请期待。

## 预告内容

- 从 RNN 的问题说起：为什么需要 Attention
- Self-Attention 的直觉：Query、Key、Value 的类比
- 多头注意力：为什么要「多头」
- 位置编码：让模型知道词的顺序
- Layer Norm、FFN 各有什么用？
- 从 Transformer 到 GPT：Decoder-only 架构的选择

---

*想优先看到这篇文章？在下方留言告诉我们！*
