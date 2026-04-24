import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// NIVEAU 1 : Sécurité CORS (Le "Portier")
const allowedOrigins = [
  "https://olharosol.newappai.com",
  "http://localhost:3000"
];

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  // Vérifie si l'origine fait partie des domaines autorisés
  const isAllowed = allowedOrigins.includes(origin);
  const allowOrigin = isAllowed ? origin : allowedOrigins[0]; // Protection stricte

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Traiter les requêtes OPTIONS (Pre-flight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Si l'origine n'est pas dans la liste et n'est pas vide (requête serveur direct), on bloque.
    if (!isAllowed && origin !== "") {
      throw new Error("Acesso CORS bloqueado: Origem não autorizada.");
    }

    // NIVEAU 2 : Authentification stricte de l'utilisateur (Validation de l'identité)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn("⚠️ Variáveis SUPABASE ausentes na Edge Function");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupère le jeton JWT envoyé par le code Frontend modifié
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Acesso recusado: Cabeçalho de autorização ausente.");
    }

    const token = authHeader.replace("Bearer ", "");
    // Validation du token avec les serveurs Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Acesso recusado: Utilizador não autenticado ou token inválido.");
    }

    console.log(`👤 Utilizador autenticado verificado: ${user.email}`);

    // Parse du payload
    const { items, orderId, successUrl, cancelUrl, customerEmail } = await req.json();

    console.log(`📦 Criando sessão para a encomenda ${orderId} (Cliente: ${user.email})`);
    
    if (!items || items.length === 0) {
      throw new Error("A lista de itens está vazia");
    }

    // Préparation des articles pour Stripe
    const lineItems = items.map((item: any) => {
      // NOTE: Dans une base avec des promos complexes (1 acheté = 1 gratuit), 
      // le prix unitaire peut mathématiquement tomber bas. 
      // On s'assure qu'aucun prix n'est négatif
      if (item.price < 0) {
          throw new Error(`Preço negativo detetado no item: ${item.pizza_name}`);
      }

      const unitAmount = Math.round(item.price * 100);

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

    // Création de la Session de Paiement Sécurisée
    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
      line_items: lineItems,
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: cancelUrl,
      customer_email: customerEmail || user.email,
      metadata: {
        orderId: orderId,
        userId: user.id // On lie officiellement le profil au paiement
      },
    });

    console.log(`✅ Sessão Stripe criada com sucesso: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("❌ Erro de Segurança / Stripe:", err.message);
    return new Response(JSON.stringify({ error: err.message, details: err.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400, // Bad Request
    });
  }
});
