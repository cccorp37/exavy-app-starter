import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { itemId } = await req.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing itemId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the secure RPC under the user's identity to validate purchase/admin.
    const { data: rpcResult, error: rpcErr } = await userClient.rpc('get_marketplace_download_url', { p_item_id: itemId });
    if (rpcErr || !rpcResult) {
      return new Response(JSON.stringify({ error: rpcErr?.message || 'Indisponible' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const value = String(rpcResult);
    if (!value.startsWith('storage:')) {
      // External URL — just return it
      return new Response(JSON.stringify({ url: value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const path = value.slice('storage:'.length);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: signed, error: signErr } = await admin.storage
      .from('marketplace-files')
      .createSignedUrl(path, 60 * 10); // 10 minutes
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: signErr?.message || 'Signature impossible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('marketplace-sign-download error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
