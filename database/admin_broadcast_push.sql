-- Рассылка от админа: полный текст — сообщением в чат, пуш — короткий анонс.
create or replace function public.send_admin_broadcast(p_test_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := '1bc22582-30bf-4375-9c0b-ac6132542094';
  v_push_title jsonb := jsonb_build_object(
    'ru', 'Как игры на выходных? 🔥',
    'en', 'How were the weekend games? 🔥',
    'fi', 'Miten viikonlopun pelit menivät? 🔥',
    'lt', 'Kaip sekėsi savaitgalio rungtynės? 🔥',
    'pl', 'Jak poszły weekendowe mecze? 🔥'
  );
  v_push_body jsonb := jsonb_build_object(
    'ru', 'Новый сезон — статистика обнулилась. Заполняй её после каждой игры и попадай в рейтинг. Подробности в сообщении 👉',
    'en', 'New season — your stats were reset. Log them after every game and climb the rating. Details in your messages 👉',
    'fi', 'Uusi kausi — tilastosi nollattiin. Kirjaa ne jokaisen pelin jälkeen ja nouse rankingiin. Lisätiedot viesteissä 👉',
    'lt', 'Naujas sezonas — statistika nunulinta. Pildyk ją po kiekvienų rungtynių ir kilk reitinge. Daugiau — žinutėje 👉'
,
    'pl', 'Nowy sezon — statystyki zostały wyzerowane. Uzupełniaj je po każdym meczu i wchodź do rankingu. Szczegóły w wiadomości 👉'
  );
  v_msg jsonb := jsonb_build_object(
    'ru', E'Как игры на выходных? 🔥\n\nТвоя статистика в Hockeystars обнулилась с новым сезоном 🤷🏻‍♂️. Заполняй новую статистику после каждой игры, попадай в рейтинг Hockeystars и соревнуйся с друзьями!\n\nЗакрой пару раз приложение и открой снова. Мы перезалили лёд, теперь всё по-другому!\n\nДобавь своему профилю обложку с командой, заливай свои видео-хайлайты и жди продвижение тебя от нас в тикток и инстаграм!',
    'en', E'How were the weekend games? 🔥\n\nYour Hockeystars stats were reset for the new season 🤷🏻‍♂️. Log your new stats after every game, climb the Hockeystars rating and compete with friends!\n\nClose the app a couple of times and open it again. We resurfaced the ice — everything looks different now!\n\nAdd a team cover to your profile, upload your video highlights and get promoted by us on TikTok and Instagram!',
    'fi', E'Miten viikonlopun pelit menivät? 🔥\n\nHockeystars-tilastosi nollattiin uuden kauden alkaessa 🤷🏻‍♂️. Kirjaa uudet tilastot jokaisen pelin jälkeen, nouse Hockeystars-rankingiin ja kilpaile kavereiden kanssa!\n\nSulje sovellus pari kertaa ja avaa uudelleen. Jäädytimme kentän uudestaan — kaikki näyttää nyt erilaiselta!\n\nLisää profiiliisi joukkueen kansikuva, lataa video-kohokohtasi ja saat meiltä nostoa TikTokissa ja Instagramissa!',
    'lt', E'Kaip sekėsi savaitgalio rungtynės? 🔥\n\nTavo Hockeystars statistika buvo nunulinta prasidėjus naujam sezonui 🤷🏻‍♂️. Pildyk naują statistiką po kiekvienų rungtynių, kilk Hockeystars reitinge ir varžykis su draugais!\n\nPorą kartų uždaryk programėlę ir atidaryk iš naujo. Mes perliejome ledą — dabar viskas atrodo kitaip!\n\nPridėk profiliui viršelį su komanda, kelk savo vaizdo akimirkas ir lauk mūsų reklamos TikTok ir Instagram!'
,
    'pl', E'Jak poszły weekendowe mecze? 🔥\n\nTwoje statystyki w Hockeystars zostały wyzerowane wraz z nowym sezonem 🤷🏻‍♂️. Uzupełniaj nowe statystyki po każdym meczu, wchodź do rankingu Hockeystars i rywalizuj ze znajomymi!\n\nZamknij aplikację kilka razy i otwórz ponownie. Odnowiliśmy lód — teraz wszystko wygląda inaczej!\n\nDodaj do profilu okładkę z drużyną, wrzucaj swoje wideo-highlighty i czekaj na promocję od nas na TikToku i Instagramie!'
  );
  v_chunk jsonb := '[]'::jsonb;
  v_n int := 0;
  v_tokens int := 0;
  v_requests int := 0;
  v_recipients int := 0;
  r record;
begin
  -- 1. Сообщения в чат (по одному на игрока), затем счётчик непрочитанных
  create temp table _bc_recipients on commit drop as
    select p.id, coalesce(split_part(p.language, '-', 1), 'en') as lang
    from public.players p
    where (p_test_user is not null and p.id = p_test_user)
       or (p_test_user is null and p.status = 'player' and coalesce(p.is_hidden, false) = false);

  insert into public.messages (sender_id, receiver_id, text, read, created_at)
  select v_admin, b.id, coalesce(v_msg->>b.lang, v_msg->>'en'), false, now()
  from _bc_recipients b;

  update public.players p
  set unread_messages_count = (
        select count(*) from public.messages m where m.receiver_id = p.id and m.read = false
      ),
      updated_at = now()
  where p.id in (select id from _bc_recipients);

  select count(*) into v_recipients from _bc_recipients;

  -- 2. Короткий пуш — только тем, у кого есть токен
  for r in
    select distinct on (t.token) t.token, b.lang
    from public.push_tokens t
    join _bc_recipients b on b.id = t.user_id
    where t.token like 'ExponentPushToken[%'
  loop
    v_chunk := v_chunk || jsonb_build_object(
      'to', r.token,
      'title', coalesce(v_push_title->>r.lang, v_push_title->>'en'),
      'body', coalesce(v_push_body->>r.lang, v_push_body->>'en'),
      'sound', 'default',
      'priority', 'high',
      'channelId', 'default',
      'data', jsonb_build_object('type', 'message', 'action', 'open_chat', 'screen', 'messages', 'tab', 'messages', 'senderId', v_admin, 'deepLink', '/chat/' || v_admin::text)
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

  insert into public.admin_broadcast_log(audience, recipients, tokens, requests)
  values (case when p_test_user is null then 'players' else 'test:' || p_test_user::text end, v_recipients, v_tokens, v_requests);

  return jsonb_build_object('recipients', v_recipients, 'tokens', v_tokens, 'requests', v_requests);
end;
$$;

revoke all on function public.send_admin_broadcast(uuid) from public, anon, authenticated;
