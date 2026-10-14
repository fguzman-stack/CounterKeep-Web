import { defineConfig } from 'astro/config';

// Set SITE_URL to the real public domain before publishing.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  output: 'static',
});
