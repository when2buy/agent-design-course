---
title: "Deploying AI Agents to Production"
excerpt: "Observability, resilience, cost control, and scaling — everything you need to take an agent from prototype to reliable production service."
isPremium: true
order: 10
readingTime: 20
tags: ["production", "deployment", "monitoring", "docker"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Deploying AI Agents to Production

## The Production Challenges

1. **Reliability**: Handling LLM API failures, timeouts, and rate limits
2. **Observability**: Logging every step for debugging and auditing
3. **Cost control**: LLM call costs can spiral without guardrails
4. **Scalability**: Supporting concurrent requests
5. **Security**: Preventing prompt injection and other attacks

## 1. Reliability: Retries and Circuit Breakers

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
            await asyncio.sleep(60)  # back off during rate limiting
            raise
```

## 2. Observability: Trace Every Step

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
                span.add_event("step", {
                    "thought": step.thought,
                    "action": step.action,
                    "observation": step.observation[:200],
                })
                steps.append(step)

            span.set_attribute("total_steps", len(steps))
            return steps[-1].result
```

## 3. Cost Control

```python
class CostAwareAgent:
    def __init__(self, budget_usd: float = 0.10):
        self.budget = budget_usd
        self.spent = 0.0

    def _estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        # GPT-4o pricing (approximate)
        return (prompt_tokens * 0.000005) + (completion_tokens * 0.000015)

    async def complete(self, messages: list) -> str:
        cost = self._estimate_cost(
            count_tokens(messages),
            estimated_completion_tokens=500
        )

        if self.spent + cost > self.budget:
            raise BudgetExceededError(
                f"Would exceed budget: ${self.spent:.4f} spent, ${self.budget:.2f} limit"
            )

        response = await self.llm.complete(messages)
        self.spent += self._estimate_cost(
            response.usage.prompt_tokens,
            response.usage.completion_tokens
        )
        return response.content
```

## 4. Security: Prompt Injection Defense

```python
def sanitize_user_input(user_input: str) -> str:
    """Remove common prompt injection patterns."""
    injection_patterns = [
        r"ignore (all |previous |above )?instructions",
        r"you are now",
        r"new (system )?prompt",
        r"forget (everything|all)",
    ]

    for pattern in injection_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            raise SecurityError(f"Potential prompt injection detected: {user_input[:100]}")

    return user_input

class SecureAgent:
    def run(self, user_input: str) -> str:
        clean_input = sanitize_user_input(user_input)

        # Separate system and user contexts — never interpolate user input into system prompt
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": clean_input}
        ]
        return self.llm.complete(messages)
```

## 5. Deployment Architecture

```yaml
# docker-compose.yml
services:
  agent-api:
    image: agent-service:latest
    replicas: 3
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://cache:6379
    depends_on: [cache, db]

  cache:
    image: redis:7-alpine  # for tool result caching

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  otel-collector:
    image: otel/opentelemetry-collector
    # collect traces, metrics, logs
```
