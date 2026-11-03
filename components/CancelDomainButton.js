"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLines, reservationError } from "@/lib/cart";

export default function CancelDomainButton({ cuveeIds, domainName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!window.confirm(`Annuler toutes vos bouteilles chez ${domainName} ?`)) return;
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("save_reservations", {
      p_items: cuveeIds.map((id) => ({ cuvee_id: id, quantity: 0 })),
    });
    setLoading(false);
    if (error) {
      setError(reservationError(error));
      return;
    }
    clearLines(cuveeIds);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="link-btn" onClick={cancel} disabled={loading}>
        {loading ? "Annulation…" : "Annuler"}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
