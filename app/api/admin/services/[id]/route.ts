import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { updateService } from '@/lib/services-store';
import type { Service } from '@/lib/services';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Partial<Pick<Service, 'name' | 'price' | 'durationMinutes' | 'description'>>;

  if (body.name !== undefined && !body.name.trim()) {
    return Response.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (body.price !== undefined && (isNaN(body.price) || body.price < 0)) {
    return Response.json({ error: 'Invalid price' }, { status: 400 });
  }
  if (body.durationMinutes !== undefined && (isNaN(body.durationMinutes) || body.durationMinutes < 0)) {
    return Response.json({ error: 'Invalid duration' }, { status: 400 });
  }

  const updated = updateService(id, body);
  if (!updated) return Response.json({ error: 'Service not found' }, { status: 404 });

  return Response.json(updated);
}
