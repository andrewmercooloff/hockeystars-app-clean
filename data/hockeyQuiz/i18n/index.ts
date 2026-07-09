import type { Language } from '../../../contexts/LanguageContext';

export type QuizI18nEntry = {
  question: string;
  options: [string, string, string, string];
};

export type QuizI18nBundle = Record<string, QuizI18nEntry>;

const bundles: Partial<Record<Language, QuizI18nBundle>> = {};

function loadBundle(lang: Language): QuizI18nBundle {
  switch (lang) {
    case 'en':
      return require('./en.json');
    case 'ru':
      return require('./ru.json');
    case 'lt':
      return require('./lt.json');
    case 'lv':
      return require('./lv.json');
    case 'pl':
      return require('./pl.json');
    case 'sv':
      return require('./sv.json');
    case 'cs':
      return require('./cs.json');
    case 'sk':
      return require('./sk.json');
    case 'fi':
      return require('./fi.json');
    case 'it':
      return require('./it.json');
    case 'de':
      return require('./de.json');
    case 'fr':
      return require('./fr.json');
    default:
      return require('./en.json');
  }
}

export function getQuizI18nForLang(lang: Language): QuizI18nBundle {
  if (!bundles[lang]) {
    try {
      bundles[lang] = loadBundle(lang);
    } catch {
      bundles[lang] = loadBundle('en');
    }
  }
  return bundles[lang]!;
}
