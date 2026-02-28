# 内容贡献指南 — 如何通过 Markdown 添加新内容

本项目的所有课程内容都以 **Markdown 文件**形式存储在 `content/` 目录下，无需修改任何代码即可新增文章或章节。

---

## 目录结构

```
content/
├── fundamentals/          ← 章节目录（section）
│   ├── _category.json     ← 章节元信息（必须存在）
│   ├── 01-what-is-ai-agent.md
│   └── 02-agent-loop.md
├── tools/
│   ├── _category.json
│   ├── 01-tool-design.md
│   └── 02-function-calling.md
├── planning/
│   ├── _category.json
│   └── 01-react-framework.md
├── memory/
├── multi-agent/
└── production/
```

---

## 一、给现有章节添加新文章

### 第一步：确定文件名

文件命名格式为 `{序号}-{slug}.md`，序号决定文章在章节内的排列顺序：

```
02-agent-loop.md      ← 第 2 篇
03-my-new-article.md  ← 新加第 3 篇
```

> **规则：** 序号从 `01` 开始，前面补零，slug 用小写英文和连字符。

### 第二步：编写文章文件

在对应章节目录下新建 `.md` 文件，文件开头必须包含 **Frontmatter**（YAML 格式的元信息块）：

```markdown
---
title: "你的文章标题"
excerpt: "一句话简介，显示在文章列表卡片上。"
isPremium: false
order: 3
readingTime: 10
tags: ["tag1", "tag2"]
video: "https://www.youtube.com/embed/VIDEO_ID"
---

# 文章正文从这里开始

...
```

### Frontmatter 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 文章标题，显示在页面和导航栏 |
| `excerpt` | string | ✅ | 简短描述，显示在文章列表 |
| `isPremium` | boolean | ✅ | `true` = 付费内容；`false` = 免费 |
| `order` | number | ✅ | 章节内排序，数字越小越靠前 |
| `readingTime` | number | 推荐 | 预计阅读时间（分钟） |
| `tags` | string[] | 推荐 | 标签数组，用于分类过滤 |
| `video` | string | 可选 | YouTube 嵌入链接（`/embed/` 格式） |

> ⚠️ `isPremium: true` 的文章，未付费用户只能看到 `excerpt`，内容会被服务端拦截。

---

## 二、添加全新章节（Section）

### 第一步：创建章节目录

```bash
mkdir content/my-new-section
```

### 第二步：创建 `_category.json`

这是章节的必要配置文件，缺少它该章节会被忽略：

```json
{
  "name": "我的新章节",
  "description": "这个章节介绍什么内容。",
  "icon": "🚀",
  "order": 7
}
```

| 字段 | 说明 |
|------|------|
| `name` | 显示在导航和首页的章节名称 |
| `description` | 章节简介 |
| `icon` | Emoji 图标，显示在章节卡片上 |
| `order` | 章节在课程中的排列顺序（数字越小越靠前） |

### 第三步：添加文章

按照上一节的方式，在新目录下创建 Markdown 文件即可。

---

## 三、Markdown 语法支持

本项目使用 **remark + rehype** 渲染管道，支持以下特性：

### 标准 Markdown

```markdown
# H1 标题
## H2 标题

**加粗** / *斜体* / ~~删除线~~

- 无序列表
1. 有序列表

[链接文字](https://example.com)
![图片描述](https://example.com/image.png)
```

### 表格（GFM）

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
```

### 代码块（自动语法高亮）

````markdown
```python
def hello():
    print("Hello, Agent!")
```

```typescript
const agent = new Agent({ model: "claude-3-5-sonnet" })
```
````

支持的语言：`python`、`typescript`、`javascript`、`bash`、`json`、`yaml` 等主流语言自动识别。

### 嵌入视频（iframe）

```markdown
<iframe
  width="100%"
  height="400"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0"
  allowfullscreen
></iframe>
```

或者在 Frontmatter 中填写 `video` 字段，系统会自动渲染播放器。

### 提示块（使用 HTML）

```markdown
<blockquote>
💡 <strong>提示：</strong> 这是一个重要提示。
</blockquote>
```

---

## 四、完整示例

以下是一篇完整的新文章示例，保存为 `content/tools/03-mcp-protocol.md`：

```markdown
---
title: "MCP 协议：标准化工具调用"
excerpt: "了解 Model Context Protocol 如何统一 AI Agent 的工具调用标准。"
isPremium: true
order: 3
readingTime: 12
tags: ["mcp", "tools", "protocol"]
video: "https://www.youtube.com/embed/EXAMPLE_ID"
---

# MCP 协议：标准化工具调用

## 什么是 MCP？

Model Context Protocol（MCP）是 Anthropic 提出的开放协议，用于标准化...

## 核心架构

| 组件 | 职责 |
|------|------|
| MCP Server | 暴露工具和资源 |
| MCP Client | Agent 侧连接器 |
| Transport | 通信层（stdio / SSE） |

## 代码示例

​```python
from mcp import ClientSession, StdioServerParameters

async def main():
    server = StdioServerParameters(command="python", args=["server.py"])
    async with ClientSession(server) as session:
        tools = await session.list_tools()
        print(tools)
​```
```

---

## 五、发布流程

内容修改完成后，通过 Git 推送即可上线（部署自动触发）：

```bash
# 1. 将新文件加入暂存区
git add content/

# 2. 提交
git commit -m "content: 添加 MCP 协议文章"

# 3. 推送到 GitHub（CI/CD 自动部署）
git push
```

> **注意：** 本项目使用 Next.js 静态生成（SSG），push 后需等待约 1-2 分钟构建完成，新内容才会在线上生效。

---

## 六、常见问题

**Q: 文章不显示在列表里？**
A: 检查 `_category.json` 是否存在；检查文件名是否以 `.md` 结尾且不以 `_` 开头。

**Q: 代码块语法高亮没生效？**
A: 确认代码块开头标注了语言名称（如 ` ```python `），不要留空。

**Q: 想更新已有文章？**
A: 直接编辑对应 `.md` 文件并 push，无需改动其他代码。

**Q: 如何设置文章顺序？**
A: 修改 Frontmatter 中的 `order` 字段（整数），或调整文件名前缀数字，两者取其一即可（系统优先以 `order` 字段排序）。
