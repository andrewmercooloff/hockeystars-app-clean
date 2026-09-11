import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export function parseShopAddresses(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n|;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinShopAddresses(list: string[]): string {
  return list.map((s) => s.trim()).filter(Boolean).join('\n');
}

type ShopLocationMapProps = {
  address?: string;
  addresses?: string[];
  city?: string;
  height?: number;
};

/** Leaflet и стили лежат на нашем сайте; для web — тот же origin, для WebView — абсолютно. */
const MAP_ASSETS_ORIGIN = 'https://hockey-stars.com';
const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist';

/** Dark Leaflet map without OSM/Leaflet chrome; fits all markers. */
export default function ShopLocationMap({
  address,
  addresses,
  city,
  height = 320,
}: ShopLocationMapProps) {
  const list = useMemo(() => {
    if (addresses && addresses.length) {
      return addresses.map((a) => a.trim()).filter(Boolean);
    }
    return parseShopAddresses(address);
  }, [address, addresses]);

  const stableKey = useMemo(
    () => JSON.stringify({ list, city: String(city || '').trim() }),
    [list, city]
  );
  const [stablePayload, setStablePayload] = useState(stableKey);

  useEffect(() => {
    if (stableKey === stablePayload) return;
    const timer = setTimeout(() => setStablePayload(stableKey), 700);
    return () => clearTimeout(timer);
  }, [stableKey, stablePayload]);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(stablePayload) as { list: string[]; city: string };
    } catch {
      return { list: [] as string[], city: '' };
    }
  }, [stablePayload]);

  const cartoApiKey = process.env.EXPO_PUBLIC_CARTO_API_KEY?.trim() || '';

  const html = useMemo(
    () => buildMapHtml(parsed.list, parsed.city, cartoApiKey),
    [parsed.list, parsed.city, cartoApiKey]
  );

  if (!parsed.list.length) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, { height }]}>
        {/* @ts-expect-error iframe is valid on RN web */}
        <iframe
          key={stablePayload}
          srcDoc={html}
          width="100%"
          height={height}
          style={{ border: 0, borderRadius: 12 }}
          title="location-map"
        />
      </View>
    );
  }

  return (
    <WebView
      key={stablePayload}
      // baseUrl: без него относительные ссылки внутри HTML (и Referer для геокодера)
      // резолвятся от about:blank — Leaflet не загружался, карта была пустой.
      source={{ html, baseUrl: `${MAP_ASSETS_ORIGIN}/` }}
      style={[styles.map, { height }]}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scalesPageToFit
      originWhitelist={['*']}
      mixedContentMode="always"
    />
  );
}

function buildMapHtml(addresses: string[], city: string, cartoApiKey: string): string {
  const addressesJson = JSON.stringify(addresses);
  const cityJson = JSON.stringify(city || '');
  const hasCartoKey = Boolean(cartoApiKey);
  const cartoKeyParam = hasCartoKey ? `?key=${encodeURIComponent(cartoApiKey)}` : '';
  const cartoTileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png${cartoKeyParam}`;
  const mapLibreScripts = hasCartoKey
    ? ''
    : `
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.20/leaflet-maplibre-gl.js"></script>`;
  const basemapInit = hasCartoKey
    ? `L.tileLayer(${JSON.stringify(cartoTileUrl)}, {
        attribution: '',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);`
    : `L.maplibreGL({
        style: 'https://tiles.openfreemap.org/styles/dark'
      }).addTo(map);`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; background: #0b0b0f; }
    #map { width: 100%; height: 100vh; }
    .leaflet-control-attribution,
    .leaflet-control-attribution *,
    .leaflet-attribution-flag,
    a.leaflet-attribution-flag,
    .leaflet-bottom.leaflet-right {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }
  </style>
  <link rel="stylesheet" href="${MAP_ASSETS_ORIGIN}/vendor/leaflet/leaflet.css" />
  <script src="${MAP_ASSETS_ORIGIN}/vendor/leaflet/leaflet.js"></script>
  <script>
    if (typeof L === 'undefined') {
      document.write('<link rel="stylesheet" href="${LEAFLET_CDN}/leaflet.css" />');
      document.write('<script src="${LEAFLET_CDN}/leaflet.js"><\\/script>');
    }
  </script>${mapLibreScripts}
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      if (typeof L === 'undefined') return;
      var addresses = ${addressesJson};
      var city = ${cityJson};
      var map = L.map('map', {
        attributionControl: false,
        zoomControl: true
      }).setView([59.93, 30.33], 11);

      ${basemapInit}

      function queryFor(addr) {
        if (city && addr.toLowerCase().indexOf(city.toLowerCase()) === -1) {
          return addr + ', ' + city;
        }
        return addr;
      }

      function placeMarker(lat, lon) {
        L.circleMarker([lat, lon], {
          radius: 11,
          color: '#fa2f40',
          weight: 2,
          fillColor: '#fa2f40',
          fillOpacity: 0.92
        }).addTo(map);
      }

      if (!addresses || !addresses.length) return;

      var points = [];
      var chain = Promise.resolve();
      addresses.forEach(function (addr, idx) {
        chain = chain.then(function () {
          var q = queryFor(addr);
          return fetch(
            'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q),
            { headers: { 'Accept-Language': 'ru,en' } }
          )
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              }
              throw new Error('empty');
            })
            .catch(function () {
              return fetch('https://photon.komoot.io/api/?limit=1&lang=en&q=' + encodeURIComponent(q))
                .then(function (r) { return r.json(); })
                .then(function (data) {
                  var f = data && data.features && data.features[0];
                  if (!f) return null;
                  return [f.geometry.coordinates[1], f.geometry.coordinates[0]];
                })
                .catch(function () { return null; });
            })
            .then(function (pt) {
              if (pt) {
                points.push(pt);
                placeMarker(pt[0], pt[1]);
              }
            })
            .then(function () {
              return new Promise(function (resolve) {
                setTimeout(resolve, idx === addresses.length - 1 ? 0 : 350);
              });
            });
        });
      });

      chain.then(function () {
        if (points.length === 1) {
          map.setView(points[0], 14);
        } else if (points.length > 1) {
          map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
        }
      });
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0b0b0f',
  },
});
