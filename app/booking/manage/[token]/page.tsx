import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAppointmentByToken } from '@/lib/admin-mock';
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
  const apt = getAppointmentByToken(token);
  if (!apt) notFound();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-sm mx-auto">
        <p className="text-xs tracking-widest uppercase opacity-40 mb-6">Edit Studio</p>
        <ManageBooking apt={apt} token={token} />
      </div>
    </main>
  );
}
