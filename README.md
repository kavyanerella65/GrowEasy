# GrowEasy — AI-Powered CSV Importer

> **Assignment submission for GrowEasy Software Developer role**
> **Position applied for:** Software Developer Intern
> **Submitted by:** Kavya Nerella | kavyanerella65@gmail.com

An intelligent CSV importer that accepts leads from **any CSV format** — Facebook Ads, Google Ads, real estate CRMs, Excel exports, or custom spreadsheets — and uses **Gemini AI** to accurately map fields into GrowEasy CRM format.

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| Frontend | https://groweasy-csv-importer.vercel.app |
| Backend API | https://groweasy-api.railway.app |
| Health Check | https://groweasy-api.railway.app/api/health |

---

## ✨ Features

### Core
- **Drag & Drop** CSV upload with instant client-side preview
- **AI Field Mapping** — Gemini gemini-2.5-flash intelligently maps any column names to CRM fields
- **SSE Streaming** — real-time progress updates as each batch is processed
- **Batch Processing** — records processed in groups of 10 with 3-retry mechanism
- **Results Dashboard** — summary stats + searchable imported/skipped tables
- **Export to CSV** — download extracted CRM records

### Bonus
- ✅ Drag & Drop upload
- ✅ Progress indicators with streaming (SSE)
- ✅ Retry mechanism (3 attempts with exponential backoff)
- ✅ Virtualized / paginated tables for large CSVs
- ✅ Dark mode
- ✅ Unit tests (Jest + Supertest)
- ✅ Docker setup (single `docker-compose up` command)
- ✅ Deployable to Vercel + Railway

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js)                       │
│  Step 1: Drag & Drop  →  Step 2: Preview  →  Step 3: Progress  │
│                                                ↑ SSE stream     │
└──────────────────────────┬──────────────────────────────────────┘
                           │  POST /api/import/process (FormData)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express Backend (Node.js)                   │
│                                                                 │
│   Multer (file upload)                                          │
│       ↓                                                         │
│   PapaParse (CSV → JSON records)                               │
│       ↓                                                         │
│   Batch Processor (chunks of 10)                               │
│       ↓          ↓ SSE events per batch                        │
│   Gemini AI (gemini-2.5-flash)  ←─ Retry (3x)               │
│       ↓                                                         │
│   Structured CRM JSON → SSE 'complete' event                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
groweasy-csv-importer/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express server entry
│   │   ├── routes/
│   │   │   └── import.js            # POST /api/import/process (SSE)
│   │   ├── services/
│   │   │   ├── csvParser.js         # PapaParse wrapper
│   │   │   └── aiExtractor.js       # Gemini batching + retry + prompt
│   │   └── __tests__/
│   │       └── import.test.js       # Jest + Supertest unit tests
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Main wizard page
│   │   │   └── globals.css          # Tailwind + custom styles
│   │   ├── components/
│   │   │   ├── StepIndicator.tsx    # 4-step wizard progress bar
│   │   │   ├── DropZone.tsx         # react-dropzone + PapaParse preview
│   │   │   ├── PreviewTable.tsx     # Scrollable preview with sticky headers
│   │   │   ├── ImportProgress.tsx   # SSE progress UI
│   │   │   └── ResultsTable.tsx     # Imported/skipped results + export
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript types
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 20+
- npm 9+
- Gemini API key — get one at [console.gemini.com](https://console.gemini.com)

### 1. Clone & Install

```bash
git clone https://github.com/kavyanerella65/groweasy-csv-importer.git
cd groweasy-csv-importer
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm run dev       # Starts on http://localhost:5000
```

### 3. Configure Frontend

```bash
cd ../frontend
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm install
npm run dev       # Starts on http://localhost:3000
```

### 4. Open in Browser

Navigate to **http://localhost:3000** and upload a CSV file.

---

## 🐳 Docker Setup (Recommended)

```bash
# Clone the repo
git clone https://github.com/kavyanerella65/groweasy-csv-importer.git
cd groweasy-csv-importer

# Add your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Build and start both services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

---

## 🧪 Running Tests

```bash
cd backend
npm install
npm test
```

Tests cover:
- CSV parsing (BOM stripping, empty rows, quoted fields)
- Chunk array utility
- API route validation (no file, SSE content-type)
- Health check endpoint

---

## 🌐 Deployment

### Backend → Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Select the `backend/` folder as root
3. Add environment variable: `GEMINI_API_KEY=your_key`
4. Railway auto-detects Node.js and deploys

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
4. Deploy

---

## 🤖 AI Prompt Engineering

The AI extraction uses a carefully engineered system prompt that handles:

| Challenge | Solution |
|---|---|
| Non-standard column names | Semantic mapping (50+ column name variations documented) |
| Multiple phone/email fields | First value in field, rest appended to `crm_note` |
| Phone number parsing | Country code extraction and normalization to `+XX` format |
| Status inference | 4 allowed values mapped from 30+ status phrases |
| Data source matching | Case-insensitive match against 5 allowed values |
| Missing dates | Falls back to current ISO timestamp |
| Invalid records | Skipped with clear reason if no email AND no phone |
| Batch failures | Entire batch retried up to 3× with exponential backoff |

---

## 📦 CRM Fields Extracted

| Field | Description |
|---|---|
| `created_at` | Lead creation date (ISO 8601) |
| `name` | Full lead name |
| `email` | Primary email address |
| `country_code` | Country calling code (e.g. +91) |
| `mobile_without_country_code` | Mobile number only |
| `company` | Company/organization |
| `city` | City |
| `state` | State/province |
| `country` | Country |
| `lead_owner` | Assigned agent/owner |
| `crm_status` | One of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE |
| `crm_note` | Notes, remarks, extra contacts |
| `data_source` | One of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots |
| `possession_time` | Property possession date/time |
| `description` | Additional description |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, react-dropzone, PapaParse |
| Backend | Node.js, Express 4, Multer, PapaParse, Morgan |
| AI | Google Gemini gemini-2.5-flash via `@google/genai` |
| Streaming | Server-Sent Events (SSE) for real-time progress |
| Testing | Jest, Supertest |
| Containerization | Docker, Docker Compose |
| Deployment | Vercel (frontend), Railway (backend) |

---

## 📝 API Reference

### `POST /api/import/process`

Accepts a CSV file and returns an SSE stream.

**Request:** `multipart/form-data` with field `file` (CSV, max 50MB)

**Response:** `text/event-stream`

```
data: {"type":"start","total":150,"message":"Parsed 150 records..."}

data: {"type":"progress","processed":10,"total":150,"percentage":7}

data: {"type":"progress","processed":20,"total":150,"percentage":13}

data: {"type":"complete","totalImported":148,"totalSkipped":2,"imported":[...],"skipped":[...]}
```

### `GET /api/health`

```json
{ "status": "ok", "timestamp": "2026-07-10T10:00:00.000Z" }
```

---

## 📬 Submission

- **GitHub:** https://github.com/kavyanerella65/groweasy-csv-importer
- **Live App:** https://groweasy-csv-importer.vercel.app
- **Applicant:** Kavya Nerella — kavyanerella65@gmail.com
- **Position:** Software Developer Intern
- **Submitted to:** varun@groweasy.ai
