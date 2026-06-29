import { getSupabase } from "@/lib/supabaseServer";
import { SITE } from "@/lib/site";
import MenuView from "@/components/MenuView";

// La carte est régénérée au maximum toutes les 60 secondes.
export const revalidate = 60;

// Récupère les vrais avis Google (si la clé API est configurée côté serveur).
// Variable d'environnement : GOOGLE_PLACES_API_KEY (secrète, pas NEXT_PUBLIC).
async function fetchGoogleReviews() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !SITE.googlePlaceId) return null;
  try {
    const url =
      "https://maps.googleapis.com/maps/api/place/details/json" +
      `?place_id=${SITE.googlePlaceId}` +
      "&fields=rating,user_ratings_total,reviews" +
      "&reviews_sort=newest&language=fr&key=" +
      key;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (data.status !== "OK" || !data.result) return null;
    const r = data.result;
    return {
      rating: r.rating ? String(r.rating).replace(".", ",") : SITE.rating,
      total: r.user_ratings_total ?? SITE.reviewCount,
      reviews: (r.reviews || []).slice(0, 6).map((rev) => ({
        name: rev.author_name,
        stars: rev.rating,
        text: rev.text,
        time: rev.relative_time_description,
        photo: rev.profile_photo_url || null,
      })),
    };
  } catch {
    return null;
  }
}

export default async function Page() {
  const supabase = getSupabase();

  const [{ data: categories, error }, google] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, section, note, sort_order, menu_items(id, name, description, price, image_url, sort_order)"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("sort_order", { foreignTable: "menu_items", ascending: true }),
    fetchGoogleReviews(),
  ]);

  if (error) {
    return (
      <main className="wrap">
        <p style={{ padding: "60px 0", textAlign: "center" }}>
          La carte est momentanément indisponible. Merci de réessayer dans un
          instant.
        </p>
      </main>
    );
  }

  const cuisine = (categories || []).filter((c) => c.section === "cuisine");
  const bar = (categories || []).filter((c) => c.section === "bar");

  const toCat = (c) => ({
    slug: c.slug,
    name: c.name,
    note: c.note,
    items: (c.menu_items || []).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
  });

  const sections = [
    { eyebrow: "La carte", happy: false, cats: cuisine.map(toCat) },
    { eyebrow: "Le bar", happy: true, cats: bar.map(toCat) },
  ].filter((s) => s.cats.length > 0);

  return <MenuView sections={sections} google={google} />;
}
