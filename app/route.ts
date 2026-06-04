/**
 * Serves the customer-facing Edit Studio site at the root route.
 *
 * Reading index.html from editstudio.space/ and rewriting the local
 * asset paths to /site/* so they're served from Next.js's public folder.
 * The original index.html is left untouched so the live SiteGround
 * deployment keeps working during the transition.
 *
 * Route handlers bypass the Next.js layout system entirely, so the
 * full customer-site <head> (fonts, GA, structured data, etc.) is
 * served exactly as written.
 */

import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const html = await readFile(
    path.join(process.cwd(), 'editstudio.space', 'index.html'),
    'utf-8',
  );

  // Rewrite local asset paths → /site/* (served from public/site/)
  const patched = html
    .replace(/href="styles\.css"/g,          'href="/site/styles.css"')
    .replace(/href="manifest\.json"/g,        'href="/site/manifest.json"')
    .replace(/src="tweaks-panel\.jsx"/g,      'src="/site/tweaks-panel.js"')
    .replace(/src="animations\.jsx"/g,        'src="/site/animations.js"')
    .replace(/src="content\.jsx"/g,           'src="/site/content.js"')
    .replace(/src="booking\.jsx"/g,           'src="/site/booking.js"')
    .replace(/src="app\.jsx"/g,              'src="/site/app.js"')
    // Assets are already in public/assets/ — base href "/" resolves them correctly
    // Booking endpoint: same origin now, use relative path
    .replace(
      /'https:\/\/ricsedit\.vercel\.app\/api\/booking\/create'/g,
      "'/api/booking/create'",
    );

  return new Response(patched, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
