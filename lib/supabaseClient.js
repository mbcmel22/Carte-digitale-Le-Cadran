import { createClient } from "@supabase/supabase-js";

// Client utilisé dans le navigateur :
// - côté client pour passer commande (place_order)
// - au back office pour la connexion gérant et la gestion de la carte
let client;

export function getBrowserSupabase() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
