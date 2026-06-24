---
name: Bug report
about: Something broke or behaved unexpectedly
title: "[bug] "
labels: bug
---

## What happened

<!-- A clear description of the bug. -->

## What you expected

## Steps to reproduce

1.
2.
3.

## Did it involve a skill being promoted or rejected?

- [ ] No
- [ ] Yes — it **promoted** a skill it shouldn't have (false promote)
- [ ] Yes — it **rejected** a skill it should have kept (false reject)

If yes, paste the relevant **ProofRun id** and verdict (`ratchet ledger --json`), and the manifest if available. Redact anything private.

## Environment

<!-- Paste `ratchet doctor` output (it redacts secrets). -->

```
ratchet version:
host agent:
model provider(s):
OS / Node:
```

## Anything else
