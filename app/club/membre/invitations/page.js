import SousPage from "@/components/SousPage";
import InviteFriend from "@/components/InviteFriend";
import e from "@/components/Espace.module.css";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

const FUSEAU = "Europe/Paris";
const jour = (v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: FUSEAU });

// Adresse d'un invité affichée en partie : « philippe.martin@gmail.com » devient « phi…@gmail.com ».
function masquer(email) {
  const [nom, domaine] = String(email).split("@");
  if (!domaine) return "…";
  return `${nom.slice(0, 3)}…@${domaine}`;
}

function Code({ i, info }) {
  return (
    <div className={e.code}>
      <div className="stack" style={{ gap: 4 }}>
        <span className={e.codeNom}>{i.code}</span>
        {i.invited_email && <span className={e.codeInfo}>{masquer(i.invited_email)}</span>}
      </div>
      <span className={e.codeInfo}>{info}</span>
    </div>
  );
}

export default async function Invitations() {
  const { supabase, member } = await requireMember();
  const { data: invites } = await supabase.rpc("my_invitations");
  const now = new Date();
  const tous = invites || [];
  const enAttente = tous.filter((i) => !i.used && new Date(i.expires_at) >= now);
  const inscrits = tous.filter((i) => i.used);
  const expirees = tous.filter((i) => !i.used && new Date(i.expires_at) < now);

  return (
    <SousPage titre="Inviter un ami" intro="Un ami de plus, c'est un seuil atteint plus vite.">
      <InviteFriend invitesLeft={member.invites_left} isAdmin={member.is_admin} firstName={member.first_name} />

      {enAttente.length > 0 && (
        <section className="stack">
          <p className="eyebrow">En attente · {enAttente.length}</p>
          {enAttente.map((i) => (
            <Code key={i.code} i={i} info={`Expire le ${jour(i.expires_at)}`} />
          ))}
        </section>
      )}

      {inscrits.length > 0 && (
        <section className="stack">
          <p className="eyebrow">Ils ont rejoint le club · {inscrits.length}</p>
          {inscrits.map((i) => (
            <Code key={i.code} i={i} info={i.used_by_name || "Inscrit·e"} />
          ))}
        </section>
      )}

      {expirees.length > 0 && (
        <details className={e.expirees}>
          <summary>
            Voir {expirees.length > 1 ? `les ${expirees.length} invitations expirées` : "l'invitation expirée"}
          </summary>
          <div>
            {expirees.map((i) => (
              <Code key={i.code} i={i} info="Expirée" />
            ))}
          </div>
        </details>
      )}
    </SousPage>
  );
}
