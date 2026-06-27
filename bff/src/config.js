/**
 * Centralized configuration module for the BFF.
 *
 * Uses Zod to validate all required environment variables at startup.
 * Exports a typed config object that can be imported throughout the app.
 */
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  SUPABASE_URL:         z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  FASTAPI_URL:          z.string().url(),
  REDIS_URL:            z.string().min(1),
  SESSION_SECRET:       z.string().min(32),
  PORT:                 z.coerce.number().default(3000),
})

const parsed = schema.safeParse({
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL?.replace(/\/$/, ''),
})

if (!parsed.success) {
  console.error('[config] Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
