import { redirect } from 'next/navigation';

// Redirect root to the landing page
export default function HomePage() {
  redirect('/landing');
}
