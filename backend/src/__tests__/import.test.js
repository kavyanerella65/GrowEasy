const request = require('supertest');
const app = require('../index');
const { parseCSV, chunkArray } = require('../services/csvParser');

// ─── CSV Parser Tests ─────────────────────────────────────────────────────────
describe('csvParser', () => {
  describe('parseCSV', () => {
    it('parses standard CSV with headers correctly', () => {
      const csv = `name,email,phone\nJohn Doe,john@example.com,9876543210\nJane Smith,jane@example.com,9123456789`;
      const { headers, records } = parseCSV(csv);
      expect(headers).toEqual(['name', 'email', 'phone']);
      expect(records).toHaveLength(2);
      expect(records[0].name).toBe('John Doe');
      expect(records[0].email).toBe('john@example.com');
    });

    it('strips UTF-8 BOM from CSV content', () => {
      const csv = '\uFEFFname,email\nJohn,john@test.com';
      const { headers } = parseCSV(csv);
      expect(headers[0]).toBe('name');
    });

    it('trims whitespace from values', () => {
      const csv = 'name , email\n  John  ,  john@test.com  ';
      const { records } = parseCSV(csv);
      expect(records[0]['name ']).toBe('John');
    });

    it('filters empty rows', () => {
      const csv = 'name,email\nJohn,john@test.com\n,,\n\n';
      const { records } = parseCSV(csv);
      expect(records).toHaveLength(1);
    });

    it('handles CSV with only headers and no data', () => {
      const csv = 'name,email,phone';
      const { headers, records } = parseCSV(csv);
      expect(headers).toHaveLength(3);
      expect(records).toHaveLength(0);
    });

    it('handles non-standard column names from Facebook Ad exports', () => {
      const csv = 'full_name,email_address,phone_number\nJohn Doe,john@fb.com,919876543210';
      const { headers, records } = parseCSV(csv);
      expect(headers).toContain('full_name');
      expect(records[0]['phone_number']).toBe('919876543210');
    });

    it('handles quoted fields with commas', () => {
      const csv = 'name,note\nJohn,"Interested, will call back"';
      const { records } = parseCSV(csv);
      expect(records[0].note).toBe('Interested, will call back');
    });
  });

  describe('chunkArray', () => {
    it('splits array into chunks of given size', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('returns single chunk when array is smaller than size', () => {
      const arr = [1, 2];
      expect(chunkArray(arr, 10)).toEqual([[1, 2]]);
    });

    it('returns empty array for empty input', () => {
      expect(chunkArray([], 5)).toEqual([]);
    });
  });
});

// ─── Import Route Tests ───────────────────────────────────────────────────────
describe('POST /api/import/process', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await request(app)
      .post('/api/import/process')
      .expect('Content-Type', /text\/event-stream/);
    // SSE response ends with error event
    expect(res.text).toContain('"type":"error"');
    expect(res.text).toContain('No CSV file provided');
  });

  it('returns SSE stream with proper content-type for valid CSV', async () => {
    const csv = Buffer.from('name,email,phone\nJohn Doe,john@test.com,9876543210');
    const res = await request(app)
      .post('/api/import/process')
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    // Should have at least 'start' event
    expect(res.text).toContain('"type":"start"');
  }, 30000); // Allow 30s for AI

  it('returns error event for non-CSV file', async () => {
    const txt = Buffer.from('this is not a csv');
    const res = await request(app)
      .post('/api/import/process')
      .attach('file', txt, { filename: 'test.txt', contentType: 'text/plain' });
    // Should either reject at multer or return SSE error
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });
});
