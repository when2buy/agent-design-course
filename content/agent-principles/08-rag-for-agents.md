---
title: "RAG for Agents: Retrieval-Augmented Generation Done Right"
excerpt: "Bolting a vector database onto an agent is not enough. This article explains Naive RAG's failure modes, the five ways context can break your agent, Advanced RAG's fixes, and how Agentic RAG turns retrieval itself into a plannable action."
isPremium: false
order: 8
readingTime: 16
tags: ["rag", "vector-db", "retrieval", "embedding"]
---

# RAG for Agents: Retrieval-Augmented Generation Done Right

## The Goldilocks Problem

Every AI agent has a context window — a finite amount of working memory. What you put in that window determines whether your agent succeeds or fails.

Give an agent **too little context** and it can't answer the question. It lacks the facts, can't verify its reasoning, and hallucinates to fill the gaps.

Give it **too much context** — or the *wrong* context — and it gets worse. Models given irrelevant information focus on it anyway, generating low-quality responses that miss the point. At extreme lengths, even models with million-token windows start degrading.

**Retrieval-Augmented Generation (RAG)** is the engineering discipline of putting the *right* information into context at the *right* time. Getting it wrong is one of the most common causes of agent failure in production.

## Naive RAG: How Most Teams Start

The basic RAG pipeline is seductive in its simplicity:

```python
from openai import OpenAI
from qdrant_client import QdrantClient

client = OpenAI()
vector_db = QdrantClient("localhost", port=6333)

def naive_rag(question: str) -> str:
    # 1. Embed the question
    embedding = client.embeddings.create(
        model="text-embedding-3-small",
        input=question
    ).data[0].embedding

    # 2. Search the vector database
    results = vector_db.search(
        collection_name="documents",
        query_vector=embedding,
        limit=5
    )
    context = "\n".join([r.payload["text"] for r in results])

    # 3. Generate answer with context
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Answer based on this context:\n{context}"},
            {"role": "user", "content": question}
        ]
    )
    return response.choices[0].message.content
```

This works surprisingly well in demos. Then it hits production.

## The Five Ways Context Breaks Your Agent

Before fixing RAG, you need to understand how context fails. There are five distinct failure modes:

### 1. Context Poisoning

A hallucination or factual error enters the agent's context. Because the agent treats its context as ground truth, it repeatedly references the error in subsequent reasoning — the mistake compounds.

```
Step 1: Agent retrieves a doc saying "API rate limit: 10 req/min"
        (The actual limit is 100 req/min — the doc is outdated)
Step 2: Agent designs throttling logic around 10 req/min
Step 3: Agent builds retry logic assuming 10 req/min
Step 4: All downstream decisions are poisoned by the initial error
```

**Fix**: Version your knowledge base. Flag documents by date. For critical facts, have the agent verify with a live API call rather than trusting retrieved text.

### 2. Context Distraction

When context is very long, the model starts over-focusing on what's in the context and discounts its own training knowledge. A model told "here are 50 relevant documents" about Python will start ignoring what it already knows about Python.

```python
# ❌ Naive: dump everything
context = "\n\n".join(all_matching_docs)  # 40,000 tokens of "context"

# ✅ Better: curate ruthlessly
context = "\n\n".join(top_3_most_relevant_docs)  # 3,000 tokens, high signal
```

### 3. Context Confusion

Irrelevant documents in context confuse the model. It tries to reconcile unrelated information with the actual question, producing off-topic or incoherent responses.

This happens when:
- Your embedding similarity threshold is too low
- You're using keywords that match on surface similarity, not semantic relevance
- Your retrieval returns `k=10` results when only 2 are actually relevant

### 4. Context Clash

New information contradicts previous information already in context. The model has to reconcile two conflicting "truths" and often does so poorly — picking one arbitrarily or hedging in confusing ways.

```
Context chunk 1: "The refund policy allows returns within 30 days."
Context chunk 2: "Premium members can return items within 90 days."

User: "Can I return this item from 45 days ago?"
Agent: "I'm not sure... it depends... possibly... [5 paragraphs of confusion]"
```

**Fix**: Deduplicate and reconcile your knowledge base. If policies have tiers, store them together with clear structure.

### 5. Context Rot

The most insidious failure mode: performance degradation over long contexts, even with modern "million-token" models.

**Real example**: A Google Gemini team building a Pokemon-playing agent found their agent's accuracy started degrading when the context hit ~125,000 tokens — despite running on a model with a 500,000-token context window. They were only using 25% of available context, but performance was already falling off.

The fix was multi-pronged:
- Use RAG to filter to top-K results instead of including all relevant information
- Use context pruning to remove stale/irrelevant information
- Store structured agent context that assembles a compiled string per LLM call

The lesson: **context windows are not free real estate**. Every token in context influences the model's behavior, for better or worse.

## Advanced RAG: Engineering Better Retrieval

### 1. Better Chunking

The unit you embed matters. Too large and the embedding averages out meaning. Too small and you lose context.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ❌ Naive: fixed 1000-character chunks
splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)

# ✅ Better: semantic chunks that respect document structure
splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,  # Overlap prevents cutting mid-sentence
    separators=["\n\n", "\n", ".", "!", "?", " "]
)

# ✅ Even better: store parent chunks, retrieve child chunks
# Small chunks for precision retrieval, but return the larger parent for context
```

### 2. Hybrid Search

Pure vector search misses exact matches. BM25 (keyword search) misses semantic similarity. Combine them:

```python
from langchain.retrievers import EnsembleRetriever

# Dense retrieval (semantic)
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# Sparse retrieval (keyword BM25)
bm25_retriever = BM25Retriever.from_documents(docs)
bm25_retriever.k = 5

# Combine
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.4, 0.6]  # Tune based on your query distribution
)
```

### 3. Reranking

Initial retrieval gets you the right documents 80% of the time. A reranker gets you there 95% of the time:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query: str, docs: list[str], top_k: int = 3) -> list[str]:
    pairs = [(query, doc) for doc in docs]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:top_k]]
```

### 4. Metadata Filtering

Don't just search by content — filter by metadata first:

```python
# ❌ Naive: search everything
results = vectorstore.similarity_search(query, k=5)

# ✅ Better: filter by relevant metadata first
results = vectorstore.similarity_search(
    query,
    k=5,
    filter={
        "source": "official_docs",   # Only search official documentation
        "updated_after": "2024-01-01",  # Only recent docs
        "product": user_context.product_line  # Relevant to this user
    }
)
```

## Agentic RAG: Retrieval as a Tool

In basic RAG, retrieval happens automatically before every LLM call. In **Agentic RAG**, retrieval is a tool the agent can call deliberately, as part of its reasoning.

```python
@tool
def search_knowledge_base(
    query: str,
    source: Literal["docs", "wiki", "issues", "all"] = "all",
    max_results: int = 5
) -> str:
    """
    Search the internal knowledge base for relevant information.

    Use this when:
    - You need specific facts, procedures, or policies
    - The user asks about internal systems or processes
    - You need to verify a claim

    Do NOT use this for:
    - General knowledge the model already knows
    - Real-time information (use search_web instead)

    Args:
        query: Natural language search query
        source: Which sources to search
        max_results: Number of results to return (1-10)
    """
    results = rag_pipeline.query(query, source=source, k=max_results)
    return format_results(results)
```

The agent now decides *when* to retrieve and *what* to retrieve:

```
User: "What's our refund policy for enterprise customers?"

Agent reasoning:
  → I need to look up our current enterprise policies
  → search_knowledge_base("enterprise customer refund policy", source="docs")
  → [Results: Enterprise Support Agreement v2.3, section 4.2]
  → Answer: "Enterprise customers have 90-day return window per..."
```

This is more powerful than pre-retrieval because:
- The agent can retrieve multiple times if the first result is insufficient
- The agent can refine its query based on partial results
- The agent doesn't waste tokens on retrieval when it already knows the answer

## Context Compression: Managing Long Conversations

In long-running agent sessions, retrieved content accumulates. What was relevant in step 3 may be noise in step 15.

Strategies from production systems:

```python
class ContextManager:
    """Manages context window usage for long-running agents."""

    COMPRESSION_THRESHOLD = 0.80  # Compress when 80% full

    def __init__(self, max_tokens: int = 128_000):
        self.max_tokens = max_tokens
        self.messages = []
        self.current_tokens = 0

    def add_message(self, message: dict):
        self.messages.append(message)
        self.current_tokens += count_tokens(message)

        if self.current_tokens / self.max_tokens > self.COMPRESSION_THRESHOLD:
            self._compress()

    def _compress(self):
        """Summarize the middle of the conversation, keep recent messages."""
        # Keep first 2 (system prompt + initial context) and last 6 messages
        keep_start = self.messages[:2]
        keep_end = self.messages[-6:]
        middle = self.messages[2:-6]

        if not middle:
            return

        # Summarize the middle
        summary = llm.summarize(middle, instruction=(
            "Summarize the key decisions, facts discovered, and current state. "
            "Preserve: tool call results that will be needed later, "
            "user preferences stated, errors encountered and their resolutions."
        ))

        self.messages = keep_start + [
            {"role": "system", "content": f"[Conversation summary: {summary}]"}
        ] + keep_end
        self.current_tokens = sum(count_tokens(m) for m in self.messages)
```

Claude Code uses a similar approach: when you reach 95% of context window capacity, it auto-compacts by summarizing the full trajectory of user-agent interactions.

## When to Use RAG vs Alternatives

| Approach | Best for | Weakness |
|---|---|---|
| **RAG** | Large, frequently updated knowledge bases | Retrieval quality issues |
| **Fine-tuning** | Domain-specific style, tone, reasoning | Expensive, stale after training |
| **Long context** | Complex documents that need holistic understanding | Cost, context rot |
| **Tool calls** | Real-time data, authoritative sources | Latency, API dependencies |

Rule of thumb:
- **Use RAG** when you have >100 documents and they change often
- **Use fine-tuning** when you need consistent style/format, not factual recall
- **Use long context** when document relationships matter (legal contract analysis)
- **Use real-time tool calls** when accuracy is non-negotiable (financial data, medical guidelines)

## Production RAG Architecture

A battle-tested pipeline:

```python
class ProductionRAG:
    def __init__(self):
        self.embedder = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vector_store = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        self.cache = RedisCache(ttl=300)

    def query(self, question: str, filters: dict = None, top_k: int = 5) -> list[dict]:
        # 1. Check cache
        cache_key = f"rag:{hash(question)}:{hash(str(filters))}"
        if cached := self.cache.get(cache_key):
            return cached

        # 2. Hybrid search
        dense_results = self._dense_search(question, filters, k=top_k * 2)
        sparse_results = self._sparse_search(question, filters, k=top_k * 2)
        combined = self._deduplicate(dense_results + sparse_results)

        # 3. Rerank
        reranked = self._rerank(question, combined, top_k=top_k)

        # 4. Cache and return
        self.cache.set(cache_key, reranked)
        return reranked

    def _dense_search(self, query, filters, k):
        embedding = self.embedder.embed_query(query)
        return self.vector_store.search(
            collection_name="knowledge_base",
            query_vector=embedding,
            query_filter=filters,
            limit=k
        )

    def _sparse_search(self, query, filters, k):
        # BM25 via Qdrant's sparse vectors
        return self.vector_store.search(
            collection_name="knowledge_base",
            query_sparse_vector=encode_sparse(query),
            query_filter=filters,
            limit=k
        )

    def _rerank(self, query, docs, top_k):
        texts = [d.payload["text"] for d in docs]
        pairs = [(query, t) for t in texts]
        scores = self.reranker.predict(pairs)
        ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
        return [doc for doc, _ in ranked[:top_k]]
```

RAG done right transforms your agent from a model with a knowledge cutoff into a system that knows what it needs to know, when it needs to know it — without getting lost in noise.
