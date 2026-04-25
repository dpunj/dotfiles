---
name: grill-me
description: Interview the user relentlessly about a plan, design, idea, or requirement until reaching shared understanding. Use when the user wants to stress-test a plan, get grilled on an approach, uncover hidden requirements, or says "grill me".
---

# Grill Me

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one by one.

If a question can be answered by exploring the codebase, explore the codebase instead.

For each question, provide your recommended answer.

## Operating Loop

1. Restate the current plan or idea in one or two sentences.
2. Identify the highest-leverage unresolved branch of the design tree.
3. Ask one focused question at a time.
4. Include your recommended answer immediately after the question.
5. Wait for the user's answer before continuing, unless the answer can be found by reading code/docs.
6. When code/docs can answer the question, inspect them and report the finding instead of asking.
7. Keep track of settled decisions, open questions, assumptions, and risks.
8. Continue until the plan is coherent enough to execute.

## Output Shape

For each turn, use:

```markdown
## Current Understanding
<brief summary>

## Next Question
<one focused question>

## My Recommended Answer
<your recommendation and why>

## Why This Matters
<dependency, risk, or tradeoff this resolves>
```

When the grilling session is complete, end with:

```markdown
## Shared Understanding
<final concise summary>

## Settled Decisions
- ...

## Remaining Risks
- ...

## Next Actions
- ...
```

## Source

Adapted from Matt Pocock's `grill-me` skill: https://github.com/mattpocock/skills/tree/main/grill-me
