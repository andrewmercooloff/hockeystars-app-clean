import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameDualLeaderboard from './GameDualLeaderboard';
import { useLanguage } from '../contexts/LanguageContext';
import { Player, notifyFriendsAboutQuizFirstPlace } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import {
  apply5050,
  applyAudiencePoll,
  applyCoachHint,
  buildRankingScore,
  formatLeaderboardScore,
  formatPrize,
  normalizeRankingScore,
  pickQuizSessionQuestions,
  QUESTION_TIME_SEC,
  scoreForLevel,
  speedBonusForResponse,
} from '../data/hockeyQuiz/utils';
import { bestScoreForPlayer, buildDualLeaderboards } from '../utils/gameLeaderboard';
import type { LocalizedQuizQuestion } from '../data/hockeyQuiz/types';
import { PRIZE_LADDER, QUIZ_TOTAL_LEVELS } from '../data/hockeyQuiz/types';
import { MillionaireButton, MillionairePanel } from './MillionairePanel';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOGO = require('../assets/images/hockey-star-quiz-logo-transparent.png');
const GAME_BG = require('../assets/images/hockey-star-quiz-bg.png');

type GamePhase = 'intro' | 'playing' | 'reveal' | 'finished';

interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  player_avatar?: string;
  score: number;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  currentUser: Player | null;
  openToResults?: boolean;
}

export default function HockeyStarQuizGame({ visible, onClose, currentUser, openToResults }: Props) {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const [phase, setPhase] = useState<GamePhase>('intro');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<LocalizedQuizQuestion[]>([]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<boolean[]>([false, false, false, false]);
  const [lifeline5050Used, setLifeline5050Used] = useState(false);
  const [lifelineCoachUsed, setLifelineCoachUsed] = useState(false);
  const [lifelineAudienceUsed, setLifelineAudienceUsed] = useState(false);
  const [coachHintIndex, setCoachHintIndex] = useState<number | null>(null);
  const [audiencePercents, setAudiencePercents] = useState<number[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPrize, setFinalPrize] = useState(0);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [bestScoreMonth, setBestScoreMonth] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SEC);
  const [saveScoreError, setSaveScoreError] = useState<string | null>(null);

  const questionStartedAtRef = useRef(Date.now());
  const speedBonusRef = useRef(0);
  const timeLeftAtAnswerRef = useRef(QUESTION_TIME_SEC);
  const timeoutFiredRef = useRef(false);

  const tr = useCallback(
    (
      key:
        | 'title'
        | 'subtitle'
        | 'start'
        | 'playAgain'
        | 'close'
        | 'topPlayers'
        | 'monthlyChampion'
        | 'allTimeChampion'
        | 'monthlyTop'
        | 'allTimeTop'
        | 'score'
        | 'yourBest'
        | 'yourBestMonth'
        | 'results'
        | 'question'
        | 'lifeline5050'
        | 'lifelineCoach'
        | 'lifelineAudience'
        | 'coachSays'
        | 'audiencePoll'
        | 'correct'
        | 'wrong'
        | 'youWin'
        | 'safeHaven'
        | 'walkAway'
        | 'prize'
        | 'loading'
        | 'timeLeft'
        | 'timeUp'
        | 'rulesLine'
        | 'saveFailed'
    ) => {
      const dict: Record<string, Record<string, string>> = {
        title: {
          en: 'Who Wants to Be a Hockey Star',
          ru: 'Кто хочет стать Звездой хоккея',
          lt: 'Kas nori tapti Hokėjo žvaigžde',
          lv: 'Kas vēlas kļūt par Hokeja zvaigzni',
          pl: 'Kto chce zostać Gwiazdą hokeja',
          sv: 'Vem vill bli en hockeystjärna',
          cs: 'Kdo chce být Hokejovou hvězdou',
          sk: 'Kto chce byť Hokejovou hviezdou',
          fi: 'Kuka haluaa olla jääkiekkotähti',
          it: 'Chi vuol esser Hockey Star',
          de: 'Wer wird Hockey-Star',
          fr: 'Qui veut être une Star du hockey',
        },
        subtitle: {
          en: '15 hockey questions — reach the top prize!',
          ru: '15 хоккейных вопросов — доберись до главного приза!',
          lt: '15 ledo ritulio klausimų — pasiek pagrindinį prizą!',
          lv: '15 hokeja jautājumi — sasniedz galveno balvu!',
          pl: '15 pytań o hokeju — zdobądź główną nagrodę!',
          sv: '15 hockeyfrågor — nå topppriset!',
          cs: '15 hokejových otázek — dosáhni hlavní ceny!',
          sk: '15 hokejových otázok — dosiahni hlavnú cenu!',
          fi: '15 jääkiekkokysymystä — saavuta pääpalkinto!',
          it: '15 domande sull\'hockey — raggiungi il premio massimo!',
          de: '15 Hockey-Fragen — erreiche den Hauptpreis!',
          fr: '15 questions hockey — atteins le gros lot !',
        },
        start: {
          en: 'Start',
          ru: 'Старт',
          lt: 'Pradėti',
          lv: 'Sākt',
          pl: 'Start',
          sv: 'Start',
          cs: 'Start',
          sk: 'Štart',
          fi: 'Aloita',
          it: 'Avvia',
          de: 'Start',
          fr: 'Démarrer',
        },
        playAgain: {
          en: 'Play Again',
          ru: 'Сыграть ещё',
          lt: 'Žaisti dar kartą',
          lv: 'Spēlēt vēlreiz',
          pl: 'Zagraj ponownie',
          sv: 'Spela igen',
          cs: 'Hrát znovu',
          sk: 'Hrať znova',
          fi: 'Pelaa uudelleen',
          it: 'Gioca ancora',
          de: 'Nochmal spielen',
          fr: 'Rejouer',
        },
        close: {
          en: 'Close',
          ru: 'Закрыть',
          lt: 'Uždaryti',
          lv: 'Aizvērt',
          pl: 'Zamknij',
          sv: 'Stäng',
          cs: 'Zavřít',
          sk: 'Zavrieť',
          fi: 'Sulje',
          it: 'Chiudi',
          de: 'Schließen',
          fr: 'Fermer',
        },
        topPlayers: {
          en: 'Top Players',
          ru: 'Топ игроков',
          lt: 'Geriausi žaidėjai',
          lv: 'Top spēlētāji',
          pl: 'Najlepsi gracze',
          sv: 'Toppspelare',
          cs: 'Nejlepší hráči',
          sk: 'Najlepší hráči',
          fi: 'Parhaat pelaajat',
          it: 'Migliori giocatori',
          de: 'Top-Spieler',
          fr: 'Meilleurs joueurs',
        },
        monthlyChampion: {
          en: 'Champion of the month',
          ru: 'Рекордсмен месяца',
          lt: 'Mėnesio čempionas',
          lv: 'Mēneša čempions',
          pl: 'Mistrz miesiąca',
          sv: 'Månadens mästare',
          cs: 'Mistr měsíce',
          sk: 'Majster mesiaca',
          fi: 'Kuukauden mestari',
          it: 'Campione del mese',
          de: 'Champion des Monats',
          fr: 'Champion du mois',
        },
        allTimeChampion: {
          en: 'All-time champion',
          ru: 'Рекордсмен за все время',
          lt: 'Visų laikų čempionas',
          lv: 'Visu laiku čempions',
          pl: 'Mistrz wszech czasów',
          sv: 'Mästare genom tiderna',
          cs: 'Mistr všech dob',
          sk: 'Majster všetkých čias',
          fi: 'Kaikkien aikojen mestari',
          it: 'Campione di sempre',
          de: 'Rekordhalter aller Zeiten',
          fr: 'Champion de tous les temps',
        },
        monthlyTop: {
          en: 'Top this month',
          ru: 'Топ месяца',
          lt: 'Geriausi šį mėnesį',
          lv: 'Mēneša tops',
          pl: 'Top miesiąca',
          sv: 'Topp denna månad',
          cs: 'Top měsíce',
          sk: 'Top mesiaca',
          fi: 'Kuukauden kärki',
          it: 'Top del mese',
          de: 'Top des Monats',
          fr: 'Top du mois',
        },
        allTimeTop: {
          en: 'All-time top',
          ru: 'Топ за все время',
          lt: 'Visų laikų top',
          lv: 'Visu laiku tops',
          pl: 'Top wszech czasów',
          sv: 'Topp genom tiderna',
          cs: 'Top všech dob',
          sk: 'Top všetkých čias',
          fi: 'Kaikkien aikojen kärki',
          it: 'Top di sempre',
          de: 'Top aller Zeiten',
          fr: 'Top de tous les temps',
        },
        score: {
          en: 'Score: {score}',
          ru: 'Счёт: {score}',
          lt: 'Rezultatas: {score}',
          lv: 'Rezultāts: {score}',
          pl: 'Wynik: {score}',
          sv: 'Poäng: {score}',
          cs: 'Skóre: {score}',
          sk: 'Skóre: {score}',
          fi: 'Tulos: {score}',
          it: 'Punteggio: {score}',
          de: 'Punkte: {score}',
          fr: 'Score : {score}',
        },
        yourBest: {
          en: 'Your all-time best: {score}',
          ru: 'Твой рекорд за все время: {score}',
          lt: 'Tavo visų laikų rekordas: {score}',
          lv: 'Tavs visu laiku rekords: {score}',
          pl: 'Twój rekord wszech czasów: {score}',
          sv: 'Ditt rekord genom tiderna: {score}',
          cs: 'Tvůj rekord všech dob: {score}',
          sk: 'Tvoj rekord všetkých čias: {score}',
          fi: 'Kaikkien aikojen ennätyksesi: {score}',
          it: 'Il tuo record di sempre: {score}',
          de: 'Dein Rekord aller Zeiten: {score}',
          fr: 'Ton record de tous les temps : {score}',
        },
        yourBestMonth: {
          en: 'Your best this month: {score}',
          ru: 'Твой рекорд месяца: {score}',
          lt: 'Tavo mėnesio rekordas: {score}',
          lv: 'Tavs mēneša rekords: {score}',
          pl: 'Twój rekord miesiąca: {score}',
          sv: 'Ditt rekord denna månad: {score}',
          cs: 'Tvůj rekord měsíce: {score}',
          sk: 'Tvoj rekord mesiaca: {score}',
          fi: 'Kuukauden ennätyksesi: {score}',
          it: 'Il tuo record del mese: {score}',
          de: 'Dein Rekord des Monats: {score}',
          fr: 'Ton record du mois : {score}',
        },
        results: {
          en: 'Results',
          ru: 'Результаты',
          lt: 'Rezultatai',
          lv: 'Rezultāti',
          pl: 'Wyniki',
          sv: 'Resultat',
          cs: 'Výsledky',
          sk: 'Výsledky',
          fi: 'Tulokset',
          it: 'Risultati',
          de: 'Ergebnis',
          fr: 'Résultats',
        },
        question: {
          en: 'Question {current} / {total}',
          ru: 'Вопрос {current} / {total}',
          lt: 'Klausimas {current} / {total}',
          lv: 'Jautājums {current} / {total}',
          pl: 'Pytanie {current} / {total}',
          sv: 'Fråga {current} / {total}',
          cs: 'Otázka {current} / {total}',
          sk: 'Otázka {current} / {total}',
          fi: 'Kysymys {current} / {total}',
          it: 'Domanda {current} / {total}',
          de: 'Frage {current} / {total}',
          fr: 'Question {current} / {total}',
        },
        lifeline5050: {
          en: '50:50', ru: '50:50', lt: '50:50', lv: '50:50', pl: '50:50', sv: '50:50',
          cs: '50:50', sk: '50:50', fi: '50:50', it: '50:50', de: '50:50', fr: '50:50',
        },
        lifelineCoach: {
          en: 'Call coach', ru: 'Звонок тренеру', lt: 'Skambutis treneriui', lv: 'Zvans trenerim',
          pl: 'Telefon do trenera', sv: 'Ring tränaren', cs: 'Zavolat trenérovi', sk: 'Zavolať trénerovi',
          fi: 'Soita valmentajalle', it: 'Chiama il coach', de: 'Trainer anrufen', fr: 'Appeler l\'entraîneur',
        },
        lifelineAudience: {
          en: 'Ask crowd', ru: 'Помощь зала', lt: 'Salės pagalba', lv: 'Zāles palīdzība',
          pl: 'Pomoc publiczności', sv: 'Fråga publiken', cs: 'Pomoc hlediště', sk: 'Pomoc hľadiska',
          fi: 'Yleisön apu', it: 'Chiedi al pubblico', de: 'Publikumshilfe', fr: 'Aide du public',
        },
        coachSays: {
          en: 'Coach thinks: {answer}', ru: 'Тренер считает: {answer}', lt: 'Treneris mano: {answer}',
          lv: 'Treneris domā: {answer}', pl: 'Trener uważa: {answer}', sv: 'Tränaren tror: {answer}',
          cs: 'Trenér si myslí: {answer}', sk: 'Tréner si myslí: {answer}', fi: 'Valmentajan mukaan: {answer}',
          it: 'Il coach pensa: {answer}', de: 'Trainer meint: {answer}', fr: 'L\'entraîneur pense : {answer}',
        },
        audiencePoll: {
          en: 'Crowd poll', ru: 'Голосование зала', lt: 'Salės balsavimas', lv: 'Zāles balsojums',
          pl: 'Głosowanie publiczności', sv: 'Publikomröstning', cs: 'Hlasování hlediště', sk: 'Hlasovanie hľadiska',
          fi: 'Yleisöäänestys', it: 'Sondaggio pubblico', de: 'Publikumsabstimmung', fr: 'Sondage du public',
        },
        correct: {
          en: 'Correct!',
          ru: 'Верно!',
          lt: 'Teisingai!',
          lv: 'Pareizi!',
          pl: 'Poprawnie!',
          sv: 'Rätt!',
          cs: 'Správně!',
          sk: 'Správne!',
          fi: 'Oikein!',
          it: 'Corretto!',
          de: 'Richtig!',
          fr: 'Correct !',
        },
        wrong: {
          en: 'Wrong answer',
          ru: 'Неверный ответ',
          lt: 'Neteisingas atsakymas',
          lv: 'Nepareiza atbilde',
          pl: 'Zła odpowiedź',
          sv: 'Fel svar',
          cs: 'Špatná odpověď',
          sk: 'Zlá odpoveď',
          fi: 'Väärä vastaus',
          it: 'Risposta sbagliata',
          de: 'Falsche Antwort',
          fr: 'Mauvaise réponse',
        },
        youWin: {
          en: 'You are a Hockey Star!',
          ru: 'Ты — Звезда хоккея!',
          lt: 'Tu esi Hokėjo žvaigždė!',
          lv: 'Tu esi Hokeja zvaigzne!',
          pl: 'Jesteś Gwiazdą hokeja!',
          sv: 'Du är en hockeystjärna!',
          cs: 'Jsi Hokejovou hvězdou!',
          sk: 'Si Hokejovou hviezdou!',
          fi: 'Olet jääkiekkotähti!',
          it: 'Sei una Hockey Star!',
          de: 'Du bist ein Hockey-Star!',
          fr: 'Tu es une Star du hockey !',
        },
        safeHaven: {
          en: 'Safe haven reached',
          ru: 'Несгораемая сумма',
          lt: 'Saugus taškas',
          lv: 'Drošs līmenis',
          pl: 'Bezpieczna kwota',
          sv: 'Säker nivå',
          cs: 'Jistota',
          sk: 'Istota',
          fi: 'Turvataso',
          it: 'Traguardo sicuro',
          de: 'Sicherer Betrag',
          fr: 'Palier sécurisé',
        },
        walkAway: {
          en: 'Take prize & exit',
          ru: 'Забрать выигрыш',
          lt: 'Pasiimti prizą',
          lv: 'Paņemt balvu',
          pl: 'Weź nagrodę',
          sv: 'Ta vinsten',
          cs: 'Vzít výhru',
          sk: 'Vziať výhru',
          fi: 'Ota palkinto',
          it: 'Incassa',
          de: 'Gewinn mitnehmen',
          fr: 'Emporter le gain',
        },
        prize: {
          en: 'Prize',
          ru: 'Приз',
          lt: 'Prizas',
          lv: 'Balva',
          pl: 'Nagroda',
          sv: 'Pris',
          cs: 'Výhra',
          sk: 'Výhra',
          fi: 'Palkinto',
          it: 'Premio',
          de: 'Preis',
          fr: 'Gain',
        },
        loading: {
          en: 'Loading questions…',
          ru: 'Загрузка вопросов…',
          lt: 'Kraunami klausimai…',
          lv: 'Ielādē jautājumus…',
          pl: 'Ładowanie pytań…',
          sv: 'Laddar frågor…',
          cs: 'Načítání otázek…',
          sk: 'Načítavanie otázok…',
          fi: 'Ladataan kysymyksiä…',
          it: 'Caricamento domande…',
          de: 'Fragen laden…',
          fr: 'Chargement des questions…',
        },
        timeLeft: {
          en: 'Time: {sec}s',
          ru: 'Время: {sec} с',
          lt: 'Laikas: {sec} s',
          lv: 'Laiks: {sec} s',
          pl: 'Czas: {sec} s',
          sv: 'Tid: {sec} s',
          cs: 'Čas: {sec} s',
          sk: 'Čas: {sec} s',
          fi: 'Aika: {sec} s',
          it: 'Tempo: {sec} s',
          de: 'Zeit: {sec} s',
          fr: 'Temps : {sec} s',
        },
        timeUp: {
          en: 'Time is up!',
          ru: 'Время вышло!',
          lt: 'Laikas baigėsi!',
          lv: 'Laiks beidzās!',
          pl: 'Czas minął!',
          sv: 'Tiden är ute!',
          cs: 'Čas vypršel!',
          sk: 'Čas vypršal!',
          fi: 'Aika loppui!',
          it: 'Tempo scaduto!',
          de: 'Zeit abgelaufen!',
          fr: 'Temps écoulé !',
        },
        saveFailed: {
          en: 'Score was not saved. Update the app or contact support.',
          ru: 'Результат не сохранился. Обновите приложение или напишите в поддержку.',
          lt: 'Rezultatas neišsaugotas.',
          lv: 'Rezultāts netika saglabāts.',
          pl: 'Wynik nie został zapisany.',
          sv: 'Resultatet sparades inte.',
          cs: 'Skóre se neuložilo.',
          sk: 'Skóre sa neuložilo.',
          fi: 'Tulosta ei tallennettu.',
          it: 'Punteggio non salvato.',
          de: 'Ergebnis wurde nicht gespeichert.',
          fr: 'Le score n\'a pas été enregistré.',
        },
        rulesLine: {
          en: '60 sec per question · faster answers rank higher at equal prize',
          ru: '60 сек на ответ · при равном призе быстрее = выше в рейтинге',
          lt: '60 s klausimui · greitesni atsakymai laimi lygų prizą',
          lv: '60 s jautājumam · ātrāka atbilde = augstāks reitings',
          pl: '60 s na pytanie · szybsza odpowiedź = wyżej przy równej nagrodzie',
          sv: '60 s per fråga · snabbare svar ger högre rank vid lika vinst',
          cs: '60 s na otázku · rychlejší odpověď = lepší pořadí při stejné výhře',
          sk: '60 s na otázku · rýchlejšia odpoveď = lepšie poradie pri rovnakej výhre',
          fi: '60 s / kysymys · nopeampi vastaus nostaa sijaa tasapalkinnolla',
          it: '60 s per domanda · risposta più rapida = ranking migliore a parità di premio',
          de: '60 s pro Frage · schnellere Antwort = besser bei gleichem Gewinn',
          fr: '60 s par question · plus rapide = mieux classé à gain égal',
        },
      };
      return dict[key]?.[language] || dict[key]?.en || key;
    },
    [language]
  );

  const compareQuizScores = useCallback(
    (a: number, b: number) => normalizeRankingScore(a) - normalizeRankingScore(b),
    []
  );

  const leaderboardLabels = useMemo(
    () => ({
      monthlyChampion: tr('monthlyChampion'),
      allTimeChampion: tr('allTimeChampion'),
      monthlyTop: tr('monthlyTop'),
      allTimeTop: tr('allTimeTop'),
    }),
    [tr]
  );

  const formatQuizScore = useCallback(
    (value: number) => formatLeaderboardScore(value, language),
    [language]
  );

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hockey_star_quiz_scores')
        .select('player_id, player_name, player_avatar, score, created_at')
        .order('score', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Failed to load quiz leaderboard:', error.message, error.code);
        return;
      }

      const dual = buildDualLeaderboards(data || [], compareQuizScores, 10);
      setMonthlyLeaderboard(dual.monthly);
      setAllTimeLeaderboard(dual.allTime);

      if (currentUser) {
        setBestScore(bestScoreForPlayer(data || [], currentUser.id, 'all', compareQuizScores));
        setBestScoreMonth(bestScoreForPlayer(data || [], currentUser.id, 'month', compareQuizScores));
      }
    } catch (e) {
      console.error('Failed to load quiz leaderboard:', e);
    }
  }, [compareQuizScores, currentUser]);

  const finishGame = useCallback(
    async (levelReached: number) => {
      const prize = scoreForLevel(levelReached);
      const rankingScore = buildRankingScore(prize, speedBonusRef.current);
      setFinalPrize(prize);
      setFinalScore(rankingScore);
      setSaveScoreError(null);
      setPhase('finished');

      if (currentUser && rankingScore > 0) {
        try {
          const { data: beforeScores } = await supabase
            .from('hockey_star_quiz_scores')
            .select('player_id, player_name, player_avatar, score, created_at')
            .order('score', { ascending: false })
            .limit(500);

          const beforeDual = buildDualLeaderboards(beforeScores || [], compareQuizScores);
          const oldLeaderId = beforeDual.allTimeChampion?.player_id;
          const prevGlobalMax = beforeDual.allTimeChampion?.score ?? 0;

          const { error: insertError } = await supabase.from('hockey_star_quiz_scores').insert({
            player_id: currentUser.id,
            player_name: currentUser.name,
            player_avatar: currentUser.avatar || null,
            score: rankingScore,
          });

          if (insertError) {
            console.error('Failed to save quiz score:', insertError.message, insertError.code, insertError.details);
            setSaveScoreError(insertError.message || insertError.code || 'insert_failed');
          }

          const { data: topScores } = await supabase
            .from('hockey_star_quiz_scores')
            .select('player_id, player_name, player_avatar, score, created_at')
            .order('score', { ascending: false })
            .limit(500);

          if (topScores && topScores.length > 0) {
            const afterDual = buildDualLeaderboards(topScores, compareQuizScores);
            const newLeaderId = afterDual.allTimeChampion?.player_id;
            const becameLeader = newLeaderId === currentUser.id && oldLeaderId !== currentUser.id;
            const newGlobalRecordWhileLeader =
              newLeaderId === currentUser.id && rankingScore > prevGlobalMax;
            if (becameLeader || newGlobalRecordWhileLeader) {
              notifyFriendsAboutQuizFirstPlace(
                currentUser.id,
                currentUser.name || 'Player',
                rankingScore,
                currentUser.avatar
              ).catch(() => {});
            }
          }
        } catch (e) {
          console.error('Failed to save quiz score:', e);
        }
      }
      loadLeaderboard();
    },
    [compareQuizScores, currentUser, loadLeaderboard]
  );

  const resetSession = useCallback(() => {
    setPhase('intro');
    setQuestions([]);
    setLevelIndex(0);
    setSelectedAnswer(null);
    setHiddenOptions([false, false, false, false]);
    setLifeline5050Used(false);
    setLifelineCoachUsed(false);
    setLifelineAudienceUsed(false);
    setCoachHintIndex(null);
    setAudiencePercents(null);
    setFinalScore(0);
    setFinalPrize(0);
    setSaveScoreError(null);
    setTimeLeft(QUESTION_TIME_SEC);
    speedBonusRef.current = 0;
    timeoutFiredRef.current = false;
  }, []);

  const startGame = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const picked = await pickQuizSessionQuestions(language);
      setQuestions(picked);
      setLevelIndex(0);
      setSelectedAnswer(null);
      setHiddenOptions([false, false, false, false]);
      setLifelineCoachUsed(false);
      setLifelineAudienceUsed(false);
      setCoachHintIndex(null);
      setAudiencePercents(null);
      setLifeline5050Used(false);
      speedBonusRef.current = 0;
      timeoutFiredRef.current = false;
      setTimeLeft(QUESTION_TIME_SEC);
      questionStartedAtRef.current = Date.now();
      setPhase('playing');
    } finally {
      setLoadingQuestions(false);
    }
  }, [language]);

  useEffect(() => {
    if (!visible) {
      resetSession();
      return;
    }
    loadLeaderboard();
    if (openToResults) {
      setPhase('finished');
    }
  }, [visible, openToResults, loadLeaderboard, resetSession]);

  const currentQuestion = questions[levelIndex];
  const currentLevel = levelIndex + 1;
  const currentPrize = PRIZE_LADDER[levelIndex] ?? 0;

  const handleAnswerPress = (index: number) => {
    if (phase !== 'playing' || hiddenOptions[index] || selectedAnswer !== null) return;
    timeLeftAtAnswerRef.current = timeLeft;
    setSelectedAnswer(index);
    setPhase('reveal');
  };

  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return;
    questionStartedAtRef.current = Date.now();
    timeoutFiredRef.current = false;
    setTimeLeft(QUESTION_TIME_SEC);
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          if (!timeoutFiredRef.current) {
            timeoutFiredRef.current = true;
            timeLeftAtAnswerRef.current = 0;
            setSelectedAnswer(-1);
            setPhase('reveal');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, levelIndex, currentQuestion?.id]);

  useEffect(() => {
    if (phase !== 'reveal' || selectedAnswer === null || !currentQuestion) return;
    const timer = setTimeout(() => {
      const timedOut = selectedAnswer === -1;
      const isCorrect = !timedOut && selectedAnswer === currentQuestion.correctIndex;
      if (isCorrect) {
        speedBonusRef.current += speedBonusForResponse(timeLeftAtAnswerRef.current);
        if (currentLevel >= QUIZ_TOTAL_LEVELS) {
          finishGame(QUIZ_TOTAL_LEVELS);
        } else {
          setLevelIndex((i) => i + 1);
          setSelectedAnswer(null);
          setHiddenOptions([false, false, false, false]);
          setCoachHintIndex(null);
          setAudiencePercents(null);
          setPhase('playing');
        }
      } else {
        let safeLevel = 0;
        if (currentLevel > 10) safeLevel = 10;
        else if (currentLevel > 5) safeLevel = 5;
        else safeLevel = Math.max(0, currentLevel - 1);
        finishGame(safeLevel);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [phase, selectedAnswer, currentQuestion, currentLevel, finishGame]);

  const use5050 = () => {
    if (lifeline5050Used || !currentQuestion || phase !== 'playing') return;
    const result = apply5050(currentQuestion.options, currentQuestion.correctIndex);
    setHiddenOptions(result.hidden);
    setLifeline5050Used(true);
  };

  const useCoach = () => {
    if (lifelineCoachUsed || !currentQuestion || phase !== 'playing') return;
    setCoachHintIndex(applyCoachHint(currentQuestion.correctIndex));
    setLifelineCoachUsed(true);
  };

  const useAudience = () => {
    if (lifelineAudienceUsed || !currentQuestion || phase !== 'playing') return;
    setAudiencePercents(applyAudiencePoll(currentQuestion.correctIndex));
    setLifelineAudienceUsed(true);
  };

  const answerLabels = ['A', 'B', 'C', 'D'];

  const ladderItems = useMemo(
    () =>
      PRIZE_LADDER.map((value, idx) => {
        const level = idx + 1;
        const active = phase === 'playing' && level === currentLevel;
        const passed = level < currentLevel || phase === 'finished';
        return { level, value, active, passed };
      }).reverse(),
    [currentLevel, phase]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ImageBackground source={GAME_BG} style={styles.root} resizeMode="cover">
        <View style={styles.rootOverlay} />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {phase === 'playing' && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => finishGame(Math.max(0, currentLevel - 1))}>
              <Ionicons name="wallet-outline" size={20} color="#ffd700" />
              <Text style={styles.headerBtnText}>{tr('walkAway')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerSpacer} />
          {(phase === 'playing' || phase === 'intro') && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => void loadLeaderboard().then(() => setPhase('finished'))}>
              <Ionicons name="trophy-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {phase === 'intro' && (
          <ScrollView
            style={styles.introScroll}
            contentContainerStyle={styles.introWrap}
            showsVerticalScrollIndicator={false}
          >
            <Image source={LOGO} style={styles.introLogo} resizeMode="contain" />
            <Text style={styles.title}>{tr('title')}</Text>
            <Text style={styles.subtitle}>{tr('subtitle')}</Text>
            <Text style={styles.rulesLine}>{tr('rulesLine')}</Text>

            <MillionaireButton
              style={styles.introStartBtn}
              onPress={() => void startGame()}
              disabled={loadingQuestions}
            >
              {loadingQuestions ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.introStartBtnText}>{tr('start')}</Text>
                </>
              )}
            </MillionaireButton>

            {(monthlyLeaderboard.length > 0 || allTimeLeaderboard.length > 0) && (
              <View style={styles.introLb}>
                <GameDualLeaderboard
                  monthly={monthlyLeaderboard}
                  allTime={allTimeLeaderboard}
                  formatScore={formatQuizScore}
                  labels={leaderboardLabels}
                  introLimit={5}
                  titleStyle={styles.lbTitle}
                  cardStyle={styles.lbCard}
                  rowStyle={styles.lbRow}
                  rankStyle={styles.lbRank}
                  nameStyle={styles.lbName}
                  scoreStyle={styles.lbScore}
                />
              </View>
            )}

            {bestScoreMonth > 0 && (
              <Text style={styles.introBest}>
                {tr('yourBestMonth').replace('{score}', formatLeaderboardScore(bestScoreMonth, language))}
              </Text>
            )}
            {bestScore > 0 && (
              <Text style={styles.introBest}>
                {tr('yourBest').replace('{score}', formatLeaderboardScore(bestScore, language))}
              </Text>
            )}
          </ScrollView>
        )}

        {(phase === 'playing' || phase === 'reveal') && currentQuestion && (
          <View style={styles.gameWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ladderScroll} contentContainerStyle={styles.ladderRow}>
              {ladderItems.map((item) => (
                <View
                  key={item.level}
                  style={[
                    styles.ladderItem,
                    item.active && styles.ladderItemActive,
                    item.passed && styles.ladderItemPassed,
                  ]}
                >
                  <Text style={styles.ladderLevel}>{item.level}</Text>
                  <Text style={styles.ladderValue}>{formatPrize(item.value, language)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.metaRow}>
              <Text style={styles.questionMeta}>
                {tr('question').replace('{current}', String(currentLevel)).replace('{total}', String(QUIZ_TOTAL_LEVELS))}
              </Text>
              <Text style={[styles.timerText, timeLeft <= 10 && styles.timerUrgent]}>
                {tr('timeLeft').replace('{sec}', String(timeLeft))}
              </Text>
            </View>
            <Text style={styles.currentPrize}>
              {tr('prize')}: {formatPrize(currentPrize, language)}
            </Text>

            <View style={styles.questionBox}>
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.answers}>
              {currentQuestion.options.map((option, idx) => {
                if (hiddenOptions[idx]) return null;
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQuestion.correctIndex;
                let boxStyle = styles.answerBtn;
                if (phase === 'reveal') {
                  if (isCorrect) boxStyle = StyleSheet.flatten([styles.answerBtn, styles.answerCorrect]);
                  else if (isSelected) boxStyle = StyleSheet.flatten([styles.answerBtn, styles.answerWrong]);
                } else if (isSelected) {
                  boxStyle = StyleSheet.flatten([styles.answerBtn, styles.answerSelected]);
                }
                const isCoachPick = coachHintIndex === idx;
                return (
                  <TouchableOpacity
                    key={`${currentQuestion.id}-${idx}`}
                    style={boxStyle}
                    onPress={() => handleAnswerPress(idx)}
                    disabled={phase !== 'playing'}
                    activeOpacity={0.85}
                  >
                    <View style={styles.answerLabelWrap}>
                      <Text style={styles.answerLabelText}>{answerLabels[idx]}</Text>
                    </View>
                    <View style={styles.answerTextWrap}>
                      <Text style={styles.answerText}>{option}</Text>
                      {audiencePercents && (
                        <View style={styles.audienceBarTrack}>
                          <View style={[styles.audienceBarFill, { width: `${audiencePercents[idx]}%` }]} />
                          <Text style={styles.audiencePct}>{audiencePercents[idx]}%</Text>
                        </View>
                      )}
                    </View>
                    {isCoachPick && (
                      <View style={styles.coachBadge}>
                        <Ionicons name="call" size={14} color="#ffd700" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {coachHintIndex !== null && currentQuestion && (
              <Text style={styles.coachHintText}>
                {tr('coachSays').replace('{answer}', currentQuestion.options[coachHintIndex])}
              </Text>
            )}

            {phase === 'playing' && (
              <View style={styles.lifelinesRow}>
                <TouchableOpacity
                  style={[styles.lifelineBtn, lifeline5050Used && styles.lifelineUsed]}
                  onPress={use5050}
                  disabled={lifeline5050Used}
                >
                  <Text style={styles.lifelineText}>{tr('lifeline5050')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.lifelineBtn, lifelineCoachUsed && styles.lifelineUsed]}
                  onPress={useCoach}
                  disabled={lifelineCoachUsed}
                >
                  <Ionicons name="call-outline" size={16} color="#ffd700" />
                  <Text style={styles.lifelineText}>{tr('lifelineCoach')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.lifelineBtn, lifelineAudienceUsed && styles.lifelineUsed]}
                  onPress={useAudience}
                  disabled={lifelineAudienceUsed}
                >
                  <Ionicons name="people-outline" size={16} color="#ffd700" />
                  <Text style={styles.lifelineText}>{tr('lifelineAudience')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {phase === 'reveal' && selectedAnswer !== null && (
              <Text style={styles.revealText}>
                {selectedAnswer === -1
                  ? tr('timeUp')
                  : selectedAnswer === currentQuestion.correctIndex
                    ? tr('correct')
                    : tr('wrong')}
              </Text>
            )}
          </View>
        )}

        {phase === 'finished' && (
          <View style={styles.overlay}>
            <ScrollView
              contentContainerStyle={styles.overlayScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <MillionairePanel width={SCREEN_W * 0.9} cut={16}>
                <Image source={LOGO} style={styles.logoSmall} resizeMode="contain" />
                <Text style={styles.overlayTitle}>
                  {finalPrize >= scoreForLevel(QUIZ_TOTAL_LEVELS)
                    ? tr('youWin')
                    : finalPrize > 0
                      ? tr('score').replace('{score}', formatLeaderboardScore(finalScore, language))
                      : tr('results')}
                </Text>
                {bestScoreMonth > 0 && (
                  <Text style={styles.bestScoreText}>
                    {tr('yourBestMonth').replace('{score}', formatLeaderboardScore(bestScoreMonth, language))}
                  </Text>
                )}
                {bestScore > 0 && (
                  <Text style={styles.bestScoreText}>
                    {tr('yourBest').replace('{score}', formatLeaderboardScore(bestScore, language))}
                  </Text>
                )}
                {saveScoreError && finalPrize > 0 && (
                  <Text style={styles.saveErrorText}>{tr('saveFailed')}</Text>
                )}

                {(monthlyLeaderboard.length > 0 || allTimeLeaderboard.length > 0) && (
                  <View style={styles.leaderboard}>
                    <GameDualLeaderboard
                      monthly={monthlyLeaderboard}
                      allTime={allTimeLeaderboard}
                      formatScore={formatQuizScore}
                      labels={leaderboardLabels}
                      introLimit={10}
                      titleStyle={styles.lbTitle}
                      cardStyle={styles.lbCard}
                      rowStyle={styles.lbRow}
                      rankStyle={styles.lbRank}
                      nameStyle={styles.lbName}
                      scoreStyle={styles.lbScore}
                    />
                  </View>
                )}

                <MillionaireButton onPress={() => void startGame()}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>{tr('playAgain')}</Text>
                </MillionaireButton>
                <MillionaireButton variant="secondary" onPress={onClose}>
                  <Text style={styles.secondaryBtnText}>{tr('close')}</Text>
                </MillionaireButton>
              </MillionairePanel>
            </ScrollView>
          </View>
        )}
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050818' },
  rootOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 24, 0.72)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 20,
    elevation: 20,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  headerBtnText: {
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 12,
  },
  headerSpacer: { flex: 1 },
  headerIconBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 8,
    zIndex: 21,
    elevation: 21,
  },
  introScroll: { flex: 1, zIndex: 2 },
  introWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  introLogo: {
    width: SCREEN_W * 0.78,
    height: SCREEN_H * 0.28,
    opacity: 0.88,
    marginBottom: 8,
  },
  rulesLine: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 12,
    color: '#9a8ac8',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 17,
  },
  introStartBtn: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    marginBottom: 20,
  },
  introStartBtnText: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 20,
  },
  introLb: { width: '100%', marginBottom: 12 },
  introBest: {
    color: '#c8b8ff',
    fontFamily: 'Gilroy-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  timerText: {
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 13,
  },
  timerUrgent: { color: '#fa2f40' },
  logoSmall: { width: 120, height: 120, marginBottom: 8 },
  title: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 22,
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 15,
    color: '#c8b8ff',
    textAlign: 'center',
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6b21a8',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#ffd700',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#aaa',
    fontFamily: 'Gilroy-Regular',
    fontSize: 15,
  },
  gameWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 2,
  },
  ladderScroll: { maxHeight: 56, marginBottom: 10 },
  ladderRow: { gap: 8, paddingVertical: 4 },
  ladderItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    minWidth: 88,
  },
  ladderItemActive: {
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderColor: '#ffd700',
  },
  ladderItemPassed: {
    opacity: 0.55,
  },
  ladderLevel: {
    color: '#aaa',
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  ladderValue: {
    color: '#ffd700',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  questionMeta: {
    color: '#aaa',
    fontFamily: 'Gilroy-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  currentPrize: {
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  questionBox: {
    backgroundColor: 'rgba(26, 10, 62, 0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffd700',
    padding: 18,
    marginBottom: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  questionText: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
  },
  answers: { gap: 10 },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 27, 74, 0.92)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4c3d99',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    minHeight: 56,
  },
  answerSelected: {
    borderColor: '#ffd700',
    backgroundColor: 'rgba(107, 33, 168, 0.5)',
  },
  answerCorrect: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  answerWrong: {
    borderColor: '#fa2f40',
    backgroundColor: 'rgba(250, 47, 64, 0.25)',
  },
  answerLabelWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffd700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerLabelText: {
    color: '#1a0a3e',
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
  },
  answerTextWrap: { flex: 1 },
  answerText: {
    color: '#fff',
    fontFamily: 'Gilroy-Regular',
    fontSize: 15,
  },
  audienceBarTrack: {
    marginTop: 6,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  audienceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.45)',
    borderRadius: 8,
  },
  audiencePct: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
  },
  coachBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(107, 33, 168, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachHintText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#c8b8ff',
    fontFamily: 'Gilroy-Regular',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  lifelinesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  lifelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  lifelineUsed: { opacity: 0.35 },
  lifelineText: {
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
  },
  revealText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 3,
  },
  overlayScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  overlayTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#ffd700',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 6,
  },
  bestScoreText: {
    fontFamily: 'Gilroy-Regular',
    color: '#aaa',
    fontSize: 14,
    marginBottom: 12,
  },
  saveErrorText: {
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  leaderboard: { width: '100%', marginBottom: 12 },
  lbTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  lbCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 8,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  lbRank: { width: 28, textAlign: 'center', fontSize: 14 },
  lbAvatar: { width: 28, height: 28, borderRadius: 14 },
  lbAvatarPlaceholder: { backgroundColor: '#2a2430' },
  lbName: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Gilroy-Regular',
    fontSize: 14,
  },
  lbScore: {
    color: '#ffd700',
    fontFamily: 'Gilroy-Bold',
    fontSize: 13,
  },
});
