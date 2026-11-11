import ClubHeader from "@/components/ClubHeader";
import FeedbackForm from "@/components/FeedbackForm";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boîte à idées — Le Goût du Chai" };

// Boîte à idées : ouverte depuis la Sélection (domaine introuvable) ou le fil « Au club » (commande livrée).
export default async function Idees({ searchParams }) {
  await requireMember();
  const sp = await searchParams;
  const type = typeof sp?.type === "string" ? sp.type : "";
  const sujet = typeof sp?.sujet === "string" ? sp.sujet.slice(0, 200) : "";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 100) : "";

  return (
    <main className="shell">
      <ClubHeader />
      <h1 className="act-title">Boîte à idées</h1>
      <p className="act-intro">Une envie de vin, une idée, un souci : dites-le-nous, nous lisons tout.</p>
      <div className="card" style={{ marginTop: 18 }}>
        <FeedbackForm type={type} sujet={sujet} messageInitial={q ? `Je cherche : ${q}` : ""} />
      </div>
    </main>
  );
}
