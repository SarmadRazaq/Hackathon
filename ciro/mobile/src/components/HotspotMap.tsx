import React, { useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export type HotspotMarker = {
  id: string;
  lat: number;
  lng: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  title: string;
  emoji?: string;
};

type HotspotMapProps = {
  markers: HotspotMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  interactive?: boolean;
  onMarkerPress?: (markerId: string) => void;
};

const DEFAULT_CENTER = { lat: 30.3753, lng: 69.3451 };

const buildHtml = (
  center: { lat: number; lng: number },
  zoom: number,
  interactive: boolean,
  initialMarkers: HotspotMarker[]
) => {
  const interactiveOpts = interactive
    ? `{ zoomControl: false, attributionControl: false }`
    : `{ zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false }`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #181B22; }
  .ciro-marker { background: transparent !important; border: none !important; }
  .leaflet-tile { filter: brightness(0.85) contrast(1.05); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous"></script>
<script>
  (function() {
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    if (typeof L === 'undefined') {
      post({ type: 'error', message: 'Leaflet failed to load from CDN' });
      return;
    }

    var SEV_COLORS = { CRITICAL: '#FF5252', HIGH: '#FF9F0A', MEDIUM: '#0A84FF', LOW: '#30D158' };
    var map = L.map('map', ${interactiveOpts}).setView([${center.lat}, ${center.lng}], ${zoom});

    var tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      crossOrigin: true,
      attribution: ''
    });
    tileLayer.on('tileerror', function(err) {
      post({ type: 'tile_error', url: err && err.tile ? err.tile.src : 'unknown' });
    });
    tileLayer.on('load', function() { post({ type: 'tiles_loaded' }); });
    tileLayer.addTo(map);

    var markerLayer = L.layerGroup().addTo(map);

    window.renderMarkers = function(json) {
      try {
        markerLayer.clearLayers();
        var arr = JSON.parse(json);
        var bounds = [];
        arr.forEach(function(m) {
          var color = SEV_COLORS[m.severity] || SEV_COLORS.MEDIUM;
          var iconHtml = m.emoji
            ? '<div style="background:#181B22;border:2px solid ' + color + ';width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 8px ' + color + '88;">' + m.emoji + '</div>'
            : '<div style="background:' + color + ';width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ' + color + ';"></div>';
          var icon = L.divIcon({
            html: iconHtml,
            className: 'ciro-marker',
            iconSize: m.emoji ? [28, 28] : [18, 18],
            iconAnchor: m.emoji ? [14, 14] : [9, 9]
          });
          var marker = L.marker([m.lat, m.lng], { icon: icon, title: m.title }).addTo(markerLayer);
          marker.on('click', function() { post({ type: 'marker_click', id: m.id }); });
          L.circle([m.lat, m.lng], {
            radius: 15000,
            color: color,
            fillColor: color,
            fillOpacity: 0.13,
            weight: 1,
            opacity: 0.35,
            interactive: false
          }).addTo(markerLayer);
          bounds.push([m.lat, m.lng]);
        });
        if (bounds.length > 1) {
          try { map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 }); } catch (e) {}
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 9);
        }
      } catch (e) {
        post({ type: 'error', message: String(e) });
      }
    };

    window.renderMarkers(${JSON.stringify(JSON.stringify(initialMarkers))});
    post({ type: 'ready' });
  })();
</script>
</body>
</html>`;
};

export default function HotspotMap({
  markers,
  center = DEFAULT_CENTER,
  zoom = 6,
  height = 280,
  interactive = true,
  onMarkerPress,
}: HotspotMapProps) {
  const webRef = useRef<WebView>(null);

  const html = useMemo(
    () => buildHtml(center, zoom, interactive, markers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center.lat, center.lng, zoom, interactive]
  );

  const markersJson = useMemo(() => JSON.stringify(markers), [markers]);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        webRef.current?.injectJavaScript(`window.renderMarkers(${JSON.stringify(markersJson)}); true;`);
      } else if (msg.type === "marker_click" && onMarkerPress) {
        onMarkerPress(String(msg.id));
      } else if (msg.type === "tile_error") {
        console.warn("[HotspotMap] tile error:", msg.url);
      } else if (msg.type === "error") {
        console.warn("[HotspotMap] error:", msg.message);
      }
    } catch {}
  };

  React.useEffect(() => {
    webRef.current?.injectJavaScript(
      `if (window.renderMarkers) { window.renderMarkers(${JSON.stringify(markersJson)}); } true;`
    );
  }, [markersJson]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://localhost" }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={onMessage}
        style={styles.web}
        scrollEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#384152aa",
    backgroundColor: "#181B22",
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
