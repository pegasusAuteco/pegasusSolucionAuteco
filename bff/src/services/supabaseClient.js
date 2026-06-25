/**
 * Supabase client singleton with WebSocket transport for realtime.
 *
 * Configured using environment variables from config.js.
 * Used by workshopService for direct database operations.
 */
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { config } from '../config.js'

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
  realtime: {
    transport: ws,
  },
})

export default supabase
