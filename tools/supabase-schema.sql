-- ═══════════════════════════════════════════════════════════════
-- STI V2.0 — Base complète, remise à zéro propre
-- Un seul script qui annule tout le passé et reconstruit tout :
--   e-mail OU téléphone, nom/prénom, lycée/classe, RLS, fonctions admin
-- ═══════════════════════════════════════════════════════════════

-- 0) Nettoyage complet du passé
drop trigger if exists trg_nouveau_profil on auth.users;
drop function if exists public.nouveau_profil() cascade;
drop function if exists public.admin_set_password(uuid, text) cascade;
drop function if exists public.admin_supprimer_abonne(uuid) cascade;
drop function if exists public.est_admin() cascade;
drop table if exists public.acces;
drop table if exists public.profiles;
drop type if exists public.statut_abonne;

-- 1) Qui est admin ? (détection par e-mail, côté base, infalsifiable)
create function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') = 'aymenessouyah@gmail.com', false);
$$;

-- 2) Tables
create type public.statut_abonne as enum ('en_attente','actif','suspendu','exclu');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  phone text unique,
  nom text,
  prenom text,
  lycee text,
  classe text,
  statut public.statut_abonne not null default 'en_attente',
  cree_le timestamptz not null default now(),
  constraint au_moins_un_contact check (email is not null or phone is not null)
);

create table public.acces (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  debut timestamptz not null default now(),
  fin timestamptz,
  duree_sec integer,
  lieu text,
  page text
);

-- 3) Chaque inscription (e-mail OU téléphone) crée automatiquement son profil
create function public.nouveau_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, nom, prenom, lycee, classe)
  values (
    new.id,
    new.email,
    nullif(new.phone, ''),
    new.raw_user_meta_data->>'nom',
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'lycee',
    new.raw_user_meta_data->>'classe'
  )
  on conflict (id) do update
    set email = excluded.email, phone = excluded.phone;
  return new;
end $$;

create trigger trg_nouveau_profil after insert on auth.users
for each row execute function public.nouveau_profil();

-- 4) Récupération des comptes existants (auth.users déjà créés)
insert into public.profiles (id, email, phone, nom, prenom, lycee, classe, statut)
select u.id,
       u.email,
       nullif(u.phone, ''),
       u.raw_user_meta_data->>'nom',
       u.raw_user_meta_data->>'prenom',
       u.raw_user_meta_data->>'lycee',
       u.raw_user_meta_data->>'classe',
       case when u.email = 'aymenessouyah@gmail.com'
            then 'actif'::public.statut_abonne
            else 'en_attente'::public.statut_abonne end
from auth.users u
on conflict (id) do nothing;

-- 5) Sécurité (RLS) : chacun voit son profil ; l'admin voit et modifie tout
alter table public.profiles enable row level security;
alter table public.acces enable row level security;

create policy prof_sel on public.profiles for select to authenticated
  using (id = auth.uid() or public.est_admin());

create policy prof_upd_admin on public.profiles for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

create policy acces_ins_self on public.acces for insert to authenticated
  with check (user_id = auth.uid());

create policy acces_sel on public.acces for select to authenticated
  using (user_id = auth.uid() or public.est_admin());

create policy acces_upd_self on public.acces for update to authenticated
  using (user_id = auth.uid() or public.est_admin());

create policy acces_del_admin on public.acces for delete to authenticated
  using (public.est_admin());

-- 6) Nouveau mot de passe défini par l'admin (l'ancien reste invisible)
create function public.admin_set_password(uid uuid, newpass text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'action reservee a l''administrateur';
  end if;
  perform auth.admin_update_user(uid, jsonb_build_object('password', newpass));
end $$;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- 7) Suppression définitive d'un abonné (bouton 🗑️ — robuste : 2 méthodes)
create function public.admin_supprimer_abonne(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'action reservee a l''administrateur';
  end if;
  if uid = (select id from auth.users where email = 'aymenessouyah@gmail.com') then
    raise exception 'impossible de supprimer l''administrateur';
  end if;
  delete from public.acces where user_id = uid;
  delete from public.profiles where id = uid;
  begin
    perform auth.admin_delete_user(uid);          -- méthode récente si disponible
  exception when undefined_function then
    delete from auth.users where id = uid;        -- sinon suppression directe (cascade)
  end;
end $$;
revoke execute on function public.admin_supprimer_abonne(uuid) from public, anon;
grant execute on function public.admin_supprimer_abonne(uuid) to authenticated;

-- 8) Taille utilisée dans Supabase (pour afficher le % et la quantité restante sur 500 Mo)
drop function if exists public.admin_taille_base() cascade;
create function public.admin_taille_base() returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'action reservee a l''administrateur';
  end if;
  return (
    coalesce(pg_total_relation_size('public.profiles'), 0) +
    coalesce(pg_total_relation_size('public.acces'), 0) +
    coalesce(pg_total_relation_size('auth.users'), 0)
  );
end $$;
revoke execute on function public.admin_taille_base() from public, anon;
grant execute on function public.admin_taille_base() to authenticated;
