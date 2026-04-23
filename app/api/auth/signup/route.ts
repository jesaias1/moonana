import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Invalid email or password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const isAdmin = email === 'lin4s@live.dk';
    const id = randomUUID();
    const role = isAdmin ? 'admin' : 'user';

    // Try DB-based signup first
    let dbSuccess = false;
    try {
      const { db } = await import('@/db');
      const { usersTable } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      const { hash } = await import('bcrypt');

      const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
      }

      const hashedPassword = await hash(password, 10);
      await db.insert(usersTable).values({
        id,
        email,
        passwordHash: hashedPassword,
        role,
        tokenBalance: 7,
      });
      dbSuccess = true;
    } catch (dbErr) {
      console.warn('DB unavailable for signup, using session-only mode:', (dbErr as Error).message);
    }

    // Create session regardless of DB state
    const token = await signToken({ id, email, role });
    cookies().set('aijourney_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      role,
      dbPersisted: dbSuccess,
    });
  } catch (err: unknown) {
    console.error('Signup Error:', err);
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }
}
