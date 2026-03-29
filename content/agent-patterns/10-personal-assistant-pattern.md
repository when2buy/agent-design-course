---
title: "Pattern: Personal Assistant Agent Architecture"
excerpt: "What modules does a personal assistant agent actually need? This article designs a real Personal Assistant from first principles — multi-channel ingestion, proactive/reactive modes, memory layers, and the Human-in-the-Loop checkpoints that make it trustworthy."
isPremium: false
order: 10
readingTime: 18
tags: ["personal-assistant", "system-design", "pattern", "multi-channel", "hitl"]
series: "Agent Design Patterns"
---

# Pattern: Personal Assistant Agent Architecture

## What Problem Are We Actually Solving?

Before writing a line of code, you need to whiteboard what your agent is actually supposed to do.

A "personal assistant" is dangerously vague. Nail the scope first:

```
What the agent DOES:
  ✅ Monitors inbound messages (Telegram, Email, SMS)
  ✅ Surfaces what needs the human's attention
  ✅ Takes actions when explicitly authorized
  ✅ Remembers preferences and context across sessions
  ✅ Proactively flags time-sensitive items

What the agent DOES NOT DO (initial version):
  ❌ Send emails autonomously (requires approval)
  ❌ Make purchases or financial transactions
  ❌ Delete or archive without confirmation
  ❌ Share information between channels without permission
```

This scoping exercise — listing capabilities and anti-capabilities — is the first pattern from production agent builders. Teams that skip it end up with agents that try to do everything and do nothing well.

## The Core Architecture

A personal assistant agent has four functional layers:

```
┌─────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                       │
│   Telegram │ Email │ Calendar │ SMS │ Web               │
└──────────────────────┬──────────────────────────────────┘
                       │ normalized events
┌──────────────────────▼──────────────────────────────────┐
│                   ATTENTION ROUTER                       │
│   Priority scoring │ Deduplication │ Rate limiting       │
└──────────────────────┬──────────────────────────────────┘
                       │ filtered + ranked queue
┌──────────────────────▼──────────────────────────────────┐
│                    AGENT CORE                            │
│   ReAct reasoning │ Tool execution │ Context management  │
└──────────┬─────────────────────────────────┬────────────┘
           │ read/write                       │ output
┌──────────▼──────────┐           ┌──────────▼────────────┐
│    MEMORY SYSTEM    │           │  HUMAN-IN-THE-LOOP     │
│ Working │ Episodic  │           │ Notification │ Approval│
│ Semantic│ Prefs     │           │ surface      │ queue   │
└─────────────────────┘           └───────────────────────┘
```

Let's build each layer.

## Layer 1: Multi-Channel Ingestion

Every channel has a different format, authentication model, and delivery mechanism. The ingestion layer normalizes everything into a single event schema:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

@dataclass
class InboundEvent:
    id: str
    channel: Literal["telegram", "email", "calendar", "sms", "web"]
    sender: str
    content: str
    timestamp: datetime
    metadata: dict  # channel-specific extras
    priority: float = 0.0  # filled by attention router

# Telegram adapter
class TelegramIngester:
    async def poll(self) -> list[InboundEvent]:
        updates = await self.bot.get_updates(offset=self.offset)
        events = []
        for update in updates:
            msg = update.message
            events.append(InboundEvent(
                id=f"tg-{update.update_id}",
                channel="telegram",
                sender=str(msg.from_user.id),
                content=msg.text or "",
                timestamp=msg.date,
                metadata={"chat_id": msg.chat.id, "update": update}
            ))
        return events

# Email adapter
class EmailIngester:
    async def poll(self) -> list[InboundEvent]:
        messages = await self.imap.fetch_unread()
        return [
            InboundEvent(
                id=f"email-{msg.message_id}",
                channel="email",
                sender=msg.from_addr,
                content=f"Subject: {msg.subject}\n\n{msg.body_text}",
                timestamp=msg.date,
                metadata={"thread_id": msg.thread_id, "labels": msg.labels}
            )
            for msg in messages
        ]
```

## Layer 2: The Attention Router

Not every incoming message needs the agent's attention. An email newsletter is not urgent. A message from your boss saying "call me" is.

The attention router scores every event and decides what to surface:

```python
class AttentionRouter:
    def __init__(self, llm, preferences: dict):
        self.llm = llm
        self.prefs = preferences

    async def score(self, event: InboundEvent) -> float:
        """Returns 0.0 (ignore) to 1.0 (urgent)."""

        # Rule-based fast path
        if event.sender in self.prefs.get("vip_contacts", []):
            return 0.9

        if any(kw in event.content.lower()
               for kw in ["urgent", "asap", "deadline", "emergency"]):
            return 0.85

        # LLM scoring for ambiguous cases
        score_prompt = f"""
Rate the urgency of this message for a busy professional (0.0 = can ignore, 1.0 = needs immediate attention):

Channel: {event.channel}
From: {event.sender}
Content: {event.content[:500]}

Known preferences: {self.prefs.get('attention_rules', 'none')}

Reply with only a number between 0.0 and 1.0.
"""
        response = await self.llm.complete(score_prompt)
        return float(response.strip())

    async def filter(self, events: list[InboundEvent]) -> list[InboundEvent]:
        scored = []
        for event in events:
            event.priority = await self.score(event)
            if event.priority >= 0.3:  # Threshold from preferences
                scored.append(event)

        # Sort by priority, deduplicate similar content
        scored.sort(key=lambda e: e.priority, reverse=True)
        return self._deduplicate(scored)
```

## Layer 3: The Memory System

A personal assistant without memory is just a fancy search engine. Memory is what makes it *personal*.

There are four types of memory your agent needs:

### Working Memory (current session context)

```python
class WorkingMemory:
    """What the agent is actively thinking about right now."""
    def __init__(self, max_tokens: int = 8000):
        self.messages: list[dict] = []
        self.max_tokens = max_tokens

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()

    def _trim_if_needed(self):
        while self._token_count() > self.max_tokens:
            # Remove oldest non-system messages
            for i, msg in enumerate(self.messages):
                if msg["role"] != "system":
                    self.messages.pop(i)
                    break
```

### Episodic Memory (what happened before)

```python
class EpisodicMemory:
    """Searchable log of past interactions and outcomes."""
    def __init__(self, db_path: str):
        self.db = sqlite3.connect(db_path)
        self._init_schema()

    def record(self, event: str, outcome: str, tags: list[str]):
        self.db.execute(
            "INSERT INTO episodes (timestamp, event, outcome, tags) VALUES (?, ?, ?, ?)",
            (datetime.now().isoformat(), event, outcome, json.dumps(tags))
        )
        self.db.commit()

    def recall(self, query: str, limit: int = 5) -> list[dict]:
        # Simple FTS search (upgrade to vector search in production)
        rows = self.db.execute(
            "SELECT * FROM episodes WHERE event LIKE ? OR outcome LIKE ? ORDER BY timestamp DESC LIMIT ?",
            (f"%{query}%", f"%{query}%", limit)
        ).fetchall()
        return [{"event": r[2], "outcome": r[3], "tags": json.loads(r[4])} for r in rows]
```

### Semantic Memory (curated long-term facts)

```python
class SemanticMemory:
    """Things the agent should always know about you."""

    DEFAULT_STRUCTURE = {
        "identity": {
            "name": None,
            "timezone": None,
            "primary_language": "English",
        },
        "preferences": {
            "communication_style": "concise",
            "notification_hours": {"start": 8, "end": 22},
            "vip_contacts": [],
        },
        "recurring_context": {
            # e.g. "weekly team meeting: Mondays 10am"
            # "gym days: Tuesday/Thursday"
        }
    }

    def get(self, key: str) -> any:
        parts = key.split(".")
        val = self.data
        for part in parts:
            val = val.get(part, {})
        return val

    def update(self, key: str, value: any):
        # Updates are written to a MEMORY.md-style persistent file
        ...
```

### Preference Memory (learned behavior over time)

```python
class PreferenceMemory:
    """Learns from corrections and feedback."""

    def record_correction(self, original_action: str, correction: str):
        """User said 'don't do X, do Y instead'."""
        self.preferences.append({
            "pattern": original_action,
            "correction": correction,
            "timestamp": datetime.now().isoformat()
        })
        self._save()

    def get_relevant_preferences(self, action: str) -> list[str]:
        """Before taking an action, check if there are relevant preferences."""
        relevant = []
        for pref in self.preferences:
            if self._is_similar(action, pref["pattern"]):
                relevant.append(f"Previously: {pref['correction']}")
        return relevant
```

## Layer 4: Human-in-the-Loop

This is the most important layer for a personal assistant. The agent has access to your private data, your communication channels, and your calendar. Full autonomy is dangerous.

The key insight: different actions have different risk profiles. Design your HITL checkpoints around risk, not convenience.

```python
from enum import Enum

class RiskLevel(Enum):
    OBSERVE = "observe"      # Agent reads/monitors, no action
    NOTIFY = "notify"        # Agent sends you a notification
    PROPOSE = "propose"      # Agent drafts a response, you approve
    EXECUTE = "execute"      # Agent acts (low-stakes, reversible)
    ESCALATE = "escalate"    # Must have explicit approval

RISK_MAP = {
    "read_email": RiskLevel.OBSERVE,
    "summarize_calendar": RiskLevel.OBSERVE,
    "send_notification_to_user": RiskLevel.NOTIFY,
    "draft_reply": RiskLevel.PROPOSE,
    "create_calendar_event": RiskLevel.EXECUTE,
    "send_email": RiskLevel.ESCALATE,
    "delete_email": RiskLevel.ESCALATE,
    "share_document": RiskLevel.ESCALATE,
}

class HITLGate:
    async def check(self, action: str, details: dict, user_channel) -> bool:
        risk = RISK_MAP.get(action, RiskLevel.ESCALATE)

        if risk == RiskLevel.OBSERVE:
            return True  # No check needed

        if risk == RiskLevel.NOTIFY:
            await user_channel.send(f"ℹ️ {details['message']}")
            return True

        if risk == RiskLevel.PROPOSE:
            # Show draft, wait for approval
            msg = f"📝 **Draft response:**\n\n{details['content']}\n\nApprove? (yes/edit/cancel)"
            response = await user_channel.send_and_wait(msg, timeout=300)
            return response.lower() == "yes"

        if risk == RiskLevel.EXECUTE:
            msg = f"⚡ About to: {action}\n{details.get('summary', '')}\nProceed?"
            response = await user_channel.send_and_wait(msg, timeout=60)
            return response.lower() in ["yes", "y", "ok"]

        if risk == RiskLevel.ESCALATE:
            msg = f"🔐 **Authorization required**\nAction: {action}\n{details}\n\nType APPROVE to confirm."
            response = await user_channel.send_and_wait(msg, timeout=600)
            return response == "APPROVE"
```

### The Deferred Execution Pattern

The problem with blocking HITL: humans don't respond immediately. A 2am notification asking for approval will sit unread until morning, blocking the entire workflow.

Deferred execution handles this:

```python
class DeferredActionQueue:
    """Agent proposes actions, human approves async."""

    async def propose(self, action: str, details: dict) -> str:
        action_id = str(uuid.uuid4())[:8]
        self.pending[action_id] = {
            "action": action,
            "details": details,
            "proposed_at": datetime.now(),
            "status": "pending"
        }
        # Notify user but DON'T block
        await self.notify_user(
            f"📋 Action queued [{action_id}]: {action}\n"
            f"Approve with: /approve {action_id}"
        )
        return action_id

    async def execute_approved(self, action_id: str):
        item = self.pending.get(action_id)
        if item and item["status"] == "pending":
            item["status"] = "executing"
            await self.executor.run(item["action"], item["details"])
            item["status"] = "done"
```

## Proactive vs Reactive Modes

A reactive assistant waits for you to ask. A proactive assistant surfaces things before you have to ask.

```python
class ProactiveEngine:
    """Runs on a schedule, surfaces what you should know."""

    CHECKS = [
        {
            "name": "morning_brief",
            "schedule": "0 8 * * *",  # 8am daily
            "fn": "generate_daily_brief"
        },
        {
            "name": "upcoming_events",
            "schedule": "*/30 * * * *",  # Every 30 min
            "fn": "check_upcoming_calendar"
        },
        {
            "name": "urgent_emails",
            "schedule": "*/15 * * * *",  # Every 15 min
            "fn": "scan_email_priority"
        }
    ]

    async def generate_daily_brief(self) -> str:
        calendar = await self.get_todays_calendar()
        emails = await self.get_high_priority_emails()
        tasks = await self.get_pending_tasks()

        return await self.llm.complete(f"""
Generate a concise morning brief (5-7 bullet points max):

Calendar today: {calendar}
High-priority emails: {emails}
Pending tasks: {tasks}

Focus on: what needs attention today, any conflicts, deadlines.
""")
```

## Putting It Together: The Main Loop

```python
class PersonalAssistantAgent:
    def __init__(self, config: dict):
        self.ingesters = [TelegramIngester(), EmailIngester(), CalendarIngester()]
        self.router = AttentionRouter(llm, config["preferences"])
        self.memory = {
            "working": WorkingMemory(),
            "episodic": EpisodicMemory("./assistant.db"),
            "semantic": SemanticMemory("./memory.md"),
        }
        self.hitl = HITLGate(user_channel=config["notification_channel"])
        self.proactive = ProactiveEngine()

    async def run_reactive_loop(self):
        """Handles inbound requests from the user."""
        while True:
            # 1. Collect events from all channels
            all_events = []
            for ingester in self.ingesters:
                all_events.extend(await ingester.poll())

            # 2. Route and prioritize
            important = await self.router.filter(all_events)

            # 3. Process each event
            for event in important:
                # Build context from memory
                context = self._build_context(event)

                # Reason about response
                plan = await self.llm.plan(event, context)

                # Execute with HITL gates
                for action in plan.actions:
                    approved = await self.hitl.check(action.name, action.details)
                    if approved:
                        result = await self.executor.run(action)
                        self.memory["episodic"].record(
                            event=str(event),
                            outcome=str(result),
                            tags=[event.channel, action.name]
                        )

            await asyncio.sleep(10)  # Poll interval

    def _build_context(self, event: InboundEvent) -> str:
        """Assemble relevant context from all memory layers."""
        prefs = self.memory["semantic"].get("preferences")
        recent = self.memory["episodic"].recall(event.content, limit=3)
        working = self.memory["working"].messages[-6:]  # Last 3 turns

        return f"""
User preferences: {json.dumps(prefs, indent=2)}

Recent relevant history:
{chr(10).join(f'- {r["event"]}: {r["outcome"]}' for r in recent)}

Current conversation:
{json.dumps(working, indent=2)}
"""
```

## Architecture Tradeoffs

### Privacy

The personal assistant has access to everything. This creates real risk:
- **Don't store raw message content** in cloud services — keep it local
- **Encrypt episodic memory** at rest
- **Minimize what you log** — outcomes matter more than verbatim transcripts
- In group chats, **never share private context** from other channels

### Cost

A personal assistant running 24/7 can be expensive if you're not careful:
- Use smaller models (Haiku, GPT-4o-mini) for attention routing and scoring
- Reserve larger models (Sonnet, GPT-4o) for actual response generation
- Cache repetitive operations (weather, calendar checks)
- Rate-limit proactive checks during working hours only

### Latency

Users expect fast responses on Telegram, slower is fine for email:
- **Telegram**: < 2 seconds — keep working memory small, use fast models
- **Email**: < 5 minutes — can afford deeper reasoning
- **Proactive**: Async, no latency constraint — do thorough analysis

## OpenClaw as a Reference Implementation

OpenClaw implements this pattern with:
- **Channels**: Telegram, Discord, Signal as ingestion surfaces
- **Memory**: MEMORY.md (semantic), memory/YYYY-MM-DD.md (episodic)
- **HITL**: Every external action (email, tweet, public post) requires explicit instruction
- **Proactive**: Heartbeat system checks email/calendar every 30 min during waking hours
- **Skills**: Dynamically loaded capability bundles (weather, github, digitalocean)

The key design insight: the agent is a *participant*, not a *proxy*. In group chats, it doesn't speak as the user — it has its own voice and applies judgment about when to contribute.
