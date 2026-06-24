# Security Policy

Ratchet ingests working-session transcripts and can change what an agent learns. Treat captured input as untrusted, keep secrets out of the vault and ledger, and never bypass the proof gate.

## Supported Versions

Ratchet is pre-1.0. Security fixes land on `main` and the latest released `0.x` version.

| Version | Supported |
|---|---|
| Latest released `0.x` | Yes |
| `main` | Yes |
| Older `0.x` | No; upgrade to latest |

## Reporting a Vulnerability

Do not open a public issue for a security vulnerability.

Report privately through GitHub Security Advisories using the repository's Security tab. If that is unavailable, email the maintainer listed on the GitHub profile with the subject `RATCHET SECURITY`.

Please include:

- affected version or commit;
- a clear impact description;
- reproduction steps or a minimal proof of concept;
- any suggested fix or mitigation.

If you find a leaked secret, report it as urgent and rotate the credential first.

## Response Targets

| Stage | Target |
|---|---|
| Acknowledge report | 3 business days |
| Initial assessment | 7 business days |
| Fix or mitigation plan | 30 days, faster for high severity |
| Public disclosure | coordinated after a fix ships |

## In Scope

- Proof-gate bypass: any path that promotes without a valid independent proof.
- Evaluator-independence breaks: proposer and verifier collapse into the same config.
- Regression-gate failures: a candidate promotes after breaking an earned skill, or promotes when the regression suite cannot run.
- Memory poisoning or prompt injection that plants a bad skill through captured input.
- Secret or PII leakage into vaults, ledgers, ProofRun manifests, fixtures, or logs.
- Cost or loop guard bypass for `maxTrials`, `maxCostUSD`, or `maxIterations`.
- Store tampering that forges proof receipts or earned-skill history.

## Out of Scope

- A fully compromised host machine or OS account.
- Vulnerabilities in third-party model providers.
- Issues requiring a malicious provider configuration deliberately chosen by the user.
- Placeholder values in examples or fixtures.
- Redaction misses that require impossible perfect detection. Report them, but the security model is redaction plus user-readable auditability.

## Safe Harbor

We will not pursue or support legal action against researchers who act in good faith, test only against their own installation, avoid privacy violations and data destruction, and give us a reasonable chance to fix the issue before public disclosure.
