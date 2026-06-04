/**
 * Catch-all handler for SPA paths (e.g. /barbering, /sunless, /waxing, /visit, /home).
 *
 * The customer site uses client-side pushState routing. When the user refreshes
 * on one of those paths the server sees an unknown URL and would 404. This
 * handler returns the same index.html for any path not matched by a more
 * specific Next.js route (/admin/*, /api/*, /book, /booking/*, /privacy).
 *
 * Next.js route priority ensures specific routes still win:
 *   /admin      → app/admin/...
 *   /api        → app/api/...
 *   /privacy    → app/privacy/route.ts
 *   /booking/*  → app/booking/...
 *   everything else → this catch-all
 */

import { readFile } from 'fs/promises';
import path from 'path';

async function serveApp() {
  const html = await readFile(
    path.join(process.cwd(), 'editstudio.space', 'index.html'),
    'utf-8',
  );

  const patched = html
    .replace(/href="styles\.css"/g,          'href="/site/styles.css"')
    .replace(/href="manifest\.json"/g,        'href="/site/manifest.json"')
    .replace(/src="tweaks-panel\.jsx"/g,      'src="/site/tweaks-panel.js"')
    .replace(/src="animations\.jsx"/g,        'src="/site/animations.js"')
    .replace(/src="content\.jsx"/g,           'src="/site/content.js"')
    .replace(/src="booking\.jsx"/g,           'src="/site/booking.js"')
    .replace(/src="app\.jsx"/g,              'src="/site/app.js"')
    .replace(
      /'https:\/\/ricsedit\.vercel\.app\/api\/booking\/create'/g,
      "'/api/booking/create'",
    );

  return new Response(patched, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET() {
  return serveApp();
}
