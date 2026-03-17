---
name: iteration-planning
description: >
  Guides the agent through planning a new iteration/release: choosing the next
  version, creating a development branch, and updating Plans.md.
---

# Iteration Planning Workflow

## When to use this skill

Use this skill when the user asks to:

- **Plan the next iteration or release**, e.g. “Plan iteration after 1.4.0” or “Plan v1.5.0”.
- **Create a development branch** for upcoming work.
- **Define goals and scope** for an upcoming version in `Plans.md`.

If the request mentions “Plan iteration”, “next version plan”, or “plan for vX.Y.Z”, route through this skill.

## Inputs and outputs

- **Inputs**
  - Current stable version (e.g. `1.4.0`).
  - Target future version (e.g. `1.5.0`) or at least whether this is major/minor/patch.
  - High-level goals for the iteration (features, fixes, refactors).
- **Outputs**
  - A new Git branch following a consistent naming convention.
  - Updated `Plans.md` with a section for the target version, including goals and scope.

## High-level steps (for the planner / orchestrator)

1. **Clarify target version and goals**
   - Confirm the future version label.
   - Capture a short list of goals (features, technical work, testing focus).
2. **Define branch naming convention**
   - Use (or confirm) a pattern, for example:
     - `development-<major>.<minor+1>.0`
     - or `development-v<version>` (e.g. `development-v1.5.0`).
   - Agree on the exact pattern with the user if there is any ambiguity.
3. **Create or update planning artefacts**
   - Ensure `Plans.md` exists in the project root.
   - Add or update a section for the target version:
     - `## Version <targetVersion>`
     - `### Goals`
     - `### Features / Changes`
     - `### Testing & Risk`
     - `### Release Checklist`
4. **Delegate technical steps**
   - Use a shell-capable agent to create and push the branch if requested.
   - Use other agents (js-developer, tester) to add details under features and testing.

## Detailed procedure (for implementation agents)

When executing a Plan iteration request:

1. **Record iteration header in Plans.md**
   - If `Plans.md` does not exist, create it with a short introduction.
   - Add a new section for the requested target version using the structure above.
2. **Populate basic content**
   - Under **Goals**, list 3–7 bullet points capturing the main aims of the release.
   - Under **Features / Changes**, add initial ideas for features or refactors.
   - Under **Testing & Risk**, note areas that require extra attention, linking to `TESTS.md` where appropriate.
   - Under **Release Checklist**, outline key steps that must be done before release (e.g. Build, regression pass, docs update).
3. **Branch creation**
   - Propose a branch name following the agreed pattern.
   - Use the shell agent to run the appropriate git command (e.g. `git checkout -b <branchName>`), if the user wants this automated.
4. **Link to Build workflow**
   - Note that the eventual Build for this version should use the **build-and-release** skill.

## Relationship to `plan.md`

- `plan.md` is a **temporary working plan** for the current task or day.
- `Plans.md` is a **persistent history of iteration plans**.
- The planner can draft ideas in `plan.md` and then copy the final agreed outline into `Plans.md`.

