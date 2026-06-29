"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError("Identifiants incorrects.");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="admin-brand">
          Cadran<small>Back office</small>
        </div>
        <h1>Connexion gérant</h1>

        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <label htmlFor="pwd">Mot de passe</label>
        <input
          id="pwd"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <button onClick={submit} disabled={loading || !email || !password}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        {error && <div className="login-err">{error}</div>}
      </div>
    </div>
  );
}
