---
title: "第三阶段：任务图与后台并发 (s07–s08)"
excerpt: "把扁平待办升级为带依赖关系的持久化任务图，并引入守护线程让 Agent 在等待慢操作时继续思考。真正的工程级任务调度。"
isPremium: false
order: 3
readingTime: 16
tags: ["claude-code", "agent", "stage3", "tasks", "background", "dag"]
---

# 第三阶段：走向工程化执行

前两个阶段让 Agent 能够"行动"和"保持清醒"。这一阶段让 Agent 能够**处理真正的工程任务**——有依赖关系的复杂流程，以及需要几分钟才能完成的耗时操作。

两个问题：
1. `npm install`、`pytest`、`docker build` 都要等好几分钟，难道只能傻等？
2. "重构认证模块"这类任务有天然的执行顺序（先写代码，再跑测试），怎么表达和管理这种依赖？

---

## s07：任务系统 — 大目标拆成任务图，记在磁盘上

> **箴言：** *"大目标要拆成小任务，排好序，记在磁盘上"*

### 问题

s03 的 TodoManager 是内存中的扁平清单：没有顺序，没有依赖，状态只有做完没做完。

真实目标是有结构的：
- 任务 B 依赖任务 A（必须先做 A）
- 任务 C 和 D 可以并行（互不依赖）
- 任务 E 要等 C 和 D 都完成

没有显式的关系，Agent 分不清什么能做、什么被卡住、什么能同时跑。而且清单只活在内存里，上下文压缩（s06）一跑就没了。

### 解决方案：持久化 DAG 任务图

把扁平清单升级为持久化到磁盘的**有向无环图（DAG）**。每个任务是一个 JSON 文件，有状态、前置依赖（`blockedBy`）和后置依赖（`blocks`）。

```
.tasks/
  task_1.json  {"id":1, "status":"completed"}
  task_2.json  {"id":2, "blockedBy":[1], "status":"pending"}
  task_3.json  {"id":3, "blockedBy":[1], "status":"pending"}
  task_4.json  {"id":4, "blockedBy":[2,3], "status":"pending"}

任务图 (DAG):
                 +----------+
            +--> | task 2   | --+
            |    | pending  |   |
+----------+     +----------+    +--> +----------+
| task 1   |                          | task 4   |
| completed| --> +----------+    +--> | blocked  |
+----------+     | task 3   | --+     +----------+
                 | pending  |
                 +----------+

顺序：task 1 必须先完成，才能开始 2 和 3
并行：task 2 和 3 可以同时执行
依赖：task 4 要等 2 和 3 都完成
状态：pending -> in_progress -> completed
```

### 完整实现

**TaskManager：每个任务一个 JSON 文件**

```python
import json
from pathlib import Path
from datetime import datetime

class TaskManager:
    def __init__(self, tasks_dir: Path = Path(".tasks")):
        self.dir = tasks_dir
        self.dir.mkdir(exist_ok=True)
        self._next_id = self._max_id() + 1

    def _max_id(self) -> int:
        ids = [int(f.stem.split("_")[1])
               for f in self.dir.glob("task_*.json")]
        return max(ids, default=0)

    def _save(self, task: dict):
        path = self.dir / f"task_{task['id']}.json"
        path.write_text(json.dumps(task, indent=2))

    def _load(self, task_id: int) -> dict:
        path = self.dir / f"task_{task_id}.json"
        if not path.exists():
            raise ValueError(f"Task {task_id} not found")
        return json.loads(path.read_text())

    def create(self, subject: str, description: str = "") -> str:
        """创建新任务，默认 pending 状态，无依赖"""
        task = {
            "id": self._next_id,
            "subject": subject,
            "description": description,
            "status": "pending",    # pending | in_progress | completed
            "blockedBy": [],         # 前置依赖：这些任务完成前，本任务无法开始
            "blocks": [],            # 后置依赖：本任务完成后，解锁这些任务
            "owner": "",             # 认领此任务的 Agent
            "worktree": "",          # 绑定的 worktree（s12 使用）
            "created_at": datetime.now().isoformat(),
        }
        self._save(task)
        self._next_id += 1
        return json.dumps(task, indent=2)

    def update(self, task_id: int, status: str = None,
               add_blocked_by: list = None, add_blocks: list = None,
               owner: str = None) -> str:
        """更新任务状态和依赖关系"""
        task = self._load(task_id)

        if status:
            task["status"] = status
            if status == "completed":
                # 自动解锁所有依赖本任务的后续任务
                self._clear_dependency(task_id)

        if add_blocked_by:
            for dep_id in add_blocked_by:
                if dep_id not in task["blockedBy"]:
                    task["blockedBy"].append(dep_id)
                # 在依赖任务上记录 blocks
                dep = self._load(dep_id)
                if task_id not in dep["blocks"]:
                    dep["blocks"].append(task_id)
                    self._save(dep)

        if owner is not None:
            task["owner"] = owner

        self._save(task)
        return json.dumps(task, indent=2)

    def _clear_dependency(self, completed_id: int):
        """任务完成时，从所有依赖它的任务的 blockedBy 中移除"""
        for f in self.dir.glob("task_*.json"):
            task = json.loads(f.read_text())
            if completed_id in task.get("blockedBy", []):
                task["blockedBy"].remove(completed_id)
                self._save(task)
                print(f"[Tasks] Task {task['id']} unblocked")

    def list_all(self) -> str:
        """列出所有任务，按 ID 排序"""
        tasks = []
        for f in sorted(self.dir.glob("task_*.json")):
            tasks.append(json.loads(f.read_text()))
        if not tasks:
            return "No tasks."

        lines = []
        for t in sorted(tasks, key=lambda x: x["id"]):
            status_icon = {"pending": "○", "in_progress": "●", "completed": "✓"}.get(
                t["status"], "?"
            )
            blocked = f" [blocked by: {t['blockedBy']}]" if t["blockedBy"] else ""
            owner = f" [{t['owner']}]" if t.get("owner") else ""
            lines.append(
                f"{status_icon} #{t['id']}: {t['subject']}{blocked}{owner}"
            )
        return "\n".join(lines)

    def get(self, task_id: int) -> str:
        return json.dumps(self._load(task_id), indent=2)

    def get_available(self) -> list:
        """返回可以立即执行的任务（pending + 无 blockedBy）"""
        available = []
        for f in self.dir.glob("task_*.json"):
            task = json.loads(f.read_text())
            if task["status"] == "pending" and not task.get("blockedBy"):
                available.append(task)
        return available

TASKS = TaskManager()
```

**将四个任务工具加入 dispatch map**

```python
TOOL_HANDLERS.update({
    "task_create": lambda **kw: TASKS.create(
        kw["subject"], kw.get("description", "")
    ),
    "task_update": lambda **kw: TASKS.update(
        kw["task_id"],
        status=kw.get("status"),
        add_blocked_by=kw.get("add_blocked_by"),
        owner=kw.get("owner"),
    ),
    "task_list": lambda **kw: TASKS.list_all(),
    "task_get":  lambda **kw: TASKS.get(kw["task_id"]),
})
```

**实际使用示例**

```
> Create a full-stack auth module: 
>   1. Design the database schema
>   2. Write the backend API (depends on 1)
>   3. Write frontend components (depends on 1) 
>   4. Write integration tests (depends on 2 and 3)

Agent 会创建：
  ○ #1: Design database schema
  ○ #2: Write backend API          [blocked by: [1]]
  ○ #3: Write frontend components  [blocked by: [1]]
  ○ #4: Write integration tests    [blocked by: [2, 3]]

完成任务 #1 后：
  ✓ #1: Design database schema
  ○ #2: Write backend API          (已解锁)
  ○ #3: Write frontend components  (已解锁)
  ○ #4: Write integration tests    [blocked by: [2, 3]]
```

**从 s07 起，任务图是多步工作的默认选择。s03 的 Todo 仍可用于单次会话内的快速清单。**

### 变更对比

| 组件 | 之前 (s06) | 之后 (s07) |
|------|-----------|-----------|
| Tools | 5 | 8（+task_create/update/list/get） |
| 规划模型 | 扁平清单（仅内存） | 带依赖关系的任务图（磁盘） |
| 关系 | 无 | `blockedBy` + `blocks` 边 |
| 状态追踪 | 做完没做完 | pending → in_progress → completed |
| 持久化 | 压缩后丢失 | 压缩和重启后存活 |

---

## s08：后台任务 — 慢操作丢后台，Agent 继续思考

> **箴言：** *"在后台运行耗时的操作；智能体继续思考"*

### 问题

有些命令要跑好几分钟：`npm install`、`pytest`、`docker build`。阻塞式循环下模型只能干等。

用户说"安装依赖，顺便建个配置文件"，智能体却只能一个一个来。

### 解决方案：守护线程 + 通知队列

```
Main thread                Background thread
+-----------------+        +-----------------+
| agent loop      |        | subprocess runs |
| ...             |        | ...             |
| [LLM call] <---+------- | enqueue(result) |
|  ^drain queue  |        +-----------------+
+-----------------+

Timeline:
Agent --[spawn A]--[spawn B]--[other work]----
             |          |
             v          v
          [A runs]   [B runs]      (并行执行)
             |          |
             +-- 结果在下次 LLM 调用前注入 --+
```

**关键设计：主线程保持单线程，只有子进程 I/O 被并行化。**

### 完整实现

**BackgroundManager：线程安全的任务管理器**

```python
import threading
import subprocess
import uuid
import time

class BackgroundManager:
    def __init__(self):
        self.tasks = {}           # task_id -> task info
        self._notification_queue = []  # 完成通知
        self._lock = threading.Lock()

    def run(self, command: str, workdir: str = None) -> str:
        """启动后台任务，立即返回任务 ID"""
        task_id = str(uuid.uuid4())[:8]
        with self._lock:
            self.tasks[task_id] = {
                "status": "running",
                "command": command,
                "started_at": time.time(),
            }

        # 守护线程：主进程退出时自动清理
        thread = threading.Thread(
            target=self._execute,
            args=(task_id, command, workdir),
            daemon=True
        )
        thread.start()
        return f"Background task {task_id} started: {command[:50]}"

    def _execute(self, task_id: str, command: str, workdir: str = None):
        """在后台线程中执行命令"""
        try:
            r = subprocess.run(
                command,
                shell=True,
                cwd=workdir or WORKDIR,
                capture_output=True,
                text=True,
                timeout=300,  # 5 分钟超时
            )
            output = (r.stdout + r.stderr).strip()[:50000]
            status = "completed" if r.returncode == 0 else "failed"
        except subprocess.TimeoutExpired:
            output = "Error: Command timed out after 300 seconds"
            status = "failed"
        except Exception as e:
            output = f"Error: {e}"
            status = "failed"

        with self._lock:
            self.tasks[task_id]["status"] = status
            self.tasks[task_id]["result"] = output
            self.tasks[task_id]["completed_at"] = time.time()

            # 推入通知队列，等待 Agent 循环取出
            self._notification_queue.append({
                "task_id": task_id,
                "status": status,
                "result": output[:500],  # 通知只带摘要
            })

    def drain_notifications(self) -> list:
        """取出所有待处理通知（清空队列）"""
        with self._lock:
            notifs = list(self._notification_queue)
            self._notification_queue.clear()
            return notifs

    def check(self, task_id: str) -> str:
        """查询单个任务状态"""
        task = self.tasks.get(task_id)
        if not task:
            return f"Task {task_id} not found"
        return json.dumps({
            "task_id": task_id,
            "status": task["status"],
            "command": task["command"],
            "result": task.get("result", "(still running...)"),
        }, indent=2)

    def list_all(self) -> str:
        """列出所有后台任务"""
        if not self.tasks:
            return "No background tasks."
        lines = []
        for tid, t in self.tasks.items():
            elapsed = time.time() - t["started_at"]
            lines.append(
                f"[{t['status']}] {tid}: {t['command'][:40]} "
                f"({elapsed:.0f}s)"
            )
        return "\n".join(lines)

BG = BackgroundManager()
```

**在 agent_loop 中注入通知**

```python
def agent_loop(messages: list):
    while True:
        # 每次 LLM 调用前，先排空后台任务通知
        notifs = BG.drain_notifications()
        if notifs:
            notif_text = "\n".join(
                f"[bg:{n['task_id']}] [{n['status']}] {n['result']}"
                for n in notifs
            )
            # 将通知作为系统消息注入对话
            messages.append({
                "role": "user",
                "content": f"<background-results>\n{notif_text}\n</background-results>",
            })
            messages.append({
                "role": "assistant",
                "content": "Noted the background task results.",
            })

        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

**注册后台任务工具**

```python
TOOL_HANDLERS.update({
    "background_run": lambda **kw: BG.run(kw["command"]),
    "background_check": lambda **kw: BG.check(kw["task_id"]),
    "background_list": lambda **kw: BG.list_all(),
})
```

### 实际使用场景

```
> Install dependencies and set up the config file at the same time

Agent 执行：
  1. background_run("npm install")          → task_id: a1b2c3d4
  2. write_file("config.json", "{...}")     → 立即完成
  3. write_file(".env", "PORT=3000\n...")   → 立即完成
  
  # 几分钟后，npm install 完成，通知自动注入：
  [bg:a1b2c3d4] [completed] added 234 packages in 3m 21s
  
  Agent："npm install 已完成，所有文件都就绪了。"
```

### 变更对比

| 组件 | 之前 (s07) | 之后 (s08) |
|------|-----------|-----------|
| Tools | 8 | 6（基础 + background_run/check） |
| 执行方式 | 仅阻塞 | 阻塞 + 后台线程 |
| 通知机制 | 无 | 每轮排空的队列 |
| 并发 | 无 | 守护线程 |

---

## 阶段小结

这一阶段把 Agent 从"能思考"升级为"能管理工程"：

- **s07 任务图**：用 DAG 表达真实的依赖关系，任务持久化到磁盘，不怕上下文压缩
- **s08 后台并发**：等待慢操作时不再空转，守护线程并行执行，通知队列保持主线程简洁

这两个机制也为下一阶段打下基础：
- 任务图是多 Agent 团队的**协调骨架**——每个 Agent 从任务看板认领工作
- 后台线程的模式将被扩展为每个队友一个完整的 agent loop

下一阶段，我们将引入真正的多智能体协作：持久化队友、JSONL 邮箱通信、以及最终的自主认领机制。
