-- Полный SQL скрипт для обновления упражнений с переводами на все языки
-- Этот скрипт обновляет инструкции и советы на русском языке
-- и добавляет переводы на польский, шведский, чешский, словацкий, финский, итальянский, немецкий и французский

-- Разминка шеи (#27)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Медленно поворачивайте голову влево и вправо","Наклоняйте голову вперед и назад","Выполняйте круговые движения головой","Держите плечи расслабленными"]',
    tips_ru = '["Двигайтесь медленно и плавно","Не делайте резких движений","При появлении боли остановитесь","Дышите глубоко и равномерно"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - PL перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka szyi',
    instructions_pl = '["Stań prosto, stopy na szerokości barków","Powoli obracaj głową w lewo i w prawo","Pochylaj głowę do przodu i do tyłu","Wykonuj okrężne ruchy głową","Trzymaj ramiona rozluźnione"]',
    tips_pl = '["Ruszaj się powoli i płynnie","Nie rób gwałtownych ruchów","Zatrzymaj się, jeśli pojawi się ból","Oddychaj głęboko i równomiernie"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - SV перевод
UPDATE exercises 
SET 
    title_sv = 'Nackuppvärmning',
    instructions_sv = '["Stå rakt, fötterna axelbredd isär","Vänd huvudet långsamt åt vänster och höger","Luta huvudet framåt och bakåt","Utför cirkulära rörelser med huvudet","Håll axlarna avslappnade"]',
    tips_sv = '["Rör dig långsamt och mjukt","Gör inga plötsliga rörelser","Stoppa om smärta uppstår","Andas djupt och jämnt"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - CS перевод
UPDATE exercises 
SET 
    title_cs = 'Rozcvička krku',
    instructions_cs = '["Postavte se rovně, nohy na šířku ramen","Pomalu otáčejte hlavou vlevo a vpravo","Naklánějte hlavu dopředu a dozadu","Provádějte kruhové pohyby hlavou","Mějte ramena uvolněná"]',
    tips_cs = '["Pohybujte se pomalu a plynule","Nedělejte prudké pohyby","Při bolesti se zastavte","Dýchejte hluboce a rovnoměrně"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - SK перевод
UPDATE exercises 
SET 
    title_sk = 'Rozcvička krku',
    instructions_sk = '["Postavte sa rovno, nohy na šírku ramien","Pomaly otáčajte hlavou vľavo a vpravo","Nakláňajte hlavu dopredu a dozadu","Vykonávajte kruhové pohyby hlavou","Majte ramená uvoľnené"]',
    tips_sk = '["Pohybujte sa pomaly a plynulo","Nerobte prudké pohyby","Pri bolesti sa zastavte","Dýchajte hlboko a rovnomerne"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - FI перевод
UPDATE exercises 
SET 
    title_fi = 'Niskan lämmittely',
    instructions_fi = '["Seiso suorassa, jalat hartioiden levyisellä","Käännä päätä hitaasti vasemmalle ja oikealle","Kallista päätä eteen ja taakse","Tee kiertoliikkeitä päällä","Pidä hartiat rentona"]',
    tips_fi = '["Liiku hitaasti ja sujuvasti","Älä tee äkillisiä liikkeitä","Pysähdy jos kipua ilmenee","Hengitä syvään ja tasaisesti"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - IT перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento del collo',
    instructions_it = '["Stai in piedi dritto, piedi alla larghezza delle spalle","Ruota lentamente la testa a sinistra e a destra","Inclina la testa avanti e indietro","Esegui movimenti circolari con la testa","Mantieni le spalle rilassate"]',
    tips_it = '["Muoviti lentamente e dolcemente","Non fare movimenti bruschi","Fermati se senti dolore","Respira profondamente e uniformemente"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - DE перевод
UPDATE exercises 
SET 
    title_de = 'Nackenaufwärmung',
    instructions_de = '["Stehen Sie gerade, Füße schulterbreit auseinander","Drehen Sie den Kopf langsam nach links und rechts","Neigen Sie den Kopf nach vorne und hinten","Führen Sie kreisförmige Bewegungen mit dem Kopf aus","Halten Sie die Schultern entspannt"]',
    tips_de = '["Bewegen Sie sich langsam und sanft","Machen Sie keine ruckartigen Bewegungen","Stoppen Sie bei Schmerzen","Atmen Sie tief und gleichmäßig"]',
    updated_at = NOW()
WHERE exercise_id = '27';

-- Разминка шеи - FR перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement du cou',
    instructions_fr = '["Tenez-vous droit, pieds écartés de la largeur des épaules","Tournez lentement la tête à gauche et à droite","Inclinez la tête en avant et en arrière","Effectuez des mouvements circulaires avec la tête","Gardez les épaules détendues"]',
    tips_fr = '["Bougez lentement et en douceur","Ne faites pas de mouvements brusques","Arrêtez-vous en cas de douleur","Respirez profondément et régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '27';


-- Разминка запястий (#28)
UPDATE exercises 
SET 
    instructions_ru = '["Вытяните руки перед собой","Согните запястья вверх и вниз","Поворачивайте запястья по кругу","Сжимайте и разжимайте кулаки","Растягивайте пальцы в стороны"]',
    tips_ru = '["Выполняйте движения медленно","Не перенапрягайте суставы","Следите за ощущениями в запястьях","Повторяйте регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - PL перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka nadgarstków',
    instructions_pl = '["Wyciągnij ręce przed siebie","Zginaj nadgarstki w górę i w dół","Obracaj nadgarstki w kółko","Ściskaj i rozluźniaj pięści","Rozciągaj palce na boki"]',
    tips_pl = '["Wykonuj ruchy powoli","Nie przeciążaj stawów","Zwracaj uwagę na odczucia w nadgarstkach","Powtarzaj regularnie"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - SV перевод
UPDATE exercises 
SET 
    title_sv = 'Handledsuppvärmning',
    instructions_sv = '["Sträck armarna framåt","Böj handlederna uppåt och nedåt","Rotera handlederna i cirklar","Krama och öppna händerna","Sträck fingrarna åt sidorna"]',
    tips_sv = '["Utför rörelser långsamt","Överansträng inte lederna","Var uppmärksam på känslor i handlederna","Upprepa regelbundet"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - CS перевод
UPDATE exercises 
SET 
    title_cs = 'Rozcvička zápěstí',
    instructions_cs = '["Natáhněte paže před sebe","Ohýbejte zápěstí nahoru a dolů","Otáčejte zápěstí v kruzích","Stiskněte a uvolněte pěsti","Protahujte prsty do stran"]',
    tips_cs = '["Provádějte pohyby pomalu","Nepřetěžujte klouby","Sledujte pocity v zápěstích","Opakujte pravidelně"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - SK перевод
UPDATE exercises 
SET 
    title_sk = 'Rozcvička zápästí',
    instructions_sk = '["Natiahnite paže pred seba","Ohýbajte zápästia nahor a nadol","Otáčajte zápästia v kruhoch","Stlačte a uvoľnite päste","Protahujte prsty do strán"]',
    tips_sk = '["Vykonávajte pohyby pomaly","Nepreťažujte kĺby","Sledujte pocity v zápästiach","Opakujte pravidelne"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - FI перевод
UPDATE exercises 
SET 
    title_fi = 'Ranteiden lämmittely',
    instructions_fi = '["Ojenna kädet eteenpäin","Taivuta ranteita ylös ja alas","Kierrä ranteita ympyröissä","Purista ja avaa nyrkit","Venytä sormia sivuille"]',
    tips_fi = '["Tee liikkeitä hitaasti","Älä rasita niveliä","Kiinnitä huomiota ranteiden tuntemuksiin","Toista säännöllisesti"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - IT перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento dei polsi',
    instructions_it = '["Estendi le braccia davanti a te","Piega i polsi su e giù","Ruota i polsi in cerchi","Stringi e apri i pugni","Allunga le dita ai lati"]',
    tips_it = '["Esegui i movimenti lentamente","Non sovraccaricare le articolazioni","Presta attenzione alle sensazioni nei polsi","Ripeti regolarmente"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - DE перевод
UPDATE exercises 
SET 
    title_de = 'Handgelenksaufwärmung',
    instructions_de = '["Strecken Sie die Arme nach vorne","Beugen Sie die Handgelenke nach oben und unten","Drehen Sie die Handgelenke in Kreisen","Ballten und öffnen Sie die Fäuste","Dehnen Sie die Finger zur Seite"]',
    tips_de = '["Führen Sie Bewegungen langsam aus","Überlasten Sie die Gelenke nicht","Achten Sie auf Empfindungen in den Handgelenken","Wiederholen Sie regelmäßig"]',
    updated_at = NOW()
WHERE exercise_id = '28';

-- Разминка запястий - FR перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement des poignets',
    instructions_fr = '["Tendez les bras devant vous","Pliez les poignets vers le haut et le bas","Tournez les poignets en cercles","Serrez et desserrez les poings","Étirez les doigts sur les côtés"]',
    tips_fr = '["Effectuez les mouvements lentement","Ne surchargez pas les articulations","Portez attention aux sensations dans les poignets","Répétez régulièrement"]',
    updated_at = NOW()
WHERE exercise_id = '28';


-- Разминка коленей (#29)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Медленно сгибайте и разгибайте колени","Выполняйте круговые движения коленями","Делайте приседания с небольшой амплитудой","Растягивайте переднюю поверхность бедра"]',
    tips_ru = '["Не делайте глубоких приседаний","Двигайтесь плавно и контролируемо","При боли в коленях уменьшите амплитуду","Следите за правильной техникой"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - PL перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka kolan',
    instructions_pl = '["Stań prosto, stopy na szerokości barków","Powoli zginaj i prostuj kolana","Wykonuj okrężne ruchy kolanami","Rób przysiady z małą amplitudą","Rozciągaj przednią powierzchnię uda"]',
    tips_pl = '["Nie rób głębokich przysiadów","Ruszaj się płynnie i kontrolowanie","Przy bólu w kolanach zmniejsz amplitudę","Zwracaj uwagę na prawidłową technikę"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - SV перевод
UPDATE exercises 
SET 
    title_sv = 'Knäuppvärmning',
    instructions_sv = '["Stå rakt, fötterna axelbredd isär","Böj och sträck knäna långsamt","Utför cirkulära rörelser med knäna","Gör squats med liten amplitud","Sträck framsidan av låret"]',
    tips_sv = '["Gör inga djupa squats","Rör dig mjukt och kontrollerat","Vid knäsmärta, minska amplituden","Var uppmärksam på korrekt teknik"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - CS перевод
UPDATE exercises 
SET 
    title_cs = 'Rozcvička kolen',
    instructions_cs = '["Postavte se rovně, nohy na šířku ramen","Pomalu ohýbejte a natahujte kolena","Provádějte kruhové pohyby koleny","Dělejte dřepy s malou amplitudou","Protahujte přední stranu stehna"]',
    tips_cs = '["Nedělejte hluboké dřepy","Pohybujte se plynule a kontrolovaně","Při bolesti v kolenou snižte amplitudu","Sledujte správnou techniku"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - SK перевод
UPDATE exercises 
SET 
    title_sk = 'Rozcvička kolien',
    instructions_sk = '["Postavte sa rovno, nohy na šírku ramien","Pomaly ohýbajte a natahujte kolená","Vykonávajte kruhové pohyby kolenami","Robte drep s malou amplitúdou","Protahujte prednú stranu stehna"]',
    tips_sk = '["Nerobte hlboké drepy","Pohybujte sa plynulo a kontrolovane","Pri bolesti v kolenách znížte amplitúdu","Sledujte správnu techniku"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - FI перевод
UPDATE exercises 
SET 
    title_fi = 'Polvien lämmittely',
    instructions_fi = '["Seiso suorassa, jalat hartioiden levyisellä","Taivuta ja ojenna polvia hitaasti","Tee kiertoliikkeitä polvilla","Tee kyykkyjä pienellä amplitudilla","Venytä reiden etupuolta"]',
    tips_fi = '["Älä tee syviä kyykkyjä","Liiku sujuvasti ja hallitusti","Polvikivussa vähennä amplitudia","Kiinnitä huomiota oikeaan tekniikkaan"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - IT перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento delle ginocchia',
    instructions_it = '["Stai in piedi dritto, piedi alla larghezza delle spalle","Piega e distendi lentamente le ginocchia","Esegui movimenti circolari con le ginocchia","Fai squat con piccola ampiezza","Allunga la parte anteriore della coscia"]',
    tips_it = '["Non fare squat profondi","Muoviti dolcemente e controllatamente","In caso di dolore al ginocchio, riduci l''ampiezza","Presta attenzione alla tecnica corretta"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - DE перевод
UPDATE exercises 
SET 
    title_de = 'Knieaufwärmung',
    instructions_de = '["Stehen Sie gerade, Füße schulterbreit auseinander","Beugen und strecken Sie die Knie langsam","Führen Sie kreisförmige Bewegungen mit den Knien aus","Machen Sie Kniebeugen mit kleiner Amplitude","Dehnen Sie die Vorderseite des Oberschenkels"]',
    tips_de = '["Machen Sie keine tiefen Kniebeugen","Bewegen Sie sich sanft und kontrolliert","Bei Knieschmerzen die Amplitude reduzieren","Achten Sie auf die richtige Technik"]',
    updated_at = NOW()
WHERE exercise_id = '29';

-- Разминка коленей - FR перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement des genoux',
    instructions_fr = '["Tenez-vous droit, pieds écartés de la largeur des épaules","Pliez et étendez lentement les genoux","Effectuez des mouvements circulaires avec les genoux","Faites des squats avec une petite amplitude","Étirez la face avant de la cuisse"]',
    tips_fr = '["Ne faites pas de squats profonds","Bougez en douceur et de manière contrôlée","En cas de douleur au genou, réduisez l''amplitude","Portez attention à la technique correcte"]',
    updated_at = NOW()
WHERE exercise_id = '29';


-- Разминка тазобедренных суставов (#30)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Поднимайте колено к груди","Отводите ногу в сторону и назад","Выполняйте круговые движения бедром","Делайте выпады с небольшой амплитудой"]',
    tips_ru = '["Держите спину прямой","Работайте в комфортной амплитуде","Не торопитесь с движениями","Следите за балансом"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - PL перевод
UPDATE exercises 
SET 
    title_pl = 'Rozgrzewka stawów biodrowych',
    instructions_pl = '["Stań prosto, stopy na szerokości barków","Unieś kolano do klatki piersiowej","Odsuń nogę w bok i do tyłu","Wykonuj okrężne ruchy biodrem","Rób wykroki z małą amplitudą"]',
    tips_pl = '["Trzymaj plecy prosto","Pracuj w komfortowej amplitudzie","Nie spiesz się z ruchami","Zwracaj uwagę na równowagę"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - SV перевод
UPDATE exercises 
SET 
    title_sv = 'Höftledsuppvärmning',
    instructions_sv = '["Stå rakt, fötterna axelbredd isär","Lyft knäet till bröstet","För benet åt sidan och bakåt","Utför cirkulära rörelser med höften","Gör lunges med liten amplitud"]',
    tips_sv = '["Håll ryggen rak","Arbeta i bekväm amplitud","Stressa inte rörelserna","Var uppmärksam på balansen"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - CS перевод
UPDATE exercises 
SET 
    title_cs = 'Rozcvička kyčelních kloubů',
    instructions_cs = '["Postavte se rovně, nohy na šířku ramen","Zvedněte koleno k hrudníku","Odveďte nohu do strany a dozadu","Provádějte kruhové pohyby kyčlí","Dělejte výpady s malou amplitudou"]',
    tips_cs = '["Mějte záda rovná","Pracujte v pohodlné amplitudě","Nespěchejte s pohyby","Sledujte rovnováhu"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - SK перевод
UPDATE exercises 
SET 
    title_sk = 'Rozcvička bedrových kĺbov',
    instructions_sk = '["Postavte sa rovno, nohy na šírku ramien","Zdvihnite koleno k hrudníku","Odveďte nohu do strany a dozadu","Vykonávajte kruhové pohyby bedrami","Robte výpady s malou amplitúdou"]',
    tips_sk = '["Majte chrbát rovný","Pracujte v pohodlnej amplitúde","Neponáhľajte sa s pohybmi","Sledujte rovnováhu"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - FI перевод
UPDATE exercises 
SET 
    title_fi = 'Lantionivelten lämmittely',
    instructions_fi = '["Seiso suorassa, jalat hartioiden levyisellä","Nosta polvi rintaan","Vie jalka sivulle ja taakse","Tee kiertoliikkeitä lantioilla","Tee haara-askeleita pienellä amplitudilla"]',
    tips_fi = '["Pidä selkä suorana","Tee työtä mukavalla amplitudilla","Älä kiirehdi liikkeillä","Kiinnitä huomiota tasapainoon"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - IT перевод
UPDATE exercises 
SET 
    title_it = 'Riscaldamento delle articolazioni dell''anca',
    instructions_it = '["Stai in piedi dritto, piedi alla larghezza delle spalle","Solleva il ginocchio al petto","Porta la gamba di lato e indietro","Esegui movimenti circolari con l''anca","Fai affondi con piccola ampiezza"]',
    tips_it = '["Mantieni la schiena dritta","Lavora con ampiezza confortevole","Non avere fretta con i movimenti","Presta attenzione all''equilibrio"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - DE перевод
UPDATE exercises 
SET 
    title_de = 'Hüftgelenksaufwärmung',
    instructions_de = '["Stehen Sie gerade, Füße schulterbreit auseinander","Heben Sie das Knie zur Brust","Führen Sie das Bein zur Seite und nach hinten","Führen Sie kreisförmige Bewegungen mit der Hüfte aus","Machen Sie Ausfallschritte mit kleiner Amplitude"]',
    tips_de = '["Halten Sie den Rücken gerade","Arbeiten Sie mit angenehmer Amplitude","Haben Sie es nicht eilig mit den Bewegungen","Achten Sie auf das Gleichgewicht"]',
    updated_at = NOW()
WHERE exercise_id = '30';

-- Разминка тазобедренных суставов - FR перевод
UPDATE exercises 
SET 
    title_fr = 'Échauffement des articulations de la hanche',
    instructions_fr = '["Tenez-vous droit, pieds écartés de la largeur des épaules","Levez le genou vers la poitrine","Portez la jambe sur le côté et en arrière","Effectuez des mouvements circulaires avec la hanche","Faites des fentes avec une petite amplitude"]',
    tips_fr = '["Gardez le dos droit","Travaillez avec une amplitude confortable","Ne vous précipitez pas avec les mouvements","Portez attention à l''équilibre"]',
    updated_at = NOW()
WHERE exercise_id = '30';


-- Растяжка паха (#31)
UPDATE exercises 
SET 
    instructions_ru = '["Сядьте на пол, согните ноги в коленях","Соедините подошвы стоп вместе","Аккуратно наклонитесь вперед","Потяните колени к полу","Удерживайте растяжку 30 секунд"]',
    tips_ru = '["Не форсируйте растяжку","Дышите глубоко и расслабляйтесь","При боли уменьшите амплитуду","Выполняйте после разминки"]',
    updated_at = NOW()
WHERE exercise_id = '31';


-- Растяжка подколенных сухожилий (#32)
UPDATE exercises 
SET 
    instructions_ru = '["Сядьте на пол, вытяните ноги вперед","Наклонитесь вперед, стараясь достать до стоп","Обхватите стопы руками","Потянитесь грудью к коленям","Удерживайте растяжку 30-45 секунд"]',
    tips_ru = '["Не округляйте спину","Работайте в комфортной амплитуде","Дышите глубоко","Следите за ощущениями в задней поверхности бедра"]',
    updated_at = NOW()
WHERE exercise_id = '32';


-- Растяжка икроножных мышц (#33)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене","Поставьте одну ногу вперед, другую назад","Опустите пятку задней ноги на пол","Наклонитесь вперед, растягивая икры","Поменяйте ноги и повторите"]',
    tips_ru = '["Держите заднюю ногу прямой","Не отрывайте пятку от пола","Растягивайтесь плавно","Выполняйте для обеих ног"]',
    updated_at = NOW()
WHERE exercise_id = '33';


-- Растяжка грудных мышц (#34)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте в дверном проеме","Поставьте руки на косяки двери","Сделайте шаг вперед","Почувствуйте растяжение в груди","Удерживайте растяжку 30 секунд"]',
    tips_ru = '["Не перенапрягайте плечи","Дышите глубоко","Растягивайтесь постепенно","Следите за ощущениями"]',
    updated_at = NOW()
WHERE exercise_id = '34';


-- Растяжка трицепсов (#35)
UPDATE exercises 
SET 
    instructions_ru = '["Поднимите одну руку вверх","Согните руку в локте за головой","Другой рукой потяните локоть вниз","Почувствуйте растяжение трицепса","Поменяйте руки и повторите"]',
    tips_ru = '["Не делайте резких движений","Растягивайтесь плавно","Дышите равномерно","Выполняйте для обеих рук"]',
    updated_at = NOW()
WHERE exercise_id = '35';


-- Змейка между конусами (#36)
UPDATE exercises 
SET 
    instructions_ru = '["Расставьте конусы змейкой на расстоянии 2-3 метра","Начните бег, огибая каждый конус","Держите низкий центр тяжести","Работайте ногами быстро и часто","Следите за правильной техникой поворотов"]',
    tips_ru = '["Начинайте с медленного темпа","Следите за техникой, а не за скоростью","Держите голову поднятой","Используйте короткие быстрые шаги"]',
    updated_at = NOW()
WHERE exercise_id = '36';


-- Быстрые касания ногами (#37)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте рядом с мячом","Быстро касайтесь мяча ногой","Меняйте ноги каждые 2-3 касания","Поддерживайте постоянный ритм","Выполните 30-60 секунд"]',
    tips_ru = '["Держите вес тела на опорной ноге","Работайте быстро, но контролируемо","Не теряйте равновесие","Следите за техникой касания"]',
    updated_at = NOW()
WHERE exercise_id = '37';


-- Прыжки с поворотами (#38)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Сделайте прыжок вверх","Во время прыжка повернитесь на 180 градусов","Приземлитесь мягко на обе ноги","Сразу повернитесь обратно и повторите"]',
    tips_ru = '["Приземляйтесь на полусогнутые ноги","Работайте руками для баланса","Начинайте с небольших поворотов","Следите за техникой приземления"]',
    updated_at = NOW()
WHERE exercise_id = '38';


-- Быстрые передачи мяча (#39)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене на расстоянии 2-3 метра","Быстро передавайте мяч в стену","Ловите отскок и сразу передавайте обратно","Работайте обеими руками","Выполните 30-45 секунд"]',
    tips_ru = '["Используйте правильную технику передачи","Следите глазами за мячом","Работайте быстро, но точно","Держите руки расслабленными"]',
    updated_at = NOW()
WHERE exercise_id = '39';


-- Бег спиной вперед (#40)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного бега спиной вперед","Часто оглядывайтесь через плечо","Держите центр тяжести низко","Работайте руками для баланса","Выполните 20-30 метров"]',
    tips_ru = '["Начинайте очень медленно","Всегда проверяйте пространство за собой","Держите колени слегка согнутыми","Не торопитесь с увеличением скорости"]',
    updated_at = NOW()
WHERE exercise_id = '40';


-- Приседания с весом (#41)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Возьмите гантели или штангу","Приседайте до параллели с полом","Вставайте, используя силу ног","Выполните 3-4 подхода по 8-12 повторений"]',
    tips_ru = '["Держите спину прямой","Не округляйте поясницу","Колени не должны выходить за носки","Начинайте с легкого веса"]',
    updated_at = NOW()
WHERE exercise_id = '41';


-- Становая тяга (#42)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги на ширине плеч","Возьмите штангу с пола прямым хватом","Согните ноги в коленях и отведите таз назад","Поднимите штангу, разгибая ноги и спину","Верните штангу на пол контролируемо"]',
    tips_ru = '["Держите спину прямой на протяжении всего движения","Не округляйте поясницу","Двигайте штангу близко к телу","Начинайте с легкого веса"]',
    updated_at = NOW()
WHERE exercise_id = '42';


-- Жим лежа (#43)
UPDATE exercises 
SET 
    instructions_ru = '["Лягте на скамью, ноги на полу","Возьмите штангу широким хватом","Опустите штангу к груди контролируемо","Выжмите штангу вверх","Выполните 3-4 подхода по 6-10 повторений"]',
    tips_ru = '["Держите лопатки сведенными","Не отрывайте ноги от пола","Дышите правильно: выдох на усилии","Используйте страховку"]',
    updated_at = NOW()
WHERE exercise_id = '43';


-- Подтягивания (#44)
UPDATE exercises 
SET 
    instructions_ru = '["Повисните на перекладине прямым хватом","Подтянитесь, пока подбородок не окажется над перекладиной","Опуститесь в исходное положение","Держите корпус напряженным","Выполните 3-4 подхода по максимальному количеству"]',
    tips_ru = '["Не раскачивайтесь","Подтягивайтесь плавно и контролируемо","Полностью выпрямляйте руки внизу","При необходимости используйте помощь"]',
    updated_at = NOW()
WHERE exercise_id = '44';


-- Отжимания на брусьях (#45)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте между брусьями","Подпрыгните и зафиксируйтесь на брусьях","Опуститесь, сгибая руки в локтях","Отожмитесь вверх, разгибая руки","Выполните 3-4 подхода по 5-15 повторений"]',
    tips_ru = '["Держите корпус прямым","Не раскачивайтесь","Опускайтесь до комфортной глубины","При необходимости используйте помощь ног"]',
    updated_at = NOW()
WHERE exercise_id = '45';


-- Стойка на одной ноге (#46)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на одну ногу","Поднимите другую ногу перед собой","Держите равновесие как можно дольше","Работайте руками для баланса","Поменяйте ноги и повторите"]',
    tips_ru = '["Смотрите вперед, не вниз","Держите корпус напряженным","Начинайте с коротких подходов","Постепенно увеличивайте время"]',
    updated_at = NOW()
WHERE exercise_id = '46';


-- Планка на одной ноге (#47)
UPDATE exercises 
SET 
    instructions_ru = '["Примите положение планки","Поднимите одну ногу вверх","Держите ногу прямой","Удерживайте позицию 30-60 секунд","Поменяйте ноги и повторите"]',
    tips_ru = '["Держите корпус прямым","Не раскачивайтесь из стороны в сторону","Дышите равномерно","Начинайте с коротких подходов"]',
    updated_at = NOW()
WHERE exercise_id = '47';


-- Приседания на одной ноге (#48)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на одну ногу","Другую ногу вытяните вперед","Приседайте на опорной ноге","Вернитесь в исходное положение","Выполните 3-4 подхода по 5-10 повторений на каждую ногу"]',
    tips_ru = '["Держите спину прямой","Не касайтесь пола второй ногой","Работайте руками для баланса","Начинайте с небольшой амплитуды"]',
    updated_at = NOW()
WHERE exercise_id = '48';


-- Босу-мяч упражнения (#49)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте на полусферу босу-мяч","Держите равновесие","Выполняйте приседания","Делайте повороты корпуса","Выполните 3-4 подхода по 10-15 повторений"]',
    tips_ru = '["Начинайте с простых упражнений","Следите за техникой","Не торопитесь","Используйте помощь для поддержки"]',
    updated_at = NOW()
WHERE exercise_id = '49';


-- Йога-баланс (#50)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте прямо, ноги вместе","Поднимите одну ногу и поставьте на бедро другой","Сложите руки перед грудью","Держите равновесие","Выполните для обеих ног по 30-60 секунд"]',
    tips_ru = '["Смотрите вперед в одну точку","Дышите глубоко и равномерно","Не торопитесь","При потере баланса начните заново"]',
    updated_at = NOW()
WHERE exercise_id = '50';


-- Ходьба по бревну (#51)
UPDATE exercises 
SET 
    instructions_ru = '["Найдите устойчивое бревно или доску","Встаньте на бревно","Идите медленно вперед","Держите равновесие","Выполните несколько проходов"]',
    tips_ru = '["Начинайте с широкого бревна","Смотрите вперед, а не вниз","Работайте руками для баланса","Не торопитесь"]',
    updated_at = NOW()
WHERE exercise_id = '51';


-- Стойка на руках у стены (#52)
UPDATE exercises 
SET 
    instructions_ru = '["Встаньте лицом к стене","Поставьте руки на пол на расстоянии 30 см от стены","Поднимите ноги вверх по стене","Держите стойку на руках","Опустите ноги контролируемо"]',
    tips_ru = '["Начинайте с коротких подходов","Используйте помощь для страховки","Держите корпус напряженным","Не перенапрягайтесь"]',
    updated_at = NOW()
WHERE exercise_id = '52';


-- Фартлек (#53)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного бега 5-10 минут","Увеличьте скорость до 80% от максимальной на 2-3 минуты","Вернитесь к медленному бегу на 1-2 минуты","Повторите цикл 4-6 раз","Завершите медленным бегом 5-10 минут"]',
    tips_ru = '["Слушайте свое тело","Не превышайте 80% от максимальной скорости","Дышите глубоко","Пейте воду во время тренировки"]',
    updated_at = NOW()
WHERE exercise_id = '53';


-- Повторные спринты (#54)
UPDATE exercises 
SET 
    instructions_ru = '["Выполните 10-минутную разминку","Пробегите спринт на максимальной скорости 30 секунд","Отдохните 2-3 минуты","Повторите спринт","Выполните 6-8 спринтов"]',
    tips_ru = '["Не экономьте на разминке","Отдыхайте полностью между спринтами","Следите за техникой бега","Не тренируйтесь ежедневно"]',
    updated_at = NOW()
WHERE exercise_id = '54';


-- Интервалы на велосипеде (#55)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с 5-минутной разминки","Увеличьте нагрузку до 80% от максимальной","Крутите педали с высокой интенсивностью 2-3 минуты","Снизьте нагрузку до 50% на 1-2 минуты","Повторите цикл 6-8 раз"]',
    tips_ru = '["Поддерживайте высокий каденс","Дышите глубоко","Следите за пульсом","Пейте воду регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '55';


-- Бег по холмам (#56)
UPDATE exercises 
SET 
    instructions_ru = '["Найдите холм с уклоном 5-10%","Выполните 10-минутную разминку","Бегите вверх по холму с умеренной скоростью","Спускайтесь вниз для восстановления","Повторите 6-10 подъемов"]',
    tips_ru = '["Начинайте с небольшого уклона","Держите спину прямой при подъеме","Работайте руками активно","Не торопитесь на спуске"]',
    updated_at = NOW()
WHERE exercise_id = '56';


-- Плиометрические круги (#57)
UPDATE exercises 
SET 
    instructions_ru = '["Выполните 10-минутную разминку","Сделайте прыжки в длину с места","Выполните прыжки через препятствия","Сделайте прыжки на ящик","Отдохните 2-3 минуты и повторите круг"]',
    tips_ru = '["Следите за техникой приземления","Приземляйтесь на полусогнутые ноги","Работайте руками для баланса","Не переусердствуйте с количеством"]',
    updated_at = NOW()
WHERE exercise_id = '57';


-- Легкая растяжка (#58)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с легких движений","Выполните растяжку основных мышечных групп","Дышите глубоко и равномерно","Двигайтесь плавно и медленно","Завершите глубоким дыханием"]',
    tips_ru = '["Не растягивайтесь до боли","Дышите глубоко","Расслабляйтесь полностью","Выполняйте регулярно"]',
    updated_at = NOW()
WHERE exercise_id = '58';


-- Фоам-роллинг (#59)
UPDATE exercises 
SET 
    instructions_ru = '["Лягте на фоам-роллер","Медленно катайте роллер под мышцами","Остановитесь на болезненных точках","Держите давление 30-60 секунд","Повторите для всех групп мышц"]',
    tips_ru = '["Не катайте по суставам","Дышите глубоко","Не терпите сильную боль","Начинайте с мягкого роллера"]',
    updated_at = NOW()
WHERE exercise_id = '59';


-- Легкий бег (#60)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного темпа","Держите пульс на уровне 60-70% от максимального","Дышите глубоко и равномерно","Поддерживайте постоянный темп","Завершите постепенным снижением темпа"]',
    tips_ru = '["Следите за пульсом","Дышите через нос","Не перенапрягайтесь","Наслаждайтесь процессом"]',
    updated_at = NOW()
WHERE exercise_id = '60';


-- Плавание (#61)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с разминки на суше","Войдите в воду постепенно","Плавайте в комфортном темпе","Меняйте стили плавания","Завершите медленным плаванием"]',
    tips_ru = '["Не плавайте в одиночку","Следите за техникой","Дышите равномерно","Не переусердствуйте"]',
    updated_at = NOW()
WHERE exercise_id = '61';


-- Велосипед восстановления (#62)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с медленного темпа","Держите пульс на уровне 50-60% от максимального","Крутите педали легко и ритмично","Дышите глубоко","Завершите постепенным снижением темпа"]',
    tips_ru = '["Поддерживайте высокий каденс","Дышите глубоко","Не перенапрягайтесь","Наслаждайтесь поездкой"]',
    updated_at = NOW()
WHERE exercise_id = '62';


-- Йога восстановления (#63)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с простых поз","Выполняйте растяжку медленно","Дышите глубоко и равномерно","Расслабляйтесь в каждой позе","Завершите медитацией"]',
    tips_ru = '["Не форсируйте позы","Дышите через нос","Слушайте свое тело","Наслаждайтесь процессом"]',
    updated_at = NOW()
WHERE exercise_id = '63';


-- Контрастный душ (#65)
UPDATE exercises 
SET 
    instructions_ru = '["Начните с теплой воды","Постепенно переходите к холодной воде","Держите холодную воду 30-60 секунд","Вернитесь к теплой воде","Повторите цикл 3-5 раз"]',
    tips_ru = '["Начинайте постепенно","Дышите глубоко","Не переохлаждайтесь","Слушайте свое тело"]',
    updated_at = NOW()
WHERE exercise_id = '65';


