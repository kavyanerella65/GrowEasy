const { GoogleGenAI } = require("@google/genai");
const { chunkArray } = require('./csvParser');

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 10;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES, 10) || 3;
const RETRY_DELAY_MS = 1000;

// ─── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert CRM data extraction specialist for GrowEasy, a real estate CRM. Your job is to analyze CSV records from diverse lead sources and intelligently map them to GrowEasy's standardized CRM format.

CSV files can come from ANY source with ANY column names: Facebook Ads exports, Google Ads CSVs, real estate CRM dumps, sales reports, marketing agency exports, or manually created spreadsheets. Intelligently determine what each column represents using its name, data patterns, and context clues.

════════════════════════════════════════════════════════════
FIELD MAPPING INTELLIGENCE
════════════════════════════════════════════════════════════

Map columns based on semantic meaning and these patterns:

• name       → "name", "full name", "full_name", "lead name", "contact name", "customer", "person", "client", "prospect", "fname"+"lname" (combine with space)
• email      → "email", "e-mail", "email address", "email_address", "mail", "email id", "email_id"  
• mobile     → "phone", "mobile", "contact", "telephone", "phone number", "mobile number", "cell", "contact number", "whatsapp", "ph"
• country_code → "country code", "country_code", "isd", "isd code", "calling code", "dial code" (also extract from phone if prefix present)
• company    → "company", "organization", "org", "firm", "business", "employer", "company name"
• city       → "city", "location", "place", "locality", "area", "town"
• state      → "state", "province", "region", "territory"
• country    → "country", "nation"
• created_at → "created at", "created_at", "date", "timestamp", "date created", "date added", "enquiry date", "lead date", "submission date", "time", "datetime"
• lead_owner → "lead owner", "lead_owner", "owner", "agent", "assigned to", "salesperson", "representative", "sales rep", "manager", "assigned"
• crm_status → "status", "lead status", "stage", "quality", "disposition", "call status", "result"
• crm_note   → "note", "notes", "remark", "remarks", "comment", "comments", "follow up", "feedback", "memo", "observation"
• data_source → "source", "lead source", "channel", "campaign", "platform", "medium", "origin"
• possession_time → "possession", "possession time", "handover", "delivery", "ready by", "expected date", "handover date"
• description → "description", "details", "additional info", "extra info", "property details", "other"

════════════════════════════════════════════════════════════
STRICT BUSINESS RULES
════════════════════════════════════════════════════════════

RULE 1 — CRM STATUS (exact values only):
  GOOD_LEAD_FOLLOW_UP → "good lead", "interested", "follow up", "warm", "hot", "qualified", "callback requested",
                         "site visit scheduled", "in progress", "active", "connected", "potential", "demo scheduled"
  DID_NOT_CONNECT     → "not connected", "no answer", "did not pick", "busy", "unreachable", "switched off",
                         "not dialed", "no response", "ringing", "not picked up", "not reachable"
  BAD_LEAD            → "not interested", "bad lead", "junk", "spam", "duplicate", "wrong number",
                         "out of service", "irrelevant", "invalid", "do not call", "DNC"
  SALE_DONE           → "sale done", "closed", "won", "converted", "deal closed", "booked",
                         "sold", "confirmed", "successful", "agreement signed"
  DEFAULT             → If missing or ambiguous → use DID_NOT_CONNECT

RULE 2 — DATA SOURCE (exact values only, or empty string):
  leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots
  Match case-insensitively against source/campaign columns. If none match → ""

RULE 3 — PHONE NUMBER EXTRACTION:
  • Strip country code from mobile: "+91 9876543210" → country_code: "+91", mobile: "9876543210"
  • Normalize country code format with "+" prefix: "91" → "+91", "0091" → "+91"
  • If number starts with 91 and has 12 digits → country_code: "+91", remove first 2 digits
  • If number starts with 1 and has 11 digits → country_code: "+1", remove first digit
  • Multiple phones → first in mobile field, rest in crm_note as "Additional phones: X, Y"

RULE 4 — EMAIL EXTRACTION:
  Multiple emails → first in email field, rest in crm_note as "Additional emails: X, Y"

RULE 5 — DATE FORMAT:
  Convert to ISO 8601: "YYYY-MM-DDTHH:MM:SS.000Z"
  Handle: "29-06-2026", "06/29/2026", "June 29 2026", "29 Jun 2026 10:00" etc.
  If no date → use current: "${new Date().toISOString()}"

RULE 6 — SKIP RECORDS:
  Skip if record has NEITHER a valid email (contains "@") NOR a valid mobile (7+ digits).
  Set status: "skipped" with a clear reason.

RULE 7 — CRM NOTES CONSOLIDATION:
  Combine into crm_note: remarks + extra phones/emails + any info that doesn't fit elsewhere.
  Separate items with " | ".

════════════════════════════════════════════════════════════
RESPONSE FORMAT (STRICTLY JSON — NO OTHER TEXT)
════════════════════════════════════════════════════════════

{
  "results": [
    {
      "index": 0,
      "status": "success",
      "reason": null,
      "data": {
        "created_at": "2026-07-10T10:00:00.000Z",
        "name": "John Doe",
        "email": "john@example.com",
        "country_code": "+91",
        "mobile_without_country_code": "9876543210",
        "company": "Acme Corp",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "lead_owner": "agent@groweasy.com",
        "crm_status": "GOOD_LEAD_FOLLOW_UP",
        "crm_note": "Interested in 2BHK. Additional phones: 9123456789",
        "data_source": "eden_park",
        "possession_time": "Q3 2026",
        "description": "Looking for ready-to-move apartment"
      }
    }
  ]
}

For skipped records, include whatever was extracted in "data" and set "reason" to a clear explanation.
Return ONLY the JSON object. No markdown, no preamble, no trailing text.`;

// ─── Batch Extractor ─────────────────────────────────────────────────────────

/**
 * Extracts CRM fields from a batch of raw CSV row records using Claude.
 *
 * @param {Record<string, string>[]} records - Raw CSV rows for this batch
 * @param {number} batchStartIndex - Global index offset for this batch
 * @param {number} attempt - Current retry attempt (1-indexed)
 * @returns {Promise<ExtractionResult[]>}
 */
async function extractBatch(records, batchStartIndex, attempt = 1) {
  const indexedRecords = records.map((row, i) => ({ _idx: batchStartIndex + i, ...row }));

  const userMessage = `Extract CRM lead data from these ${records.length} CSV record(s) and map each to GrowEasy CRM format:

${JSON.stringify(indexedRecords, null, 2)}

Return ONLY the JSON response as specified in your instructions.`;

  try {
    const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${SYSTEM_PROMPT}

  ${userMessage}`,
  });

  const raw = response.text || "";
    // Strip markdown code fences if model wraps response
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.results || !Array.isArray(parsed.results)) {
      throw new Error('Invalid AI response: missing "results" array');
    }

    // Validate and normalize each result
    return parsed.results.map((r, i) => ({
      index: r.index ?? batchStartIndex + i,
      status: r.status === 'skipped' ? 'skipped' : 'success',
      reason: r.reason || null,
      data: normalizeCRMRecord(r.data || {})
    }));
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`Batch [${batchStartIndex}] attempt ${attempt} failed: ${err.message}. Retrying...`);
      await sleep(RETRY_DELAY_MS * attempt);
      return extractBatch(records, batchStartIndex, attempt + 1);
    }
    console.error(`Batch [${batchStartIndex}] failed after ${MAX_RETRIES} attempts:`, err.message);
    // Graceful fallback — mark entire batch as error skips
    return records.map((_, i) => ({
      index: batchStartIndex + i,
      status: 'skipped',
      reason: `AI extraction failed after ${MAX_RETRIES} attempts: ${err.message}`,
      data: buildEmptyCRMRecord()
    }));
  }
}

/**
 * Processes all CSV records through Claude in batches with progress callbacks.
 *
 * @param {Record<string, string>[]} records - All parsed CSV records
 * @param {function} onBatchComplete - Callback(processedCount, totalCount) after each batch
 * @returns {Promise<ExtractionResult[]>}
 */
async function extractAllRecords(records, onBatchComplete) {
  const batches = chunkArray(records, BATCH_SIZE);
  const allResults = [];
  let processedCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batchStartIndex = i * BATCH_SIZE;
    const batchResults = await extractBatch(batches[i], batchStartIndex);
    allResults.push(...batchResults);

    processedCount += batches[i].length;
    if (onBatchComplete) {
      onBatchComplete(processedCount, records.length);
    }
  }

  return allResults;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_CRM_STATUSES = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
const VALID_DATA_SOURCES = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

function normalizeCRMRecord(data) {
  const record = { ...buildEmptyCRMRecord(), ...data };

  // Validate crm_status
  if (!VALID_CRM_STATUSES.includes(record.crm_status)) {
    record.crm_status = 'DID_NOT_CONNECT';
  }

  // Validate data_source
  if (!VALID_DATA_SOURCES.includes(record.data_source)) {
    record.data_source = '';
  }

  // Ensure created_at is parseable
  if (record.created_at) {
    const d = new Date(record.created_at);
    record.created_at = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } else {
    record.created_at = new Date().toISOString();
  }

  // Ensure mobile is numeric string only
  if (record.mobile_without_country_code) {
    record.mobile_without_country_code = record.mobile_without_country_code
      .toString()
      .replace(/\D/g, '');
  }

  return record;
}

function buildEmptyCRMRecord() {
  return {
    created_at: '',
    name: '',
    email: '',
    country_code: '',
    mobile_without_country_code: '',
    company: '',
    city: '',
    state: '',
    country: '',
    lead_owner: '',
    crm_status: '',
    crm_note: '',
    data_source: '',
    possession_time: '',
    description: ''
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { extractAllRecords, extractBatch, BATCH_SIZE };
