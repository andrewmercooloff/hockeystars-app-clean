import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Starts player bootstrap fetch before React/JS bundle parses (profile deep links). */
const PLAYER_BOOTSTRAP_EARLY = `
(function () {
  try {
    var path = location.pathname || '';
    var m = path.match(/\\/(?:ru|en|lt|lv|pl|sv|cs|sk|fi|it|de|fr)\\/player\\/([^\\/?#]+)/i) || path.match(/\\/player\\/([^\\/?#]+)/i);
    if (!m || !m[1]) return;
    var slug = decodeURIComponent(m[1]);
    window.__HS_PLAYER_BOOTSTRAP_SLUG__ = slug;
    window.__HS_PLAYER_BOOTSTRAP__ = fetch('/player-bootstrap.php?id=' + encodeURIComponent(slug), {
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).catch(function () { return null; });
  } catch (e) {}
})();
`;

/** Yandex.Metrika — load after first paint so SPA cold start stays fast. */
const YANDEX_METRIKA = `
(function () {
  function boot() {
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=105715227', 'ym');
    ym(105715227, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true
    });
  }
  if (document.readyState === 'complete') {
    setTimeout(boot, 1200);
  } else {
    window.addEventListener('load', function () { setTimeout(boot, 1200); });
  }
})();
`;

/** Base HTML shell for Expo Web. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="HockeyStars — social network for hockey players. Profiles, stats, scouts, games."
        />
        <meta name="theme-color" content="#050008" />
        <meta name="msapplication-TileColor" content="#050008" />
        <meta name="apple-mobile-web-app-title" content="HockeyStars" />
        <meta name="application-name" content="HockeyStars" />
        <title>Хоккейное приложение Hockeystars</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://api.hockey-stars.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.hockey-stars.com" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <ScrollViewStyleReset />
        <style>{`
          html, body, #root {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #050008;
          }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: PLAYER_BOOTSTRAP_EARLY }} />
        <script dangerouslySetInnerHTML={{ __html: YANDEX_METRIKA }} />
      </head>
      <body style={{ backgroundColor: '#050008', margin: 0, padding: 0 }}>
        {children}
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/105715227"
              style={{ position: 'absolute', left: -9999 }}
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}
