---
title: "第二阶段：上下文与知识管理 (s04–s06)"
excerpt: "子智能体保持主对话干净，技能库按需加载知识，三层压缩解决上下文溢出。解决信息过载，让 Agent 在大型项目中保持清醒。"
isPremium: false
order: 2
readingTime: 18
tags: ["claude-code", "agent", "stage2", "context", "subagent", "skills"]
---

# 第二阶段：保持清醒的大脑

第一阶段解决了"如何让 Agent 行动"。这一阶段解决更难的问题：**当任务越来越复杂，上下文越来越大，Agent 如何不失控？**

三个核心挑战：
1. 大任务的执行细节会污染主对话上下文
2. 领域知识如果全部塞进系统提示，Token 浪费严重
3. 长对话终究会超出上下文窗口限制

三个对应方案：**子智能体、技能库、上下文压缩**。

---

## s04：子智能体 — 每个子任务都有干净的上下文

> **箴言：** *"大任务拆小；每个子任务获得一个干净的上下文"*

### 问题

智能体工作越久，`messages` 数组越胖。每次读文件、跑命令的输出都永久留在上下文里。

例如："这个项目用什么测试框架？"可能要读 5 个文件，但父智能体只需要一个词——"pytest"。然而那 5 个文件的完整内容却永远留在主对话历史里，占据宝贵的上下文窗口。

### 解决方案：隔离上下文

```
Parent agent                     Subagent
+------------------+             +------------------+
| messages=[...]   |             | messages=[]      | <-- 全新，干净
|                  |  dispatch   |                  |
| tool: task       | ----------> | while tool_use:  |
|   prompt="..."   |             |   call tools     |
|                  |  summary    |   append results |
|   result = "..." | <---------- | return last text |
+------------------+             +------------------+

Parent context stays clean. Subagent context is discarded.
```

父智能体只需要子智能体的"摘要"，而不是它做过的所有中间步骤。

### 完整实现

**定义 `task` 工具（父端专用）**

```python
TASK_TOOL = {
    "name": "task",
    "description": (
        "Spawn a subagent with a fresh context to handle a subtask. "
        "Use this for any task that would pollute your context. "
        "Returns only the final summary."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "The complete task description for the subagent"
            }
        },
        "required": ["prompt"]
    }
}

# 父端工具列表包含 task；子智能体不能递归生成子智能体
PARENT_TOOLS = CHILD_TOOLS + [TASK_TOOL]
```

**子智能体执行函数**

```python
def run_subagent(prompt: str) -> str:
    """
    以全新的 messages=[] 启动子智能体。
    子智能体完成后，只有最终文字返回给父智能体。
    子智能体的完整工具调用历史被丢弃。
    """
    sub_messages = [{"role": "user", "content": prompt}]

    for _ in range(30):  # 安全上限：防止无限循环
        response = client.messages.create(
            model=MODEL,
            system=SUBAGENT_SYSTEM,  # 子智能体的系统提示
            messages=sub_messages,
            tools=CHILD_TOOLS,       # 注意：不包含 task 工具
            max_tokens=8000,
        )
        sub_messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            break  # 子任务完成

        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input) if handler else f"Unknown tool"
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000],
                })
        sub_messages.append({"role": "user", "content": results})

    # 只提取最终文字摘要，完整的 sub_messages 直接丢弃
    summary = "".join(
        b.text for b in response.content if hasattr(b, "text")
    )
    return summary or "(subagent completed with no summary)"

# 注册到 dispatch map
TOOL_HANDLERS["task"] = lambda **kw: run_subagent(kw["prompt"])
```

**子智能体可能跑了 30+ 次工具调用，但整个消息历史直接丢弃。父智能体收到的只是一段摘要文本，作为普通 `tool_result` 返回。**

### 实际效果对比

不使用子智能体，分析 10 个文件后的父上下文：
```
消息数：~60 条
Token 用量：~25,000
包含：每个文件的完整内容、每条命令的输出...
```

使用子智能体后：
```
消息数：~8 条
Token 用量：~3,000
包含：任务描述 + 一条摘要文字
```

### 变更对比

| 组件 | 之前 (s03) | 之后 (s04) |
|------|-----------|-----------|
| Tools | 5 | 5（基础）+ task（仅父端） |
| 上下文 | 单一共享 | 父 + 子隔离 |
| Subagent | 无 | `run_subagent()` 函数 |
| 返回值 | 不适用 | 仅摘要文本 |

---

## s05：技能库 — 用到什么知识，临时加载什么知识

> **箴言：** *"通过 tool_result 注入，不塞 system prompt"*

### 问题

你希望智能体遵循特定领域的工作流：git 约定、测试模式、代码审查清单。

**坏方案**：全塞进系统提示。10 个技能，每个 2,000 token，就是 20,000 token，大部分跟当前任务毫无关系。每次调用 API 都要付这笔固定成本。

**好方案**：两层注入——系统提示只放技能名称，工具调用时才注入完整内容。

### 解决方案：两层知识注入

```
系统提示（第一层，始终存在，低成本）：
+--------------------------------------+
| You are a coding agent.              |
| Skills available:                    |
|   - git: Git workflow helpers        |  每个技能 ~100 tokens
|   - test: Testing best practices     |
+--------------------------------------+

当模型调用 load_skill("git") 时：
+--------------------------------------+
| tool_result（第二层，按需，较贵）：  |
| <skill name="git">                   |
|   完整的 git 工作流指南...            |  ~2000 tokens
|   Step 1: ...                        |
| </skill>                             |
+--------------------------------------+
```

第一层：系统提示中只放技能名称（便宜）。
第二层：tool_result 中按需放完整内容（贵，但只在需要时才花）。

### 完整实现

**技能文件结构**

```
skills/
  git/
    SKILL.md       # Git 工作流完整指南
  code-review/
    SKILL.md       # 代码审查清单
  test/
    SKILL.md       # 测试最佳实践
  mcp-builder/
    SKILL.md       # 构建 MCP Server 指南
```

每个 `SKILL.md` 文件格式：

```markdown
---
name: git
description: Git workflow helpers for committing and branching
---

# Git Workflow

## Commit 规范

格式：`<type>(<scope>): <description>`

类型：feat | fix | docs | refactor | test | chore

## 分支命名

- feature/xxx
- fix/xxx
- hotfix/xxx

## 标准流程

1. `git status` — 检查当前状态
2. `git add -p` — 交互式暂存
3. `git commit -m "..."` — 按规范提交
4. `git push origin <branch>` — 推送
```

**SkillLoader：扫描并加载技能**

```python
import yaml
from pathlib import Path

class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        # 递归扫描所有 SKILL.md
        for skill_file in sorted(skills_dir.rglob("SKILL.md")):
            text = skill_file.read_text()
            meta, body = self._parse_frontmatter(text)
            name = meta.get("name", skill_file.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def _parse_frontmatter(self, text: str):
        """解析 YAML frontmatter"""
        if not text.startswith("---"):
            return {}, text
        parts = text.split("---", 2)
        if len(parts) < 3:
            return {}, text
        meta = yaml.safe_load(parts[1]) or {}
        body = parts[2].strip()
        return meta, body

    def get_descriptions(self) -> str:
        """返回所有技能的简短描述（放进系统提示）"""
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "")
            lines.append(f"  - {name}: {desc}")
        return "\n".join(lines)

    def get_content(self, name: str) -> str:
        """按需返回完整技能内容（作为 tool_result）"""
        skill = self.skills.get(name)
        if not skill:
            available = list(self.skills.keys())
            return f"Error: Unknown skill '{name}'. Available: {available}"
        return f'<skill name="{name}">\n{skill["body"]}\n</skill>'

SKILL_LOADER = SkillLoader(Path("skills"))
```

**第一层：技能描述注入系统提示**

```python
SYSTEM = f"""You are a coding agent working in {WORKDIR}.

Skills available (load with load_skill tool when relevant):
{SKILL_LOADER.get_descriptions()}

When you need domain-specific guidance, load the relevant skill first."""
```

**第二层：load_skill 工具注入完整内容**

```python
LOAD_SKILL_TOOL = {
    "name": "load_skill",
    "description": "Load a skill's full instructions into your context.",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Skill name to load"}
        },
        "required": ["name"]
    }
}

TOOL_HANDLERS["load_skill"] = lambda **kw: SKILL_LOADER.get_content(kw["name"])
```

**模型知道有哪些技能（便宜），需要时再加载完整内容（贵但按需）。**

### Token 节省对比

| 方式 | 每次 API 调用的 Token | 说明 |
|------|----------------------|------|
| 全部塞系统提示 | 约 +20,000 | 10 个技能 × 2,000 |
| 两层注入 | 约 +500（常规）<br>约 +2,500（需要某技能时） | 绝大多数任务不需要加载技能 |

### 变更对比

| 组件 | 之前 (s04) | 之后 (s05) |
|------|-----------|-----------|
| Tools | 5（基础 + task） | 5（基础 + load_skill） |
| 系统提示 | 静态字符串 | + 技能描述列表 |
| 知识库 | 无 | skills/*/SKILL.md 文件 |
| 注入方式 | 无 | 两层（系统提示 + result） |

---

## s06：上下文压缩 — 三层策略换来无限会话

> **箴言：** *"上下文总会满；你需要一种方法来腾出空间"*

### 问题

上下文窗口是有限的。读一个 1,000 行的文件就吃掉 ~4,000 token；读 30 个文件、跑 20 条命令，轻松突破 100k token。不压缩，智能体根本没法在大项目里干活。

### 解决方案：三层压缩，激进程度递增

```
每次 LLM 调用前：
+------------------+
| Tool call result |
+------------------+
        |
        v
[第一层: micro_compact]        （静默，每轮执行）
  将 3 轮前的 tool_result 替换为
  "[Previous: used {tool_name}]"
        |
        v
[检查: tokens > 50,000?]
   |               |
   no              yes
   |               |
   v               v
继续      [第二层: auto_compact]
              保存完整对话到 .transcripts/
              让 LLM 做摘要
              用 [摘要] 替换所有消息
                    |
                    v
            [第三层: compact tool]
              模型主动调用，触发相同的摘要机制
```

### 完整实现

**第一层：micro_compact — 静默替换旧结果**

```python
KEEP_RECENT = 3  # 保留最近 3 次工具结果的完整内容

def micro_compact(messages: list) -> list:
    """
    将旧的 tool_result 内容替换为占位符。
    静默执行，模型不会感知到这个操作。
    """
    # 收集所有 tool_result 的位置
    tool_results = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and isinstance(msg.get("content"), list):
            for j, part in enumerate(msg["content"]):
                if isinstance(part, dict) and part.get("type") == "tool_result":
                    tool_results.append((i, j, part))

    # 只保留最近的 KEEP_RECENT 个，其余替换为占位符
    if len(tool_results) <= KEEP_RECENT:
        return messages

    for i, j, part in tool_results[:-KEEP_RECENT]:
        content = part.get("content", "")
        if len(content) > 100:  # 只压缩有实质内容的
            # 尝试从内容中提取工具名（如果有的话）
            part["content"] = f"[Previous result, compacted to save context]"

    return messages
```

**第二层：auto_compact — Token 超限时自动摘要**

```python
import json, time
from pathlib import Path

TRANSCRIPT_DIR = Path(".transcripts")
TRANSCRIPT_DIR.mkdir(exist_ok=True)
TOKEN_THRESHOLD = 50_000

def estimate_tokens(messages: list) -> int:
    """粗略估算 Token 数量（1 token ≈ 4 字符）"""
    text = json.dumps(messages, default=str)
    return len(text) // 4

def auto_compact(messages: list) -> list:
    """
    1. 保存完整对话到磁盘（用于恢复/审计）
    2. 让 LLM 对整个对话做摘要
    3. 用摘要替换所有消息
    """
    # 保存完整记录
    ts = int(time.time())
    transcript_path = TRANSCRIPT_DIR / f"transcript_{ts}.jsonl"
    with open(transcript_path, "w") as f:
        for msg in messages:
            f.write(json.dumps(msg, default=str) + "\n")
    print(f"[Context] Saved transcript to {transcript_path}")

    # 让 LLM 做摘要
    summary_prompt = (
        "Summarize this conversation for continuity. "
        "Include: goals, progress made, files changed, pending tasks, "
        "key findings. Be concise but complete.\n\n"
        + json.dumps(messages, default=str)[:80000]
    )
    response = client.messages.create(
        model=MODEL,
        messages=[{"role": "user", "content": summary_prompt}],
        max_tokens=2000,
    )
    summary = response.content[0].text

    # 用摘要替换所有消息（只保留两条）
    print(f"[Context] Compacted {len(messages)} messages → summary")
    return [
        {"role": "user",    "content": f"[Context compressed]\n\n{summary}"},
        {"role": "assistant","content": "Understood. Continuing from summary."},
    ]
```

**第三层：manual compact — 模型主动触发**

```python
COMPACT_TOOL = {
    "name": "compact",
    "description": "Compress the conversation history to free up context space.",
    "input_schema": {"type": "object", "properties": {}, "required": []}
}

# 在 dispatch map 中，compact 触发 auto_compact
# 实际在 agent_loop 里处理，因为需要访问 messages 变量
```

**整合三层压缩的 agent_loop**

```python
def agent_loop(messages: list):
    while True:
        # 第一层：静默微压缩
        micro_compact(messages)

        # 第二层：Token 超限时自动压缩
        if estimate_tokens(messages) > TOKEN_THRESHOLD:
            messages[:] = auto_compact(messages)

        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        manual_compact_requested = False
        for block in response.content:
            if block.type == "tool_use":
                if block.name == "compact":
                    # 第三层：模型主动请求压缩
                    manual_compact_requested = True
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "Compressing context...",
                    })
                else:
                    handler = TOOL_HANDLERS.get(block.name)
                    output = handler(**block.input)
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    })

        messages.append({"role": "user", "content": results})

        # 第三层：压缩（在追加结果之后执行）
        if manual_compact_requested:
            messages[:] = auto_compact(messages)
```

**完整历史通过 transcript 保存在磁盘上。信息没有真正丢失，只是移出了活跃上下文。**

### 三层压缩效果示意

| 场景 | 处理方式 | 结果 |
|------|---------|------|
| 普通使用 | micro_compact 替换旧结果 | 上下文稳定在合理范围 |
| 大文件分析 | auto_compact 触发 | 对话重置为摘要，继续工作 |
| 模型自感内存紧张 | compact 工具 | 同上 |

### 变更对比

| 组件 | 之前 (s05) | 之后 (s06) |
|------|-----------|-----------|
| Tools | 5 | 5（基础 + compact） |
| 上下文管理 | 无 | 三层压缩 |
| Micro-compact | 无 | 旧结果 → 占位符 |
| Auto-compact | 无 | Token 阈值触发摘要 |
| Transcripts | 无 | 保存到 .transcripts/ |

---

## 阶段小结

这一阶段解决了 Agent 在复杂任务中的三大信息问题：

- **s04 子智能体**：主对话保持干净，子任务的"过程"不污染主上下文
- **s05 技能库**：知识按需加载，不在系统提示里堆废弃信息
- **s06 上下文压缩**：三层递进策略，让单个 Agent 会话可以处理无限大的任务

三者结合，Agent 的"大脑"始终保持清醒，不会随着工作量增加而退化。

下一阶段，我们将进一步工程化：引入持久化任务图和后台并发执行，让 Agent 能处理真正的工程级任务。
