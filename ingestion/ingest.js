/**
 * ============================================================
 * Pegasus Mechanics — Script de Ingesta de Manuales PDF
 * ============================================================
 * Lee PDFs de motos, extrae texto por página,
 * vectoriza con OpenAI text-embedding-ada-002 (1536 dims),
 * extrae repuestos con GPT-4o-mini y guarda en Supabase.
 *
 * Uso:
 *   node ingest.js --file="../motos/BENELLI-180S-CBS.pdf" --modelo="Benelli 180S"
 *   node ingest.js --all          (procesa todos los PDFs en ../motos/)
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';

// ── Paths ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from ingestion folder
dotenv.config({ path: path.resolve(__dirname, '.env') });

// ── Validate env vars ────────────────────────────────────────
const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Faltan variables de entorno. Verifica el archivo .env en la raíz del proyecto.');
  console.error('   Requeridas: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── Clients ──────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────

/** Sleep helper for rate-limit handling */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates an OpenAI embedding vector for the given text.
 * Uses text-embedding-ada-002 (1536 dimensions).
 */
async function generateEmbedding(text, retries = 3) {
  const truncated = text.slice(0, 8000); // Stay safely within token limit
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: truncated,
      });
      return response.data[0].embedding;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = attempt * 2000;
      console.warn(`   ⚠️  Embedding retry ${attempt}/${retries}. Esperando ${wait}ms...`);
      await sleep(wait);
    }
  }
}

/**
 * Uses GPT-4o-mini to extract spare parts (repuestos) mentioned on a page.
 * Returns a structured JSON object.
 */
async function extractRepuestos(pageText, modeloMoto) {
  // If page is too short or irrelevant, skip LLM call
  if (pageText.trim().length < 80) {
    return { repuestos: [], nota: 'Página sin contenido técnico suficiente.' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `Eres un experto en mecánica de motos. Analiza el texto de una página de manual técnico de la moto "${modeloMoto}" y extrae una lista de repuestos o piezas mencionadas. Responde SOLO con JSON válido con el siguiente formato exacto:
{
  "repuestos": [
    { "nombre": "nombre del repuesto", "codigo": "código si existe o null", "cantidad": número o null }
  ],
  "sistema": "sistema al que pertenece la página (ej: Motor, Frenos, Eléctrico, Suspensión, etc.)"
}
Si no hay repuestos en la página, devuelve { "repuestos": [], "sistema": "General" }.`,
        },
        {
          role: 'user',
          content: `Texto de la página:\n\n${pageText.slice(0, 2000)}`,
        },
      ],
    });

    const raw = response.choices[0].message.content.trim();
    // Strip markdown code fences if model wraps it
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`   ⚠️  No se pudo extraer repuestos: ${err.message}`);
    return { repuestos: [], sistema: 'General' };
  }
}

/**
 * Inserts a single page record into Supabase.
 */
async function insertPage({ sistemaMoto, numeroPagina, repuestos, embedding }) {
  const { error } = await supabase.from('paginas_manuales').insert({
    sistema_moto: sistemaMoto,
    numero_pagina: numeroPagina,
    repuestos,
    embedding,
  });

  if (error) {
    throw new Error(`Supabase insert error (page ${numeroPagina}): ${error.message}`);
  }
}

// ── Core ingestion ───────────────────────────────────────────

/**
 * Processes a single PDF file:
 *  1. Parses PDF, splitting by page
 *  2. For each page: generates embedding + extracts repuestos
 *  3. Inserts into Supabase
 */
async function ingestPDF(filePath, modeloMoto) {
  const absPath = path.resolve(__dirname, filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Archivo no encontrado: ${absPath}`);
  }

  console.log(`\n📄  Procesando: ${path.basename(absPath)}`);
  console.log(`🏍️  Modelo: ${modeloMoto}`);

  const buffer = fs.readFileSync(absPath);

  // pdf-parse with pagerender callback to get per-page text
  const pages = [];
  await pdfParse(buffer, {
    pagerender: (pageData) => {
      return pageData.getTextContent().then((textContent) => {
        const text = textContent.items.map((item) => item.str).join(' ');
        pages.push(text);
        return text;
      });
    },
  });

  console.log(`   📑  Páginas detectadas: ${pages.length}`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const pageText = pages[i];

    // Skip completely empty pages
    if (!pageText || pageText.trim().length < 20) {
      console.log(`   ⏭️  Página ${pageNum}/${pages.length} — vacía, omitida.`);
      skipped++;
      continue;
    }

    process.stdout.write(`   🔄  Página ${pageNum}/${pages.length} — `);

    try {
      // Run embedding and repuesto extraction in parallel for speed
      const [embedding, repuestosData] = await Promise.all([
        generateEmbedding(`${modeloMoto}\n\n${pageText}`),
        extractRepuestos(pageText, modeloMoto),
      ]);

      const sistemaMoto = repuestosData?.sistema
        ? `${modeloMoto} — ${repuestosData.sistema}`
        : modeloMoto;

      await insertPage({
        sistemaMoto,
        numeroPagina: pageNum,
        repuestos: repuestosData,
        embedding,
      });

      inserted++;
      console.log(`✅  insertada (${repuestosData?.repuestos?.length ?? 0} repuestos)`);
    } catch (err) {
      console.error(`\n   ❌  Error en página ${pageNum}: ${err.message}`);
    }

    // Small delay to respect OpenAI rate limits
    await sleep(300);
  }

  console.log(`\n✅  Completado — Insertadas: ${inserted} | Omitidas: ${skipped}`);
  return { inserted, skipped, total: pages.length };
}

// ── CLI Argument Parsing ─────────────────────────────────────

/** Map of all PDFs in ../motos/ with their motorcycle model names */
const ALL_PDFS = [
  { file: '../motos/BENELLI-180S-CBS.pdf',               modelo: 'Benelli 180S' },
  { file: '../motos/BENELLI-IMPERIALE-400.pdf',          modelo: 'Benelli Imperiale 400' },
  { file: '../motos/CATALOGO-ADVANCE-R-110.pdf',         modelo: 'Advance R 110' },
  { file: '../motos/CATALOGO-AGILITY-125-.pdf',          modelo: 'Agility 125' },
  { file: '../motos/CATALOGO-AGILITY-GO-7-11-25.pdf',   modelo: 'Agility Go' },
  { file: '../motos/CATALOGO-ZONTES-368G.pdf',           modelo: 'Zontes 368G' },
  { file: '../motos/MRX-150-CAMO-PRO-CAMO-CBS.pdf',     modelo: 'MRX 150' },
  { file: '../motos/MRX-ARIZONA-ABS.pdf',                modelo: 'MRX Arizona' },
  { file: '../motos/NINJA-400.pdf',                      modelo: 'Ninja 400' },
  { file: '../motos/TVS RAIDER-125.pdf',                 modelo: 'TVS Raider 125' },
  { file: '../motos/TVS SPORT 100.pdf',                  modelo: 'TVS Sport 100' },
  { file: '../motos/TVS-APACHE 200RR-FI.pdf',           modelo: 'TVS Apache 200RR' },
];

async function main() {
  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const modeloArg = args.find((a) => a.startsWith('--modelo='))?.split('=')[1];

  console.log('═══════════════════════════════════════════════════');
  console.log('  🏍️  Pegasus Mechanics — Ingesta de Manuales PDF  ');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Modelo de embeddings: text-embedding-ada-002`);
  console.log(`  Extracción de repuestos: gpt-4o-mini`);
  console.log('───────────────────────────────────────────────────\n');

  const summary = [];

  if (processAll) {
    console.log(`📦  Modo: TODOS LOS MANUALES (${ALL_PDFS.length} archivos)\n`);
    for (const { file, modelo } of ALL_PDFS) {
      try {
        const result = await ingestPDF(file, modelo);
        summary.push({ modelo, ...result, error: null });
      } catch (err) {
        console.error(`❌  ${modelo}: ${err.message}`);
        summary.push({ modelo, error: err.message });
      }
    }
  } else if (fileArg && modeloArg) {
    console.log(`📦  Modo: ARCHIVO ÚNICO`);
    try {
      const result = await ingestPDF(fileArg, modeloArg);
      summary.push({ modelo: modeloArg, ...result, error: null });
    } catch (err) {
      console.error(`❌  ${err.message}`);
      summary.push({ modelo: modeloArg, error: err.message });
    }
  } else {
    console.log('Uso:');
    console.log('  node ingest.js --file="../motos/BENELLI-180S-CBS.pdf" --modelo="Benelli 180S"');
    console.log('  node ingest.js --all\n');
    console.log('Manuales disponibles:');
    ALL_PDFS.forEach(({ file, modelo }) => console.log(`  • ${modelo} → ${file}`));
    process.exit(0);
  }

  // Final summary
  if (summary.length > 0) {
    console.log('\n\n══════════════ RESUMEN FINAL ══════════════');
    summary.forEach(({ modelo, inserted, skipped, total, error }) => {
      if (error) {
        console.log(`  ❌  ${modelo}: ${error}`);
      } else {
        console.log(`  ✅  ${modelo}: ${inserted}/${total} páginas insertadas (${skipped} omitidas)`);
      }
    });
    console.log('═══════════════════════════════════════════\n');
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
