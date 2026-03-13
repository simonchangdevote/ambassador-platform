// ============================================================
// HOME — Redirects to Dashboard
// ============================================================
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
