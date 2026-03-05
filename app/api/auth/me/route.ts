import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const session = cookies().get('admin_session');

  if (session && session.value === 'true') {
    return NextResponse.json({ user: { email: 'lin4s@live.dk', role: 'admin' } });
  }

  return NextResponse.json({ user: null });
}
