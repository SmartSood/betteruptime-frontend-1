import type { WebsiteTick } from '@/lib/api';

export type MonitorStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export function monitorStatus(ticks: WebsiteTick[]): MonitorStatus {
  return ticks[0]?.status ?? 'UNKNOWN';
}

export function uptimePercent(ticks: WebsiteTick[]): number {
  if (ticks.length === 0) return 0;
  return Math.round((ticks.filter((tick) => tick.status === 'UP').length / ticks.length) * 1000) / 10;
}

export function averageResponseTime(ticks: WebsiteTick[]): number {
  const completed = ticks.filter((tick) => tick.response_time_ms > 0);
  if (completed.length === 0) return 0;
  return Math.round(completed.reduce((sum, tick) => sum + tick.response_time_ms, 0) / completed.length);
}

export function regionLabel(regionId: string): string {
  const regions: Record<string, string> = {
    'us-east': 'US East',
    'us-west': 'US West',
    'eu-central': 'EU Central',
    'ap-south': 'Asia Pacific',
    'ap-northeast': 'Asia Pacific',
    'sa-east': 'South America',
  };
  return regions[regionId] ?? regionId;
}
