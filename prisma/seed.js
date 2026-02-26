const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const FREE_ARTICLE_CONTENT = `# 什么是 AI Agent？

## 核心定义

AI Agent 是一种能够**感知环境、做出决策、执行动作**的智能系统。与传统的 LLM 不同，Agent 不只是"回答问题"，而是能够主动地去**完成目标**。

## Agent vs 普通 LLM 的区别

| 特性 | 普通 LLM | AI Agent |
|------|----------|----------|
| 交互方式 | 单轮问答 | 多轮自主循环 |
| 工具使用 | 无 | 可调用外部工具 |
| 记忆 | 无持久记忆 | 有短期/长期记忆 |
| 主动性 | 被动响应 | 主动规划执行 |

## Agent 的核心组件

### 1. 大脑（LLM）
Agent 的推理核心，负责理解任务、规划步骤、决策下一步行动。

### 2. 工具（Tools）
Agent 可以调用的外部能力：搜索引擎、代码执行、API 调用、数据库查询等。

### 3. 记忆（Memory）
- **短期记忆**：当前对话上下文（Context Window）
- **长期记忆**：向量数据库存储的历史信息

### 4. 规划（Planning）
Agent 如何分解复杂任务、制定执行计划。

## 第一个 Agent 示例

\`\`\`python
from langchain.agents import initialize_agent, Tool

tools = [
    Tool(name="Search", func=search.run, description="搜索互联网信息"),
    Tool(name="Calculator", func=calc.run, description="数学计算")
]

agent = initialize_agent(tools, llm, agent="zero-shot-react-description")
result = agent.run("特斯拉当前股价是多少？买100股需要多少钱？")
\`\`\`

## 下一步

理解了基础定义后，下一节我们将深入了解 **Agent 的循环机制（AgentLoop）**，这是 Agent 工作的核心引擎。`

const AGENT_LOOP_CONTENT = `# Agent Loop：核心运行机制

## The AgentLoop

Agent 的核心是一个不断循环的过程：**Think（思考）→ Act（行动）→ Observe（观察）→ 重复**。

## ReAct 框架示例

\`\`\`
Thought: 我需要搜索特斯拉的当前股价
Action: Search
Action Input: "Tesla stock price today"
Observation: Tesla (TSLA) is trading at $248.50

Thought: 现在我知道股价了，需要计算100股的总价
Action: Calculator  
Action Input: 248.50 * 100
Observation: 24850

Thought: 我已经得到了答案
Final Answer: 特斯拉当前股价为 $248.50，购买100股需要 $24,850。
\`\`\`

## 实现一个简单的 Agent Loop

\`\`\`python
def agent_loop(goal: str, tools: dict, llm, max_steps=10):
    history = []
    
    for step in range(max_steps):
        prompt = build_prompt(goal, history, tools)
        response = llm.complete(prompt)
        
        if "Final Answer:" in response:
            return extract_final_answer(response)
        
        action, action_input = parse_action(response)
        observation = tools[action](action_input) if action in tools else "Tool not found"
        
        history.append({
            "thought": response,
            "action": action,
            "observation": observation
        })
    
    return "Max steps reached"
\`\`\`

## 停止条件

1. **任务完成**：LLM 输出 "Final Answer"
2. **最大步数**：防止无限循环
3. **错误处理**：工具调用失败时的降级策略`

const REACT_CONTENT = `# ReAct 框架：推理与行动的结合

## 论文背景

ReAct（Reasoning + Acting）由 Google 研究员于2022年提出，核心思想是让 LLM 交替进行**推理**和**行动**。

## ReAct 的运作流程

\`\`\`
问题: 贝克汉姆出生时的英国首相是谁？

Thought 1: 我需要找到贝克汉姆的出生年份
Action 1: Search[大卫·贝克汉姆出生日期]
Observation 1: 贝克汉姆生于1975年5月2日

Thought 2: 需要找1975年的英国首相
Action 2: Search[1975年英国首相]
Observation 2: 1975年首相是哈罗德·威尔逊

Final Answer: 贝克汉姆出生于1975年，当时首相是哈罗德·威尔逊
\`\`\`

## 实现 ReAct Agent

\`\`\`python
class ReActAgent:
    def __init__(self, tools: dict, llm):
        self.tools = tools
        self.llm = llm
    
    def run(self, question: str) -> str:
        prompt = self.build_prompt(question)
        
        for _ in range(10):
            response = self.llm.complete(prompt)
            
            if "Final Answer:" in response:
                return response.split("Final Answer:")[-1].strip()
            
            action, action_input = self.parse_action(response)
            observation = self.tools[action](action_input)
            prompt += f"{response}\\nObservation: {observation}\\n"
        
        return "无法在规定步骤内完成"
\`\`\`

## ReAct 的局限性

1. **单线程**：每次只能执行一个动作
2. **无回溯**：执行错误后难以"撤销"
3. **上下文长度**：多步骤后 prompt 过长

这些局限催生了更高级的规划框架，如 **Tree of Thought** 和 **Plan-and-Execute**。`

const TOOL_DESIGN_CONTENT = `# 工具设计最佳实践（Pro 内容）

## 工具是 Agent 的手

一个 Agent 能力的上限，很大程度上由它拥有的工具决定。

## 工具定义的三要素

### 1. 清晰的名称

\`\`\`python
# 好的命名
search_web(query: str)
send_email(to: str, subject: str, body: str)
get_stock_price(ticker: str)

# 差的命名
tool1()
process()
do_thing(input)
\`\`\`

### 2. 精准的描述

\`\`\`python
@tool
def search_web(query: str) -> str:
    """
    在互联网上搜索最新信息。
    
    使用场景：
    - 需要获取实时信息（新闻、股价、天气）
    - 需要验证事实
    
    不要使用：
    - 已知答案的问题（避免不必要的 API 调用）
    """
    return web_search(query)
\`\`\`

### 3. 严格的参数类型

\`\`\`python
from pydantic import BaseModel, Field

class EmailParams(BaseModel):
    to: str = Field(description="收件人邮箱地址")
    subject: str = Field(description="邮件主题")
    body: str = Field(description="邮件正文")

@tool(args_schema=EmailParams)
def send_email(to: str, subject: str, body: str) -> str:
    """发送电子邮件"""
    ...
\`\`\`

## 工具粒度设计

工具应该**原子化**，一个工具只做一件事：

\`\`\`python
# 正确：每个工具职责单一
def send_email(to, subject, body): ...
def read_email(email_id): ...
def list_emails(folder, limit): ...
\`\`\`

## 错误处理

\`\`\`python
def get_stock_price(ticker: str) -> str:
    try:
        price = fetch_price(ticker)
        return f"{ticker} 当前价格: \${price:.2f}"
    except InvalidTickerError:
        return f"错误: '{ticker}' 不是有效的股票代码"
    except NetworkError:
        return "错误: 网络请求失败，请稍后重试"
\`\`\``

const MEMORY_CONTENT = `# Agent 记忆系统设计（Pro 内容）

## 记忆的四种类型

### 1. 工作记忆（Working Memory）

\`\`\`python
class WorkingMemory:
    def __init__(self, max_tokens=8000):
        self.messages = []
        self.max_tokens = max_tokens
    
    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim_if_needed()
\`\`\`

### 2. 语义记忆（Semantic Memory）

\`\`\`python
from langchain.vectorstores import Chroma

class SemanticMemory:
    def __init__(self):
        self.vectorstore = Chroma(embedding_function=OpenAIEmbeddings())
    
    def remember(self, content: str):
        self.vectorstore.add_texts([content])
    
    def recall(self, query: str, k=5):
        docs = self.vectorstore.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
\`\`\`

### 3. 完整记忆系统

\`\`\`python
class AgentMemory:
    def __init__(self, user_id: str):
        self.working = WorkingMemory(max_tokens=8000)
        self.semantic = SemanticMemory()
    
    def build_context(self, query: str) -> str:
        memories = self.semantic.recall(query, k=3)
        return "\\n".join(memories)
    
    def save_session(self, messages: list):
        summary = llm.summarize(messages)
        self.semantic.remember(summary)
\`\`\``

const MULTI_AGENT_CONTENT = `# 多 Agent 系统架构（Pro 内容）

## 为什么需要多 Agent？

单个 Agent 存在天然限制：
- **上下文长度**：复杂任务历史无法放入单个 context
- **专业化**：难以同时精通代码、写作、研究、分析
- **并行效率**：有些子任务可以并行执行

## 使用 CrewAI 构建多 Agent 系统

\`\`\`python
from crewai import Agent, Task, Crew

researcher = Agent(
    role="研究员",
    goal="深度研究指定主题",
    tools=[search_tool],
    llm="gpt-4o"
)

writer = Agent(
    role="写作专家",
    goal="将研究结果整理成高质量报告",
    llm="gpt-4o"
)

research_task = Task(
    description="研究 AI Agent 在金融行业的应用",
    agent=researcher
)

writing_task = Task(
    description="撰写完整行业报告",
    agent=writer,
    context=[research_task]
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task]
)

result = crew.kickoff()
\`\`\``

const PRODUCTION_CONTENT = `# 将 AI Agent 部署到生产环境（Pro 内容）

## 生产环境的挑战

1. **可靠性**：处理 LLM API 失败、超时、限流
2. **可观测性**：记录每一步执行
3. **成本控制**：LLM 调用费用管理
4. **扩展性**：支持并发请求
5. **安全性**：防止 Prompt Injection

## 1. 可靠性：重试和熔断

\`\`\`python
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientLLMClient:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def complete(self, messages, **kwargs):
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            timeout=30,
            **kwargs
        )
        return response.choices[0].message.content
\`\`\`

## 2. Docker 部署

\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
HEALTHCHECK --interval=30s CMD curl -f http://localhost:8000/health
EXPOSE 8000
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

## 3. 安全：防御 Prompt Injection

\`\`\`python
class SecureAgent:
    INJECTION_PATTERNS = [
        r"ignore previous instructions",
        r"forget your system prompt",
        r"jailbreak",
    ]
    
    def sanitize_input(self, user_input: str) -> str:
        import re
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                raise SecurityError("检测到潜在的 Prompt Injection 攻击")
        return f"<user_input>{user_input}</user_input>"
\`\`\``

const ADVANCED_PLANNING_CONTENT = `# 高级规划框架（Pro 内容）

## 1. Plan-and-Execute

先制定完整计划，再逐步执行：

\`\`\`python
class PlanAndExecuteAgent:
    def run(self, goal: str) -> str:
        # Phase 1: 规划
        plan = self.planner.complete(f"将目标分解为步骤: {goal}")
        steps = json.loads(plan)
        
        # Phase 2: 执行
        results = []
        for step in steps:
            result = self.executor.run(step)
            results.append(result)
        
        return self.synthesize(goal, results)
\`\`\`

## 2. Tree of Thoughts (ToT)

用树搜索探索多条推理路径：

\`\`\`python
class TreeOfThoughts:
    def solve(self, problem: str) -> str:
        root = ThoughtNode(content=problem)
        return self.bfs_search(root)
    
    def bfs_search(self, root):
        frontier = [root]
        
        for level in range(self.depth):
            next_frontier = []
            for node in frontier:
                thoughts = self.generate_thoughts(node, self.branching_factor)
                for thought in thoughts:
                    thought.score = self.evaluate(thought)
                    next_frontier.append(thought)
            
            frontier = sorted(next_frontier, key=lambda x: x.score)[-self.branching_factor:]
        
        return max(frontier, key=lambda x: x.score).content
\`\`\`

## 3. 如何选择规划框架？

| 任务类型 | 推荐框架 |
|---------|---------|
| 简单问答 | ReAct |
| 多步骤任务 | Plan-and-Execute |
| 创意/写作 | Tree of Thoughts |
| 复杂推理 | LATS |`

const FUNCTION_CALLING_CONTENT = `# Function Calling 深度解析（Pro 内容）

## OpenAI Function Calling

\`\`\`python
import openai

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取指定城市的当前天气",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名称"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["city"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "北京现在天气怎么样？"}],
    tools=tools,
    tool_choice="auto"
)
\`\`\`

## Anthropic Claude Tool Use

\`\`\`python
import anthropic

tools = [{
    "name": "get_weather",
    "description": "获取城市天气",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string"}
        },
        "required": ["city"]
    }
}]

response = client.messages.create(
    model="claude-opus-4-6",
    tools=tools,
    messages=[{"role": "user", "content": "北京今天天气如何？"}]
)
\`\`\`

## 并行工具调用

\`\`\`python
import asyncio

# LLM 可以同时调用多个工具
results = await asyncio.gather(*[
    get_weather("北京"),
    get_weather("上海"),
    get_weather("广州"),
])
\`\`\``

async function main() {
  // Create demo users
  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@agentcourse.ai' },
    update: {},
    create: {
      email: 'admin@agentcourse.ai',
      name: 'Admin',
      passwordHash: adminHash,
      role: 'admin',
      subscriptionStatus: 'pro',
    },
  })

  const proHash = await bcrypt.hash('demo123', 10)
  await prisma.user.upsert({
    where: { email: 'pro@demo.com' },
    update: {},
    create: {
      email: 'pro@demo.com',
      name: 'Pro User',
      passwordHash: proHash,
      subscriptionStatus: 'pro',
    },
  })

  // Categories
  const categories = [
    { slug: 'fundamentals', name: 'AI Agent 基础', description: '理解 AI Agent 的核心概念和架构', icon: '🧠', order: 1 },
    { slug: 'tools', name: '工具调用', description: '让 Agent 使用外部工具和 API', icon: '🔧', order: 2 },
    { slug: 'memory', name: '记忆与状态', description: 'Agent 的短期和长期记忆管理', icon: '💾', order: 3 },
    { slug: 'planning', name: '规划与推理', description: 'ReAct、CoT、Tree of Thought 等推理框架', icon: '🗺️', order: 4 },
    { slug: 'multi-agent', name: '多 Agent 系统', description: '构建协作的多 Agent 架构', icon: '🤝', order: 5 },
    { slug: 'production', name: '生产部署', description: '将 Agent 部署到生产环境', icon: '🚀', order: 6 },
  ]

  const catMap = {}
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    catMap[cat.slug] = created.id
  }

  // Articles
  const articles = [
    {
      slug: 'what-is-ai-agent',
      title: '什么是 AI Agent？',
      excerpt: '深入理解 AI Agent 的定义、特征和与普通 LLM 的本质区别。',
      isPremium: false,
      order: 1,
      readingTime: 8,
      tags: 'basics,agent,llm',
      categorySlug: 'fundamentals',
      content: FREE_ARTICLE_CONTENT,
    },
    {
      slug: 'agent-loop',
      title: 'Agent Loop：Agent 的核心运行机制',
      excerpt: '理解 Think-Act-Observe 循环，掌握 Agent 自主执行的根本原理。',
      isPremium: false,
      order: 2,
      readingTime: 10,
      tags: 'basics,loop,react',
      categorySlug: 'fundamentals',
      content: AGENT_LOOP_CONTENT,
    },
    {
      slug: 'tool-design',
      title: '工具设计最佳实践',
      excerpt: '如何设计让 Agent 能精准调用的工具——命名、描述、参数规范。',
      isPremium: true,
      order: 1,
      readingTime: 12,
      tags: 'tools,design,function-calling',
      categorySlug: 'tools',
      content: TOOL_DESIGN_CONTENT,
    },
    {
      slug: 'function-calling',
      title: 'Function Calling 深度解析',
      excerpt: 'OpenAI、Anthropic、Gemini 的 Function Calling 实现对比与最佳实践。',
      isPremium: true,
      order: 2,
      readingTime: 15,
      tags: 'tools,function-calling,openai,claude',
      categorySlug: 'tools',
      content: FUNCTION_CALLING_CONTENT,
    },
    {
      slug: 'memory-types',
      title: 'Agent 记忆系统设计',
      excerpt: '构建高效的 Agent 记忆架构：工作记忆、情节记忆、语义记忆的设计与实现。',
      isPremium: true,
      order: 1,
      readingTime: 14,
      tags: 'memory,vector-db,rag',
      categorySlug: 'memory',
      content: MEMORY_CONTENT,
    },
    {
      slug: 'react-framework',
      title: 'ReAct 框架：推理与行动的结合',
      excerpt: '掌握 ReAct 框架的原理，这是当今最广泛使用的 Agent 规划范式。',
      isPremium: false,
      order: 1,
      readingTime: 10,
      tags: 'planning,react,reasoning',
      categorySlug: 'planning',
      content: REACT_CONTENT,
    },
    {
      slug: 'advanced-planning',
      title: '高级规划框架：ToT、Plan-and-Execute、LATS',
      excerpt: '超越 ReAct：Tree of Thought、Plan-and-Execute 等高级规划框架的原理与实现。',
      isPremium: true,
      order: 2,
      readingTime: 18,
      tags: 'planning,tot,advanced',
      categorySlug: 'planning',
      content: ADVANCED_PLANNING_CONTENT,
    },
    {
      slug: 'multi-agent-intro',
      title: '多 Agent 系统架构',
      excerpt: '当单个 Agent 不够强大时，如何设计协作的多 Agent 系统。',
      isPremium: true,
      order: 1,
      readingTime: 16,
      tags: 'multi-agent,orchestration,crewai',
      categorySlug: 'multi-agent',
      content: MULTI_AGENT_CONTENT,
    },
    {
      slug: 'production-deployment',
      title: '将 AI Agent 部署到生产环境',
      excerpt: '监控、扩展、成本控制——将 Agent 从原型变为可靠的生产服务。',
      isPremium: true,
      order: 1,
      readingTime: 20,
      tags: 'production,deployment,monitoring,docker',
      categorySlug: 'production',
      content: PRODUCTION_CONTENT,
    },
  ]

  for (const article of articles) {
    const { categorySlug, ...articleData } = article
    await prisma.article.upsert({
      where: { slug: articleData.slug },
      update: {},
      create: {
        ...articleData,
        categoryId: catMap[categorySlug],
      },
    })
  }

  console.log('✅ Seed completed!')
  console.log('Admin: admin@agentcourse.ai / admin123')
  console.log('Pro user: pro@demo.com / demo123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
