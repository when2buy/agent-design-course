---
title: "多 Agent 系统架构"
excerpt: "当单个 Agent 不够强大时，如何设计协作的多 Agent 系统。"
isPremium: true
order: 1
readingTime: 16
tags: ["multi-agent", "orchestration", "crewai"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# 多 Agent 系统架构

## 为什么需要多 Agent？

单个 Agent 存在天然限制：
- **上下文长度**：复杂任务的历史无法放入单个 context
- **专业化**：一个 Agent 难以同时精通代码、写作、研究、分析
- **并行效率**：有些子任务可以并行执行
- **可靠性**：多个 Agent 相互检验，减少错误

## 三种多 Agent 架构

### 1. 层级架构（Hierarchical）

```
         ┌─────────────┐
         │  Orchestrator│ ← 分解任务、分配工作
         └──────┬──────┘
      ┌─────────┼─────────┐
      ↓         ↓         ↓
 [Research]  [Writing]  [Review]
  Agent       Agent      Agent
```

```python
class OrchestratorAgent:
    def run(self, goal: str) -> str:
        subtasks = self._decompose(goal)

        results = {}
        for task in subtasks:
            agent_name = self._route(task)
            results[task] = self.sub_agents[agent_name].run(task)

        return self._synthesize(goal, results)

    def _route(self, task: str) -> str:
        """路由：决定由哪个 Agent 处理"""
        prompt = f"任务: {task}\n可用 Agent: {list(self.sub_agents.keys())}\n选择最合适的 Agent（仅返回名称）:"
        return self.llm.complete(prompt).strip()
```

### 2. 协作架构（Collaborative）

Agent 之间通过消息总线通信：

```python
class CollaborativeSystem:
    async def run(self, goal: str) -> str:
        self.message_bus.publish("task", {"goal": goal})

        while not self._is_complete():
            message = await self.message_bus.get_next()
            for agent_name, agent in self.agents.items():
                if agent.should_respond(message):
                    response = await agent.process(message)
                    self.message_bus.publish(agent_name, response)

        return self._compile_result()
```

### 3. 流水线架构（Pipeline）

```
Input → [Research] → [Analyze] → [Write] → Output
```

最简单，适合有明确顺序的任务。

## 使用 CrewAI 构建多 Agent 系统

```python
from crewai import Agent, Task, Crew, Process

researcher = Agent(
    role="研究员",
    goal="深度研究指定主题，收集全面信息",
    backstory="经验丰富的研究员，擅长从多源获取准确信息",
    tools=[search_tool, web_scraper],
    llm="gpt-4o"
)

writer = Agent(
    role="写作专家",
    goal="将分析结果整理成高质量报告",
    backstory="技术写作专家，能将复杂信息转化为清晰文档",
    llm="gpt-4o"
)

research_task = Task(
    description="研究 AI Agent 在金融行业的应用现状",
    agent=researcher,
    expected_output="详细研究报告，包含至少10个具体案例"
)

writing_task = Task(
    description="撰写完整行业报告",
    agent=writer,
    expected_output="3000字专业报告",
    context=[research_task]  # 依赖研究任务的结果
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff(inputs={"topic": "AI Agent in Finance"})
```

## 多 Agent 通信协议

```python
from pydantic import BaseModel
from typing import Literal

class AgentMessage(BaseModel):
    sender: str
    receiver: str            # "*" 表示广播
    message_type: Literal["request", "response", "broadcast", "error"]
    content: str
    metadata: dict = {}
    correlation_id: str      # 用于追踪请求-响应对
```
