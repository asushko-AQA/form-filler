---
name: build-and-release
description: >
  Guides the agent through the Build workflow for the AutoForm Filler extension:
  bumping versions, updating README, maintaining a changelog, and delegating checks.
---

# Build & Release Workflow

## When to use this skill

Use this skill whenever the user asks to:

- Run a **Build** for the extension (e.g. “Build”, “Prepare a new release”).
- **Bump the version** and ensure all metadata/docs are consistent.
- **Update the changelog** and summarize recent changes.
- Package changes for a **Chrome Web Store upload** or internal distribution.

If a request sounds like “do a release”, “cut a new version”, or “update version + docs”, route through this skill.

## Inputs and outputs

- **Inputs**
  - Current extension version (from `manifest.json` or equivalent).
  - Target version (e.g. `1.4.0`), including whether it is major/minor/patch.
  - Short description or list of changes since the last release.
- **Outputs**
  - Updated version field(s) in the manifest / source of truth.
  - `README.md` updated with any user-visible behavior changes.
  - Changelog updated with a new section for the target version and date.

## Versioning rules

- **Patch version**
  - For small/normal commits (including hot-fixes that are not part of a main planned release), bump the **patch** version: `x.y.z → x.y.(z+1)`.
- **Minor version**
  - Only bump the **minor** version when a `plan.md` (or equivalent iteration plan) is released as a main feature/iteration: `x.y.z → x.(y+1).0` (reset patch to `0`).
- **Assistant behavior**
  - Whenever the assistant prepares a git commit, it should:
    - Suggest a **patch bump** for regular commits.
    - Suggest a **minor bump** instead when the commit corresponds to a released plan/iteration.

## High-level steps (for the planner / orchestrator)

1. **Clarify scope**
   - Confirm the target version number and what type of release it is (major/minor/patch).
   - Clarify which changes must be mentioned in the changelog and README.
2. **Plan edits**
   - Identify files that hold version information (typically `form-filler-extension/manifest.json` and possibly others).
   - Identify where to update user-facing docs:
     - `README.md` (high-level description).
     - Changelog file (if present) or a new `CHANGELOG.md`.
3. **Delegate implementation**
   - Use the **js-developer** subagent (or appropriate code-editing agent) to:
     - Bump the version in all relevant files.
   - Update `README.md` and the changelog with concise, accurate descriptions of changes.
4. **Optional checks**
   - Run or describe quick manual checks or existing tests (refer to testing skills / `TESTS.md`).
5. **Summarize result**
   - Restate the new version and confirm which files were touched.
   - Call out anything left for the human to run manually (e.g. packaging, store upload).

## Detailed procedure (for implementation agents)

When executing a Build:

1. **Determine next version**
   - Read the current version from `manifest.json`.
   - Compute the new version based on user input (e.g. bump minor for non-breaking feature additions).
2. **Update version fields**
   - Update `manifest.json` (and any other version source) to the new version.
   - Ensure any UI references to the version (e.g. popup badge) remain consistent.
3. **Update README**
   - If behavior or user workflows have changed, adjust sections in `README.md` to match.
   - Keep README concise; link to detailed test docs or changelog where necessary.
4. **Update changelog**
   - If `CHANGELOG.md` exists, add a new section for the target version with:
     - Date.
     - Bulleted list of notable changes.
   - If no changelog exists, consider creating one if the user agrees in the future.
5. **Checks**
   - Optionally run any quick build/tests the repo supports (e.g. lint, unit tests).
   - At minimum, ensure the extension still loads under `chrome://extensions`.

## Delegation guidance

- **Planner / main agent**
  - Use this skill to outline the Build steps before editing.
  - Decide which subagents to launch and in what order.
- **js-developer**
  - Perform version bumps and any manifest-related changes.
- **tester / test-doc skills**
  - If the Build includes behavior changes, ensure `TESTS.md` and related docs reflect the new behavior.

