---
name: change-log-rule
description: Mandates that every change (code, docs, config, deploy) is recorded in CHANGELOG.md in a team-work style log — like a dev handing over work to the next team member.
trigger: always_on
---

# Change Log Rule (Team-Work Style)

Every change made in this repository — code, docs, configuration, tests, or deployment — **MUST** be written down in `CHANGELOG.md` at the repo root, formatted as if a team member wrote a handover note for the rest of the team.

## 1. When to write an entry
Write (or extend) an entry **immediately after finishing a change**, and always **before** declaring the task done or committing. One logical change = one section. Related sub-changes go under the same section.

## 2. Required format
Append to `CHANGELOG.md` under the latest date heading, newest first:

```markdown
## [YYYY-MM-DD] — <Short title of the change>

**Author**: <name/agent>
**Role**: <Dev | Backend | QA | DevOps | Docs>
**Status**: <Draft | In Review | Done>

### What changed
- <File or area> — <what was added/changed/removed> (bullet per file/area)

### Why
- <Problem solved or task requested — link issue/task number if any>

### How it was verified
- <Commands run and their result, e.g. `npm run test` → 80 passed, smoke test → 15/20 PASS>

### Handover notes / follow-ups
- <Anything the next person must know: pending deploy, known bugs left open, decisions made>
```

A change is only `Status: Done` when the **Verification** section contains evidence (real command output or a passing test list) — matching the Definition of Done in `AGENTS.md`.

## 3. Rules
1. **Never batch unrelated days**: open a new date heading instead of merging old entries.
2. **Never delete or rewrite previous entries** — append only (log history is built by many hands).
3. **Roles are indicative**: when one session acts as several roles (backend fix + QA + deploy), write multiple entries or split bullets under matching roles.
4. **Deployment entries are mandatory** when deploying happened: include the target URL and the outcome in the Handover notes.
5. **Fail list goes in the log**: if a smoke test/build/deploy failed, record it as-is with the root cause — do not clean it up.

## 4. Quick template reminder
`Author → Role → What changed → Why → How it was verified → Handover notes`. If any of the six is missing, the entry is incomplete and the change is not considered finished.
