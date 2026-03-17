---
name: testing-smoke
description: >
  Provides high-level smoke test guidance for the AutoForm Filler extension,
  focused on quickly validating core flows still work after changes.
---

# Smoke Tests for AutoForm Filler

## When to use this skill

Use this skill when:

- You need a **quick confidence check** after a localized change.
- The user asks for a **short smoke test list** rather than full regression.

Refer to `TESTS.md` for detailed cases; this skill summarizes core smoke passes.

## Core smoke checklist

- Popup loads and shows the correct version badge.
- Basic **Fill Form Now** flow works on a known test page with existing rules.
- Floating **Auto Fill** button appears only on pages with context configuration and triggers fills correctly.
- No obvious console errors appear during popup or fill usage.

