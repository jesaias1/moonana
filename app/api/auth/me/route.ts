import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (session) {
    return NextResponse.json({ user: session });
  }

  // Fallback for previous hardcore admin
  const adminSession = cookies().get('admin_session');
  if (adminSession && adminSession.value === 'true') {
    return NextResponse.json({ user: { email: 'lin4s@live.dk', role: 'admin' } });
  }

  return NextResponse.json({ user: null });
}
