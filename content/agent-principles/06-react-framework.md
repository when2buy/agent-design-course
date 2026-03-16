---
title: "The ReAct Framework: Reasoning Meets Action"
excerpt: "Master the ReAct framework — the most widely deployed agent planning paradigm in production today."
isPremium: false
order: 6
readingTime: 10
tags: ["planning", "react", "reasoning"]
video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
---

# The ReAct Framework: Reasoning Meets Action

## Background

ReAct (Reasoning + Acting) was introduced by Google researchers in 2022. The core idea: let the LLM alternate between **reasoning** and **acting**, using the **observations** from each action to guide the next step of reasoning.

## ReAct in Action

```
Question: What year was David Beckham born? Who was the UK Prime Minister that year?

Thought 1: I need to find Beckham's birth year.
Action 1: Search[David Beckham date of birth]
Observation 1: David Beckham was born on 2 May 1975.

Thought 2: He was born in 1975. Now I need to find the UK Prime Minister in 1975.
Action 2: Search[UK Prime Minister 1975]
Observation 2: The UK Prime Minister in 1975 was Harold Wilson.

Thought 3: I have all the information.
Final Answer: Beckham was born in 1975. The UK Prime Minister that year was Harold Wilson.
```

## Why ReAct Works

**Compare: Reasoning only (Chain of Thought)**
```
Question: What is Apple's stock price today?
CoT: Apple's ticker is AAPL. I estimate it's around $170–180. ❌ Guess — inaccurate
```

**ReAct: Reasoning guides action**
```
Thought: I need the live AAPL price. I'll use the stock price tool.
Action: GetStockPrice[AAPL]
Observation: AAPL current price: $189.30

Final Answer: Apple (AAPL) is currently trading at $189.30 ✅ Accurate
```

## Implementing a ReAct Agent

```python
REACT_PROMPT = """You are an AI assistant that completes tasks through a Reasoning-Action loop.

Available tools: {tools}

Format:
Thought: [your reasoning]
Action: [tool name]
Action Input: [tool input]
Observation: [tool result]
... (repeat as needed)
Final Answer: [your final answer]

Question: {question}
"""

class ReActAgent:
    def __init__(self, tools: dict, llm):
        self.tools = tools
        self.llm = llm

    def run(self, question: str) -> str:
        prompt = REACT_PROMPT.format(
            tools=self._format_tools(),
            question=question
        )

        for _ in range(10):  # max 10 steps
            response = self.llm.complete(prompt)

            if "Final Answer:" in response:
                return response.split("Final Answer:")[-1].strip()

            action, action_input = self._parse_action(response)
            observation = self.tools[action](action_input)
            prompt += f"{response}\nObservation: {observation}\n"

        return "Could not complete the task within the step limit."
```

## Limitations of ReAct

1. **Single-threaded**: Only one action per step
2. **No backtracking**: Hard to "undo" a wrong action
3. **Context length**: Prompt grows with each step

These limitations gave rise to more advanced planning frameworks like **Tree of Thought** and **Plan-and-Execute**.
