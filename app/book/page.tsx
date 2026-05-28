import type { Metadata } from 'next';
import BookingFlow from '@/components/booking/BookingFlow';
import { getServicesStore } from '@/lib/services-store';

export const metadata: Metadata = {
  title: 'Book — Edit Studio',
  description: 'Book a barbering, spray tan, or waxing appointment at Edit Studio, Oak Bay.',
};

export default function BookPage() {
  const servicesData = getServicesStore();
  return <BookingFlow servicesData={servicesData} />;
}
