# vibe2prod

> Take AI-generated websites from "it works on my localhost" to shippable.

**vibe2prod** is a Claude Code plugin that audits websites across **11 categories** — performance, accessibility, SEO, HTML quality, security, legal compliance, assets, robustness, AI-slop artifacts, responsiveness (quantitative multi-breakpoint tests), and stack freshness (live npm-registry version checks, never training knowledge) — then helps you fix the issues and re-test.

It's built for the vibe-coder era: if you shipped with Lovable, v0, Bolt, Cursor, Claude Code, or any other AI-assisted builder, vibe2prod catches the stuff those tools don't: leftover Lorem ipsum, placeholder images, `example.com` links, fake "John Doe" testimonials, hallucinated OG tags, duplicate hero sections, missing security headers, Google Fonts via CDN (which is a GDPR issue in Germany), and so on.

## Features

- **Dual mode** — audit a live URL *or* your local project (vibe2prod builds your project in prod mode, starts the prod server locally, audits, and cleans up).
- **Framework-aware local builds** — Vite, Next.js, Astro, SvelteKit, Nuxt, Remix, and plain static HTML all handled out of the box.
- **Auto-detected legal region** — vibe2prod figures out whether GDPR, CCPA, or German-specific rules apply from `lang`, TLD, hreflang, and Impressum links. Ambiguous? It asks.
- **AI-slop detection** — placeholder content, broken anchors, placeholder images, fake social proof, hallucinated meta tags, duplicate sections.
- **Iterative fix loop** — choose which issues to fix (`"Fix 1-5, 7"`), apply auto-fixes, get manual-fix instructions for server/hosting issues, then re-test and see before/after scores.
- **No aggressive image compression** — vibe2prod never recommends below 85 % quality. Real wins come from the right format and correct responsive sizes.

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
/vibe2prod https://example.com --region=de
```

### Audit your local project

Run `/vibe2prod` with no URL inside any project directory. vibe2prod will:

1. Detect the framework from your `package.json` (or serve static HTML if there's no build step).
2. Run the **production** build (`npm run build`) — never the dev server, because dev bundles produce misleading Lighthouse scores.
3. Start the prod server (`npm run preview`, `npm start`, or `npx serve`) on a free port.
4. Audit against that local prod URL.
5. Shut the server down when the audit finishes.

```
/vibe2prod
/vibe2prod --region=eu
```

## Example output

```
## vibe2prod audit: https://example.com
Mode: remote | Region: eu | Date: 2026-04-21

### Summary
Performance: 72 | Accessibility: 88 | SEO: 91 | HTML: Pass (0 errors) | Security: 4 issues | Legal: 2 issues | Assets: 3 issues | Robustness: 1 issue | AI-Slop: 5 issues

### Issues (19 found)

 1. [CRITICAL] [AI-Slop] Hero headline contains "Your heading here"
    → Replace placeholder headline in index.html line 42 with real value proposition.

 2. [CRITICAL] [Security] No HTTPS — site served over plain HTTP
    → Configure HTTPS at the hosting layer (Vercel/Netlify/Cloudflare enable this automatically).

 3. [HIGH] [Legal] Google Fonts loaded via CDN (LG München ruling applies for region=de/eu)
    → Self-host the font files; vibe2prod can do this for you (say "Fix 3").

 4. [HIGH] [AI-Slop] Testimonial section uses "John Doe", "Jane Smith", "Sarah Johnson" placeholders
    → Replace with real customers or remove the section until you have genuine quotes.

...
```

After the report, you pick what to fix:

```
> Fix 1, 3-5, 7
```

vibe2prod auto-applies what it can (meta tags, image format conversion, `loading="lazy"`, font self-hosting, placeholder swaps — with your approval for visible copy), and prints step-by-step manual instructions for everything that needs hosting-layer changes (security headers, HTTPS, caching).

Then run it again to see the diff:

```
> Test again
```

## The 11 audit categories

1. **Performance** — Lighthouse + (optional) PageSpeed Insights. Core Web Vitals, render blocking, compression.
2. **Accessibility** — Lighthouse a11y + axe-core. Color contrast, alt text, ARIA, keyboard, touch targets.
3. **SEO & Meta** — title/description lengths, OG tags, Twitter cards, canonical, JSON-LD, sitemap, robots.
4. **HTML Quality** — W3C Nu Validator. Errors, warnings, semantic landmarks.
5. **Security** — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, cookie flags, mixed content.
6. **Legal** (auto-detected region with interactive fallback) — GDPR/Impressum/Datenschutz for `de`, generic GDPR for `eu`, CCPA/GPC for `us`. Technical heuristics only — not legal advice.
7. **Assets** — image formats (WebP/AVIF), responsive `srcset`, font loading, favicons, manifest, broken links.
8. **Robustness** — console errors, compression, caching, `prefers-reduced-motion`, `prefers-color-scheme`, viewport, custom 404, noscript.
9. **AI-Slop** — vibe2prod's signature check. Placeholder content (Lorem ipsum, "Your text here", "TODO"), broken anchors (`#`, `example.com`, `yoursite.com`), placeholder images (`via.placeholder.com`, `picsum.photos`), fake testimonials ("John Doe"), stock-logo walls, hallucinated meta tags, duplicate sections.
10. **Responsiveness** — quantitative multi-breakpoint tests (320 / 375 / 768 / 1024 / 1280 px) via Playwright. Horizontal overflow, tap-target size (WCAG 2.5.5 + 2.5.8), body/input font-sizes, viewport meta, media-query coverage, `<img>` width/height attrs, `srcset` effectiveness, safe-area insets, content clipping. Output is a matrix, not a vibe.
11. **Stack Freshness** — live version check against the npm registry (never training knowledge, which is 3–9 months stale). Detects outdated meta-frameworks (Next.js, Nuxt, Astro, SvelteKit, Remix), base frameworks, styling libs, build tools, TypeScript, and Node runtime against the current LTS schedule. Migration-guide URLs are fetched live via Context7.

## Philosophy

**AI-generated sites aren't "slop" — they're drafts.** vibe2prod's job is to close the gap between draft and prod, not to shame the author. Every check has a concrete, actionable fix attached, and every fix that touches user-visible copy is proposed (not silently applied).

**Auto-detect over configuration.** vibe2prod tries hard to do the right thing without flags — detecting your framework, your region, your server port. Flags exist for when it gets it wrong.

**No aggressive compression.** Some tools will happily recommend cranking JPEG quality down to 60 %. vibe2prod won't go below 85 % and defaults to 90 %. The real wins are format (WebP/AVIF), responsive `srcset`, and correct loading priority — not quality reduction.

## Contributing

Issues and PRs welcome. If vibe2prod misses an AI-slop pattern you keep seeing, open an issue with an example — those are the highest-signal contributions.

## License

MIT © Holger Koenemann. See [LICENSE](./LICENSE).
