/**
 * ============================================================
 * Pegasus Mechanics — Servidor de Ingesta de Manuales PDF
 * ============================================================
 * Expone un endpoint REST para que el frontend (feature/frontend)
 * pueda subir PDFs desde la interfaz de administrador.
 *
 * POST /api/ingest  — sube y procesa un PDF
 * GET  /api/health  — verifica que el servidor está activo
 * GET  /api/manuals — lista los manuales ya ingestados en Supabase
 *
 * Para iniciar: node server.js
 * Puerto por defecto: 3001
 * ============================================================
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';

// ── Setup ─────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Faltan variables de entorno en ingestion/.env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' })); // Allow all origins (frontend dev server)
app.use(express.json());

// Multer: store PDF in memory (no disk writes needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
});

// ── Helpers ───────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateEmbedding(text, retries = 3) {
  const truncated = text.slice(0, 8000);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: truncated,
      });
      return res.data[0].embedding;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(attempt * 2000);
    }
  }
}

async function extractRepuestos(pageText, modeloMoto) {
  if (pageText.trim().length < 80) {
    return { repuestos: [], sistema: 'General' };
  }
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `Eres un experto en mecánica de motos. Analiza el texto de una página de manual técnico de la moto "${modeloMoto}" y extrae una lista de repuestos o piezas mencionadas. Responde SOLO con JSON válido con el siguiente formato exacto:
{"repuestos":[{"nombre":"nombre del repuesto","codigo":"código si existe o null","cantidad":número o null}],"sistema":"sistema al que pertenece (ej: Motor, Frenos, Eléctrico, Suspensión, etc.)"}
Si no hay repuestos, devuelve {"repuestos":[],"sistema":"General"}.`,
        },
        {
          role: 'user',
          content: `Texto:\n\n${pageText.slice(0, 2000)}`,
        },
      ],
    });
    const raw = res.choices[0].message.content.trim()
      .replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(raw);
  } catch {
    return { repuestos: [], sistema: 'General' };
  }
}

// ── Core ingestion (buffer version) ──────────────────────────
async function ingestBuffer(buffer, modeloMoto, onProgress) {
  const pages = [];

  await pdfParse(buffer, {
    pagerender: (pageData) =>
      pageData.getTextContent().then((tc) => {
        const text = tc.items.map((i) => i.str).join(' ');
        pages.push(text);
        return text;
      }),
  });

  const total = pages.length;
  let inserted = 0;
  let skipped = 0;

  onProgress({ status: 'processing', total, inserted, skipped, currentPage: 0 });

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const pageText = pages[i];

    if (!pageText || pageText.trim().length < 20) {
      skipped++;
      onProgress({ status: 'processing', total, inserted, skipped, currentPage: pageNum });
      continue;
    }

    try {
      const [embedding, repuestosData] = await Promise.all([
        generateEmbedding(`${modeloMoto}\n\n${pageText}`),
        extractRepuestos(pageText, modeloMoto),
      ]);

      const sistemaMoto = repuestosData?.sistema
        ? `${modeloMoto} — ${repuestosData.sistema}`
        : modeloMoto;

      const { error } = await supabase.from('paginas_manuales').insert({
        sistema_moto: sistemaMoto,
        numero_pagina: pageNum,
        repuestos: repuestosData,
        embedding,
      });

      if (error) throw new Error(error.message);

      inserted++;
    } catch (err) {
      console.error(`Error en página ${pageNum}:`, err.message);
      skipped++;
    }

    onProgress({ status: 'processing', total, inserted, skipped, currentPage: pageNum });
    await sleep(300);
  }

  return { total, inserted, skipped };
}

// ── Routes ────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Pegasus Ingestion Server activo 🏍️' });
});

/** List ingested manuals */
app.get('/api/manuals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paginas_manuales')
      .select('sistema_moto, numero_pagina')
      .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Group by manual name (extract base model from "Benelli 180S — Motor")
    const grouped = {};
    for (const row of data) {
      const base = row.sistema_moto.split(' — ')[0].trim();
      if (!grouped[base]) grouped[base] = { modelo: base, paginas: 0 };
      grouped[base].paginas++;
    }

    res.json({ manuals: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ingest
 * Accepts: multipart/form-data with fields:
 *   - pdf: File (required)
 *   - modelo: string (required) — e.g. "Benelli 180S"
 *
 * Uses SSE (Server-Sent Events) to stream progress back to the client.
 */
app.post('/api/ingest', upload.single('pdf'), async (req, res) => {
  const { modelo } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
  }
  if (!modelo || !modelo.trim()) {
    return res.status(400).json({ error: 'El campo "modelo" es requerido.' });
  }

  // Use SSE for real-time progress
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send({ status: 'started', mensaje: `Iniciando ingesta de "${modelo}"...` });

    const result = await ingestBuffer(req.file.buffer, modelo.trim(), (progress) => {
      send(progress);
    });

    send({
      status: 'done',
      ...result,
      mensaje: `✅ Ingesta completada. ${result.inserted} páginas guardadas en Supabase.`,
    });
  } catch (err) {
    send({ status: 'error', error: err.message });
  } finally {
    res.end();
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏍️  Pegasus Ingestion Server corriendo en http://localhost:${PORT}`);
  console.log(`   POST /api/ingest  → Subir y vectorizar un PDF`);
  console.log(`   GET  /api/health  → Estado del servidor`);
  console.log(`   GET  /api/manuals → Manuales ya ingestados\n`);
});
