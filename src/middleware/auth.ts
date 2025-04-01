import type { Context, Next } from 'hono'

/**
 * Middleware to validate API key in request headers
 * @param c - Hono context
 * @param next - Next middleware function
 * @returns Response or proceeds to next middleware
 */
export async function apiKeyAuth(c: Context, next: Next) {
  // Skip authentication for health check endpoint
  if (c.req.path === '/health' || (c.req.path.startsWith('/test-') && c.req.path.endsWith('-callback'))) {
    return await next()
  }

  const apiKey = c.req.header('X-API-Key')
  const validApiKey = process.env.API_KEY

  if (!apiKey || apiKey !== validApiKey) {
    return c.json({ error: 'Unauthorized - Invalid API Key' }, 401)
  }

  await next()
} 