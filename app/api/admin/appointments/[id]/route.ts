import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import { dbGetAppointmentById, dbUpdateAppointment } from '@/lib/db';
import { sendCancellationNotification, sendRescheduleNotification, sendNoShowNotification } from '@/lib/notifications';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // `notify` controls reschedule notification; `noShowSms` opts in to SMS on no-show; `cancellationNote` is an optional message included in admin cancellation emails
  const { notify = true, noShowSms = false, cancellationNote = '', ...patch } = await request.json();

  const existing = await dbGetAppointmentById(id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const updated = await dbUpdateAppointment(id, patch);
  if (!updated) return Response.json({ error: 'Update failed' }, { status: 500 });

  // Fire notifications based on what changed (fire-and-forget)
  const isCancelling   = patch.status === 'cancelled' && existing.status !== 'cancelled';
  const isNoShow       = patch.status === 'no_show'   && existing.status !== 'no_show';
  const isRescheduling = (patch.date      && patch.date      !== existing.date) ||
                         (patch.startTime && patch.startTime !== existing.startTime);

  if (isCancelling)            sendCancellationNotification(existing, 'admin', cancellationNote || undefined).catch(() => {});
  else if (isNoShow)           sendNoShowNotification(existing, { sms: noShowSms }).catch(() => {});
  else if (isRescheduling && notify) sendRescheduleNotification(updated).catch(() => {});

  return Response.json(updated);
}
