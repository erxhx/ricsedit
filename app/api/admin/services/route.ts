import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import {
  addServiceToStore,
  saveServicesStore,
  getServicesStoreAsync,
  categoryForTarget,
  type AddTarget,
} from '@/lib/services-store';
import { canEditCategory } from '@/lib/staff';
import type { Service } from '@/lib/services';

async function requireAuth() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/** Slug an arbitrary string into a safe id prefix. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service';
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    name?: string;
    description?: string;
    price?: number;
    durationMinutes?: number;
    requiresWaiver?: boolean;
    addTarget?: AddTarget;
  };

  const { name, description = '', price = 0, durationMinutes = 30, requiresWaiver = false, addTarget } = body;

  if (!name?.trim())   return Response.json({ error: 'Name is required' }, { status: 400 });
  if (!addTarget)      return Response.json({ error: 'addTarget is required' }, { status: 400 });
  if (price < 0)       return Response.json({ error: 'Invalid price' }, { status: 400 });
  if (durationMinutes < 0) return Response.json({ error: 'Invalid duration' }, { status: 400 });

  const category = categoryForTarget(addTarget);

  // Restricted staff may only add to their own categories.
  if (!canEditCategory(session.sub, category)) {
    return Response.json({ error: 'Not your service category' }, { status: 403 });
  }

  // Load the persisted menu before mutating it — otherwise a cold process
  // appends to a freshly seeded store and the save overwrites real edits.
  await getServicesStoreAsync();

  const id = `${slugify(name.trim())}-${Date.now().toString(36)}`;

  const service: Service = {
    id,
    name:            name.trim(),
    description:     description.trim(),
    category,
    price,
    durationMinutes,
    requiresWaiver,
    isAddon:         addTarget.kind === 'tanAddon' || addTarget.kind === 'lashAddon',
  };

  addServiceToStore(service, addTarget);
  saveServicesStore().catch(() => {});

  return Response.json(service, { status: 201 });
}
