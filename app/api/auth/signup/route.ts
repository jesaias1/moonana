import { NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Invalid email or password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    }

    // Hash password and assign role
    const hashedPassword = await hash(password, 10);
    const isAdmin = email === 'lin4s@live.dk'; // Hardcoded admin check
    const id = randomUUID();

    await db.insert(usersTable).values({
      id,
      email,
      passwordHash: hashedPassword,
      role: isAdmin ? 'admin' : 'user',
      tokenBalance: 7, // Default signup bonus
    });

    // Create session
    const token = await signToken({ id, email, role: isAdmin ? 'admin' : 'user' });
    cookies().set('aijourney_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true, role: isAdmin ? 'admin' : 'user' });
  } catch (err: unknown) {
    console.error('Signup Error:', err);
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }
}
