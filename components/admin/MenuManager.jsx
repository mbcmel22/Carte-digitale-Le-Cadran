"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

const BUCKET = "menu-images";

export default function MenuManager() {
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState({});
  const [busyPhoto, setBusyPhoto] = useState(null);
  const newItem = useRef({}); // saisie d'ajout par catégorie

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select(
        "id, name, slug, section, sort_order, menu_items(id, name, description, price, image_url, is_available, sort_order)"
      )
      .order("sort_order", { ascending: true })
      .order("sort_order", { foreignTable: "menu_items", ascending: true });
    if (!error && data) {
      data.forEach((c) =>
        (c.menu_items || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      setCats(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchItem = (catId, itemId, patch) =>
    setCats((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              menu_items: c.menu_items.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it
              ),
            }
      )
    );

  const flashSaved = (id) => {
    setSavedIds((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSavedIds((s) => ({ ...s, [id]: false })), 1800);
  };

  const saveItem = async (it) => {
    await getBrowserSupabase()
      .from("menu_items")
      .update({ name: it.name, price: it.price, description: it.description })
      .eq("id", it.id);
    flashSaved(it.id);
  };

  const toggleAvail = async (catId, it) => {
    const v = !it.is_available;
    patchItem(catId, it.id, { is_available: v });
    await getBrowserSupabase().from("menu_items").update({ is_available: v }).eq("id", it.id);
  };

  const delItem = async (catId, it) => {
    if (!confirm(`Supprimer "${it.name}" ?`)) return;
    setCats((prev) =>
      prev.map((c) =>
        c.id !== catId ? c : { ...c, menu_items: c.menu_items.filter((x) => x.id !== it.id) }
      )
    );
    await getBrowserSupabase().from("menu_items").delete().eq("id", it.id);
  };

  const addItem = async (cat) => {
    const draft = newItem.current[cat.id] || {};
    const name = (draft.name || "").trim();
    if (!name) return;
    const max = Math.max(0, ...cat.menu_items.map((i) => i.sort_order || 0));
    const { data, error } = await getBrowserSupabase()
      .from("menu_items")
      .insert({
        category_id: cat.id,
        name,
        price: (draft.price || "").trim() || null,
        is_available: true,
        sort_order: max + 1,
      })
      .select()
      .single();
    if (!error && data) {
      setCats((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, menu_items: [...c.menu_items, data] } : c))
      );
      newItem.current[cat.id] = {};
      // reset des champs
      const n = document.getElementById("add-name-" + cat.id);
      const p = document.getElementById("add-price-" + cat.id);
      if (n) n.value = "";
      if (p) p.value = "";
    } else {
      alert("Ajout impossible : " + (error?.message || "erreur"));
    }
  };

  const uploadPhoto = async (catId, it, file) => {
    if (!file) return;
    setBusyPhoto(it.id);
    try {
      const supabase = getBrowserSupabase();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${it.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from("menu_items").update({ image_url: url }).eq("id", it.id);
      patchItem(catId, it.id, { image_url: url });
    } catch (e) {
      alert("Envoi de la photo impossible : " + (e?.message || "erreur"));
    } finally {
      setBusyPhoto(null);
    }
  };

  const removePhoto = async (catId, it) => {
    patchItem(catId, it.id, { image_url: null });
    await getBrowserSupabase().from("menu_items").update({ image_url: null }).eq("id", it.id);
  };

  const shown = filter === "all" ? cats : cats.filter((c) => c.id === filter);

  if (loading) return <p className="admin-muted admin-section">Chargement de la carte...</p>;

  return (
    <div className="admin-section">
      <div className="mm-filter">
        <button
          className={"mm-chip" + (filter === "all" ? " active" : "")}
          onClick={() => setFilter("all")}
        >
          Toutes
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            className={"mm-chip" + (filter === c.id ? " active" : "")}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {shown.map((cat) => (
        <div className="mm-cat" key={cat.id}>
          <h3>{cat.name}</h3>

          <div className="mm-add">
            <input
              id={"add-name-" + cat.id}
              className="i-name"
              placeholder="Nom du nouveau plat"
              onChange={(e) => {
                newItem.current[cat.id] = { ...(newItem.current[cat.id] || {}), name: e.target.value };
              }}
            />
            <input
              id={"add-price-" + cat.id}
              className="i-price"
              placeholder="Prix"
              onChange={(e) => {
                newItem.current[cat.id] = { ...(newItem.current[cat.id] || {}), price: e.target.value };
              }}
            />
            <button onClick={() => addItem(cat)}>Ajouter</button>
          </div>

          {cat.menu_items.map((it) => (
            <div className={"mm-item" + (it.is_available ? "" : " off")} key={it.id}>
              <div className="mm-photo">
                <div className="ph">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt={it.name} />
                  ) : (
                    <span style={{ fontSize: 11 }}>Sans photo</span>
                  )}
                </div>
                {it.image_url ? (
                  <button className="rm" onClick={() => removePhoto(cat.id, it)}>
                    Retirer la photo
                  </button>
                ) : (
                  <label>
                    {busyPhoto === it.id ? "Envoi..." : "Ajouter une photo"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => uploadPhoto(cat.id, it, e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

              <div className="mm-fields">
                <div className="row">
                  <input
                    className="i-name"
                    value={it.name}
                    onChange={(e) => patchItem(cat.id, it.id, { name: e.target.value })}
                  />
                  <input
                    className="i-price"
                    value={it.price || ""}
                    placeholder="Prix"
                    onChange={(e) => patchItem(cat.id, it.id, { price: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="Description (facultatif)"
                  value={it.description || ""}
                  onChange={(e) => patchItem(cat.id, it.id, { description: e.target.value })}
                />
                <div className="mm-row2">
                  <label className="mm-toggle">
                    <input
                      type="checkbox"
                      checked={!!it.is_available}
                      onChange={() => toggleAvail(cat.id, it)}
                    />
                    <span className="sw" />
                    {it.is_available ? "Disponible" : "En rupture (masqué)"}
                  </label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {savedIds[it.id] && <span className="mm-saved">Enregistré</span>}
                    <button className="mm-del" onClick={() => delItem(cat.id, it)}>
                      Supprimer
                    </button>
                    <button className="mm-save" onClick={() => saveItem(it)}>
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
