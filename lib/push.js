// Envoi des notifications sur les téléphones des membres (côté serveur uniquement).
// Les clés sont lues dans les variables Vercel : jamais dans le code.
import webpush from "web-push";

let pret = false;

function configurer() {
  if (pret) return true;
  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  const sujet = process.env.VAPID_SUBJECT || "mailto:club@legoutduchai.fr";
  if (!publique || !privee) return false;
  webpush.setVapidDetails(sujet, publique, privee);
  pret = true;
  return true;
}

// userIds = null : tous les appareils abonnés ; sinon seulement ces membres.
export async function envoyer(supabase, { userIds = null, title, body, url, tag }) {
  if (!configurer()) return { ok: 0, echec: 0, erreur: "cles" };

  let requete = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (userIds) {
    if (userIds.length === 0) return { ok: 0, echec: 0 };
    requete = requete.in("user_id", userIds);
  }
  const { data: abonnements, error } = await requete;
  if (error) return { ok: 0, echec: 0, erreur: "lecture" };

  const message = JSON.stringify({ title, body, url, tag });
  let ok = 0;
  let echec = 0;
  const perimes = [];

  await Promise.all(
    (abonnements || []).map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          message,
          { TTL: 60 * 60 * 24 }
        );
        ok++;
      } catch (e) {
        echec++;
        // Appareil désinstallé ou notifications retirées : on le retire de la liste
        if (e?.statusCode === 404 || e?.statusCode === 410) perimes.push(a.id);
      }
    })
  );

  if (perimes.length) await supabase.from("push_subscriptions").delete().in("id", perimes);
  return { ok, echec };
}
