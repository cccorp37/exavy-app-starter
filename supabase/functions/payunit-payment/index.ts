// PayUnit subscription payment (hosted page flow)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYUNIT_BASE = "https://gateway.payunit.net";

function authHeader(): string {
  const user = Deno.env.get("PAYUNIT_API_USER") ?? "";
  const pass = Deno.env.get("PAYUNIT_API_PASSWORD") ?? "";
  return "Basic " + btoa(`${user}:${pass}`);
}

function payunitHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("PAYUNIT_API_KEY") ?? "",
    mode: Deno.env.get("PAYUNIT_MODE") ?? "live",
    Authorization: authHeader(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (action === "status") {
      const { reference } = await req.json();
      if (!reference) {
        return new Response(JSON.stringify({ error: "Missing reference" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusRes = await fetch(
        `${PAYUNIT_BASE}/api/gateway/paymentstatus/${reference}`,
        { headers: payunitHeaders() },
      );
      const data = await statusRes.json();
      const txStatus =
        data?.data?.transaction_status ||
        data?.transaction_status ||
        data?.status ||
        "PENDING";

      // Find subscription pending row by payment_reference
      const { data: subRows } = await admin
        .from("subscriptions")
        .select("id, user_id, plan")
        .eq("payment_reference", reference)
        .limit(1);

      const sub = subRows?.[0];

      if (txStatus === "SUCCESS" && sub) {
        const isYearly = sub.plan === "yearly";
        const expires = new Date();
        expires.setMonth(expires.getMonth() + (isYearly ? 12 : 1));
        await admin
          .from("subscriptions")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expires.toISOString(),
          })
          .eq("id", sub.id);
      } else if ((txStatus === "FAILED" || txStatus === "CANCELLED") && sub) {
        await admin.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
      }

      return new Response(JSON.stringify({ status: txStatus, reference }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // init
    const authH = req.headers.get("Authorization") || "";
    const jwt = authH.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { planId, amount, returnUrl } = await req.json();
    if (!planId || !amount) {
      return new Response(JSON.stringify({ error: "Missing planId or amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionId = `exavy_sub_${userId.slice(0, 8)}_${Date.now()}`;
    const origin = returnUrl || req.headers.get("origin") || "https://exavy-app-starter.lovable.app";

    const initRes = await fetch(`${PAYUNIT_BASE}/api/gateway/initialize`, {
      method: "POST",
      headers: payunitHeaders(),
      body: JSON.stringify({
        total_amount: Number(amount),
        currency: "XAF",
        transaction_id: transactionId,
        return_url: `${origin}/subscription?payment=done`,
        notify_url: `${supabaseUrl}/functions/v1/payunit-payment?action=webhook`,
        payment_country: "CM",
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok || initData?.status !== "SUCCESS") {
      console.error("PayUnit init failed", initData);
      return new Response(
        JSON.stringify({ error: initData?.message || "Impossible d'initier le paiement" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // create pending subscription
    await admin.from("subscriptions").insert({
      user_id: userId,
      plan: planId,
      status: "pending",
      started_at: new Date().toISOString(),
      payment_reference: transactionId,
      amount: Number(amount),
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference: transactionId,
        paymentUrl: initData?.data?.transaction_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("payunit-payment error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
