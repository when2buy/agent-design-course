---
title: "[System Design] Design an Automated Code Review Agent"
excerpt: "A high-frequency question from GitHub and Anthropic. The agent must understand PR diffs, invoke static analysis tools, generate structured comments, and identify security vulnerabilities. Full architecture and tool chain design included."
isPremium: true
order: 2
readingTime: 22
tags: ["interview", "system-design", "code-review", "devtools"]
company: "GitHub / Anthropic (variant)"
difficulty: "Medium"
series: "System Design"
---

# [System Design] Design an Automated Code Review Agent

> 🔒 **PRO Content** — Upgrade to Pro to unlock the full design walkthrough and scoring rubric.

## The Question

> "Design an AI Code Review Agent integrated into the GitHub PR workflow:
> - Automatically analyzes PR diffs and generates inline review comments
> - Can call linters and SAST tools, incorporating their output as context
> - Identifies common security vulnerabilities (SQL injection, XSS, secret leakage)
> - Review comments must include explanations — not just 'there's a problem here'
> - Supports 10 concurrent PRs with end-to-end latency under 60 seconds
>
> Describe your architecture with emphasis on tool design and prompting strategy."

---

## What Interviewers Are Testing

1. **Tool design**: How do you chunk diffs into pieces the agent can process?
2. **Context management**: Large PRs may overflow the context window — how do you handle that?
3. **Multi-tool coordination**: How do you combine linter output, SAST results, and source code?
4. **Output format control**: How do you guarantee the output is valid GitHub review comment JSON?
5. **Security understanding**: Can the agent truly *understand* vulnerabilities, or is it pattern-matching?

> Full solution, architecture diagram, and prompt design in PRO content 👆
