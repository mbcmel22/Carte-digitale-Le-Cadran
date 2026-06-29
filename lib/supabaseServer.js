import { createClient } from "@supabase/supabase-js";

// Client utilisé côté serveur pour lire la carte publique.
// Il utilise la clé "anon" : la sécurité (RLS) ne renvoie que les
// catégories actives et les plats disponibles.
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}
