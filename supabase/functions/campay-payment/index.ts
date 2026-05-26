import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PRODUCTION API URL
const CAMPAY_API_URL = 'https://campay.net/api';

interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  planId: string;
  userId: string;
}

interface CampayPaymentResponse {
  reference: string;
  ussd_code?: string;
  operator?: string;
  status?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Handle webhook from Campay
    if (action === 'webhook') {
      return handleWebhook(req);
    }

    // Handle status check
    if (action === 'status') {
      const { reference } = await req.json();
      return checkPaymentStatus(reference);
    }

    // Default: initiate payment
    const { amount, phoneNumber, planId, userId } = await req.json() as PaymentRequest;

    if (!amount || !phoneNumber || !planId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, phoneNumber, planId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (remove spaces, ensure country code)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Initiating PRODUCTION payment for:', { amount, phone: formattedPhone, planId, userId });

    // Get Campay permanent token
    const permanentToken = Deno.env.get('CAMPAY_API_TOKEN');

    if (!permanentToken) {
      console.error('Missing Campay API token');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using Campay permanent token for PRODUCTION');

    // Initiate payment request
    const paymentResponse = await fetch(`${CAMPAY_API_URL}/collect/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${permanentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: 'XAF',
        from: formattedPhone,
        description: `Exavy - Abonnement ${planId}`,
        external_reference: `${userId}_${planId}_${Date.now()}`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Payment initiation failed:', paymentResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Unable to initiate payment. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData: CampayPaymentResponse = await paymentResponse.json();
    console.log('Payment initiated:', paymentData);

    return new Response(
      JSON.stringify({
        success: true,
        reference: paymentData.reference,
        ussdCode: paymentData.ussd_code,
        operator: paymentData.operator,
        message: 'Veuillez confirmer le paiement sur votre téléphone',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkPaymentStatus(reference: string) {
  try {
    const accessToken = Deno.env.get('CAMPAY_API_TOKEN');

    const statusResponse = await fetch(`${CAMPAY_API_URL}/transaction/${reference}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const statusData = await statusResponse.json();
    console.log('Payment status:', statusData);

    // If payment is successful, activate subscription immediately
    if (statusData.status === 'SUCCESSFUL' && statusData.external_reference) {
      const parts = statusData.external_reference.split('_');
      const userId = parts[0];
      const planId = parts[1];

      if (userId && planId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const now = new Date();
        let expiresAt: Date;
        if (planId === 'yearly') {
          expiresAt = new Date(now.getTime());
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt = new Date(now.getTime());
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: planId,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            payment_reference: reference,
            amount: parseFloat(statusData.amount || '0'),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (subError) {
          console.error('Error activating subscription from status check:', subError);
        } else {
          console.log('Subscription activated via status check for user:', userId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: statusData.status,
        reference: statusData.reference,
        amount: statusData.amount,
        operator: statusData.operator,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Status check error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check payment status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleWebhook(req: Request) {
  try {
    const webhookSecret = Deno.env.get('CAMPAY_WEBHOOK_SECRET');
    const rawBody = await req.text();
    const signature = req.headers.get('x-campay-signature') || req.headers.get('x-hub-signature-256');

    // Enforce HMAC signature verification when a secret is configured
    if (!webhookSecret) {
      console.error('CAMPAY_WEBHOOK_SECRET is not configured; refusing webhook');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const provided = signature.replace(/^sha256=/, '').toLowerCase();

    // Constant-time compare
    if (expected.length !== provided.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    if (diff !== 0) {
      console.error('Invalid Campay webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = JSON.parse(rawBody);
    const { status, reference, external_reference, amount, operator } = body;

    if (status === 'SUCCESSFUL') {
      // Parse external_reference to get userId and planId
      const parts = external_reference.split('_');
      const userId = parts[0];
      const planId = parts[1];
      
      // Update user subscription in database
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Calculate expiration date based on plan
      const now = new Date();
      let expiresAt: Date;
      if (planId === 'yearly') {
        expiresAt = new Date(now.getTime());
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt = new Date(now.getTime());
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Upsert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: planId,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_reference: reference,
          amount: amount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (subError) {
        console.error('Error updating subscription:', subError);
      } else {
        console.log('Subscription updated successfully for user:', userId, 'plan:', planId);
      }

      // Log the transaction
      console.log('Transaction completed:', {
        reference,
        amount,
        operator,
        userId,
        planId,
        status: 'SUCCESSFUL',
        expires_at: expiresAt.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 237, keep it; if starts with 6, add 237
  if (cleaned.startsWith('237')) {
    return cleaned;
  } else if (cleaned.startsWith('6')) {
    return '237' + cleaned;
  }
  
  return cleaned;
}
