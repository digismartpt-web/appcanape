import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.warn("⚠️ STRIPE_SECRET_KEY não encontrada no ambiente");
    } else {
      console.log("✅ STRIPE_SECRET_KEY detectada (comprimento: " + stripeKey.length + ")");
    }

    const { items, orderId, successUrl, cancelUrl, customerEmail } = await req.json();

    console.log(`📦 Criando sessão para a encomenda ${orderId}`);
    
    if (!items || items.length === 0) {
      throw new Error("A lista de itens está vazia");
    }

    // Criar Line Items para o Stripe
    const lineItems = items.map((item: any) => {
      const unitAmount = Math.round(item.price * 100);
      if (unitAmount < 50) {
         console.warn(`⚠️ Item ${item.pizza_name} tem preço muito baixo (${item.price}€). O Stripe pode falhar.`);
      }

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.pizza_name || "Pizza",
            description: `${item.size}${item.extras?.length > 0 ? ` + ${item.extras.map((e: any) => e.name).join(", ")}` : ""}`,
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    // Criar a Sessão de Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        orderId: orderId,
      },
    });

    console.log(`✅ Sessão criada: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("❌ Erro no Stripe:", err.message);
    return new Response(JSON.stringify({ error: err.message, details: err.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
