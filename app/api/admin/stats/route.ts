import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const adminSession = cookies().get('admin_session');

    // Secure the admin route
    let isAdmin = false;
    if (session && session.role === 'admin') isAdmin = true;
    if (adminSession && adminSession.value === 'true') isAdmin = true;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Try database stats, fallback to defaults if DB is down
    let activeUsers = 0;
    let totalGenerations = 0;
    let status = 'Operational';

    try {
      const { db } = await import('@/db');
      const { usersTable, generationsTable } = await import('@/db/schema');
      const { count } = await import('drizzle-orm');

      const totalUsersQuery = await db.select({ value: count() }).from(usersTable);
      const totalGenerationsQuery = await db.select({ value: count() }).from(generationsTable);

      activeUsers = totalUsersQuery[0]?.value || 0;
      totalGenerations = totalGenerationsQuery[0]?.value || 0;
    } catch (dbErr) {
      console.warn('DB unavailable for admin stats:', (dbErr as Error).message);
      status = 'Database Offline';
    }

    return NextResponse.json({
      activeUsers,
      totalGenerations,
      status,
    });

  } catch (err: unknown) {
    console.error('Admin Stats extraction failed:', err);
    return NextResponse.json({ error: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
