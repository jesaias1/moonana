import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Vercel Edge functions can't easily parse raw bodies for Stripe signature validation,
// so this route should generally lean Node.js or use manual buffer concatenation.
// We'll use the Node.js runtime for this specific route.
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-02-25.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.warn('Missing Stripe signature or Webhook Secret inside env.');
      return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown Error';
      console.error('Webhook signature verification failed:', msg);
      return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
    }

    // Handle checkout session completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const tokensToAddStr = session.metadata?.tokens;

      if (userId && tokensToAddStr) {
        const tokensToAdd = parseInt(tokensToAddStr, 10);
        
        // Deposit the tokens into the exact User's database row
        await db.update(usersTable)
          .set({ tokenBalance: sql`${usersTable.tokenBalance} + ${tokensToAdd}` })
          .where(eq(usersTable.id, userId));
          
        console.log(`Successfully deposited ${tokensToAdd} tokens to user ${userId} via Stripe payment.`);
      } else {
        console.warn('Checkout Session completed, but metadata (userId/tokens) was missing!', session.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook handler failed:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
