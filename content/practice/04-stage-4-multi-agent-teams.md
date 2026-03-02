---
title: "第四阶段：多智能体团队协作 (s09–s12)"
excerpt: "从单兵作战到自组织团队：持久化队友、JSONL 邮箱通信、请求-响应协议、自主任务认领，最后用 git worktree 实现物理隔离。12 个机制的终点。"
isPremium: true
order: 4
readingTime: 22
tags: ["claude-code", "agent", "stage4", "multi-agent", "teams", "worktree"]
---

# 第四阶段：从单兵到团队

前三个阶段构建了一个强大的单体 Agent：会用工具、保持上下文清醒、能管理复杂任务、会并发执行。

但单个 Agent 仍有瓶颈：大型项目需要多人协作，不同模块可以并行开发。这一阶段将引入**真正的多智能体协作架构**，最终形成自组织、物理隔离的 Agent 团队。

四个递进步骤：
1. **s09**：给 Agent 加上持久化队友和通信通道
2. **s10**：加入结构化协议（握手、审批）
3. **s11**：队友自主扫描任务看板，不需要领导逐个分配
4. **s12**：每个任务绑定独立的 git worktree，物理隔离

---

## s09：智能体团队 — 任务太大一个人干不完

> **箴言：** *"当任务大到一个人无法完成时，委派给队友"*

### 问题

子智能体（s04）是一次性的：生成、干活、返回摘要、消亡。没有身份，没有跨调用的记忆。后台任务（s08）能跑 shell 命令，但做不了 LLM 引导的决策。

真正的团队协作需要三样东西：
1. 能跨多轮对话存活的**持久 Agent**
2. **身份和生命周期管理**
3. Agent 之间的**通信通道**

### 解决方案：持久化队友 + JSONL 邮箱

```
队友生命周期：
  spawn -> WORKING -> IDLE -> WORKING -> ... -> SHUTDOWN

通信结构：
  .team/
    config.json           ← 团队名册和状态
    inbox/
      alice.jsonl         ← 追加写入，读取后清空
      bob.jsonl
      lead.jsonl

          +--------+    send("bob", "请处理登录模块")    +--------+
          | alice  | ---------------------------------> |  bob   |
          | loop   |    bob.jsonl << {json_line}        |  loop  |
          +--------+                                    +--------+
               ^                                             |
               |        BUS.read_inbox("alice")              |
               +---- alice.jsonl -> read + drain -----------+
```

### 完整实现

**MessageBus：Append-only JSONL 收件箱**

```python
import json
import time
import threading
from pathlib import Path

class MessageBus:
    def __init__(self, team_dir: Path):
        self.dir = team_dir / "inbox"
        self.dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def send(self, sender: str, to: str, content: str,
             msg_type: str = "message", extra: dict = None):
        """向收件箱追加一条消息"""
        msg = {
            "type": msg_type,
            "from": sender,
            "to": to,
            "content": content,
            "timestamp": time.time(),
        }
        if extra:
            msg.update(extra)

        with self._lock:
            inbox_path = self.dir / f"{to}.jsonl"
            with open(inbox_path, "a") as f:
                f.write(json.dumps(msg) + "\n")

    def broadcast(self, sender: str, content: str, team_config: dict):
        """广播给所有队友"""
        for member in team_config.get("members", []):
            if member["name"] != sender:
                self.send(sender, member["name"], content, "broadcast")

    def read_inbox(self, name: str) -> str:
        """读取并清空收件箱"""
        inbox_path = self.dir / f"{name}.jsonl"
        with self._lock:
            if not inbox_path.exists():
                return "[]"
            content = inbox_path.read_text().strip()
            if not content:
                return "[]"
            msgs = [json.loads(line)
                    for line in content.splitlines() if line.strip()]
            inbox_path.write_text("")  # 清空（drain）
            return json.dumps(msgs, indent=2, ensure_ascii=False)
```

**TeammateManager：生命周期管理**

```python
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
        self.config_path.write_text(
            json.dumps(self.config, indent=2, ensure_ascii=False)
        )

    def spawn(self, name: str, role: str, prompt: str) -> str:
        """创建队友并在后台线程中启动其 agent loop"""
        # 检查名字是否重复
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
        """每个队友在自己的线程中运行完整的 agent loop"""
        messages = [{"role": "user", "content": initial_prompt}]

        for _ in range(50):  # 安全上限
            # 每次 LLM 调用前检查收件箱
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
        # 通知领导任务完成
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

# 注册工具
TOOL_HANDLERS.update({
    "spawn_teammate": lambda **kw: TEAM.spawn(
        kw["name"], kw["role"], kw["prompt"]
    ),
    "send_message": lambda **kw: BUS.send(
        "lead", kw["to"], kw["message"]
    ),
    "broadcast": lambda **kw: BUS.broadcast(
        "lead", kw["message"], TEAM.config
    ),
    "read_inbox": lambda **kw: BUS.read_inbox("lead"),
    "list_team": lambda **kw: TEAM.list_team(),
})
```

---

## s10：团队协议 — 统一的请求-响应模式

> **箴言：** *"队友需要共享的沟通规则"*

### 问题

s09 的队友能干活能通信，但缺少结构化协调：

- **关机**：直接杀线程会留下写了一半的文件。需要握手——领导请求，队友批准或拒绝
- **计划审批**：高风险变更（如删除文件、重构核心模块）应该先过领导审查

两者结构完全一样：一方发带唯一 ID 的请求，另一方引用同一 ID 响应。

### 解决方案：统一的 FSM 协议

```
关机协议                    计划审批协议
==================           ======================

领导            队友         队友              领导
  |               |            |                 |
  |--shutdown_req->|            |--plan_req------>|
  | {req_id:"abc"} |            | {req_id:"xyz"}  |
  |               |            |                 |
  |<-shutdown_resp-|            |<--plan_resp-----|
  | {req_id:"abc", |            | {req_id:"xyz",  |
  |  approve:true} |            |  approve:true}  |

共享 FSM：
  [pending] --approve--> [approved]
  [pending] --reject---> [rejected]
```

### 完整实现

```python
import uuid

shutdown_requests = {}  # req_id -> {target, status}
plan_requests = {}      # req_id -> {from, plan, status}

def request_shutdown(teammate: str) -> str:
    """领导向队友发送关机请求"""
    req_id = str(uuid.uuid4())[:8]
    shutdown_requests[req_id] = {
        "target": teammate,
        "status": "pending",
        "created_at": time.time(),
    }
    BUS.send(
        "lead", teammate,
        "Please shut down gracefully when ready.",
        msg_type="shutdown_request",
        extra={"request_id": req_id}
    )
    return f"Shutdown request {req_id} sent to {teammate} (status: pending)"

def handle_shutdown_response(request_id: str, approve: bool,
                              reason: str = "") -> str:
    """处理队友的关机响应"""
    if request_id not in shutdown_requests:
        return f"Unknown request_id: {request_id}"

    req = shutdown_requests[request_id]
    req["status"] = "approved" if approve else "rejected"

    status_text = "approved" if approve else f"rejected: {reason}"
    return f"Shutdown request {request_id} {status_text}"

def submit_plan(sender: str, plan: str) -> str:
    """队友向领导提交计划审批"""
    req_id = str(uuid.uuid4())[:8]
    plan_requests[req_id] = {
        "from": sender,
        "plan": plan,
        "status": "pending",
    }
    BUS.send(
        sender, "lead",
        f"Plan for approval:\n{plan}",
        msg_type="plan_request",
        extra={"request_id": req_id}
    )
    return f"Plan {req_id} submitted for approval. Waiting..."

def review_plan(request_id: str, approve: bool,
                feedback: str = "") -> str:
    """领导审批队友的计划"""
    if request_id not in plan_requests:
        return f"Unknown plan request: {request_id}"

    req = plan_requests[request_id]
    req["status"] = "approved" if approve else "rejected"

    BUS.send(
        "lead", req["from"],
        feedback or ("Plan approved. Proceed." if approve else "Plan rejected."),
        msg_type="plan_approval_response",
        extra={"request_id": request_id, "approve": approve}
    )
    return f"Plan {request_id} {'approved' if approve else 'rejected'}"

# 一个 FSM，两种用途。同样的 pending -> approved | rejected
# 状态机可以套用到任何请求-响应协议上
```

---

## s11：自治智能体 — 队友自己看看板，有活就认领

> **箴言：** *"不需要领导逐个分配；自组织"*

### 问题

s09-s10 中，队友只在被明确指派时才动。领导得给每个队友写 prompt，任务看板上 10 个未认领的任务得手动分配。这扩展不了。

真正的自治：队友自己扫描任务看板，认领没人做的任务，做完再找下一个。

### 解决方案：空闲轮询 + 自动认领

```
队友生命周期（含空闲轮询）：

+-------+
| spawn |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| WORK  | <------------- |  LLM  |
+---+---+                +-------+
    |
    | stop_reason != tool_use（或调用了 idle 工具）
    v
+--------+
|  IDLE  |  每 5 秒轮询，最多 60 秒
+---+----+
    |
    +---> 检查收件箱 --> 有消息? ------> WORK
    |
    +---> 扫描 .tasks/ --> 有未认领任务? --> 认领 -> WORK
    |
    +---> 60 秒超时 -----------------> SHUTDOWN

上下文压缩后身份重注入：
  if len(messages) <= 3:
    messages.insert(0, identity_block)
```

### 完整实现

**空闲轮询函数**

```python
IDLE_TIMEOUT = 60     # 最多等 60 秒
POLL_INTERVAL = 5     # 每 5 秒检查一次

def scan_unclaimed_tasks() -> list:
    """找出 pending 状态、无 owner、无依赖的任务"""
    unclaimed = []
    for f in sorted(Path(".tasks").glob("task_*.json")):
        task = json.loads(f.read_text())
        if (task.get("status") == "pending"
                and not task.get("owner")
                and not task.get("blockedBy")):
            unclaimed.append(task)
    return unclaimed

def claim_task(task_id: int, owner: str) -> str:
    """认领任务（原子操作）"""
    task = TASKS._load(task_id)
    if task.get("owner"):
        return f"Task {task_id} already claimed by {task['owner']}"
    task["owner"] = owner
    task["status"] = "in_progress"
    TASKS._save(task)
    return f"{owner} claimed task {task_id}: {task['subject']}"

def idle_poll(name: str, messages: list) -> bool:
    """
    空闲阶段：轮询收件箱和任务看板。
    返回 True 表示找到工作；False 表示超时，应关机。
    """
    for _ in range(IDLE_TIMEOUT // POLL_INTERVAL):
        time.sleep(POLL_INTERVAL)

        # 优先处理消息
        inbox = BUS.read_inbox(name)
        if inbox != "[]":
            messages.append({
                "role": "user",
                "content": f"<inbox>\n{inbox}\n</inbox>",
            })
            return True

        # 扫描任务看板
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

    return False  # 超时 → 关机
```

**带空闲阶段的完整队友循环**

```python
def teammate_loop_with_idle(name: str, role: str, initial_prompt: str):
    messages = [{"role": "user", "content": initial_prompt}]

    while True:
        # ── 工作阶段 ──
        TEAM._set_status(name, "working")
        idle_requested = False

        for _ in range(50):
            # 上下文压缩后的身份重注入
            # （压缩后 messages 只剩 2-3 条，需要重新告诉模型它是谁）
            if len(messages) <= 3:
                messages.insert(0, {
                    "role": "user",
                    "content": (
                        f"<identity>You are '{name}', role: {role}. "
                        f"Continue your work.</identity>"
                    ),
                })
                messages.insert(1, {
                    "role": "assistant",
                    "content": f"I am {name}, a {role}. Continuing.",
                })

            # 检查收件箱
            inbox = BUS.read_inbox(name)
            if inbox != "[]":
                messages.append({
                    "role": "user",
                    "content": f"<inbox>\n{inbox}\n</inbox>",
                })

            response = client.messages.create(
                model=MODEL,
                system=f"You are {name}, a {role}.",
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
                    if block.name == "idle":
                        idle_requested = True
                        results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": "Going idle.",
                        })
                    else:
                        output = TOOL_HANDLERS[block.name](**block.input)
                        results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(output),
                        })
            messages.append({"role": "user", "content": results})

            if idle_requested:
                break

        # ── 空闲阶段 ──
        TEAM._set_status(name, "idle")
        should_continue = idle_poll(name, messages)
        if not should_continue:
            TEAM._set_status(name, "shutdown")
            BUS.send(name, "lead", f"{name} is shutting down (idle timeout).")
            return
```

---

## s12：Worktree 任务隔离 — 各干各的目录，互不干扰

> **箴言：** *"任务管目标，worktree 管目录，按 ID 绑定"*

### 问题

到 s11，Agent 已经能自主认领和完成任务。但所有任务共享一个目录。

两个 Agent 同时重构不同模块——A 改 `config.py`，B 也改 `config.py`，未提交的改动互相污染，谁也没法干净回滚。

### 解决方案：git worktree 物理隔离

```
控制面 (.tasks/)                    执行面 (.worktrees/)
+------------------+                +------------------------+
| task_1.json      |                | auth-refactor/         |
|   status: in_progress  <------>   |   branch: wt/auth-refactor
|   worktree: "auth-refactor"   |   |   task_id: 1           |
+------------------+                +------------------------+
| task_2.json      |                | ui-login/              |
|   status: pending    <------>     |   branch: wt/ui-login  |
|   worktree: "ui-login"       |   |   task_id: 2           |
+------------------+                +------------------------+
                                    |
                          index.json（worktree 注册表）
                          events.jsonl（生命周期日志）

状态机：
  Task:     pending -> in_progress -> completed
  Worktree: absent  -> active      -> removed | kept
```

### 完整实现

**WorktreeManager：管理 git worktree 生命周期**

```python
import subprocess
from pathlib import Path

class WorktreeManager:
    def __init__(self, repo_dir: Path, tasks: TaskManager):
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
        self.index_path.write_text(
            json.dumps(self.index, indent=2)
        )

    def _emit_event(self, event: str, task: dict = None, wt: dict = None):
        """写入生命周期事件"""
        entry = {"event": event, "ts": time.time()}
        if task:
            entry["task"] = {"id": task["id"], "status": task["status"]}
        if wt:
            entry["worktree"] = {"name": wt["name"], "status": wt.get("status")}
        with open(self.events_path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _run_git(self, args: list) -> str:
        r = subprocess.run(
            ["git"] + args,
            cwd=self.repo_dir,
            capture_output=True, text=True
        )
        if r.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)} failed: {r.stderr}")
        return r.stdout.strip()

    def create(self, name: str, task_id: int = None) -> str:
        """
        创建 git worktree 并（可选地）绑定任务。
        
        1. 创建独立分支
        2. 在隔离目录中 checkout
        3. 绑定任务 ID（任务推进到 in_progress）
        """
        wt_path = self.wt_dir / name
        branch = f"wt/{name}"
        self._emit_event("worktree.create.before",
                         wt={"name": name, "status": "creating"})
        try:
            self._run_git(["worktree", "add", "-b", branch, str(wt_path), "HEAD"])
        except RuntimeError as e:
            self._emit_event("worktree.create.failed",
                             wt={"name": name, "status": "failed"})
            return f"Error: {e}"

        wt_entry = {
            "name": name,
            "path": str(wt_path),
            "branch": branch,
            "task_id": task_id,
            "status": "active",
        }
        self.index["worktrees"][name] = wt_entry
        self._save_index()

        # 绑定任务
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
        """在指定 worktree 的目录中执行命令"""
        wt = self.index["worktrees"].get(name)
        if not wt:
            return f"Worktree '{name}' not found"
        r = subprocess.run(
            command, shell=True, cwd=wt["path"],
            capture_output=True, text=True, timeout=300
        )
        return (r.stdout + r.stderr).strip()[:50000]

    def remove(self, name: str, complete_task: bool = False) -> str:
        """
        删除 worktree，可选同时完成绑定的任务。
        一个调用搞定拆除 + 完成。
        """
        wt = self.index["worktrees"].get(name)
        if not wt:
            return f"Worktree '{name}' not found"

        self._emit_event("worktree.remove.before", wt=wt)
        self._run_git(["worktree", "remove", wt["path"], "--force"])

        # 完成绑定的任务
        if complete_task and wt.get("task_id") is not None:
            task_id = wt["task_id"]
            self.tasks.update(task_id, status="completed")
            task = self.tasks._load(task_id)
            task["worktree"] = ""
            self.tasks._save(task)
            self._emit_event("task.completed", task=task, wt=wt)

        wt["status"] = "removed"
        del self.index["worktrees"][name]
        self._save_index()
        self._emit_event("worktree.remove.after", wt=wt)
        return f"Worktree '{name}' removed"

    def keep(self, name: str) -> str:
        """保留 worktree 供后续使用"""
        wt = self.index["worktrees"].get(name)
        if not wt:
            return f"Worktree '{name}' not found"
        wt["status"] = "kept"
        self._save_index()
        self._emit_event("worktree.keep", wt=wt)
        return f"Worktree '{name}' marked as kept"

    def list_all(self) -> str:
        wts = self.index.get("worktrees", {})
        if not wts:
            return "No worktrees."
        lines = [
            f"  [{wt['status']}] {name}"
            f" (task #{wt.get('task_id', 'none')}) → {wt['branch']}"
            for name, wt in wts.items()
        ]
        return "Worktrees:\n" + "\n".join(lines)

WORKTREES = WorktreeManager(Path.cwd(), TASKS)

# 注册工具
TOOL_HANDLERS.update({
    "worktree_create": lambda **kw: WORKTREES.create(
        kw["name"], kw.get("task_id")
    ),
    "worktree_run":    lambda **kw: WORKTREES.run_in(
        kw["name"], kw["command"]
    ),
    "worktree_remove": lambda **kw: WORKTREES.remove(
        kw["name"], kw.get("complete_task", False)
    ),
    "worktree_keep":   lambda **kw: WORKTREES.keep(kw["name"]),
    "worktree_list":   lambda **kw: WORKTREES.list_all(),
})
```

### 实际使用场景

```
> 创建 auth 重构和 UI 登录页两个并行任务，分别在独立目录工作

1. task_create("Implement auth refactor")    → task_1
2. task_create("Redesign login page")        → task_2

3. worktree_create("auth-refactor", task_id=1)
   → git worktree add -b wt/auth-refactor .worktrees/auth-refactor HEAD
   → task_1.status = "in_progress"

4. worktree_create("ui-login", task_id=2)
   → git worktree add -b wt/ui-login .worktrees/ui-login HEAD
   → task_2.status = "in_progress"

5. Agent A 在 .worktrees/auth-refactor/ 工作
   Agent B 在 .worktrees/ui-login/ 工作
   → 两者完全物理隔离，互不干扰

6. worktree_remove("auth-refactor", complete_task=True)
   → 删除目录 + task_1.status = "completed"
   → 写入事件日志
```

**崩溃后从 `.tasks/` + `.worktrees/index.json` 重建现场。会话记忆是易失的；磁盘状态是持久的。**

---

## 完整架构回顾

走完 12 个章节，我们从一个 30 行的 while 循环演进到了：

```
s01-s03: 基础循环
  while True + dispatch map + TodoManager

s04-s06: 上下文管理
  + Subagent isolation
  + Skill lazy loading
  + 三层压缩

s07-s08: 工程化执行
  + DAG 任务图（磁盘持久化）
  + 后台守护线程

s09-s12: 多智能体团队
  + 持久化队友（每人一个完整 agent loop）
  + JSONL 邮箱通信
  + FSM 协议（关机握手 + 计划审批）
  + 自主任务认领（空闲轮询）
  + git worktree 物理隔离
```

**核心设计不变：每一层都包裹在外面，从不修改内层的 while 循环。**

---

## 下一步：从理解到落地

理解了这 12 个机制，有两条路可以把知识变成产品：

### Kode Agent CLI — 开箱即用的编码 Agent

```bash
npm i -g @shareai-lab/kode
```

支持技能与 LSP、Windows 兼容、可接入 GLM / MiniMax / DeepSeek 等开源模型。

### Kode Agent SDK — 嵌入到你的应用

官方 Claude Code SDK 每个并发用户都需要一个独立的终端进程开销极大。Kode SDK 是独立库，零进程开销，适合嵌入后端、浏览器扩展、嵌入式设备。

### Always-On 助手：从"用完即弃"到"全天候待命"

本系列构建的 Agent 是**即用即抛**模型：打开终端，分配任务，完成后关闭，下次启动又是空白。

如果要升维成全天候个人 AI 助手，还需要两个额外机制：

1. **心跳（Heartbeat）**：每 30 秒自动检查是否有新工作。没有则休眠，有则立刻执行。
2. **定时任务（Cron）**：Agent 主动安排未来任务，到时间自动执行。

再加上多渠道 IM 路由（Telegram、Slack 等）、持久化记忆、人格系统，Agent 就从一次性工具进化为**永远在线的智能助理**。

这正是 [OpenClaw](https://github.com/openclaw/openclaw) 所实现的架构——也是你现在正在对话的这个 Agent 背后的工作原理。
