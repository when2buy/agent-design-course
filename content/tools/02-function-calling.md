---
title: "Function Calling 深度解析"
excerpt: "OpenAI、Anthropic、Gemini 的 Function Calling 实现对比与最佳实践。"
isPremium: true
order: 2
readingTime: 15
tags: ["tools", "function-calling", "openai", "claude"]
---

# Function Calling 深度解析

## 什么是 Function Calling？

Function Calling 是 LLM 提供商提供的**结构化工具调用**能力。LLM 不是通过文本描述"我要调用某工具"，而是直接输出结构化的 JSON，精确指定要调用的函数和参数。

## OpenAI Function Calling

```python
import openai, json

client = openai.OpenAI()

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

# 处理工具调用
message = response.choices[0].message
if message.tool_calls:
    for tool_call in message.tool_calls:
        func_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        result = execute_tool(func_name, args)
```

## Anthropic Claude Tool Use

```python
import anthropic

client = anthropic.Anthropic()

tools = [{
    "name": "get_weather",
    "description": "获取指定城市的当前天气",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "城市名称"},
        },
        "required": ["city"]
    }
}]

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "北京今天天气如何？"}]
)

for block in response.content:
    if block.type == "tool_use":
        result = execute_tool(block.name, block.input)
```

## 并行工具调用

现代 LLM 支持同时调用多个工具，大幅提升效率：

```python
import asyncio

# 用户问：北京、上海、广州今天天气分别怎么样？
# LLM 可以同时调用 3 个 get_weather

results = await asyncio.gather(*[
    async_execute_tool("get_weather", {"city": city})
    for city in ["北京", "上海", "广州"]
])
```

## 各提供商对比

| 特性 | OpenAI | Claude | Gemini |
|------|--------|--------|--------|
| 并行调用 | ✅ | ✅ | ✅ |
| 强制调用 | `tool_choice="required"` | `tool_choice={"type":"any"}` | ✅ |
| 流式调用 | ✅ | ✅ | ✅ |
| 嵌套对象 | ✅ | ✅ | ✅ |

## 生产技巧

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_search(query: str) -> str:
    """缓存搜索结果，避免重复 API 调用"""
    return search_web(query)

async def execute_with_timeout(tool_func, args, timeout=10.0):
    """带超时的工具执行"""
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(tool_func, **args),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        return f"工具执行超时（{timeout}秒）"
```
