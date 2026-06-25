/**
 * Database schema inspection utility.
 *
 * Queries Supabase to display sample records from the 'motorcycles'
 * and 'manuales_chunks' tables for schema verification.
 *
 * Usage:
 *   node check_schema.js
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

/**
 * Fetches and logs a sample record from each table to verify schema.
 */
async function check() {
  const { data, error } = await supabase.from('motorcycles').select('*').limit(1)
  console.log('motorcycles:', data, error)
  const { data: mc, error: err } = await supabase.from('manuales_chunks').select('*').limit(1)
  console.log('manuales_chunks:', mc, err)
}

check()
