import { Hono } from 'hono'
import type { Context } from 'hono'
import { apiKeyAuth } from './middleware/auth.ts'

const app = new Hono()

// Apply API key authentication middleware to all routes
app.use('*', apiKeyAuth)

app.get('/', (c: Context) => {
  return c.text('Hello Hono!')
})

app.get('/get-page', (c: Context) => {
  return c.text('Get page!')
})

// Health check endpoint
app.get('/health', (c: Context) => {
  return c.json({ status: 'healthy' }, 200)
})

Deno.serve(app.fetch)
