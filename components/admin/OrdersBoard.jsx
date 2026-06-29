"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

const COLUMNS = [
  { key: "nouvelle", title: "Nouvelles" },
  { key: "en_cours", title: "En cours" },
  { key: "termine", title: "Terminé" },
  { key: "servi", title: "Servi" },
];
const ORDER = COLUMNS.map((c) => c.key);

function fmtDur(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  return h + " h " + String(m % 60).padStart(2, "0");
}
function timerClass(ms) {
  const m = ms / 60000;
  if (m >= 20) return "late";
  if (m >= 10) return "warn";
  return "";
}

export default function OrdersBoard({ onNewCount }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [dragId, setDragId] = useState(null);
  const [dropCol, setDropCol] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("id, table_number, status, created_at, updated_at, order_items(id, name, price, quantity)")
      .order("created_at", { ascending: false })
      .limit(120);
    if (!error && data) {
      setOrders(data);
      onNewCount?.(data.filter((o) => o.status === "nouvelle").length);
    }
    setLoading(false);
  }, [onNewCount]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 8000);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(timer.current);
      clearInterval(tick);
    };
  }, [load]);

  const setStatus = async (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await getBrowserSupabase()
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    load();
  };

  const remove = async (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await getBrowserSupabase().from("orders").delete().eq("id", id);
    load();
  };

  const Card = (o) => {
    const idx = ORDER.indexOf(o.status);
    const next = ORDER[idx + 1];
    const prev = ORDER[idx - 1];
    const isServed = o.status === "servi";
    const elapsed = isServed
      ? new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()
      : now - new Date(o.created_at).getTime();
    return (
      <div
        key={o.id}
        className={"kcard" + (dragId === o.id ? " dragging" : "")}
        draggable
        onDragStart={() => setDragId(o.id)}
        onDragEnd={() => {
          setDragId(null);
          setDropCol(null);
        }}
      >
        <div className="kcard-top">
          <span className="kcard-table">Table {o.table_number}</span>
          <span className={"kcard-timer " + timerClass(elapsed)}>
            {isServed ? "servi en " : ""}
            {fmtDur(elapsed)}
            {isServed ? "" : ""}
          </span>
        </div>
        <ul className="kcard-items">
          {(o.order_items || []).map((it) => (
            <li key={it.id}>
              <span className="qty">{it.quantity}×</span> {it.name}
            </li>
          ))}
        </ul>
        <div className="kmove">
          {prev && (
            <button className="kback" title="Revenir en arrière" onClick={() => setStatus(o.id, prev)}>
              ←
            </button>
          )}
          {next ? (
            <button onClick={() => setStatus(o.id, next)}>
              → {COLUMNS.find((c) => c.key === next).title}
            </button>
          ) : (
            <button className="kdel" onClick={() => remove(o.id)}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-section">
      <div className="admin-bar">
        <h2 className="admin-h">Commandes</h2>
        <button className="admin-refresh" onClick={load}>
          Rafraîchir
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <p className="admin-muted">Chargement des commandes...</p>
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => o.status === col.key);
            return (
              <div
                key={col.key}
                className={"kcol" + (dropCol === col.key ? " drop-on" : "")}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropCol !== col.key) setDropCol(col.key);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setDropCol(null);
                }}
                onDrop={() => {
                  if (dragId) setStatus(dragId, col.key);
                  setDragId(null);
                  setDropCol(null);
                }}
              >
                <div className="kcol-head">
                  <span className="kcol-title">
                    <span className={"kdot d-" + col.key} />
                    {col.title}
                  </span>
                  <span className="kcol-count">{list.length}</span>
                </div>
                {list.length === 0 ? (
                  <p className="kempty">—</p>
                ) : (
                  list.map(Card)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
