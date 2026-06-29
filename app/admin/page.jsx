"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import Login from "@/components/admin/Login";
import OrdersBoard from "@/components/admin/OrdersBoard";
import MenuManager from "@/components/admin/MenuManager";
import "./admin.css";

export default function AdminPage() {
  const [session, setSession] = useState(undefined); // undefined = en cours de vérification
  const [tab, setTab] = useState("commandes");
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
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
          <button className="admin-logout" onClick={logout}>
            Se déconnecter
          </button>
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
            className={"admin-tab" + (tab === "carte" ? " active" : "")}
            onClick={() => setTab("carte")}
          >
            Carte
          </button>
        </div>

        <div style={{ display: tab === "commandes" ? "block" : "none" }}>
          <OrdersBoard onNewCount={setNewCount} />
        </div>
        {tab === "carte" && <MenuManager />}
      </div>
    </div>
  );
}
