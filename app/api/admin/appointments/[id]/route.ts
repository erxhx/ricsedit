import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbUpdateAppointment } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const patch = await request.json();
  const updated = await dbUpdateAppointment(id, patch);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}
