import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import {
  updateService, removeServiceFromStore, saveServicesStore,
  getServicesStoreAsync, getAllServices,
} from '@/lib/services-store';
import { canEditCategory } from '@/lib/staff';
import type { Service } from '@/lib/services';

/**
 * Resolves a service id to the category that governs it, after making sure the
 * persisted menu is loaded. Returns null when no such service exists — the
 * caller turns that into a 404, so a restricted staff member can't use the
 * difference between 403 and 404 to probe other people's menus.
 */
async function categoryOf(id: string) {
  await getServicesStoreAsync();
  return getAllServices().find((s) => s.id === id)?.category ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const category = await categoryOf(id);
  if (!category) return Response.json({ error: 'Service not found' }, { status: 404 });
  if (!canEditCategory(session.sub, category)) {
    return Response.json({ error: 'Not your service category' }, { status: 403 });
  }

  const body = await req.json() as Partial<Pick<Service, 'name' | 'price' | 'durationMinutes' | 'description' | 'requiresWaiver'>>;

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

  // Fire-and-forget persist — don't block the response on Supabase latency
  saveServicesStore().catch(() => {});

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const category = await categoryOf(id);
  if (!category) return Response.json({ error: 'Service not found' }, { status: 404 });
  if (!canEditCategory(session.sub, category)) {
    return Response.json({ error: 'Not your service category' }, { status: 403 });
  }

  const removed = removeServiceFromStore(id);
  if (!removed) return Response.json({ error: 'Service not found' }, { status: 404 });

  saveServicesStore().catch(() => {});
  return Response.json({ ok: true });
}
