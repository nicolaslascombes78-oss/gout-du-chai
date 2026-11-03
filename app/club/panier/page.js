import ClubHeader from "@/components/ClubHeader";
import CartView from "@/components/CartView";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Panier() {
  const { member } = await requireMember();
  return (
    <main className="shell">
      <ClubHeader />
      <h1 style={{ fontSize: 32 }}>Votre panier</h1>
      <div className="ornament" />
      <CartView memberId={member.id} />
    </main>
  );
}
