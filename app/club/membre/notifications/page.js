import SousPage from "@/components/SousPage";
import NotificationToggle from "@/components/NotificationToggle";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Notifications() {
  await requireMember();
  return (
    <SousPage titre="Notifications">
      <NotificationToggle />
    </SousPage>
  );
}
