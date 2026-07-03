import { getConfig } from '../utils/config';

export function getFlightradarConfig() {
  const config = getConfig();
  const { centerLat, centerLon, zoom } = config.modules.flightradar;
  return {
    enabled: config.modules.flightradar.enabled,
    centerLat,
    centerLon,
    zoom,
  };
}

export function getIframeUrl(lat: number, lon: number, zoom: number): string {
  return `https://www.flightradar24.com/simple_index.php?lat=${lat}&lon=${lon}&zoom=${zoom}`;
}

export function getOsmUrl(lat: number, lon: number, zoom: number): string {
  const d = 0.01 * Math.pow(2, 7 - zoom);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
}
