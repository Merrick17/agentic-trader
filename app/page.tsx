import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('matrix_session')?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      redirect('/dashboard');
    }
  }

  redirect('/sign-in');
}
