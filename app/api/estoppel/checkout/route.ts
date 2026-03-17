import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type { EstoppelSettings } from '@/lib/types/database';

const CheckoutSchema = z.object({
  communityId: z.string().uuid(),
  requesterFields: z.record(z.string(), z.string()),
  requestType: z.enum(['standard', 'expedited']),
  deliveryEmail: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

/**
 * POST /api/estoppel/checkout
 * Creates a Stripe Checkout Session for an estoppel certificate request.
 * PUBLIC endpoint (no auth required) - rate limited.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests per IP per 15 minutes
    const ip = getClientIp(req);
    const rl = rateLimit(`estoppel-checkout:${ip}`, 5);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { communityId, requesterFields, requestType, deliveryEmail, successUrl, cancelUrl } = parsed.data;

    const supabase = createAdminClient();

    // Fetch community + estoppel settings
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, slug, theme')
      .eq('id', communityId)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const theme = community.theme as Record<string, unknown> | null;
    const estoppelSettings = theme?.estoppel_settings as EstoppelSettings | undefined;

    if (!estoppelSettings?.enabled) {
      return NextResponse.json({ error: 'Estoppel certificates are not available for this community' }, { status: 400 });
    }

    if (!estoppelSettings.template || !estoppelSettings.fields?.length) {
      return NextResponse.json({ error: 'Estoppel template is not configured' }, { status: 400 });
    }

    // Calculate fee
    let feeAmount = requestType === 'expedited'
      ? estoppelSettings.expedited_fee
      : estoppelSettings.standard_fee;

    // Check for delinquency surcharge by looking up unit from lot_number
    const lotNumber = requesterFields.lot_number?.trim();
    let unitId: string | null = null;
    let isDelinquent = false;

    if (lotNumber) {
      const { data: unit } = await supabase
        .from('units')
        .select('id, status')
        .eq('community_id', communityId)
        .eq('unit_number', lotNumber)
        .single();

      if (unit) {
        unitId = unit.id;
        if (unit.status === 'past_due') {
          isDelinquent = true;
          feeAmount += estoppelSettings.delinquent_surcharge || 0;
        }
      }
    }

    if (feeAmount <= 0) {
      return NextResponse.json({ error: 'Invalid fee configuration' }, { status: 500 });
    }

    // Get Stripe account for this community
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      return NextResponse.json({ error: 'Payment processing is not configured for this community' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const isConnect = stripeAccount.mode === 'connect' && stripeAccount.stripe_account_id;

    // Store requester fields in metadata (handle 500-char Stripe limit)
    const requesterJson = JSON.stringify(requesterFields);
    const metadata: Record<string, string> = {
      type: 'estoppel',
      community_id: communityId,
      request_type: requestType,
      delivery_email: deliveryEmail,
      unit_id: unitId || '',
      is_delinquent: isDelinquent ? '1' : '0',
    };

    if (requesterJson.length <= 500) {
      metadata.requester_fields = requesterJson;
    } else {
      // Split across multiple keys
      const chunks = requesterJson.match(/.{1,490}/g) || [];
      chunks.forEach((chunk, i) => {
        metadata[`requester_fields_${i}`] = chunk;
      });
      metadata.requester_fields_chunks = String(chunks.length);
    }

    // Application fee for DuesIQ platform
    const applicationFeeAmount = isConnect
      ? Math.round(feeAmount * (stripeAccount.application_fee_percent / 100))
      : 0;

    // Build line items
    const feeLabel = requestType === 'expedited' ? 'Expedited Estoppel Certificate' : 'Standard Estoppel Certificate';
    const lineItems: Array<{
      price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: feeLabel,
            description: `${community.name} - Estoppel Certificate Request`,
          },
          unit_amount: feeAmount,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: deliveryEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(isConnect
        ? {
            payment_intent_data: {
              application_fee_amount: applicationFeeAmount,
              transfer_data: {
                destination: stripeAccount.stripe_account_id!,
              },
            },
          }
        : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Estoppel checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
