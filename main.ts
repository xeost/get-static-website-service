import { Hono } from 'hono'
import type { Context } from 'hono'

const app = new Hono()

app.get('/', (c: Context) => {
  return c.text('Hello Hono!')
})

// Health check endpoint
app.get('/health', (c: Context) => {
  return c.json({ status: 'healthy' }, 200)
})

Deno.serve(app.fetch)
