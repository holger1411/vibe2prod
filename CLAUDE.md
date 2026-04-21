# Repo: vibe2prod

This repo is a Claude Code plugin. Its only moving part is the `vibe2prod` skill at `skills/vibe2prod/SKILL.md`.

## Structure

- `skills/vibe2prod/SKILL.md` — the skill prompt. **Source of truth for plugin behavior.** Every change to audit logic, severity, or fix strategy lives here.
- `.claude-plugin/plugin.json` — plugin manifest. Bump `version` here on every release.
- `.claude-plugin/marketplace.json` — local marketplace definition; also bump `plugins[0].version`.
- `README.md` — user-facing docs (install, usage, examples).
- `package.json` — version tracking (keep in sync with plugin.json / marketplace.json).

## Design principles

1. **Skill-as-prompt, not code.** Keep SKILL.md self-contained. Don't split into multiple files unless the skill genuinely can't fit.
2. **Auto-detect over configuration.** Framework, region, and port detection should all "just work" without flags. Flags are escape hatches.
3. **No aggressive image compression.** 85 % minimum, 90 % default. Always prefer format changes and `srcset` over quality reduction.
4. **Fixes that touch visible copy require approval.** Placeholder href="#" is fine to auto-fix; replacing a hero headline is not.
5. **Open-source discipline.** Don't commit API keys, don't embed user-specific paths, keep copy neutral.

## Release flow

1. Update SKILL.md / README.
2. Bump version in `plugin.json`, `marketplace.json`, `package.json`.
3. Commit with imperative English message (e.g., "Add X check to Category 9").
4. Tag `vX.Y.Z`, push tags.

## Relation to the private `prod-ready` plugin

vibe2prod is the open-source descendant of a private `prod-ready` skill. The private version can stay ahead of the public one, but **never copy private-specific tweaks into this repo without review** — they may contain user-specific heuristics or client context.
