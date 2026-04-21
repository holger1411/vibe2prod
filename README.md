# vibe2prod

> **AI-generated sites aren't "slop" — they're drafts.** vibe2prod's job is to close the gap between draft and prod, not to shame the author. Every check has a concrete, actionable fix attached, and every fix that touches user-visible copy is proposed (not silently applied).

**vibe2prod** is a Claude Code plugin that audits websites across **10 technical categories** — performance, accessibility, SEO, HTML quality, security, assets, robustness, AI-slop artifacts, responsiveness (quantitative multi-breakpoint tests), and stack freshness (live npm-registry version checks, never training knowledge) — computes a **0–100 Readiness Score**, helps you fix what it finds, and re-tests with a before/after comparison.

It's built for the vibe-coder era: if you shipped with Lovable, v0, Bolt, Cursor, Claude Code, or any other AI-assisted builder, vibe2prod catches the stuff those tools don't — leftover Lorem ipsum, placeholder images, `example.com` links, fake "John Doe" testimonials, hallucinated OG tags, duplicate hero sections, missing security headers, outdated framework versions, horizontal overflow on small phones, and so on.

## Who it's for

vibe2prod is built to serve two audiences from the same run:

- **Vibe-coders** — you shipped a site with an AI tool and want to know in plain language what's blocking it from being production-ready, without having to learn what LCP, INP, or WCAG 2.5.5 mean.
- **Professional developers** — you want the exact measurement, the threshold, the reference URL, and a diff-able audit you can rerun across branches and CI.

The report is layered so both get what they need from the same output: plain-language impact on top, technical detail underneath, a full raw-tool appendix at the bottom.

## What's explicitly not included

vibe2prod does **not** make legal claims. It does not check "is your Impressum present", "do you have a GDPR-compliant cookie banner", "are you CCPA-compliant". Those questions depend on business-model and jurisdiction context that a static audit cannot reliably infer, and getting them wrong does real harm. If your site needs a compliance review, talk to a lawyer. vibe2prod stays on technical ground.

## Features

- **Dual mode** — audit a live URL or your local project. In local mode, vibe2prod builds your project in prod mode, starts the prod server locally (never the dev server, because dev bundles produce misleading Lighthouse scores), audits, and cleans up.
- **Framework-aware local builds** — Vite, Next.js, Astro, SvelteKit, Nuxt, Remix, and plain static HTML all handled out of the box.
- **Readiness Score (0–100)** — a single headline number, weighted across the 10 categories. Each finding shows how many points fixing it is worth.
- **Dual-audience report** — every finding is rendered in four lines: traffic-light headline, plain-language impact, technical detail with metric + reference URL, and a concrete fix. Vibe-coders can stop reading after line 2; pros skip straight to lines 3–4.
- **Impact grouping** — issues are organized by what users actually notice: Speed, Responsiveness, Findability, Security & Trust, Polish. The technical category label stays on every finding for pros.
- **Quantitative responsiveness** — 5-breakpoint Playwright measurements (320 / 375 / 768 / 1024 / 1280 px) produce a diff-able matrix, not a vibe.
- **Live stack-freshness check** — queries the npm registry and nodejs.org directly. Training data is 3–9 months stale and vibe2prod refuses to fall back on it.
- **AI-slop detection** — Lorem ipsum, placeholder images (`picsum.photos`, `via.placeholder.com`), broken anchors (`#`, `example.com`), fake testimonials, hallucinated meta tags, duplicate hero sections.
- **Works with any coding agent** — native Claude Code flow (audit → fix → re-test) plus a `fix-me.md` export that hands the remaining work to Cursor, Lovable, v0, or a developer with copy-paste-ready diffs and verification steps.
- **No aggressive image compression** — vibe2prod never recommends below 85 % quality. Real wins come from the right format (WebP/AVIF) and correct responsive sizes.

## Installation

vibe2prod ships as a Claude Code plugin. Install it from this repo's local marketplace:

```bash
# 1. Clone the repo
git clone https://github.com/holger1411/vibe2prod.git
cd vibe2prod

# 2. Add the local marketplace in Claude Code
claude plugin marketplace add ./

# 3. Install the plugin
claude plugin install vibe2prod@vibe2prod
```

### Dependencies

vibe2prod shells out to a few tools. Install whichever you don't already have:

```bash
npm install -g lighthouse
npm install -g @axe-core/cli
npx playwright install chromium
```

`curl` is expected to be present (it is, on macOS and most Linux distros).

Optional: set `PAGESPEED_API_KEY` to also run PageSpeed Insights against public URLs.

```bash
export PAGESPEED_API_KEY="your_key_here"
```

## Usage

### Audit a live URL

```
/vibe2prod https://example.com
```

### Audit your local project

Run `/vibe2prod` with no URL inside any project directory. vibe2prod will:

1. Detect the framework from your `package.json` (or serve static HTML if there's no build step).
2. Run the **production** build (`npm run build`).
3. Start the prod server (`npm run preview`, `npm start`, or `npx serve`) on a free port.
4. Audit against that local prod URL.
5. Shut the server down when the audit finishes.

```
/vibe2prod
```

### Mode flags

All flags are optional and combinable:

- `/vibe2prod --ship` — autopilot. Skip the issue picker, auto-fix every unambiguously safe issue, re-test, emit `fix-me.md` with the residual work.
- `/vibe2prod --export` — always write `fix-me.md` alongside the report so you can hand the work to another coding agent.
- `/vibe2prod --pro` — drop the plain-language impact line from each finding. For senior devs who want technical-only output. Readiness Score and technical appendix stay.

Combinations are valid: `/vibe2prod --ship --export`, `/vibe2prod --pro`, `/vibe2prod https://example.com --export`, etc.

## Example output (default mode)

```
## vibe2prod audit: https://example.com
Mode: remote | Date: 2026-04-21

### Readiness Score: 62/100 🟠 "Functional, but not production-grade yet"
Pulled down by slow hero loading, a broken mobile header, and leftover placeholder copy in the pricing section.

### Category scores
Performance 11/17 | Accessibility 14/17 | Responsiveness 8/17 | Security 8/12 | SEO & Meta 10/12 | AI-Slop 5/8 | Robustness 5/7 | Assets 3/5 | HTML Quality 3/3 | Stack Freshness 2/2

### Issues by impact

#### Speed
 1. 🔴 Site feels slow [Performance]
    Your hero image takes 3.2 s to appear. Visitors typically bounce around 3 s.
    LCP 3.2 s (Core Web Vitals "Poor", target < 2.5 s). LCP element: <img class="hero"> 890 KB, no fetchpriority="high", no Brotli. Ref: https://web.dev/lcp
    → Add fetchpriority="high" to hero img, serve as WebP at 90% quality, enable Brotli at hosting layer. Fix → +5.7 pts

#### Responsiveness
 2. 🔴 Header breaks on small phones [Responsiveness]
    On iPhone SE (320 px wide), your menu extends 40 px past the screen edge — visitors have to scroll sideways to see it.
    Horizontal overflow at xs: scrollWidth 360 / clientWidth 320. Offending element: <nav class="main-nav"> with fixed width: 360px. WCAG 1.4.10 Reflow.
    → Replace fixed width on .main-nav with max-width: 100%. Fix → +4.2 pts

#### Polish
 3. 🟡 Placeholder text in pricing [AI-Slop]
    Your "Enterprise" tier still says "Lorem ipsum dolor sit amet" instead of what the plan actually includes.
    Lorem ipsum detected in <section id="pricing"> > .tier-enterprise > p. Severity MEDIUM (visible body text, not hero).
    → Replace with real plan description. I can propose a draft for your approval. Fix → +2.0 pts

...

### Technical Appendix
[Responsiveness matrix, Stack Freshness table, raw tool output paths]
```

After the report:

```
> Fix 1-3
```

vibe2prod auto-applies what it can (meta tags, image format conversion, `loading="lazy"`, font self-hosting, attribute additions — always with your approval for visible copy), and prints step-by-step manual instructions for hosting-layer changes (security headers, HTTPS, caching).

Then run it again to see the diff:

```
> Test again
```

## The 10 audit categories

1. **Performance** (weight 17) — Lighthouse + optional PageSpeed Insights. Core Web Vitals (LCP, INP, CLS), render blocking, compression.
2. **Accessibility** (weight 17) — Lighthouse a11y + axe-core. Color contrast, alt text, ARIA, keyboard, touch targets, focus management.
3. **Responsiveness** (weight 17) — quantitative multi-breakpoint tests (320 / 375 / 768 / 1024 / 1280 px) via Playwright. Horizontal overflow, tap-target size (WCAG 2.5.5 + 2.5.8), body/input font-sizes, viewport meta, media-query coverage, `<img>` w/h attrs, `srcset` effectiveness, safe-area insets, content clipping. Output is a matrix, not a vibe.
4. **Security** (weight 12) — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, cookie flags, mixed content.
5. **SEO & Meta** (weight 12) — title/description lengths, Open Graph tags, Twitter cards, canonical, JSON-LD, sitemap, robots.
6. **AI-Slop Detection** (weight 8) — vibe2prod's signature check. Placeholder content (Lorem ipsum, "Your text here", "TODO"), broken anchors (`#`, `example.com`, `yoursite.com`), placeholder images (`via.placeholder.com`, `picsum.photos`), fake testimonials ("John Doe"), stock-logo walls without attribution, hallucinated meta tags, duplicate hero sections.
7. **Robustness** (weight 7) — console errors, compression (gzip/brotli), caching headers, `prefers-reduced-motion`, `prefers-color-scheme`, viewport meta, custom 404, noscript fallback.
8. **Assets** (weight 5) — image formats (WebP/AVIF), responsive `srcset`, font loading, favicons, manifest, broken links.
9. **HTML Quality** (weight 3) — W3C Nu Validator. Errors, warnings, semantic landmarks.
10. **Stack Freshness** (weight 2) — live version check against the npm registry (never training knowledge). Detects outdated meta-frameworks, base frameworks, styling libs, build tools, TypeScript, and Node runtime against the current LTS schedule. Migration-guide URLs are fetched live via Context7.

Weights sum to 100 → the Readiness Score. Stack Freshness runs in local-project mode only; in remote-URL mode its 2 points are redistributed across the other 9 categories so the score still totals 100.

## Philosophy

**Plain language plus technical rigor, not one or the other.** The report serves both a vibe-coder and a senior developer. A single finding carries the headline for the former, the measurement and reference for the latter, and a concrete fix for both.

**Live lookups over training data.** vibe2prod never answers "is this framework version current" from memory. It queries the npm registry and nodejs.org on every run. If the network is down, it says so — it does not guess.

**No aggressive compression.** Some tools happily recommend cranking JPEG quality to 60 %. vibe2prod won't go below 85 % and defaults to 90 %. The real wins are format (WebP/AVIF), responsive `srcset`, and correct loading priority — not quality reduction.

**Auto-detect over configuration.** vibe2prod tries hard to do the right thing without flags — detecting your framework, your server port, your stack. Flags exist for when it gets it wrong, or when you want a different mode (`--ship`, `--export`, `--pro`).

## Contributing

Issues and PRs welcome. If vibe2prod misses an AI-slop pattern you keep seeing, open an issue with an example — those are the highest-signal contributions. Same for frameworks that don't detect correctly in Local Project Mode.

## License

MIT © Holger Koenemann. See [LICENSE](./LICENSE).
