import { getToken, clearToken } from './auth';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Fired whenever the server says our token is no good, so the app can drop
// back to the passcode screen without every call site having to check.
type Unauthorized = () => void;
let onUnauthorized: Unauthorized | null = null;
export function setUnauthorizedHandler(fn: Unauthorized) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token ?? ''}`,
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON -- keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Generic table CRUD (mirrors api/data/[table].ts) ----------------

export interface ListParams {
  [column: string]: string | number | boolean | undefined;
}

function toQuery(params?: ListParams): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function listRows<T>(table: string, params?: ListParams): Promise<T[]> {
  const { data } = await request<{ data: T[] }>(`/api/data/${table}${toQuery(params)}`);
  return data;
}

export async function createRow<T>(table: string, payload: Partial<T>): Promise<T> {
  const { data } = await request<{ data: T[] }>(`/api/data/${table}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data[0];
}

export async function updateRow<T>(table: string, id: string, payload: Partial<T>): Promise<T> {
  const { data } = await request<{ data: T[] }>(`/api/data/${table}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data[0];
}

export async function deleteRow(table: string, id: string): Promise<void> {
  await request<void>(`/api/data/${table}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---- Timer --------------------------------------------------------------

export async function getTimer<T>(): Promise<T> {
  const { data } = await request<{ data: T }>('/api/timer');
  return data;
}

export async function patchTimer<T>(payload: Partial<T>): Promise<T> {
  const { data } = await request<{ data: T }>('/api/timer', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data;
}

// ---- Export / import ------------------------------------------------------

export async function exportAll<T>(): Promise<T> {
  return request<T>('/api/export');
}

export async function importAll(payload: unknown): Promise<{ summary: Record<string, { upserted: number; skipped: number }>; errors: string[] }> {
  return request('/api/import', { method: 'POST', body: JSON.stringify(payload) });
}

// Verifies a candidate token by making a harmless, cheap authenticated call.
export async function verifyToken(token: string): Promise<boolean> {
  const res = await fetch('/api/data/goals?limit=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
