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

  const html = useMemo(
    () => buildMapHtml(parsed.list, parsed.city),
    [parsed.list, parsed.city]
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
      source={{ html }}
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

function buildMapHtml(addresses: string[], city: string): string {
  const addressesJson = JSON.stringify(addresses);
  const cityJson = JSON.stringify(city || '');
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
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  <script src="/vendor/leaflet/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var addresses = ${addressesJson};
      var city = ${cityJson};
      var map = L.map('map', {
        attributionControl: false,
        zoomControl: true
      }).setView([53.9, 27.6], 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

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
          return fetch(
            'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
              encodeURIComponent(queryFor(addr)),
            { headers: { 'Accept-Language': 'ru,en' } }
          )
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.length > 0) {
                var lat = parseFloat(data[0].lat);
                var lon = parseFloat(data[0].lon);
                points.push([lat, lon]);
                placeMarker(lat, lon);
              }
            })
            .catch(function () {})
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
