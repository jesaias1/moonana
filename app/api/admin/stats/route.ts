import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { usersTable, generationsTable } from '@/db/schema';
import { count } from 'drizzle-orm';

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

    // Perform database aggregations
    const totalUsersQuery = await db.select({ value: count() }).from(usersTable);
    const totalGenerationsQuery = await db.select({ value: count() }).from(generationsTable);

    const activeUsers = totalUsersQuery[0]?.value || 0;
    const totalGenerations = totalGenerationsQuery[0]?.value || 0;
    
    // Estimate Revenue based on tokens? Or just static representation for MVP
    // Assuming starting tokens is 10, every extra token bought is 2 cents ($2.00 / 100).
    // We could calculate this from a 'purchases' table but we omitted it for a simpler webhook.
    // For now we will return the dynamic counts.

    return NextResponse.json({
      activeUsers,
      totalGenerations,
      status: 'Operational', // Could ping the DB to verify
    });

  } catch (err: unknown) {
    console.error('Admin Stats extraction failed:', err);
    return NextResponse.json({ error: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
