-- Le Goût du Chai — paiement Stripe
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Sans danger si on le relance.

-- 1. La carte enregistrée de chaque membre (référence Stripe, jamais le numéro de carte).
--    Table à part : un membre peut la lire, mais seul le serveur du club peut l'écrire.
create table if not exists public.member_cards (
  member_id uuid primary key references public.members(id) on delete cascade,
  stripe_customer_id text not null,
  payment_method text,
  brand text,
  last4 text,
  exp text,
  updated_at timestamptz not null default now()
);

alter table public.member_cards enable row level security;

drop policy if exists "carte: lire la sienne" on public.member_cards;
create policy "carte: lire la sienne" on public.member_cards
  for select using (
    auth.uid() = member_id
    or exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

-- 2. Un paiement par membre et par commande de domaine.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'en_cours'
    check (status in ('en_cours', 'payee', 'action_requise', 'refusee', 'sans_carte')),
  stripe_payment_intent text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, member_id)
);

create index if not exists payments_member_id_idx on public.payments (member_id);

alter table public.payments enable row level security;

drop policy if exists "paiement: lire les siens" on public.payments;
create policy "paiement: lire les siens" on public.payments
  for select using (
    auth.uid() = member_id
    or exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

-- Aucune règle d'écriture : seul le serveur (clé « service_role ») modifie ces deux tables.
