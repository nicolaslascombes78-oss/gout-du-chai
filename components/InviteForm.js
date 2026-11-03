"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InviteForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("check_invitation", { p_code: clean });
    setLoading(false);
    if (error || !data) {
      setError("Ce code n'est pas reconnu. Vérifiez-le auprès de la personne qui vous a invité.");
      return;
    }
    router.push(`/rejoindre?code=${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label htmlFor="code">Code d&apos;invitation</label>
        <input
          id="code"
          type="text"
          className="code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || !code.trim()}>
        {loading ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
