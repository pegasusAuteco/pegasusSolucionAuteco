/**
 * test-connection.js
 * Verifica la conectividad con Supabase y OpenAI antes de correr la ingesta.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

async function testSupabase() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('paginas_manuales')
    .select('id, sistema_moto, numero_pagina')
    .limit(3);

  if (error) throw new Error(`Supabase: ${error.message}`);
  console.log(`  ✅  Supabase OK — registros actuales en tabla: ${data.length} (muestra)`);
}

async function testOpenAI() {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const res = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: 'prueba de conectividad pegasus mechanics',
  });
  console.log(`  ✅  OpenAI OK — embedding recibido con ${res.data[0].embedding.length} dimensiones`);
}

console.log('\n🔍  Probando conexiones...\n');

Promise.all([
  testSupabase().catch((e) => console.error(`  ❌  Supabase: ${e.message}`)),
  testOpenAI().catch((e) => console.error(`  ❌  OpenAI: ${e.message}`)),
]).then(() => console.log('\n✔️   Prueba finalizada.\n'));
