---
title: "Agent 记忆系统设计"
excerpt: "构建高效的 Agent 记忆架构：工作记忆、情节记忆、语义记忆的设计与实现。"
isPremium: true
order: 1
readingTime: 14
tags: ["memory", "vector-db", "rag"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Agent 记忆系统设计

## 为什么记忆对 Agent 至关重要

没有记忆的 Agent 就像患了失忆症的人——每次对话都从零开始，无法积累知识，无法学习用户偏好，无法处理长期任务。

## 记忆的四种类型

### 1. 工作记忆（Working Memory）

存储在 LLM 的 context window 中的当前任务上下文：

```python
class WorkingMemory:
    def __init__(self, max_tokens=8000):
        self.messages = []
        self.max_tokens = max_tokens

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()

    def _trim_if_needed(self):
        while count_tokens(self.messages) > self.max_tokens and len(self.messages) > 2:
            # 删除最早的非系统消息，保留系统提示和最近上下文
            self.messages.pop(1)
```

### 2. 情节记忆（Episodic Memory）

过去对话的摘要，用于恢复上下文：

```python
class EpisodicMemory:
    def __init__(self, db_path: str):
        self.db = SQLiteDB(db_path)

    def store_episode(self, session_id: str, summary: str, key_facts: list):
        self.db.insert("episodes", {
            "session_id": session_id,
            "summary": summary,
            "key_facts": json.dumps(key_facts),
            "timestamp": datetime.now()
        })

    def recall_recent(self, n=5) -> list:
        return self.db.query(
            "SELECT summary FROM episodes ORDER BY timestamp DESC LIMIT ?", [n]
        )
```

### 3. 语义记忆（Semantic Memory）

向量数据库存储的知识库，支持语义检索：

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

class SemanticMemory:
    def __init__(self):
        self.vectorstore = Chroma(
            embedding_function=OpenAIEmbeddings(),
            persist_directory="./semantic_memory"
        )

    def remember(self, content: str, metadata: dict = {}):
        self.vectorstore.add_texts(texts=[content], metadatas=[metadata])

    def recall(self, query: str, k=5) -> list:
        docs = self.vectorstore.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
```

### 4. 程序记忆（Procedural Memory）

Agent 学会的操作步骤，固化在 system prompt 或代码中。

## 完整记忆系统

```python
class AgentMemory:
    def __init__(self, user_id: str):
        self.working = WorkingMemory(max_tokens=8000)
        self.episodic = EpisodicMemory(f"./data/{user_id}/episodes.db")
        self.semantic = SemanticMemory()

    def build_context(self, current_query: str) -> str:
        relevant = self.semantic.recall(current_query, k=3)
        recent = self.episodic.recall_recent(n=3)

        return f"""## 相关记忆
{chr(10).join(relevant)}

## 最近对话
{chr(10).join(recent)}"""

    def save_session(self, messages: list):
        summary = llm.summarize(messages)
        key_facts = llm.extract_facts(messages)
        self.episodic.store_episode(session_id=str(uuid4()), summary=summary, key_facts=key_facts)
        for fact in key_facts:
            self.semantic.remember(fact)
```

## 记忆压缩策略

随时间增长的记忆需要定期压缩：

```python
def compress_memories(memories: list, llm) -> str:
    prompt = f"""将以下记忆条目压缩为简洁摘要，保留最重要的信息：

{chr(10).join(memories)}

压缩摘要："""
    return llm.complete(prompt)
```
