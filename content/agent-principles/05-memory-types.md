---
title: "Agent Memory System Design"
excerpt: "Building an effective agent memory architecture: working memory, episodic memory, semantic memory — design patterns and implementation."
isPremium: false
order: 5
readingTime: 14
tags: ["memory", "vector-db", "rag"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Agent Memory System Design

## Why Memory Is Critical

An agent without memory is like a person with amnesia — every conversation starts from scratch. No accumulated knowledge, no user preferences, no long-running task state.

## The Four Types of Memory

### 1. Working Memory

The current task context stored in the LLM's context window:

```python
class WorkingMemory:
    def __init__(self, max_tokens=8000):
        self.messages = []
        self.max_tokens = max_tokens

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()

    def _trim_if_needed(self):
        # Drop oldest non-system messages to stay within the token budget
        while count_tokens(self.messages) > self.max_tokens and len(self.messages) > 2:
            self.messages.pop(1)
```

### 2. Episodic Memory

Summaries of past conversations that allow context to be restored:

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

### 3. Semantic Memory

A vector database knowledge base that supports semantic retrieval:

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

### 4. Procedural Memory

Learned operating procedures, baked into the system prompt or code. Stable patterns the agent always follows.

## Complete Memory System

```python
class AgentMemory:
    def __init__(self, user_id: str):
        self.working = WorkingMemory(max_tokens=8000)
        self.episodic = EpisodicMemory(f"./data/{user_id}/episodes.db")
        self.semantic = SemanticMemory()

    def build_context(self, current_query: str) -> str:
        relevant = self.semantic.recall(current_query, k=3)
        recent = self.episodic.recall_recent(n=3)

        return f"""## Relevant Memories
{chr(10).join(relevant)}

## Recent Sessions
{chr(10).join(recent)}"""

    def save_session(self, messages: list):
        summary = llm.summarize(messages)
        key_facts = llm.extract_facts(messages)
        self.episodic.store_episode(
            session_id=str(uuid4()),
            summary=summary,
            key_facts=key_facts
        )
        for fact in key_facts:
            self.semantic.remember(fact)
```

## Memory Compression

As memories accumulate, they need periodic compression:

```python
def compress_memories(memories: list, llm) -> str:
    prompt = f"""Compress the following memory entries into a concise summary, preserving the most important information:

{chr(10).join(memories)}

Compressed summary:"""
    return llm.complete(prompt)
```
