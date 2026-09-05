import { useEffect } from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

import { useLanguage } from '../contexts/LanguageContext';
import {
  buildHomeSeoTitle,
  normalizeSeoLanguage,
  seoOgLocale,
  type SeoLanguage,
} from '../utils/playerSeoPath';

function setDocumentTitle(title: string) {
  if (typeof document === 'undefined') return;
  const titles = Array.from(document.head.querySelectorAll('title'));
  let keeper: HTMLTitleElement | null = titles[0] || null;
  for (const el of titles.slice(1)) el.remove();
  if (!keeper) {
    keeper = document.createElement('title');
    document.head.insertBefore(keeper, document.head.firstChild);
  }
  keeper.textContent = title;
  if (document.title !== title) document.title = title;
}

/** Sets <title> for home / feed rink pages. */
export default function HomeSeoHead() {
  const { language } = useLanguage();
  const seoLang = normalizeSeoLanguage(language) as SeoLanguage;
  const title = buildHomeSeoTitle(seoLang);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setDocumentTitle(title);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = seoLang;
      const ogLocale = seoOgLocale(seoLang);
      let el = document.head.querySelector('meta[property="og:locale"]') as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', 'og:locale');
        document.head.appendChild(el);
      }
      el.setAttribute('content', ogLocale);
    }
  }, [title, seoLang]);

  if (Platform.OS !== 'web') return null;

  return (
    <Head>
      <meta property="og:title" content={title} />
      <meta name="twitter:title" content={title} />
    </Head>
  );
}
