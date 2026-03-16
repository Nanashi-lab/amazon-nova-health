# NovaHealth — AI Nursing Assistant

> An AI-powered nursing assistant that lets hospital nurses manage patients through natural conversation — text or voice. Built with three Amazon Nova models for the [Amazon Nova AI Hackathon](https://amazonnovahackathon.devpost.com/). #AmazonNova

![Category](https://img.shields.io/badge/Category-Agentic%20AI-blue)
![Track](https://img.shields.io/badge/Track-Professional%20Developer-green)
![Entry](https://img.shields.io/badge/Entry-Solo-orange)

**[Watch the Demo Video](https://vimeo.com/1173910181)** | **[Devpost](https://devpost.com/software/nova-health)** | **[Blog Post](https://gist.github.com/Nanashi-lab/1560bb70347f70e1850d67f87c6e819b)**

## The Problem

Nurses spend **25% of their shift on administrative tasks** — documenting patient information, searching records, logging medications, updating charts. That's 3 hours in a 12-hour shift spent on screens instead of patients.

Hospital software is built around forms, dropdowns, and multi-screen workflows. Admitting a patient and prescribing an initial medication can take 5 screens and 15 clicks. In a fast-paced ward, every second matters.

## The Solution

NovaHealth replaces click-heavy workflows with a conversational AI agent. Instead of navigating 5 screens to admit a patient and prescribe medication, the nurse says:

> _"Admit John Doe, 45 male, room 305, pneumonia, and prescribe Amoxicillin 500mg every 8 hours."_

The agent handles both operations in one turn — admits the patient, prescribes the medication, and checks for allergy conflicts before confirming. The nurse can also speak this naturally using voice mode, hands-free.

![Dashboard — Patient view with chat and tool call cards](screenshots/001.png)

![Semantic search and document viewer](screenshots/002.png)

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         NOVAHEALTH                               │
├──────────────────┬──────────────────┬────────────────────────────┤
│   FRONTEND       │    BACKEND       │     AWS BEDROCK            │
│                  │                  │                            │
│  Next.js 15      │  FastAPI         │  ┌──────────────────────┐  │
│  React 19        │  Python 3.12     │  │  Nova 2 Lite         │  │
│  Framer Motion   │                  │  │  (Agent Brain)       │  │
│                  │  Strands SDK     │  │  Reasoning +         │  │
│  ┌────────────┐  │  ┌────────────┐  │  │  Tool Calling        │  │
│  │ Dashboard  │ ─┼──┤ REST API   │  │  └──────────────────────┘  │
│  │ 3-Panel    │  │  │ SSE Stream │  │                            │
│  │ Layout     │  │  │ WebSocket  │  │  ┌──────────────────────┐  │
│  └────────────┘  │  └─────┬──────┘  │  │  Nova Embeddings     │  │
│                  │        │         │  │  (Semantic Search)   │  │
│  ┌────────────┐  │  ┌─────┴──────┐  │  │  1024-dim vectors    │  │
│  │ Voice UI   │ ─┼──┤ BidiAgent  │ ─┼──┤  pgvector cosine     │  │
│  │ AudioWork  │  │  │ WS Relay   │  │  └──────────────────────┘  │
│  │ let + PCM  │  │  └────────────┘  │                            │
│  └────────────┘  │                  │  ┌──────────────────────┐  │
│                  │  ┌────────────┐  │  │  Nova 2 Sonic        │  │
│                  │  │ PostgreSQL │  │  │  (Voice I/O)         │  │
│                  │  │ + pgvector │  │  │  Bidirectional       │  │
│                  │  └────────────┘  │  │  Speech-to-Speech    │  │
│                  │                  │  └──────────────────────┘  │
└──────────────────┴──────────────────┴────────────────────────────┘
```

### Three Nova Models, One System

| Model | Role | How It's Used |
|-------|------|---------------|
| **Nova 2 Lite** | Agent brain | Strands Agents SDK for reasoning and tool calling. Processes natural language, decides which tools to call, chains multiple operations, and generates responses. Powers both text chat (via SSE streaming) and voice (via BidiAgent). |
| **Nova Multimodal Embeddings** | Semantic search | Indexes patient records, lab reports, and clinical notes into 1024-dimensional vectors stored in pgvector. Enables meaning-based search — "heart attack" finds "Acute Myocardial Infarction" even though the words don't match. |
| **Nova 2 Sonic** | Voice I/O | Real-time bidirectional speech-to-speech via WebSocket. Nurse speaks naturally, agent responds with audio. Phone-call UX with multi-turn conversation — not push-to-talk. |

### How Strands Agents SDK Connects Everything

The [Strands Agents SDK](https://github.com/strands-agents/sdk-python) is the orchestration layer that connects Nova 2 Lite to our 8 Python tool functions. It handles the full agent loop:

1. **Receive** — nurse sends a message (text or voice transcript)
2. **Reason** — Nova 2 Lite analyzes the request and decides which tools to call
3. **Execute** — Strands calls the selected tool functions (e.g., `admit_patient`, `prescribe_medication`)
4. **Chain** — if the result requires follow-up, Nova reasons again and calls more tools
5. **Respond** — final response streamed back to the nurse via SSE (text) or audio (voice)

Nova Embeddings and Nova Sonic are called directly (not through Strands) — Embeddings during document ingest and search, Sonic via the BidiAgent WebSocket relay.

## Features

### Agent with 8 Tools and Multi-Tool Orchestration

The agent has 8 tools that cover the full patient management workflow. Each tool is a Python function decorated with `@tool` from Strands SDK, wired to real database operations.

| Tool | What It Does | Example Prompt |
|------|-------------|----------------|
| `get_patient` | Look up by ID, name, or room | _"What's the status of room 305?"_ |
| `list_patients` | List with status/condition filters | _"Show me all critical patients"_ |
| `admit_patient` | Create new patient record | _"Admit Jane Doe, 62F, room 210, CHF"_ |
| `update_patient` | Update status, vitals, condition, allergies | _"Update P003 vitals: HR 88, BP 130/85"_ |
| `prescribe_medication` | Add medication to patient chart | _"Prescribe Metoprolol 25mg BID for P001"_ |
| `administer_medication` | Log med administration with allergy safety check | _"Give Margaret Chen her Heparin"_ |
| `get_patient_documents` | Retrieve clinical notes and lab reports | _"Show me P001's documents"_ |
| `search_records` | Search with simple (keyword) or semantic (AI) mode | _"Search for diabetes records"_ |

**Multi-tool chaining** is a key capability. A single natural sentence can trigger multiple tool calls in sequence:

- _"Admit John Doe, 45M, room 305, pneumonia, and prescribe Amoxicillin 500mg q8h"_
  → `admit_patient` → `prescribe_medication` (two tools, one sentence)
- _"List critical patients and give me details on the first one"_
  → `list_patients` → `get_patient` (two tools, chained from results)

**Allergy safety** is built into `administer_medication`. When the nurse asks to give a medication that conflicts with a patient's known allergies, the agent:
1. Detects the conflict (e.g., Penicillin allergy vs. Penicillin V prescription)
2. Returns an `ALLERGY ALERT` warning to the nurse
3. Requires explicit nurse confirmation before proceeding
4. If confirmed, logs the override in the medication administration record

### Document Ingest Pipeline and Retrieval

Documents (doctor notes, lab reports, clinical notes) flow through a multi-stage ingest pipeline:

1. **Upload** — file saved to disk via REST endpoint or sidebar Upload button
2. **Extract** — text content extracted from the file (UTF-8)
3. **Embed** — Nova Multimodal Embeddings generates a 1024-dim vector
4. **Index** — vector stored in pgvector `embeddings` table for semantic search

The frontend shows an animated pipeline visualization during upload. Once indexed, documents are searchable via both keyword and semantic search, and retrievable by the agent via the `get_patient_documents` tool.

46 seed documents (doctor notes, lab reports, clinical notes) are pre-indexed on first startup to demonstrate the search capabilities immediately.

### Semantic Search

- Nova Multimodal Embeddings generates vectors for all documents at index time (`GENERIC_INDEX` purpose)
- Search queries are embedded with `GENERIC_RETRIEVAL` purpose for optimal retrieval
- pgvector cosine similarity ranking with relevance scores
- Two search modes accessible via toggle in the UI:
  - **Simple** — keyword-based database filter (ILIKE across patient fields, meds, documents)
  - **Semantic** — AI-powered meaning-based search across embedded documents
- The agent's `search_records` tool supports both modes

### Voice — Phone-Call Mode

- **Nova 2 Sonic** via Strands `BidiAgent` over WebSocket relay
- **AudioWorklet** captures PCM audio at 16kHz from the browser microphone
- **Bidirectional** — nurse speaks naturally, agent responds with audio, multi-turn within one session
- State-aware UI indicators: Listening → Thinking → Speaking
- Graceful degradation — if Sonic is unavailable, falls back to text chat
- Voice agent has the same 8 tools as text agent — full functionality hands-free

### Dashboard

- **Three-panel layout:** Sidebar (patient list, search, upload) | Main area (patient detail / search results) | Chat panel
- **Patient detail view:** vitals with abnormal value highlighting, current medications with dosages and last administration times, allergies, clinical documents
- **Framer Motion animations** throughout — panel transitions, tool call cards, typing indicators, upload pipeline stages
- **Chat session management** — create new sessions, switch between history, auto-titled from first message
- **Real-time tool call visualization** — expandable cards in chat showing which tools the agent called and their results

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Framer Motion, TypeScript |
| Backend | Python 3.12, FastAPI, Strands Agents SDK |
| Database | PostgreSQL 16 + pgvector |
| AI Models | Amazon Bedrock — Nova 2 Lite, Nova Multimodal Embeddings, Nova 2 Sonic |
| Auth | JWT (HS256), bcrypt password hashing |
| Streaming | SSE (text chat), WebSocket (voice) |
| Infra | Docker Compose (PostgreSQL), local dev server |
| Testing | pytest (68 tests), SQLite in-memory for test isolation |

## Project Structure

```
amazon-nova/
├── frontend/                  # Next.js 15 app
│   ├── app/                   # Pages (login, dashboard)
│   ├── components/
│   │   ├── chat/              # ChatInput, ChatMessage, ToolCallCard, TypingIndicator
│   │   ├── layout/            # TopNav, Sidebar, MainArea, ChatPanel
│   │   ├── login/             # LoginForm
│   │   ├── main/              # PatientDetail, AllPatients, EditPatientModal
│   │   └── sidebar/           # PatientList, SearchBar, UploadModal, AddPatientModal
│   └── lib/                   # API client, context, useVoice hook, types, utils
├── backend/                   # FastAPI app
│   ├── agents/
│   │   ├── nova_agent.py      # Text agent — Strands Agent + Nova 2 Lite + 8 tools
│   │   ├── bidi_agent.py      # Voice agent — Strands BidiAgent + Nova 2 Sonic + 8 tools
│   │   └── tools.py           # 8 @tool functions wired to DB services
│   ├── api/                   # REST endpoints (auth, chat, patients, meds, search, docs, voice)
│   ├── models/                # SQLAlchemy ORM (patient, medication, document, chat, user)
│   ├── schemas/               # Pydantic request/response validation
│   ├── services/              # Business logic (auth, patient, medication, search, semantic, ingest)
│   ├── data/
│   │   ├── seed.py            # Idempotent seed script (12 patients, 46 documents)
│   │   └── seed_documents/    # 46 sample clinical documents (doctor notes, lab reports)
│   └── tests/                 # 68 pytest tests (tools, API, services, models)
├── docker-compose.yml         # PostgreSQL 16 + pgvector
├── .env.example               # All configurable environment variables
├── .github/workflows/ci.yml   # GitHub Actions CI
└── README.md
```

## Setup & Run

### Prerequisites

- **AWS credentials** configured with Bedrock access (see below)
- **Docker** (for PostgreSQL + pgvector)
- **Node.js 24+**
- **Python 3.12+**

### AWS Setup

The backend uses **boto3's default credential chain** to authenticate with AWS Bedrock. No API keys are stored in the project — configure your local AWS CLI:

```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: us-east-1
# Output format: json
```

Your IAM user/role needs access to these Bedrock models in `us-east-1`:
- `us.amazon.nova-2-lite-v1:0` — agent reasoning and tool calling
- `amazon.nova-2-multimodal-embeddings-v1:0` — semantic search embeddings
- `amazon.nova-2-sonic-v1:0` — voice input/output

The simplest policy is `AmazonBedrockFullAccess`. See `.env.example` for all configurable environment variables.

### 1. Start Database

```bash
docker compose up -d
```

This starts PostgreSQL 16 with the pgvector extension. Data is persisted in a Docker volume (`pgdata`).

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run from the **project root** (not from `backend/`):

```bash
cd ..
backend/.venv/bin/uvicorn backend.main:app --reload --reload-dir backend
```

On first startup, the backend automatically:
- Creates all database tables (patients, medications, documents, embeddings, chat sessions)
- Seeds a demo user (`nurse@novahealth.ai` / `nova2026`)
- Seeds 12 patients with medications, vitals, and allergies
- Indexes 46 clinical documents with Nova Multimodal Embeddings

Seeding is **idempotent** — it checks if data already exists and skips on subsequent startups. To skip seeding entirely (e.g., on a fresh database where you don't want to wait for embedding indexing):

```bash
SKIP_SEED=1 backend/.venv/bin/uvicorn backend.main:app --reload --reload-dir backend
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Run Tests

Tests use an in-memory SQLite database — **no PostgreSQL or AWS credentials needed**.

```bash
# From the project root
PYTHONPATH=. backend/.venv/bin/pytest backend/tests/ -v
```

68 tests covering:
- All 8 agent tools (26 tests) — patient CRUD, medication prescribing/administration, allergy safety, document retrieval, search
- REST API endpoints (12 tests) — auth, chat SSE streaming, session management
- Service layer (10 tests) — patient, medication, document ingest, search
- Data seeding (5 tests) — idempotent seed verification
- Semantic search (3 tests) — embedding mock, cosine similarity
- Voice WebSocket (5 tests) — auth, connection lifecycle
- Other (7 tests) — chat service, document upload

CI runs automatically on push/PR to `main` via GitHub Actions (`.github/workflows/ci.yml`).

### 5. Open

Navigate to [http://localhost:3000](http://localhost:3000) and log in with:
- **Email:** `nurse@novahealth.ai`
- **Password:** `nova2026`

## Demo Scenarios

### 1. Multi-Tool Chaining (Admit + Prescribe)

> _"Admit John Doe, 45 male, room 305, pneumonia, and prescribe Amoxicillin 500mg every 8 hours"_

The agent calls `admit_patient` to create the patient record, then automatically chains to `prescribe_medication` to add the prescription — two database operations from one natural sentence. The chat UI shows expandable tool call cards for each step.

### 2. Allergy Safety Check

> _"Give Margaret Chen Penicillin"_

Margaret Chen (P001) has a documented Penicillin allergy. The agent's `administer_medication` tool detects the conflict and returns an `ALLERGY ALERT` warning. The agent presents this to the nurse and asks for explicit confirmation. The nurse can say "go ahead" to override (logged with notes) or "cancel" to abort.

### 3. Semantic Search

> _"heart attack"_ (in semantic search mode)

Nova Multimodal Embeddings finds documents about "Acute Myocardial Infarction" — understanding medical meaning, not just keyword matching. The search returns relevance-ranked results with snippets from doctor notes and lab reports.

### 4. Voice Interaction

Click the microphone → speak naturally → hear the agent respond with audio → continue the conversation. The voice agent has the same 8 tools and capabilities as text chat. State indicators show Listening → Thinking → Speaking in real time.

### 5. Document Retrieval

> _"Show me Margaret Chen's documents"_

The agent calls `get_patient_documents` and returns a list of clinical notes, lab reports, and uploaded files with summaries. Documents were indexed through the ingest pipeline (upload → extract → embed → index).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock API calls |
| `JWT_SECRET` | `novahealth-dev-secret-2026` | Secret for signing JWT tokens (change for production) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `DATABASE_URL` | `postgresql://nova:nova@localhost:5432/novahealth` | PostgreSQL connection string |
| `SKIP_SEED` | _(unset)_ | Set to `1`, `true`, or `yes` to skip seeding on startup |

## License

Built for the Amazon Nova AI Hackathon. MIT License.
