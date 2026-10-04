/**
 * Query API token (API_TOKEN on the worker), entered in the navbar and kept in
 * localStorage. Only needed when the deployment requires auth.
 */
export const API_TOKEN_STORAGE_KEY = 'icelight_api_token';

export function getApiToken(): string | null {
  return localStorage.getItem(API_TOKEN_STORAGE_KEY);
}

/** fetch() with `Authorization: Bearer <token>` added when a token is set */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getApiToken();
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export interface ServerConfig {
  /** The worker has API_TOKEN set, so every API call needs the token */
  authRequired: boolean;
  /** Anonymous Event Simulator ingest is allowed (PUBLIC_DEMO) */
  publicDemo: boolean;
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  try {
    const response = await fetch('/api/config');
    if (response.ok) return (await response.json()) as ServerConfig;
  } catch {
    // Older workers don't serve /api/config; fall through
  }
  // Unknown: show the token control so a protected deployment stays usable
  return { authRequired: true, publicDemo: false };
}
