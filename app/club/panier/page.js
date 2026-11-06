import ClubHeader from "@/components/ClubHeader";
import CartView from "@/components/CartView";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Panier() {
  const { supabase, member } = await requireMember();
  const { data: carte } = await supabase
    .from("member_cards")
    .select("payment_method")
    .eq("member_id", member.id)
    .maybeSingle();
  return (
    <main className="shell">
      <ClubHeader />
      <h1 style={{ fontSize: 32 }}>Votre panier</h1>
      <div className="ornament" />
      <CartView memberId={member.id} hasCard={Boolean(carte?.payment_method)} />
    </main>
  );
}
