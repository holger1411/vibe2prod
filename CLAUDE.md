# Repo: vibe2prod

This repo is a Claude Code plugin. Its only moving part is the `vibe2prod` skill in `skills/vibe2prod/`.

## Structure

- `skills/vibe2prod/SKILL.md` — the skill core: flow, modes, gates, scoring, severity. **Source of truth for plugin behavior.**
- `skills/vibe2prod/references/` — one file per category (`cat-NN-*.md`), plus the report format, the fix catalog, and the fix-me.md template. Linked one level deep from SKILL.md.
- `skills/vibe2prod/scripts/` — deterministic measurements and the gate calculator (`responsive.mjs`, `secret-scan.mjs`, `gates.mjs`, `check-runtime.mjs`, pure logic in `lib/`). Only dependency: `playwright`, resolved from `~/.cache/vibe2prod/runtime` (see `lib/runtime.mjs`).
- `tests/` — `node --test` suite: unit tests for `lib/`, integration tests running the scripts against `evals/fixtures/`.
- `evals/` — `claude plugin eval` suite for model behavior (skill triggering, no fabricated verdicts). Fixture sites live in `evals/fixtures/`; the leaky fixture's fake `.env` is committed on purpose.
- `.claude-plugin/plugin.json` — plugin manifest. Bump `version` here on every release.
- `.claude-plugin/marketplace.json` — local marketplace definition; also bump `plugins[0].version`.
- `README.md` — user-facing docs (install, usage, examples).
- `package.json` — version tracking (keep in sync with plugin.json / marketplace.json).

## Design principles

1. **Prompt-first, scripts for measurements.** SKILL.md holds the flow and every rule; category procedures live in `references/`. A measurement moves into `scripts/` only when it decides a gate or score and is easy to get subtly wrong in improvised code — the script implements what the prose specifies, never the other way round, and the prose stays so a reader can audit a result. Scripts stay dependency-light (Node built-ins + `playwright`), print JSON, never print secret values, and exit 3 when tooling is missing (→ INCONCLUSIVE). Keep SKILL.md near 500 lines; put detail in a reference file rather than growing the core.
2. **Auto-detect over configuration.** Framework, region, and port detection should all "just work" without flags. Flags are escape hatches.
3. **No aggressive image compression.** 85 % minimum, 90 % default. Always prefer format changes and `srcset` over quality reduction.
4. **Fixes that touch visible copy require approval.** Placeholder href="#" is fine to auto-fix; replacing a hero headline is not.
5. **Open-source discipline.** Don't commit API keys, don't embed user-specific paths, keep copy neutral.
6. **2Prod invariants.** The gate set is **5 vetos + 27 regular gates**. Leaked secrets are veto **V5** (procedure: Cat 8.5), never a regular gate. In Local Project Mode, Sec1–Sec3 are **deferred** (denominator 24, not 27) so a clean local build can still reach READY. Tooling outages are **INCONCLUSIVE** (dropped from numerator+denominator), never a site failure. The two green bands also require Resp1 to pass. If you change the gate count — or the Method-B check list — update all of: SKILL.md gate table, computation steps and check table, `scripts/lib/scoring.mjs` (`GATES` / `CHECKS`) and `tests/scoring.test.mjs`, `references/report-format.md`, `references/fix-me-template.md`, and README. Keep category numbering canonical, including the `references/cat-NN-*.md` file names (Responsiveness = Cat 9, Stack Freshness = Cat 10, Agent Readiness = Cat 11; AI-slop subsections are 8.1–8.5). **Cat 11 is report-only**: weight 0, no gate, no entry in the Readiness Score's ten weights (which still sum to 100), no impact group, and in `fix-me.md` only inside its own opt-in section without point values. The AI-crawler robots.txt note inside Cat 11 is neutral like the design-tells — blocking GPTBot/ClaudeBot is a business decision, never a defect. Design-tell signals (Cat 8, unnumbered block) are **informational only** — never scored, never gated, never exported to fix-me.md; generic styling (Inter, purple gradients, card grids) is not a defect.

## Release flow

1. Update SKILL.md / references / scripts / README.
2. Run `npm test` (the integration tests need the script runtime; they skip without it). After prompt or description changes, also run the evals: `claude plugin eval . --scaffold --trust-plugin --ablation none --allow-tools Bash`. The eval sandbox cannot run `node` or `lighthouse`, so evals test model behavior only — measurement correctness is `npm test`'s job.
3. Bump version in `plugin.json`, `marketplace.json`, `package.json`.
4. Commit with imperative English message (e.g., "Add X check to Category 9").
5. Tag `vX.Y.Z`, push tags.
6. Update the locally installed plugin: `claude plugin update vibe2prod@vibe2prod`. Claude Code pins the installed version in its cache — the marketplace pointing at `./` does **not** auto-pick-up new releases. Takes effect on the next Claude Code start.
