import { getConfig, type ServiceEntry } from '../utils/config';

interface ServiceStatus {
  name: string;
  publicUrl: string;
  lanUrl: string;
  icon: string;
  publicHttpCode: string;
  publicLatency: string;
  publicReachable: boolean;
  lanHttpCode: string;
  lanLatency: string;
  lanReachable: boolean;
  status: 'online' | 'degraded' | 'offline';
  lastChecked: number;
}

let cache: ServiceStatus[] = [];
let lastFetch = 0;
const FETCH_INTERVAL = 60 * 1000;

async function checkUrl(url: string): Promise<{ httpCode: string; latency: string; reachable: boolean }> {
  try {
    const start = performance.now();
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    const latency = ((performance.now() - start) / 1000).toFixed(2);
    return {
      httpCode: String(res.status),
      latency: `${latency}s`,
      reachable: true,
    };
  } catch {
    return { httpCode: 'N/A', latency: 'N/A', reachable: false };
  }
}

export async function refreshServices(): Promise<ServiceStatus[]> {
  const config = getConfig();
  const entries: ServiceEntry[] = config.modules.services.entries;

  const results = await Promise.all(
    entries.map(async (entry) => {
      const [publicResult, lanResult] = await Promise.all([
        checkUrl(entry.publicUrl),
        checkUrl(entry.lanUrl),
      ]);

      const onlineCount = [publicResult.reachable, lanResult.reachable].filter(Boolean).length;
      let status: 'online' | 'degraded' | 'offline';
      if (onlineCount === 2) status = 'online';
      else if (onlineCount === 1) status = 'degraded';
      else status = 'offline';

      return {
        name: entry.name,
        publicUrl: entry.publicUrl,
        lanUrl: entry.lanUrl,
        icon: entry.icon,
        publicHttpCode: publicResult.httpCode,
        publicLatency: publicResult.latency,
        publicReachable: publicResult.reachable,
        lanHttpCode: lanResult.httpCode,
        lanLatency: lanResult.latency,
        lanReachable: lanResult.reachable,
        status,
        lastChecked: Date.now(),
      };
    })
  );

  cache = results;
  lastFetch = Date.now();
  return results;
}

export async function getServices(): Promise<ServiceStatus[]> {
  if (cache.length === 0 || Date.now() - lastFetch > FETCH_INTERVAL) {
    return refreshServices();
  }
  return cache;
}
