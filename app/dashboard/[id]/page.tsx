'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type Website } from '@/lib/api';
import {
  getResponseTimeSeries,
  getUptimeTimeline,
  getRecentChecks,
  getMonitorUptimePercent,
  getMonitorAvgResponseTime,
  getMonitorCurrentStatus,
  getMockRegionName,
  getMockMonitorById,
  type MonitorCheck,
  type CheckStatus,
} from '@/lib/mock-data';
import { StatusBadge } from '@/components/status-badge';
import { LoadingState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Globe,
  Clock,
  Gauge,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<CheckStatus, string> = {
  UP: 'hsl(var(--success))',
  DOWN: 'hsl(var(--destructive))',
  DEGRADED: 'hsl(var(--warning))',
};

const PAGE_SIZE = 10;

export default function MonitorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = params.id as string;

  const [monitor, setMonitor] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checksPage, setChecksPage] = useState(0);

  const responseSeries = getResponseTimeSeries(monitorId);
  const uptimeTimeline = getUptimeTimeline(monitorId);
  const allChecks: MonitorCheck[] = getRecentChecks(monitorId);

  const loadMonitor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWebsite(monitorId);
      setMonitor(data);
    } catch {
      // API not available — fall back to sample data for preview
      const mock = getMockMonitorById(monitorId);
      setMonitor({
        id: mock.id,
        url: mock.url,
        user_id: mock.user_id,
        time_added: mock.time_added,
      });
    } finally {
      setLoading(false);
    }
  }, [monitorId]);

  useEffect(() => {
    loadMonitor();
  }, [loadMonitor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <LoadingState label="Loading monitor..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <BackButton onClick={() => router.push('/dashboard')} />
        <ErrorState message={error} onRetry={loadMonitor} />
      </div>
    );
  }

  if (!monitor) return null;

  const currentStatus = getMonitorCurrentStatus(monitorId);
  const uptime = getMonitorUptimePercent(monitorId);
  const avgResponse = getMonitorAvgResponseTime(monitorId);
  const latestResponse =
    responseSeries.length > 0 ? responseSeries[responseSeries.length - 1].responseTime : 0;

  const responseChartData = responseSeries.map((p) => ({
    time: format(new Date(p.timestamp), 'HH:mm'),
    responseTime: p.responseTime,
  }));

  const uptimeChartData = uptimeTimeline.map((p) => ({
    time: format(new Date(p.timestamp), 'MM/dd'),
    status: p.status,
  }));

  const totalPages = Math.ceil(allChecks.length / PAGE_SIZE);
  const pagedChecks = allChecks.slice(checksPage * PAGE_SIZE, (checksPage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <BackButton onClick={() => router.push('/dashboard')} />

      {/* Hero */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight break-all">{monitor.url}</h1>
              <StatusBadge status={currentStatus} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['us-east', 'eu-central', 'us-west', 'ap-southeast'].map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Globe className="h-3 w-3" />
                  {getMockRegionName(r)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <HeroMetric
            label="Current status"
            value={currentStatus === 'UP' ? 'Operational' : currentStatus === 'DOWN' ? 'Down' : 'Degraded'}
            icon={Activity}
            valueColor={
              currentStatus === 'UP'
                ? 'text-success'
                : currentStatus === 'DOWN'
                  ? 'text-destructive'
                  : 'text-warning'
            }
          />
          <HeroMetric
            label="Uptime (72h)"
            value={`${uptime}%`}
            icon={Gauge}
            valueColor={uptime >= 99 ? 'text-success' : uptime >= 90 ? 'text-warning' : 'text-destructive'}
          />
          <HeroMetric
            label="Latest response"
            value={latestResponse > 0 ? `${latestResponse}ms` : '—'}
            icon={Clock}
          />
          <HeroMetric
            label="Avg response"
            value={avgResponse > 0 ? `${avgResponse}ms` : '—'}
            icon={Clock}
          />
        </div>
      </div>

      {/* Response time chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Response time</h2>
            <p className="text-xs text-muted-foreground">Last 4 hours · 5-minute intervals</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={responseChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(responseChartData.length / 8)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: number) => [`${value}ms`, 'Response']}
            />
            <Area
              type="monotone"
              dataKey="responseTime"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#responseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Uptime timeline chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Uptime timeline</h2>
          <p className="text-xs text-muted-foreground">Last 72 hours · hourly status</p>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={uptimeChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(uptimeChartData.length / 12)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={() => ''}
              domain={[0, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(_value: number, _name: string, item: { payload?: { status: CheckStatus } }) => [
                item?.payload?.status ?? 'UP',
                'Status',
              ]}
            />
            <Bar dataKey="status" radius={[2, 2, 0, 0]}>
              {uptimeChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-success" /> Up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-warning" /> Degraded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-destructive" /> Down
          </span>
        </div>
      </div>

      {/* Recent checks table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent checks</h2>
            <p className="text-xs text-muted-foreground">Latest monitoring results across all regions</p>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Region</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                  HTTP code
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Response</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedChecks.map((check) => (
                <tr
                  key={check.id}
                  className="border-b border-border/50 transition-colors hover:bg-muted/20 last:border-0"
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(new Date(check.timestamp), 'MMM d, HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{check.regionName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={check.status} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {check.statusCode ? (
                      <span
                        className={
                          check.statusCode >= 500
                            ? 'text-destructive'
                            : check.statusCode >= 400
                              ? 'text-warning'
                              : 'text-muted-foreground'
                        }
                      >
                        {check.statusCode}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {check.status === 'DOWN' ? (
                      <span className="text-destructive">—</span>
                    ) : (
                      <span
                        className={
                          check.responseTime > 300 ? 'text-warning' : 'text-foreground'
                        }
                      >
                        {check.responseTime}ms
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {check.error ? (
                      <span className="text-xs text-destructive">{check.error}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Page {checksPage + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChecksPage((p) => Math.max(0, p - 1))}
                disabled={checksPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChecksPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={checksPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="-ml-2 text-muted-foreground hover:text-foreground">
      <ArrowLeft className="mr-1.5 h-4 w-4" />
      Back to dashboard
    </Button>
  );
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-1.5 text-lg font-semibold ${valueColor || ''}`}>{value}</p>
    </div>
  );
}
