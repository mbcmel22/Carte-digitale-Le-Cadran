"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

function parsePrice(p) {
  if (!p) return 0;
  const first = String(p).split("/")[0].replace(",", ".").replace(/[^0-9.]/g, "");
  const n = parseFloat(first);
  return isNaN(n) ? 0 : n;
}
const orderTotal = (o) =>
  (o.order_items || []).reduce((s, it) => s + parsePrice(it.price) * (it.quantity || 1), 0);
const euro = (n) => n.toFixed(2).replace(".", ",") + " €";

function ymd(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function frDate(s) {
  const [, m, d] = s.split("-");
  return d + "/" + m;
}

const PERIODS = [
  { key: "jour", label: "Jour", sub: "aujourd'hui", days: 0 },
  { key: "semaine", label: "Semaine", sub: "7 derniers jours", days: 7 },
  { key: "mois", label: "Mois", sub: "30 derniers jours", days: 30 },
  { key: "perso", label: "Personnalisé" },
];
const DAYS_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("jour");

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const [start, setStart] = useState(ymd(weekAgo));
  const [end, setEnd] = useState(ymd(today));

  const load = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 180);
    const { data, error } = await getBrowserSupabase()
      .from("orders")
      .select("id, status, created_at, updated_at, order_items(price, quantity)")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const { cutoff, until, sub } = useMemo(() => {
    if (period === "perso") {
      const c = new Date(start + "T00:00:00").getTime();
      const u = new Date(end + "T23:59:59").getTime();
      return { cutoff: c, until: u, sub: "du " + frDate(start) + " au " + frDate(end) };
    }
    const conf = PERIODS.find((p) => p.key === period);
    const d = new Date();
    if (conf.days === 0) d.setHours(0, 0, 0, 0);
    else d.setDate(d.getDate() - conf.days);
    return { cutoff: d.getTime(), until: Infinity, sub: conf.sub };
  }, [period, start, end]);

  const inPeriod = useMemo(
    () =>
      orders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= cutoff && t <= until;
      }),
    [orders, cutoff, until]
  );

  const nb = inPeriod.length;
  const ca = useMemo(() => inPeriod.reduce((s, o) => s + orderTotal(o), 0), [inPeriod]);
  const panier = nb ? ca / nb : 0;

  const tempsService = useMemo(() => {
    const served = inPeriod.filter((o) => o.status === "servi" && o.updated_at);
    if (served.length === 0) return null;
    const totalMin = served.reduce(
      (s, o) =>
        s + (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000,
      0
    );
    return Math.round(totalMin / served.length);
  }, [inPeriod]);

  const chart = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ t: d.getTime(), label: DAYS_FR[d.getDay()], count: 0 });
    }
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      d.setHours(0, 0, 0, 0);
      const slot = days.find((x) => x.t === d.getTime());
      if (slot) slot.count += 1;
    });
    const max = Math.max(1, ...days.map((d) => d.count));
    return { days, max };
  }, [orders]);

  if (loading) return <p className="admin-muted admin-section">Chargement des chiffres...</p>;

  return (
    <div className="admin-section">
      <div className="admin-bar">
        <h2 className="admin-h">Tableau de bord</h2>
        <button className="admin-refresh" onClick={load}>
          Rafraîchir
        </button>
      </div>

      <div className="dash-filter">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={period === p.key ? "on" : ""}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "perso" && (
        <div className="dash-dates">
          <label>
            Du
            <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Au
            <input type="date" value={end} min={start} max={ymd(new Date())} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
      )}

      <div className="dash-cards">
        <div className="dash-card">
          <div className="dc-label">Chiffre d'affaires</div>
          <div className="dc-value orange">{euro(ca)}</div>
          <div className="dc-sub">{sub}</div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Commandes</div>
          <div className="dc-value">{nb}</div>
          <div className="dc-sub">{sub}</div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Panier moyen</div>
          <div className="dc-value">{euro(panier)}</div>
          <div className="dc-sub">{sub}</div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Temps de service moyen</div>
          <div className="dc-value">{tempsService == null ? "—" : tempsService + " min"}</div>
          <div className="dc-sub">commandes servies · {sub}</div>
        </div>
      </div>

      <div className="dash-chart">
        <h3>Commandes des 7 derniers jours</h3>
        <div className="chart-bars">
          {chart.days.map((d, i) => (
            <div className="chart-col" key={i}>
              <div className="chart-bar" style={{ height: (d.count / chart.max) * 100 + "%" }}>
                <span className="cb-val">{d.count}</span>
              </div>
              <span className="chart-x">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="admin-muted" style={{ marginTop: 14, fontSize: 13 }}>
        Le chiffre d&apos;affaires est calculé à partir des prix de la carte. Pour les
        boissons à plusieurs contenances, c&apos;est la taille choisie qui est comptée.
      </p>
    </div>
  );
}
