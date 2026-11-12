-- Alterações V7 aplicadas ao projeto entre-suspeitos.
-- Reexecutável, preserva perfis e o usuário proprietário existente.
-- Requer privilégios de administrador de banco; NÃO executar no cliente.
create unique index if not exists es_profiles_nickname_normalized_unique_v7
  on public.es_profiles ((lower(regexp_replace(trim(nickname), '[[:space:]]+', '', 'g'))));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.es_profiles'::regclass
      and conname = 'es_zero_reserved_for_owner_v7'
  ) then
    alter table public.es_profiles
      add constraint es_zero_reserved_for_owner_v7
      check (
        lower(regexp_replace(trim(nickname), '[[:space:]]+', '', 'g')) <> 'zero'
        or id = '2723d7c1-123a-472b-85da-08261474d2c4'::uuid
      );
  end if;
end $$;

alter table public.es_admins enable row level security;
grant select on public.es_admins to authenticated;
drop policy if exists es_admins_read_self_v7 on public.es_admins;
create policy es_admins_read_self_v7
  on public.es_admins for select to authenticated
  using ((select auth.uid()) = user_id);
