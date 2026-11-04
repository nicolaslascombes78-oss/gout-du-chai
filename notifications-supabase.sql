-- Le Goût du Chai — table des abonnements aux notifications
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- Chaque ligne = un téléphone (ou navigateur) d'un membre qui a accepté les notifications.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Chaque membre ne voit et ne gère que ses propres appareils.
drop policy if exists "push: lire les siens" on public.push_subscriptions;
create policy "push: lire les siens" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push: ajouter les siens" on public.push_subscriptions;
create policy "push: ajouter les siens" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push: modifier les siens" on public.push_subscriptions;
create policy "push: modifier les siens" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push: retirer les siens" on public.push_subscriptions;
create policy "push: retirer les siens" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
