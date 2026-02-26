---
title: "将 AI Agent 部署到生产环境"
excerpt: "监控、扩展、成本控制——将 Agent 从原型变为可靠的生产服务。"
isPremium: true
order: 1
readingTime: 20
tags: ["production", "deployment", "monitoring", "docker"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# 将 AI Agent 部署到生产环境

## 生产环境的挑战

1. **可靠性**：处理 LLM API 失败、超时、限流
2. **可观测性**：记录每一步的执行，便于调试
3. **成本控制**：LLM 调用费用可能失控
4. **扩展性**：支持并发请求
5. **安全性**：防止 Prompt Injection 等攻击

## 1. 可靠性：重试和熔断

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientLLMClient:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def complete(self, messages: list, **kwargs) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=kwargs.get("model", "gpt-4o-mini"),
                messages=messages,
                timeout=30,
                **kwargs
            )
            return response.choices[0].message.content
        except openai.RateLimitError:
            await asyncio.sleep(60)  # 等待限流恢复
            raise
```

## 2. 可观测性：追踪每一步

```python
from opentelemetry import trace

tracer = trace.get_tracer("agent-service")

class TracedAgent:
    async def run(self, goal: str, request_id: str) -> str:
        with tracer.start_as_current_span("agent.run") as span:
            span.set_attribute("goal", goal)
            span.set_attribute("request_id", request_id)

            steps = []
            async for step in self.agent.stream(goal):
                step_data = {
                    "type": step.type,
                    "tokens_used": step.tokens,
                    "cost_usd": step.cost,
                    "duration_ms": step.duration_ms
                }
                steps.append(step_data)
                span.add_event(f"step.{step.type}", step_data)

            span.set_attribute("total_cost_usd", sum(s["cost_usd"] for s in steps))
```

## 3. 成本控制

```python
class CostAwareAgent:
    def __init__(self, budget_usd: float = 1.0):
        self.budget = budget_usd
        self.spent = 0.0

    def select_model(self, task_complexity: str) -> str:
        """根据任务复杂度选择最经济的模型"""
        models = {
            "simple": "gpt-4o-mini",      # $0.15/1M tokens
            "medium": "gpt-4o",            # $2.50/1M tokens
            "complex": "claude-opus-4-6",  # $15/1M tokens
        }
        return models.get(task_complexity, "gpt-4o-mini")
```

## 4. Docker 部署

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
services:
  agent-api:
    build: .
    ports: ["8000:8000"]
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:alpine
```

## 5. 安全：防御 Prompt Injection

```python
class SecureAgent:
    INJECTION_PATTERNS = [
        r"ignore previous instructions",
        r"forget your system prompt",
        r"act as a different AI",
        r"jailbreak",
    ]

    def sanitize_input(self, user_input: str) -> str:
        import re
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                raise SecurityError("检测到潜在的 Prompt Injection 攻击")
        # 严格封装用户输入
        return f"<user_input>{user_input}</user_input>"
```

## 生产 Checklist

- [ ] LLM 调用重试机制（tenacity）
- [ ] 请求超时控制
- [ ] 成本追踪和预算告警
- [ ] 结构化日志（JSON）
- [ ] 分布式追踪（OpenTelemetry）
- [ ] 健康检查端点
- [ ] Prompt Injection 防御
- [ ] API 密钥轮换机制
