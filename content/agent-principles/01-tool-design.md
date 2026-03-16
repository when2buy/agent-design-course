---
title: "Tool Design Best Practices"
excerpt: "How to design tools that agents can call reliably — naming, descriptions, parameter schemas, error handling, and safety."
isPremium: false
order: 1
readingTime: 12
tags: ["tools", "design", "function-calling"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# Tool Design Best Practices

## Tools Are an Agent's Hands

An agent's ceiling is largely determined by the quality of its tools. Poorly designed tools cause constant errors. Well-designed tools let the agent operate like a professional.

## The Three Elements of a Good Tool Definition

### 1. A clear name

Tool names should be **verb + noun** combinations with unambiguous semantics:

✅ Good naming:
```python
search_web(query: str)
send_email(to: str, subject: str, body: str)
get_stock_price(ticker: str)
execute_python_code(code: str)
```

❌ Bad naming:
```python
tool1()
process()
do_thing(input)
```

### 2. A precise description

The description is what the LLM uses to decide *which* tool to call. It must explain **what the tool does**, **when to use it**, and **when NOT to use it**:

```python
@tool
def search_web(query: str) -> str:
    """
    Search the internet for up-to-date information.

    Use when:
    - You need real-time information (news, stock prices, weather)
    - You need to verify a fact
    - The user's question involves recent events

    Do NOT use when:
    - The answer is already known (avoid unnecessary API calls)
    - Mathematical computation is needed (use the calculator tool instead)

    Args:
        query: Search keywords. English queries tend to yield better results.

    Returns:
        A summary of relevant web content.
    """
    return web_search(query)
```

### 3. Strict parameter types

```python
from pydantic import BaseModel, Field
from typing import Literal

class EmailParams(BaseModel):
    to: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject line, max 100 characters")
    body: str = Field(description="Email body, Markdown supported")
    priority: Literal["low", "normal", "high"] = Field(
        default="normal",
        description="Message priority"
    )

@tool(args_schema=EmailParams)
def send_email(to: str, subject: str, body: str, priority: str = "normal") -> str:
    """Send an email."""
    # implementation...
```

## Tool Granularity

Tools should be **atomic** — one tool, one responsibility:

```python
# ❌ Wrong: one tool doing too much
def handle_email(action, to=None, subject=None, ...):
    if action == "send": ...
    elif action == "read": ...
    elif action == "delete": ...

# ✅ Correct: each tool has a single job
def send_email(to, subject, body): ...
def read_email(email_id): ...
def list_emails(folder, limit): ...
def delete_email(email_id): ...
```

## Error Handling

Tools must return meaningful error messages so the agent can self-correct:

```python
def get_stock_price(ticker: str) -> str:
    try:
        price = fetch_price(ticker)
        return f"{ticker} current price: ${price:.2f}"
    except InvalidTickerError:
        return f"Error: '{ticker}' is not a valid ticker symbol. Try formats like AAPL, TSLA, GOOGL."
    except NetworkError:
        return "Error: Network request failed. Please retry."
    except Exception as e:
        return f"Failed to fetch stock price: {str(e)}"
```

## Security Considerations

In production, tools need safety boundaries:

```python
def execute_python_code(code: str) -> str:
    """Execute Python code in a sandboxed environment."""
    # 1. Static analysis
    if contains_dangerous_imports(code):
        return "Error: Code contains disallowed imports (os, sys, subprocess, etc.)"

    # 2. Resource limits
    with timeout(seconds=10), memory_limit(mb=100):
        result = sandbox.execute(code)

    return result
```

## Real-World Example: Research Assistant Toolset

```python
tools = [
    search_web,           # Web search
    fetch_webpage,        # Fetch page content
    extract_pdf_text,     # Parse PDFs
    summarize_text,       # Summarize long text
    save_to_memory,       # Persist to memory store
    create_report,        # Generate structured report
]
```

Next: **Function Calling Deep Dive** — comparing the tool-calling APIs across OpenAI, Claude, and Gemini.
