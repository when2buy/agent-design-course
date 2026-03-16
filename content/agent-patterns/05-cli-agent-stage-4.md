---
title: "Stage 4: Multi-Agent Teams (s09–s12)"
excerpt: "From solo operator to self-organizing team: persistent teammates, JSONL mailbox communication, request-response protocols, autonomous task claiming, and git worktree physical isolation. The final chapter of all 12 mechanisms."
isPremium: true
order: 5
readingTime: 22
tags: ["claude-code", "agent", "stage4", "multi-agent", "teams", "worktree"]
series: "CLI Agent Pattern"
---

# Stage 4: From Solo to Team

The first three stages built a powerful single agent: tool use, clean context management, complex task scheduling, and concurrent execution.

But a single agent still has a ceiling. Large projects need collaboration; independent modules can be developed in parallel. Stage 4 introduces **true multi-agent architecture**, culminating in a self-organizing, physically isolated team of agents.

Four progressive steps:
1. **s09**: Persistent teammates with communication channels
2. **s10**: Structured protocols (handshakes, approvals)
3. **s11**: Teammates autonomously scan the task board and self-assign
4. **s12**: Each task is bound to its own git worktree for physical isolation

---

## s09: Agent Teams — When a Task Is Too Big for One Agent

> **Mantra:** *"When a task is too big for one person, delegate to teammates."*

### The Problem

Subagents from s04 are ephemeral: spawn, work, return summary, die. No identity, no cross-call memory. Background tasks from s08 can run shell commands but can't make LLM-guided decisions.

Real team collaboration needs three things:
1. **Persistent agents** that survive multiple rounds
2. **Identity and lifecycle management**
3. **Communication channels** between agents

### Solution: Persistent Teammates + JSONL Mailboxes

```
Teammate lifecycle:
  spawn -> WORKING -> IDLE -> WORKING -> ... -> SHUTDOWN

Communication structure:
  .team/
    config.json           ← team roster and statuses
    inbox/
      alice.jsonl         ← append-only writes, drain on read
      bob.jsonl
      lead.jsonl

          +--------+    send("bob", "Handle the auth module")    +--------+
          | alice  | -----------------------------------------> |  bob   |
          | loop   |    bob.jsonl << {json_line}                 |  loop  |
          +--------+                                             +--------+
               ^                                                      |
               |             BUS.read_inbox("alice")                  |
               +------ alice.jsonl -> read + drain -------------------+
```

### Implementation

```python
import json, threading, time
from pathlib import Path

class MessageBus:
    """JSONL mailbox: append-only writes, atomic drain on read."""
    def __init__(self, team_dir: Path):
        self.inbox_dir = team_dir / "inbox"
        self.inbox_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def send(self, sender: str, recipient: str, message: str,
             msg_type: str = "text", extra: dict = None) -> str:
        inbox_path = self.inbox_dir / f"{recipient}.jsonl"
        entry = {
            "from": sender, "type": msg_type,
            "content": message, "ts": time.time(),
            **(extra or {}),
        }
        with self._lock:
            with open(inbox_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        return f"Message sent to {recipient}"

    def broadcast(self, sender: str, message: str, config: dict) -> str:
        for member in config.get("members", []):
            if member["name"] != sender:
                self.send(sender, member["name"], message, "broadcast")
        return "Broadcast sent."

    def read_inbox(self, name: str) -> str:
        """Return inbox contents and clear the mailbox (drain)."""
        inbox_path = self.inbox_dir / f"{name}.jsonl"
        with self._lock:
            if not inbox_path.exists():
                return "[]"
            messages = inbox_path.read_text().strip()
            inbox_path.write_text("")  # drain
        if not messages:
            return "[]"
        return "[" + ",".join(messages.splitlines()) + "]"

class TeammateManager:
    def __init__(self, team_dir: Path):
        self.dir = team_dir
        self.dir.mkdir(exist_ok=True)
        self.config_path = self.dir / "config.json"
        self.config = self._load_config()
        self.threads = {}

    def _load_config(self) -> dict:
        if self.config_path.exists():
            return json.loads(self.config_path.read_text())
        return {"team_name": "default", "members": []}

    def _save_config(self):
        self.config_path.write_text(json.dumps(self.config, indent=2))

    def spawn(self, name: str, role: str, prompt: str) -> str:
        """Create a teammate and launch their agent loop in a background thread."""
        if any(m["name"] == name for m in self.config["members"]):
            return f"Error: Teammate '{name}' already exists"

        member = {"name": name, "role": role, "status": "working"}
        self.config["members"].append(member)
        self._save_config()

        thread = threading.Thread(
            target=self._teammate_loop,
            args=(name, role, prompt),
            daemon=True
        )
        thread.start()
        self.threads[name] = thread
        return f"Spawned teammate '{name}' (role: {role})"

    def _find_member(self, name: str) -> dict:
        for m in self.config["members"]:
            if m["name"] == name:
                return m
        return None

    def _set_status(self, name: str, status: str):
        member = self._find_member(name)
        if member:
            member["status"] = status
            self._save_config()

    def _teammate_loop(self, name: str, role: str, initial_prompt: str):
        """Each teammate runs a full agent loop in their own thread."""
        messages = [{"role": "user", "content": initial_prompt}]

        for _ in range(50):  # safety cap
            # Check inbox before each LLM call
            inbox = BUS.read_inbox(name)
            if inbox != "[]":
                messages.append({
                    "role": "user",
                    "content": f"<inbox>\n{inbox}\n</inbox>",
                })
                messages.append({
                    "role": "assistant",
                    "content": "Noted inbox messages. Continuing work.",
                })

            response = client.messages.create(
                model=MODEL,
                system=f"You are {name}, a {role}. Work autonomously.",
                messages=messages,
                tools=TEAMMATE_TOOLS,
                max_tokens=8000,
            )
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason != "tool_use":
                break

            results = []
            for block in response.content:
                if block.type == "tool_use":
                    handler = TOOL_HANDLERS.get(block.name)
                    output = handler(**block.input) if handler else "Unknown tool"
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(output)[:50000],
                    })
            messages.append({"role": "user", "content": results})

        self._set_status(name, "idle")
        BUS.send(name, "lead", f"{name} has finished and is now idle.")

    def list_team(self) -> str:
        members = self.config.get("members", [])
        if not members:
            return "No team members."
        lines = [f"  [{m['status']}] {m['name']} ({m['role']})"
                 for m in members]
        return "Team:\n" + "\n".join(lines)

TEAM = TeammateManager(Path(".team"))
BUS = MessageBus(Path(".team"))

TOOL_HANDLERS.update({
    "spawn_teammate": lambda **kw: TEAM.spawn(kw["name"], kw["role"], kw["prompt"]),
    "send_message":   lambda **kw: BUS.send("lead", kw["to"], kw["message"]),
    "broadcast":      lambda **kw: BUS.broadcast("lead", kw["message"], TEAM.config),
    "read_inbox":     lambda **kw: BUS.read_inbox("lead"),
    "list_team":      lambda **kw: TEAM.list_team(),
})
```

---

## s10: Team Protocols — Shared Communication Rules

> **Mantra:** *"Teammates need agreed communication rules."*

### The Problem

s09 teammates can work and communicate — but lack structured coordination:

- **Shutdown**: killing a thread leaves half-written files. Needs a handshake: leader requests, teammate approves or declines.
- **Plan approval**: high-risk changes (deleting files, refactoring core modules) should be reviewed by the lead before execution.

Both cases share the same structure: one party sends a request with a unique ID; the other responds referencing that same ID.

### Solution: Unified FSM Protocol

```
Shutdown Protocol              Plan Approval Protocol
==================             ======================

Leader          Teammate       Teammate              Leader
  |               |              |                     |
  |--shutdown_req->|              |--plan_req---------->|
  | {req_id:"abc"} |              | {req_id:"xyz"}      |
  |               |              |                     |
  |<-shutdown_resp-|              |<--plan_resp---------|
  | {req_id:"abc", |              | {req_id:"xyz",      |
  |  approve:true} |              |  approve:true}      |

Shared FSM:
  [pending] --approve--> [approved]
  [pending] --reject---> [rejected]
```

### Implementation

```python
import uuid

shutdown_requests = {}   # req_id -> {target, status}
plan_requests = {}       # req_id -> {from, plan, status}

def request_shutdown(teammate: str) -> str:
    req_id = str(uuid.uuid4())[:8]
    shutdown_requests[req_id] = {
        "target": teammate, "status": "pending", "created_at": time.time(),
    }
    BUS.send("lead", teammate, "Please shut down gracefully when ready.",
             msg_type="shutdown_request", extra={"request_id": req_id})
    return f"Shutdown request {req_id} sent to {teammate} (status: pending)"

def handle_shutdown_response(request_id: str, approve: bool, reason: str = "") -> str:
    if request_id not in shutdown_requests:
        return f"Unknown request_id: {request_id}"
    req = shutdown_requests[request_id]
    req["status"] = "approved" if approve else "rejected"
    return f"Shutdown request {request_id} {'approved' if approve else f'rejected: {reason}'}"

def submit_plan(sender: str, plan: str) -> str:
    req_id = str(uuid.uuid4())[:8]
    plan_requests[req_id] = {"from": sender, "plan": plan, "status": "pending"}
    BUS.send(sender, "lead", f"Plan for approval:\n{plan}",
             msg_type="plan_request", extra={"request_id": req_id})
    return f"Plan {req_id} submitted. Waiting for approval..."

def review_plan(request_id: str, approve: bool, feedback: str = "") -> str:
    if request_id not in plan_requests:
        return f"Unknown plan request: {request_id}"
    req = plan_requests[request_id]
    req["status"] = "approved" if approve else "rejected"
    BUS.send("lead", req["from"],
             feedback or ("Plan approved. Proceed." if approve else "Plan rejected."),
             msg_type="plan_approval_response",
             extra={"request_id": request_id, "approve": approve})
    return f"Plan {request_id} {'approved' if approve else 'rejected'}"
```

One FSM, two use cases. The same `pending → approved | rejected` state machine applies to any request-response protocol.

---

## s11: Autonomous Agents — Teammates Self-Assign from the Task Board

> **Mantra:** *"No manager needed for every assignment. Self-organize."*

### The Problem

In s09–s10, teammates only work when explicitly assigned. The lead has to write a prompt for each teammate, and 10 unclaimed tasks on the board require 10 manual delegations. This doesn't scale.

True autonomy: teammates scan the task board themselves, claim unclaimed work, and look for the next task when finished.

### Solution: Idle Polling + Automatic Claiming

```
Teammate lifecycle (with idle polling):

+-------+
| spawn |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| WORK  | <------------- |  LLM  |
+---+---+                +-------+
    |
    | stop_reason != tool_use (or idle tool called)
    v
+--------+
|  IDLE  |  poll every 5s, timeout after 60s
+---+----+
    |
    +---> check inbox --> message? ------> WORK
    |
    +---> scan .tasks/ --> unclaimed? --> claim -> WORK
    |
    +---> 60s timeout -----------------> SHUTDOWN

Identity re-injection after context compaction:
  if len(messages) <= 3:
    messages.insert(0, identity_block)
```

### Implementation

```python
IDLE_TIMEOUT = 60     # max wait time
POLL_INTERVAL = 5     # check every 5 seconds

def scan_unclaimed_tasks() -> list:
    """Find pending, unowned, unblocked tasks."""
    unclaimed = []
    for f in sorted(Path(".tasks").glob("task_*.json")):
        task = json.loads(f.read_text())
        if (task.get("status") == "pending"
                and not task.get("owner")
                and not task.get("blockedBy")):
            unclaimed.append(task)
    return unclaimed

def claim_task(task_id: int, owner: str) -> str:
    """Claim a task atomically."""
    task = TASKS._load(task_id)
    if task.get("owner"):
        return f"Task {task_id} already claimed by {task['owner']}"
    task["owner"] = owner
    task["status"] = "in_progress"
    TASKS._save(task)
    return f"{owner} claimed task {task_id}: {task['subject']}"

def idle_poll(name: str, messages: list) -> bool:
    """
    Idle phase: poll inbox and task board.
    Returns True if work was found; False if timed out (should shut down).
    """
    for _ in range(IDLE_TIMEOUT // POLL_INTERVAL):
        time.sleep(POLL_INTERVAL)

        # Messages take priority
        inbox = BUS.read_inbox(name)
        if inbox != "[]":
            messages.append({
                "role": "user",
                "content": f"<inbox>\n{inbox}\n</inbox>",
            })
            return True

        # Scan task board
        unclaimed = scan_unclaimed_tasks()
        if unclaimed:
            task = unclaimed[0]
            claim_result = claim_task(task["id"], name)
            messages.append({
                "role": "user",
                "content": (
                    f"<auto-claimed>\n"
                    f"Task #{task['id']}: {task['subject']}\n"
                    f"{task.get('description', '')}\n"
                    f"{claim_result}\n"
                    f"</auto-claimed>"
                ),
            })
            return True

    return False  # timed out → shut down

def teammate_loop_with_idle(name: str, role: str, initial_prompt: str):
    messages = [{"role": "user", "content": initial_prompt}]

    while True:
        # ── Work phase ──
        TEAM._set_status(name, "working")
        idle_requested = False

        for _ in range(50):
            # Re-inject identity after context compaction
            if len(messages) <= 3:
                messages.insert(0, {
                    "role": "user",
                    "content": (f"<identity>You are '{name}', role: {role}. "
                                f"Continue your work.</identity>"),
                })
                messages.insert(1, {
                    "role": "assistant",
                    "content": f"I am {name}, a {role}. Continuing.",
                })

            inbox = BUS.read_inbox(name)
            if inbox != "[]":
                messages.append({"role": "user",
                                  "content": f"<inbox>\n{inbox}\n</inbox>"})

            response = client.messages.create(
                model=MODEL,
                system=f"You are {name}, a {role}.",
                messages=messages, tools=TEAMMATE_TOOLS, max_tokens=8000,
            )
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason != "tool_use":
                break

            results = []
            for block in response.content:
                if block.type == "tool_use":
                    if block.name == "idle":
                        idle_requested = True
                        results.append({"type": "tool_result",
                                         "tool_use_id": block.id,
                                         "content": "Going idle."})
                    else:
                        output = TOOL_HANDLERS[block.name](**block.input)
                        results.append({"type": "tool_result",
                                         "tool_use_id": block.id,
                                         "content": str(output)})
            messages.append({"role": "user", "content": results})
            if idle_requested:
                break

        # ── Idle phase ──
        TEAM._set_status(name, "idle")
        should_continue = idle_poll(name, messages)
        if not should_continue:
            TEAM._set_status(name, "shutdown")
            BUS.send(name, "lead", f"{name} is shutting down (idle timeout).")
            return
```

---

## s12: Worktree Isolation — Each Agent Gets Its Own Directory

> **Mantra:** *"Tasks own goals. Worktrees own directories. Bound by task ID."*

### The Problem

By s11, agents can autonomously claim and complete tasks — but all tasks share one directory. Two agents simultaneously refactoring different modules will collide on shared files, corrupting each other's uncommitted work.

### Solution: git worktree Physical Isolation

```
Control plane (.tasks/)           Execution plane (.worktrees/)
+------------------+              +------------------------+
| task_1.json      |              | auth-refactor/         |
|   status: in_progress <------>  |   branch: wt/auth-refactor
|   worktree: "auth-refactor"     |   task_id: 1           |
+------------------+              +------------------------+
| task_2.json      |              | ui-login/              |
|   status: pending   <------>    |   branch: wt/ui-login  |
|   worktree: "ui-login"          |   task_id: 2           |
+------------------+              +------------------------+

State machine:
  Task:     pending -> in_progress -> completed
  Worktree: absent  -> active      -> removed | kept
```

### Implementation

```python
import subprocess
from pathlib import Path

class WorktreeManager:
    def __init__(self, repo_dir: Path, tasks):
        self.repo_dir = repo_dir
        self.wt_dir = repo_dir / ".worktrees"
        self.wt_dir.mkdir(exist_ok=True)
        self.index_path = self.wt_dir / "index.json"
        self.events_path = self.wt_dir / "events.jsonl"
        self.tasks = tasks
        self.index = self._load_index()

    def _load_index(self) -> dict:
        if self.index_path.exists():
            return json.loads(self.index_path.read_text())
        return {"worktrees": {}}

    def _save_index(self):
        self.index_path.write_text(json.dumps(self.index, indent=2))

    def _emit_event(self, event: str, task=None, wt=None):
        entry = {"event": event, "ts": time.time()}
        if task:
            entry["task"] = {"id": task["id"], "status": task["status"]}
        if wt:
            entry["worktree"] = {"name": wt["name"], "status": wt.get("status")}
        with open(self.events_path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _run_git(self, args: list) -> str:
        r = subprocess.run(["git"] + args, cwd=self.repo_dir,
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)} failed: {r.stderr}")
        return r.stdout.strip()

    def create(self, name: str, task_id: int = None) -> str:
        wt_path = self.wt_dir / name
        branch = f"wt/{name}"
        self._emit_event("worktree.create.before", wt={"name": name, "status": "creating"})
        try:
            self._run_git(["worktree", "add", "-b", branch, str(wt_path), "HEAD"])
        except RuntimeError as e:
            return f"Error: {e}"

        wt_entry = {"name": name, "path": str(wt_path),
                    "branch": branch, "task_id": task_id, "status": "active"}
        self.index["worktrees"][name] = wt_entry
        self._save_index()

        if task_id is not None:
            self.tasks.update(task_id, status="in_progress")
            task = self.tasks._load(task_id)
            task["worktree"] = name
            self.tasks._save(task)

        self._emit_event("worktree.create.after",
                         task=self.tasks._load(task_id) if task_id else None,
                         wt=wt_entry)
        return f"Worktree '{name}' created at {wt_path} (branch: {branch})"

    def run_in(self, name: str, command: str) -> str:
        wt = self.index["worktrees"].get(name)
        if not wt:
            return f"Worktree '{name}' not found"
        r = subprocess.run(command, shell=True, cwd=wt["path"],
                           capture_output=True, text=True, timeout=300)
        return (r.stdout + r.stderr).strip()[:50000]

    def remove(self, name: str, complete_task: bool = False) -> str:
        wt = self.index["worktrees"].get(name)
        if not wt:
            return f"Worktree '{name}' not found"
        self._emit_event("worktree.remove.before", wt=wt)
        self._run_git(["worktree", "remove", wt["path"], "--force"])
        if complete_task and wt.get("task_id") is not None:
            task_id = wt["task_id"]
            self.tasks.update(task_id, status="completed")
            task = self.tasks._load(task_id)
            task["worktree"] = ""
            self.tasks._save(task)
        wt["status"] = "removed"
        del self.index["worktrees"][name]
        self._save_index()
        return f"Worktree '{name}' removed"

    def list_all(self) -> str:
        wts = self.index.get("worktrees", {})
        if not wts:
            return "No active worktrees."
        lines = [f"  [{wt['status']}] {name} (task #{wt.get('task_id', 'none')}) → {wt['branch']}"
                 for name, wt in wts.items()]
        return "Worktrees:\n" + "\n".join(lines)

WORKTREES = WorktreeManager(Path.cwd(), TASKS)

TOOL_HANDLERS.update({
    "worktree_create": lambda **kw: WORKTREES.create(kw["name"], kw.get("task_id")),
    "worktree_run":    lambda **kw: WORKTREES.run_in(kw["name"], kw["command"]),
    "worktree_remove": lambda **kw: WORKTREES.remove(kw["name"], kw.get("complete_task", False)),
    "worktree_list":   lambda **kw: WORKTREES.list_all(),
})
```

---

## Full Architecture Recap

Across 12 chapters, a 30-line while loop evolved into:

```
s01–s03: The Foundation
  while True + dispatch map + TodoManager

s04–s06: Context Management
  + Subagent isolation
  + Skill lazy loading
  + Three-layer compaction

s07–s08: Engineering-Grade Execution
  + DAG task graph (disk-persisted)
  + Background daemon threads

s09–s12: Multi-Agent Teams
  + Persistent teammates (each with a full agent loop)
  + JSONL mailbox communication
  + FSM protocols (shutdown handshake + plan approval)
  + Autonomous task claiming (idle polling)
  + git worktree physical isolation
```

**The core design principle holds throughout: every new layer wraps around the outside. The inner while loop is never modified.**

---

## Where to Go Next

Having understood all 12 mechanisms, two paths turn this knowledge into a product:

### Always-On Assistant: From "Fire-and-Forget" to "Always Running"

The agents built in this series are **ephemeral**: open a terminal, assign a task, close when done. Next time you start, it's a blank slate.

Upgrading to a full-time personal AI assistant requires two additional mechanisms:

1. **Heartbeat**: automatically check for new work every 30 seconds. Sleep if idle; execute immediately if something arrives.
2. **Cron**: the agent proactively schedules future tasks that execute on a timer.

Add multi-channel routing (Telegram, Slack, etc.), persistent memory, and a persona system, and the agent evolves from a one-shot tool into a **permanently online intelligent assistant**.

This is exactly the architecture [OpenClaw](https://github.com/openclaw/openclaw) implements — and what powers the agent you're talking to right now.
