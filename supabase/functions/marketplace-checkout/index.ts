import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAMPAY_API_URL = 'https://campay.net/api';

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('237')) return cleaned;
  if (cleaned.startsWith('6')) return '237' + cleaned;
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);
    const token = Deno.env.get('CAMPAY_API_TOKEN');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'status') {
      const { reference } = await req.json();
      const statusRes = await fetch(`${CAMPAY_API_URL}/transaction/${reference}/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      const data = await statusRes.json();

      if (data.status === 'SUCCESSFUL') {
        await admin.from('marketplace_purchases')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('payment_reference', reference);
      } else if (data.status === 'FAILED') {
        await admin.from('marketplace_purchases')
          .update({ status: 'failed' })
          .eq('payment_reference', reference);
      }
      return new Response(JSON.stringify({ status: data.status, reference }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // init purchase
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { itemId, phoneNumber } = await req.json();
    if (!itemId || !phoneNumber) {
      return new Response(JSON.stringify({ error: 'Missing itemId or phoneNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: item, error: itemErr } = await admin
      .from('marketplace_items')
      .select('id, title, price_fcfa, is_published')
      .eq('id', itemId)
      .maybeSingle();
    if (itemErr || !item || !item.is_published) {
      return new Response(JSON.stringify({ error: 'Article introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const externalRef = `mkt_${userId}_${itemId}_${Date.now()}`;

    const payRes = await fetch(`${CAMPAY_API_URL}/collect/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: item.price_fcfa.toString(),
        currency: 'XAF',
        from: formattedPhone,
        description: `Exavy Marketplace - ${item.title}`.slice(0, 100),
        external_reference: externalRef,
      }),
    });

    if (!payRes.ok) {
      const t = await payRes.text();
      console.error('Campay init failed', payRes.status, t);
      return new Response(JSON.stringify({ error: "Impossible d'initier le paiement" }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payData = await payRes.json();

    await admin.from('marketplace_purchases').insert({
      user_id: userId,
      item_id: itemId,
      amount_fcfa: item.price_fcfa,
      payment_method: 'campay',
      payment_reference: payData.reference,
      status: 'pending',
    });

    return new Response(JSON.stringify({
      success: true,
      reference: payData.reference,
      ussdCode: payData.ussd_code,
      message: 'Confirmez le paiement sur votre téléphone',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('marketplace-checkout error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
