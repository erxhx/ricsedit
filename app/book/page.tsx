import type { Metadata } from 'next';
import BookingFlow from '@/components/booking/BookingFlow';
import { getServicesStore } from '@/lib/services-store';
import { getAvailabilityConfig } from '@/lib/availability-store';

export const metadata: Metadata = {
  title: 'Book — Edit Studio',
  description: 'Book a barbering, spray tan, or waxing appointment at Edit Studio, Oak Bay.',
};

export default async function BookPage() {
  const servicesData = getServicesStore();
  const availability = await getAvailabilityConfig();
  return <BookingFlow servicesData={servicesData} availability={availability} />;
}
