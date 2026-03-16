---
title: "Stage 3: Task Graphs & Background Concurrency (s07–s08)"
excerpt: "Upgrade flat to-do lists into dependency-aware persistent task graphs. Add a daemon thread so the agent keeps thinking while waiting on slow operations — real engineering-grade task scheduling."
isPremium: false
order: 4
readingTime: 16
tags: ["claude-code", "agent", "stage3", "task-graph", "concurrency"]
series: "CLI Agent Pattern"
---

# Stage 3: Engineering-Grade Task Management

Stage 2 kept the agent's mind clear. Stage 3 gives it a proper engineering workflow: **structured task planning** and **true concurrency**.

Two challenges:
1. Real projects have dependencies — "run tests" only makes sense after "write the code"
2. Slow operations (test suites, builds, API calls) should run in the background while the agent plans the next step

---

## s07: Task Graph — Dependencies, Persistence, Prioritization

> **Mantra:** *"Big goals → small tasks → ordered by dependency → persisted to disk"*

### The Problem

`TodoManager` from s03 was a flat list. It has no concept of:
- **Dependencies**: task B can't start until task A finishes
- **Persistence**: if the agent restarts, it loses all progress
- **Priority**: which task is most valuable to complete next?

### The Solution: TaskGraph

```
Goal: "Add auth to the API"
      |
      v
[TaskGraph]
  ├── task-1: Write User model         [pending]
  ├── task-2: Write auth endpoints     [pending, depends: task-1]
  ├── task-3: Write tests              [pending, depends: task-2]
  └── task-4: Update documentation    [pending, depends: task-3]

Persisted to: .tasks/tasks.json
```

### Implementation

```python
import json, uuid
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum

class TaskStatus(Enum):
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    BLOCKED     = "blocked"
    FAILED      = "failed"

@dataclass
class Task:
    id: str
    title: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 5          # 1 (high) to 10 (low)
    depends_on: List[str] = field(default_factory=list)
    result: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

class TaskGraph:
    def __init__(self, tasks_file: Path = Path(".tasks/tasks.json")):
        self.tasks_file = tasks_file
        self.tasks: dict[str, Task] = {}
        self._load()

    def _load(self):
        if self.tasks_file.exists():
            data = json.loads(self.tasks_file.read_text())
            for t in data.get("tasks", []):
                self.tasks[t["id"]] = Task(**{
                    **t, "status": TaskStatus(t["status"])
                })

    def _save(self):
        self.tasks_file.parent.mkdir(parents=True, exist_ok=True)
        self.tasks_file.write_text(json.dumps(
            {"tasks": [
                {**vars(t), "status": t.status.value}
                for t in self.tasks.values()
            ]}, indent=2
        ))

    def add_task(self, title: str, description: str,
                 depends_on: List[str] = None, priority: int = 5) -> str:
        task_id = f"task-{str(uuid.uuid4())[:8]}"
        self.tasks[task_id] = Task(
            id=task_id, title=title, description=description,
            depends_on=depends_on or [], priority=priority
        )
        self._save()
        return task_id

    def get_next_task(self) -> Optional[Task]:
        """Return highest-priority unblocked task."""
        available = [
            t for t in self.tasks.values()
            if t.status == TaskStatus.PENDING
            and all(
                self.tasks.get(dep, Task(id="", title="", description="",
                                         status=TaskStatus.COMPLETED)).status
                == TaskStatus.COMPLETED
                for dep in t.depends_on
            )
        ]
        return min(available, key=lambda t: t.priority) if available else None

    def update_status(self, task_id: str, status: TaskStatus,
                      result: str = None):
        if task_id in self.tasks:
            self.tasks[task_id].status = status
            if result:
                self.tasks[task_id].result = result
            self._save()

    def render(self) -> str:
        if not self.tasks:
            return "No tasks."
        icons = {
            TaskStatus.PENDING:     "[ ]",
            TaskStatus.IN_PROGRESS: "[>]",
            TaskStatus.COMPLETED:   "[x]",
            TaskStatus.BLOCKED:     "[!]",
            TaskStatus.FAILED:      "[✗]",
        }
        lines = []
        for t in sorted(self.tasks.values(), key=lambda x: x.priority):
            dep_str = f" (after: {', '.join(t.depends_on)})" if t.depends_on else ""
            lines.append(f"{icons[t.status]} [{t.priority}] {t.id}: {t.title}{dep_str}")
        return "\n".join(lines)

TASK_GRAPH = TaskGraph()
```

**The task graph persists to `.tasks/tasks.json`. Agent restarts don't lose progress.**

---

## s08: Background Tasks — Keep Thinking While Waiting

> **Mantra:** *"Slow operations go async. The agent keeps planning."*

### The Problem

Tests, builds, and API calls can take 30–120 seconds. A synchronous agent stops and waits. A smarter agent dispatches the slow operation to a background thread and immediately starts planning what to do next.

```
Without background tasks:
  [Agent] → start tests → ............wait 60s............ → check results → next task
                           ↑ completely blocked during this time

With background tasks:
  [Agent] → start tests → continue planning → plan next task → check results → execute
               background thread: running tests in parallel
```

### Implementation

```python
import threading
import queue
from dataclasses import dataclass
from typing import Callable, Any
from enum import Enum

class BGStatus(Enum):
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"

@dataclass
class BGTask:
    id: str
    name: str
    status: BGStatus = BGStatus.RUNNING
    result: Any = None
    error: str = None

class BackgroundManager:
    def __init__(self):
        self.tasks: dict[str, BGTask] = {}
        self._lock = threading.Lock()

    def submit(self, task_id: str, name: str, func: Callable, **kwargs) -> str:
        task = BGTask(id=task_id, name=name)
        with self._lock:
            self.tasks[task_id] = task

        def _run():
            try:
                result = func(**kwargs)
                with self._lock:
                    self.tasks[task_id].status = BGStatus.COMPLETED
                    self.tasks[task_id].result = result
            except Exception as e:
                with self._lock:
                    self.tasks[task_id].status = BGStatus.FAILED
                    self.tasks[task_id].error = str(e)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        return f"Background task '{name}' started with ID: {task_id}"

    def check(self, task_id: str) -> str:
        with self._lock:
            task = self.tasks.get(task_id)
        if not task:
            return f"No task found with ID: {task_id}"
        if task.status == BGStatus.RUNNING:
            return f"Task '{task.name}' is still running..."
        if task.status == BGStatus.COMPLETED:
            return f"Task '{task.name}' completed:\n{task.result}"
        return f"Task '{task.name}' failed: {task.error}"

    def list_tasks(self) -> str:
        with self._lock:
            tasks = list(self.tasks.values())
        if not tasks:
            return "No background tasks."
        icons = {BGStatus.RUNNING: "⟳", BGStatus.COMPLETED: "✓", BGStatus.FAILED: "✗"}
        return "\n".join(f"{icons[t.status]} {t.id}: {t.name}" for t in tasks)

BG = BackgroundManager()

# Tool handlers
TOOL_HANDLERS["background_run"] = lambda **kw: BG.submit(
    task_id=f"bg-{uuid.uuid4().hex[:8]}",
    name=kw["name"],
    func=run_bash,
    command=kw["command"]
)
TOOL_HANDLERS["background_check"] = lambda **kw: BG.check(kw["task_id"])
TOOL_HANDLERS["background_list"]  = lambda **kw: BG.list_tasks()
```

---

## Stage 3 Summary

- **s07 Task Graph**: flat to-dos → dependency-aware, persistent, prioritized task management; survives restarts
- **s08 Background Tasks**: slow operations run concurrently; the agent plans ahead rather than blocking

The agent now behaves more like a senior engineer: plan the work, delegate the slow parts, keep moving.

Next: Stage 4 — multi-agent teams.
