import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const paths = ['', 'es/', 'help/', 'es/help/', 'privacy/', 'es/privacy/', 'terms/', 'es/terms/'];
  const urls = site ? paths.map(path => `<url><loc>${new URL(`${base}/${path}`, site).href.replace(/&/g, '&amp;')}</loc></url>`).join('') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
