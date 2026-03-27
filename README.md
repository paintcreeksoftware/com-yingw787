# yingw787.com

Personal portfolio website for Ying Wang — software engineer and founder based
near Washington, D.C. Built on the [Tailwind Plus
Spotlight](https://tailwindcss.com/plus) template with Next.js.

**Live site:** <https://yingw787.com>

## Tech stack

- **[Next.js](https://nextjs.org)** (App Router, static export)
- **[Tailwind CSS](https://tailwindcss.com)** v4
- **[TypeScript](https://www.typescriptlang.org)**
- **[Headless UI](https://headlessui.dev)** +
  **[Heroicons](https://heroicons.com)**
- **[Firebase Hosting](https://firebase.google.com/docs/hosting)** (deployed
  from `out/`)

## Development

Install dependencies and create a local env file:

```bash
npm ci
cp .env.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site hot-reloads as you
edit files in `src/`.

## Build & deploy

```bash
npm run build        # generates static output in out/
```

The `out/` directory is deployed to Firebase Hosting. Firebase config is in
`firebase.json`.

## Quality checks

```bash
npm run typecheck          # TypeScript type check
npm run lint               # ESLint
npm run check              # types + lint + format (all at once)
npm run fix                # auto-fix lint and formatting issues
npm run check-bundle-size  # verify JS/CSS bundle limits (JS: 265kB, CSS: 31kB)
npm run check-dead-links   # verify internal links
npm run check-external-links  # verify external links
```

## Project structure

```text
src/
├── app/           # Next.js App Router pages
│   ├── page.tsx   # Homepage (hero, testimonials, social links)
│   └── layout.tsx # Root layout
├── components/    # Reusable React components
│   ├── Header.tsx         # Animated avatar header
│   ├── Footer.tsx
│   ├── TestimonialSection.tsx
│   └── ...
├── images/        # Avatars and static images
├── lib/           # Utility functions
└── styles/        # Global CSS and Prism syntax highlighting
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site (e.g. `https://yingw787.com`) |

## License

Site content and customizations are proprietary. The underlying template is
licensed under the [Tailwind Plus
license](https://tailwindcss.com/plus/license).
