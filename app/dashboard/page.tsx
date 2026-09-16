'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Website } from '@/lib/api';
import { averageResponseTime, monitorStatus, uptimePercent } from '@/lib/monitor-metrics';
import { CreateMonitorDialog } from '@/components/create-monitor-dialog';
import { StatusBadge } from '@/components/status-badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Plus,
  Search,
  ArrowUpRight,
  Server,
  CheckCircle2,
  XCircle,
  Timer,
  Gauge,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MonitorRow extends Website {
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';
  uptime: number;
  avgResponseTime: number;
  regions: string[];
  pollTime: number;
  lastCheck: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [monitors, setMonitors] = useState<MonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const loadMonitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllWebsites();
      const rows: MonitorRow[] = await Promise.all(res.websites.map(async (website) => {
        const ticks = (await api.getWebsiteTicks(website.id, 100)).ticks;
        return {
          ...website,
          status: monitorStatus(ticks),
          uptime: uptimePercent(ticks),
          avgResponseTime: averageResponseTime(ticks),
          regions: website.region_ids.filter((region): region is string => Boolean(region)),
          pollTime: website.poll_time,
          lastCheck: ticks[0]?.created_at ?? null,
        };
      }));
      setMonitors(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  const filtered = monitors.filter((m) => {
    const matchesSearch = m.url.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMonitors = monitors.length;
  const upCount = monitors.filter((m) => m.status === 'UP').length;
  const downCount = monitors.filter((m) => m.status === 'DOWN').length;
  const avgResponse =
    monitors.length > 0
      ? Math.round(monitors.reduce((a, m) => a + m.avgResponseTime, 0) / monitors.length)
      : 0;
  const avgUptime =
    monitors.length > 0
      ? Math.round((monitors.reduce((a, m) => a + m.uptime, 0) / monitors.length) * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Monitors</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track uptime across all your websites
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create monitor
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total monitors"
          value={totalMonitors.toString()}
          icon={Server}
          iconColor="text-primary"
        />
        <MetricCard
          label="Up"
          value={upCount.toString()}
          icon={CheckCircle2}
          iconColor="text-success"
          subValue={downCount > 0 ? `${downCount} down` : undefined}
          subValueColor="text-destructive"
        />
        <MetricCard
          label="Avg response"
          value={avgResponse > 0 ? `${avgResponse}ms` : '—'}
          icon={Timer}
          iconColor="text-warning"
        />
        <MetricCard
          label="Avg uptime"
          value={totalMonitors > 0 ? `${avgUptime}%` : '—'}
          icon={Gauge}
          iconColor="text-primary"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState label="Loading monitors..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadMonitors} />
      ) : totalMonitors === 0 ? (
        <EmptyState
          icon={Activity}
          title="No monitors yet"
          description="Create your first monitor to start tracking uptime and response times across global regions."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first monitor
            </Button>
          }
        />
      ) : (
        <>
          {/* Search & filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="UP">Up</SelectItem>
                <SelectItem value="DOWN">Down</SelectItem>
                <SelectItem value="DEGRADED">Degraded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No results"
              description="No monitors match your search or filter. Try adjusting your criteria."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">URL</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                        Regions
                      </th>
                      <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">
                        Interval
                      </th>
                      <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">
                        Last check
                      </th>
                      <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                        Response
                      </th>
                      <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                        Uptime
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((monitor) => (
                      <tr
                        key={monitor.id}
                        onClick={() => router.push(`/dashboard/${monitor.id}`)}
                        className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/20 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[280px] truncate font-medium">{monitor.url}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={monitor.status} />
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {monitor.regions.slice(0, 2).map((r) => (
                              <span
                                key={r}
                                className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                              >
                                {r}
                              </span>
                            ))}
                            {monitor.regions.length > 2 && (
                              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                +{monitor.regions.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {monitor.pollTime}s
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {monitor.lastCheck
                            ? formatDistanceToNow(new Date(monitor.lastCheck), { addSuffix: true })
                            : 'Not checked yet'}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span
                            className={
                              monitor.status === 'DOWN'
                                ? 'text-destructive'
                                : monitor.status === 'DEGRADED'
                                  ? 'text-warning'
                                  : 'text-foreground'
                            }
                          >
                            {monitor.status === 'DOWN' ? '—' : `${monitor.avgResponseTime}ms`}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span
                            className={
                              monitor.uptime >= 99
                                ? 'text-success'
                                : monitor.uptime >= 90
                                  ? 'text-warning'
                                  : 'text-destructive'
                            }
                          >
                            {monitor.uptime}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <CreateMonitorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadMonitors}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  subValue,
  subValueColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  subValue?: string;
  subValueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {subValue && <span className={`text-xs ${subValueColor || 'text-muted-foreground'}`}>{subValue}</span>}
      </div>
    </div>
  );
}
