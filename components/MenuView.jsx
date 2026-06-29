"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import Decor from "@/components/Decor";

function priceText(p) {
  if (!p) return "";
  return /[\/a-zA-Z]/.test(p) ? p : p + " €";
}

function variantsOf(it) {
  if (!it.price || !it.price.includes("/")) return null;
  const prices = it.price.split("/").map((s) => s.trim()).filter(Boolean);
  if (prices.length < 2) return null;
  const labels =
    it.description && it.description.includes("/")
      ? it.description.split("/").map((s) => s.trim())
      : [];
  return prices.map((p, i) => ({ label: labels[i] || p, price: p }));
}

const isBarSection = (sec) => sec.happy || /bar/i.test(sec.eyebrow);

export default function MenuView({ sections }) {
  const [lbItem, setLbItem] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [picker, setPicker] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [orderError, setOrderError] = useState(null);

  const navRef = useRef(null);
  const navWrapRef = useRef(null);

  const cats = sections.flatMap((s) => s.cats);
  const cartCount = cart.reduce((n, c) => n + c.quantity, 0);

  // Nav réduite : catégories cuisine + une seule entrée "Boissons" pour tout le bar
  const navItems = [];
  sections.forEach((sec) => {
    if (isBarSection(sec)) {
      navItems.push({
        label: "Boissons",
        target: "boissons",
        slugs: sec.cats.map((c) => c.slug),
      });
    } else {
      sec.cats.forEach((c) =>
        navItems.push({ label: c.name, target: c.slug, slugs: [c.slug] })
      );
    }
  });
  navItems.push({ label: "Avis clients", target: "avis", slugs: ["avis"] });
  const activeNav = navItems.find((it) => it.slugs.includes(activeId))?.target;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    cats.forEach((c) => {
      const el = document.getElementById(c.slug);
      if (el) io.observe(el);
    });
    const avis = document.getElementById("avis");
    if (avis) io.observe(avis);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.length]);

  useEffect(() => {
    if (!activeNav || !navRef.current) return;
    const chip = navRef.current.querySelector(`[data-target="${activeNav}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeNav]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setLbItem(null);
        setPanelOpen(false);
        setCartOpen(false);
        setPicker(null);
      }
    };
    const onClick = (e) => {
      if (navWrapRef.current && !navWrapRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const goTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPanelOpen(false);
  };

  const addEntry = (key, id, name, price) =>
    setCart((prev) => {
      const found = prev.find((c) => c.key === key);
      if (found)
        return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { key, id, name, price, quantity: 1 }];
    });

  const addItem = (it) => {
    const vs = variantsOf(it);
    if (vs) {
      setPicker(it);
      return;
    }
    addEntry(it.id, it.id, it.name, it.price);
  };

  const addVariant = (it, v) => {
    addEntry(it.id + "::" + v.label, it.id, it.name + " · " + v.label, v.price);
    setPicker(null);
  };

  const changeQty = (key, delta) =>
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );

  const qtyOf = (id) => cart.find((c) => c.key === id)?.quantity || 0;

  const sendOrder = async () => {
    if (!tableNumber.trim() || cart.length === 0) return;
    setSending(true);
    setOrderError(null);
    try {
      const supabase = getBrowserSupabase();
      const items = cart.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      }));
      const { error } = await supabase.rpc("place_order", {
        p_table: tableNumber.trim(),
        p_items: items,
      });
      if (error) throw error;
      setSent({ table: tableNumber.trim() });
      setCart([]);
    } catch (err) {
      setOrderError(
        "L'envoi a échoué. Vérifiez votre connexion et réessayez, ou appelez un serveur."
      );
    } finally {
      setSending(false);
    }
  };

  const closeCart = () => {
    setCartOpen(false);
    if (sent) {
      setSent(null);
      setTableNumber("");
    }
  };

  return (
    <>
      <Decor />

      <header className="site-header">
        <div className="wrap">
          <div className="brand">
            <span className="wordmark">Cadran</span>
            <span className="wordmark-sub">Bar &amp; Cuisine</span>
          </div>
          <span className="header-city">
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {SITE.city}
          </span>
        </div>
      </header>

      <nav className="catnav" aria-label="Catégories" ref={navWrapRef}>
        <div className="wrap navbar">
          <button
            className="menu-btn"
            aria-label="Toutes les catégories"
            aria-expanded={panelOpen}
            onClick={(e) => {
              e.stopPropagation();
              setPanelOpen((v) => !v);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="catnav-track" ref={navRef}>
            {navItems.map((it) => (
              <button
                key={it.target}
                className={"chip" + (activeNav === it.target ? " active" : "")}
                data-target={it.target}
                onClick={() => goTo(it.target)}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {panelOpen && (
          <div className="catpanel">
            <div className="catpanel-inner">
              {sections.map((sec) => (
                <div key={sec.eyebrow}>
                  <h4>{sec.eyebrow}</h4>
                  <div className="catpanel-grid">
                    {sec.cats.map((c) => (
                      <button key={c.slug} onClick={() => goTo(c.slug)}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="wrap">
        {sections.map((sec) => (
          <div key={sec.eyebrow}>
            <div className="eyebrow" id={isBarSection(sec) ? "boissons" : undefined}>
              <span>{sec.eyebrow}</span>
            </div>

            {sec.happy && (
              <div className="happy">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <div>
                  <strong>Happy hour</strong>
                  <p>{SITE.happyHour}</p>
                </div>
              </div>
            )}

            {sec.cats.map((cat) => (
              <section className="category" id={cat.slug} key={cat.slug}>
                <div className="category-head">
                  <h2 className="section-title">{cat.name}</h2>
                  {cat.note && <span className="category-note">{cat.note}</span>}
                </div>
                <div className="grid">
                  {cat.items.length === 0 && (
                    <div className="card note-card">
                      {cat.note || "À découvrir sur place"}
                    </div>
                  )}
                  {cat.items.map((it) => {
                    const hasVariants = !!variantsOf(it);
                    const q = qtyOf(it.id);
                    return (
                      <article className="card" key={it.id}>
                        <div className="card-main">
                          <h3 className="card-name">{it.name}</h3>
                          {it.description && (
                            <p className="card-desc">{it.description}</p>
                          )}
                          <div className="card-foot">
                            <span className="card-price">{priceText(it.price)}</span>
                            {it.price &&
                              (!hasVariants && q > 0 ? (
                                <span className="card-qty">
                                  <button
                                    aria-label={"Retirer un " + it.name}
                                    onClick={() => changeQty(it.id, -1)}
                                  >
                                    −
                                  </button>
                                  <span>{q}</span>
                                  <button
                                    aria-label={"Ajouter un " + it.name}
                                    onClick={() => addItem(it)}
                                  >
                                    +
                                  </button>
                                </span>
                              ) : (
                                <button
                                  className="card-add"
                                  aria-label={"Ajouter " + it.name + " à ma commande"}
                                  onClick={() => addItem(it)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                    <path d="M12 5v14M5 12h14" />
                                  </svg>
                                </button>
                              ))}
                          </div>
                        </div>
                        {it.image_url && (
                          <button
                            className="card-photo"
                            onClick={() => setLbItem(it)}
                            aria-label={"Voir la photo de " + it.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={it.image_url} alt={it.name} />
                            <span className="zoom">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <circle cx="10" cy="10" r="6" />
                                <path d="M15 15l5 5" />
                              </svg>
                            </span>
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ))}
      </main>

      <section className="reviews wrap" id="avis">
        <div className="eyebrow">
          <span>Avis clients</span>
        </div>
        <div className="reviews-head">
          <div className="reviews-score">
            <span className="rscore">{SITE.rating}</span>
            <span className="reviews-stars">★★★★★</span>
            <span className="rcount">{SITE.reviewCount} avis Google</span>
          </div>
          <a className="review-btn" href={SITE.googleReviewUrl} target="_blank" rel="noopener noreferrer">
            <svg className="ic" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
            </svg>
            Laisser un avis
          </a>
        </div>
        <div className="reviews-grid">
          {(SITE.reviews || []).map((r, i) => (
            <div className="review-card" key={i}>
              <div className="rc-top">
                <span className="rc-name">{r.name}</span>
                <span className="rc-stars">{"★".repeat(r.stars || 5)}</span>
              </div>
              <p className="rc-text">{r.text}</p>
            </div>
          ))}
        </div>
        <div className="reviews-allwrap">
          <a className="reviews-all" href={SITE.googleMapsUrl} target="_blank" rel="noopener noreferrer">
            Voir tous les avis sur Google
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <a className="review-btn" href={SITE.googleReviewUrl} target="_blank" rel="noopener noreferrer">
          <svg className="ic" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
          </svg>
          Laisser un avis sur Google
        </a>
        <div className="footer-meta">
          {SITE.name} · Bar &amp; Cuisine · {SITE.city}
          <br />
          Happy hour {SITE.happyHour.toLowerCase()}
        </div>
        <div className="footer-legal">
          Prix indiqués en TTC, service compris.
          <br />
          L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec
          modération.
        </div>
      </footer>

      {cartCount > 0 && !cartOpen && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6h15l-1.5 9h-12z" />
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
            <path d="M6 6L5 3H3" />
          </svg>
          Ma commande
          <span className="badge">{cartCount}</span>
        </button>
      )}

      <button
        className={"to-top" + (showTop ? " show" : "")}
        aria-label="Remonter en haut de la carte"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      {picker && (
        <div
          className="size-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicker(null);
          }}
        >
          <div className="size-card">
            <h3>{picker.name}</h3>
            <p className="sub">Choisissez la contenance</p>
            {variantsOf(picker).map((v) => (
              <button key={v.label} className="size-opt" onClick={() => addVariant(picker, v)}>
                <span>{v.label}</span>
                <span className="sp">{priceText(v.price)}</span>
              </button>
            ))}
            <button className="size-cancel" onClick={() => setPicker(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {lbItem && (
        <div
          className="lightbox show"
          role="dialog"
          aria-modal="true"
          aria-label="Photo du plat"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLbItem(null);
          }}
        >
          <button className="lightbox-close" aria-label="Fermer" onClick={() => setLbItem(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="lightbox-card">
            <div className="lightbox-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lbItem.image_url} alt={lbItem.name} />
            </div>
            <div className="lightbox-info">
              <h3>
                {lbItem.name} <span className="lb-price">{priceText(lbItem.price)}</span>
              </h3>
              {lbItem.description && <p>{lbItem.description}</p>}
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCart(); }}>
          <div className="cart-panel">
            <div className="cart-head">
              <h2>Votre commande</h2>
              <button aria-label="Fermer" onClick={closeCart}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="cart-done">
                <div className="check">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3>Commande envoyée</h3>
                <p>
                  Table {sent.table}. Elle a bien été transmise. Un serveur vous
                  l&apos;apporte rapidement.
                </p>
              </div>
            ) : (
              <>
                <div className="cart-body">
                  {cart.length === 0 ? (
                    <p className="cart-empty">
                      Votre commande est vide. Ajoutez des plats avec le bouton +.
                    </p>
                  ) : (
                    cart.map((c) => (
                      <div className="cart-line" key={c.key}>
                        <div className="cl-main">
                          <div className="cl-name">{c.name}</div>
                          <div className="cl-price">{priceText(c.price)}</div>
                        </div>
                        <span className="card-qty">
                          <button aria-label="Retirer un" onClick={() => changeQty(c.key, -1)}>−</button>
                          <span>{c.quantity}</span>
                          <button aria-label="Ajouter un" onClick={() => changeQty(c.key, 1)}>+</button>
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="cart-foot">
                  <label htmlFor="table">Numéro de table</label>
                  <input
                    id="table"
                    inputMode="numeric"
                    placeholder="Ex : 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                  <button
                    className="cart-send"
                    disabled={sending || cart.length === 0 || !tableNumber.trim()}
                    onClick={sendOrder}
                  >
                    {sending ? "Envoi..." : "Envoyer la commande"}
                  </button>
                  {orderError && <div className="cart-error">{orderError}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
