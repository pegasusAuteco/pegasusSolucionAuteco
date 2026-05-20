/**
 * Pegasus Mechanics — Script de Ingesta de Fallas Comunes (v2)
 * ============================================================
 * Lee el archivo JSON de fallas, genera embeddings y guarda en la 
 * nueva tabla 'fallas_diagnostico' de Supabase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar .env
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY } = process.env;
const FALLAS_TABLE = 'fallas_diagnostico'; // Nueva tabla

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  });
  return response.data[0].embedding;
}

async function ingestFallas() {
  const jsonPath = path.resolve(__dirname, '../knowledge_base/fallas_comunes.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`🚀 Iniciando ingesta en tabla: ${FALLAS_TABLE}...`);

  for (const item of data) {
    const { modelo, fallas } = item;
    console.log(`\n🏍️ Modelo: ${modelo}`);

    for (const falla of fallas) {
      // Texto enriquecido para el embedding
      const searchContent = `Modelo: ${modelo}. Síntoma: ${falla.sintoma}. Componente: ${falla.componente}.`;
      
      console.log(`   - Generando embedding para: ${falla.componente}...`);
      const embedding = await generateEmbedding(searchContent);

      const { error } = await supabase.from(FALLAS_TABLE).insert({
        modelo: modelo,
        componente: falla.componente,
        sintoma: falla.sintoma,
        causa: falla.causa,
        solucion: falla.solucion,
        pasos_revision: falla.pasos_revision, // Guardado como JSONB
        embedding: embedding
      });

      if (error) {
        console.error(`   ❌ Error insertando falla: ${error.message}`);
      } else {
        console.log(`   ✅ Falla e instrucciones de revisión insertadas.`);
      }
    }
  }

  console.log('\n✨ Ingesta completada con éxito.');
}

ingestFallas().catch(err => {
  console.error('💥 Error fatal:', err);
});
