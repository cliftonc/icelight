import { createMiddleware } from 'hono/factory';
import type { Context, MiddlewareHandler } from 'hono';

export interface AuthConfig {
  enabled: boolean;
  token?: string;
}

/**
 * Extract auth token from request
 * Supports:
 * - Authorization: Bearer <token>
 * - Authorization: Basic <base64> (write key in username, for RudderStack/Segment)
 * - X-API-Key: <token>
 */
export function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    // Bearer token
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Basic auth (RudderStack/Segment send write key as username)
    if (authHeader.startsWith('Basic ')) {
      try {
        const decoded = atob(authHeader.slice(6));
        const [username] = decoded.split(':');
        return username || null;
      } catch {
        return null;
      }
    }
  }

  // X-API-Key header
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    return apiKey;
  }

  return null;
}

/**
 * Create auth middleware for Hono
 */
export function authMiddleware(getConfig: (c: Context) => AuthConfig): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const config = getConfig(c);

    if (!config.enabled) {
      await next();
      return;
    }

    if (!config.token) {
      return c.json(
        { success: false, message: 'Authentication is enabled but no token is configured' },
        500
      );
    }

    const token = extractToken(c);

    if (!token) {
      return c.json(
        { success: false, message: 'Missing authentication token' },
        401
      );
    }

    if (token !== config.token) {
      return c.json(
        { success: false, message: 'Invalid authentication token' },
        401
      );
    }

    await next();
  });
}
