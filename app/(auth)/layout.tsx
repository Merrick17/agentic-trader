import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('matrix_session')?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black">
      {children}
    </div>
  );
}
