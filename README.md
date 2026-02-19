# Coleman Web Dev — Starter Template

Base template for client websites. Built with [Astro](https://astro.build), deployed to [Vercel](https://vercel.com).

## New Client Setup

### 1. Create the repo
- Go to the `coleman-web-dev/starter-template` repo on GitHub
- Click **"Use this template"** → **"Create a new repository"**
- Name it `clientname-site` (e.g., `bobs-plumbing-site`)

### 2. Clone & install
```bash
git clone https://github.com/coleman-web-dev/clientname-site.git
cd clientname-site
npm install
```

### 3. Configure for the client
Update these files with client-specific info:

**`astro.config.mjs`** — Set the `site` URL:
```js
site: 'https://clientdomain.com',
```

**`src/layouts/Base.astro`** — Update business info:
```js
const BUSINESS_NAME = 'Client Business Name';
const PHONE = '(555) 123-4567';
const EMAIL = 'client@email.com';
const ADDRESS = '123 Main St, City, ST 12345';
```

**`src/styles/global.css`** — Update brand colors & fonts:
```css
--color-primary: #2563eb;         /* Client's brand color */
--color-primary-rgb: 37, 99, 235; /* Same as RGB */
--font-display: 'Georgia', serif;  /* Client's heading font */
--font-body: 'system-ui', sans-serif; /* Client's body font */
```

**`public/robots.txt`** — Update the sitemap URL
**`public/favicon.svg`** — Replace with client's favicon

### 4. Develop
```bash
npm run dev     # Start dev server at localhost:4321
npm run build   # Production build
npm run preview # Preview production build locally
```

### 5. Deploy to Vercel
1. Push the repo to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click **"Add New Project"** → Import the repo
4. Deploy settings are auto-detected (Astro framework)
5. Add client's custom domain in **Settings → Domains**

Every `git push` to `main` auto-deploys.

## Project Structure

```
src/
├── components/
│   ├── Nav.astro          # Responsive navigation (mobile hamburger)
│   ├── Footer.astro       # Site footer with contact info
│   ├── ContactForm.astro  # Contact form component
│   ├── SEO.astro          # Meta tags (OG, Twitter, canonical)
│   └── Schema.astro       # JSON-LD structured data
├── layouts/
│   └── Base.astro         # Page shell (head, nav, footer)
├── pages/
│   ├── index.astro        # Homepage
│   ├── about.astro        # About page
│   ├── contact.astro      # Contact page with form
│   └── 404.astro          # 404 error page
└── styles/
    └── global.css         # CSS variables, reset, base styles
```

## Adding Pages

Create a new `.astro` file in `src/pages/`:

```astro
---
import Base from '../layouts/Base.astro';
import Schema from '../components/Schema.astro';
---

<Base
  title="Page Title — Business Name"
  description="Page description for search results."
>
  <Schema
    type="LocalBusiness"
    name="Business Name"
    breadcrumbs={[
      { name: 'Home', url: '/' },
      { name: 'Page Title', url: '/page-slug' },
    ]}
  />

  <section class="section">
    <div class="container">
      <h1>Page Title</h1>
      <!-- Content here -->
    </div>
  </section>
</Base>
```

## Tech Stack
- **Astro** — Static site generator
- **Vercel** — Hosting & deployment
- **@astrojs/sitemap** — Auto-generates sitemap.xml
- **@astrojs/vercel** — Vercel deployment adapter
