create table if not exists public.admin_broadcast_log (
  id bigserial primary key,
  sent_at timestamptz default now(),
  audience text,
  recipients int,
  tokens int,
  requests int
);

create or replace function public.send_admin_broadcast(p_test_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title jsonb := jsonb_build_object(
    'ru', 'Как игры на выходных? 🔥',
    'en', 'How were the weekend games? 🔥',
    'fi', 'Miten viikonlopun pelit menivät? 🔥',
    'lt', 'Kaip sekėsi savaitgalio rungtynės? 🔥'
  );
  v_body jsonb := jsonb_build_object(
    'ru', E'Твоя статистика в Hockeystars обнулилась с новым сезоном 🤷🏻‍♂️. Заполняй новую статистику после каждой игры, попадай в рейтинг Hockeystars и соревнуйся с друзьями!\nЗакрой пару раз приложение и открой снова. Мы перезалили лёд, теперь всё по-другому!\nДобавь своему профилю обложку с командой, заливай свои видео-хайлайты и жди продвижение тебя от нас в тикток и инстаграм!',
    'en', E'Your Hockeystars stats were reset for the new season 🤷🏻‍♂️. Log your new stats after every game, climb the Hockeystars rating and compete with friends!\nClose the app a couple of times and open it again. We resurfaced the ice — everything looks different now!\nAdd a team cover to your profile, upload your video highlights and get promoted by us on TikTok and Instagram!',
    'fi', E'Hockeystars-tilastosi nollattiin uuden kauden alkaessa 🤷🏻‍♂️. Kirjaa uudet tilastot jokaisen pelin jälkeen, nouse Hockeystars-rankingiin ja kilpaile kavereiden kanssa!\nSulje sovellus pari kertaa ja avaa uudelleen. Jäädytimme kentän uudestaan — kaikki näyttää nyt erilaiselta!\nLisää profiiliisi joukkueen kansikuva, lataa video-kohokohtasi ja saat meiltä nostoa TikTokissa ja Instagramissa!',
    'lt', E'Tavo Hockeystars statistika buvo nunulinta prasidėjus naujam sezonui 🤷🏻‍♂️. Pildyk naują statistiką po kiekvienų rungtynių, kilk Hockeystars reitinge ir varžykis su draugais!\nPorą kartų uždaryk programėlę ir atidaryk iš naujo. Mes perliejome ledą — dabar viskas atrodo kitaip!\nPridėk profiliui viršelį su komanda, kelk savo vaizdo akimirkas ir lauk mūsų reklamos TikTok ir Instagram!'
  );
  v_chunk jsonb := '[]'::jsonb;
  v_n int := 0;
  v_tokens int := 0;
  v_requests int := 0;
  v_recipients int := 0;
  r record;
begin
  for r in
    select distinct on (t.token) t.token, coalesce(split_part(p.language, '-', 1), 'en') as lang, p.id as player_id
    from public.push_tokens t
    join public.players p on p.id = t.user_id
    where t.token like 'ExponentPushToken[%'
      and (
        (p_test_user is not null and p.id = p_test_user)
        or (p_test_user is null and p.status = 'player' and coalesce(p.is_hidden, false) = false)
      )
  loop
    v_chunk := v_chunk || jsonb_build_object(
      'to', r.token,
      'title', coalesce(v_title->>r.lang, v_title->>'en'),
      'body', coalesce(v_body->>r.lang, v_body->>'en'),
      'sound', 'default',
      'priority', 'high',
      'channelId', 'default',
      'data', jsonb_build_object('type', 'admin_broadcast', 'deepLink', 'hockeystars://')
    );
    v_n := v_n + 1;
    v_tokens := v_tokens + 1;
    if v_n >= 99 then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        body := v_chunk
      );
      v_requests := v_requests + 1;
      v_chunk := '[]'::jsonb;
      v_n := 0;
    end if;
  end loop;

  if v_n > 0 then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
      body := v_chunk
    );
    v_requests := v_requests + 1;
  end if;

  select count(distinct p.id) into v_recipients
  from public.push_tokens t join public.players p on p.id = t.user_id
  where t.token like 'ExponentPushToken[%'
    and ((p_test_user is not null and p.id = p_test_user)
      or (p_test_user is null and p.status = 'player' and coalesce(p.is_hidden, false) = false));

  insert into public.admin_broadcast_log(audience, recipients, tokens, requests)
  values (case when p_test_user is null then 'players' else 'test:' || p_test_user::text end, v_recipients, v_tokens, v_requests);

  return jsonb_build_object('recipients', v_recipients, 'tokens', v_tokens, 'requests', v_requests);
end;
$$;

revoke all on function public.send_admin_broadcast(uuid) from public, anon, authenticated;
