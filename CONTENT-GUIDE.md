# Content Contribution Guide — Adding Articles via Markdown

All course content is stored as **Markdown files** in the `content/` directory. No code changes needed to add articles or sections.

---

## Directory Structure

```
content/
├── microgpt/              ← section directory
│   ├── _category.json     ← section metadata (required)
│   ├── 01-what-is-ai-agent.md
│   └── 02-agent-loop.md
├── agent-principles/
│   ├── _category.json
│   └── 01-tool-design.md
...
```

---

## 1. Adding an Article to an Existing Section

### Step 1: Choose a filename

Format: `{order}-{slug}.md` — the order number controls position within the section:

```
01-what-is-ai-agent.md    ← 1st article
02-agent-loop.md          ← 2nd article
03-my-new-article.md      ← new 3rd article
```

> **Rule:** numbers start at `01`, zero-padded; slugs use lowercase letters and hyphens.

### Step 2: Write the article file

Create a `.md` file in the target section directory. It must start with a **Frontmatter** block (YAML):

```markdown
---
title: "Your Article Title"
excerpt: "One-sentence description shown on the article card."
isPremium: false
order: 3
readingTime: 10
tags: ["tag1", "tag2"]
---

# Article body starts here
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Article title shown in the page header and navigation |
| `excerpt` | string | ✅ | Short description shown in the article list |
| `isPremium` | boolean | ✅ | `true` = Pro-only; `false` = free |
| `order` | number | ✅ | Position within the section (lower = earlier) |
| `readingTime` | number | recommended | Estimated reading time in minutes |
| `tags` | string[] | recommended | Tag array for filtering |
| `video` | string | optional | YouTube embed URL (`/embed/` format) |
| `series` | string | optional | Series name (e.g. "CLI Agent Pattern") |
| `company` | string | optional | For interview questions: company source |
| `difficulty` | string | optional | For interview questions: e.g. "Medium-Hard" |

> ⚠️ Articles with `isPremium: true` — the body is blocked server-side for non-Pro users. Only the excerpt is visible.

---

## 2. Adding a New Section

### Step 1: Create the section directory

```bash
mkdir content/my-new-section
```

### Step 2: Create `_category.json`

This file is required — the section is ignored without it:

```json
{
  "name": "My New Section",
  "description": "What this section covers.",
  "icon": "🔧",
  "order": 5
}
```

| Field | Description |
|-------|-------------|
| `name` | Section name shown in navigation and homepage |
| `description` | Section description |
| `icon` | Emoji icon shown on section cards |
| `order` | Position in the course (lower = earlier) |

### Step 3: Add articles

Follow the previous section to create Markdown files inside the new directory.

---

## 3. Markdown Syntax Support

The project uses a **remark + rehype** pipeline supporting:

### Standard Markdown

```markdown
# H1
## H2

**bold** / *italic* / ~~strikethrough~~

- unordered list
1. ordered list

[link text](https://example.com)
![alt text](https://example.com/image.png)
```

### Tables (GFM)

```markdown
| Column A | Column B | Column C |
|----------|----------|----------|
| value    | value    | value    |
```

### Code blocks (auto syntax highlighting)

````markdown
```python
def hello():
    return "Hello, Agent!"
```
````

Supported languages: `python`, `typescript`, `javascript`, `bash`, `json`, `yaml`, and all other common languages.

### Embedding video (iframe)

```html
<div class="video-container">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen></iframe>
</div>
```

Or set the `video` field in Frontmatter — the player renders automatically.

### Callout blocks (HTML)

```html
<div class="callout">
  💡 <strong>Tip:</strong> This is an important note.
</div>
```

---

## 4. Full Example

A complete new article saved as `content/agent-principles/03-mcp-protocol.md`:

```markdown
---
title: "MCP: Standardizing Tool Calls"
excerpt: "How the Model Context Protocol unifies tool-calling across AI Agents."
isPremium: false
order: 3
readingTime: 12
tags: ["mcp", "protocol", "tool-use"]
---

# MCP: Standardizing Tool Calls

## What is MCP?

The Model Context Protocol (MCP) is an open protocol from Anthropic for standardizing...

## Core Architecture

| Component | Role |
|-----------|------|
| MCP Server | Exposes tools and resources |
| MCP Client | Agent-side connector |
| Transport | Communication layer (stdio / SSE) |

## Code Example

\`\`\`python
from mcp import MCPServer

server = MCPServer()

@server.tool("search_web")
def search(query: str) -> str:
    return web_search(query)
\`\`\`
```

---

## 5. Publishing

After editing content, push via Git to deploy (CI/CD triggers automatically):

```bash
# 1. Stage new files
git add content/

# 2. Commit
git commit -m "content: add MCP protocol article"

# 3. Push to GitHub (CI/CD auto-deploys)
git push
```

> **Note:** The project uses Next.js with server-side rendering. Changes take effect as soon as the server restarts.

---

## 6. FAQ

**Q: Article not showing in the list?**
A: Check that `_category.json` exists in the section directory; check that the filename ends in `.md` and doesn't start with `_`.

**Q: Code block syntax highlighting not working?**
A: Make sure you specify the language after the opening backticks (e.g. ` ```python `). Don't leave it blank.

**Q: Want to update an existing article?**
A: Edit the corresponding `.md` file directly and push. No other code changes needed.

**Q: How do I control article order?**
A: Set the `order` field in Frontmatter (integer). Lower numbers appear first. You can also adjust the numeric prefix in the filename — the system sorts by `order` field first.
