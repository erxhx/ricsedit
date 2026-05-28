import { getAppointmentByToken } from '@/lib/admin-mock';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const apt = getAppointmentByToken(token);
  if (!apt) return Response.json({ error: 'Not found' }, { status: 404 });

  // Return only fields needed by the client — never expose manageToken
  const { id, clientName, service, date, startTime, endTime, durationMinutes, price, status, staff } = apt;
  return Response.json({ id, clientName, service, date, startTime, endTime, durationMinutes, price, status, staff });
}
