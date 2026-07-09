// Обновляет ключи search.topByPoints / topBySV / shareRating* во всех локалях
const fs = require('fs');
const path = require('path');

const updates = {
  en: {
    topByPoints: 'Top by points',
    topBySV: 'Top by SV%',
    shareRating: 'Share rating',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'points',
  },
  ru: {
    topByPoints: 'Топ по очкам',
    topBySV: 'Топ по SV%',
    shareRating: 'Поделиться рейтингом',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'очков',
  },
  de: {
    topByPoints: 'Top nach Punkten',
    topBySV: 'Top nach SV%',
    shareRating: 'Ranking teilen',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'Punkte',
  },
  fr: {
    topByPoints: 'Top aux points',
    topBySV: 'Top SV %',
    shareRating: 'Partager le classement',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'points',
  },
  it: {
    topByPoints: 'Top per punti',
    topBySV: 'Top SV%',
    shareRating: 'Condividi classifica',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'punti',
  },
  cs: {
    topByPoints: 'Top podle bodů',
    topBySV: 'Top podle SV%',
    shareRating: 'Sdílet žebříček',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'bodů',
  },
  sk: {
    topByPoints: 'Top podľa bodov',
    topBySV: 'Top podľa SV%',
    shareRating: 'Zdieľať rebríček',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'bodov',
  },
  pl: {
    topByPoints: 'Top według punktów',
    topBySV: 'Top SV%',
    shareRating: 'Udostępnij ranking',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'punktów',
  },
  fi: {
    topByPoints: 'Top pisteissä',
    topBySV: 'Top SV%',
    shareRating: 'Jaa ranking',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'pistettä',
  },
  sv: {
    topByPoints: 'Top efter poäng',
    topBySV: 'Top SV%',
    shareRating: 'Dela ranking',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'poäng',
  },
  lt: {
    topByPoints: 'Top pagal taškus',
    topBySV: 'Top SV%',
    shareRating: 'Dalintis reitingu',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'taškų',
  },
  lv: {
    topByPoints: 'Top pēc punktiem',
    topBySV: 'Top SV%',
    shareRating: 'Dalīties ar reitingu',
    shareRatingFooter: 'hockey-stars.com',
    ratingPointsLabel: 'punktu',
  },
};

const localesDir = path.join(__dirname, '..', 'locales');
for (const [lang, keys] of Object.entries(updates)) {
  const file = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.search) data.search = {};
  Object.assign(data.search, keys);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${lang}: ok`);
}
