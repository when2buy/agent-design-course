---
title: "工具设计最佳实践"
excerpt: "如何设计让 Agent 能精准调用的工具——命名、描述、参数规范。"
isPremium: true
order: 1
readingTime: 12
tags: ["tools", "design", "function-calling"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# 工具设计最佳实践

## 工具是 Agent 的手

一个 Agent 能力的上限，很大程度上由它拥有的工具决定。设计糟糕的工具会导致 Agent 频繁出错；设计优秀的工具让 Agent 如虎添翼。

## 工具定义的三要素

### 1. 清晰的名称

工具名称应该是**动词+名词**的组合，语义明确：

✅ 好的命名：
```python
search_web(query: str)
send_email(to: str, subject: str, body: str)
get_stock_price(ticker: str)
execute_python_code(code: str)
```

❌ 差的命名：
```python
tool1()
process()
do_thing(input)
```

### 2. 精准的描述

描述是 LLM 选择工具的依据，必须包含工具**做什么**、**何时**使用、**不应该**在什么情况下使用：

```python
@tool
def search_web(query: str) -> str:
    """
    在互联网上搜索最新信息。

    使用场景：
    - 需要获取实时信息（新闻、股价、天气）
    - 需要验证事实
    - 用户问题涉及近期事件

    不要使用：
    - 已知答案的问题（避免不必要的 API 调用）
    - 需要专业计算的场景（使用 calculator 工具）

    Args:
        query: 搜索关键词，使用英文效果更好

    Returns:
        搜索结果摘要，包含相关网页内容
    """
    return web_search(query)
```

### 3. 严格的参数类型

```python
from pydantic import BaseModel, Field
from typing import Literal

class EmailParams(BaseModel):
    to: str = Field(description="收件人邮箱地址")
    subject: str = Field(description="邮件主题，不超过100字符")
    body: str = Field(description="邮件正文，支持 Markdown 格式")
    priority: Literal["low", "normal", "high"] = Field(
        default="normal",
        description="邮件优先级"
    )

@tool(args_schema=EmailParams)
def send_email(to: str, subject: str, body: str, priority: str = "normal") -> str:
    """发送电子邮件"""
    # 实现...
```

## 工具粒度设计

工具应该**原子化**，一个工具只做一件事：

```python
# ❌ 错误：一个工具做太多事
def handle_email(action, to=None, subject=None, ...):
    if action == "send": ...
    elif action == "read": ...
    elif action == "delete": ...

# ✅ 正确：每个工具职责单一
def send_email(to, subject, body): ...
def read_email(email_id): ...
def list_emails(folder, limit): ...
def delete_email(email_id): ...
```

## 错误处理

工具必须返回有意义的错误信息，让 Agent 能够自我纠正：

```python
def get_stock_price(ticker: str) -> str:
    try:
        price = fetch_price(ticker)
        return f"{ticker} 当前价格: ${price:.2f}"
    except InvalidTickerError:
        return f"错误: '{ticker}' 不是有效的股票代码。请确认格式，例如 AAPL、TSLA、GOOGL"
    except NetworkError:
        return "错误: 网络请求失败，请稍后重试"
    except Exception as e:
        return f"获取股价失败: {str(e)}"
```

## 工具的安全设计

生产环境中，工具需要考虑安全性：

```python
def execute_python_code(code: str) -> str:
    """在沙箱环境中执行 Python 代码"""
    # 1. 代码扫描
    if contains_dangerous_imports(code):
        return "错误: 代码包含不允许的导入（os, sys, subprocess 等）"

    # 2. 资源限制
    with timeout(seconds=10), memory_limit(mb=100):
        result = sandbox.execute(code)

    return result
```

## 实战：构建研究助手工具集

```python
tools = [
    search_web,           # 网络搜索
    fetch_webpage,        # 获取网页内容
    extract_pdf_text,     # 解析 PDF
    summarize_text,       # 文本总结
    save_to_memory,       # 保存到记忆
    create_report,        # 生成报告
]
```

下一节：**Function Calling 深度解析** —— 各大 LLM 提供商的工具调用 API 对比。
