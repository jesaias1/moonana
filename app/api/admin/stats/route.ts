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
    
    // Estimate Revenue based on tokens?    // Simple math: calculate approximate revenue.
    // Assuming starting tokens is 7, every extra token bought is 10 cents ($5.00 / 50).
    // Note: totalTokens and totalUsers would need to be fetched for this calculation to be meaningful.
    // For now, this is a placeholder comment as the variables are not defined in this scope.
    // const payingUsersEstimate = totalTokens > (totalUsers * 7) 
    //     ? ((totalTokens - (totalUsers * 7)) * 0.10) 
    //     : 0;

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
