import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { DeviceMarker } from '../store/deviceStore';
import { Colors, Spacing } from '../utils/responsive';
import { t } from '../i18n';

let WebViewComp: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComp = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('[MapView] WebView not loaded');
  }
}

interface MapViewProps {
  devices: Record<string, DeviceMarker>;
  onSelectDevice: (device: DeviceMarker) => void;
  isOfflineMapActive: boolean;
}

export const FieldMapView: React.FC<MapViewProps> = ({
  devices,
  onSelectDevice,
  isOfflineMapActive
}) => {
  const [zoomLevel, setZoomLevel] = useState(14);
  const [mapMode, setMapMode] = useState<'google' | 'satellite' | 'terrain'>('google');
  const [center, setCenter] = useState({ lat: 11.5034, lon: 77.2444 });

  const deviceList = Object.values(devices);
  const iframeRef = useRef<any>(null);

  const googleApiKey = 'AIzaSyDLXXTKR0A-UINbSsOTuCVm8Rh2lzMinWc';

  const generateMapHtml = () => {
    const markersJson = JSON.stringify(
      deviceList.map((d) => ({
        id: d.deviceId,
        name: d.userName || d.deviceName || d.deviceId,
        lat: d.latitude,
        lon: d.longitude,
        battery: d.batteryOrValue,
        time: d.lastUpdated,
        status: d.status
      }))
    );

    const tileUrl =
      mapMode === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapMode === 'terrain'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100vh; width: 100vw; margin: 0; padding: 0; background: #121214; }
          .custom-marker {
            background: #18181B;
            border: 2px solid #22C55E;
            border-radius: 12px;
            color: #FFFFFF;
            font-family: 'Open Sans', system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            white-space: nowrap;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .custom-marker:hover { transform: scale(1.1); border-color: #F97316; }
          .marker-batt { color: #22C55E; font-size: 9px; font-weight: 700; }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: true }).setView([${center.lat}, ${center.lon}], ${zoomLevel});
          
          L.tileLayer('${tileUrl}', {
            maxZoom: 19
          }).addTo(map);

          setTimeout(function() {
            map.invalidateSize();
          }, 300);

          var markersData = ${markersJson};
          markersData.forEach(function(m) {
            var iconHtml = '<div class="custom-marker">◈ ' + m.name + ' <br/><span class="marker-batt">⚡ ' + m.battery + '%</span></div>';
            var customIcon = L.divIcon({
              className: 'leaflet-data-icon',
              html: iconHtml,
              iconSize: [80, 36],
              iconAnchor: [40, 18]
            });
            var marker = L.marker([m.lat, m.lon], { icon: customIcon }).addTo(map);
            marker.on('click', function() {
              var msg = JSON.stringify({ type: 'SELECT_DEVICE', deviceId: m.id });
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(msg);
              } else if (window.parent) {
                window.parent.postMessage(msg, '*');
              }
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'SELECT_DEVICE' && devices[data.deviceId]) {
            onSelectDevice(devices[data.deviceId]);
          }
        } catch (e) {}
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [devices]);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={generateMapHtml()}
          style={styles.webMapIframe as any}
          title="Field Map"
        />
      ) : WebViewComp ? (
        <WebViewComp
          originWhitelist={['*']}
          source={{ html: generateMapHtml() }}
          style={styles.webMapIframe}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event: any) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data && data.type === 'SELECT_DEVICE' && devices[data.deviceId]) {
                onSelectDevice(devices[data.deviceId]);
              }
            } catch (e) {}
          }}
        />
      ) : (
        <View style={styles.terrainMap}>
          <View style={styles.regionBounds}>
            <Text style={styles.regionBoundsText}>
              🗺 Sathy Region ({isOfflineMapActive ? 'OFFLINE ACTIVE' : 'ONLINE CACHE'})
            </Text>
          </View>
          {deviceList.map((dev) => (
            <TouchableOpacity
              key={dev.deviceId}
              style={[
                styles.markerContainer,
                {
                  left: `${Math.max(10, Math.min(80, ((dev.longitude - 77.22) / 0.08) * 100))}%`,
                  top: `${Math.max(15, Math.min(80, ((11.52 - dev.latitude) / 0.04) * 100))}%`
                }
              ]}
              onPress={() => onSelectDevice(dev)}
            >
              <View style={styles.markerBadge}>
                <Text style={styles.markerText}>📍 {dev.userName || dev.deviceName || dev.deviceId}</Text>
                <Text style={styles.markerSubText}>🔋 {dev.batteryOrValue}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Map Mode Selector Controls */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeBtn, mapMode === 'google' && styles.modeBtnActive]}
          onPress={() => setMapMode('google')}
        >
          <Text style={[styles.modeBtnText, mapMode === 'google' && styles.modeBtnTextActive]}>Roadmap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mapMode === 'satellite' && styles.modeBtnActive]}
          onPress={() => setMapMode('satellite')}
        >
          <Text style={[styles.modeBtnText, mapMode === 'satellite' && styles.modeBtnTextActive]}>Satellite</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mapMode === 'terrain' && styles.modeBtnActive]}
          onPress={() => setMapMode('terrain')}
        >
          <Text style={[styles.modeBtnText, mapMode === 'terrain' && styles.modeBtnTextActive]}>Terrain</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    minHeight: 500,
    backgroundColor: '#121214',
    position: 'relative'
  },
  webMapIframe: {
    width: '100%',
    height: '100%',
    flex: 1,
    borderWidth: 0
  },
  terrainMap: {
    flex: 1,
    backgroundColor: '#121214',
    position: 'relative'
  },
  regionBounds: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    elevation: 4
  },
  regionBoundsText: {
    color: '#09090B',
    fontSize: 11,
    fontWeight: '700'
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center'
  },
  markerBadge: {
    backgroundColor: '#18181B',
    paddingHorizontal: Spacing.xs + 4,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center'
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12
  },
  markerSubText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: 'bold'
  },
  modeBar: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 3,
    gap: 4,
    elevation: 4
  },
  modeBtn: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 18
  },
  modeBtnActive: {
    backgroundColor: '#18181B'
  },
  modeBtnText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700'
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  }
});
