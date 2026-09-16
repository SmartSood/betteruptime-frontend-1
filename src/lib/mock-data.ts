// Mock data for monitor history — replace with real tick-history endpoint later.
// All functions return data shaped to match what a real backend would provide.

export type CheckStatus = 'UP' | 'DOWN' | 'DEGRADED';

export interface MonitorCheck {
  id: string;
  timestamp: string;
  region: string;
  regionName: string;
  status: CheckStatus;
  statusCode: number | null;
  responseTime: number;
  error: string | null;
}

export interface ResponseTimePoint {
  timestamp: string;
  responseTime: number;
  region: string;
}

export interface UptimeTimelinePoint {
  timestamp: string;
  status: CheckStatus;
}

const REGIONS = [
  { id: 'us-east', name: 'US East (N. Virginia)' },
  { id: 'us-west', name: 'US West (Oregon)' },
  { id: 'eu-central', name: 'EU Central (Frankfurt)' },
  { id: 'ap-southeast', name: 'AP Southeast (Singapore)' },
];

const REGIONS_MAP = new Map(REGIONS.map((r) => [r.id, r.name]));

export function getMockRegionName(id: string): string {
  return REGIONS_MAP.get(id) || id;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getResponseTimeSeries(monitorId: string): ResponseTimePoint[] {
  const rand = seededRandom(monitorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const points: ResponseTimePoint[] = [];
  const now = Date.now();
  const intervalMs = 5 * 60 * 1000; // 5 minutes

  for (let i = 48; i >= 0; i--) {
    const ts = new Date(now - i * intervalMs);
    const base = 120 + rand() * 80;
    const noise = rand() * 60 - 20;
    const isDown = rand() < 0.05;
    points.push({
      timestamp: ts.toISOString(),
      responseTime: isDown ? Math.round(base + 300 + noise) : Math.round(base + noise),
      region: 'all',
    });
  }
  return points;
}

export function getUptimeTimeline(monitorId: string): UptimeTimelinePoint[] {
  const rand = seededRandom(monitorId.split('').reduce((a, c) => a + c.charCodeAt(0), 1) + 100);
  const points: UptimeTimelinePoint[] = [];
  const now = Date.now();
  const intervalMs = 60 * 60 * 1000; // 1 hour

  for (let i = 72; i >= 0; i--) {
    const ts = new Date(now - i * intervalMs);
    const r = rand();
    let status: CheckStatus = 'UP';
    if (r < 0.03) status = 'DOWN';
    else if (r < 0.08) status = 'DEGRADED';
    points.push({ timestamp: ts.toISOString(), status });
  }
  return points;
}

export function getRecentChecks(monitorId: string): MonitorCheck[] {
  const rand = seededRandom(monitorId.split('').reduce((a, c) => a + c.charCodeAt(0), 2) + 200);
  const checks: MonitorCheck[] = [];
  const now = Date.now();
  const intervalMs = 60 * 1000; // 1 minute

  const regionIds = ['us-east', 'us-west', 'eu-central', 'ap-southeast'];

  for (let i = 0; i < 50; i++) {
    const ts = new Date(now - i * intervalMs);
    const region = regionIds[Math.floor(rand() * regionIds.length)];
    const r = rand();
    let status: CheckStatus = 'UP';
    let statusCode: number | null = 200;
    let error: string | null = null;

    if (r < 0.05) {
      status = 'DOWN';
      statusCode = rand() < 0.5 ? 503 : null;
      error = statusCode ? 'Service Unavailable' : 'Connection timed out';
    } else if (r < 0.12) {
      status = 'DEGRADED';
      statusCode = rand() < 0.5 ? 200 : 429;
      error = statusCode === 429 ? 'Rate limited' : 'Slow response';
    }

    const base = 100 + rand() * 200;
    const responseTime =
      status === 'DOWN' ? 0 : status === 'DEGRADED' ? Math.round(base + 400) : Math.round(base);

    checks.push({
      id: `${monitorId}-check-${i}`,
      timestamp: ts.toISOString(),
      region,
      regionName: getMockRegionName(region),
      status,
      statusCode,
      responseTime,
      error,
    });
  }
  return checks;
}

export function getMonitorUptimePercent(monitorId: string): number {
  const timeline = getUptimeTimeline(monitorId);
  const upCount = timeline.filter((p) => p.status === 'UP').length;
  return Math.round((upCount / timeline.length) * 1000) / 10;
}

export function getMonitorAvgResponseTime(monitorId: string): number {
  const series = getResponseTimeSeries(monitorId);
  const valid = series.filter((p) => p.responseTime > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, p) => a + p.responseTime, 0) / valid.length);
}

// Derived monitor status from mock data
export function getMonitorCurrentStatus(monitorId: string): CheckStatus {
  const checks = getRecentChecks(monitorId);
  return checks.length > 0 ? checks[0].status : 'UP';
}

// ── Sample monitors for preview / API-fallback ──────────────────

export const MOCK_MONITORS: ({
  id: string;
  url: string;
  user_id: string;
  time_added: string;
  region_ids: (string | null)[];
  poll_time: number;
} & {
  regions: string[];
  poll_time: number;
})[] = [
  {
    id: 'mock-1',
    url: 'https://api.acme.io',
    user_id: 'preview-user',
    time_added: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    region_ids: ['us-east', 'eu-central', 'ap-southeast'],
    regions: ['us-east', 'eu-central', 'ap-southeast'],
    poll_time: 30,
  },
  {
    id: 'mock-2',
    url: 'https://shop.brightside.dev',
    user_id: 'preview-user',
    time_added: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    region_ids: ['us-east', 'us-west'],
    regions: ['us-east', 'us-west'],
    poll_time: 60,
  },
  {
    id: 'mock-3',
    url: 'https://status.meridian.app',
    user_id: 'preview-user',
    time_added: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    region_ids: ['us-east', 'eu-central', 'us-west', 'ap-southeast'],
    regions: ['us-east', 'eu-central', 'us-west', 'ap-southeast'],
    poll_time: 60,
  },
  {
    id: 'mock-4',
    url: 'https://docs.northwind.io',
    user_id: 'preview-user',
    time_added: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    region_ids: ['eu-central'],
    regions: ['eu-central'],
    poll_time: 120,
  },
  {
    id: 'mock-5',
    url: 'https://gateway.orbital.dev',
    user_id: 'preview-user',
    time_added: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    region_ids: ['us-east', 'ap-southeast'],
    regions: ['us-east', 'ap-southeast'],
    poll_time: 30,
  },
];

export function getMockMonitorById(id: string) {
  return MOCK_MONITORS.find((m) => m.id === id) ?? MOCK_MONITORS[0];
}
