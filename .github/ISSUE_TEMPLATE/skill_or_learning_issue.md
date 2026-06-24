---
name: Skill / learning issue
about: My agent learned something wrong, or failed to learn something it should have
title: "[learning] "
labels: learning
---

> This is the most valuable kind of report for Ratchet — it's literally how the
> proof gate gets better. Thank you.

## What went wrong

- [ ] It **learned something wrong** (promoted a bad skill)
- [ ] It **failed to learn** something it should have (rejected a good skill)
- [ ] A skill **regressed** something that used to work (this should be impossible — please flag loudly)
- [ ] A skill is **stale / no longer true** but still active

## The skill

- Skill name / id:
- ProofRun id (from `ratchet ledger --json`):
- Verdict and confidence:

## Expected vs. actual

**Expected:**

**Actual:**

## Context

- The note/vault region it came from (redact private content):
- Host agent + model provider(s):
- Proposer vs verifier configs (were they actually different?):

## `ratchet doctor` output

```
```
