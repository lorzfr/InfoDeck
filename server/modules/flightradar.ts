import { getConfig } from '../utils/config';

export function getFlightradarConfig() {
  const config = getConfig();
  return {
    enabled: config.modules.flightradar.enabled,
    centerLat: config.modules.flightradar.centerLat,
    centerLon: config.modules.flightradar.centerLon,
    zoom: config.modules.flightradar.zoom,
  };
}

export function getIframeUrl(lat: number, lon: number, zoom: number): string {
  return `https://www.flightradar24.com/simple_index.php?lat=${lat}&lon=${lon}&zoom=${zoom}`;
}
