-- ═══════════════════════════════════════════════════════════════
-- STI V2.0 — Schéma Supabase (à coller dans SQL Editor → Run)
-- Abonnés avec validation admin + journal des accès (lieu/durée)
-- ═══════════════════════════════════════════════════════════════

-- 1) Qui est admin ? (détection par e-mail, côté base, infalsifiable)
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') = 'aymenessouyah@gmail.com', false);
$$;

-- 2) Tables
create type public.statut_abonne as enum ('en_attente','actif','suspendu','exclu');

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  statut public.statut_abonne not null default 'en_attente',
  cree_le timestamptz not null default now()
);

create table if not exists public.acces (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  debut timestamptz not null default now(),
  fin timestamptz,
  duree_sec integer,
  lieu text,
  page text
);

-- 3) Chaque inscription crée automatiquement son profil « en_attente »
create or replace function public.nouveau_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists trg_nouveau_profil on auth.users;
create trigger trg_nouveau_profil after insert on auth.users
for each row execute function public.nouveau_profil();

-- 4) L'admin est actif d'office (s'il existe déjà dans Authentication)
insert into public.profiles (id, email, statut)
select id, email, 'actif' from auth.users where email = 'aymenessouyah@gmail.com'
on conflict (id) do update set statut = 'actif';

-- 5) Sécurité (RLS) : chacun voit son profil ; l'admin voit et modifie tout
alter table public.profiles enable row level security;
alter table public.acces enable row level security;

drop policy if exists prof_sel on public.profiles;
create policy prof_sel on public.profiles for select to authenticated
  using (id = auth.uid() or public.est_admin());

drop policy if exists prof_upd_admin on public.profiles;
create policy prof_upd_admin on public.profiles for update to authenticated
  using (public.est_admin());

drop policy if exists acces_ins_self on public.acces;
create policy acces_ins_self on public.acces for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists acces_sel on public.acces;
create policy acces_sel on public.acces for select to authenticated
  using (user_id = auth.uid() or public.est_admin());

drop policy if exists acces_upd_self on public.acces;
create policy acces_upd_self on public.acces for update to authenticated
  using (user_id = auth.uid());

-- ✔️ Fin. Vérifiez dans Table Editor : tables « profiles » et « acces » présentes.
