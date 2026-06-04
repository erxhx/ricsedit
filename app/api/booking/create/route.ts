/**
 * Public booking endpoint — called by the static editstudio.space site.
 * No auth required. Accepts the booking payload from booking.jsx and
 * writes the appointment to Supabase.
 */

import { NextRequest } from 'next/server';
import { dbCreateAppointment } from '@/lib/db';
import { sendBookingConfirmation } from '@/lib/notifications';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Pre-flight request from the browser
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

interface BookingService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BookingPayload {
  category: 'barber' | 'tan' | 'wax';
  services: BookingService[];
  addons: BookingService[];
  date: string;        // ISO string from date.toISOString()
  time: { h: number; m: number };
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BookingPayload & { intakeResponses?: Record<string, unknown> };
    const { category, services, addons, date, time, client, intakeResponses } = body;

    if (!category || !services?.length || !date || !time || !client?.firstName) {
      return Response.json(
        { error: 'Missing required booking fields' },
        { status: 400, headers: CORS },
      );
    }

    // Staff: barber → eric, tan/wax → livi
    const staff = category === 'barber' ? 'eric' : 'livi';

    // Date string: "YYYY-MM-DD" (date comes in as ISO from the browser)
    const dateStr = new Date(date).toISOString().slice(0, 10);

    // Time
    const startTime = `${pad(time.h)}:${pad(time.m ?? 0)}`;

    // Combine services + add-ons
    const allServices = [...services, ...(addons ?? [])];
    const serviceName = allServices.map((s) => s.name).join(' + ');
    const totalDuration = allServices.reduce((sum, s) => sum + (s.duration || 0), 0) || 30;
    const totalPrice = allServices.reduce((sum, s) => sum + (s.price || 0), 0);

    const endTime = addMinutes(startTime, totalDuration);
    const clientName = `${client.firstName.trim()} ${client.lastName.trim()}`.trim();

    const apt = await dbCreateAppointment({
      date: dateStr,
      startTime,
      endTime,
      staff,
      clientName,
      clientEmail: client.email?.trim() ?? '',
      clientPhone: client.phone?.trim() ?? '',
      service: serviceName,
      durationMinutes: totalDuration,
      price: totalPrice,
      status: 'confirmed',
      notes: client.notes?.trim() || undefined,
      intakeResponses: intakeResponses && Object.keys(intakeResponses).length
        ? { category, fields: intakeResponses }
        : undefined,
    });

    // Await so Vercel doesn't terminate the function before the sends complete
    await sendBookingConfirmation(apt).catch(() => {});

    return Response.json(
      { ok: true, id: apt.id, manageToken: apt.manageToken },
      { headers: CORS },
    );
  } catch (e) {
    console.error('[booking/create]', e);
    return Response.json(
      { error: e instanceof Error ? e.message : 'Booking failed' },
      { status: 500, headers: CORS },
    );
  }
}
