# Ratchet — Testing Non-Determinism

**Status:** Draft v0.1 · Read `test-strategy.md`, `fixtures.md`, and `meta-evals.md` first.

> Ratchet sits on top of LLMs, whose outputs vary run-to-run. A prover built on noisy components must
> be tested without inheriting that noise where it doesn't belong — and must measure it honestly where
> it does. The rule: **`pnpm test` is fully deterministic; `pnpm eval` tolerates noise but bounds it
> statistically.** No test, anywhere, is allowed to be "flaky and we just rerun it."

---

## 1. The strategy in one table

| Source of variation | Strategy | Where |
|---|---|---|
| Model/agent output | **Deterministic fake provider** (scripted) | `pnpm test` — always |
| Model output we *must* test for real | **Record/replay cassettes**; live only on cadence | `pnpm eval` |
| Clock / timestamps | **Injected clock**, frozen in tests | everywhere |
| ULID / id generation | **Injected id factory**, seeded sequence | everywhere |
| RNG (sampling, bootstrap, shuffles) | **Seeded RNG**, seed recorded in manifest | everywhere |
| Provider seed (where supported) | set + recorded in manifest; treated as a hint, not a guarantee | `pnpm eval` |
| Genuine LLM-score noise | **Statistical assertions** (rates, CIs), not exact equality | `pnpm eval` |
| Filesystem ordering | sort before assert; never depend on readdir order | everywhere |

The first four rows make `pnpm test` reproducible to the byte. The last rows are how meta-evals stay
honest about residual noise instead of hiding it.

---

## 2. Determinism in `pnpm test` — inject every clock and RNG

Pure core logic takes its nondeterminism sources as parameters (overview §4: I/O isolated in
adapters; `@ratchet/schema` and pure functions do no I/O). Tests pass frozen versions:

```ts
// packages/core/src/clock.ts
export interface Clock { now(): Date }
export interface IdFactory { next(): string }   // ULID in prod, sequence in test
export interface Rng { next(): number }         // seeded PRNG in test

// in a test
import { freezeClock, seqIds, seededRng } from "@ratchet/core/testing";

const deps = {
  clock: freezeClock("2026-01-01T00:00:00Z"),
  ids: seqIds("01TEST"),          // 01TEST0001, 01TEST0002, …
  rng: seededRng(42),
};
const out = distill(transcript, { provider: new FakeProvider({ seed: 42 }), ...deps });
expect(out).toMatchSnapshot();    // safe: every nondeterministic input is pinned
```

If a value in a `pnpm test` snapshot still varies, the fix is to **inject its source**, never to
loosen the assertion. A varying snapshot in `pnpm test` is a bug in the test's dependency injection.

---

## 3. Record / replay for live-model behavior (`pnpm eval`)

We can't fake the gate's *judgement* and still call it a meta-eval — at some point a real verifier
must grade real candidates. We make that affordable and reproducible with **cassettes**
(`fixtures.md` §4):

1. **Record:** run the eval once against live providers with `RATCHET_EVAL_RECORD=1`. Each provider
   request is hashed `(prompt, model, seed, params)` and its response stored in
   `evals/cassettes/<provider>-<model>-<hash>.json`.
2. **Replay (default in CI):** the eval looks up the cassette by request hash — no network, no cost,
   deterministic. Learning-path PRs gate on replay (test-strategy §5).
3. **Live cadence:** a scheduled job re-runs **live**, refreshes cassettes, and **alerts if live rates
   drift** from cassette rates beyond a tolerance — catching the case where model behavior moved out
   from under our recordings (a silent threat to a prover whose grading depends on a model).
4. A replay whose request **misses** every cassette **fails** (it means the prompt changed and the
   recording is stale) — it never silently falls through to a live call inside `pnpm test`.

Cassettes carry the provider id, model, and seed they were recorded under, so a replay can't be served
by a recording from a different configuration.

---

## 4. Snapshot ranges and tolerances

When an exact value can't be pinned but is bounded, assert the **bound**, not the literal:

```ts
// cost and latency vary; assert envelopes, not exact numbers
expect(proofRun.costUSD).toBeLessThanOrEqual(budget.maxCostUSD);          // hard ceiling
expect(proofRun.costUSD).toBeGreaterThan(0);
expect(proofRun.measurement.trials).toBeGreaterThanOrEqual(cfg.minTrials);

// scores live in [0,1]; a "better" delta must be positive AND clear the bar
expect(proofRun.measurement.delta).toBeGreaterThan(0);
expect(proofRun.measurement.significance).toBeLessThanOrEqual(cfg.alpha);

// snapshot only the STRUCTURE, redacting volatile fields
expect(redactVolatile(proofRun)).toMatchSnapshot(); // strips timestamp, costUSD, raw model text
```

`redactVolatile` replaces inherently-variable fields (timestamps, exact cost, raw model prose) with
stable placeholders so a structural snapshot stays meaningful. Never snapshot raw model text as an
equality assertion (test-strategy §7 anti-patterns); assert on the **structured, schema-validated**
field instead.

---

## 5. Statistical assertions (the meta-eval rates)

Meta-evals measure rates over a noisy classifier, so they assert on **distributions**, not single
runs — exactly as the gate itself refuses to promote on one lucky trial (proof-gate §3):

- Gate on the **upper confidence bound** of the false-promote rate, not the point estimate
  (meta-evals.md §8) — a small-sample fluke must not ship a leaky gate.
- Require a **minimum number of trials/cases** before a rate is considered shippable
  (`THRESHOLDS.md` `minTrialsPerCase`, `minCases`); an under-powered measurement fails the run.
- Use a **seeded bootstrap** (seed recorded in the eval manifest) so the CI itself is reproducible.

```ts
const s = await scoreCorpus(corpus, evaluate, { bootstrapSeed: 1234 });
expect(s.cases).toBeGreaterThanOrEqual(THRESHOLDS.minCases);
expect(s.fprUpperCI95).toBeLessThanOrEqual(THRESHOLDS.maxFalsePromoteRate); // bound, not point
```

---

## 6. Flaky-test policy (zero tolerance, by design)

A prover that ships with flaky tests has no credibility. Policy:

1. **`pnpm test` must be deterministic.** A test that fails intermittently is a **release-blocking
   bug**, not something to retry. Triage means: find the un-injected nondeterminism source (clock,
   RNG, id, fs order, a leaked live call) and inject it. **No `retry()` to paper over flakiness in
   `pnpm test`.**
2. **No live calls in `pnpm test`.** CI asserts no socket is opened during `pnpm test`; a live call is
   the most common flakiness source and is forbidden (test-strategy §1).
3. **Quarantine, don't ignore.** If a flaky test can't be fixed immediately, move it to a tracked
   `*.quarantine.test.ts` that does **not** gate merges, file an issue, and fix or delete within the
   sprint. Quarantine is a visible debt, never a silent skip — and the gate's own invariant tests may
   **never** be quarantined.
4. **`pnpm eval` may be statistically noisy but is still bounded.** Eval "flakiness" is acceptable only
   as bounded statistical variation (§5); if a meta-eval's verdict flips run-to-run on the *same
   cassette*, that's determinism leakage in the eval harness — fix it like a `pnpm test` flake.
5. **Seeds are recorded, so failures reproduce.** Every eval run writes its seeds + config hash into a
   manifest (AGENTS.md invariant 7); a failing run can be replayed exactly from its manifest. "Couldn't
   reproduce" is not an accepted resolution.

---

## 7. Determinism receipts (tie-in to invariant 7)

Every ProofRun and every meta-eval run records a **manifest**: model ids, seed (where supported),
config hash, dataset/corpus id + split hash, and any bootstrap seed. This is what lets us claim a
result is real and replay it later (AGENTS.md invariant 7, proof-gate §6). A test or eval that reports
an outcome **without** a complete manifest is incomplete — never report "improvement" or a passing
rate without the receipt behind it.

---

## 8. Related docs
`test-strategy.md` · `meta-evals.md` · `fixtures.md` · `../../evals/THRESHOLDS.md` ·
`../architecture/proof-gate.md` · `../architecture/overview.md`
