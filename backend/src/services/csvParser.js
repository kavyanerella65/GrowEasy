const Papa = require('papaparse');

/**
 * Parses a CSV string into headers and row records.
 * Handles various encodings, BOM markers, and encoding issues.
 *
 * @param {string} csvContent - Raw CSV file content as string
 * @returns {{ headers: string[], records: Record<string, string>[] }}
 */
function parseCSV(csvContent) {
  // Strip UTF-8 BOM if present
  const cleaned = csvContent.replace(/^\uFEFF/, '').trim();

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    trimHeaders: true,
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  });

  if (result.errors && result.errors.length > 0) {
    const criticalErrors = result.errors.filter(e => e.type === 'Delimiter');
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parse error: ${criticalErrors[0].message}`);
    }
    // Log non-critical errors but don't throw
    console.warn('CSV parse warnings:', result.errors.map(e => e.message).join('; '));
  }

  const headers = (result.meta.fields || []).filter(Boolean);
  const records = (result.data || []).filter(row =>
    // Keep rows that have at least one non-empty value
    Object.values(row).some(v => v && v.toString().trim() !== '')
  );

  return { headers, records };
}

/**
 * Splits an array into chunks of the given size.
 *
 * @param {any[]} array
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = { parseCSV, chunkArray };
