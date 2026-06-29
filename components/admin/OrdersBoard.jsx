"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

const STATUS = [
  { key: "en_cours", label: "En cours" },
  { key: "termine", label: "Terminé" },
  { key: "servi", label: "Servi" },
];
const LABELS = { nouvelle: "Nouvelle", en_cours: "En cours", termine: "Terminé", servi: "Servi" };

function hhmm(iso) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function OrdersBoard({ onNewCount }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showServed, setShowServed] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("id, table_number, status, created_at, order_items(id, name, price, quantity)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (!error && data) {
      setOrders(data);
      onNewCount?.(data.filter((o) => o.status === "nouvelle").length);
    }
    setLoading(false);
  }, [onNewCount]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 8000);
    return () => clearInterval(timer.current);
  }, [load]);

  const setStatus = async (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await getBrowserSupabase().from("orders").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await getBrowserSupabase().from("orders").delete().eq("id", id);
    load();
  };

  const active = orders.filter((o) => o.status !== "servi");
  const served = orders.filter((o) => o.status === "servi");

  const Card = (o) => (
    <div className={"order-card" + (o.status === "nouvelle" ? " is-new" : "")} key={o.id}>
      <div className="order-top">
        <span className="order-table">Table {o.table_number}</span>
        <span className="order-time">{hhmm(o.created_at)}</span>
      </div>
      <span className={"order-badge b-" + o.status}>{LABELS[o.status] || o.status}</span>
      <ul className="order-items">
        {(o.order_items || []).map((it) => (
          <li key={it.id}>
            <span>
              <span className="qty">{it.quantity}×</span> {it.name}
            </span>
          </li>
        ))}
      </ul>
      <div className="order-actions">
        {STATUS.map((s) => (
          <button
            key={s.key}
            className={o.status === s.key ? "on" : ""}
            onClick={() => setStatus(o.id, s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button className="order-del" onClick={() => remove(o.id)}>
        Supprimer
      </button>
    </div>
  );

  return (
    <div className="admin-section">
      <div className="admin-bar">
        <h2 className="admin-h">Commandes en cours ({active.length})</h2>
        <button className="admin-refresh" onClick={load}>
          Rafraîchir
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <p className="admin-muted">Chargement des commandes...</p>
      ) : active.length === 0 ? (
        <p className="admin-muted">Aucune commande en cours pour le moment.</p>
      ) : (
        <div className="orders-grid">{active.map(Card)}</div>
      )}

      {served.length > 0 && (
        <>
          <button className="orders-served-toggle" onClick={() => setShowServed((v) => !v)}>
            {showServed ? "Masquer" : "Voir"} les commandes servies ({served.length})
          </button>
          {showServed && (
            <div className="orders-grid" style={{ marginTop: 12 }}>
              {served.map(Card)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
