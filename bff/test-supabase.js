import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
  process.env.SUPABASE_URL?.replace(/\/$/, ''),
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
)

const { data, error } = await supabase
  .from('ingresos_taller')
  .select('*')
  .limit(1)

console.log('data:', data)
console.log('error:', error)
