import { redirect } from 'next/navigation';

export default function DealerRootPage() {
  // This component's only job is to redirect any traffic
  // from /dealer to the /dealer/jackets page.
  redirect('/dealer/jackets');
}