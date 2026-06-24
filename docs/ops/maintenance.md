# Ratchet — Ops & Maintenance

> Inventory section H. How Ratchet stays alive and trustworthy after launch:
> privacy-respecting **opt-in** telemetry, error reporting, support channels,
> release cadence, and the issue-triage rhythm.
>
> The non-negotiable frame: Ratchet is **local-first** and its brand is *honest
> measurement*. If our telemetry were creepy, we'd be hypocrites. Everything here
> is opt-in, minimal, and never touches vault content (`../security/privacy.md`).

---

## 1. Telemetry — opt-in, privacy-respecting, minimal

**Default: OFF.** Telemetry is **opt-in**, asked once, in plain language, at
`ratchet init` ("Help improve Ratchet by sharing anonymous usage stats? You can
change this anytime. We never read your vault, code, or conversations. [y/N]").
The default if you just hit enter is **no**.

**Why we collect anything at all:** to answer two questions the project's health
depends on — *are people activating?* (first proven skill) and *are they
retaining?* (still leveling at week 4). These map straight to
`../product/success-metrics.md`. Without a little signal we're flying blind; with
too much we betray the local-first promise. The line below is deliberate.

### What we DO collect (only with opt-in)

Anonymous, aggregate, event-level — tied to a random install id, not a person:

| Event | Why | Maps to |
|---|---|---|
| `install` / `init` (with version, OS family, host-agent type) | Acquisition; compatibility spread | §Acquisition |
| `first_note_written` (timestamp only) | v0 activation | §Activation |
| `first_skill_promoted` (timestamp only) | **The activation moment** — first *proven* skill <24h | §Activation (headline) |
| `weekly_active` (ran `watch` in trailing 7d — a heartbeat ping, no content) | Retention | §Retention |
| `skill_promoted` / `skill_retired` **counts** (numbers only, never titles or content) | North Star; skill survival | §North Star / §Retention |
| `card_generated` / `card_shared` + referral tag on `init` | The viral loop | §Virality |
| `proof_cost` aggregate (USD/cycle, no task content) | Runaway-cost guard | §Trust |

### What we DO NOT collect (ever — even with opt-in)

- **Vault content** — no notes, no note titles, no bodies. Never.
- **Conversation or code** — none of the captured sessions, prompts, or outputs.
- **Skill content** — titles, text, applicability. Only **counts** leave the machine.
- **Secrets / API keys / PII** — redacted at source; never logged, never sent
  (`../security/secrets.md`, `../security/privacy.md`).
- **File paths, repo names, vault paths, hostnames, usernames, IP** beyond what's
  inherent to a network request (which we don't store or correlate).
- **Any per-keystroke / per-session behavioral stream.** Heartbeats and milestone
  events only — not a usage firehose.

### Telemetry guarantees

- **Opt-in, reversible.** `ratchet config telemetry off` (and on) anytime;
  honored immediately.
- **Inspectable.** A documented schema of every event we send, and a
  `ratchet telemetry --dry-run` that prints exactly what *would* be sent so a
  skeptical user can verify the claims above. (Trust, but make it verifiable —
  on-brand.)
- **Aggregate-only retention.** Raw events roll up to metrics; we don't keep a
  per-install activity log longer than needed to compute the funnels.
- **No third-party ad/analytics SDKs.** Our own minimal endpoint or a
  privacy-respecting, self-hostable analytics layer — nothing that fingerprints.
- **Honesty parity:** the same redaction guard that protects the vault and the
  level-up card protects telemetry. A telemetry leak is a release-blocking bug.

---

## 2. Error reporting

We need to know when it breaks for users — without slurping their environment.

- **Opt-in crash reports**, separate consent from usage telemetry (a user may
  want one and not the other). Default OFF.
- **Scrub before send.** Stack traces and error context pass through the same
  PII/secret redaction as everything else; file paths and arguments are stripped
  or hashed. Never send the offending conversation, note, or skill content.
- **Local-first errors by default.** Errors always go to a local log the user can
  read (`~/.ratchet/logs`), with a clear "want to send this to the maintainers?"
  prompt rather than silent upload.
- **`ratchet doctor`** — a self-diagnostic the user runs that checks install,
  host-agent connection, vault writability, model/provider auth, and budgets, and
  prints a **shareable, pre-redacted** report they can paste into an issue. This
  is the bridge between "it broke" and a good bug report — and it keeps the user
  in control of what's shared.
- **Fail loud, fail closed.** Per the invariants, anything that can't verify (gate
  can't run, regression suite can't run) fails closed and surfaces a clear error,
  never a silent degrade (`AGENTS.md`, `../architecture/proof-gate.md`).

---

## 3. Support channels

Keep it simple early; don't fragment the community across five places.

| Channel | Use | When |
|---|---|---|
| **GitHub Issues** | Bugs, feature requests, reproducible problems | From day one. The primary support surface. |
| **GitHub Discussions** | Questions, ideas, "how do I…", show-and-tell (share your level-up card!) | From launch. Lower bar than an issue. |
| **SECURITY.md path** | Vulnerability disclosure — **never** a public issue | Already in place (`SECURITY.md`). |
| **X / @anthonydenk** | Informal questions, build-in-public conversation | Ongoing; redirect anything actionable to Issues/Discussions. |
| **Discord** | Real-time community | **Only when volume justifies it.** A dead Discord is worse than none. Defer until Discussions overflow. |

- **Triage labels** route support: `question`, `bug`, `enhancement`,
  `good-first-issue`, `needs-repro`, `security`.
- **Templates do the heavy lifting.** Good issue/PR templates (Inventory F5) plus
  `ratchet doctor` output turn vague reports into actionable ones.
- **Set response expectations honestly.** A line in `SUPPORT.md`: this is an
  early, building-in-public project maintained by one person; best-effort
  response, security reports prioritized.

---

## 4. Release cadence

A rhythm people can rely on — a trust signal in itself (Inventory H4, F6).

- **Semantic versioning** with a maintained `CHANGELOG` (Inventory F6). Breaking
  changes to the CLI/MCP surface or the **skill schema** are major bumps and are
  called out loudly — the schema is portable-from-day-one and breaking it hurts
  v3 (`../architecture/skill-schema.md`).
- **Cadence (early phase):** ship when something's genuinely better, but aim for a
  **predictable rhythm** — e.g. a tagged release every ~2 weeks if there's
  meaningful change, plus patch releases for launch-day-class bugs ASAP. Don't
  perform "shipping"; release when it's real (brand voice).
- **Every release:** CHANGELOG entry, green CI (lint + test + `pnpm eval`
  meta-evals within thresholds — `evals/THRESHOLDS.md`), and a one-line human
  summary cross-posted to X/Discussions.
- **The honesty gate is also a release gate.** A release that moves the
  **false-promote rate** out of threshold does not ship, even if everything else
  is green. The trust metric is release-blocking (`../product/success-metrics.md`
  §Trust).
- **Deprecation policy.** Schema/CLI changes get a deprecation window and a
  migration note, not a silent break.

---

## 5. Issue-triage rhythm

A light, sustainable loop for a solo/early-maintainer project.

- **Daily (launch week), then a few times/week:** sweep new issues. Label, ask for
  repro if missing (`needs-repro` + point at `ratchet doctor`), and acknowledge —
  even a one-line "thanks, looking" sets the culture.
- **Weekly triage pass:**
  - Re-label and prioritize: `P0` (data loss / secret leak / false-promote / broken
    install) → drop everything; `P1` (core loop broken for some users); `P2`
    (annoyance / edge case); `P3` (nice-to-have).
  - Tag approachable issues `good-first-issue` — early contributors shape the whole
    thing (`CONTRIBUTING.md`).
  - Close stale/duplicate with a kind note.
- **Severity shortcuts (jump the queue):**
  - **Anything touching privacy/secrets/PII** → treat as P0, route via `SECURITY.md`
    if it's a vulnerability.
  - **Anything where the gate false-promotes / regression suite fails to catch a
    known regression** → P0. This is the product's core promise breaking.
  - **Broken `npx ratchet init`** → P0 during/after launch; it's the on-ramp.
- **Monthly:** a short "state of Ratchet" note (Discussions + X) — what shipped,
  what's next, thanks to contributors. Generosity reads as confidence (brand kit).

---

## Ops invariants (the short version)

1. **Opt-in or it doesn't happen** — telemetry and error reporting both default OFF.
2. **Counts, never content** — numbers and milestones leave the machine; vault,
   code, conversations, and skill text never do.
3. **Inspectable** — `--dry-run` / `doctor` let a skeptic verify every claim here.
4. **The trust metric is a release gate** — false-promote out of threshold blocks
   a release, full stop.
5. **One voice, fast response, honest expectations** — early and building in public,
   and we say so.
