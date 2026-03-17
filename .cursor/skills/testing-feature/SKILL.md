---
name: testing-feature
description: >
  Provides patterns and templates for documenting manual tests for specific
  features of the AutoForm Filler extension.
---

# Feature-Level Testing Patterns

## When to use this skill

Use this skill when:

- Adding or changing a **specific feature** (popup tab behavior, custom rules, import/export, etc.).
- You need to document **how to test** that feature in `TESTS.md`.

## Template

Follow this structure inside `TESTS.md` when adding a new feature section:

```markdown
## Popup – <Area>

### Feature: <short feature name>

Short description: <1–2 line description of what the feature does for the user>.

- [ ] Test case 1
- [ ] Test case 2
- [ ] Edge case / error behavior
```

