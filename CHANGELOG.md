# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased 1.1.x] — started 2026-03-09

- Start of 1.1 development. Baseline taken from version 1.0.0.
- Added active/inactive flow for custom rules so only one selector/value pair is editable at a time.
- Enhanced Fields tab search and bridge to build selectors, jump to the Custom tab, and prefill the latest custom rule.
- Updated ellipsis menus for rules and variables (Edit/Duplicate/Verify/Delete) with single-open behavior and proper layering over fields.
- Tightened validation: selectors must be unique and valid; autosave and Save are blocked while the active rule has errors or an empty selector/value.
- Prevented adding new selector rules while the current active rule is invalid, and renamed the section to “Custom rules” which auto-expands when opened from the Fields tab.

