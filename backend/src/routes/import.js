const express = require('express');
const multer = require('multer');
const { parseCSV } = require('../services/csvParser');
const { extractAllRecords } = require('../services/aiExtractor');

const router = express.Router();

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const isCSV =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (isCSV) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only .csv files are allowed'));
    }
  }
});

// ─── SSE Helper ───────────────────────────────────────────────────────────────
function sendSSE(res, type, payload) {
  const data = JSON.stringify({ type, ...payload });
  res.write(`data: ${data}\n\n`);
  // Flush the buffer immediately for streaming
  if (res.flush) res.flush();
}

// ─── POST /api/import/process ─────────────────────────────────────────────────
// Accepts CSV file, parses it, processes with AI, streams progress via SSE.
router.post('/process', upload.single('file'), async (req, res) => {
  // Set SSE headers before anything else
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  try {
    if (!req.file) {
      sendSSE(res, 'error', { message: 'No CSV file provided in request.' });
      return res.end();
    }

    // ── Step 1: Parse CSV ───────────────────────────────────────────────────
    let csvContent;
    try {
      csvContent = req.file.buffer.toString('utf-8');
    } catch {
      csvContent = req.file.buffer.toString('latin1');
    }

    const { headers, records } = parseCSV(csvContent);

    if (records.length === 0) {
      sendSSE(res, 'error', { message: 'CSV file is empty or has no valid data rows.' });
      return res.end();
    }

    sendSSE(res, 'start', {
      total: records.length,
      headers,
      message: `Parsed ${records.length} records. Starting AI extraction...`
    });

    // ── Step 2: AI Extraction with progress streaming ───────────────────────
    const onBatchComplete = (processedCount, totalCount) => {
      const percentage = Math.min(100, Math.round((processedCount / totalCount) * 100));
      sendSSE(res, 'progress', {
        processed: processedCount,
        total: totalCount,
        percentage,
        message: `Processing... ${processedCount} of ${totalCount} records`
      });
    };

    const results = await extractAllRecords(records, onBatchComplete);

    // ── Step 3: Partition results ───────────────────────────────────────────
    const imported = results
      .filter(r => r.status === 'success')
      .map(r => r.data);

    const skipped = results
      .filter(r => r.status === 'skipped')
      .map(r => ({ ...r.data, _skipReason: r.reason }));

    sendSSE(res, 'complete', {
      totalImported: imported.length,
      totalSkipped: skipped.length,
      totalProcessed: records.length,
      imported,
      skipped,
      message: `Import complete: ${imported.length} records imported, ${skipped.length} skipped.`
    });

    res.end();
  } catch (err) {
    console.error('Import route error:', err);
    sendSSE(res, 'error', {
      message: err.message || 'An unexpected error occurred during import.'
    });
    res.end();
  }
});

// ─── Multer Error Handler ─────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
