import { getWaiverConfig } from '@/lib/waiver-store';

export async function GET() {
  const config = await getWaiverConfig();
  return Response.json(config);
}
