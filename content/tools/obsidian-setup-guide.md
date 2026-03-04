# Obsidian 环境配置指南（AI Agent 版）

> 本指南面向 AI Agent 或开发者，帮助在 Linux/macOS 服务器上配置 Obsidian vault，并与 OpenClaw 个人助理系统集成。

---

## 1. 什么是 Obsidian？

[Obsidian](https://obsidian.md) 是一个基于本地 Markdown 文件的知识管理工具。对 AI Agent 而言，它是一个**结构化的长期记忆系统**：

- 所有内容都是纯文本 `.md` 文件，AI 可以直接读写
- 支持双向链接 `[[文档名]]`，形成知识图谱
- 可以通过 Git 进行版本管理和多机同步
- 结合 OpenClaw `obsidian` skill，AI 可以直接操作笔记

---

## 2. 安装

### macOS

```bash
brew install --cask obsidian
```

### Linux（AppImage）

```bash
wget https://github.com/obsidianmd/obsidian-releases/releases/latest/download/Obsidian-1.7.7.AppImage -O /usr/local/bin/obsidian.AppImage
chmod +x /usr/local/bin/obsidian.AppImage
```

### 服务器/Headless 模式

在服务器上，Obsidian vault 就是一个**普通文件夹**。AI 直接读写 `.md` 文件即可，不需要运行 GUI。

```bash
mkdir -p ~/obsidian-vault
cd ~/obsidian-vault
mkdir -p .obsidian
```

---

## 3. Vault 目录结构

推荐使用以下标准结构：

```
obsidian-vault/
├── .obsidian/               # Obsidian 配置（插件、主题）
├── 00-inbox/                # 临时收集，待整理
├── 01-projects/             # 项目笔记（每个项目一个子文件夹）
│   ├── alpha-vault/
│   ├── when2buy/
│   └── aitist/
├── 02-areas/                # 长期关注领域（财务、健康、学习）
├── 03-resources/            # 参考资料
├── 04-archive/              # 归档（已完成项目）
├── daily/                   # 每日日记（YYYY-MM-DD.md）
└── templates/               # 笔记模板
```

**快速初始化脚本**：

```bash
#!/bin/bash
VAULT_PATH="${1:-$HOME/obsidian-vault}"
mkdir -p "$VAULT_PATH"/{.obsidian,00-inbox,01-projects,02-areas,03-resources,04-archive,daily,templates}
echo "✅ Vault created at: $VAULT_PATH"
```

---

## 4. 配置 obsidian-cli（AI 调用接口）

```bash
# 安装
npm install -g obsidian-cli

# 配置 vault 路径
mkdir -p ~/.config/obsidian-cli
cat > ~/.config/obsidian-cli/config.json << EOF
{
  "vaultPath": "$HOME/obsidian-vault",
  "defaultVault": "main"
}
EOF

# 测试
obsidian-cli create "00-inbox/test" --content "# Test\nHello!"
obsidian-cli read "00-inbox/test"
obsidian-cli search "keyword"
obsidian-cli list
```

---

## 5. 与 OpenClaw 集成

### 在 TOOLS.md 中记录 Vault 路径

```markdown
## 📓 Obsidian Vault
- **Vault 路径**: `~/obsidian-vault`
- **日记路径**: `~/obsidian-vault/daily/`
- **项目路径**: `~/obsidian-vault/01-projects/`
```

### OpenClaw obsidian skill 调用方式

```bash
obsidian-cli read "<路径>"         # 读取笔记
obsidian-cli create "<路径>" --content "<内容>"  # 创建笔记
obsidian-cli search "<关键词>"     # 搜索
obsidian-cli append "<路径>" --content "<内容>"  # 追加内容
```

### 典型使用场景

1. **每日日记**：AI 自动创建 `daily/YYYY-MM-DD.md`，记录重要事件
2. **项目追踪**：AI 更新 `01-projects/<项目>/status.md`
3. **会议记录**：对话结束后自动生成会议摘要并存入 vault
4. **知识提取**：从网页/文章中提取关键信息存入 `03-resources/`

---

## 6. Git 同步（多机同步）

```bash
cd ~/obsidian-vault
git init

cat > .gitignore << 'EOF'
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.DS_Store
EOF

git add .
git commit -m "Initial vault setup"
gh repo create my-obsidian-vault --private --source=. --push
```

**自动同步脚本**（加入 crontab）：

```bash
cat > ~/obsidian-vault/sync.sh << 'EOF'
#!/bin/bash
cd ~/obsidian-vault
git add -A
git commit -m "Auto sync: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || true
git push origin main 2>/dev/null
EOF
chmod +x ~/obsidian-vault/sync.sh

# 每小时自动同步
(crontab -l 2>/dev/null; echo "0 * * * * $HOME/obsidian-vault/sync.sh") | crontab -
```

---

## 7. AI Agent 写作规范

```markdown
# 笔记标题

## 状态
- **创建时间**: 2026-01-01
- **最后更新**: 2026-01-15
- **负责人**: AI Agent / Steve

## 内容
...

## 相关链接
- [[相关笔记1]]
- [[相关笔记2]]

## TODO
- [ ] 待完成任务
- [x] 已完成任务
```

### 操作原则

1. **读前写**：修改前先读取现有内容，避免覆盖
2. **增量更新**：用 `append` 追加而非全量替换
3. **打标签**：在笔记头部加 `tags: [project, ai-generated]`
4. **链接关联**：用 `[[笔记名]]` 建立知识图谱

---

## 8. 推荐插件

| 插件 | 用途 |
|------|------|
| **Dataview** | SQL 语法查询笔记，生成动态列表 |
| **Templater** | 高级模板引擎，自动填充日期/变量 |
| **Calendar** | 日历视图，配合每日日记 |
| **Tasks** | 跨笔记任务追踪 |
| **Git** | 内置 Git 同步（桌面端） |

---

## 9. 快速开始 Checklist

```
[ ] 创建 vault 目录结构（初始化脚本）
[ ] 安装 obsidian-cli 并配置 vault 路径
[ ] 测试基础操作（create/read/search）
[ ] 初始化 Git 仓库并推送 GitHub
[ ] 配置自动同步（cron 每小时）
[ ] 在 TOOLS.md 中记录 vault 路径
[ ] 创建第一篇日记测试完整流程
```

---

*文档维护: AI Agent | 最后更新: 2026-03-04*
