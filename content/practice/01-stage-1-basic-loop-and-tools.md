---
title: "第一阶段：基础循环与工具 (s01–s03)"
excerpt: "从 30 行的 while 循环出发，理解 Agent 最底层的工作原理：核心循环、工具调度机制（dispatch map）以及任务规划（TodoWrite）。"
isPremium: false
order: 1
readingTime: 15
tags: ["claude-code", "agent", "stage1", "tools", "todo"]
---

# 第一阶段：智能体的基石

这一阶段解决一个核心问题：**如何让语言模型从"对话"变成"行动"？**

语言模型能推理代码，但碰不到真实世界——不能读文件、跑测试、看报错。没有循环，每次工具调用你都得手动把结果粘回去。你自己就是那个循环。

解决方案是自动化这个过程：让模型调用工具、收集结果、把结果喂回去，不断循环，直到任务完成。

---

## s01：智能体循环 — One loop & Bash is all you need

> **箴言：** *"一个工具 + 一个循环 = 一个智能体"*

### 问题

没有循环时，流程是：
1. 用户提问
2. 模型回答，提出需要执行某个命令
3. 用户手动执行，把输出复制粘贴回去
4. 模型继续回答……

你就是那个循环。

### 解决方案：自动化循环

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> |  Tool   |
| prompt |      |       |      | execute |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
              (loop until stop_reason != "tool_use")
```

一个退出条件控制整个流程。循环持续运行，直到模型不再调用工具。

### 完整实现

**第一步：用户 prompt 作为第一条消息**

```python
messages = [{"role": "user", "content": query}]
```

**第二步：将消息和工具定义一起发给 LLM**

```python
response = client.messages.create(
    model="claude-opus-4-5",
    system="You are a coding agent. Use bash to complete tasks.",
    messages=messages,
    tools=TOOLS,
    max_tokens=8000,
)
```

**第三步：追加助手响应，检查是否需要继续循环**

```python
messages.append({"role": "assistant", "content": response.content})

# 模型没有调用工具 → 任务完成
if response.stop_reason != "tool_use":
    return
```

**第四步：执行工具调用，把结果喂回去**

```python
results = []
for block in response.content:
    if block.type == "tool_use":
        output = run_bash(block.input["command"])
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
messages.append({"role": "user", "content": results})
# → 回到第二步
```

**组装为完整函数：**

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-opus-4-5"
SYSTEM = "You are a helpful coding agent."

TOOLS = [{
    "name": "bash",
    "description": "Run a bash command and return the output.",
    "input_schema": {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "The bash command to run"}
        },
        "required": ["command"]
    }
}]

def run_bash(command: str) -> str:
    import subprocess
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=30
    )
    return (result.stdout + result.stderr).strip()[:50000]

def agent_loop(query: str):
    messages = [{"role": "user", "content": query}]
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            # 打印最终回复
            for block in response.content:
                if hasattr(block, "text"):
                    print(block.text)
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})

# 运行
agent_loop("Create a file called hello.py that prints 'Hello, Agent!'")
```

不到 30 行，这就是整个智能体。**后面 11 个章节都在这个循环上叠加机制，循环本身始终不变。**

### 变更对比

| 组件 | 之前 | 之后 |
|------|------|------|
| Agent loop | 无 | `while True` + stop_reason |
| Tools | 无 | `bash`（单一工具） |
| Messages | 无 | 累积式消息列表 |
| Control flow | 无 | `stop_reason != "tool_use"` |

---

## s02：工具使用 — 加工具 = 加一个 handler

> **箴言：** *"循环不用动，新工具注册进 dispatch map 就行"*

### 问题

只有 `bash` 时，所有操作都走 shell。存在两个问题：

1. **安全面太大**：`cat`、`sed` 等命令行为不可预测，遇到特殊字符就崩
2. **无路径保护**：模型可能误操作工作区之外的文件

专用工具（`read_file`、`write_file`）可以在工具层面做路径沙箱。

**关键洞察：加工具不需要改循环。**

### Dispatch Map：把工具名映射到处理函数

```
+--------+      +-------+      +------------------+
|  User  | ---> |  LLM  | ---> | Tool Dispatch    |
| prompt |      |       |      | {                |
+--------+      +---+---+      |   bash: run_bash |
                    ^           |   read: run_read |
                    |           |   write: run_wr  |
                    +-----------+   edit: run_edit |
                    tool_result | }                |
                                +------------------+
```

### 完整实现

**路径沙箱：防止逃逸工作区**

```python
from pathlib import Path

WORKDIR = Path.cwd()

def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path
```

**各个工具的处理函数**

```python
def run_bash(command: str) -> str:
    import subprocess
    r = subprocess.run(command, shell=True, cwd=WORKDIR,
                       capture_output=True, text=True, timeout=30)
    return (r.stdout + r.stderr).strip()[:50000]

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]

def run_write(path: str, content: str) -> str:
    target = safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
    return f"Written {len(content)} chars to {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    target = safe_path(path)
    content = target.read_text()
    if old_text not in content:
        return f"Error: old_text not found in {path}"
    target.write_text(content.replace(old_text, new_text, 1))
    return f"Edited {path}"
```

**Dispatch Map：加工具 = 加一行**

```python
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"],
                                        kw["old_text"], kw["new_text"]),
}
```

**循环中按名称查找处理函数（与 s01 完全一致）**

```python
for block in response.content:
    if block.type == "tool_use":
        handler = TOOL_HANDLERS.get(block.name)
        if handler:
            output = handler(**block.input)
        else:
            output = f"Unknown tool: {block.name}"
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
```

**加工具 = 加 handler + 加 schema。循环永远不变。**

### 变更对比

| 组件 | 之前 (s01) | 之后 (s02) |
|------|-----------|-----------|
| Tools | 1（仅 bash） | 4（bash, read, write, edit） |
| Dispatch | 硬编码 bash 调用 | `TOOL_HANDLERS` 字典 |
| 路径安全 | 无 | `safe_path()` 沙箱 |
| Agent loop | 不变 | 不变 |

---

## s03：待办写入 — 没有计划的 Agent 只会漂移

> **箴言：** *"先列步骤再动手，完成率翻倍"*

### 问题

多步任务中，模型会丢失进度——重复做过的事、跳步、跑偏。

原因：对话越长，工具结果不断填满上下文，系统提示的影响力逐渐被稀释。一个 10 步重构可能做完 1-3 步就开始即兴发挥，因为 4-10 步已经被挤出注意力了。

### 解决方案：TodoManager + Nag Reminder

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> | Tools   |
| prompt |      |       |      | + todo  |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                          |
              +-----------+-----------+
              | TodoManager state     |
              | [ ] task A            |
              | [>] task B  <- doing  |
              | [x] task C            |
              +-----------------------+
                          |
              if rounds_since_todo >= 3:
                inject <reminder> into tool_result
```

### 完整实现

**TodoManager：带状态的任务管理器**

```python
class TodoManager:
    def __init__(self):
        self.items = []

    def update(self, items: list) -> str:
        """同一时间只允许一个 in_progress"""
        validated = []
        in_progress_count = 0

        for item in items:
            status = item.get("status", "pending")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({
                "id": item["id"],
                "text": item["text"],
                "status": status,
            })

        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress at a time")

        self.items = validated
        return self.render()

    def render(self) -> str:
        if not self.items:
            return "No todos."
        icons = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}
        lines = [f"{icons.get(i['status'], '[ ]')} {i['id']}: {i['text']}"
                 for i in self.items]
        return "\n".join(lines)

TODO = TodoManager()
```

**将 todo 工具加入 dispatch map（与其他工具一样）**

```python
TOOL_HANDLERS = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}
```

**Nag Reminder：模型连续 3 轮不更新 todo 时注入提醒**

```python
rounds_since_todo = 0

def agent_loop(query: str):
    global rounds_since_todo
    messages = [{"role": "user", "content": query}]

    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        used_todo = False
        for block in response.content:
            if block.type == "tool_use":
                if block.name == "todo":
                    used_todo = True
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })

        # 更新 todo 计数器
        if used_todo:
            rounds_since_todo = 0
        else:
            rounds_since_todo += 1

        # 注入 nag reminder
        if rounds_since_todo >= 3 and results:
            results.insert(0, {
                "type": "text",
                "text": "<reminder>Update your todos before continuing.</reminder>",
            })

        messages.append({"role": "user", "content": results})
```

**"同时只能有一个 in_progress" 强制顺序聚焦。nag reminder 制造问责压力——你不更新计划，系统就追着你问。**

### TodoWrite 的工具定义

```python
TODO_TOOL = {
    "name": "todo",
    "description": (
        "Manage your task list. Always call this first to plan, "
        "then update status as you work."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id":     {"type": "string"},
                        "text":   {"type": "string"},
                        "status": {
                            "type": "string",
                            "enum": ["pending", "in_progress", "completed"]
                        }
                    },
                    "required": ["id", "text", "status"]
                }
            }
        },
        "required": ["items"]
    }
}
```

### 变更对比

| 组件 | 之前 (s02) | 之后 (s03) |
|------|-----------|-----------|
| Tools | 4 | 5（+todo） |
| 规划 | 无 | 带状态的 TodoManager |
| Nag 注入 | 无 | 3 轮后注入 `<reminder>` |
| Agent loop | 简单分发 | + rounds_since_todo 计数器 |

### 测试一下

```bash
python agents/s03_todo_write.py
```

推荐用这些 prompt 测试效果：

1. `Refactor the file hello.py: add type hints, docstrings, and a main guard`
2. `Create a Python package with __init__.py, utils.py, and tests/test_utils.py`
3. `Review all Python files and fix any style issues`

观察模型是否会先用 `todo` 工具列出步骤，再逐步执行。

---

## 阶段小结

这一阶段的三个机制共同构成了 Agent 的基础能力框架：

- **s01** 证明了最小可行的 Agent：30 行代码，一个循环
- **s02** 扩展了工具集，引入了安全沙箱，证明扩展能力无需改核心
- **s03** 引入规划约束，让 Agent 从"乱跑"变成"有序执行"

下一阶段，我们将面对更大的挑战：当任务复杂到单个上下文装不下，或者知识点太多塞满系统提示时，该怎么办？
