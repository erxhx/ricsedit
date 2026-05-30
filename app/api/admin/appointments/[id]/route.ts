import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentById, dbUpdateAppointment } from '@/lib/db';
import { sendCancellationNotification, sendRescheduleNotification } from '@/lib/notifications';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const patch = await request.json();

  const existing = await dbGetAppointmentById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const updated = await dbUpdateAppointment(id, patch);
  if (!updated) return Response.json({ error: 'Update failed' }, { status: 500 });

  // Fire notifications based on what changed (fire-and-forget)
  const isCancelling  = patch.status === 'cancelled' && existing.status !== 'cancelled';
  const isRescheduling = (patch.date && patch.date !== existing.date) ||
                         (patch.startTime && patch.startTime !== existing.startTime);

  if (isCancelling)   sendCancellationNotification(existing).catch(() => {});
  else if (isRescheduling) sendRescheduleNotification(updated).catch(() => {});

  return Response.json(updated);
}
