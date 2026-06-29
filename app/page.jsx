import { getSupabase } from "@/lib/supabaseServer";
import MenuView from "@/components/MenuView";

// La carte est régénérée au maximum toutes les 60 secondes.
// Une modification au back office apparaît donc en moins d'une minute.
export const revalidate = 60;

export default async function Page() {
  const supabase = getSupabase();

  const { data: categories, error } = await supabase
    .from("categories")
    .select(
      "id, name, slug, section, note, sort_order, menu_items(id, name, description, price, image_url, sort_order)"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", { foreignTable: "menu_items", ascending: true });

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

  // Regroupement par section : cuisine puis bar.
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

  return <MenuView sections={sections} />;
}
