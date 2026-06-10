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
6. **2Prod invariants.** The gate set is **5 vetos + 27 regular gates**. Leaked secrets are veto **V5** (procedure: Cat 8.5), never a regular gate. In Local Project Mode, Sec1–Sec3 are **deferred** (denominator 24, not 27) so a clean local build can still reach READY. Tooling outages are **INCONCLUSIVE** (dropped from numerator+denominator), never a site failure. The two green bands also require Resp1 to pass. If you change the gate count, update all of: SKILL.md gate table, computation steps, report templates, fix-me.md template, and README. Keep category numbering canonical (Responsiveness = Cat 9, Stack Freshness = Cat 10; AI-slop subsections are 8.1–8.5). Design-tell signals (Cat 8, unnumbered block) are **informational only** — never scored, never gated, never exported to fix-me.md; generic styling (Inter, purple gradients, card grids) is not a defect.

## Release flow

1. Update SKILL.md / README.
2. Bump version in `plugin.json`, `marketplace.json`, `package.json`.
3. Commit with imperative English message (e.g., "Add X check to Category 9").
4. Tag `vX.Y.Z`, push tags.
5. Update the locally installed plugin: `claude plugin update vibe2prod@vibe2prod`. Claude Code pins the installed version in its cache — the marketplace pointing at `./` does **not** auto-pick-up new releases. Takes effect on the next Claude Code start.
