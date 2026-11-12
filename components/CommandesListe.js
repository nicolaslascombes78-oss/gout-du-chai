// Liste complète des commandes d'un membre : « En cours » (cartes repliables) puis « Livrées ».
import Link from "next/link";
import Gauge from "@/components/Gauge";
import CancelDomainButton from "@/components/CancelDomainButton";
import OrderTimeline, { dateLongue } from "@/components/OrderTimeline";
import s from "@/components/Commandes.module.css";
import { euros } from "@/lib/catalogue";
import { statutCommande, resumeCommande } from "@/lib/commandes";

export default function CommandesListe({ enCours, passees, progress }) {
  const today = new Date().toISOString().slice(0, 10);
  const toutesLivrees = passees.every((g) => g.domain.status === "livre");

  return (
    <>
      {enCours.length > 0 && (
        <div className={s.groupe}>
          <p className={s.titreGroupe}>
            En cours <span>· {enCours.length}</span>
          </p>
          {enCours.map((g) => {
            const d = g.domain;
            const p = progress[d.id] || { reserved_bottles: 0, participants: 0 };
            const editable =
              ["ouvert", "bientot_atteint"].includes(d.status) && (!d.deadline || d.deadline >= today);
            const paid = g.lines.every((r) => r.status === "payee");
            const st = statutCommande(d, p, paid, g.bottles);
            return (
              <details className={s.carte} key={g.cle} id={`commande-${d.slug}`}>
                <summary>
                  <div className={s.entete}>
                    <div className={s.identite}>
                      <h3 className={s.domaine}>{d.name}</h3>
                      <span className={s.resume}>{resumeCommande(g)}</span>
                    </div>
                    <span className={s.prix}>{euros(g.total)}</span>
                  </div>
                  <div className={s.barre} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n < st.etape ? s.segFait : n === st.etape ? s.segEnCours : s.seg} />
                    ))}
                  </div>
                  <div className={s.statut}>
                    <span className={s.statutTexte}>{st.texte}</span>
                    <span className={s.etapeNum}>{st.etape} / 5</span>
                  </div>
                  {st.sous && <p className={s.sous}>{st.sous}</p>}
                  <span className={s.voir}>
                    <span>
                      <span className={s.voirOuvrir}>Voir le suivi</span>
                      <span className={s.voirFermer}>Masquer le suivi</span>
                    </span>
                    <svg className={s.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </summary>

                <div className={s.corps}>
                  <OrderTimeline
                    status={d.status}
                    paid={paid}
                    prevue={d.expected_delivery}
                    seuil={{ atteint: st.atteint, reserved: p.reserved_bottles, threshold: d.threshold, participants: p.participants }}
                    dates={{
                      reservee: g.reservedAt,
                      declenchee: d.triggered_at,
                      payee: g.paidAt,
                      expediee: d.shipped_at,
                      livree: d.delivered_at,
                    }}
                  />
                  {!st.atteint && d.threshold ? (
                    <Gauge
                      reserved={p.reserved_bottles}
                      threshold={d.threshold}
                      participants={p.participants}
                      deadline={d.deadline}
                      showDeadline
                      mine={g.bottles}
                      size={64}
                    />
                  ) : null}
                  <div className={s.bloc}>
                    <span className={s.etiquette}>Votre réservation</span>
                    {g.lines.map((r) => (
                      <div className={s.ligneCuvee} key={r.id}>
                        <span>
                          {r.quantity} × {r.cuvees.name}
                          {r.cuvees.vintage ? ` ${r.cuvees.vintage}` : ""}
                        </span>
                        <span>{euros(r.quantity * Number(r.unit_price))}</span>
                      </div>
                    ))}
                    {g.lines.length > 1 && (
                      <div className={s.total}>
                        <span>
                          {g.bottles} bouteille{g.bottles > 1 ? "s" : ""}
                        </span>
                        <span>{euros(g.total)}</span>
                      </div>
                    )}
                    {editable ? (
                      <div className={s.actions}>
                        <Link href={`/club/domaine/${d.slug}`}>Modifier</Link>
                        <CancelDomainButton cuveeIds={g.lines.map((r) => r.cuvees.id)} domainName={d.name} />
                      </div>
                    ) : (
                      <p className="muted">Réservations closes, le domaine prépare la commande.</p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {passees.length > 0 && (
        <div className={s.groupe}>
          <p className={s.titreGroupePasse}>
            {toutesLivrees ? "Livrées" : "Terminées"} <span>· {passees.length}</span>
          </p>
          {passees.map((g) => {
            const d = g.domain;
            const livree = d.status === "livre";
            const le = dateLongue(d.delivered_at);
            return (
              <div className={s.passee} key={g.cle}>
                <div className={s.entete}>
                  <div className={s.identite}>
                    <h3 className={s.domaine}>{d.name}</h3>
                    <span className={s.resume}>
                      {resumeCommande(g)} · {euros(g.total)}
                    </span>
                  </div>
                  {livree ? (
                    <span className={s.coche} role="img" aria-label="Livrée">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  ) : (
                    <span className="badge">Close</span>
                  )}
                </div>
                <div className={s.pied}>
                  <span>{livree ? (le ? `Livrée le ${le}` : "Livrée") : "Commande non lancée"}</span>
                  {livree && (
                    <Link href={`/club/domaine/${d.slug}`} className={s.avis}>
                      Donner mon avis
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
