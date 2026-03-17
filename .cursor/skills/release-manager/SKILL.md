---
name: release-manager
description: >
  Coordinates release planning and execution using plan.md, developing-vX.X.X
  branches, and updates to CHANGELOG.md and README.md.
---

# Release Manager Skill

## When to use this skill

Use this skill when:

- The user says **\"Plan release for [DATE]\"**.
- The user asks **\"What's next?\"** in the context of release work.
- You need to interpret or update `plan.md` release sections, `CHANGELOG.md`,
  or release-related README content.

Always combine this skill with the general orchestrator rules in
`.cursor/rules/workflow-orchestration.mdc`.

## Versioning and branch naming

- Source of truth for the current version: the extension manifest
  (e.g. `form-filler-extension/manifest.json`).
- Version parsing:
  - Treat the version as `MAJOR.MINOR.PATCH`.
- Default next version when not specified by the user:
  - `MAJOR.(MINOR+1).0` (semantic **MINOR** bump).
- Branch naming:
  - `developing-v<nextVersion>` (e.g. `developing-v1.5.0`).

When the user explicitly gives a version, prefer that over the default rule.

## Plan release for [DATE] behavior

When the user says `Plan release for YYYY-MM-DD`:

1. Treat the date as the key for a new or existing release section in `plan.md`.
2. Ensure `plan.md` has a section:
   - `## Release YYYY-MM-DD`
     - `### Branch`
     - `### Ideas`
     - `### Tasks`
3. Compute the next version (using the rule above) and derive the branch name
   `developing-v<version>`, then record it under `### Branch`.
4. Start an interactive idea loop:
   - On each turn:
     - Propose 1–2 concise technical ideas for this release.
     - Ask the user for their own idea or to say \"Enough\".
   - Record agreed ideas under `### Ideas` and, when they are actionable,
     also add them under `### Tasks` as `- [ ]` checklist items.
5. When the user says \"Enough\", mark the release as locked in `plan.md`
   (e.g. add a `Locked: YYYY-MM-DD` line) and confirm that planning for this
   release is complete.

## \"What's next?\" behavior

When the user asks `What's next?`:

1. Read `plan.md` and identify the **current release**:
   - Prefer the most recent `## Release YYYY-MM-DD` section that is locked
     and still has unchecked tasks under `### Tasks`.
2. List pending tasks:
   - Collect all `- [ ]` items from the current release's `### Tasks`.
   - Present them as a short, numbered list to the user.
3. Ask the user to pick one task to work on now.
4. For the chosen task:
   - Clarify requirements as needed (1–2 concise questions at a time).
   - Use planner behavior (or the `planer` agent) to outline steps.
   - Delegate implementation to appropriate subagents (e.g. `js-developer`,
     `tester`) following the general orchestration rules.
5. During implementation, periodically summarize progress and explicitly ask:
   **\"Is the task ready?\"** so completion can be recorded.

## Task completion and housekeeping

When the user confirms that the current task is ready:

1. **Update `plan.md`**:
   - Find the matching `- [ ]` task item under the current release's
     `### Tasks` section and change it to `- [x]`.
2. **Update `CHANGELOG.md`**:
   - Under a section corresponding to the current target version
     (e.g. `## v1.5.0 – YYYY-MM-DD`), add a bullet summarizing the change.
   - If the version section does not yet exist, create it based on the
     `developing-vX.X.X` branch name or the release context.
3. **Update `README.md` when needed**:
   - If the change affects user-visible behavior or configuration, update
     the relevant sections in `README.md` to reflect the new behavior.
   - If the change is purely internal, skip README updates.
4. **Propose git sync commands**:
   - Summarize which files were changed for this task.
   - Propose a concise commit message focused on the intent of the task.
   - Suggest the sequence of git commands (e.g. `git add`, `git commit`,
     `git push origin developing-vX.X.X`) without executing them directly.

## Release closing

Periodically (especially after completing tasks for a release):

1. Check whether all tasks under the current release's `### Tasks` section
   in `plan.md` are marked `- [x]`.
2. If all tasks are complete:
   - Notify the user that the release cycle for that date/version is complete.
   - Suggest reviewing `CHANGELOG.md` to ensure it matches the implemented
     work.
   - Propose creating a Pull Request or merging the `developing-vX.X.X`
     branch into the main branch, including example commands if appropriate
     (e.g. using `gh pr create`).

## Deadline awareness

Because each release section in `plan.md` is keyed by date
(`## Release YYYY-MM-DD`), the Release Manager can compare those dates with
the current date.

- When responding to `What's next?`:
  - If the current date is past the release date and there are still
    unchecked tasks, politely call this out (e.g. that the release is
    overdue) and encourage prioritizing remaining tasks or explicitly
    planning a new release date.
- Avoid being noisy; only mention overdue status when it is relevant to
  choosing or executing the next task.



