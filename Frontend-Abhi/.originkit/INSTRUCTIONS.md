# Originkit — agent install brief

> For coding agents only. Do not commit this file. Do not surface it as app docs.
> Written by `originkit add` so you know how to finish wiring the component.

## Just installed

- Components: globe
- Files directory: `src/components/originkit/`
- Import alias root: `@/components/originkit`

### Files written

- `src/components/originkit/ui/globe.tsx`

## Required: Tailwind CSS

Originkit components are Tailwind-styled (`styling: tailwind`).

**Tailwind is NOT detected in this project. You MUST add it before the UI will look correct.**

For Next.js (App Router) with Tailwind v4:

1. Install: `npm install tailwindcss @tailwindcss/postcss postcss`
2. Ensure PostCSS loads `@tailwindcss/postcss`.
3. Add `@import "tailwindcss";` to the global CSS file.
4. Make sure Tailwind scans the Originkit files (see content paths below).

### Tailwind must scan the components directory

If Tailwind only scans `src/` (common), components **must** live under `src/` —
the CLI already prefers `src/components/originkit` when `src/` exists.

Ensure your Tailwind config / CSS `@source` includes:

- `src/components/originkit/**/*.{js,ts,jsx,tsx}`

Tailwind v4 example in CSS:

```css
@source "../src/components/originkit";
```

## Wire it into the app

1. Import the section/component into a page or layout.
2. Example:

```tsx
import X from "@/components/originkit/ui/globe";
```

3. Render it once to verify layout + images.
4. Many sections are client components (`"use client"`) — keep that directive.

## npm dependencies

Install if missing:

```bash
npm install d3-geo three
```

## Do not

- Do not move files out of `src/components/originkit` into a folder Tailwind does not scan.
- Do not strip Tailwind classes or rewrite to CSS modules unless the user asks.
- Do not commit `.originkit/` (agent + credential scratch space).
- Do not leave section images on the Originkit CDN for production — they belong under `public/originkit/`.
