"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import Login from "@/components/admin/Login";
import OrdersBoard from "@/components/admin/OrdersBoard";
import Dashboard from "@/components/admin/Dashboard";
import MenuManager from "@/components/admin/MenuManager";
import "./admin.css";

export default function AdminPage() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState("commandes");
  const [newCount, setNewCount] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = async () => {
    await getBrowserSupabase().auth.signOut();
  };

  if (session === undefined) {
    return (
      <div className="login-wrap">
        <p className="admin-muted">Chargement...</p>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="admin">
      <div className="admin-top">
        <div className="wrap">
          <div className="admin-brand">
            Cadran<small>Back office</small>
          </div>
          <div className="admin-actions">
            <a className="admin-view" href="/" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Voir la carte
            </a>
            <button className="admin-logout" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="admin-tabs">
          <button
            className={"admin-tab" + (tab === "commandes" ? " active" : "")}
            onClick={() => setTab("commandes")}
          >
            Commandes
            {newCount > 0 && <span className="pill">{newCount}</span>}
          </button>
          <button
            className={"admin-tab" + (tab === "dashboard" ? " active" : "")}
            onClick={() => setTab("dashboard")}
          >
            Tableau de bord
          </button>
          <button
            className={"admin-tab" + (tab === "carte" ? " active" : "")}
            onClick={() => setTab("carte")}
          >
            Carte
          </button>
        </div>

        <div style={{ display: tab === "commandes" ? "block" : "none" }}>
          <OrdersBoard onNewCount={setNewCount} />
        </div>
        {tab === "dashboard" && <Dashboard />}
        {tab === "carte" && <MenuManager />}
      </div>

      <button
        className={"admin-totop" + (showTop ? " show" : "")}
        aria-label="Remonter en haut"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
