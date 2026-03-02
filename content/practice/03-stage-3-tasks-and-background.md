---
title: "第三阶段：任务编排与后台处理 (s07 - s08)"
excerpt: "赋予智能体处理复杂依赖任务以及异步后台执行的能力。"
isPremium: false
order: 3
readingTime: 6
tags: ["claude-code", "agent", "stage3", "tasks"]
---

### 第三阶段：走向工程化执行

当智能体需要处理类似“构建完整项目”这类耗时且存在依赖关系的大型工程时，原有的线性执行模式就显得捉襟见肘了。

#### s07：任务化 (Tasks)

> **箴言：** _"Break big goals into small tasks, order them, persist to disk"（将大目标拆解为小任务，对它们进行排序，并持久化到磁盘）_ [6]。

通过构建一个基于文件、带有依赖关系的任务图（file-based task graph with dependencies），智能体能够有效地管理复杂流程 [6]。这也为下一阶段的多智能体协作奠定了底层基础 [6]。

#### s08：后台任务 (Background Tasks)

> **箴言：** _"Run slow operations in the background; the agent keeps thinking"（在后台运行耗时的操作；智能体继续思考）_ [7]。

遇到如编译、下载等耗时操作时，智能体不应该被阻塞。通过引入守护线程（daemon threads）来运行后台命令，并在命令完成后动态注入通知（inject notifications on completion），智能体可以在等待期间继续执行其他思考或任务 [7]。---
title: "第三阶段：任务编排与后台处理 (s07 - s08)"
excerpt: "赋予智能体处理复杂依赖任务以及异步后台执行的能力。"
isPremium: false
order: 3
readingTime: 6
tags: ["claude-code", "agent", "stage3", "tasks"]

---

### 第三阶段：走向工程化执行

当智能体需要处理类似“构建完整项目”这类耗时且存在依赖关系的大型工程时，原有的线性执行模式就显得捉襟见肘了。

#### s07：任务化 (Tasks)

> **箴言：** _"Break big goals into small tasks, order them, persist to disk"（将大目标拆解为小任务，对它们进行排序，并持久化到磁盘）_ [6]。

通过构建一个基于文件、带有依赖关系的任务图（file-based task graph with dependencies），智能体能够有效地管理复杂流程 [6]。这也为下一阶段的多智能体协作奠定了底层基础 [6]。

#### s08：后台任务 (Background Tasks)

> **箴言：** _"Run slow operations in the background; the agent keeps thinking"（在后台运行耗时的操作；智能体继续思考）_ [7]。

遇到如编译、下载等耗时操作时，智能体不应该被阻塞。通过引入守护线程（daemon threads）来运行后台命令，并在命令完成后动态注入通知（inject notifications on completion），智能体可以在等待期间继续执行其他思考或任务 [7]。
