-- SQL скрипт для обновления упражнений с переводами
-- Сгенерировано автоматически из переведенного CSV файла
-- Всего упражнений: 38

-- Разминка шеи (#27)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Медленно поворачивайте голову влево и вправо","Наклоняйте голову вперед и назад","Выполняйте круговые движения головой","Держите плечи расслабленными"]',
    tips_ru = '["Двигайтесь медленно и плавно","Не делайте резких движений","При появлении боли остановитесь","Дышите глубоко и равномерно"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka szyi',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Powoli obracaj głowę w lewo i prawo","Pochyl głowę do przodu i do tyłu","Wykonuj ruchy okrężne głową","Rozluźnij ramiona"]',
    tips_pl = '["Poruszaj się powoli i płynnie","Nie wykonuj żadnych gwałtownych ruchów","Jeśli wystąpi ból, przerwij.","Oddychaj głęboko i równomiernie"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Uppvärmning av halsen',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Vrid sakta huvudet åt vänster och höger","Luta huvudet framåt och bakåt","Utför cirkulära rörelser med huvudet","Håll dina axlar avslappnade"]',
    tips_sv = '["Rör dig långsamt och smidigt","Gör inga plötsliga rörelser","Om smärta uppstår, sluta.","Andas djupt och jämnt"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Zahřívání krku',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Pomalu otáčejte hlavou doleva a doprava","Nakloňte hlavu dopředu a dozadu","Provádějte krouživé pohyby hlavou","Udržujte ramena uvolněná"]',
    tips_cs = '["Pohybujte se pomalu a plynule","Nedělejte žádné náhlé pohyby","Pokud se objeví bolest, přestaňte.","Dýchejte zhluboka a rovnoměrně"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Zahrievanie krku',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Pomaly otočte hlavu doľava a doprava","Nakloňte hlavu dopredu a dozadu","Vykonajte kruhové pohyby hlavou","Nechajte ramená uvoľnené"]',
    tips_sk = '["Pohybujte sa pomaly a plynulo","Nerobte žiadne náhle pohyby","Ak sa objaví bolesť, prestaňte.","Dýchajte zhlboka a rovnomerne"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kaulan lämmittely',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Käännä päätäsi hitaasti vasemmalle ja oikealle","Kallista päätäsi eteenpäin ja taaksepäin","Tee pyöreitä liikkeitä päälläsi","Pidä hartiat rentoina"]',
    tips_fi = '["Liiku hitaasti ja tasaisesti","Älä tee äkillisiä liikkeitä","Jos kipua ilmenee, lopeta.","Hengitä syvään ja tasaisesti"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento del collo',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Gira lentamente la testa a sinistra e a destra","Inclina la testa avanti e indietro","Eseguire movimenti circolari con la testa","Mantieni le spalle rilassate"]',
    tips_it = '["Muoviti lentamente e senza intoppi","Non fare movimenti bruschi","Se si avverte dolore, interrompere l''operazione.","Respira profondamente e in modo uniforme"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Nackenaufwärmübungen',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Drehen Sie Ihren Kopf langsam nach links und rechts","Neigen Sie Ihren Kopf nach vorne und hinten","Führen Sie kreisende Bewegungen mit dem Kopf aus","Halten Sie Ihre Schultern entspannt"]',
    tips_de = '["Bewegen Sie sich langsam und gleichmäßig","Machen Sie keine plötzlichen Bewegungen","Wenn Schmerzen auftreten, hören Sie auf.","Atme tief und gleichmäßig"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement du cou',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Tournez lentement la tête à gauche et à droite","Penchez la tête en avant et en arrière","Effectuez des mouvements circulaires avec votre tête","Gardez vos épaules détendues"]',
    tips_fr = '["Déplacez-vous lentement et en douceur","Ne faites pas de mouvements brusques","Si vous ressentez de la douleur, arrêtez.","Respirez profondément et régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '27';


-- Разминка запястий (#28)
UPDATE exercises 
SET 
    instructions_ru = '["Вытяните руки перед собой","Согните запястья вверх и вниз","Поворачивайте запястья по кругу","Сжимайте и разжимайте кулаки","Растягивайте пальцы в стороны"]',
    tips_ru = '["Выполняйте движения медленно","Не перенапрягайте суставы","Следите за ощущениями в запястьях","Повторяйте регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka nadgarstków',
    instructions_pl = '["Wyciągnij ramiona przed siebie","Zegnij nadgarstki w górę i w dół","Obróć nadgarstki w kółko","Zaciskaj i rozluźniaj pięści","Rozciągnij palce na boki"]',
    tips_pl = '["Wykonuj ruchy powoli","Nie przeciążaj stawów","Zwróć uwagę na odczucia w nadgarstkach","Powtarzaj regularnie"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Handledsuppvärmning',
    instructions_sv = '["Sträck ut armarna framför dig","Böj handlederna upp och ner","Rotera handlederna i en cirkel","Knyt och knyt nävarna","Sträck fingrarna åt sidorna"]',
    tips_sv = '["Utför rörelserna långsamt","Överansträng inte dina leder","Var uppmärksam på förnimmelserna i dina handleder","Upprepa regelbundet"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Zahřívání zápěstí',
    instructions_cs = '["Natáhněte ruce před sebe","Ohněte zápěstí nahoru a dolů","Otočte zápěstí do kruhu","Zatínejte a uvolňujte pěsti","Natáhněte prsty do stran"]',
    tips_cs = '["Pohyby provádějte pomalu","Nepřetěžujte klouby","Věnujte pozornost pocitům v zápěstích","Opakujte pravidelně"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Zahrievanie zápästia',
    instructions_sk = '["Natiahnite ruky pred seba","Ohnite zápästia hore a dole","Otočte zápästia do kruhu","Zatínajte a uvoľňujte päste","Natiahnite prsty do strán"]',
    tips_sk = '["Pohyby vykonávajte pomaly","Nepreťažujte kĺby","Venujte pozornosť pocitom vo vašich zápästiach","Opakujte pravidelne"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Ranteen lämmittely',
    instructions_fi = '["Ojenna kätesi edessäsi","Taivuta ranteita ylös ja alas","Pyöritä ranteitasi ympyrässä","Purista ja purista nyrkkisi","Venytä sormet sivuille"]',
    tips_fi = '["Tee liikkeet hitaasti","Älä ylikuormita niveliäsi","Kiinnitä huomiota ranteissasi oleviin tuntemuksiin","Toista säännöllisesti"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento del polso',
    instructions_it = '["Allunga le braccia davanti a te","Piega i polsi su e giù","Ruota i polsi in cerchio","Stringi e apri i pugni","Allunga le dita ai lati"]',
    tips_it = '["Eseguire i movimenti lentamente","Non sforzare troppo le articolazioni","Presta attenzione alle sensazioni nei tuoi polsi","Ripetere regolarmente"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Aufwärmen der Handgelenke',
    instructions_de = '["Strecken Sie Ihre Arme vor sich aus","Beugen Sie Ihre Handgelenke nach oben und unten","Drehen Sie Ihre Handgelenke im Kreis","Ballen und öffnen Sie Ihre Fäuste","Strecken Sie Ihre Finger zu den Seiten"]',
    tips_de = '["Führen Sie die Bewegungen langsam aus","Überanstrengen Sie Ihre Gelenke nicht","Achten Sie auf die Empfindungen in Ihren Handgelenken","Regelmäßig wiederholen"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement du poignet',
    instructions_fr = '["Tendez vos bras devant vous","Pliez vos poignets de haut en bas","Faites tourner vos poignets en cercle","Serrez et desserrez vos poings","Étirez vos doigts sur les côtés"]',
    tips_fr = '["Effectuez les mouvements lentement","Ne sollicitez pas trop vos articulations","Faites attention aux sensations dans vos poignets","Répéter régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '28';


-- Разминка коленей (#29)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Медленно сгибайте и разгибайте колени","Выполняйте круговые движения коленями","Делайте приседания с небольшой амплитудой","Растягивайте переднюю поверхность бедра"]',
    tips_ru = '["Не делайте глубоких приседаний","Двигайтесь плавно и контролируемо","При боли в коленях уменьшите амплитуду","Следите за правильной техникой"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie kolan',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Powoli zegnij i wyprostuj kolana","Wykonuj ruchy okrężne kolanami","Wykonuj przysiady z małą amplitudą","Rozciągnij przednią część uda"]',
    tips_pl = '["Nie rób głębokich przysiadów","Poruszaj się płynnie i kontroluj","Jeśli odczuwasz ból kolana, zmniejsz zakres ruchu.","Upewnij się, że stosujesz właściwą technikę"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Knä sträcker sig',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Böj långsamt och räta ut dina knän","Utför cirkulära rörelser med knäna","Gör knäböj med liten amplitud","Sträck på framsidan av låret"]',
    tips_sv = '["Gör inte djupa knäböj","Rör dig smidigt och med kontroll","Om du har knäsmärta, minska rörelseomfånget.","Se till att du använder rätt teknik"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protahuje se koleno',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Pomalu pokrčte a narovnejte kolena","Provádějte kruhové pohyby s koleny","Dělejte dřepy s malou amplitudou","Protáhněte přední část stehna"]',
    tips_cs = '["Nedělejte hluboké dřepy","Pohybujte se plynule a pod kontrolou","Pokud vás bolí koleno, snižte rozsah pohybu.","Ujistěte se, že používáte správnou techniku"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Naťahuje sa kolená',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Pomaly ohnite a narovnajte kolená","Vykonajte kruhové pohyby kolenami","Robte drepy s malou amplitúdou","Natiahnite prednú časť stehna"]',
    tips_sk = '["Nerobte hlboké drepy","Pohybujte sa hladko a pod kontrolou","Ak máte bolesti kolena, znížte rozsah pohybu.","Uistite sa, že používate správnu techniku"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Polvi venyy',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Taivuta ja suorista polvia hitaasti","Tee pyöreitä liikkeitä polvillasi","Tee kyykkyjä pienellä amplitudilla","Venytä reidesi etuosaa"]',
    tips_fi = '["Älä tee syviä kyykkyjä","Liikkuu sujuvasti ja hallinnassa","Jos sinulla on polvikipua, vähennä liikettä.","Varmista, että käytät oikeaa tekniikkaa"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'allungamenti del ginocchio',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Piega e raddrizza lentamente le ginocchia","Eseguire movimenti circolari con le ginocchia","Fai squat con una piccola ampiezza","Allunga la parte anteriore della coscia"]',
    tips_it = '["Non fare squat profondi","Muoviti con fluidità e controllo","Se avverti dolore al ginocchio, riduci l''ampiezza del movimento.","Assicurati di utilizzare la tecnica corretta"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Kniedehnungen',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Beugen und strecken Sie langsam Ihre Knie","Führen Sie kreisende Bewegungen mit den Knien aus","Machen Sie Kniebeugen mit kleiner Amplitude","Dehnen Sie die Vorderseite Ihres Oberschenkels"]',
    tips_de = '["Machen Sie keine tiefen Kniebeugen","Bewegen Sie sich reibungslos und kontrolliert","Wenn Sie Knieschmerzen haben, reduzieren Sie den Bewegungsumfang.","Stellen Sie sicher, dass Sie die richtige Technik verwenden"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirements des genoux',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Pliez et redressez lentement vos genoux","Effectuez des mouvements circulaires avec vos genoux","Faites des squats avec une petite amplitude","Étirez l''avant de votre cuisse"]',
    tips_fr = '["Ne faites pas de squats profonds","Déplacez-vous en douceur et en contrôle","Si vous avez des douleurs au genou, réduisez l’amplitude des mouvements.","Assurez-vous d''utiliser la bonne technique"]',
    updated_at = NOW()
WHERE exercise_id = '29';


-- Разминка тазобедренных суставов (#30)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Поднимайте колено к груди","Отводите ногу в сторону и назад","Выполняйте круговые движения бедром","Делайте выпады с небольшой амплитудой"]',
    tips_ru = '["Держите спину прямой","Работайте в комфортной амплитуде","Не торопитесь с движениями","Следите за балансом"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka bioder',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Podnieś kolano do klatki piersiowej","Przesuń nogę na bok i do tyłu","Wykonuj ruchy okrężne biodrami","Wykonuj wypady z małą amplitudą"]',
    tips_pl = '["Trzymaj plecy prosto","Pracuj w komfortowym zakresie","Nie spiesz się ze swoimi ruchami","Śledź swoje saldo"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Höftuppvärmning',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Lyft upp ditt knä mot bröstet","Flytta benet åt sidan och bakåt","Utför cirkulära rörelser med dina höfter","Gör utfall med liten amplitud"]',
    tips_sv = '["Håll ryggen rak","Arbeta inom ett bekvämt område","Förhasta inte dina rörelser","Håll koll på din balans"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Zahřátí kyčle',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Zvedněte koleno k hrudi","Posuňte nohu do strany a dozadu","Provádějte krouživé pohyby boky","Dělejte výpady s malou amplitudou"]',
    tips_cs = '["Udržujte záda rovná","Pracujte v pohodlném dosahu","Neuspěchejte své pohyby","Sledujte svou rovnováhu"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Rozcvička bokov',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Zdvihnite koleno k hrudníku","Presuňte nohu do strany a dozadu","Vykonajte krúživé pohyby bokmi","Robte výpady s malou amplitúdou"]',
    tips_sk = '["Chrbát držte rovno","Pracujte v pohodlnom dosahu","Neponáhľajte svoje pohyby","Sledujte svoju rovnováhu"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Lantion lämmittely',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Nosta polvi rintaasi vasten","Siirrä jalkaasi sivulle ja taakse","Tee pyöreitä liikkeitä lantiollasi","Tee syöksyjä pienellä amplitudilla"]',
    tips_fi = '["Pidä selkäsi suorana","Työskentele mukavalla alueella","Älä kiirehdi liikkeitäsi","Seuraa tasapainoasi"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento dei fianchi',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Solleva il ginocchio al petto","Sposta la gamba di lato e indietro","Esegui movimenti circolari con i fianchi","Eseguire affondi con una piccola ampiezza"]',
    tips_it = '["Tieni la schiena dritta","Lavorare entro un intervallo confortevole","Non affrettare i tuoi movimenti","Tieni traccia del tuo saldo"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Aufwärmen der Hüfte',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Heben Sie Ihr Knie zur Brust","Bewegen Sie Ihr Bein zur Seite und nach hinten","Führen Sie kreisende Bewegungen mit Ihren Hüften aus","Machen Sie Ausfallschritte mit kleiner Amplitude"]',
    tips_de = '["Halten Sie Ihren Rücken gerade","Arbeiten Sie in einem angenehmen Bereich","Überstürzen Sie Ihre Bewegungen nicht","Behalten Sie den Überblick über Ihr Guthaben"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement des hanches',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Levez votre genou vers votre poitrine","Déplacez votre jambe sur le côté et vers l''arrière","Effectuez des mouvements circulaires avec vos hanches","Faire des fentes avec une petite amplitude"]',
    tips_fr = '["Gardez le dos droit","Travailler dans une plage confortable","Ne précipitez pas vos mouvements","Suivez votre solde"]',
    updated_at = NOW()
WHERE exercise_id = '30';


-- Растяжка паха (#31)
UPDATE exercises 
SET 
    instructions_ru = '["Сядьте на пол, согните ноги в коленях","Соедините подошвы стоп вместе","Аккуратно наклонитесь вперед","Потяните колени к полу","Удерживайте растяжку 30 секунд"]',
    tips_ru = '["Не форсируйте растяжку","Дышите глубоко и расслабляйтесь","При боли уменьшите амплитуду","Выполняйте после разминки"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie pachwiny',
    instructions_pl = '["Usiądź na podłodze ze zgiętymi kolanami.","Złącz ze sobą podeszwy stóp","Delikatnie pochyl się do przodu","Przyciągnij kolana do podłogi","Przytrzymaj rozciąganie przez 30 sekund"]',
    tips_pl = '["Nie rozciągaj się na siłę","Weź głęboki oddech i zrelaksuj się.","Jeśli wystąpi ból, zmniejsz amplitudę.","Wykonaj po rozgrzewce"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Ljumsken stretch',
    instructions_sv = '["Sitt på golvet med böjda knän.","Placera fotsulorna tillsammans","Luta dig försiktigt framåt","Dra knäna mot golvet","Håll stretchen i 30 sekunder"]',
    tips_sv = '["Tvinga inte sträckningen","Andas djupt och slappna av.","Om smärta uppstår, minska amplituden.","Utför efter uppvärmning"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protažení třísel',
    instructions_cs = '["Sedněte si na podlahu s pokrčenými koleny.","Položte chodidla k sobě","Jemně se předkloňte","Přitáhněte kolena k podlaze","Protažení vydržte 30 sekund"]',
    tips_cs = '["Nenatahujte silou","Zhluboka se nadechněte a uvolněte se.","Pokud se objeví bolest, snižte amplitudu.","Proveďte po zahřátí"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Natiahnutie slabín',
    instructions_sk = '["Posaďte sa na podlahu s pokrčenými kolenami.","Položte chodidlá k sebe","Jemne sa predkloňte","Vytiahnite kolená smerom k podlahe","Natiahnutie vydržte 30 sekúnd"]',
    tips_sk = '["Nepreťahujte nasilu","Zhlboka sa nadýchnite a uvoľnite sa.","Ak dôjde k bolesti, znížte amplitúdu.","Vykonajte po zahriatí"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Nivus venytys',
    instructions_fi = '["Istu lattialle polvet koukussa.","Aseta jalkapohjat yhteen","Nojaa kevyesti eteenpäin","Vedä polviasi lattiaa kohti","Pidä venytys 30 sekuntia"]',
    tips_fi = '["Älä pakota venytystä","Hengitä syvään ja rentoudu.","Jos kipua ilmenee, vähennä amplitudia.","Suorita lämmittelyn jälkeen"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento dell''inguine',
    instructions_it = '["Sedetevi sul pavimento con le ginocchia piegate.","Metti insieme le piante dei piedi","Sporgersi delicatamente in avanti","Tira le ginocchia verso il pavimento","Mantieni lo stretching per 30 secondi"]',
    tips_it = '["Non forzare lo stretching","Respira profondamente e rilassati.","Se si avverte dolore, ridurre l''ampiezza.","Eseguire dopo il riscaldamento"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Leistendehnung',
    instructions_de = '["Setzen Sie sich mit angewinkelten Knien auf den Boden.","Legen Sie die Fußsohlen zusammen","Lehnen Sie sich sanft nach vorne","Ziehe deine Knie Richtung Boden","Halten Sie die Dehnung 30 Sekunden lang"]',
    tips_de = '["Erzwingen Sie die Dehnung nicht","Atmen Sie tief durch und entspannen Sie sich.","Wenn Schmerzen auftreten, reduzieren Sie die Amplitude.","Nach dem Aufwärmen durchführen"]',
    updated_at = NOW()
WHERE exercise_id = '31';

-- Растяжка паха - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirement de l''aine',
    instructions_fr = '["Asseyez-vous sur le sol avec les genoux pliés.","Placez les plantes de vos pieds ensemble","Penchez-vous doucement en avant","Tirez vos genoux vers le sol","Maintenez l''étirement pendant 30 secondes"]',
    tips_fr = '["Ne forcez pas l''étirement","Respirez profondément et détendez-vous.","Si une douleur survient, réduisez l’amplitude.","Exécuter après l''échauffement"]',
    updated_at = NOW()
WHERE exercise_id = '31';


-- Растяжка подколенных сухожилий (#32)
UPDATE exercises 
SET 
    instructions_ru = '["Сядьте на пол, вытяните ноги вперед","Наклонитесь вперед, стараясь достать до стоп","Обхватите стопы руками","Потянитесь грудью к коленям","Удерживайте растяжку 30-45 секунд"]',
    tips_ru = '["Не округляйте спину","Работайте в комфортной амплитуде","Дышите глубоко","Следите за ощущениями в задней поверхности бедра"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie ścięgna podkolanowego',
    instructions_pl = '["Usiądź na podłodze z nogami wyciągniętymi do przodu.","Pochyl się do przodu, próbując dosięgnąć stóp","Złącz stopy dłońmi","Przyciągnij klatkę piersiową do kolan","Przytrzymaj rozciąganie przez 30–45 sekund"]',
    tips_pl = '["Nie zaokrąglaj pleców","Pracuj w komfortowym zakresie","Oddychaj głęboko","Zwróć uwagę na odczucia w tylnej części uda"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Hamstring stretch',
    instructions_sv = '["Sitt på golvet med benen sträckta framåt.","Böj dig framåt och försök att nå dina fötter","Knäpp ihop fötterna med händerna","Dra bröstet mot knäna","Håll stretchen i 30-45 sekunder"]',
    tips_sv = '["Runda inte ryggen","Arbeta inom ett bekvämt område","Andas djupt","Var uppmärksam på förnimmelserna på baksidan av låret"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protažení hamstringů',
    instructions_cs = '["Sedněte si na podlahu s nohama nataženýma dopředu.","Předkloňte se a snažte se dosáhnout na nohy","Sepněte si nohy rukama","Přitáhněte hrudník směrem ke kolenům","Protažení vydržte 30-45 sekund"]',
    tips_cs = '["Nekruťte se v zádech","Pracujte v pohodlném dosahu","Zhluboka dýchejte","Věnujte pozornost pocitům v zadní části stehna"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Natiahnutie hamstringov',
    instructions_sk = '["Posaďte sa na podlahu s nohami natiahnutými dopredu.","Predkloňte sa a snažte sa dosiahnuť nohy","Zopnite si nohy rukami","Potiahnite hrudník smerom ku kolenám","Podržte strečing 30-45 sekúnd"]',
    tips_sk = '["Nekrúťte si chrbát","Pracujte v pohodlnom dosahu","Zhlboka dýchajte","Venujte pozornosť pocitom v zadnej časti stehna"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Reisilihaksen venytys',
    instructions_fi = '["Istu lattialle jalat ojennettuna eteenpäin.","Taivuta eteenpäin yrittäen yltää jalkaisi","Purista jalkasi käsilläsi","Vedä rintaasi polviasi kohti","Pidä venytys 30-45 sekuntia"]',
    tips_fi = '["Älä pyöritä selkääsi","Työskentele mukavalla alueella","Hengitä syvään","Kiinnitä huomiota reiden takaosassa oleviin tuntemuksiin"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento dei muscoli posteriori della coscia',
    instructions_it = '["Sedetevi sul pavimento con le gambe distese in avanti.","Piegati in avanti, cercando di raggiungere i tuoi piedi","Stringi i piedi con le mani","Tira il petto verso le ginocchia","Mantieni lo stretching per 30-45 secondi"]',
    tips_it = '["Non curvare la schiena","Lavorare entro un intervallo confortevole","Respira profondamente","Presta attenzione alle sensazioni nella parte posteriore della coscia"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Dehnung der Oberschenkelrückseite',
    instructions_de = '["Setzen Sie sich mit nach vorne gestreckten Beinen auf den Boden.","Beugen Sie sich nach vorne und versuchen Sie, Ihre Füße zu erreichen","Umklammern Sie Ihre Füße mit den Händen","Ziehen Sie Ihre Brust in Richtung Ihrer Knie","Halten Sie die Dehnung für 30–45 Sekunden"]',
    tips_de = '["Machen Sie keinen runden Rücken","Arbeiten Sie in einem angenehmen Bereich","Tief durchatmen","Achten Sie auf die Empfindungen an der Rückseite Ihres Oberschenkels"]',
    updated_at = NOW()
WHERE exercise_id = '32';

-- Растяжка подколенных сухожилий - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirement des ischio-jambiers',
    instructions_fr = '["Asseyez-vous sur le sol avec vos jambes tendues vers l’avant.","Penchez-vous en avant en essayant d''atteindre vos pieds","Joignez vos pieds avec vos mains","Tirez votre poitrine vers vos genoux","Maintenez l''étirement pendant 30 à 45 secondes"]',
    tips_fr = '["Ne courbez pas le dos","Travailler dans une plage confortable","Respirez profondément","Faites attention aux sensations à l’arrière de votre cuisse"]',
    updated_at = NOW()
WHERE exercise_id = '32';


-- Растяжка икроножных мышц (#33)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене","Поставьте одну ногу вперед, другую назад","Опустите пятку задней ноги на пол","Наклонитесь вперед, растягивая икры","Поменяйте ноги и повторите"]',
    tips_ru = '["Держите заднюю ногу прямой","Не отрывайте пятку от пола","Растягивайтесь плавно","Выполняйте для обеих ног"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie mięśni łydek',
    instructions_pl = '["Stań twarzą do ściany","Postaw jedną stopę z przodu, a drugą z tyłu.","Opuść piętę tylnej stopy na podłogę","Pochyl się do przodu, rozciągając łydki","Zmień nogi i powtórz"]',
    tips_pl = '["Trzymaj tylną nogę prosto","Nie odrywaj pięty od podłogi","Rozciągaj się płynnie","Wykonaj dla obu nóg"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Stretching av vadmusklerna',
    instructions_sv = '["Stå vänd mot väggen","Placera en fot framåt och den andra bakåt.","Sänk hälen på din bakre fot till golvet","Böj dig framåt, sträck dina vader","Byt ben och upprepa"]',
    tips_sv = '["Håll bakbenet rakt","Lyft inte hälen från golvet","Sträck ut smidigt","Utför båda benen"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protahování lýtkových svalů',
    instructions_cs = '["Postavte se čelem ke zdi","Umístěte jednu nohu dopředu a druhou dozadu.","Spusťte patu zadní nohy na podlahu","Předkloňte se a protáhněte lýtka","Vyměňte nohy a opakujte"]',
    tips_cs = '["Udržujte zadní nohu rovně","Nezvedejte patu z podlahy","Plynule se protahujte","Proveďte pro obě nohy"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Natiahnutie lýtkových svalov',
    instructions_sk = '["Postavte sa čelom k stene","Položte jednu nohu dopredu a druhú dozadu.","Spustite pätu zadnej nohy na podlahu","Predkloňte sa a natiahnite lýtka","Vymeňte nohy a opakujte"]',
    tips_sk = '["Udržujte zadnú nohu rovno","Nedvíhajte pätu z podlahy","Hladko natiahnite","Vykonajte pre obe nohy"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Pohjelihasten venyttely',
    instructions_fi = '["Seiso seinää päin","Aseta toinen jalka eteenpäin ja toinen taaksepäin.","Laske takajalan kantapää lattiaan","Taivuta eteenpäin, venyttämällä pohkeita","Vaihda jalkaa ja toista"]',
    tips_fi = '["Pidä takajalka suorana","Älä nosta kantapäätäsi lattiasta","Venytä pehmeästi","Suorita molemmille jaloille"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento dei muscoli del polpaccio',
    instructions_it = '["Mettiti di fronte al muro","Posizionare un piede avanti e l''altro indietro.","Abbassare il tallone del piede posteriore sul pavimento","Piegati in avanti, allungando i polpacci","Cambia gamba e ripeti"]',
    tips_it = '["Mantieni la gamba posteriore dritta","Non sollevare il tallone da terra","Allungare dolcemente","Eseguire per entrambe le gambe"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Dehnung der Wadenmuskulatur',
    instructions_de = '["Stellen Sie sich mit dem Gesicht zur Wand","Stellen Sie einen Fuß nach vorne und den anderen nach hinten.","Senken Sie die Ferse Ihres hinteren Fußes auf den Boden","Beugen Sie sich nach vorne und dehnen Sie Ihre Waden","Wechseln Sie die Beine und wiederholen Sie den Vorgang"]',
    tips_de = '["Halten Sie Ihr hinteres Bein gerade","Heben Sie Ihre Ferse nicht vom Boden ab","Sanft dehnen","Für beide Beine durchführen"]',
    updated_at = NOW()
WHERE exercise_id = '33';

-- Растяжка икроножных мышц - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirement des muscles du mollet',
    instructions_fr = '["Tenez-vous face au mur","Placez un pied en avant et l’autre en arrière.","Abaissez le talon de votre pied arrière au sol","Penchez-vous en avant en étirant vos mollets","Changez de jambe et répétez"]',
    tips_fr = '["Gardez votre jambe arrière droite","Ne soulevez pas votre talon du sol","Étirez-vous en douceur","Exécuter pour les deux jambes"]',
    updated_at = NOW()
WHERE exercise_id = '33';


-- Растяжка грудных мышц (#34)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте в дверном проеме","Поставьте руки на косяки двери","Сделайте шаг вперед","Почувствуйте растяжение в груди","Удерживайте растяжку 30 секунд"]',
    tips_ru = '["Не перенапрягайте плечи","Дышите глубоко","Растягивайтесь постепенно","Следите за ощущениями"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie mięśni piersiowych',
    instructions_pl = '["Stań w drzwiach","Połóż dłonie na framugach drzwi","Zrób krok naprzód","Poczuj rozciąganie w klatce piersiowej","Przytrzymaj rozciąganie przez 30 sekund"]',
    tips_pl = '["Nie przeciążaj ramion","Oddychaj głęboko","Rozciągaj się stopniowo","Podążaj za swoimi odczuciami"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Stretching av bröstmusklerna',
    instructions_sv = '["Stå i dörröppningen","Placera händerna på dörrkarmarna","Ta ett steg framåt","Känn sträckningen i bröstet","Håll stretchen i 30 sekunder"]',
    tips_sv = '["Överansträng inte dina axlar","Andas djupt","Sträck ut gradvis","Följ dina förnimmelser"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protažení prsních svalů',
    instructions_cs = '["Postavte se do dveří","Položte ruce na rámy dveří","Udělejte krok vpřed","Vnímejte protažení v hrudi","Protažení vydržte 30 sekund"]',
    tips_cs = '["Nepřetěžujte ramena","Zhluboka dýchejte","Protahujte postupně","Následujte své pocity"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Natiahnutie prsných svalov',
    instructions_sk = '["Postavte sa do dverí","Položte ruky na rámy dverí","Urobte krok vpred","Cíťte napnutie v hrudi","Natiahnutie vydržte 30 sekúnd"]',
    tips_sk = '["Nepreťažujte ramená","Zhlboka dýchajte","Naťahujte postupne","Nasledujte svoje pocity"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Rintalihasten venyttely',
    instructions_fi = '["Seiso ovella","Aseta kätesi ovenkarmeille","Ota askel eteenpäin","Tunne venytys rinnassasi","Pidä venytys 30 sekuntia"]',
    tips_fi = '["Älä ylikuormita hartioitasi","Hengitä syvään","Venytä vähitellen","Seuraa tuntemuksiasi"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento dei muscoli pettorali',
    instructions_it = '["Fermati sulla porta","Metti le mani sugli stipiti delle porte","Fai un passo avanti","Senti lo stiramento nel tuo petto","Mantieni lo stretching per 30 secondi"]',
    tips_it = '["Non sforzare troppo le spalle","Respira profondamente","Allungare gradualmente","Segui le tue sensazioni"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Dehnung der Brustmuskulatur',
    instructions_de = '["Stehen Sie im Türrahmen","Legen Sie Ihre Hände auf die Türrahmen","Machen Sie einen Schritt nach vorne","Spüren Sie die Dehnung in Ihrer Brust","Halten Sie die Dehnung 30 Sekunden lang"]',
    tips_de = '["Überanstrengen Sie Ihre Schultern nicht","Tief durchatmen","Dehnen Sie sich allmählich","Folgen Sie Ihren Empfindungen"]',
    updated_at = NOW()
WHERE exercise_id = '34';

-- Растяжка грудных мышц - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirement des muscles pectoraux',
    instructions_fr = '["Restez dans l''embrasure de la porte","Placez vos mains sur les cadres de porte","Faites un pas en avant","Sentez l''étirement dans votre poitrine","Maintenez l''étirement pendant 30 secondes"]',
    tips_fr = '["Ne forcez pas trop vos épaules","Respirez profondément","Étirez-vous progressivement","Suivez vos sensations"]',
    updated_at = NOW()
WHERE exercise_id = '34';


-- Растяжка трицепсов (#35)
UPDATE exercises 
SET 
    instructions_ru = '["Поднимите одну руку вверх","Согните руку в локте за головой","Другой рукой потяните локоть вниз","Почувствуйте растяжение трицепса","Поменяйте руки и повторите"]',
    tips_ru = '["Не делайте резких движений","Растягивайтесь плавно","Дышите равномерно","Выполняйте для обеих рук"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rozciąganie tricepsa',
    instructions_pl = '["Podnieś jedną rękę do góry","Zegnij rękę w łokciu za głową","Drugą ręką pociągnij łokieć w dół","Poczuj rozciąganie tricepsów","Zmień ręce i powtórz"]',
    tips_pl = '["Nie wykonuj żadnych gwałtownych ruchów","Rozciągaj się płynnie","Oddychaj równomiernie","Wykonaj dla obu rąk"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Triceps stretch',
    instructions_sv = '["Lyft upp ena handen","Böj armen vid armbågen bakom huvudet","Dra ner armbågen med din andra hand","Känn stretchen i dina triceps","Byt händer och upprepa"]',
    tips_sv = '["Gör inga plötsliga rörelser","Sträck ut smidigt","Andas jämnt","Utför för båda händerna"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Protažení tricepsů',
    instructions_cs = '["Zvedněte jednu ruku nahoru","Ohněte ruku v lokti za hlavou","Druhou rukou stáhněte loket dolů","Vnímejte protažení tricepsu","Vyměňte ruce a opakujte"]',
    tips_cs = '["Nedělejte žádné náhlé pohyby","Plynule se protahujte","Dýchejte rovnoměrně","Proveďte pro obě ruce"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Natiahnutie tricepsov',
    instructions_sk = '["Zdvihnite jednu ruku","Ohnite ruku v lakti za hlavou","Druhou rukou stiahnite lakeť nadol","Cíťte natiahnutie tricepsu","Vymeňte ruky a opakujte"]',
    tips_sk = '["Nerobte žiadne náhle pohyby","Hladko natiahnite","Dýchajte rovnomerne","Vykonajte pre obe ruky"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Triceps venyttää',
    instructions_fi = '["Nosta toinen käsi ylös","Taivuta käsivarsi kyynärpäästä pään taakse","Vedä kyynärpääsi toisella kädellä alas","Tunne venytys tricepsissäsi","Vaihda kättä ja toista"]',
    tips_fi = '["Älä tee äkillisiä liikkeitä","Venytä pehmeästi","Hengitä tasaisesti","Suorita molemmille käsille"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento dei tricipiti',
    instructions_it = '["Alza una mano","Piega il braccio all''altezza del gomito dietro la testa","Con l''altra mano, tira il gomito verso il basso","Senti lo stiramento nei tuoi tricipiti","Cambia mano e ripeti"]',
    tips_it = '["Non fare movimenti bruschi","Allungare dolcemente","Respirare in modo uniforme","Eseguire per entrambe le mani"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Trizeps-Dehnung',
    instructions_de = '["Heben Sie eine Hand hoch","Beugen Sie Ihren Arm am Ellbogen hinter Ihrem Kopf","Ziehen Sie mit der anderen Hand Ihren Ellbogen nach unten","Spüren Sie die Dehnung in Ihrem Trizeps","Wechseln Sie den Besitzer und wiederholen Sie den Vorgang"]',
    tips_de = '["Machen Sie keine plötzlichen Bewegungen","Sanft dehnen","Atme gleichmäßig","Mit beiden Händen ausführen"]',
    updated_at = NOW()
WHERE exercise_id = '35';

-- Растяжка трицепсов - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirement des triceps',
    instructions_fr = '["Lève une main","Pliez votre bras au niveau du coude derrière votre tête","Avec votre autre main, tirez votre coude vers le bas","Sentez l''étirement dans vos triceps","Changez de main et répétez"]',
    tips_fr = '["Ne faites pas de mouvements brusques","Étirez-vous en douceur","Respirez régulièrement","Exécuter pour les deux mains"]',
    updated_at = NOW()
WHERE exercise_id = '35';


-- Змейка между конусами (#36)
UPDATE exercises 
SET 
    instructions_ru = '["Расставьте конусы змейкой на расстоянии 2-3 метра","Начните бег, огибая каждый конус","Держите низкий центр тяжести","Работайте ногами быстро и часто","Следите за правильной техникой поворотов"]',
    tips_ru = '["Начинайте с медленного темпа","Следите за техникой, а не за скоростью","Держите голову поднятой","Используйте короткие быстрые шаги"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Wąż między szyszkami',
    instructions_pl = '["Ułóż szyszki w kształcie węża w odległości 2-3 metrów","Zacznij biegać wokół każdego pachołka","Utrzymuj środek ciężkości nisko","Ćwicz nogi szybko i często","Upewnij się, że stosujesz prawidłową technikę skręcania."]',
    tips_pl = '["Zacznij w wolnym tempie","Skup się na technice, nie na szybkości.","Trzymaj głowę do góry","Stosuj krótkie, szybkie kroki"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Orm mellan kottar',
    instructions_sv = '["Lägg kottarna i ett ormliknande mönster på 2-3 meters avstånd","Börja springa runt varje kon","Håll din tyngdpunkt låg","Arbeta dina ben snabbt och ofta","Se till att du använder rätt svarvteknik."]',
    tips_sv = '["Börja i långsam takt","Fokusera på teknik, inte snabbhet.","Håll huvudet uppe","Använd korta, snabba steg"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Had mezi kužely',
    instructions_cs = '["Šišky umístěte do hadího vzoru ve vzdálenosti 2-3 metrů","Začněte běhat kolem každého kužele","Udržujte své těžiště nízko","Pracujte nohama rychle a často","Ujistěte se, že používáte správnou techniku ​​otáčení."]',
    tips_cs = '["Začněte pomalým tempem","Soustřeďte se na techniku, ne na rychlost.","Hlavu vzhůru","Používejte krátké, rychlé kroky"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Had medzi kužeľmi',
    instructions_sk = '["Šišky umiestnite do hadieho vzoru vo vzdialenosti 2-3 metre","Začnite behať okolo každého kužeľa","Udržujte svoje ťažisko nízko","Pracujte nohami rýchlo a často","Uistite sa, že používate správnu techniku ​​otáčania."]',
    tips_sk = '["Začnite pomalým tempom","Sústreďte sa na techniku, nie na rýchlosť.","Hlavu hore","Používajte krátke, rýchle kroky"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Käärme käpyjen välissä',
    instructions_fi = '["Aseta käpyjä käärmemäisesti 2-3 metrin etäisyydelle","Aloita juokseminen jokaisen kartion ympäri","Pidä painopiste matalalla","Työskentele jaloillasi nopeasti ja usein","Varmista, että käytät oikeaa kääntötekniikkaa."]',
    tips_fi = '["Aloita hitaasti","Keskity tekniikkaan, älä nopeuteen.","Pidä pää pystyssä","Käytä lyhyitä, nopeita askeleita"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Serpente tra i coni',
    instructions_it = '["Posizionare i coni a forma di serpente a una distanza di 2-3 metri","Inizia a correre intorno a ogni cono","Mantieni il baricentro basso","Allena le gambe velocemente e spesso","Assicuratevi di utilizzare la tecnica di svolta corretta."]',
    tips_it = '["Inizia a un ritmo lento","Concentratevi sulla tecnica, non sulla velocità.","Tieni la testa alta","Utilizzare passaggi brevi e rapidi"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Schlange zwischen Zapfen',
    instructions_de = '["Platzieren Sie die Kegel in einem schlangenartigen Muster in einem Abstand von 2-3 Metern","Beginnen Sie, um jeden Kegel herumzulaufen","Halten Sie Ihren Schwerpunkt niedrig","Trainieren Sie Ihre Beine schnell und oft","Achten Sie auf die richtige Drehtechnik."]',
    tips_de = '["Beginnen Sie langsam","Konzentrieren Sie sich auf die Technik, nicht auf die Geschwindigkeit.","Kopf hoch","Verwenden Sie kurze, schnelle Schritte"]',
    updated_at = NOW()
WHERE exercise_id = '36';

-- Змейка между конусами - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Serpent entre les cônes',
    instructions_fr = '["Placez les cônes en forme de serpent à une distance de 2 à 3 mètres","Commencez à courir autour de chaque cône","Gardez votre centre de gravité bas","Travaillez vos jambes rapidement et souvent","Assurez-vous d’utiliser une technique de tournage appropriée."]',
    tips_fr = '["Commencez à un rythme lent","Concentrez-vous sur la technique, pas sur la vitesse.","Gardez la tête haute","Utilisez des étapes courtes et rapides"]',
    updated_at = NOW()
WHERE exercise_id = '36';


-- Быстрые касания ногами (#37)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте рядом с мячом","Быстро касайтесь мяча ногой","Меняйте ноги каждые 2-3 касания","Поддерживайте постоянный ритм","Выполните 30-60 секунд"]',
    tips_ru = '["Держите вес тела на опорной ноге","Работайте быстро, но контролируемо","Не теряйте равновесие","Следите за техникой касания"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Szybkie dotknięcie stóp',
    instructions_pl = '["Stań obok piłki","Szybko dotknij piłki nogą","Zmień nogi co 2-3 dotknięcia","Utrzymuj stały rytm","Wykonuj przez 30–60 sekund"]',
    tips_pl = '["Przenieś ciężar ciała na nogę podporową","Pracuj szybko, ale w sposób kontrolowany","Nie trać równowagi","Uważaj na technikę dotyku"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Snabba fotberöringar',
    instructions_sv = '["Stå bredvid bollen","Rör bollen snabbt med foten","Byt ben var 2-3 beröring","Håll en konstant rytm","Utför i 30-60 sekunder"]',
    tips_sv = '["Håll din kroppsvikt på ditt stödben","Arbeta snabbt men kontrollerat","Tappa inte balansen","Titta på din beröringsteknik"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Rychlé doteky nohou',
    instructions_cs = '["Postavte se vedle míče","Rychle se dotkněte míče nohou","Vyměňte nohy každé 2-3 doteky","Udržujte stálý rytmus","Provádějte 30-60 sekund"]',
    tips_cs = '["Udržujte váhu těla na podpůrné noze","Pracujte rychle, ale kontrolovaně","Neztrácejte rovnováhu","Sledujte svou techniku ​​dotyku"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Rýchle dotyky nôh',
    instructions_sk = '["Postavte sa vedľa lopty","Rýchlo sa dotknite lopty nohou","Vymeňte nohy každé 2-3 dotyky","Udržujte stály rytmus","Vykonajte 30-60 sekúnd"]',
    tips_sk = '["Udržujte váhu tela na podpornej nohe","Pracujte rýchlo, ale kontrolovane","Nestrácajte rovnováhu","Sledujte svoju techniku ​​dotyku"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Nopeat kosketukset jalkaan',
    instructions_fi = '["Seiso pallon vieressä","Kosketa palloa nopeasti jalallasi","Vaihda jalkaa 2-3 kosketuksen välein","Säilytä jatkuva rytmi","Suorita 30-60 sekuntia"]',
    tips_fi = '["Pidä kehosi painosi tukijalassasi","Työskentele nopeasti, mutta hallitusti","Älä menetä tasapainoasi","Tarkkaile kosketustekniikkaasi"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Tocchi rapidi dei piedi',
    instructions_it = '["Mettiti accanto alla palla","Tocca la palla velocemente con il piede","Cambiare gamba ogni 2-3 tocchi","Mantenere un ritmo costante","Eseguire per 30-60 secondi"]',
    tips_it = '["Mantieni il peso del corpo sulla gamba di appoggio","Lavorare velocemente ma in modo controllato","Non perdere l''equilibrio","Fai attenzione alla tua tecnica di tocco"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Schnelle Fußberührungen',
    instructions_de = '["Stehen Sie neben dem Ball","Berühre den Ball schnell mit deinem Fuß","Wechseln Sie alle 2-3 Berührungen das Bein","Halten Sie einen konstanten Rhythmus ein","30–60 Sekunden lang ausführen"]',
    tips_de = '["Halten Sie Ihr Körpergewicht auf Ihrem Standbein","Arbeiten Sie zügig, aber kontrolliert","Verlieren Sie nicht das Gleichgewicht","Achten Sie auf Ihre Berührungstechnik"]',
    updated_at = NOW()
WHERE exercise_id = '37';

-- Быстрые касания ногами - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Touches de pied rapides',
    instructions_fr = '["Tenez-vous à côté du ballon","Touchez le ballon rapidement avec votre pied","Changer de jambe tous les 2-3 contacts","Maintenir un rythme constant","Exécutez pendant 30 à 60 secondes"]',
    tips_fr = '["Gardez le poids de votre corps sur votre jambe d''appui","Travailler rapidement mais de manière contrôlée","Ne perdez pas l''équilibre","Surveillez votre technique de toucher"]',
    updated_at = NOW()
WHERE exercise_id = '37';


-- Прыжки с поворотами (#38)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Сделайте прыжок вверх","Во время прыжка повернитесь на 180 градусов","Приземлитесь мягко на обе ноги","Сразу повернитесь обратно и повторите"]',
    tips_ru = '["Приземляйтесь на полусогнутые ноги","Работайте руками для баланса","Начинайте с небольших поворотов","Следите за техникой приземления"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Skoki z obrotami',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Zrób skok","Obróć się o 180 stopni podczas skoku","Ląduj miękko na obu stopach.","Natychmiast odwróć się i powtórz"]',
    tips_pl = '["Ląduj z ugiętymi nogami","Użyj ramion do utrzymania równowagi","Zacznij od małych obrotów","Uważaj na technikę lądowania"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Hoppar med svängar',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Gör ett hopp upp","Vrid 180 grader medan du hoppar","Landa mjukt på båda fötterna.","Vänd omedelbart tillbaka och upprepa"]',
    tips_sv = '["Landa med böjda ben","Använd armarna för balans","Börja med små svängar","Titta på din landningsteknik"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Skoky s obraty',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Vyskočte nahoru","Při skákání se otočte o 180 stupňů","Přistaňte jemně na obě nohy.","Okamžitě se otočte a opakujte"]',
    tips_cs = '["Přistaňte s pokrčenýma nohama","Pro rovnováhu použijte paže","Začněte malými zatáčkami","Pozor na techniku ​​přistání"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Skoky s obratmi',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Vyskočte hore","Počas skákania sa otočte o 180 stupňov","Dostaňte mäkko na obe nohy.","Okamžite sa otočte a opakujte"]',
    tips_sk = '["Pristaňte s pokrčenými nohami","Použite ruky na rovnováhu","Začnite malými zákrutami","Sledujte techniku ​​pristátia"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Hyppää käännöksillä',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Tee hyppy ylös","Käänny 180 astetta hyppääessäsi","Laskeudu pehmeästi molemmille jaloille.","Käänny välittömästi takaisin ja toista"]',
    tips_fi = '["Laskeudu jalat koukussa","Käytä käsiäsi tasapainoon","Aloita pienillä käännöksillä","Tarkkaile laskeutumistekniikkaasi"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Salti con curve',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Fai un salto in alto","Girare di 180 gradi mentre si salta","Atterrare dolcemente su entrambi i piedi.","Tornare indietro immediatamente e ripetere"]',
    tips_it = '["Atterra con le gambe piegate","Usa le braccia per mantenere l''equilibrio","Inizia con piccole curve","Fai attenzione alla tecnica di atterraggio"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Sprünge mit Drehungen',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Mach einen Sprung nach oben","Drehen Sie sich beim Springen um 180 Grad","Landen Sie sanft auf beiden Füßen.","Sofort umkehren und wiederholen"]',
    tips_de = '["Lande mit gebeugten Beinen","Verwenden Sie Ihre Arme zum Balancieren","Beginnen Sie mit kleinen Kurven","Achten Sie auf Ihre Landetechnik"]',
    updated_at = NOW()
WHERE exercise_id = '38';

-- Прыжки с поворотами - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Sauts avec virages',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Faire un saut","Tournez à 180 degrés en sautant","Atterrissez doucement sur vos deux pieds.","Revenez immédiatement en arrière et répétez"]',
    tips_fr = '["Atterrissez avec les jambes pliées","Utilisez vos bras pour garder l''équilibre","Commencez par de petits virages","Surveillez votre technique d''atterrissage"]',
    updated_at = NOW()
WHERE exercise_id = '38';


-- Быстрые передачи мяча (#39)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене на расстоянии 2-3 метра","Быстро передавайте мяч в стену","Ловите отскок и сразу передавайте обратно","Работайте обеими руками","Выполните 30-45 секунд"]',
    tips_ru = '["Используйте правильную технику передачи","Следите глазами за мячом","Работайте быстро, но точно","Держите руки расслабленными"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Szybkie podania piłki',
    instructions_pl = '["Stań twarzą do ściany w odległości 2-3 metrów","Szybko podaj piłkę do ściany","Złap piłkę odbitą i natychmiast podaj ją z powrotem","Pracuj obiema rękami","Wykonuj przez 30–45 sekund"]',
    tips_pl = '["Stosuj prawidłową technikę podań","Skup się na piłce","Pracuj szybko, ale dokładnie","Trzymaj ręce rozluźnione"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Snabba bollpassningar',
    instructions_sv = '["Stå vänd mot väggen på 2-3 meters avstånd","Passa bollen snabbt till väggen","Fånga returen och skicka tillbaka den omedelbart","Arbeta med båda händerna","Utför i 30-45 sekunder"]',
    tips_sv = '["Använd rätt passningsteknik","Håll ögonen på bollen","Arbeta snabbt men noggrant","Håll händerna avslappnade"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Rychlé přihrávky míče',
    instructions_cs = '["Postavte se čelem ke zdi ve vzdálenosti 2-3 metry","Přihrávejte míč rychle ke zdi","Zachyťte odraz a okamžitě jej předejte zpět","Pracujte oběma rukama","Provádějte 30-45 sekund"]',
    tips_cs = '["Používejte správnou techniku ​​přihrávek","Mějte oči na míči","Pracujte rychle, ale přesně","Udržujte ruce uvolněné"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Rýchle prihrávky lopty',
    instructions_sk = '["Postavte sa čelom k stene vo vzdialenosti 2-3 metre","Rýchlo prihrajte loptu k stene","Zachyťte odraz a okamžite ho odovzdajte späť","Pracujte oboma rukami","Vykonajte 30-45 sekúnd"]',
    tips_sk = '["Používajte správnu techniku ​​prihrávok","Majte oči na lopte","Pracujte rýchlo, ale presne","Udržujte ruky uvoľnené"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Nopeita pallonsyöttöjä',
    instructions_fi = '["Seiso seinää vasten 2-3 metrin etäisyydellä","Syötä pallo nopeasti seinään","Ota kiinni pallosta ja syötä se välittömästi takaisin","Työskentele molemmilla käsillä","Suorita 30-45 sekuntia"]',
    tips_fi = '["Käytä oikeaa syöttötekniikkaa","Pidä silmäsi pallossa","Työskentele nopeasti mutta tarkasti","Pidä kätesi rentoina"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Passaggi rapidi della palla',
    instructions_it = '["Posizionarsi di fronte al muro a una distanza di 2-3 metri","Passare la palla velocemente al muro","Prendi il rimbalzo e passalo subito indietro","Lavorare con entrambe le mani","Eseguire per 30-45 secondi"]',
    tips_it = '["Utilizzare la tecnica di passaggio corretta","Tieni gli occhi sulla palla","Lavorare velocemente ma con precisione","Tieni le mani rilassate"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Schnelle Pässe',
    instructions_de = '["Stellen Sie sich mit dem Gesicht zur Wand in einem Abstand von 2-3 Metern","Passen Sie den Ball schnell zur Wand","Fangen Sie den Rebound und geben Sie ihn sofort zurück","Mit beiden Händen arbeiten","30–45 Sekunden lang ausführen"]',
    tips_de = '["Verwenden Sie die richtige Passtechnik","Behalten Sie den Ball im Auge","Arbeiten Sie schnell, aber genau","Halten Sie Ihre Hände entspannt"]',
    updated_at = NOW()
WHERE exercise_id = '39';

-- Быстрые передачи мяча - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Passes rapides du ballon',
    instructions_fr = '["Tenez-vous face au mur à une distance de 2 à 3 mètres","Passez le ballon rapidement au mur","Attrapez le rebond et passez-le immédiatement en arrière","Travailler avec les deux mains","Exécutez pendant 30 à 45 secondes"]',
    tips_fr = '["Utiliser une technique de passe appropriée","Gardez les yeux sur la balle","Travaillez rapidement mais avec précision","Gardez vos mains détendues"]',
    updated_at = NOW()
WHERE exercise_id = '39';


-- Бег спиной вперед (#40)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного бега спиной вперед","Часто оглядывайтесь через плечо","Держите центр тяжести низко","Работайте руками для баланса","Выполните 20-30 метров"]',
    tips_ru = '["Начинайте очень медленно","Всегда проверяйте пространство за собой","Держите колени слегка согнутыми","Не торопитесь с увеличением скорости"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Bieganie wstecz',
    instructions_pl = '["Zacznij od powolnego biegu do tyłu.","Często oglądaj się przez ramię","Utrzymuj środek ciężkości nisko","Użyj ramion do utrzymania równowagi","Ukończ 20-30 metrów"]',
    tips_pl = '["Zacznij bardzo powoli","Zawsze sprawdzaj przestrzeń za sobą","Trzymaj kolana lekko zgięte","Nie spiesz się ze zwiększaniem prędkości"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Springer baklänges',
    instructions_sv = '["Börja med att springa sakta bakåt.","Titta över axeln ofta","Håll din tyngdpunkt låg","Använd armarna för balans","Kör 20-30 meter"]',
    tips_sv = '["Börja väldigt långsamt","Kontrollera alltid utrymmet bakom dig","Håll knäna lätt böjda","Rusa inte in i ökande hastighet"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Běh vzad',
    instructions_cs = '["Začněte pomalým běháním vzad.","Často se dívejte přes rameno","Udržujte své těžiště nízko","Pro rovnováhu použijte paže","Kompletní 20-30 metrů"]',
    tips_cs = '["Začněte velmi pomalu","Vždy zkontrolujte prostor za vámi","Kolena mějte mírně pokrčená","Nespěchejte se zvyšováním rychlosti"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Beh dozadu',
    instructions_sk = '["Začnite pomalým behom vzad.","Často sa pozerajte cez rameno","Udržujte svoje ťažisko nízko","Použite ruky na rovnováhu","Kompletné 20-30 metrov"]',
    tips_sk = '["Začnite veľmi pomaly","Vždy skontrolujte priestor za sebou","Kolená majte mierne pokrčené","Neponáhľajte sa so zvyšovaním rýchlosti"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Juokseminen taaksepäin',
    instructions_fi = '["Aloita juoksemalla hitaasti taaksepäin.","Katso usein olkapääsi yli","Pidä painopiste matalalla","Käytä käsiäsi tasapainoon","Ajettu 20-30 metriä"]',
    tips_fi = '["Aloita hyvin hitaasti","Tarkista aina takanasi oleva tila","Pidä polvet hieman koukussa","Älä kiirehdi nopeuteen"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Correre all''indietro',
    instructions_it = '["Inizia correndo lentamente all''indietro.","Guardati spesso alle spalle","Mantieni il baricentro basso","Usa le braccia per mantenere l''equilibrio","Completa 20-30 metri"]',
    tips_it = '["Inizia molto lentamente","Controlla sempre lo spazio dietro di te","Tieni le ginocchia leggermente piegate","Non affrettarti ad aumentare la velocità"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Rückwärtslaufen',
    instructions_de = '["Beginnen Sie, indem Sie langsam rückwärts laufen.","Schauen Sie oft über Ihre Schulter","Halten Sie Ihren Schwerpunkt niedrig","Verwenden Sie Ihre Arme zum Balancieren","Schließe 20–30 Meter ab"]',
    tips_de = '["Beginnen Sie ganz langsam","Überprüfen Sie immer den Raum hinter Ihnen","Halten Sie Ihre Knie leicht gebeugt","Erhöhen Sie die Geschwindigkeit nicht überstürzt"]',
    updated_at = NOW()
WHERE exercise_id = '40';

-- Бег спиной вперед - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Courir à reculons',
    instructions_fr = '["Commencez par courir lentement en arrière.","Regardez souvent par-dessus votre épaule","Gardez votre centre de gravité bas","Utilisez vos bras pour garder l''équilibre","Compléter 20-30 mètres"]',
    tips_fr = '["Commencez très lentement","Vérifiez toujours l''espace derrière vous","Gardez vos genoux légèrement pliés","Ne vous précipitez pas pour augmenter la vitesse"]',
    updated_at = NOW()
WHERE exercise_id = '40';


-- Приседания с весом (#41)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Возьмите гантели или штангу","Приседайте до параллели с полом","Вставайте, используя силу ног","Выполните 3-4 подхода по 8-12 повторений"]',
    tips_ru = '["Держите спину прямой","Не округляйте поясницу","Колени не должны выходить за носки","Начинайте с легкого веса"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Przysiady z ciężarkami',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Weź hantle lub sztangę","Wykonuj przysiady, aż palce stóp znajdą się równolegle do podłogi.","Wstań, wykorzystując siłę nóg","Wykonaj 3-4 serie po 8-12 powtórzeń"]',
    tips_pl = '["Trzymaj plecy prosto","Nie zaokrąglaj dolnej części pleców","Twoje kolana nie powinny wychodzić poza palce stóp.","Zacznij od lekkich ciężarków"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Squats med vikter',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Ta hantlar eller en skivstång","Sitt på huk tills tårna är parallella med golvet.","Gå upp med styrkan i dina ben","Utför 3-4 set med 8-12 reps"]',
    tips_sv = '["Håll ryggen rak","Runda inte nedre delen av ryggen","Dina knän ska inte gå längre än tårna.","Börja med lätta vikter"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Dřepy se závažím',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Vezměte si činky nebo činku","Dřepněte si, dokud nebudou prsty u nohou rovnoběžné s podlahou.","Vstávejte pomocí síly svých nohou","Proveďte 3-4 sady po 8-12 opakováních"]',
    tips_cs = '["Udržujte záda rovná","Nezakulacujte spodní část zad","Vaše kolena by neměla přesahovat prsty u nohou.","Začněte s lehkými váhami"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Drepy so závažím',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Vezmite si činky alebo činku","Drepujte, kým prsty na nohách nebudú rovnobežné s podlahou.","Vstaňte pomocou sily nôh","Vykonajte 3-4 sady po 8-12 opakovaní"]',
    tips_sk = '["Chrbát držte rovno","Nezaobľujte spodnú časť chrbta","Kolená by nemali presahovať prsty na nohách.","Začnite s ľahkými váhami"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kyykky painoilla',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Ota käsipainot tai tanko","Kyykky, kunnes varpaat ovat yhdensuuntaiset lattian kanssa.","Nouse ylös käyttämällä jalkojen voimaa","Suorita 3-4 sarjaa 8-12 toistoa"]',
    tips_fi = '["Pidä selkäsi suorana","Älä pyöristä alaselkääsi","Polvisi eivät saa ylittää varpaitasi.","Aloita kevyillä painoilla"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Squat con pesi',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Prendi dei manubri o un bilanciere","Accovacciatevi finché le dita dei piedi non sono parallele al pavimento.","Alzati usando la forza delle tue gambe","Eseguire 3-4 serie da 8-12 ripetizioni"]',
    tips_it = '["Tieni la schiena dritta","Non arrotondare la parte bassa della schiena","Le ginocchia non devono superare le dita dei piedi.","Inizia con pesi leggeri"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Kniebeugen mit Gewichten',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Nehmen Sie Hanteln oder eine Langhantel","Gehen Sie in die Hocke, bis Ihre Zehen parallel zum Boden sind.","Stehen Sie mit der Kraft Ihrer Beine auf","Führen Sie 3-4 Sätze mit 8-12 Wiederholungen durch"]',
    tips_de = '["Halten Sie Ihren Rücken gerade","Machen Sie keinen Rundumblick im unteren Rücken","Ihre Knie sollten nicht über Ihre Zehen hinausragen.","Beginnen Sie mit leichten Gewichten"]',
    updated_at = NOW()
WHERE exercise_id = '41';

-- Приседания с весом - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Squats avec poids',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Prenez des haltères ou une barre","Accroupissez-vous jusqu’à ce que vos orteils soient parallèles au sol.","Levez-vous en utilisant la force de vos jambes","Effectuez 3 à 4 séries de 8 à 12 répétitions"]',
    tips_fr = '["Gardez le dos droit","Ne arrondissez pas le bas du dos","Vos genoux ne doivent pas dépasser vos orteils.","Commencez avec des poids légers"]',
    updated_at = NOW()
WHERE exercise_id = '41';


-- Становая тяга (#42)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Возьмите штангу с пола прямым хватом","Согните ноги в коленях и отведите таз назад","Поднимите штангу, разгибая ноги и спину","Верните штангу на пол контролируемо"]',
    tips_ru = '["Держите спину прямой на протяжении всего движения","Не округляйте поясницу","Двигайте штангу близко к телу","Начинайте с легкого веса"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Martwy ciąg',
    instructions_pl = '["Stań prosto, rozstawiając stopy na szerokość ramion","Podnieś sztangę z podłogi nachwytem.","Zegnij kolana i przesuń miednicę do tyłu","Podnieś sztangę prostując nogi i plecy.","Odłóż sztangę na podłogę w sposób kontrolowany."]',
    tips_pl = '["Podczas wykonywania ruchu utrzymuj proste plecy.","Nie zaokrąglaj dolnej części pleców","Przesuń sztangę bliżej ciała","Zacznij od lekkich ciężarków"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Marklyft',
    instructions_sv = '["Stå rakt med fötterna axelbrett isär","Ta skivstången från golvet med ett överhandsgrepp.","Böj knäna och flytta bäckenet bakåt","Lyft skivstången genom att räta ut benen och ryggen.","Sätt tillbaka stången till golvet på ett kontrollerat sätt."]',
    tips_sv = '["Håll ryggen rak under hela rörelsen.","Runda inte nedre delen av ryggen","Flytta stången nära din kropp","Börja med lätta vikter"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Mrtvý tah',
    instructions_cs = '["Postavte se rovně s nohama na šířku ramen","Vezměte činku z podlahy nadhmatem.","Pokrčte kolena a posuňte pánev dozadu","Zvedněte činku narovnáním nohou a zad.","Vraťte tyč kontrolovaně na podlahu."]',
    tips_cs = '["Po celou dobu pohybu držte záda rovná.","Nezakulacujte spodní část zad","Přibližte tyč k tělu","Začněte s lehkými váhami"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Mŕtvy ťah',
    instructions_sk = '["Postavte sa rovno s nohami na šírku ramien","Vezmite činku z podlahy úchopom nadhmatom.","Pokrčte kolená a posuňte panvu dozadu","Zdvihnite činku narovnaním nôh a chrbta.","Vráťte tyč kontrolovane na podlahu."]',
    tips_sk = '["Počas celého pohybu držte chrbát rovno.","Nezaobľujte spodnú časť chrbta","Posuňte tyč bližšie k telu","Začnite s ľahkými váhami"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Maastaveto',
    instructions_fi = '["Seiso suorana jalat hartioiden leveydellä toisistaan","Ota tanko lattiasta käsikahvalla.","Taivuta polviasi ja siirrä lantiota taaksepäin","Nosta tankoa suoristamalla jalkojasi ja selkääsi.","Palauta tanko lattialle hallitusti."]',
    tips_fi = '["Pidä selkä suorana koko liikkeen ajan.","Älä pyöristä alaselkääsi","Siirrä tanko lähelle vartaloasi","Aloita kevyillä painoilla"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Stacco da terra',
    instructions_it = '["Stai in piedi dritto con i piedi alla larghezza delle spalle","Prendi il bilanciere da terra con una presa prona.","Piega le ginocchia e sposta il bacino indietro","Sollevare il bilanciere raddrizzando le gambe e la schiena.","Riportare la barra a terra in modo controllato."]',
    tips_it = '["Mantieni la schiena dritta durante tutto il movimento.","Non arrotondare la parte bassa della schiena","Avvicina la barra al tuo corpo","Inizia con pesi leggeri"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Kreuzheben',
    instructions_de = '["Stehen Sie gerade mit schulterbreit auseinander stehenden Füßen","Heben Sie die Langhantel mit einem Oberhandgriff vom Boden.","Beugen Sie die Knie und bewegen Sie das Becken nach hinten","Heben Sie die Langhantel an, indem Sie Ihre Beine und Ihren Rücken strecken.","Bringen Sie die Stange kontrolliert wieder auf den Boden."]',
    tips_de = '["Halten Sie Ihren Rücken während der gesamten Bewegung gerade.","Machen Sie keinen Rundumblick im unteren Rücken","Bewegen Sie die Stange nah an Ihren Körper","Beginnen Sie mit leichten Gewichten"]',
    updated_at = NOW()
WHERE exercise_id = '42';

-- Становая тяга - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Soulevé de terre',
    instructions_fr = '["Tenez-vous droit, les pieds écartés à la largeur des épaules","Prenez la barre du sol avec une prise en pronation.","Pliez vos genoux et déplacez votre bassin vers l''arrière","Soulevez la barre en redressant vos jambes et votre dos.","Remettez la barre au sol de manière contrôlée."]',
    tips_fr = '["Gardez le dos droit tout au long du mouvement.","Ne arrondissez pas le bas du dos","Rapprochez la barre de votre corps","Commencez avec des poids légers"]',
    updated_at = NOW()
WHERE exercise_id = '42';


-- Жим лежа (#43)
UPDATE exercises 
SET 
    instructions_ru = '["Лягте на скамью, ноги на полу","Возьмите штангу широким хватом","Опустите штангу к груди контролируемо","Выжмите штангу вверх","Выполните 3-4 подхода по 6-10 повторений"]',
    tips_ru = '["Держите лопатки сведенными","Не отрывайте ноги от пола","Дышите правильно: выдох на усилии","Используйте страховку"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Wyciskanie na ławce',
    instructions_pl = '["Połóż się na ławce ze stopami na podłodze.","Chwyć sztangę szerokim chwytem","Opuszczaj sztangę do klatki piersiowej w sposób kontrolowany.","Wyciskanie sztangi w górę","Wykonaj 3-4 serie po 6-10 powtórzeń"]',
    tips_pl = '["Trzymaj łopatki ściągnięte","Trzymaj stopy na podłodze","Prawidłowe oddychanie: wydychaj z wysiłkiem","Użyj ubezpieczenia"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Bänkpress',
    instructions_sv = '["Lägg dig på bänken med fötterna på golvet.","Ta skivstången med ett brett grepp","Sänk stången till bröstet på ett kontrollerat sätt.","Tryck skivstången uppåt","Utför 3-4 set med 6-10 reps"]',
    tips_sv = '["Håll skulderbladen ihopdragna","Håll fötterna på golvet","Andas rätt: andas ut med ansträngning","Använd försäkring"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Bench press',
    instructions_cs = '["Lehněte si na lavici s nohama na podlaze.","Vezměte činku širokým úchopem","Kontrolovaně spusťte tyč k hrudi.","Stiskněte činku nahoru","Proveďte 3-4 sady po 6-10 opakováních"]',
    tips_cs = '["Udržujte lopatky přitažené k sobě","Udržujte nohy na podlaze","Dýchejte správně: s námahou vydechujte","Použijte pojištění"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Bench press',
    instructions_sk = '["Ľahnite si na lavičku s nohami na podlahe.","Vezmite činku širokým úchopom","Kontrolovane spustite tyč k hrudníku.","Stlačte činku nahor","Vykonajte 3-4 sady po 6-10 opakovaní"]',
    tips_sk = '["Lopatky majte pritiahnuté k sebe","Udržujte nohy na podlahe","Dýchajte správne: s námahou vydýchnite","Využite poistenie"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Penkkipunnerrus',
    instructions_fi = '["Makaa penkillä jalat lattialla.","Ota tanko leveällä otteella","Laske tanko rintaasi vasten hallitusti.","Paina tanko ylös","Suorita 3-4 sarjaa 6-10 toistoa"]',
    tips_fi = '["Pidä lapaluita vedettynä yhteen","Pidä jalat lattialla","Hengitä oikein: hengitä ponnistelemalla","Käytä vakuutusta"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Panca piana',
    instructions_it = '["Sdraiati sulla panca con i piedi sul pavimento.","Prendi il bilanciere con una presa larga","Abbassare la barra verso il petto in modo controllato.","Spingere il bilanciere verso l''alto","Eseguire 3-4 serie da 6-10 ripetizioni"]',
    tips_it = '["Tieni le scapole unite","Tieni i piedi sul pavimento","Respirare correttamente: espirare con sforzo","Utilizzare l''assicurazione"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Bankdrücken',
    instructions_de = '["Legen Sie sich mit den Füßen auf dem Boden auf die Bank.","Nehmen Sie die Langhantel mit weitem Griff","Senken Sie die Stange kontrolliert auf Ihre Brust.","Drücken Sie die Langhantel nach oben","Führen Sie 3-4 Sätze mit 6-10 Wiederholungen durch"]',
    tips_de = '["Halten Sie Ihre Schulterblätter zusammengezogen","Halten Sie Ihre Füße auf dem Boden","Richtig atmen: Mit Anstrengung ausatmen","Nutzen Sie die Versicherung"]',
    updated_at = NOW()
WHERE exercise_id = '43';

-- Жим лежа - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Développé couché',
    instructions_fr = '["Allongez-vous sur le banc avec vos pieds sur le sol.","Prenez la barre avec une prise large","Abaissez la barre jusqu’à votre poitrine de manière contrôlée.","Appuyez sur la barre vers le haut","Effectuez 3 à 4 séries de 6 à 10 répétitions"]',
    tips_fr = '["Gardez vos omoplates rapprochées","Gardez les pieds sur le sol","Respirez correctement : expirez avec effort","Utiliser une assurance"]',
    updated_at = NOW()
WHERE exercise_id = '43';


-- Подтягивания (#44)
UPDATE exercises 
SET 
    instructions_ru = '["Повисните на перекладине прямым хватом","Подтянитесь, пока подбородок не окажется над перекладиной","Опуститесь в исходное положение","Держите корпус напряженным","Выполните 3-4 подхода по максимальному количеству"]',
    tips_ru = '["Не раскачивайтесь","Подтягивайтесь плавно и контролируемо","Полностью выпрямляйте руки внизу","При необходимости используйте помощь"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Podciąganie',
    instructions_pl = '["Zawieś się na drążku nachwytem","Podciągnij się, aż twoja broda znajdzie się nad drążkiem.","Opuść się z powrotem do pozycji wyjściowej","Napnij mięśnie korpusu","Wykonaj 3-4 serie maksymalnej liczby powtórzeń"]',
    tips_pl = '["Nie huśtaj się","Podciągaj się płynnie i w sposób kontrolowany","Wyprostuj całkowicie ramiona u dołu","W razie potrzeby skorzystaj z pomocy"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Pull-ups',
    instructions_sv = '["Häng på stången med ett överhandsgrepp","Dra dig upp tills hakan är ovanför stången.","Sänk dig tillbaka till startpositionen","Håll din kärna tät","Utför 3-4 set med maximala reps"]',
    tips_sv = '["Sväng inte","Dra upp smidigt och kontrollerat","Räta ut armarna helt i botten","Använd hjälp vid behov"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Přítahy',
    instructions_cs = '["Zavěste se na hrazdu úchopem nadhmatem","Vytáhněte se nahoru, dokud nebude vaše brada nad tyčí.","Spusťte se zpět do výchozí polohy","Udržujte své jádro pevné","Proveďte 3-4 sady maximálních opakování"]',
    tips_cs = '["Nehoupejte se","Vytahujte plynule a kontrolovaně","Narovnejte ruce úplně dole","V případě potřeby použijte pomoc"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Príťahy',
    instructions_sk = '["Zaveste sa na tyč nadhmatom","Vytiahnite sa nahor, až kým nebude vaša brada nad tyčou.","Spustite sa späť do východiskovej polohy","Udržujte svoje jadro pevne","Vykonajte 3-4 sady maximálnych opakovaní"]',
    tips_sk = '["Nehojdajte sa","Hladko a kontrolovane ťahajte nahor","Úplne narovnajte ruky v spodnej časti","V prípade potreby použite pomoc"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Vedot',
    instructions_fi = '["Ripusta tangossa kädensijalla","Vedä itsesi ylös, kunnes leukasi on tangon yläpuolella.","Laske itsesi takaisin lähtöasentoon","Pidä ydin tiukkana","Tee 3-4 sarjaa maksimitoistoja"]',
    tips_fi = '["Älä keinu","Vedä ylös pehmeästi ja hallitusti","Suorista kädet kokonaan alhaalta","Käytä tarvittaessa apua"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Trazioni alla sbarra',
    instructions_it = '["Appendersi alla barra con una presa sopramano","Tiratevi su finché il mento non si trova sopra la sbarra.","Abbassati di nuovo nella posizione di partenza","Mantieni il tuo core contratto","Eseguire 3-4 serie di ripetizioni massime"]',
    tips_it = '["Non oscillare","Tirare su in modo fluido e controllato","Raddrizza completamente le braccia in basso","Utilizzare assistenza se necessario"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Klimmzüge',
    instructions_de = '["Hängen Sie mit einem Oberhandgriff an der Stange","Ziehen Sie sich hoch, bis Ihr Kinn über der Stange ist.","Senken Sie sich zurück in die Ausgangsposition","Halten Sie Ihren Rumpf angespannt","Führen Sie 3-4 Sätze mit maximalen Wiederholungen durch"]',
    tips_de = '["Nicht schwingen","Ziehen Sie sanft und kontrolliert nach oben","Strecken Sie Ihre Arme unten vollständig","Nehmen Sie bei Bedarf Hilfe in Anspruch"]',
    updated_at = NOW()
WHERE exercise_id = '44';

-- Подтягивания - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Tractions',
    instructions_fr = '["Accrochez-vous à la barre avec une prise en pronation","Tirez-vous vers le haut jusqu’à ce que votre menton soit au-dessus de la barre.","Redescendez jusqu''à la position de départ","Gardez votre tronc serré","Effectuez 3 à 4 séries de répétitions maximales"]',
    tips_fr = '["Ne balance pas","Tirez doucement et de manière contrôlée","Redressez complètement vos bras en bas","Utilisez de l''aide si nécessaire"]',
    updated_at = NOW()
WHERE exercise_id = '44';


-- Отжимания на брусьях (#45)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте между брусьями","Подпрыгните и зафиксируйтесь на брусьях","Опуститесь, сгибая руки в локтях","Отожмитесь вверх, разгибая руки","Выполните 3-4 подхода по 5-15 повторений"]',
    tips_ru = '["Держите корпус прямым","Не раскачивайтесь","Опускайтесь до комфортной глубины","При необходимости используйте помощь ног"]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Dipy na drążkach',
    instructions_pl = '["Stań między kratami","Podskocz i zablokuj się na drążkach","Opuść się, zginając łokcie.","Pompki z wyprostowanymi ramionami","Wykonaj 3-4 serie po 5-15 powtórzeń"]',
    tips_pl = '["Trzymaj ciało prosto","Nie huśtaj się","Zejdź na wygodną głębokość","Jeśli to konieczne, użyj nóg."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Dips på stängerna',
    instructions_sv = '["Stå mellan stängerna","Hoppa upp och lås fast vid stängerna","Sänk dig ner, böj armbågarna.","Tryck upp, räta ut armarna","Utför 3-4 set med 5-15 reps"]',
    tips_sv = '["Håll din kropp rak","Sväng inte","Gå ner till ett bekvämt djup","Använd dina ben om det behövs."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Dipy na mřížích',
    instructions_cs = '["Postavte se mezi tyče","Vyskočte a zamkněte na mříže","Spusťte se dolů a ohněte lokty.","Zatlačte nahoru a narovnejte ruce","Proveďte 3-4 sady po 5-15 opakováních"]',
    tips_cs = '["Udržujte své tělo rovně","Nehoupejte se","Sestup do pohodlné hloubky","V případě potřeby použijte nohy."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Dips na barlách',
    instructions_sk = '["Postavte sa medzi tyče","Vyskočte a zamknite sa na tyče","Spustite sa nadol a ohnite lakte.","Zatlačte nahor, narovnajte ruky","Vykonajte 3-4 sady po 5-15 opakovaní"]',
    tips_sk = '["Telo držte rovno","Nehojdajte sa","Zostúpte do pohodlnej hĺbky","V prípade potreby použite nohy."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Dipit tankoissa',
    instructions_fi = '["Seiso tankojen välissä","Hyppää ylös ja lukitse tangot","Laske itsesi alas, taivuta kyynärpääsi.","Työnnä ylös, suorista käsiäsi","Suorita 3-4 sarjaa 5-15 toistoa"]',
    tips_fi = '["Pidä vartalosi suorana","Älä keinu","Laskeudu mukavaan syvyyteen","Käytä tarvittaessa jalkojasi."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Dip sulle barre',
    instructions_it = '["Mettiti tra le sbarre","Salta e agganciati alle sbarre","Abbassatevi piegando i gomiti.","Spingi verso l''alto, raddrizzando le braccia","Eseguire 3-4 serie da 5-15 ripetizioni"]',
    tips_it = '["Mantieni il tuo corpo dritto","Non oscillare","Scendere a una profondità confortevole","Se necessario, usa le gambe."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Dips am Barren',
    instructions_de = '["Stehen Sie zwischen den Gitterstäben","Springen Sie hoch und haken Sie sich an den Stangen ein","Senken Sie sich ab und beugen Sie dabei die Ellbogen.","Drücken Sie sich nach oben und strecken Sie Ihre Arme","Führen Sie 3-4 Sätze mit 5-15 Wiederholungen durch"]',
    tips_de = '["Halten Sie Ihren Körper gerade","Nicht schwingen","Abstieg auf eine angenehme Tiefe","Benutzen Sie bei Bedarf Ihre Beine."]',
    updated_at = NOW()
WHERE exercise_id = '45';

-- Отжимания на брусьях - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Dips sur les barres',
    instructions_fr = '["Tenez-vous entre les barreaux","Sautez et verrouillez les barres","Abaissez-vous en pliant les coudes.","Poussez vers le haut en tendant les bras","Effectuez 3 à 4 séries de 5 à 15 répétitions"]',
    tips_fr = '["Gardez votre corps droit","Ne balance pas","Descendre à une profondeur confortable","Utilisez vos jambes si nécessaire."]',
    updated_at = NOW()
WHERE exercise_id = '45';


-- Стойка на одной ноге (#46)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на одну ногу","Поднимите другую ногу перед собой","Держите равновесие как можно дольше","Работайте руками для баланса","Поменяйте ноги и повторите"]',
    tips_ru = '["Смотрите вперед, не вниз","Держите корпус напряженным","Начинайте с коротких подходов","Постепенно увеличивайте время"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Stanie na jednej nodze',
    instructions_pl = '["Stań na jednej nodze","Podnieś drugą nogę przed siebie","Utrzymuj równowagę tak długo, jak to możliwe","Użyj ramion do utrzymania równowagi","Zmień nogi i powtórz"]',
    tips_pl = '["Patrz do przodu, nie w dół","Napnij mięśnie korpusu","Zacznij od krótkich serii","Stopniowo wydłużaj czas"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Enbensstativ',
    instructions_sv = '["Stå på ett ben","Höj ditt andra ben framför dig","Behåll din balans så länge som möjligt","Använd armarna för balans","Byt ben och upprepa"]',
    tips_sv = '["Se framåt, inte ner","Håll din kärna tät","Börja med korta set","Öka tiden gradvis"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Stojan na jedné noze',
    instructions_cs = '["Postavte se na jednu nohu","Zvedněte druhou nohu před sebe","Udržujte rovnováhu co nejdéle","Pro rovnováhu použijte paže","Vyměňte nohy a opakujte"]',
    tips_cs = '["Dívejte se dopředu, ne dolů","Udržujte své jádro pevné","Začněte s krátkými sadami","Postupně prodlužujte čas"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Stojan na jednu nohu',
    instructions_sk = '["Postavte sa na jednu nohu","Zdvihnite druhú nohu pred seba","Udržujte rovnováhu čo najdlhšie","Použite ruky na rovnováhu","Vymeňte nohy a opakujte"]',
    tips_sk = '["Pozerajte sa dopredu, nie dole","Udržujte svoje jadro pevne","Začnite s krátkymi sériami","Postupne zvyšujte čas"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Yksijalkainen teline',
    instructions_fi = '["Seiso yhdellä jalalla","Nosta toinen jalka eteesi","Säilytä tasapainosi niin kauan kuin mahdollista","Käytä käsiäsi tasapainoon","Vaihda jalkaa ja toista"]',
    tips_fi = '["Katso eteenpäin, älä alas","Pidä ydin tiukkana","Aloita lyhyillä sarjoilla","Lisää aikaa vähitellen"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Posizione su una gamba',
    instructions_it = '["Stare su una gamba","Solleva l''altra gamba davanti a te","Mantieni l''equilibrio il più a lungo possibile","Usa le braccia per mantenere l''equilibrio","Cambia gamba e ripeti"]',
    tips_it = '["Guarda avanti, non giù","Mantieni il tuo core contratto","Inizia con serie brevi","Aumentare gradualmente il tempo"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Einbeinstand',
    instructions_de = '["Auf einem Bein stehen","Heben Sie Ihr anderes Bein vor sich an","Halten Sie Ihr Gleichgewicht so lange wie möglich","Verwenden Sie Ihre Arme zum Balancieren","Wechseln Sie die Beine und wiederholen Sie den Vorgang"]',
    tips_de = '["Schau nach vorne, nicht nach unten","Halten Sie Ihren Rumpf angespannt","Beginnen Sie mit kurzen Sätzen","Erhöhen Sie die Zeit schrittweise"]',
    updated_at = NOW()
WHERE exercise_id = '46';

-- Стойка на одной ноге - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Support sur une jambe',
    instructions_fr = '["Tenez-vous sur une jambe","Levez votre autre jambe devant vous","Maintenez votre équilibre le plus longtemps possible","Utilisez vos bras pour garder l''équilibre","Changez de jambe et répétez"]',
    tips_fr = '["Regardez vers l''avant, pas vers le bas","Gardez votre tronc serré","Commencez par des séries courtes","Augmenter le temps progressivement"]',
    updated_at = NOW()
WHERE exercise_id = '46';


-- Планка на одной ноге (#47)
UPDATE exercises 
SET 
    instructions_ru = '["Примите положение планки","Поднимите одну ногу вверх","Держите ногу прямой","Удерживайте позицию 30-60 секунд","Поменяйте ноги и повторите"]',
    tips_ru = '["Держите корпус прямым","Не раскачивайтесь из стороны в сторону","Дышите равномерно","Начинайте с коротких подходов"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Deska na jednej nodze',
    instructions_pl = '["Przyjmij pozycję deski","Podnieś jedną nogę","Trzymaj nogę prosto","Utrzymaj pozycję przez 30-60 sekund","Zmień nogi i powtórz"]',
    tips_pl = '["Trzymaj ciało prosto","Nie kołysz się na boki","Oddychaj równomiernie","Zacznij od krótkich serii"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Enbens planka',
    instructions_sv = '["Kom in i en plankposition","Lyft upp ett ben","Håll benet rakt","Håll positionen i 30-60 sekunder","Byt ben och upprepa"]',
    tips_sv = '["Håll din kropp rak","Gunga inte från sida till sida","Andas jämnt","Börja med korta set"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Prkno s jednou nohou',
    instructions_cs = '["Dostaňte se do pozice prkna","Zvedněte jednu nohu nahoru","Udržujte nohu rovně","Držte pozici po dobu 30-60 sekund","Vyměňte nohy a opakujte"]',
    tips_cs = '["Udržujte své tělo rovně","Nehoupejte se ze strany na stranu","Dýchejte rovnoměrně","Začněte s krátkými sadami"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Doska s jednou nohou',
    instructions_sk = '["Dostaňte sa do pozície planku","Zdvihnite jednu nohu","Udržujte nohu rovno","Držte pozíciu 30-60 sekúnd","Vymeňte nohy a opakujte"]',
    tips_sk = '["Telo držte rovno","Nekývajte sa zo strany na stranu","Dýchajte rovnomerne","Začnite s krátkymi sériami"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Yksijalkainen lankku',
    instructions_fi = '["Asetu lankkuasentoon","Nosta toinen jalka ylös","Pidä jalkasi suorana","Pidä asento 30-60 sekuntia","Vaihda jalkaa ja toista"]',
    tips_fi = '["Pidä vartalosi suorana","Älä heiluta puolelta toiselle","Hengitä tasaisesti","Aloita lyhyillä sarjoilla"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Plank su una gamba',
    instructions_it = '["Mettiti in posizione di plank","Sollevare una gamba","Tieni la gamba dritta","Mantenere la posizione per 30-60 secondi","Cambia gamba e ripeti"]',
    tips_it = '["Mantieni il tuo corpo dritto","Non dondolarti da un lato all''altro","Respirare in modo uniforme","Inizia con serie brevi"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Einbeinige Planke',
    instructions_de = '["Gehen Sie in die Plank-Position","Heben Sie ein Bein hoch","Halten Sie Ihr Bein gerade","Halten Sie die Position für 30-60 Sekunden","Wechseln Sie die Beine und wiederholen Sie den Vorgang"]',
    tips_de = '["Halten Sie Ihren Körper gerade","Nicht von einer Seite zur anderen schaukeln","Atme gleichmäßig","Beginnen Sie mit kurzen Sätzen"]',
    updated_at = NOW()
WHERE exercise_id = '47';

-- Планка на одной ноге - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Planche sur une jambe',
    instructions_fr = '["Mettez-vous en position de planche","Lever une jambe","Gardez votre jambe droite","Maintenez la position pendant 30 à 60 secondes","Changez de jambe et répétez"]',
    tips_fr = '["Gardez votre corps droit","Ne vous balancez pas d''un côté à l''autre","Respirez régulièrement","Commencez par des séries courtes"]',
    updated_at = NOW()
WHERE exercise_id = '47';


-- Приседания на одной ноге (#48)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на одну ногу","Другую ногу вытяните вперед","Приседайте на опорной ноге","Вернитесь в исходное положение","Выполните 3-4 подхода по 5-10 повторений на каждую ногу"]',
    tips_ru = '["Держите спину прямой","Не касайтесь пола второй ногой","Работайте руками для баланса","Начинайте с небольшой амплитуды"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Przysiady na jednej nodze',
    instructions_pl = '["Stań na jednej nodze","Wyciągnij drugą nogę do przodu","Przysiad na nodze podporowej","Powrót do pozycji wyjściowej","Wykonaj 3-4 serie po 5-10 powtórzeń na każdą nogę."]',
    tips_pl = '["Trzymaj plecy prosto","Nie dotykaj podłogi drugą stopą.","Użyj ramion do utrzymania równowagi","Zacznij od małej amplitudy"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Enbens knäböj',
    instructions_sv = '["Stå på ett ben","Förläng ditt andra ben framåt","Knäböj på stödbenet","Återgå till startpositionen","Utför 3-4 set med 5-10 reps på varje ben."]',
    tips_sv = '["Håll ryggen rak","Rör inte golvet med din andra fot.","Använd armarna för balans","Börja med en liten amplitud"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Dřepy na jedné noze',
    instructions_cs = '["Postavte se na jednu nohu","Natáhněte druhou nohu dopředu","Dřep na opěrné noze","Vraťte se do výchozí pozice","Proveďte 3-4 sady po 5-10 opakováních na každou nohu."]',
    tips_cs = '["Udržujte záda rovná","Nedotýkejte se podlahy druhou nohou.","Pro rovnováhu použijte paže","Začněte s malou amplitudou"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Drepy na jednej nohe',
    instructions_sk = '["Postavte sa na jednu nohu","Natiahnite druhú nohu dopredu","Drepujte na opornej nohe","Vráťte sa do východiskovej polohy","Vykonajte 3-4 sady po 5-10 opakovaní na každú nohu."]',
    tips_sk = '["Chrbát držte rovno","Nedotýkajte sa podlahy druhou nohou.","Použite ruky na rovnováhu","Začnite s malou amplitúdou"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Yksijalkaiset kyykkyt',
    instructions_fi = '["Seiso yhdellä jalalla","Ojenna toinen jalkasi eteenpäin","Kyykky tukijalassa","Palaa alkuasentoon","Tee 3-4 sarjaa 5-10 toistoa kummallakin jalalla."]',
    tips_fi = '["Pidä selkäsi suorana","Älä koske lattiaan toisella jalallasi.","Käytä käsiäsi tasapainoon","Aloita pienellä amplitudilla"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Squat su una gamba',
    instructions_it = '["Stare su una gamba","Estendi l''altra gamba in avanti","Accovacciarsi sulla gamba di appoggio","Ritornare alla posizione di partenza","Eseguire 3-4 serie da 5-10 ripetizioni per gamba."]',
    tips_it = '["Tieni la schiena dritta","Non toccare il pavimento con l''altro piede.","Usa le braccia per mantenere l''equilibrio","Inizia con una piccola ampiezza"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Einbeinige Kniebeugen',
    instructions_de = '["Auf einem Bein stehen","Strecken Sie Ihr anderes Bein nach vorne","Kniebeuge auf dem Standbein","Zurück in die Ausgangsposition","Führen Sie 3–4 Sätze mit 5–10 Wiederholungen pro Bein durch."]',
    tips_de = '["Halten Sie Ihren Rücken gerade","Berühren Sie mit dem anderen Fuß nicht den Boden.","Verwenden Sie Ihre Arme zum Balancieren","Beginnen Sie mit einer kleinen Amplitude"]',
    updated_at = NOW()
WHERE exercise_id = '48';

-- Приседания на одной ноге - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Squats sur une jambe',
    instructions_fr = '["Tenez-vous sur une jambe","Étendez votre autre jambe vers l''avant","Squat sur la jambe d''appui","Retour à la position de départ","Effectuez 3 à 4 séries de 5 à 10 répétitions sur chaque jambe."]',
    tips_fr = '["Gardez le dos droit","Ne touchez pas le sol avec votre autre pied.","Utilisez vos bras pour garder l''équilibre","Commencez avec une petite amplitude"]',
    updated_at = NOW()
WHERE exercise_id = '48';


-- Босу-мяч упражнения (#49)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на полусферу босу-мяч","Держите равновесие","Выполняйте приседания","Делайте повороты корпуса","Выполните 3-4 подхода по 10-15 повторений"]',
    tips_ru = '["Начинайте с простых упражнений","Следите за техникой","Не торопитесь","Используйте помощь для поддержки"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Ćwiczenia z piłką bosu',
    instructions_pl = '["Stań na półkuli piłki Bosu","Utrzymaj równowagę","Rób przysiady","Wykonuj skręty ciała","Wykonaj 3-4 serie po 10-15 powtórzeń"]',
    tips_pl = '["Zacznij od prostych ćwiczeń","Uważaj na swoją technikę","Nie spiesz się","Użyj pomocy, aby uzyskać wsparcie"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Bosu bollövningar',
    instructions_sv = '["Stå på halvklotet av Bosu-bollen","Håll balansen","Gör knäböj","Gör kroppsvridningar","Utför 3-4 set med 10-15 reps"]',
    tips_sv = '["Börja med enkla övningar","Titta på din teknik","Ta dig tid","Använd hjälp för stöd"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Cvičení s bosu míčem',
    instructions_cs = '["Postavte se na polokouli míče Bosu","Udržujte rovnováhu","Dělejte dřepy","Dělejte kroucení těla","Proveďte 3-4 sady po 10-15 opakováních"]',
    tips_cs = '["Začněte jednoduchými cviky","Pozor na techniku","Nespěchejte","Pro podporu použijte nápovědu"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Cvičenie s bosu loptou',
    instructions_sk = '["Postavte sa na hemisféru lopty Bosu","Udržujte rovnováhu","Robte drepy","Robte krútenie tela","Vykonajte 3-4 sady po 10-15 opakovaní"]',
    tips_sk = '["Začnite s jednoduchými cvičeniami","Sledujte svoju techniku","Neponáhľaj sa","Použite pomoc na podporu"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Bosu pallo harjoitukset',
    instructions_fi = '["Seiso Bosu-pallon pallonpuoliskolla","Pidä tasapainosi","Tee kyykkyjä","Tee kehon käänteitä","Suorita 3-4 sarjaa 10-15 toistoa"]',
    tips_fi = '["Aloita yksinkertaisilla harjoituksilla","Varo tekniikkaasi","Ota aikaa","Käytä apua tueksi"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Esercizi con la palla Bosu',
    instructions_it = '["Posizionarsi sull''emisfero della palla Bosu","Mantieni l''equilibrio","Fai squat","Esegui torsioni del corpo","Eseguire 3-4 serie da 10-15 ripetizioni"]',
    tips_it = '["Inizia con esercizi semplici","Fai attenzione alla tua tecnica","Prenditi il ​​​​tuo tempo","Utilizzare l''aiuto per il supporto"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Bosu-Ball-Übungen',
    instructions_de = '["Stellen Sie sich auf die Halbkugel des Bosu-Balls","Halten Sie Ihr Gleichgewicht","Mache Kniebeugen","Machen Sie Körperdrehungen","Führen Sie 3-4 Sätze mit 10-15 Wiederholungen durch"]',
    tips_de = '["Beginnen Sie mit einfachen Übungen","Achte auf deine Technik","Nehmen Sie sich Zeit","Nutzen Sie die Hilfe zur Unterstützung"]',
    updated_at = NOW()
WHERE exercise_id = '49';

-- Босу-мяч упражнения - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Exercices avec ballon Bosu',
    instructions_fr = '["Tenez-vous sur l''hémisphère du ballon Bosu","Gardez votre équilibre","Faire des squats","Faire des torsions du corps","Effectuez 3 à 4 séries de 10 à 15 répétitions"]',
    tips_fr = '["Commencez par des exercices simples","Surveillez votre technique","Prenez votre temps","Utiliser l''aide pour obtenir de l''aide"]',
    updated_at = NOW()
WHERE exercise_id = '49';


-- Йога-баланс (#50)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги вместе","Поднимите одну ногу и поставьте на бедро другой","Сложите руки перед грудью","Держите равновесие","Выполните для обеих ног по 30-60 секунд"]',
    tips_ru = '["Смотрите вперед в одну точку","Дышите глубоко и равномерно","Не торопитесь","При потере баланса начните заново"]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Joga Równowaga',
    instructions_pl = '["Stań prosto, ze złączonymi stopami.","Podnieś jedną nogę i połóż ją na udzie drugiej nogi.","Połóż ręce przed klatką piersiową","Utrzymaj równowagę","Wykonuj na obie nogi przez 30–60 sekund"]',
    tips_pl = '["Spójrz w jedną stronę","Oddychaj głęboko i równomiernie","Nie spiesz się","Jeśli stracisz równowagę, zacznij od nowa."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Yoga Balans',
    instructions_sv = '["Stå upprätt med fötterna ihop.","Lyft upp ett ben och placera det på det andras lår.","Placera händerna framför bröstet","Håll balansen","Utför båda benen i 30-60 sekunder"]',
    tips_sv = '["Titta framåt vid ett tillfälle","Andas djupt och jämnt","Ta dig tid","Om du tappar balansen, börja om."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Jóga rovnováha',
    instructions_cs = '["Postavte se rovně s nohama u sebe.","Zvedněte jednu nohu a položte ji na stehno druhé.","Položte ruce před hrudník","Udržujte rovnováhu","Proveďte pro obě nohy po dobu 30-60 sekund"]',
    tips_cs = '["Podívejte se dopředu v jednom bodě","Dýchejte zhluboka a rovnoměrně","Nespěchejte","Pokud ztratíte rovnováhu, začněte znovu."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Joga Balance',
    instructions_sk = '["Postavte sa rovno s nohami pri sebe.","Zdvihnite jednu nohu a položte ju na stehno druhej.","Položte ruky pred hrudník","Udržujte rovnováhu","Vykonajte pre obe nohy po dobu 30-60 sekúnd"]',
    tips_sk = '["Pozrite sa dopredu v jednom bode","Dýchajte zhlboka a rovnomerne","Neponáhľaj sa","Ak stratíte rovnováhu, začnite odznova."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Jooga tasapaino',
    instructions_fi = '["Seiso suorassa jalat yhdessä.","Nosta toinen jalka ja aseta se toisen reisille.","Aseta kätesi rintasi eteen","Pidä tasapainosi","Suorita molemmille jaloille 30-60 sekuntia"]',
    tips_fi = '["Katso eteenpäin yhdessä vaiheessa","Hengitä syvään ja tasaisesti","Ota aikaa","Jos menetät tasapainon, aloita alusta."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Equilibrio Yoga',
    instructions_it = '["Mettiti in piedi con i piedi uniti.","Sollevare una gamba e posizionarla sulla coscia dell''altra.","Metti le mani davanti al petto","Mantieni l''equilibrio","Eseguire per entrambe le gambe per 30-60 secondi"]',
    tips_it = '["Guarda avanti a un punto","Respira profondamente e in modo uniforme","Prenditi il ​​​​tuo tempo","Se perdi l''equilibrio, ricomincia da capo."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Yoga Balance',
    instructions_de = '["Stehen Sie aufrecht und stellen Sie die Füße zusammen.","Heben Sie ein Bein an und legen Sie es auf den Oberschenkel des anderen.","Legen Sie Ihre Hände vor Ihre Brust","Halten Sie Ihr Gleichgewicht","Führen Sie die Übung für beide Beine 30–60 Sekunden lang durch"]',
    tips_de = '["Schauen Sie an einem Punkt nach vorne","Atme tief und gleichmäßig","Nehmen Sie sich Zeit","Wenn Sie das Gleichgewicht verlieren, beginnen Sie von vorne."]',
    updated_at = NOW()
WHERE exercise_id = '50';

-- Йога-баланс - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Yoga Équilibre',
    instructions_fr = '["Tenez-vous droit, les pieds joints.","Soulevez une jambe et placez-la sur la cuisse de l’autre.","Placez vos mains devant votre poitrine","Gardez votre équilibre","Effectuez l''exercice pour les deux jambes pendant 30 à 60 secondes."]',
    tips_fr = '["Regarder devant soi à un moment donné","Respirez profondément et régulièrement","Prenez votre temps","Si vous perdez l’équilibre, recommencez."]',
    updated_at = NOW()
WHERE exercise_id = '50';


-- Ходьба по бревну (#51)
UPDATE exercises 
SET 
    instructions_ru = '["Найдите устойчивое бревно или доску","Встаньте на бревно","Идите медленно вперед","Держите равновесие","Выполните несколько проходов"]',
    tips_ru = '["Начинайте с широкого бревна","Смотрите вперед, а не вниз","Работайте руками для баланса","Не торопитесь"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Chodzenie po kłodzie',
    instructions_pl = '["Znajdź stabilny kloc lub deskę","Stań na kłodzie","Idź powoli do przodu","Utrzymaj równowagę","Wykonaj kilka przejść"]',
    tips_pl = '["Zacznij od szerokiego kloca","Patrz do przodu, nie w dół","Użyj ramion do utrzymania równowagi","Nie spiesz się"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Går på en stock',
    instructions_sv = '["Hitta en stabil stock eller bräda","Stå på stocken","Gå långsamt framåt","Håll balansen","Utför flera pass"]',
    tips_sv = '["Börja med en bred stock","Se framåt, inte ner","Använd armarna för balans","Ta dig tid"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Chůze po kládě',
    instructions_cs = '["Najděte stabilní kládu nebo desku","Postavte se na kládu","Jděte pomalu vpřed","Udržujte rovnováhu","Proveďte několik průchodů"]',
    tips_cs = '["Začněte širokým polenem","Dívejte se dopředu, ne dolů","Pro rovnováhu použijte paže","Nespěchejte"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Chôdza po polene',
    instructions_sk = '["Nájdite stabilný denník alebo dosku","Postavte sa na poleno","Choďte pomaly dopredu","Udržujte rovnováhu","Vykonajte niekoľko prechodov"]',
    tips_sk = '["Začnite so širokým polenom","Pozerajte sa dopredu, nie dole","Použite ruky na rovnováhu","Neponáhľaj sa"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kävely puun päällä',
    instructions_fi = '["Etsi vakaa tukki tai lauta","Seiso puun päällä","Kävele hitaasti eteenpäin","Pidä tasapainosi","Suorita useita kulkuja"]',
    tips_fi = '["Aloita leveästä puusta","Katso eteenpäin, älä alas","Käytä käsiäsi tasapainoon","Ota aikaa"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Camminare su un tronco',
    instructions_it = '["Trova un tronco o una tavola stabile","Stare sul tronco","Camminare lentamente in avanti","Mantieni l''equilibrio","Eseguire più passaggi"]',
    tips_it = '["Inizia con un registro largo","Guarda avanti, non giù","Usa le braccia per mantenere l''equilibrio","Prenditi il ​​​​tuo tempo"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Auf einem Baumstamm laufen',
    instructions_de = '["Suchen Sie einen stabilen Baumstamm oder ein Brett","Stehen Sie auf dem Baumstamm","Gehen Sie langsam vorwärts","Halten Sie Ihr Gleichgewicht","Führen Sie mehrere Durchgänge durch"]',
    tips_de = '["Beginnen Sie mit einem breiten Stamm","Schau nach vorne, nicht nach unten","Verwenden Sie Ihre Arme zum Balancieren","Nehmen Sie sich Zeit"]',
    updated_at = NOW()
WHERE exercise_id = '51';

-- Ходьба по бревну - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Marcher sur une bûche',
    instructions_fr = '["Trouver une bûche ou une planche stable","Tenez-vous debout sur la bûche","Avancez lentement","Gardez votre équilibre","Effectuer plusieurs passes"]',
    tips_fr = '["Commencez avec une bûche large","Regardez vers l''avant, pas vers le bas","Utilisez vos bras pour garder l''équilibre","Prenez votre temps"]',
    updated_at = NOW()
WHERE exercise_id = '51';


-- Стойка на руках у стены (#52)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене","Поставьте руки на пол на расстоянии 30 см от стены","Поднимите ноги вверх по стене","Держите стойку на руках","Опустите ноги контролируемо"]',
    tips_ru = '["Начинайте с коротких подходов","Используйте помощь для страховки","Держите корпус напряженным","Не перенапрягайтесь"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Stanie na rękach przy ścianie',
    instructions_pl = '["Stań twarzą do ściany","Połóż dłonie na podłodze w odległości 30 cm od ściany.","Podnieś nogi do góry, na ścianę","Trzymaj pozycję stania na rękach","Opuszczaj nogi w sposób kontrolowany"]',
    tips_pl = '["Zacznij od krótkich serii","Skorzystaj z pomocy w zakresie ubezpieczeń","Napnij mięśnie korpusu","Nie przemęczaj się"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Handstående mot väggen',
    instructions_sv = '["Stå vänd mot väggen","Placera händerna på golvet 30 cm från väggen","Lyft upp benen mot väggen","Håll ett handstående","Sänk benen på ett kontrollerat sätt"]',
    tips_sv = '["Börja med korta set","Använd hjälp för försäkring","Håll din kärna tät","Överansträng dig inte"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Stojka proti zdi',
    instructions_cs = '["Postavte se čelem ke zdi","Položte ruce na podlahu 30 cm od stěny","Zvedněte nohy po zdi","Držte stojku","Kontrolovaně spusťte nohy dolů"]',
    tips_cs = '["Začněte s krátkými sadami","Použijte pomoc pro pojištění","Udržujte své jádro pevné","Nepřetěžujte se"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Stojka proti stene',
    instructions_sk = '["Postavte sa čelom k stene","Položte ruky na podlahu 30 cm od steny","Zdvihnite nohy po stene","Držte stojku","Kontrolovane spustite nohy"]',
    tips_sk = '["Začnite s krátkymi sériami","Použite pomoc na poistenie","Udržujte svoje jadro pevne","Nepreťažujte sa"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Käsiseisonta seinää vasten',
    instructions_fi = '["Seiso seinää päin","Aseta kätesi lattialle 30 cm seinästä","Nosta jalkasi seinää vasten","Pidä käsilläseisontaa","Laske jalat hallitusti"]',
    tips_fi = '["Aloita lyhyillä sarjoilla","Käytä apua vakuutukseen","Pidä ydin tiukkana","Älä ylikuormita itseäsi"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Verticale contro il muro',
    instructions_it = '["Mettiti di fronte al muro","Posiziona le mani sul pavimento a 30 cm dal muro","Alza le gambe sul muro","Mantenere la verticale","Abbassare le gambe in modo controllato"]',
    tips_it = '["Inizia con serie brevi","Utilizzare l''aiuto per l''assicurazione","Mantieni il tuo core contratto","Non sforzarti troppo"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Handstand gegen die Wand',
    instructions_de = '["Stellen Sie sich mit dem Gesicht zur Wand","Legen Sie Ihre Hände 30 cm von der Wand entfernt auf den Boden","Hebe deine Beine an die Wand","Halten Sie einen Handstand","Senken Sie Ihre Beine kontrolliert ab"]',
    tips_de = '["Beginnen Sie mit kurzen Sätzen","Hilfe zur Versicherung nutzen","Halten Sie Ihren Rumpf angespannt","Überanstrengen Sie sich nicht"]',
    updated_at = NOW()
WHERE exercise_id = '52';

-- Стойка на руках у стены - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Le poirier contre le mur',
    instructions_fr = '["Tenez-vous face au mur","Placez vos mains sur le sol à 30 cm du mur","Levez vos jambes contre le mur","Tenir le poirier","Abaissez vos jambes de manière contrôlée"]',
    tips_fr = '["Commencez par des séries courtes","Utiliser l''aide pour l''assurance","Gardez votre tronc serré","Ne vous surmenez pas"]',
    updated_at = NOW()
WHERE exercise_id = '52';


-- Фартлек (#53)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного бега 5-10 минут","Увеличьте скорость до 80% от максимальной на 2-3 минуты","Вернитесь к медленному бегу на 1-2 минуты","Повторите цикл 4-6 раз","Завершите медленным бегом 5-10 минут"]',
    tips_ru = '["Слушайте свое тело","Не превышайте 80% от максимальной скорости","Дышите глубоко","Пейте воду во время тренировки"]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Fartlek',
    instructions_pl = '["Zacznij od powolnego truchtu przez 5–10 minut","Zwiększ prędkość do 80% maksymalnej na 2-3 minuty","Wróć do powolnego truchtu na 1-2 minuty","Powtórz cykl 4-6 razy","Na koniec wykonaj powolny trucht przez 5–10 minut"]',
    tips_pl = '["Słuchaj swojego ciała","Nie przekraczać 80% maksymalnej prędkości","Oddychaj głęboko","Pij wodę podczas treningu."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Fartlek',
    instructions_sv = '["Börja med en långsam joggingtur i 5-10 minuter","Öka hastigheten till 80 % av max i 2-3 minuter","Återgå till en långsam joggingtur i 1-2 minuter","Upprepa cykeln 4-6 gånger","Avsluta med en långsam joggingtur i 5-10 minuter"]',
    tips_sv = '["Lyssna på din kropp","Överskrid inte 80 % av maxhastigheten","Andas djupt","Drick vatten under träningen."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Fartlek',
    instructions_cs = '["Začněte pomalým joggingem po dobu 5-10 minut","Zvyšte rychlost na 80 % maxima na 2-3 minuty","Vraťte se k pomalému běhání na 1-2 minuty","Cyklus opakujte 4-6krát","Dokončete pomalým poklusem po dobu 5-10 minut"]',
    tips_cs = '["Poslouchejte své tělo","Nepřekračujte 80 % maximální rychlosti","Zhluboka dýchejte","Během cvičení pijte vodu."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Fartlek',
    instructions_sk = '["Začnite pomalým joggingom po dobu 5-10 minút","Zvýšte rýchlosť na 80 % maxima na 2-3 minúty","Vráťte sa k pomalému poklusu na 1-2 minúty","Opakujte cyklus 4-6 krát","Dokončite pomalým joggingom po dobu 5-10 minút"]',
    tips_sk = '["Počúvajte svoje telo","Neprekračujte 80 % maximálnej rýchlosti","Zhlboka dýchajte","Počas tréningu pite vodu."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Fartlek',
    instructions_fi = '["Aloita hitaalla lenkillä 5-10 minuuttia","Lisää nopeutta 80 %:iin maksimiarvosta 2-3 minuutiksi","Palaa hitaaseen lenkkeilyyn 1-2 minuutiksi","Toista sykli 4-6 kertaa","Lopeta hidas hölkkä 5-10 minuuttia"]',
    tips_fi = '["Kuuntele kehoasi","Älä ylitä 80 % enimmäisnopeudesta","Hengitä syvään","Juo vettä harjoittelun aikana."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Fartlek',
    instructions_it = '["Inizia con una corsa lenta per 5-10 minuti","Aumentare la velocità all''80% del massimo per 2-3 minuti","Ritornare a una corsa lenta per 1-2 minuti","Ripetere il ciclo 4-6 volte","Termina con una corsa lenta per 5-10 minuti"]',
    tips_it = '["Ascolta il tuo corpo","Non superare l''80% della velocità massima","Respira profondamente","Bevi acqua durante l''allenamento."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Fahrtspiel',
    instructions_de = '["Beginnen Sie mit einem langsamen Joggen für 5-10 Minuten","Erhöhen Sie die Geschwindigkeit für 2–3 Minuten auf 80 % des Maximums","Kehren Sie für 1-2 Minuten zu einem langsamen Joggen zurück","Wiederholen Sie den Zyklus 4-6 Mal","Beenden Sie die Übung mit einem langsamen Lauf für 5–10 Minuten."]',
    tips_de = '["Hören Sie auf Ihren Körper","Überschreiten Sie nicht 80 % der Höchstgeschwindigkeit","Tief durchatmen","Trinken Sie während des Trainings Wasser."]',
    updated_at = NOW()
WHERE exercise_id = '53';

-- Фартлек - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Fartlek',
    instructions_fr = '["Commencez par un jogging lent pendant 5 à 10 minutes","Augmenter la vitesse à 80 % du maximum pendant 2 à 3 minutes","Reprenez un jogging lent pendant 1 à 2 minutes","Répétez le cycle 4 à 6 fois","Terminez par un jogging lent pendant 5 à 10 minutes"]',
    tips_fr = '["Écoutez votre corps","Ne pas dépasser 80% de la vitesse maximale","Respirez profondément","Buvez de l’eau pendant votre entraînement."]',
    updated_at = NOW()
WHERE exercise_id = '53';


-- Повторные спринты (#54)
UPDATE exercises 
SET 
    instructions_ru = '["Выполните 10-минутную разминку","Пробегите спринт на максимальной скорости 30 секунд","Отдохните 2-3 минуты","Повторите спринт","Выполните 6-8 спринтов"]',
    tips_ru = '["Не экономьте на разминке","Отдыхайте полностью между спринтами","Следите за техникой бега","Не тренируйтесь ежедневно"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Powtarzające się sprinty',
    instructions_pl = '["Zrób 10-minutową rozgrzewkę","Biegnij sprintem z maksymalną prędkością przez 30 sekund","Odpocznij przez 2-3 minuty","Powtórz sprint","Wykonaj 6-8 sprintów"]',
    tips_pl = '["Nie oszczędzaj na rozgrzewce","Odpoczywaj całkowicie między sprintami","Uważaj na technikę biegania","Nie ćwicz codziennie"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Upprepade spurter',
    instructions_sv = '["Gör en 10 minuters uppvärmning","Kör en sprint med maximal hastighet i 30 sekunder","Vila i 2-3 minuter","Upprepa sprinten","Kör 6-8 spurter"]',
    tips_sv = '["Snåla inte med din uppvärmning","Vila helt mellan spurterna","Titta på din löpteknik","Träna inte dagligen"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Opakované sprinty',
    instructions_cs = '["Proveďte 10minutové zahřátí","Běžte sprint maximální rychlostí po dobu 30 sekund","Odpočívejte 2-3 minuty","Opakujte sprint","Proveďte 6-8 sprintů"]',
    tips_cs = '["Nešetřete na rozcvičce","Mezi sprinty si úplně odpočiňte","Sledujte techniku ​​běhu","Necvičte denně"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Opakované šprinty',
    instructions_sk = '["Vykonajte 10-minútové zahrievanie","Spustite šprint maximálnou rýchlosťou po dobu 30 sekúnd","Odpočívajte 2-3 minúty","Opakujte šprint","Vykonajte 6-8 šprintov"]',
    tips_sk = '["Nešetrite na rozcvičke","Medzi šprintmi si úplne oddýchnite","Sledujte techniku ​​behu","Necvičte denne"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Toistuvat sprintit',
    instructions_fi = '["Tee 10 minuutin lämmittely","Juokse sprintti maksiminopeudella 30 sekuntia","Lepää 2-3 minuuttia","Toista sprintti","Suorita 6-8 sprinttiä"]',
    tips_fi = '["Älä säästä lämmittelyssäsi","Lepää täysin sprinttien välillä","Tarkkaile juoksutekniikkaasi","Älä harjoittele päivittäin"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Sprint ripetuti',
    instructions_it = '["Fai un riscaldamento di 10 minuti","Eseguire uno sprint alla massima velocità per 30 secondi","Riposare per 2-3 minuti","Ripeti lo sprint","Eseguire 6-8 sprint"]',
    tips_it = '["Non lesinare sul riscaldamento","Riposare completamente tra gli sprint","Fai attenzione alla tua tecnica di corsa","Non fare esercizio fisico quotidianamente"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Wiederholte Sprints',
    instructions_de = '["Machen Sie ein 10-minütiges Aufwärmtraining","Laufen Sie 30 Sekunden lang einen Sprint mit maximaler Geschwindigkeit","2-3 Minuten ruhen lassen","Wiederholen Sie den Sprint","Führen Sie 6-8 Sprints durch"]',
    tips_de = '["Sparen Sie nicht beim Aufwärmen","Machen Sie zwischen den Sprints eine vollständige Pause","Achte auf deine Lauftechnik","Trainieren Sie nicht täglich"]',
    updated_at = NOW()
WHERE exercise_id = '54';

-- Повторные спринты - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Sprints répétés',
    instructions_fr = '["Faites un échauffement de 10 minutes","Exécutez un sprint à vitesse maximale pendant 30 secondes","Reposez-vous pendant 2 à 3 minutes","Répétez le sprint","Effectuer 6 à 8 sprints"]',
    tips_fr = '["Ne lésinez pas sur votre échauffement","Reposez-vous complètement entre les sprints","Surveillez votre technique de course","Ne faites pas d''exercice quotidiennement"]',
    updated_at = NOW()
WHERE exercise_id = '54';


-- Интервалы на велосипеде (#55)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с 5-минутной разминки","Увеличьте нагрузку до 80% от максимальной","Крутите педали с высокой интенсивностью 2-3 минуты","Снизьте нагрузку до 50% на 1-2 минуты","Повторите цикл 6-8 раз"]',
    tips_ru = '["Поддерживайте высокий каденс","Дышите глубоко","Следите за пульсом","Пейте воду регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Interwały na rowerze',
    instructions_pl = '["Zacznij od 5-minutowej rozgrzewki","Zwiększ obciążenie do 80% maksymalnego","Pedałuj z dużą intensywnością przez 2-3 minuty","Zmniejsz obciążenie do 50% na 1-2 minuty","Powtórz cykl 6-8 razy"]',
    tips_pl = '["Utrzymuj wysoki rytm","Oddychaj głęboko","Uważaj na swój puls","Pij wodę regularnie"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Intervaller på en cykel',
    instructions_sv = '["Börja med en 5 minuters uppvärmning","Öka belastningen till 80 % av max","Pedal med hög intensitet i 2-3 minuter","Minska belastningen till 50 % i 1-2 minuter","Upprepa cykeln 6-8 gånger"]',
    tips_sv = '["Håll en hög kadens","Andas djupt","Håll ett öga på pulsen","Drick vatten regelbundet"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Intervaly na kole',
    instructions_cs = '["Začněte 5minutovým zahřátím","Zvyšte zátěž na 80 % maxima","Pedál s vysokou intenzitou po dobu 2-3 minut","Snižte zátěž na 50 % po dobu 1-2 minut","Opakujte cyklus 6-8krát"]',
    tips_cs = '["Udržujte vysokou kadenci","Zhluboka dýchejte","Sledujte svůj puls","Pijte pravidelně vodu"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Intervaly na bicykli',
    instructions_sk = '["Začnite 5-minútovým zahrievaním","Zvýšte zaťaženie na 80 % maxima","Pedálte pri vysokej intenzite 2-3 minúty","Znížte záťaž na 50 % na 1-2 minúty","Opakujte cyklus 6-8 krát"]',
    tips_sk = '["Udržujte vysokú kadenciu","Zhlboka dýchajte","Sledujte svoj pulz","Pravidelne pite vodu"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Intervallit pyörällä',
    instructions_fi = '["Aloita 5 minuutin lämmittelyllä","Lisää kuormitusta 80 prosenttiin maksimista","Poljin suurella teholla 2-3 minuuttia","Vähennä kuormitusta 50 %:iin 1-2 minuutiksi","Toista sykli 6-8 kertaa"]',
    tips_fi = '["Säilytä korkea poljinnopeus","Hengitä syvään","Pidä pulssia silmällä","Juo vettä säännöllisesti"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Intervalli in bicicletta',
    instructions_it = '["Inizia con un riscaldamento di 5 minuti","Aumentare il carico all''80% del massimo","Pedalare ad alta intensità per 2-3 minuti","Ridurre il carico al 50% per 1-2 minuti","Ripetere il ciclo 6-8 volte"]',
    tips_it = '["Mantenere una cadenza elevata","Respira profondamente","Tieni d''occhio il tuo polso","Bere acqua regolarmente"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Intervalle auf dem Fahrrad',
    instructions_de = '["Beginnen Sie mit einem 5-minütigen Aufwärmen","Erhöhen Sie die Last auf 80 % des Maximums","Treten Sie 2–3 Minuten lang mit hoher Intensität in die Pedale","Reduzieren Sie die Belastung für 1-2 Minuten auf 50 %","Wiederholen Sie den Zyklus 6-8 Mal"]',
    tips_de = '["Behalten Sie eine hohe Trittfrequenz bei","Tief durchatmen","Behalten Sie Ihren Puls im Auge","Trinken Sie regelmäßig Wasser"]',
    updated_at = NOW()
WHERE exercise_id = '55';

-- Интервалы на велосипеде - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Intervalles sur un vélo',
    instructions_fr = '["Commencez par un échauffement de 5 minutes","Augmenter la charge à 80% du maximum","Pédalez à haute intensité pendant 2 à 3 minutes","Réduisez la charge à 50 % pendant 1 à 2 minutes","Répétez le cycle 6 à 8 fois"]',
    tips_fr = '["Maintenir une cadence élevée","Respirez profondément","Gardez un œil sur votre pouls","Boire de l''eau régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '55';


-- Бег по холмам (#56)
UPDATE exercises 
SET 
    instructions_ru = '["Найдите холм с уклоном 5-10%","Выполните 10-минутную разминку","Бегите вверх по холму с умеренной скоростью","Спускайтесь вниз для восстановления","Повторите 6-10 подъемов"]',
    tips_ru = '["Начинайте с небольшого уклона","Держите спину прямой при подъеме","Работайте руками активно","Не торопитесь на спуске"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Bieganie po górach',
    instructions_pl = '["Znajdź wzgórze o nachyleniu 5-10%","Zrób 10-minutową rozgrzewkę","Wbiegnij pod górę z umiarkowaną prędkością","Zejdź, żeby się zregenerować","Powtórz 6-10 podniesień"]',
    tips_pl = '["Zacznij od lekkiego nachylenia","Podczas podnoszenia trzymaj plecy prosto.","Pracuj aktywnie rękami","Nie spiesz się podczas zejścia"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Berglöpning',
    instructions_sv = '["Hitta en kulle med en lutning på 5-10 %","Gör en 10 minuters uppvärmning","Spring uppför backen i måttlig hastighet","Gå ner för att återhämta dig","Upprepa 6-10 lyft"]',
    tips_sv = '["Börja med en liten lutning","Håll ryggen rak när du lyfter.","Arbeta aktivt med händerna","Ta dig tid på nedstigningen"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Běh do kopce',
    instructions_cs = '["Najděte kopec se sklonem 5-10%","Proveďte 10minutové zahřátí","Vyběhněte do kopce mírnou rychlostí","Jděte dolů, abyste se vzpamatovali","Opakujte 6-10 zdvihů"]',
    tips_cs = '["Začněte s mírným sklonem","Při zvedání mějte rovná záda.","Aktivně pracujte rukama","Dejte si na sestup načas"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Beh do kopca',
    instructions_sk = '["Nájdite kopec so sklonom 5-10%","Vykonajte 10-minútové zahrievanie","Vybehnite do kopca miernou rýchlosťou","Choďte dole a zotavte sa","Opakujte 6-10 zdvihov"]',
    tips_sk = '["Začnite s miernym sklonom","Pri zdvíhaní držte chrbát rovno.","Aktívne pracujte rukami","Neponáhľajte sa na zostup"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Mäkijuoksu',
    instructions_fi = '["Etsi mäki, jonka kaltevuus on 5-10 %","Tee 10 minuutin lämmittely","Juokse mäkeä ylös kohtuullisella nopeudella","Mene alas toipumaan","Toista 6-10 nostoa"]',
    tips_fi = '["Aloita pienellä kaltevuudella","Pidä selkäsi suorana nostaessasi.","Työskentele aktiivisesti käsilläsi","Varaa aikaa laskeutumiseen"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Corsa in collina',
    instructions_it = '["Trova una collina con una pendenza del 5-10%","Fai un riscaldamento di 10 minuti","Corri su per la collina a velocità moderata","Scendere per recuperare","Ripeti 6-10 sollevamenti"]',
    tips_it = '["Inizia con una leggera pendenza","Mantieni la schiena dritta mentre sollevi.","Lavora attivamente con le mani","Prenditi il ​​tuo tempo durante la discesa"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Berglauf',
    instructions_de = '["Suchen Sie einen Hügel mit einer Steigung von 5-10 %","Machen Sie ein 10-minütiges Aufwärmtraining","Laufen Sie mit mäßiger Geschwindigkeit den Hügel hinauf","Gehen Sie nach unten, um sich zu erholen","Wiederholen Sie 6-10 Hebungen"]',
    tips_de = '["Beginnen Sie mit einer leichten Steigung","Halten Sie beim Heben Ihren Rücken gerade.","Aktiv mit den Händen arbeiten","Nehmen Sie sich Zeit für den Abstieg"]',
    updated_at = NOW()
WHERE exercise_id = '56';

-- Бег по холмам - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Course en montagne',
    instructions_fr = '["Trouvez une colline avec une pente de 5 à 10 %","Faites un échauffement de 10 minutes","Montez la colline à une vitesse modérée","Descendre pour récupérer","Répétez 6 à 10 levées"]',
    tips_fr = '["Commencez par une légère inclinaison","Gardez le dos droit pendant que vous soulevez.","Travaillez activement avec vos mains","Prenez votre temps dans la descente"]',
    updated_at = NOW()
WHERE exercise_id = '56';


-- Плиометрические круги (#57)
UPDATE exercises 
SET 
    instructions_ru = '["Выполните 10-минутную разминку","Сделайте прыжки в длину с места","Выполните прыжки через препятствия","Сделайте прыжки на ящик","Отдохните 2-3 минуты и повторите круг"]',
    tips_ru = '["Следите за техникой приземления","Приземляйтесь на полусогнутые ноги","Работайте руками для баланса","Не переусердствуйте с количеством"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Kręgi plyometryczne',
    instructions_pl = '["Zrób 10-minutową rozgrzewkę","Wykonuj długie skoki ze stania","Wykonuj skoki przez przeszkody","Wykonuj skoki na skrzynię","Odpocznij przez 2-3 minuty i powtórz obwód."]',
    tips_pl = '["Uważaj na technikę lądowania","Ląduj z ugiętymi nogami","Użyj ramion do utrzymania równowagi","Nie przesadzaj z ilością"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Plyometriska cirklar',
    instructions_sv = '["Gör en 10 minuters uppvärmning","Gör långa hopp från stående position","Gör hopp över hinder","Gör box jumps","Vila i 2-3 minuter och upprepa kretsen."]',
    tips_sv = '["Titta på din landningsteknik","Landa med böjda ben","Använd armarna för balans","Överdriv inte med kvantiteten"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Plyometrické kruhy',
    instructions_cs = '["Proveďte 10minutové zahřátí","Dělejte dlouhé skoky ze stoje","Provádějte skoky přes překážky","Dělejte boxové skoky","Odpočívejte 2-3 minuty a opakujte okruh."]',
    tips_cs = '["Pozor na techniku ​​přistání","Přistaňte s pokrčenýma nohama","Pro rovnováhu použijte paže","Nepřehánějte to s množstvím"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Plyometrické kruhy',
    instructions_sk = '["Vykonajte 10-minútové zahrievanie","Robte dlhé skoky zo stoja","Vykonajte skoky cez prekážky","Robte boxové skoky","Odpočívajte 2-3 minúty a opakujte okruh."]',
    tips_sk = '["Sledujte techniku ​​pristátia","Pristaňte s pokrčenými nohami","Použite ruky na rovnováhu","Nepreháňajte to s množstvom"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Plyometriset ympyrät',
    instructions_fi = '["Tee 10 minuutin lämmittely","Tee pitkiä hyppyjä seisoma-asennosta","Suorita hyppyjä esteiden yli","Tee laatikkohyppyjä","Lepää 2-3 minuuttia ja toista kierros."]',
    tips_fi = '["Tarkkaile laskeutumistekniikkaasi","Laskeudu jalat koukussa","Käytä käsiäsi tasapainoon","Älä liioittele määrän kanssa"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Cerchi pliometrici',
    instructions_it = '["Fai un riscaldamento di 10 minuti","Eseguire salti lunghi partendo da una posizione eretta","Eseguire salti sopra gli ostacoli","Fai salti sulla scatola","Riposare per 2-3 minuti e ripetere il circuito."]',
    tips_it = '["Fai attenzione alla tecnica di atterraggio","Atterra con le gambe piegate","Usa le braccia per mantenere l''equilibrio","Non esagerare con la quantità"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Plyometrische Kreise',
    instructions_de = '["Machen Sie ein 10-minütiges Aufwärmtraining","Machen Sie weite Sprünge aus dem Stand","Führen Sie Sprünge über Hindernisse aus","Machen Sie Boxsprünge","Machen Sie 2–3 Minuten Pause und wiederholen Sie den Kreislauf."]',
    tips_de = '["Achten Sie auf Ihre Landetechnik","Lande mit gebeugten Beinen","Verwenden Sie Ihre Arme zum Balancieren","Übertreiben Sie es nicht mit der Menge"]',
    updated_at = NOW()
WHERE exercise_id = '57';

-- Плиометрические круги - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Cercles pliométriques',
    instructions_fr = '["Faites un échauffement de 10 minutes","Faire des sauts en longueur à partir d''une position debout","Effectuer des sauts par-dessus des obstacles","Faire des sauts en boîte","Reposez-vous pendant 2 à 3 minutes et répétez le circuit."]',
    tips_fr = '["Surveillez votre technique d''atterrissage","Atterrissez avec les jambes pliées","Utilisez vos bras pour garder l''équilibre","N''en faites pas trop avec la quantité"]',
    updated_at = NOW()
WHERE exercise_id = '57';


-- Легкая растяжка (#58)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с легких движений","Выполните растяжку основных мышечных групп","Дышите глубоко и равномерно","Двигайтесь плавно и медленно","Завершите глубоким дыханием"]',
    tips_ru = '["Не растягивайтесь до боли","Дышите глубоко","Расслабляйтесь полностью","Выполняйте регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Lekkie rozciąganie',
    instructions_pl = '["Zacznij od lekkich ruchów","Rozciągnij główne grupy mięśni","Oddychaj głęboko i równomiernie","Poruszaj się płynnie i powoli","Zakończ głębokim oddechem."]',
    tips_pl = '["Nie rozciągaj się do momentu odczuwania bólu.","Oddychaj głęboko","Zrelaksuj się całkowicie","Rób to regularnie"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Lätt stretching',
    instructions_sv = '["Börja med lätta rörelser","Sträck dina stora muskelgrupper","Andas djupt och jämnt","Rör dig mjukt och långsamt","Avsluta med djup andning."]',
    tips_sv = '["Sträck dig inte till smärtan.","Andas djupt","Slappna av helt","Gör det regelbundet"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Lehké protažení',
    instructions_cs = '["Začněte lehkými pohyby","Protáhněte hlavní svalové skupiny","Dýchejte zhluboka a rovnoměrně","Pohybujte se plynule a pomalu","Dokončete hlubokým dýcháním."]',
    tips_cs = '["Nenatahujte se až k bolesti.","Zhluboka dýchejte","Uvolněte se úplně","Dělejte to pravidelně"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Ľahký strečing',
    instructions_sk = '["Začnite ľahkými pohybmi","Natiahnite hlavné svalové skupiny","Dýchajte zhlboka a rovnomerne","Pohybujte sa hladko a pomaly","Dokončite hlbokým dýchaním."]',
    tips_sk = '["Nenaťahujte sa až do bolesti.","Zhlboka dýchajte","Úplne sa uvoľnite","Robte to pravidelne"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kevyt venyttely',
    instructions_fi = '["Aloita kevyillä liikkeillä","Venytä tärkeimpiä lihasryhmiäsi","Hengitä syvään ja tasaisesti","Liikkuu tasaisesti ja hitaasti","Viimeistele syvään hengityksellä."]',
    tips_fi = '["Älä venytä kipuun asti.","Hengitä syvään","Rentoudu kokonaan","Tee se säännöllisesti"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Allungamento leggero',
    instructions_it = '["Iniziare con movimenti leggeri","Allunga i principali gruppi muscolari","Respira profondamente e in modo uniforme","Muoviti dolcemente e lentamente","Termina con una respirazione profonda."]',
    tips_it = '["Non allungarti fino al punto di provare dolore.","Respira profondamente","Rilassati completamente","Fallo regolarmente"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Leichtes Dehnen',
    instructions_de = '["Beginnen Sie mit leichten Bewegungen","Dehnen Sie Ihre großen Muskelgruppen","Atme tief und gleichmäßig","Bewegen Sie sich sanft und langsam","Beenden Sie die Übung mit einer tiefen Atmung."]',
    tips_de = '["Dehnen Sie sich nicht bis zum Schmerz.","Tief durchatmen","Entspannen Sie sich vollkommen","Mach es regelmäßig"]',
    updated_at = NOW()
WHERE exercise_id = '58';

-- Легкая растяжка - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Étirements légers',
    instructions_fr = '["Commencez par des mouvements légers","Étirez vos principaux groupes musculaires","Respirez profondément et régulièrement","Déplacez-vous doucement et lentement","Terminez par une respiration profonde."]',
    tips_fr = '["Ne vous étirez pas jusqu’à ressentir de la douleur.","Respirez profondément","Détendez-vous complètement","Faites-le régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '58';


-- Фоам-роллинг (#59)
UPDATE exercises 
SET 
    instructions_ru = '["Лягте на фоам-роллер","Медленно катайте роллер под мышцами","Остановитесь на болезненных точках","Держите давление 30-60 секунд","Повторите для всех групп мышц"]',
    tips_ru = '["Не катайте по суставам","Дышите глубоко","Не терпите сильную боль","Начинайте с мягкого роллера"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Wałkowanie piankowe',
    instructions_pl = '["Połóż się na wałku piankowym","Powoli przesuwaj wałek pod mięśniami.","Skup się na punktach bólu","Utrzymaj nacisk przez 30-60 sekund","Powtórz dla wszystkich grup mięśni."]',
    tips_pl = '["Nie kręć się na stawach","Oddychaj głęboko","Nie toleruj silnego bólu","Zacznij od miękkiego wałka"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Skumrullande',
    instructions_sv = '["Lägg dig på foam rollern","Rulla rullen långsamt under dina muskler.","Fokusera på smärtpunkter","Håll trycket i 30-60 sekunder","Upprepa för alla muskelgrupper."]',
    tips_sv = '["Rulla inte på lederna","Andas djupt","Tål inte svår smärta","Börja med en mjuk rulle"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Válcování pěny',
    instructions_cs = '["Lehněte si na pěnový válec","Válec pomalu rolujte pod svaly.","Zaměřte se na bolestivé body","Držte tlak po dobu 30-60 sekund","Opakujte pro všechny svalové skupiny."]',
    tips_cs = '["Neválejte se na klouby","Zhluboka dýchejte","Netolerujte silnou bolest","Začněte měkkým válečkem"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Valcovanie peny',
    instructions_sk = '["Ľahnite si na penový valec","Valčekom pomaly rolujte pod svalmi.","Zamerajte sa na bolestivé body","Držte tlak 30-60 sekúnd","Opakujte pre všetky svalové skupiny."]',
    tips_sk = '["Neváľajte sa na kĺboch","Zhlboka dýchajte","Netolerujte silnú bolesť","Začnite mäkkým valčekom"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Vaahto rullaus',
    instructions_fi = '["Makaa vaahtomuovitelalle","Pyöritä rullaa hitaasti lihasten alle.","Keskity kipupisteisiin","Pidä painetta 30-60 sekuntia","Toista kaikille lihasryhmille."]',
    tips_fi = '["Älä pyöri nivelilläsi","Hengitä syvään","Älä siedä voimakasta kipua","Aloita pehmeällä telalla"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Rullo di schiuma',
    instructions_it = '["Sdraiati sul foam roller","Fai rotolare lentamente il rullo sotto i muscoli.","Concentrarsi sui punti dolenti","Mantenere la pressione per 30-60 secondi","Ripetere l''esercizio per tutti i gruppi muscolari."]',
    tips_it = '["Non rotolare sulle articolazioni","Respira profondamente","Non tollerare il dolore intenso","Inizia con un rullo morbido"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Schaumstoffrollen',
    instructions_de = '["Legen Sie sich auf die Schaumstoffrolle","Rollen Sie die Rolle langsam unter Ihren Muskeln.","Konzentrieren Sie sich auf die Schmerzpunkte","Halten Sie den Druck 30-60 Sekunden lang","Wiederholen Sie dies für alle Muskelgruppen."]',
    tips_de = '["Rollen Sie nicht auf Ihren Gelenken","Tief durchatmen","Keine starken Schmerzen ertragen","Beginnen Sie mit einer weichen Rolle"]',
    updated_at = NOW()
WHERE exercise_id = '59';

-- Фоам-роллинг - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Roulage en mousse',
    instructions_fr = '["Allongez-vous sur le rouleau en mousse","Faites rouler lentement le rouleau sous vos muscles.","Se concentrer sur les points sensibles","Maintenez la pression pendant 30 à 60 secondes","Répétez l’opération pour tous les groupes musculaires."]',
    tips_fr = '["Ne roulez pas sur vos articulations","Respirez profondément","Ne tolérez pas la douleur intense","Commencez avec un rouleau souple"]',
    updated_at = NOW()
WHERE exercise_id = '59';


-- Легкий бег (#60)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного темпа","Держите пульс на уровне 60-70% от максимального","Дышите глубоко и равномерно","Поддерживайте постоянный темп","Завершите постепенным снижением темпа"]',
    tips_ru = '["Следите за пульсом","Дышите через нос","Не перенапрягайтесь","Наслаждайтесь процессом"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Lekki jogging',
    instructions_pl = '["Zacznij w wolnym tempie","Utrzymuj tętno na poziomie 60-70% swojego maksymalnego tętna","Oddychaj głęboko i równomiernie","Utrzymuj stałe tempo","Zakończ stopniowym zmniejszaniem tempa"]',
    tips_pl = '["Uważaj na swój puls","Oddychaj przez nos","Nie przemęczaj się","Ciesz się procesem"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Lätt jogging',
    instructions_sv = '["Börja i långsam takt","Håll din puls på 60-70% av ditt maximala","Andas djupt och jämnt","Håll ett konstant tempo","Avsluta med en gradvis minskning av tempot"]',
    tips_sv = '["Håll ett öga på pulsen","Andas genom näsan","Överansträng dig inte","Njut av processen"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Lehké běhání',
    instructions_cs = '["Začněte pomalým tempem","Udržujte tepovou frekvenci na 60-70% svého maxima","Dýchejte zhluboka a rovnoměrně","Udržujte konstantní tempo","Skončete postupným snižováním tempa"]',
    tips_cs = '["Sledujte svůj puls","Dýchejte nosem","Nepřetěžujte se","Užijte si proces"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Ľahký jogging',
    instructions_sk = '["Začnite pomalým tempom","Udržujte svoju srdcovú frekvenciu na 60-70% svojho maxima","Dýchajte zhlboka a rovnomerne","Udržujte konštantné tempo","Dokončite postupným znižovaním tempa"]',
    tips_sk = '["Sledujte svoj pulz","Dýchajte nosom","Nepreťažujte sa","Užite si proces"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kevyt lenkkeily',
    instructions_fi = '["Aloita hitaasti","Pidä sykkeesi 60-70 % maksimistasi","Hengitä syvään ja tasaisesti","Säilytä tasaista tahtia","Lopeta asteittainen tempon lasku"]',
    tips_fi = '["Pidä pulssia silmällä","Hengitä nenäsi kautta","Älä ylikuormita itseäsi","Nauti prosessista"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Corsa leggera',
    instructions_it = '["Inizia a un ritmo lento","Mantieni la frequenza cardiaca al 60-70% del massimo","Respira profondamente e in modo uniforme","Mantenere un ritmo costante","Terminare con una graduale diminuzione del tempo"]',
    tips_it = '["Tieni d''occhio il tuo polso","Respira attraverso il naso","Non sforzarti troppo","Godetevi il processo"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Leichtes Joggen',
    instructions_de = '["Beginnen Sie langsam","Halten Sie Ihre Herzfrequenz bei 60-70 % Ihres Maximums","Atme tief und gleichmäßig","Halten Sie ein konstantes Tempo","Beenden Sie mit einer allmählichen Verringerung des Tempos"]',
    tips_de = '["Behalten Sie Ihren Puls im Auge","Atme durch die Nase","Überanstrengen Sie sich nicht","Genießen Sie den Prozess"]',
    updated_at = NOW()
WHERE exercise_id = '60';

-- Легкий бег - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Jogging léger',
    instructions_fr = '["Commencez à un rythme lent","Maintenez votre fréquence cardiaque à 60-70 % de votre maximum","Respirez profondément et régulièrement","Maintenir un rythme constant","Terminez par une diminution progressive du rythme"]',
    tips_fr = '["Gardez un œil sur votre pouls","Respirez par le nez","Ne vous surmenez pas","Profitez du processus"]',
    updated_at = NOW()
WHERE exercise_id = '60';


-- Плавание (#61)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с разминки на суше","Войдите в воду постепенно","Плавайте в комфортном темпе","Меняйте стили плавания","Завершите медленным плаванием"]',
    tips_ru = '["Не плавайте в одиночку","Следите за техникой","Дышите равномерно","Не переусердствуйте"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Pływacki',
    instructions_pl = '["Zacznij od rozgrzewki na lądzie","Wchodź do wody stopniowo","Pływaj w komfortowym tempie","Zmień swój styl pływania","Zakończ powolnym pływaniem"]',
    tips_pl = '["Nie pływaj sam","Uważaj na swoją technikę","Oddychaj równomiernie","Nie przesadzaj"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Simning',
    instructions_sv = '["Börja med en uppvärmning på torrt land","Gå ner i vattnet gradvis","Simma i ett behagligt tempo","Ändra dina simstilar","Avsluta med ett långsamt dopp"]',
    tips_sv = '["Simma inte ensam","Titta på din teknik","Andas jämnt","Överdriv inte"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Plavání',
    instructions_cs = '["Začněte rozcvičkou na suchu","Vstupujte do vody postupně","Plavte pohodlným tempem","Změňte své plavecké styly","Zakončete pomalým plaváním"]',
    tips_cs = '["Neplavte sami","Pozor na techniku","Dýchejte rovnoměrně","Nepřeháněj to"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Plávanie',
    instructions_sk = '["Začnite rozcvičkou na suchu","Do vody vstupujte postupne","Plávať pohodlným tempom","Zmeňte svoj štýl plávania","Dokončite pomalým plávaním"]',
    tips_sk = '["Neplávajte sami","Sledujte svoju techniku","Dýchajte rovnomerne","Nepreháňajte to"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Uima',
    instructions_fi = '["Aloita lämmittelyllä kuivalla maalla","Mene veteen vähitellen","Ui mukavaan tahtiin","Muuta uintityyliäsi","Lopeta hidas uiminen"]',
    tips_fi = '["Älä ui yksin","Varo tekniikkaasi","Hengitä tasaisesti","Älä liioittele sitä"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Nuoto',
    instructions_it = '["Inizia con un riscaldamento sulla terraferma","Entrare in acqua gradualmente","Nuotare a un ritmo confortevole","Cambia il tuo stile di nuoto","Termina con una nuotata lenta"]',
    tips_it = '["Non nuotare da solo","Fai attenzione alla tua tecnica","Respirare in modo uniforme","Non esagerare"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Baden',
    instructions_de = '["Beginnen Sie mit einem Aufwärmen an Land","Steigen Sie langsam ins Wasser ein","Schwimmen Sie in einem angenehmen Tempo","Ändern Sie Ihren Schwimmstil","Beenden Sie mit einem langsamen Schwimmen"]',
    tips_de = '["Schwimmen Sie nicht alleine","Achte auf deine Technik","Atme gleichmäßig","Übertreiben Sie es nicht"]',
    updated_at = NOW()
WHERE exercise_id = '61';

-- Плавание - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Natation',
    instructions_fr = '["Commencez par un échauffement sur la terre ferme","Entrez dans l''eau progressivement","Nagez à un rythme confortable","Changez vos styles de nage","Terminez par une nage lente"]',
    tips_fr = '["Ne nagez pas seul","Surveillez votre technique","Respirez régulièrement","N''en faites pas trop"]',
    updated_at = NOW()
WHERE exercise_id = '61';


-- Велосипед восстановления (#62)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного темпа","Держите пульс на уровне 50-60% от максимального","Крутите педали легко и ритмично","Дышите глубоко","Завершите постепенным снижением темпа"]',
    tips_ru = '["Поддерживайте высокий каденс","Дышите глубоко","Не перенапрягайтесь","Наслаждайтесь поездкой"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Rower regeneracyjny',
    instructions_pl = '["Zacznij w wolnym tempie","Utrzymuj tętno na poziomie 50-60% swojego maksymalnego tętna","Pedałuj łatwo i rytmicznie","Oddychaj głęboko","Zakończ stopniowym zmniejszaniem tempa"]',
    tips_pl = '["Utrzymuj wysoki rytm","Oddychaj głęboko","Nie przemęczaj się","Ciesz się jazdą"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Återställningscykel',
    instructions_sv = '["Börja i långsam takt","Håll din puls på 50-60% av ditt max","Trampa lätt och rytmiskt","Andas djupt","Avsluta med en gradvis minskning av tempot"]',
    tips_sv = '["Håll en hög kadens","Andas djupt","Överansträng dig inte","Njut av åkturen"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Regenerační kolo',
    instructions_cs = '["Začněte pomalým tempem","Udržujte tepovou frekvenci na 50-60% svého maxima","Šlapejte lehce a rytmicky","Zhluboka dýchejte","Skončete postupným snižováním tempa"]',
    tips_cs = '["Udržujte vysokou kadenci","Zhluboka dýchejte","Nepřetěžujte se","Užijte si jízdu"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Regeneračný bicykel',
    instructions_sk = '["Začnite pomalým tempom","Udržujte svoju srdcovú frekvenciu na 50-60% svojho maxima","Pedálujte ľahko a rytmicky","Zhlboka dýchajte","Dokončite postupným znižovaním tempa"]',
    tips_sk = '["Udržujte vysokú kadenciu","Zhlboka dýchajte","Nepreťažujte sa","Užite si jazdu"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Palautuspyörä',
    instructions_fi = '["Aloita hitaasti","Pidä sykkeesi 50-60 % maksimistasi","Polkimet helposti ja rytmikkäästi","Hengitä syvään","Lopeta asteittainen tempon lasku"]',
    tips_fi = '["Säilytä korkea poljinnopeus","Hengitä syvään","Älä ylikuormita itseäsi","Nauti kyydistä"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Bicicletta da recupero',
    instructions_it = '["Inizia a un ritmo lento","Mantieni la frequenza cardiaca al 50-60% del massimo","Pedalare facilmente e ritmicamente","Respira profondamente","Terminare con una graduale diminuzione del tempo"]',
    tips_it = '["Mantenere una cadenza elevata","Respira profondamente","Non sforzarti troppo","Goditi il ​​viaggio"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Erholungsfahrrad',
    instructions_de = '["Beginnen Sie langsam","Halten Sie Ihre Herzfrequenz bei 50-60 % Ihres Maximums","Treten Sie leicht und rhythmisch in die Pedale","Tief durchatmen","Beenden Sie mit einer allmählichen Verringerung des Tempos"]',
    tips_de = '["Behalten Sie eine hohe Trittfrequenz bei","Tief durchatmen","Überanstrengen Sie sich nicht","Genieße die Fahrt"]',
    updated_at = NOW()
WHERE exercise_id = '62';

-- Велосипед восстановления - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Vélo de récupération',
    instructions_fr = '["Commencez à un rythme lent","Maintenez votre fréquence cardiaque à 50-60 % de votre maximum","Pédalez facilement et rythmiquement","Respirez profondément","Terminez par une diminution progressive du rythme"]',
    tips_fr = '["Maintenir une cadence élevée","Respirez profondément","Ne vous surmenez pas","Profitez du voyage"]',
    updated_at = NOW()
WHERE exercise_id = '62';


-- Йога восстановления (#63)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с простых поз","Выполняйте растяжку медленно","Дышите глубоко и равномерно","Расслабляйтесь в каждой позе","Завершите медитацией"]',
    tips_ru = '["Не форсируйте позы","Дышите через нос","Слушайте свое тело","Наслаждайтесь процессом"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Joga regeneracyjna',
    instructions_pl = '["Zacznij od prostych pozycji","Wykonuj rozciąganie powoli","Oddychaj głęboko i równomiernie","Zrelaksuj się w każdej pozycji","Zakończ medytacją"]',
    tips_pl = '["Nie wymuszaj pozowania","Oddychaj przez nos","Słuchaj swojego ciała","Ciesz się procesem"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Återhämtningsyoga',
    instructions_sv = '["Börja med enkla poser","Utför stretching långsamt","Andas djupt och jämnt","Koppla av i varje pose","Avsluta med meditation"]',
    tips_sv = '["Tvinga inte poser","Andas genom näsan","Lyssna på din kropp","Njut av processen"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Zotavovací jóga',
    instructions_cs = '["Začněte jednoduchými pózami","Protahování provádějte pomalu","Dýchejte zhluboka a rovnoměrně","Uvolněte se v každé póze","Zakončete meditací"]',
    tips_cs = '["Nevynucujte si pózy","Dýchejte nosem","Poslouchejte své tělo","Užijte si proces"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Zotavovacia joga',
    instructions_sk = '["Začnite s jednoduchými pózami","Vykonajte strečing pomaly","Dýchajte zhlboka a rovnomerne","Uvoľnite sa v každej póze","Dokončite meditáciou"]',
    tips_sk = '["Nevynucujte si pózy","Dýchajte nosom","Počúvajte svoje telo","Užite si proces"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Palauttava jooga',
    instructions_fi = '["Aloita yksinkertaisilla asennoilla","Suorita venyttely hitaasti","Hengitä syvään ja tasaisesti","Rentoudu joka asennossa","Lopeta meditaatiolla"]',
    tips_fi = '["Älä pakota asentoja","Hengitä nenäsi kautta","Kuuntele kehoasi","Nauti prosessista"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Yoga di recupero',
    instructions_it = '["Inizia con pose semplici","Eseguire lo stretching lentamente","Respira profondamente e in modo uniforme","Rilassati in ogni posa","Termina con la meditazione"]',
    tips_it = '["Non forzare le pose","Respira attraverso il naso","Ascolta il tuo corpo","Godetevi il processo"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Erholungs-Yoga',
    instructions_de = '["Beginnen Sie mit einfachen Posen","Dehnen Sie sich langsam","Atme tief und gleichmäßig","Entspannen Sie sich in jeder Pose","Beenden Sie mit Meditation"]',
    tips_de = '["Erzwingen Sie keine Posen","Atme durch die Nase","Hören Sie auf Ihren Körper","Genießen Sie den Prozess"]',
    updated_at = NOW()
WHERE exercise_id = '63';

-- Йога восстановления - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Yoga de récupération',
    instructions_fr = '["Commencez par des poses simples","Effectuez les étirements lentement","Respirez profondément et régulièrement","Détendez-vous dans chaque pose","Terminez par la méditation"]',
    tips_fr = '["Ne forcez pas les poses","Respirez par le nez","Écoutez votre corps","Profitez du processus"]',
    updated_at = NOW()
WHERE exercise_id = '63';


-- Контрастный душ (#65)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с теплой воды","Постепенно переходите к холодной воде","Держите холодную воду 30-60 секунд","Вернитесь к теплой воде","Повторите цикл 3-5 раз"]',
    tips_ru = '["Начинайте постепенно","Дышите глубоко","Не переохлаждайтесь","Слушайте свое тело"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - POLSKI перевод
UPDATE exercises 
SET 
    title_pl = 'Prysznic kontrastowy',
    instructions_pl = '["Zacznij od ciepłej wody","Stopniowo przechodź do zimnej wody","Trzymaj zimną wodę przez 30–60 sekund","Powrót do ciepłej wody","Powtórz cykl 3-5 razy"]',
    tips_pl = '["Zacznij stopniowo","Oddychaj głęboko","Nie zmarznij za bardzo","Słuchaj swojego ciała"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - SVENSKA перевод
UPDATE exercises 
SET 
    title_sv = 'Dusch i kontrast',
    instructions_sv = '["Börja med varmt vatten","Gå gradvis över till kallt vatten","Håll kallt vatten i 30-60 sekunder","Återgå till varmt vatten","Upprepa cykeln 3-5 gånger"]',
    tips_sv = '["Börja gradvis","Andas djupt","Bli inte för kall","Lyssna på din kropp"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - ČEŠTINA перевод
UPDATE exercises 
SET 
    title_cs = 'Kontrastní sprcha',
    instructions_cs = '["Začněte teplou vodou","Postupně přejděte do studené vody","Podržte studenou vodu po dobu 30-60 sekund","Vraťte se do teplé vody","Opakujte cyklus 3-5krát"]',
    tips_cs = '["Začněte postupně","Zhluboka dýchejte","Nenechte se příliš chladit","Poslouchejte své tělo"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - SLOVENČINA перевод
UPDATE exercises 
SET 
    title_sk = 'Kontrastná sprcha',
    instructions_sk = '["Začnite teplou vodou","Postupne prejdite do studenej vody","Podržte studenú vodu 30-60 sekúnd","Vráťte sa do teplej vody","Opakujte cyklus 3-5 krát"]',
    tips_sk = '["Začnite postupne","Zhlboka dýchajte","Nenechajte sa príliš prechladnúť","Počúvajte svoje telo"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - SUOMI перевод
UPDATE exercises 
SET 
    title_fi = 'Kontrastisuihku',
    instructions_fi = '["Aloita lämpimällä vedellä","Siirrä vähitellen kylmään veteen","Pidä kylmää vettä 30-60 sekuntia","Palaa lämpimään veteen","Toista sykli 3-5 kertaa"]',
    tips_fi = '["Aloita asteittain","Hengitä syvään","Älä jää liian kylmäksi","Kuuntele kehoasi"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - ITALIANO перевод
UPDATE exercises 
SET 
    title_it = 'Doccia di contrasto',
    instructions_it = '["Inizia con acqua calda","Passare gradualmente all''acqua fredda","Tenere l''acqua fredda per 30-60 secondi","Ritornare all''acqua calda","Ripetere il ciclo 3-5 volte"]',
    tips_it = '["Inizia gradualmente","Respira profondamente","Non prendere troppo freddo","Ascolta il tuo corpo"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - DEUTSCH перевод
UPDATE exercises 
SET 
    title_de = 'Kontrastdusche',
    instructions_de = '["Beginnen Sie mit warmem Wasser","Schrittweise auf kaltes Wasser umstellen","Halten Sie kaltes Wasser für 30-60 Sekunden","Zurück ins warme Wasser","Wiederholen Sie den Zyklus 3-5 Mal"]',
    tips_de = '["Beginnen Sie schrittweise","Tief durchatmen","Nicht zu kalt werden","Hören Sie auf Ihren Körper"]',
    updated_at = NOW()
WHERE exercise_id = '65';

-- Контрастный душ - FRANÇAIS перевод
UPDATE exercises 
SET 
    title_fr = 'Douche de contraste',
    instructions_fr = '["Commencez avec de l''eau tiède","Passer progressivement à l''eau froide","Maintenez l''eau froide pendant 30 à 60 secondes","Retour à l''eau chaude","Répétez le cycle 3 à 5 fois"]',
    tips_fr = '["Commencez progressivement","Respirez profondément","N''ayez pas trop froid","Écoutez votre corps"]',
    updated_at = NOW()
WHERE exercise_id = '65';


