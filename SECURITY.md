# Security Policy

Ratchet is an open, local-first **verified continual-learning layer for AI agents**. Because Ratchet
ingests a user's working sessions (untrusted input) and lets an agent change its own learned behavior,
security is core to the product, not a side concern. We take reports seriously and appreciate your help.

> This policy is the front door. The full reasoning lives in `docs/security/`:
> [`threat-model.md`](docs/security/threat-model.md) ·
> [`privacy.md`](docs/security/privacy.md) ·
> [`secrets.md`](docs/security/secrets.md) ·
> [`provenance-signing.md`](docs/security/provenance-signing.md).

---

## Supported versions

Ratchet is pre-1.0 and ships fast. Security fixes land on the **latest released minor** and on `main`.
Older pre-1.0 versions are not back-patched — please upgrade to the latest release.

| Version | Supported |
|---|---|
| Latest released `0.x` | ✅ Yes |
| `main` (unreleased) | ✅ Yes |
| Older `0.x` | ❌ No — upgrade to latest |

Once Ratchet reaches `1.0`, this table will be updated with a formal support window.

## Reporting a vulnerability (responsible disclosure)

**Please do not open a public issue for a security vulnerability.** Public issues disclose the problem
to attackers before a fix exists.

Report privately via **GitHub Security Advisories** — use **"Report a vulnerability"** under the
repository's **Security** tab (Private Vulnerability Reporting). If that is unavailable to you, email
the maintainer at the address listed on the GitHub profile (**@anthonydenk**) with the subject line
`RATCHET SECURITY`.

Please include, as much as you can:

- A clear description of the issue and its impact.
- Steps to reproduce (a minimal proof-of-concept helps enormously).
- Affected version / commit.
- Any suggested remediation.

If you found a **leaked secret** (e.g. an API key committed to the repo), report it the same way and
note it as urgent — see [`docs/security/secrets.md`](docs/security/secrets.md) §7 (rotate first).

## Our commitment & expected response times

| Stage | Target |
|---|---|
| **Acknowledge** your report | within **3 business days** |
| **Initial assessment** (severity + whether we can reproduce) | within **7 business days** |
| **Fix or mitigation plan** for confirmed issues | within **30 days** (faster for high severity) |
| **Public disclosure** | coordinated with you, after a fix ships |

We will keep you updated, credit you in the advisory and `CHANGELOG.md` (unless you prefer to remain
anonymous), and let you know when the fix is released. As a pre-1.0 open-source project we do not run a
paid bug-bounty program, but we are genuinely grateful for good-faith reports.

## Scope

**In scope** — vulnerabilities in this repository's code and design, especially:

- **Memory poisoning / prompt injection** that lets an untrusted session plant a bad skill or bypass
  sanitization (`docs/security/threat-model.md` §6, Scenarios 1–2).
- **Proof-gate bypass** — any path that promotes a skill *without* a valid, independent, regression-clean
  `pass`, or any "force promote" (AGENTS.md invariant 1; `docs/architecture/proof-gate.md`).
- **Evaluator-independence breaks** — proposer and verifier collapsing into one (AGENTS.md invariant 2).
- **Secret/PII leakage** into the vault, ledger, ProofRun manifests, fixtures, or logs
  (`docs/security/secrets.md`, `docs/security/privacy.md`).
- **Ledger/store tampering** that forges proof or rewrites earned history (`threat-model.md` §3, B5).
- **Cost-exhaustion / loop-guard bypass** — defeating `maxTrials` / `maxCostUSD` / `maxIterations`
  (AGENTS.md invariant 6).
- **v3 supply-chain issues** — signature/provenance bypass, or an imported skill reaching `promoted`
  without local re-verification (`docs/security/provenance-signing.md`).

**Out of scope:**

- A **fully compromised host machine / OS account.** Ratchet is local-first and assumes the machine it
  runs on is trusted; it cannot defend its store against an attacker who already owns the OS
  (`threat-model.md` §2, §8).
- Vulnerabilities in **third-party model providers** or their APIs (report to the provider).
- Issues requiring a **malicious provider/config the user deliberately set up** (e.g. pointing Ratchet
  at a hostile `baseUrl`).
- **Best-effort redaction limits** — redaction is detection-based, not a guarantee. A sensitive string
  that evades detection is a bug worth reporting, but the documented model is "redaction + a
  user-readable vault you can audit," not perfection (`privacy.md` §4).
- Findings in **example/fixture data** that use clearly-marked placeholders.

## Safe harbor

We will not pursue or support legal action against researchers who, in good faith, follow this policy:
test only against their own installation, avoid privacy violations and data destruction, and give us a
reasonable chance to fix the issue before public disclosure. Thank you for helping keep Ratchet — and
the agents that learn on it — trustworthy.
