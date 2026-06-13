import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function check() {
  const { data, error } = await supabase.from('motorcycles').select('*').limit(1)
  console.log('motorcycles:', data, error)
  const { data: mc, error: err } = await supabase.from('manuales_chunks').select('*').limit(1)
  console.log('manuales_chunks:', mc, err)
}

check()
