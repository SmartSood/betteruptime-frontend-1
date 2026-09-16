// ── Types ──────────────────────────────────────────────

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface SignUpResponse {
  user_id: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  jwt: string;
}

export interface Region {
  id: string;
  name: string;
}

export interface RegionsResponse {
  regions: Region[];
}

export interface CreateWebsiteRequest {
  url: string;
  region_ids: string[];
  poll_time: number;
}

export interface CreateWebsiteResponse {
  website_id: string;
}

export interface Website {
  id: string;
  url: string;
  user_id: string;
  time_added: string;
  region_ids: (string | null)[];
  poll_time: number;
}

export interface AllWebsitesResponse {
  websites: Website[];
}

export interface WebsiteTick {
  id: string;
  website_id: string;
  region_id: string;
  status: 'UP' | 'DOWN';
  status_code: number | null;
  response_time_ms: number;
  dns_time_ms: number | null;
  tcp_time_ms: number | null;
  tls_time_ms: number | null;
  ttfb_ms: number | null;
  response_size_bytes: number | null;
  content_valid: boolean | null;
  ssl_valid: boolean | null;
  ssl_days_remaining: number | null;
  error: string | null;
  created_at: string;
}

export interface WebsiteTickHistoryResponse {
  ticks: WebsiteTick[];
}

// ── Token management ───────────────────────────────────

const JWT_KEY = 'sentinel_jwt';

export function getJwt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(JWT_KEY);
}

export function setJwt(jwt: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JWT_KEY, jwt);
}

export function clearJwt(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(JWT_KEY);
}

export function isAuthenticated(): boolean {
  return !!getJwt();
}

// ── API client ─────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
  } = {},
): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getJwt();
    if (!token) {
      throw new ApiError('Not authenticated', 401);
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Failed to connect to the server. Check your network and API URL.', 0);
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      // response had no JSON body
    }
    const message =
      (errorBody as { error?: string; message?: string })?.error ||
      (errorBody as { error?: string; message?: string })?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorBody);
  }

  // Handle empty responses (e.g. 204)
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ── Endpoints ──────────────────────────────────────────

export const api = {
  signUp: (data: SignUpRequest) =>
    request<SignUpResponse>('/user/sign-up', { method: 'POST', body: data }),

  signIn: (data: SignInRequest) =>
    request<SignInResponse>('/user/sign-in', { method: 'POST', body: data }),

  getRegions: () => request<RegionsResponse>('/regions'),

  createWebsite: (data: CreateWebsiteRequest) =>
    request<CreateWebsiteResponse>('/website', { method: 'POST', body: data, auth: true }),

  getAllWebsites: () =>
    request<AllWebsitesResponse>('/all_websites', { auth: true }),

  getWebsite: (id: string) =>
    request<Website>(`/website/${id}`, { auth: true }),

  getWebsiteTicks: (id: string, limit = 200) =>
    request<WebsiteTickHistoryResponse>(`/website/${id}/ticks?limit=${limit}`, { auth: true }),
};
