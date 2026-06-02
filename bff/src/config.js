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
  console.error('[config] Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
