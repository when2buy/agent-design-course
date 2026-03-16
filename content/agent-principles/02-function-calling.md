---
title: "Function Calling Deep Dive"
excerpt: "A side-by-side comparison of Function Calling implementations across OpenAI, Anthropic, and Gemini — with production best practices."
isPremium: false
order: 2
readingTime: 15
tags: ["tools", "function-calling", "openai", "claude"]
---

# Function Calling Deep Dive

## What Is Function Calling?

Function Calling is a **structured tool invocation** capability provided by LLM APIs. Instead of the model describing "I want to call a tool" in plain text, it outputs structured JSON that precisely specifies which function to call and with what arguments.

## OpenAI Function Calling

```python
import openai, json

client = openai.OpenAI()

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather for a given city",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["city"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in London right now?"}],
    tools=tools,
    tool_choice="auto"
)

# Handle tool calls
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
    "description": "Get the current weather for a given city",
    "input_schema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "City name"},
        },
        "required": ["city"]
    }
}]

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in London today?"}]
)

for block in response.content:
    if block.type == "tool_use":
        result = execute_tool(block.name, block.input)
```

## Parallel Tool Calls

Modern LLMs can call multiple tools simultaneously, dramatically improving throughput:

```python
import asyncio

# User asks: "What's the weather in London, Paris, and Tokyo?"
# The LLM can fire all 3 get_weather calls at once

results = await asyncio.gather(*[
    async_execute_tool("get_weather", {"city": city})
    for city in ["London", "Paris", "Tokyo"]
])
```

## Provider Comparison

| Feature | OpenAI | Claude | Gemini |
|---------|--------|--------|--------|
| Parallel calls | ✅ | ✅ | ✅ |
| Force tool use | `tool_choice="required"` | `tool_choice={"type":"any"}` | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Nested objects | ✅ | ✅ | ✅ |

## Production Techniques

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_search(query: str) -> str:
    """Cache search results to avoid redundant API calls."""
    return search_web(query)

async def execute_with_timeout(tool_func, args, timeout=10.0):
    """Execute a tool with a hard timeout."""
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(tool_func, **args),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        return f"Tool timed out after {timeout}s."
```
