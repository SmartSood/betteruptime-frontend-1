'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Region, type CreateWebsiteRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, X, Check, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const URL_REGEX = /^https?:\/\/.+\..+/;

const POLL_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '60 seconds' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
];

export function CreateMonitorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [pollTime, setPollTime] = useState(60);
  const [customPollTime, setCustomPollTime] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function loadRegions() {
    if (regions.length > 0 || regionsLoading) return;
    setRegionsLoading(true);
    setRegionsError(null);
    try {
      const res = await api.getRegions();
      setRegions(res.regions);
      if (res.regions.length > 0) {
        setSelectedRegions([res.regions[0].id]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setRegionsError(err.message);
      } else {
        setRegionsError('Failed to load regions');
      }
    } finally {
      setRegionsLoading(false);
    }
  }

  // The dashboard controls this dialog's open state directly, so region
  // loading must react to `open` rather than only a Dialog click callback.
  useEffect(() => {
    if (open) {
      void loadRegions();
    }
  }, [open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function toggleRegion(id: string) {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function validateUrl(value: string): boolean {
    if (!value) {
      setUrlError('URL is required');
      return false;
    }
    if (!URL_REGEX.test(value)) {
      setUrlError('Enter a full URL like https://example.com');
      return false;
    }
    setUrlError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validateUrl(url)) return;
    if (selectedRegions.length === 0) {
      setSubmitError('Select at least one region');
      return;
    }
    if (!Number.isInteger(pollTime) || pollTime < 30) {
      setSubmitError('Polling interval must be at least 30 seconds');
      return;
    }

    setSubmitting(true);
    try {
      const body: CreateWebsiteRequest = {
        url,
        region_ids: selectedRegions,
        poll_time: pollTime,
      };
      await api.createWebsite(body);
      toast({ title: 'Monitor created', description: `${url} is now being monitored.` });
      onCreated();
      handleOpenChange(false);
      setUrl('');
      setUrlError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-lg font-semibold">Create monitor</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a new website to start tracking its uptime.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monitor-url">URL</Label>
            <Input
              id="monitor-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) validateUrl(e.target.value);
              }}
              onBlur={(e) => validateUrl(e.target.value)}
              autoFocus
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            <p className="text-xs text-muted-foreground">
              Must include the protocol (http or https)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Regions</Label>
            <p className="text-xs text-muted-foreground">Select one or more regions to monitor from</p>
            {regionsLoading && (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading regions...</span>
              </div>
            )}
            {regionsError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{regionsError}</p>
              </div>
            )}
            {!regionsLoading && !regionsError && regions.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {regions.map((region) => {
                  const selected = selectedRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => toggleRegion(region.id)}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-xs">{region.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-time">Poll interval (seconds)</Label>
            <div className="flex flex-wrap gap-2">
              {POLL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPollTime(opt.value);
                    setCustomPollTime('');
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    pollTime === opt.value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="custom-poll-time" className="shrink-0 text-xs text-muted-foreground">
                Custom
              </Label>
              <Input
                id="custom-poll-time"
                type="number"
                min={30}
                step={1}
                inputMode="numeric"
                placeholder="At least 30"
                value={customPollTime}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomPollTime(value);
                  const seconds = Number(value);
                  if (Number.isInteger(seconds) && seconds >= 30) {
                    setPollTime(seconds);
                  }
                }}
                className="max-w-40"
              />
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>
            {customPollTime && Number(customPollTime) < 30 && (
              <p className="text-xs text-destructive">Custom interval must be at least 30 seconds.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || regionsLoading}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create monitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
