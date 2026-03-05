import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe Secret Key not found in environment variables.' },
        { status: 500 }
      );
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const userSession = await getSession();

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      metadata: {
        userId: userSession?.id ? String(userSession.id) : 'anonymous',
        tokens: '100',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '100 Moonana Generation Tokens',
              description: 'Ultra-fast Gemini 3.1 Flash generations. Includes 20% platform infrastructure fee.',
              images: [`${protocol}://${host}/logo.png`],
            },
            unit_amount: 200, // $2.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${protocol}://${host}/studio?success=true`,
      cancel_url: `${protocol}://${host}/studio?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
