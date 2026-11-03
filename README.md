# Le Goût du Chai — appli web (MVP, étape 3)

Next.js (App Router) + Supabase. Mobile d'abord, thème « nuit et or ».

## Ce qui est en place

- `/` : page d'accueil publique, vitrine de 4 maisons, champ **code d'invitation**
- `/rejoindre?code=…` : prénom, nom, e-mail, majorité, conditions → envoi du **lien magique**
- `/connexion` : connexion des membres existants (lien magique, pas de mot de passe)
- `/auth/callback` : ouvre la session et crée la fiche membre (fonction `complete_signup`)
- `/club` : accueil membre : carte de membre n°, invitations restantes, coups de cœur, commandes les plus avancées
- `/club/selection` : catalogue avec filtres région, couleur, « Bientôt atteint », « Coups de cœur », « Nouveautés », « À venir »
- `/club/domaine/[slug]` : fiche domaine : jauge, date limite, histoire, coups de cœur, cuvées et prix adhérents par couleur

Code d'invitation de test déjà créé dans la base : **CHAI-2026** (30 utilisations).

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Le fichier `.env.local` contient déjà l'URL du projet Supabase et la clé publique.

## Réglages Supabase à faire (une fois)

Authentication → URL Configuration :

- **Site URL** : l'adresse du site en ligne (ex. `https://gout-du-chai.vercel.app`)
- **Redirect URLs** : ajouter `http://localhost:3000/**` et `https://gout-du-chai.vercel.app/**`

Authentication → Emails : traduire le modèle « Magic Link » (et « Confirm signup ») en français.

Attention : l'envoi d'e-mails intégré à Supabase est limité à quelques e-mails par heure.
Pour la bêta, brancher Resend comme serveur SMTP (Authentication → Emails → SMTP Settings).

## Mettre en ligne sur Vercel

1. Pousser ce dossier sur un dépôt GitHub.
2. Sur vercel.com : *Add New → Project*, importer le dépôt.
3. Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valeurs de `.env.example`).
4. Déployer, puis reporter l'adresse obtenue dans les réglages Supabase ci-dessus.

## Devenir administrateur

Après votre première inscription, exécuter dans le SQL Editor de Supabase :

```sql
update public.members set is_admin = true where email = 'votre@email.fr';
```

## Prochaines étapes

5. Panier multi-domaines + réservation + paiement Stripe
6. Espace admin
7. E-mails automatiques (Resend)
