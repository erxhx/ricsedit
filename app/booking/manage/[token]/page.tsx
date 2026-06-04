import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { dbGetAppointmentByToken } from '@/lib/db';
import ManageBooking from '@/components/booking/ManageBooking';

export const metadata: Metadata = {
  title: 'Manage your appointment — Edit Studio',
  robots: 'noindex',
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const apt = await dbGetAppointmentByToken(token);
  if (!apt) notFound();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-sm mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo-black.png" alt="Edit Studio" style={{ height: 69, width: 'auto', opacity: 0.7, marginBottom: 24, display: 'block', margin: '0 auto 24px' }} />
        <ManageBooking apt={apt} token={token} />
      </div>
    </main>
  );
}
