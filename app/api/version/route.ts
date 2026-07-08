/**
 * Build fingerprint — polled by the admin PWA to detect new deploys.
 * Returns the Vercel commit SHA (or 'dev' locally). No auth: it exposes
 * nothing beyond what response headers already reveal.
 */

export async function GET() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 12);
  return Response.json(
    { version: sha },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
