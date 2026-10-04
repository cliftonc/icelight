/**
 * Cost and abuse protection for the query API.
 *
 * Every uncached semantic or SQL query is billed by Basin SQL (minimum 10 MB
 * scanned per query), so public deployments need limits in front of it:
 * - optional bearer auth (API_TOKEN)
 * - per-IP rate limiting (RATE_LIMITER binding)
 * - cache bypass (X-Cache-Control: no-cache) only for authenticated callers
 */
import type { Context, MiddlewareHandler } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';

export interface ProtectionEnv {
  API_TOKEN?: string;
  RATE_LIMITER?: RateLimit;
}

/** Client IP used as the rate-limit key */
export function clientKey(c: Context): string {
  return c.req.header('CF-Connecting-IP') ?? 'unknown';
}

/**
 * Require `Authorization: Bearer <API_TOKEN>` when API_TOKEN is set
 */
export function apiAuth(): MiddlewareHandler<{ Bindings: ProtectionEnv }> {
  return async (c, next) => {
    if (c.env.API_TOKEN) {
      return bearerAuth({ token: c.env.API_TOKEN })(c, next);
    }
    await next();
  };
}

/**
 * Per-IP rate limit using a Workers rate limiting binding. Limits are set in
 * wrangler.jsonc (`ratelimits`); without a binding, requests pass through.
 */
export function rateLimit<E extends object>(
  getLimiter: (env: E) => RateLimit | undefined
): MiddlewareHandler<{ Bindings: E }> {
  return async (c, next) => {
    const limiter = getLimiter(c.env);
    if (limiter) {
      const { success } = await limiter.limit({ key: clientKey(c) });
      if (!success) {
        c.header('Retry-After', '60');
        return c.json({ success: false, error: 'Too many requests, try again in a minute' }, 429);
      }
    }
    await next();
  };
}

/**
 * Drop X-Cache-Control unless the deployment requires auth, so anonymous
 * callers always get the KV cache instead of forcing a billed Basin query.
 */
export function withoutAnonymousCacheBypass(request: Request, env: ProtectionEnv): Request {
  if (env.API_TOKEN || !request.headers.has('X-Cache-Control')) {
    return request;
  }
  const stripped = new Request(request);
  stripped.headers.delete('X-Cache-Control');
  return stripped;
}
