-- Детские аккаунты, ожидающие согласия родителя (status = pending_verification),
-- не должны показываться в поиске/на главной/на сайте и не должны плодить дубли.
--
-- 1. Пока аккаунт pending — он скрыт (is_hidden = true). Все списки уже уважают is_hidden.
-- 2. Когда родитель подтверждает (status меняется с pending на любой другой) — скрытие снимается.
-- 3. Когда появляется «настоящий» аккаунт с тем же именем и датой рождения — черновики
--    pending с этим именем/датой удаляются (родитель зарегистрировал ребёнка заново
--    через другой контакт: телефон вместо email и т.п.).

create or replace function public.players_pending_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_verification' then
    new.is_hidden := true;
  elsif tg_op = 'UPDATE' and old.status = 'pending_verification' and new.status is distinct from 'pending_verification' then
    new.is_hidden := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_players_pending_visibility on public.players;
create trigger trg_players_pending_visibility
before insert or update of status on public.players
for each row execute function public.players_pending_visibility();

create or replace function public.players_drop_pending_duplicates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'pending_verification' and new.name is not null and new.birth_date is not null then
    delete from public.players p
    where p.id <> new.id
      and p.status = 'pending_verification'
      and p.birth_date = new.birth_date
      and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(new.name), '\s+', ' ', 'g'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_players_drop_pending_duplicates on public.players;
create trigger trg_players_drop_pending_duplicates
after insert or update of status on public.players
for each row execute function public.players_drop_pending_duplicates();

-- Бэкфилл: скрыть текущие черновики
update public.players set is_hidden = true where status = 'pending_verification' and is_hidden is distinct from true;
