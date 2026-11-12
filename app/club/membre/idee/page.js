import SousPage from "@/components/SousPage";
import FeedbackForm from "@/components/FeedbackForm";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Idee() {
  await requireMember();
  return (
    <SousPage
      titre="Une envie, une idée ?"
      intro="Un domaine que vous aimeriez voir au club, une amélioration, un souci : écrivez-nous."
    >
      <div className="card">
        <FeedbackForm />
      </div>
    </SousPage>
  );
}
