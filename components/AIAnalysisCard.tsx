import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../contexts/LanguageContext';

const SCREEN_W = Dimensions.get('window').width;
const EXPORT_W = Math.min(SCREEN_W, 390);
const logo = require('../assets/images/splash-icon.png');

/** Detect if a line is a section heading (## , ### , # , **Bold line**, etc.) */
function isHeadingLine(line: string): boolean {
  const t = line.trimStart();
  if (/^#{1,3}\s/.test(t)) return true;
  if (/^\*\*#{1,3}\s/.test(t)) return true;
  if (/^\*\*[^*]{3,}\*\*\s*$/.test(t)) return true;
  return false;
}

/** Collapsed preview: first substantive paragraph only (skip standalone headings). */
function getPreviewParagraph(text: string): string {
  if (!text) return '';
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return text;
  for (const block of blocks) {
    if (block.replace(/\s/g, '').length < 12) continue;
    if (isHeadingLine(block)) continue;
    return block;
  }
  return blocks[0];
}

function looksLikeCompleteTranslation(sourceText: string, translation: string | null | undefined): boolean {
  if (!translation) return false;
  if (!sourceText) return true;
  return translation.length >= sourceText.length * 0.75;
}

export interface AIAnalysis {
  text: string;
  generated_at: string;
  is_public: boolean;
  translations: Record<string, string>;
  has_video_analysis?: boolean;
  generation_language?: string;
}

// Inline translations for all 12 app languages
const i18n: Record<string, Record<string, string>> = {
  title:            { en: 'Scout Report', ru: 'Скаутский отчет', de: 'Scout-Bericht', fr: 'Rapport scout', it: 'Rapporto scout', pl: 'Raport skauta', sv: 'Scoutrapport', cs: 'Skautská zpráva', sk: 'Skautská správa', fi: 'Tiedusteluraportti', lv: 'Skauta ziņojums', lt: 'Skauto ataskaita' },
  usageLeft:        { en: 'left this month', ru: 'осталось в этом месяце', de: 'verbleibend diesen Monat', fr: 'restants ce mois-ci', it: 'rimasti questo mese', pl: 'pozostało w tym miesiącu', sv: 'kvar denna månad', cs: 'zbývá tento měsíc', sk: 'zostáva tento mesiac', fi: 'jäljellä tässä kuussa', lv: 'atlikuši šomēnes', lt: 'liko šį mėnesį' },
  noAnalysis:       { en: 'No report yet', ru: 'Скаутский отчет ещё не создан', de: 'Noch kein Scout-Bericht', fr: 'Pas encore de rapport scout', it: 'Nessun rapporto scout ancora', pl: 'Brak raportu skauta', sv: 'Ingen scoutrapport ännu', cs: 'Zatím žádná skautská zpráva', sk: 'Zatiaľ žiadna skautská správa', fi: 'Ei tiedusteluraporttia vielä', lv: 'Skauta ziņojuma vēl nav', lt: 'Skauto ataskaitos dar nėra' },
  noAnalysisSub:    { en: 'Get a real AI-powered scouting report based on your stats and game footage', ru: 'Получите настоящий скаутский отчет на основе ваших данных и видеозаписей игр', de: 'Erhalten Sie einen echten KI-gestützten Scout-Bericht', fr: 'Obtenez un vrai rapport de scout alimenté par IA', it: 'Ottieni un vero report di scouting basato sull\'IA', pl: 'Uzyskaj prawdziwy raport scoutingowy AI', sv: 'Få en riktig AI-driven scoutrapport', cs: 'Získejte skutečnou AI skautskou zprávu', sk: 'Získajte skutočnú AI skautskú správu', fi: 'Hanki todellinen AI-pohjainen skauttianalyysi', lv: 'Iegūstiet īstu AI skautu pārskatu', lt: 'Gaukite tikrą AI žvalgybos ataskaitą' },
  generate:         { en: 'Create Scout Report', ru: 'Создать скаутский отчет', de: 'Scout-Bericht erstellen', fr: 'Créer rapport scout', it: 'Crea rapporto scout', pl: 'Utwórz raport skauta', sv: 'Skapa scoutrapport', cs: 'Vytvořit skautskou zprávu', sk: 'Vytvoriť skautskú správu', fi: 'Luo tiedusteluraportti', lv: 'Izveidot skauta ziņojumu', lt: 'Sukurti skauto ataskaitą' },
  regenerate:       { en: 'Update Report', ru: 'Обновить отчет', de: 'Scout-Bericht aktualisieren', fr: 'Mettre à jour le rapport', it: 'Aggiorna rapporto', pl: 'Zaktualizuj raport', sv: 'Uppdatera rapport', cs: 'Aktualizovat zprávu', sk: 'Aktualizovať správu', fi: 'Päivitä raportti', lv: 'Atjaunināt ziņojumu', lt: 'Atnaujinti ataskaitą' },
  generating:       { en: 'Generating... (~15 sec)', ru: 'Генерируем скаутский отчет...', de: 'Wird generiert...', fr: 'Génération...', it: 'Generazione...', pl: 'Generowanie...', sv: 'Genererar...', cs: 'Generování...', sk: 'Generovanie...', fi: 'Luodaan...', lv: 'Ģenerē...', lt: 'Generuojama...' },
  limitReached:     { en: 'Limit reached (resets next month)', ru: 'Лимит исчерпан (обновится в след. месяце)', de: 'Limit erreicht (nächsten Monat zurückgesetzt)', fr: 'Limite atteinte (réinitialisée le mois prochain)', it: 'Limite raggiunto (si resetta il mese prossimo)', pl: 'Limit osiągnięty (reset w przyszłym miesiącu)', sv: 'Gräns nådd (återställs nästa månad)', cs: 'Limit dosažen (resetuje se příští měsíc)', sk: 'Limit dosiahnutý (resetuje sa budúci mesiac)', fi: 'Raja saavutettu (nollautuu ensi kuussa)', lv: 'Limits sasniegts (atjauno nākamajā mēnesī)', lt: 'Limitas pasiektas (atsinaujins kitą mėnesį)' },
  completeProfile:  { en: 'Complete profile to unlock', ru: 'Заполните профиль для разблокировки', de: 'Profil vervollständigen zum Entsperren', fr: 'Compléter le profil pour déverrouiller', it: 'Completa il profilo per sbloccare', pl: 'Uzupełnij profil, aby odblokować', sv: 'Slutför profilen för att låsa upp', cs: 'Dokončete profil pro odemknutí', sk: 'Dokončite profil na odomknutie', fi: 'Täydennä profiili avataksesi', lv: 'Aizpildiet profilu, lai atbloķētu', lt: 'Užpildykite profilį norėdami atrakinti' },
  translate:        { en: 'Translate', ru: 'Перевести', de: 'Übersetzen', fr: 'Traduire', it: 'Traduci', pl: 'Przetłumacz', sv: 'Översätt', cs: 'Přeložit', sk: 'Preložiť', fi: 'Käännä', lv: 'Tulkot', lt: 'Versti' },
  showOriginal:     { en: 'Original', ru: 'Оригинал', de: 'Original', fr: 'Original', it: 'Originale', pl: 'Oryginał', sv: 'Original', cs: 'Originál', sk: 'Originál', fi: 'Alkuperäinen', lv: 'Oriģināls', lt: 'Originalas' },
  showRussian:      { en: 'Russian', ru: 'Русский', de: 'Russisch', fr: 'Russe', it: 'Russo', pl: 'Rosyjski', sv: 'Ryska', cs: 'Ruština', sk: 'Ruština', fi: 'Venäjä', lv: 'Krievu', lt: 'Rusų' },
  showEnglish:      { en: 'English', ru: 'Английский', de: 'Englisch', fr: 'Anglais', it: 'Inglese', pl: 'Angielski', sv: 'Engelska', cs: 'Angličtina', sk: 'Angličtina', fi: 'Englanti', lv: 'Angļu', lt: 'Anglų' },
  save:             { en: 'Share', ru: 'Поделиться', de: 'Teilen', fr: 'Partager', it: 'Condividi', pl: 'Udostępnij', sv: 'Dela', cs: 'Sdílet', sk: 'Zdieľať', fi: 'Jaa', lv: 'Dalīties', lt: 'Dalintis' },
  readMore:         { en: 'Read full report', ru: 'Читать полный отчет', de: 'Vollständigen Scout-Bericht lesen', fr: 'Lire le rapport complet', it: 'Leggi rapporto completo', pl: 'Czytaj pełny raport', sv: 'Läs fullständig rapport', cs: 'Číst celou zprávu', sk: 'Čítať celú správu', fi: 'Lue koko raportti', lv: 'Lasīt pilnu ziņojumu', lt: 'Skaityti visą ataskaitą' },
  readLess:         { en: 'Collapse', ru: 'Свернуть', de: 'Einklappen', fr: 'Réduire', it: 'Comprimi', pl: 'Zwiń', sv: 'Dölj', cs: 'Sbalit', sk: 'Zbaliť', fi: 'Tiivistä', lv: 'Sakļaut', lt: 'Sutraukti' },
  visPublic:        { en: 'Visible to everyone', ru: 'Виден всем', de: 'Für alle sichtbar', fr: 'Visible par tous', it: 'Visibile a tutti', pl: 'Widoczny dla wszystkich', sv: 'Synlig för alla', cs: 'Viditelný pro všechny', sk: 'Viditeľný pre všetkých', fi: 'Näkyvissä kaikille', lv: 'Redzams visiem', lt: 'Matomas visiems' },
  visPrivate:       { en: 'Only visible to me', ru: 'Только для меня', de: 'Nur für mich sichtbar', fr: 'Visible uniquement par moi', it: 'Visibile solo a me', pl: 'Widoczny tylko dla mnie', sv: 'Synlig bara för mig', cs: 'Viditelný pouze pro mě', sk: 'Viditeľný iba pre mňa', fi: 'Näkyvissä vain minulle', lv: 'Redzams tikai man', lt: 'Matomas tik man' },
  gameVideos:       { en: 'Game Videos for AI', ru: 'Видео игр для ИИ-анализа', de: 'Spielvideos für KI', fr: 'Vidéos de jeu pour IA', it: 'Video di gioco per IA', pl: 'Filmy z gier dla AI', sv: 'Matchvideor för AI', cs: 'Herní videa pro AI', sk: 'Herné videá pre AI', fi: 'Pelivideot AI:lle', lv: 'Spēļu video AI', lt: 'Žaidimų vaizdo įrašai AI' },
  videosInstructions: {
    en: 'To get the best scout report, edit a highlight reel of your games (up to 5 minutes) against strong opponents where you had to work really hard, upload it to YouTube and paste the link here.',
    ru: 'Чтобы получить самый качественный скаутский отчет, сделай нарезку своих игр (до 5 минут) с сильными соперниками, где пришлось очень хорошо поработать, загрузи это видео на YouTube и вставь ссылку сюда.',
    de: 'Für den besten Scout-Bericht schneide deine Spielhighlights (bis zu 5 Minuten) gegen starke Gegner, bei denen du hart arbeiten musstest, lade das Video auf YouTube hoch und füge den Link hier ein.',
    fr: 'Pour le meilleur rapport scout, montez un résumé de vos matchs (jusqu\'à 5 minutes) contre des adversaires forts où vous avez dû vraiment travailler dur, téléchargez sur YouTube et collez le lien ici.',
    it: 'Per il miglior rapporto scout, monta una raccolta delle tue partite (fino a 5 minuti) contro avversari forti dove hai dovuto davvero lavorare sodo, caricala su YouTube e incolla il link qui.',
    pl: 'Aby uzyskać najlepszy raport skauta, zmontuj skrót swoich meczów (do 5 minut) z silnymi przeciwnikami, gdzie musiałeś naprawdę ciężko pracować, prześlij na YouTube i wklej link tutaj.',
    sv: 'För den bästa scoutrapporten, redigera ett höjdpunktsklipp från dina matcher (upp till 5 minuter) mot starka motståndare där du verkligen fick kämpa, ladda upp till YouTube och klistra in länken här.',
    cs: 'Pro nejlepší skautskou zprávu sestříhej záběry ze svých zápasů (do 5 minut) proti silným soupeřům, kde jsi musel opravdu tvrdě pracovat, nahraj na YouTube a vlož odkaz sem.',
    sk: 'Pre najlepšiu skautskú správu zostrihaj záznamy svojich zápasov (do 5 minút) proti silným súperom, kde si musel naozaj tvrdo pracovať, nahraj na YouTube a vlož odkaz sem.',
    fi: 'Parhaan tiedusteluraportin saamiseksi leikkaa koostevideo peleistäsi (enintään 5 minuuttia) vahvoja vastustajia vastaan, joissa sinun piti todella ponnistella, lataa YouTube-palveluun ja liitä linkki tähän.',
    lv: 'Lai iegūtu vislabāko skauta ziņojumu, sagatavo savas spēļu labāko mirkļu izlasi (līdz 5 minūtēm) pret stipriem pretiniekiem, kur bija ļoti smagi jāstrādā, augšupielādē YouTube un ielīmē saiti šeit.',
    lt: 'Norėdamas gauti geriausią skauto ataskaitą, sumontuok savo žaidimų akcentų įrašą (iki 5 minučių) prieš stiprius varžovus, kur reikėjo labai sunkiai dirbti, įkelk į YouTube ir įklijuok nuorodą čia.',
  },
  videoPlaceholder: { en: 'https://youtube.com/watch?v=...', ru: 'https://youtube.com/watch?v=...', de: 'https://youtube.com/watch?v=...', fr: 'https://youtube.com/watch?v=...', it: 'https://youtube.com/watch?v=...', pl: 'https://youtube.com/watch?v=...', sv: 'https://youtube.com/watch?v=...', cs: 'https://youtube.com/watch?v=...', sk: 'https://youtube.com/watch?v=...', fi: 'https://youtube.com/watch?v=...', lv: 'https://youtube.com/watch?v=...', lt: 'https://youtube.com/watch?v=...' },
  videoHint:        { en: 'One highlight reel • Up to 5 min • Public YouTube only', ru: 'Одна нарезка • До 5 минут • Только публичный YouTube', de: 'Ein Highlight-Video • Bis zu 5 Min. • Nur öffentliches YouTube', fr: 'Un montage • Max 5 min • YouTube public uniquement', it: 'Un video highlights • Max 5 min • Solo YouTube pubblico', pl: 'Jeden skrót • Do 5 min • Tylko publiczny YouTube', sv: 'Ett höjdpunktsklipp • Max 5 min • Endast offentlig YouTube', cs: 'Jeden sestřih • Max 5 min • Pouze veřejné YouTube', sk: 'Jeden zostrih • Max 5 min • Iba verejné YouTube', fi: 'Yksi koostevideo • Max 5 min • Vain julkinen YouTube', lv: 'Viena spilgtāko mirkļu izlase • Max 5 min • Tikai publisks YouTube', lt: 'Vienas akcentų įrašas • Iki 5 min • Tik viešas YouTube' },
  cancel:           { en: 'Cancel', ru: 'Отмена', de: 'Abbrechen', fr: 'Annuler', it: 'Annulla', pl: 'Anuluj', sv: 'Avbryt', cs: 'Zrušit', sk: 'Zrušiť', fi: 'Peruuta', lv: 'Atcelt', lt: 'Atšaukti' },
  missingTitle:     { en: 'Complete Your Profile First', ru: 'Сначала заполните профиль', de: 'Zuerst Profil vervollständigen', fr: 'Complétez d\'abord votre profil', it: 'Completa prima il tuo profilo', pl: 'Najpierw uzupełnij profil', sv: 'Slutför din profil först', cs: 'Nejprve dokončete profil', sk: 'Najprv dokončite profil', fi: 'Täydennä profiilisi ensin', lv: 'Vispirms aizpildiet profilu', lt: 'Pirmiausia užpildykite profilį' },
  missingSubtitle:  { en: 'Fill in these fields to unlock Scout Report:', ru: 'Заполните эти поля для разблокировки скаутского отчета:', de: 'Füllen Sie diese Felder aus, um den Scout-Bericht freizuschalten:', fr: 'Remplissez ces champs pour déverrouiller le rapport scout:', it: 'Compila questi campi per sbloccare il rapporto scout:', pl: 'Wypełnij te pola, aby odblokować raport skauta:', sv: 'Fyll i dessa fält för att låsa upp scoutrapporten:', cs: 'Vyplňte tato pole pro odemknutí skautské zprávy:', sk: 'Vyplňte tieto polia na odomknutie skautskej správy:', fi: 'Täytä nämä kentät avataksesi tiedusteluraportin:', lv: 'Aizpildiet šos laukus, lai atbloķētu skauta ziņojumu:', lt: 'Užpildykite šiuos laukus norėdami atrakinti skauto ataskaitą:' },
  gotIt:            { en: 'Got it', ru: 'Понятно', de: 'Verstanden', fr: 'Compris', it: 'Capito', pl: 'Rozumiem', sv: 'Förstått', cs: 'Rozumím', sk: 'Rozumiem', fi: 'Selvä', lv: 'Sapratu', lt: 'Supratau' },
  deleteReport:     { en: 'Delete scout report', ru: 'Удалить скаутский отчет', de: 'Scout-Bericht löschen', fr: 'Supprimer le rapport scout', it: 'Elimina rapporto scout', pl: 'Usuń raport skauta', sv: 'Ta bort scoutrapport', cs: 'Smazat skautskou zprávu', sk: 'Zmazať skautskú správu', fi: 'Poista tiedusteluraportti', lv: 'Dzēst skauta ziņojumu', lt: 'Ištrinti skauto ataskaitą' },
  deleteReportTitle: { en: 'Delete scout report?', ru: 'Удалить скаутский отчет?', de: 'Scout-Bericht löschen?', fr: 'Supprimer le rapport scout ?', it: 'Eliminare il rapporto scout?', pl: 'Usunąć raport skauta?', sv: 'Ta bort scoutrapport?', cs: 'Smazat skautskou zprávu?', sk: 'Zmazať skautskú správu?', fi: 'Poistetaanko tiedusteluraportti?', lv: 'Dzēst skauta ziņojumu?', lt: 'Ištrinti skauto ataskaitą?' },
  deleteReportMessage: { en: 'The report and all saved translations will be removed from your profile.', ru: 'Отчёт и все сохранённые переводы будут удалены из профиля.', de: 'Der Bericht und alle gespeicherten Übersetzungen werden aus deinem Profil entfernt.', fr: 'Le rapport et toutes les traductions enregistrées seront supprimés de votre profil.', it: 'Il rapporto e tutte le traduzioni salvate verranno rimossi dal profilo.', pl: 'Raport i wszystkie zapisane tłumaczenia zostaną usunięte z profilu.', sv: 'Rapporten och alla sparade översättningar tas bort från din profil.', cs: 'Zpráva a všechny uložené překlady budou z profilu odstraněny.', sk: 'Správa a všetky uložené preklady budú z profilu odstránené.', fi: 'Raportti ja kaikki tallennetut käännökset poistetaan profiilistasi.', lv: 'Ziņojums un visi saglabātie tulkojumi tiks noņemti no tava profila.', lt: 'Ataskaita ir visi išsaugoti vertimai bus pašalinti iš profilio.' },
  deleteReportConfirm: { en: 'Delete', ru: 'Удалить', de: 'Löschen', fr: 'Supprimer', it: 'Elimina', pl: 'Usuń', sv: 'Ta bort', cs: 'Smazat', sk: 'Zmazať', fi: 'Poista', lv: 'Dzēst', lt: 'Ištrinti' },
  generatedOn:      { en: 'Generated', ru: 'Создан', de: 'Erstellt', fr: 'Généré', it: 'Generato', pl: 'Wygenerowano', sv: 'Genererad', cs: 'Vygenerováno', sk: 'Vygenerované', fi: 'Luotu', lv: 'Ģenerēts', lt: 'Sukurta' },
  withVideo:        { en: '• includes video in report', ru: '• включает видео в отчет', de: '• enthält Video im Bericht', fr: '• inclut la vidéo dans le rapport', it: '• include video nel rapporto', pl: '• zawiera wideo w raporcie', sv: '• inkluderar video i rapporten', cs: '• obsahuje video ve zprávě', sk: '• obsahuje video v správe', fi: '• sisältää videon raportissa', lv: '• ietver video ziņojumā', lt: '• apima vaizdo įrašą ataskaitoje' },
  scanProfile:      { en: 'Scan to view profile', ru: 'Сканируй профиль', de: 'Profil scannen', fr: 'Scanner le profil', it: 'Scansiona profilo', pl: 'Skanuj profil', sv: 'Scanna profil', cs: 'Naskenuj profil', sk: 'Naskenuj profil', fi: 'Skannaa profiili', lv: 'Skenē profilu', lt: 'Nuskenuok profilį' },
};

interface Props {
  analysis: AIAnalysis | null;
  playerName: string;
  playerAvatar?: string;
  profileUrl: string;
  isOwner: boolean;
  usageCount: number;
  maxUsage?: number;
  onGenerate: () => void;
  onTogglePublic: (isPublic: boolean) => void;
  onTranslate: (lang: string, forceRetranslate?: boolean) => Promise<string>;
  isGenerating?: boolean;
  canGenerate: boolean;
  missingFields?: string[];
  gameVideos: string[];
  onUpdateGameVideos: (videos: string[]) => void;
  isEditing: boolean;
  /** Called when the user collapses the expanded analysis — parent scrolls to section top */
  onCollapse?: () => void;
  /** Ref to track the active input for keyboard-scroll (same pattern as [id].tsx) */
  activeInputRef?: React.MutableRefObject<any>;
  /** Owner: remove report from profile (DB); card shows confirmation first */
  onDeleteReport?: () => void | Promise<void>;
}

/** Render markdown text inline */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, idx) => {
        if (line.startsWith('## ')) {
          return <Text key={idx} style={mdStyles.h2}>{line.replace('## ', '')}</Text>;
        }
        if (line.startsWith('### ')) {
          return <Text key={idx} style={mdStyles.h3}>{line.replace('### ', '')}</Text>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s*/, '');
          return (
            <View key={idx} style={mdStyles.bulletRow}>
              <Text style={mdStyles.bullet}>•</Text>
              <Text style={mdStyles.bulletText}>{renderBold(content)}</Text>
            </View>
          );
        }
        if (line.trim() === '') return <View key={idx} style={{ height: 6 }} />;
        return <Text key={idx} style={mdStyles.paragraph}>{renderBold(line)}</Text>;
      })}
    </View>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={{ fontFamily: 'Gilroy-Bold', color: '#fff', fontSize: 13.5 }}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

/** Export should fit into a single image: no splitting. */
function splitTextForExport(text: string): string[] {
  return [text || ''];
}

export default function AIAnalysisCard({
  analysis,
  playerName,
  playerAvatar,
  profileUrl,
  isOwner,
  usageCount,
  maxUsage = 5,
  onGenerate,
  onTogglePublic,
  onTranslate,
  isGenerating = false,
  canGenerate,
  missingFields = [],
  gameVideos,
  onUpdateGameVideos,
  isEditing,
  onCollapse,
  activeInputRef,
  onDeleteReport,
}: Props) {
  const { language, t } = useLanguage();
  const tr = (key: string) => i18n[key]?.[language] || i18n[key]?.['en'] || key;

  // Russian for Russian speakers, English for everyone else
  const preferredLang = language === 'ru' ? 'ru' : 'en';
  const textRussian = analysis?.translations?.ru ?? (analysis?.generation_language === 'ru' ? analysis?.text : null);
  const textEnglish = analysis?.translations?.en ?? (analysis?.generation_language === 'en' ? analysis?.text : null);
  const originalText = analysis?.text || '';
  const russianComplete = looksLikeCompleteTranslation(originalText, textRussian);
  const englishComplete = looksLikeCompleteTranslation(originalText, textEnglish);
  const hasRussian = !!textRussian && russianComplete;
  const hasEnglish = !!textEnglish && englishComplete;

  const [showOtherLang, setShowOtherLang] = useState(false); // manual switch to non-preferred
  const [translating, setTranslating] = useState(false);

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef0 = useRef<View>(null);
  const exportRef1 = useRef<View>(null);
  const exportRef2 = useRef<View>(null);
  const exportCardRefs = [exportRef0, exportRef1, exportRef2];
  const exportFullRef = useRef<View>(null);

  const remaining = maxUsage - usageCount;
  const hasAnalysis = !!analysis?.text;

  // Auto-select: Russian for Russian UI, English for all others. Manual override via showOtherLang.
  const displayText = (() => {
    if (!hasAnalysis) return '';
    const preferred = preferredLang === 'ru' ? textRussian : textEnglish;
    const other = preferredLang === 'ru' ? textEnglish : textRussian;
    if (showOtherLang && other) return other;
    return preferred ?? analysis?.text ?? '';
  })();

  const prevGeneratingRef = useRef(isGenerating);
  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating && hasAnalysis) {
      setShowFullAnalysis(true);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, hasAnalysis]);

  // Need to fetch translation when we don't have the preferred version yet (or cached one was truncated)
  const needTranslate = hasAnalysis && preferredLang === 'ru' && (!textRussian || !russianComplete);
  const needTranslateEn = hasAnalysis && preferredLang === 'en' && (!textEnglish || !englishComplete);
  const showTranslateBtn = needTranslate || needTranslateEn;
  const showSwitchBtn = hasRussian && hasEnglish;
  const showAddOtherBtn = hasAnalysis && !showTranslateBtn && !showSwitchBtn;
  const showVideoInput = isOwner && (!hasAnalysis || isEditing || isRegenerateMode);
  const showEditFields = isOwner && (isEditing || isRegenerateMode);

  const handleTranslate = async (targetLang?: 'ru' | 'en') => {
    // onPress passes a gesture event as the 1st arg — ignore non-string values
    const lang: 'ru' | 'en' =
      targetLang === 'ru' || targetLang === 'en'
        ? targetLang
        : needTranslate
          ? 'ru'
          : 'en';
    const existing = analysis?.translations?.[lang] ?? (lang === analysis?.generation_language ? analysis?.text : null);
    const sourceText = analysis?.text || '';
    const looksComplete = looksLikeCompleteTranslation(sourceText, existing);
    if (looksComplete) return;
    setTranslating(true);
    try {
      await onTranslate(lang, !!existing && !looksComplete);
    } catch (e) {
      console.error('Translation failed:', e);
      Alert.alert(t('common.error') || 'Error', (e as Error)?.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleShare = async () => {
    if (isExporting) return;
    setIsExporting(true);

    await new Promise(r => setTimeout(r, 500));

    try {
      // Capture individual pages for gallery
      const pageUris: string[] = [];
      for (const ref of exportCardRefs) {
        if (ref.current) {
          pageUris.push(await captureRef(ref, { format: 'png', quality: 1.0, result: 'tmpfile' }));
        }
      }

      // Save individual pages to gallery
      if (pageUris.length > 0) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          for (const uri of pageUris) {
            await MediaLibrary.saveToLibraryAsync(uri);
          }
        }
      }

      // Capture full single-image card for sharing
      let shareUri = pageUris[0];
      if (exportFullRef.current) {
        shareUri = await captureRef(exportFullRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
      }

      if (shareUri) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'image/png',
            dialogTitle: tr('save'),
          });
        }
      }
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegeneratePress = () => {
    if (!canGenerate) { setShowMissingModal(true); return; }
    setIsRegenerateMode(true);
  };

  const handleConfirmGenerate = () => {
    setIsRegenerateMode(false);
    onGenerate();
  };

  const handleEditModeGenerate = () => {
    if (!canGenerate) { setShowMissingModal(true); return; }
    onGenerate();
  };

  const handleDeleteReportPress = () => {
    if (!onDeleteReport) return;
    Alert.alert(tr('deleteReportTitle'), tr('deleteReportMessage'), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('deleteReportConfirm'),
        style: 'destructive',
        onPress: () => {
          void Promise.resolve(onDeleteReport()).catch((e) => console.error('delete report:', e));
        },
      },
    ]);
  };

  const genDate = analysis?.generated_at
    ? new Date(analysis.generated_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // ---- SECTION HEADER ----
  const header = (
    <View style={styles.headerRow}>
      <Text style={styles.title}>{tr('title')}</Text>
      {isOwner && (
        <View style={styles.badge}>
          <Text style={styles.badgeCount}>{`${remaining}/${maxUsage}`}</Text>
          <Text style={styles.badgeLabel}> {tr('usageLeft')}</Text>
        </View>
      )}
    </View>
  );

  // ---- YOUTUBE LINK SECTION (single video) ----
  const currentVideo = gameVideos.length > 0 ? gameVideos[0] : '';
  const videoSection = showVideoInput ? (
    <View style={styles.videosBlock}>
      <View style={styles.videosHeaderRow}>
        <Ionicons name="logo-youtube" size={15} color="#fa2f40" />
        <Text style={styles.videosTitle}>{tr('gameVideos')}</Text>
      </View>
      <Text style={styles.videosSub}>{tr('videosInstructions')}</Text>
      <View style={styles.videoInputRow}>
        <TextInput
          style={styles.videoInput}
          value={currentVideo}
          onFocus={(e) => {
            if (activeInputRef) activeInputRef.current = e.target;
          }}
          onBlur={() => {
            if (activeInputRef) activeInputRef.current = null;
          }}
          onChangeText={(text) => {
            onUpdateGameVideos(text.trim() !== '' ? [text] : []);
          }}
          placeholder={tr('videoPlaceholder')}
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {currentVideo.trim() !== '' && (
          <TouchableOpacity onPress={() => onUpdateGameVideos([])}>
            <Ionicons name="close-circle" size={20} color="#fa2f40" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.videoHint}>{tr('videoHint')}</Text>
    </View>
  ) : null;

  // ---- PRIVACY TOGGLE ----
  const isPublic = analysis?.is_public ?? true;
  const privacySection = isOwner && (isEditing || isRegenerateMode) && hasAnalysis ? (
    <View style={styles.privacyRow}>
      <Ionicons
        name={isPublic ? 'earth-outline' : 'lock-closed-outline'}
        size={18}
        color={isPublic ? '#fa2f40' : '#888'}
      />
      <Text style={[styles.privacyText, isPublic && { color: '#fa2f40' }]}>
        {isPublic ? tr('visPublic') : tr('visPrivate')}
      </Text>
      <Switch
        value={isPublic}
        onValueChange={(val) => onTogglePublic(val)}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(250,47,64,0.5)' }}
        thumbColor={isPublic ? '#fa2f40' : '#888'}
        ios_backgroundColor="rgba(255,255,255,0.15)"
      />
    </View>
  ) : null;

  // ---- MISSING FIELDS MODAL ----
  const missingModal = (
    <Modal visible={showMissingModal} transparent animationType="slide" onRequestClose={() => setShowMissingModal(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMissingModal(false)}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{tr('missingTitle')}</Text>
          <Text style={styles.modalSubtitle}>{tr('missingSubtitle')}</Text>
          {missingFields.map((f) => (
            <View key={f} style={styles.missingRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#fa2f40" />
              <Text style={styles.missingText}>{f}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowMissingModal(false)}>
            <Text style={styles.modalCloseBtnText}>{tr('gotIt')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ---- EXPORT: multi-page cards rendered off-screen ----
  const exportParts = splitTextForExport(displayText || '');
  const totalPages = exportParts.length;

  const renderExportHeader = () => (
    <>
      <View style={expStyles.cardHeader}>
        <View style={expStyles.headerLeft}>
          {playerAvatar ? (
            <Image source={{ uri: playerAvatar }} style={expStyles.avatar} />
          ) : (
            <View style={[expStyles.avatar, expStyles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color="#888" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {(() => {
              const parts = playerName.trim().split(/\s+/);
              const firstName = parts[0] || '';
              const lastName = parts.slice(1).join(' ');
              return (
                <>
                  <Text style={expStyles.playerName}>{firstName}</Text>
                  {lastName ? <Text style={expStyles.playerName}>{lastName}</Text> : null}
                </>
              );
            })()}
            <Text style={expStyles.aiSub}>{tr('title')}</Text>
          </View>
          <QRCode value={profileUrl} size={44} color="#fff" backgroundColor="#0a0010" />
        </View>
        <Image source={logo} style={expStyles.logo} resizeMode="contain" />
      </View>
      <View style={expStyles.stripe} />
    </>
  );

  const offScreenCards = (
    <View style={expStyles.offScreen} pointerEvents="none">
      {/* Individual pages for gallery */}
      {exportParts.map((partText, idx) => (
        <View key={idx} ref={exportCardRefs[idx]} collapsable={false} style={expStyles.card}>
          {renderExportHeader()}
          <View style={expStyles.metaRow}>
            {idx === 0 && genDate && <Text style={expStyles.metaDate}>{tr('generatedOn')}: {genDate}</Text>}
            {totalPages > 1 && (
              <Text style={expStyles.metaDate}>
                {`${idx + 1}/${totalPages}`}
              </Text>
            )}
          </View>
          <View style={{ paddingHorizontal: 8, paddingBottom: 3 }}>
            <MarkdownCompact text={partText} />
          </View>
          <View style={expStyles.pageBottomBar}>
            <Text style={expStyles.watermark}>hockey-stars.com</Text>
          </View>
        </View>
      ))}

      {/* Full single card for sharing via messenger */}
      <View ref={exportFullRef} collapsable={false} style={expStyles.card}>
        {renderExportHeader()}
        <View style={expStyles.metaRow}>
          {genDate && <Text style={expStyles.metaDate}>{tr('generatedOn')}: {genDate}</Text>}
        </View>
        <View style={{ paddingHorizontal: 8, paddingBottom: 3 }}>
          <MarkdownCompact text={displayText || ''} />
        </View>
        <View style={expStyles.pageBottomBar}>
          <Text style={expStyles.watermark}>hockey-stars.com</Text>
        </View>
      </View>
    </View>
  );

  // ---- EMPTY STATE ----
  if (!hasAnalysis) {
    return (
      <View>
        {header}
        {videoSection}
        {privacySection}
        <Text style={styles.noAnalysisTitle}>{tr('noAnalysis')}</Text>
        <Text style={styles.noAnalysisSub}>{tr('noAnalysisSub')}</Text>

        {isOwner && (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (!canGenerate || remaining <= 0 || isGenerating) && styles.generateBtnDisabled,
            ]}
            onPress={() => {
              if (!canGenerate) { setShowMissingModal(true); return; }
              if (remaining > 0 && !isGenerating) onGenerate();
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={remaining <= 0 ? 'lock-closed-outline' : 'rocket-outline'}
                size={18}
                color={canGenerate && remaining > 0 ? '#fff' : '#888'}
              />
            )}
            <Text style={[styles.generateBtnText, (!canGenerate || remaining <= 0) && { color: '#888' }]}>
              {isGenerating ? tr('generating') : remaining <= 0 ? tr('limitReached') : !canGenerate ? tr('completeProfile') : tr('generate')}
            </Text>
          </TouchableOpacity>
        )}

        {missingModal}
        {offScreenCards}
      </View>
    );
  }

  // ---- HAS ANALYSIS ----
  return (
    <View>
      {header}

      {/* Date */}
      <View style={styles.metaRow}>
        {genDate && <Text style={styles.metaDate}>{tr('generatedOn')}: {genDate}</Text>}
      </View>

      {/* Analysis text — collapsed to first section, expandable */}
      <View key={showFullAnalysis ? 'full' : 'collapsed'}>
        <MarkdownText text={showFullAnalysis ? (displayText || '') : getPreviewParagraph(displayText || '')} />
      </View>

      {/* Expand / Collapse button */}
      <TouchableOpacity
        style={styles.readMoreBtn}
        activeOpacity={0.6}
        onPress={() => {
          const next = !showFullAnalysis;
          setShowFullAnalysis(next);
          if (!next) onCollapse?.();
        }}
      >
        <Text style={styles.readMoreText}>
          {showFullAnalysis ? tr('readLess') : tr('readMore')}
        </Text>
        <Ionicons
          name={showFullAnalysis ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={14}
          color="#fa2f40"
        />
      </TouchableOpacity>

      {/* Action row: Translate / Switch language + Save */}
      <View style={styles.actionsRow}>
        {showTranslateBtn && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnActive]}
            onPress={() => handleTranslate()}
            disabled={translating}
          >
            {translating
              ? <ActivityIndicator size="small" color="#fa2f40" />
              : <Ionicons name="language-outline" size={16} color="#fa2f40" />
            }
            <Text style={[styles.actionBtnText, { color: '#fa2f40' }]}>
              {tr('translate')} ({preferredLang === 'ru' ? tr('showRussian') : tr('showEnglish')})
            </Text>
          </TouchableOpacity>
        )}
        {showSwitchBtn && (
          <TouchableOpacity
            style={[styles.actionBtn, showOtherLang && styles.actionBtnActive]}
            onPress={() => setShowOtherLang(!showOtherLang)}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={showOtherLang ? '#fa2f40' : '#aaa'} />
            <Text style={[styles.actionBtnText, showOtherLang && { color: '#fa2f40' }]}>
              {showOtherLang
                ? (preferredLang === 'ru' ? tr('showRussian') : tr('showEnglish'))
                : (preferredLang === 'ru' ? tr('showEnglish') : tr('showRussian'))}
            </Text>
          </TouchableOpacity>
        )}
        {showAddOtherBtn && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleTranslate(preferredLang === 'ru' ? 'en' : 'ru')}
            disabled={translating}
          >
            {translating
              ? <ActivityIndicator size="small" color="#aaa" />
              : <Ionicons name="language-outline" size={16} color="#aaa" />
            }
            <Text style={styles.actionBtnText}>
              {tr('translate')} ({preferredLang === 'ru' ? tr('showEnglish') : tr('showRussian')})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={isExporting}>
          {isExporting
            ? <ActivityIndicator size="small" color="#aaa" />
            : <Ionicons name="share-outline" size={16} color="#aaa" />
          }
          <Text style={styles.actionBtnText}>{tr('save')}</Text>
        </TouchableOpacity>
      </View>

      {isOwner && onDeleteReport && (
        <TouchableOpacity style={styles.deleteReportRow} onPress={handleDeleteReportPress} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={17} color="#888" />
          <Text style={styles.deleteReportLabel}>{tr('deleteReport')}</Text>
        </TouchableOpacity>
      )}

      {/* Edit/regenerate fields */}
      {videoSection}
      {privacySection}

      {/* Regenerate confirm */}
      {isRegenerateMode && (
        <View style={styles.regenConfirmBlock}>
          <TouchableOpacity
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={handleConfirmGenerate}
            disabled={isGenerating}
          >
            {isGenerating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="rocket-outline" size={18} color="#fff" />
            }
            <Text style={styles.generateBtnText}>
              {isGenerating ? tr('generating') : tr('generate')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsRegenerateMode(false)}>
            <Text style={styles.cancelBtnText}>{tr('cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Update Analysis button */}
      {isOwner && !isRegenerateMode && remaining > 0 && (
        <TouchableOpacity
          style={[styles.generateBtn, { marginTop: 12 }, isGenerating && styles.generateBtnDisabled]}
          // В режиме редактирования поля видео/приватности уже раскрыты — запускаем сразу.
          onPress={isEditing ? handleEditModeGenerate : handleRegeneratePress}
          disabled={isGenerating}
        >
          {isGenerating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="refresh-outline" size={18} color="#fff" />
          }
          <Text style={styles.generateBtnText}>
            {isGenerating ? tr('generating') : `${tr('regenerate')} (${remaining})`}
          </Text>
        </TouchableOpacity>
      )}

      {isOwner && remaining <= 0 && (
        <Text style={styles.limitNote}>{tr('limitReached')}</Text>
      )}

      {missingModal}
      {offScreenCards}
    </View>
  );
}

// ─── Main styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 20,
    color: '#fa2f40',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,47,64,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeCount: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 13,
  },
  badgeLabel: {
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    fontSize: 11,
  },
  videosBlock: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(250,47,64,0.25)',
  },
  videosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  videosTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 14,
  },
  videosSub: {
    fontFamily: 'Gilroy-Regular',
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  videoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  videoInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  videoHint: {
    fontFamily: 'Gilroy-Regular',
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  privacyText: {
    fontFamily: 'Gilroy-Bold',
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  noAnalysisTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 16,
    marginBottom: 6,
  },
  noAnalysisSub: {
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  generateBtnDisabled: {
    backgroundColor: 'rgba(80,80,80,0.35)',
  },
  generateBtnText: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 15,
  },
  regenConfirmBlock: {
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: 'Gilroy-Regular',
    color: '#8a8a92',
    fontSize: 14,
  },
  limitNote: {
    fontFamily: 'Gilroy-Regular',
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  deleteReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  deleteReportLabel: {
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  metaDate: {
    fontFamily: 'Gilroy-Regular',
    color: '#8a8a92',
    fontSize: 12,
  },
  metaVideo: {
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
    fontSize: 11,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  readMoreText: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(250,47,64,0.12)',
  },
  actionBtnText: {
    fontFamily: 'Gilroy-Regular',
    color: '#aaa',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0d001a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 17,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Gilroy-Regular',
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  missingText: {
    fontFamily: 'Gilroy-Regular',
    color: '#ddd',
    fontSize: 14,
  },
  modalCloseBtn: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseBtnText: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    fontSize: 15,
  },
});


// ─── Markdown styles ─────────────────────────────────────────────────────────

const mdStyles = StyleSheet.create({
  h2: {
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    fontSize: 15,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily: 'Gilroy-Bold',
    color: '#ffffff',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    fontSize: 13.5,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  bullet: {
    color: '#fa2f40',
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
    fontFamily: 'Gilroy-Bold',
  },
  bulletText: {
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    fontSize: 13.5,
    lineHeight: 20,
    flex: 1,
  },
});

// ─── Compact markdown renderer for export card ───────────────────────────────

function renderBoldCompact(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={{ fontFamily: 'Gilroy-Bold', color: '#fff', fontSize: 9 }}>{part}</Text>
      : part
  );
}

function MarkdownCompact({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, idx) => {
        if (line.startsWith('## ')) {
          return <Text key={idx} style={cmpStyles.h2}>{line.replace('## ', '')}</Text>;
        }
        if (line.startsWith('### ')) {
          return <Text key={idx} style={cmpStyles.h3}>{line.replace('### ', '')}</Text>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <View key={idx} style={cmpStyles.bulletRow}>
              <Text style={cmpStyles.bullet}>•</Text>
              <Text style={cmpStyles.bulletText}>{renderBoldCompact(line.replace(/^[-•]\s*/, ''))}</Text>
            </View>
          );
        }
        if (line.trim() === '') return <View key={idx} style={{ height: 1 }} />;
        return <Text key={idx} style={cmpStyles.para}>{renderBoldCompact(line)}</Text>;
      })}
    </View>
  );
}

const cmpStyles = StyleSheet.create({
  h2:  { fontFamily: 'Gilroy-Bold', color: '#fa2f40', fontSize: 9.3, marginTop: 3, marginBottom: 0, letterSpacing: 0 },
  h3:  { fontFamily: 'Gilroy-Bold', color: '#fff',    fontSize: 8.8, marginTop: 2, marginBottom: 0, letterSpacing: 0 },
  para:{ fontFamily: 'Gilroy-Regular', color: '#ccc', fontSize: 8.6, lineHeight: 9, letterSpacing: 0 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0, paddingLeft: 0 },
  bullet:    { color: '#fa2f40', fontSize: 9, marginRight: 3, marginTop: 1, fontFamily: 'Gilroy-Bold' },
  bulletText:{ fontFamily: 'Gilroy-Regular', color: '#ccc', fontSize: 8.6, lineHeight: 9, flex: 1, letterSpacing: 0 },
});

// ─── Export card styles ───────────────────────────────────────────────────────

const expStyles = StyleSheet.create({
  card:   { width: EXPORT_W, backgroundColor: '#0a0010' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#0a0010',
  },
  stripe: { height: 4, backgroundColor: '#fa2f40' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: { width: 72, height: 72, borderRadius: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fa2f40' },
  avatarPlaceholder: { backgroundColor: '#1a0030', justifyContent: 'center', alignItems: 'center' },
  playerName: { fontFamily: 'Gilroy-Bold', color: '#fff', fontSize: 18 },
  aiSub:      { fontFamily: 'Gilroy-Regular', color: '#888', fontSize: 10, marginTop: 1 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2 },
  metaDate:   { fontFamily: 'Gilroy-Regular', color: '#555', fontSize: 8, letterSpacing: 0 },
  watermark:  { fontFamily: 'Gilroy-Bold', color: 'rgba(250,47,64,0.5)', fontSize: 11, letterSpacing: 0, marginBottom: 1 },
  pageBottomBar: { alignItems: 'flex-end', paddingHorizontal: 12, paddingBottom: 8, paddingTop: 3 },
  offScreen: { position: 'absolute', left: -9999, top: 0, opacity: 1 },
});

