// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // UPDATE THIS: Set to the client's live domain
  site: 'https://example.com',
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap()],
});
