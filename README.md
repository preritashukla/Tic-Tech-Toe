# 🚀 Agentic MCP Gateway

### Quintessential Quincoders — Tic Tech Toe '26
**Problem Statement #6 | Domain: MCP Integrations & Agentic AI**
**Venue: DAU, Gandhinagar | April 10–12, 2026**

---

## What It Does

The **Agentic MCP Gateway** is an AI-powered orchestration layer that converts natural language commands into executable, multi-step workflows across **Jira, GitHub, Slack, and Google Sheets** — orchestrated via the **Model Context Protocol (MCP)**.

> **Example Input:**
> *"Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"*

The system automatically:
1. 🧠 **Decomposes** this into a validated DAG using LLM planning
2. ⚡ **Executes** each step via the appropriate MCP server
3. 🔄 **Handles failures** with exponential backoff retry
4. 🔒 **Asks for human approval** on sensitive actions (HITL)
5. 📡 **Streams** real-time status to the frontend via SSE

---

## Architecture

```
<<<<<<< HEAD
User Input (Natural Language)
        ↓
  LLM Planner (Groq / LLaMA 3.3-70B)
        ↓ generates DAG JSON
  Agent Core (FastAPI + MCP SDK)
        ↓ executes nodes
  MCP Servers: Jira | GitHub | Slack | Sheets
        ↓
  Logs + Final Response → Frontend (Next.js/React)
=======
┌─────────────────────────────────────────────────────────────────┐
│                    User Input (Natural Language)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     LLM Planner        │
              │  Groq / LLaMA 3.3-70B │
              └───────────┬────────────┘
                          │ Generates DAG JSON
                          ▼
              ┌────────────────────────┐
              │     Agent Core         │
              │  FastAPI + MCP SDK     │
              │                        │
              │  ┌──────────────────┐  │
              │  │ Context Manager  │  │  ← Template resolution
              │  │ Execution Bridge │  │  ← HTTP ↔ Engine adapter
              │  │ Audit Logger     │  │  ← Security compliance
              │  └──────────────────┘  │
              └───────────┬────────────┘
                          │ Executes nodes
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
         │  Jira  │ │ GitHub │ │ Slack  │ │ Sheets │
         │  MCP   │ │  MCP   │ │  MCP   │ │  MCP   │
         └────────┘ └────────┘ └────────┘ └────────┘
                          │
                          ▼
              Logs + Final Response → Frontend (Next.js)
>>>>>>> 82c809b (fastapi backend)
```

---

## Project Structure

```
agentic_mcp/
├── main.py                          # FastAPI app — CORS, health, audit endpoints
├── prompt_engine.py                 # Prerita's standalone DAG generator
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
├── docker-compose.yml               # Mock MCP server containers
│
├── models/                          # Pydantic data models
│   ├── dag.py                       #   DAG schema — cycle detection, validation
│   ├── requests.py                  #   API request/response contracts
│   └── execution.py                 #   Runtime execution state
│
├── services/                        # Core business logic
│   ├── llm.py                       #   Groq Llama 3.3-70B integration
│   ├── context.py                   #   Template resolution & state management
│   ├── executor.py                  #   Execution Bridge (HTTP adapter to Grishma's engine)
│   └── audit.py                     #   Structured audit logging & security
│
├── routers/                         # FastAPI route handlers
│   ├── plan.py                      #   POST /plan — NL → DAG generation
│   └── execute.py                   #   POST /execute — DAG execution + SSE
│
├── prompts/                         # LLM prompt engineering
│   └── system_prompt.py             #   Tool specs + system prompt (from Prerita)
│
├── mocks/                           # Mock MCP servers (Docker)
│   ├── jira/
│   ├── github/
│   ├── slack/
│   └── sheets/
│
└── agentic_mcp_gateway/             # Grishma's standalone executor
    ├── executor.py                  #   Core DAG executor with retry
    ├── agentic_executor.py          #   Production executor with HITL + timeout
    ├── models.py                    #   Dataclass DAG models
    ├── hitl.py                      #   Human-in-the-loop approval gate
    ├── observability.py             #   Structured execution logger
    ├── mock_mcp_servers.py          #   MCP tool simulator
    └── sample_dag.json              #   Example DAG for testing
```

---

## Team Responsibilities

| Member | Role | Deliverable |
|---|---|---|
| **Prerita Shukla** | Prompt Engineer | System prompt, DAG schema design, `prompt_engine.py` |
| **Shivam Kumar** | LLM Systems Developer | FastAPI backend, Groq integration, context manager, `/plan` + `/execute` APIs, execution bridge |
| **Grishma** | Execution Engine | Core DAG executor with retry, parallel scheduling, HITL gates, observability logging |
| **Hemaksh** | Infrastructure | Mock MCP servers (Docker), deployment |
| **Tejas** | Frontend | Next.js UI — chat input, live DAG viz, HITL approval modal |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health + service status |
| `POST` | `/plan` | Generate DAG from natural language input |
| `POST` | `/plan/validate` | Validate an existing DAG schema |
| `POST` | `/execute` | Execute DAG (synchronous response) |
| `POST` | `/execute/stream` | Execute DAG with SSE real-time streaming |
| `POST` | `/execute/approve/{exec_id}/{node_id}` | HITL approval gate |
| `GET` | `/audit/logs` | Retrieve audit trail (filterable) |
| `GET` | `/audit/stats` | Audit event statistics |
| `GET` | `/audit/security` | Security-relevant events |
| `GET` | `/docs` | Swagger API documentation |
| `GET` | `/redoc` | ReDoc API documentation |

### DAG JSON Schema (The Contract)

```json
{
  "workflow_name": "bug_fix_pipeline",
  "nodes": [
    {
      "id": "node_1",
      "tool": "jira",
      "action": "get_issue",
      "params": { "issue_id": "JIRA-102" },
      "depends_on": []
    },
    {
      "id": "node_2",
      "tool": "github",
      "action": "create_branch",
      "params": {
        "repo": "main-app",
        "branch_name": "fix/{{node_1.output.issue_id}}"
      },
      "depends_on": ["node_1"]
    },
    {
      "id": "node_3",
      "tool": "slack",
      "action": "send_message",
      "params": {
        "channel": "#on-call",
        "message": "Branch created for {{node_1.output.issue_id}}"
      },
      "depends_on": ["node_2"]
    },
    {
      "id": "node_4",
      "tool": "sheets",
      "action": "append_row",
      "params": {
        "spreadsheet_id": "incident-tracker",
        "data": { "issue": "{{node_1.output.issue_id}}", "status": "in_progress" }
      },
      "depends_on": ["node_2"],
      "requires_approval": true
    }
  ]
}
```

> Nodes 3 and 4 share the same `depends_on` — they run **in parallel**.
> Template refs like `{{node_1.output.issue_id}}` are resolved at runtime by the Context Manager.

---

## Supported Tools & Actions

<<<<<<< HEAD
**Frontend (Tejas)**
React/Vite UI with three screens:
- NL input chat
- Live DAG execution view with per-step status
- HITL approval modal for sensitive actions
=======
| Tool | Actions | Description |
|---|---|---|
| `jira` | `get_issue`, `create_issue`, `update_issue` | Issue tracking & project management |
| `github` | `create_branch`, `create_pr`, `merge_pr` | Source code & pull request management |
| `slack` | `send_message`, `create_channel` | Team communication & notifications |
| `sheets` | `read_row`, `update_row`, `append_row` | Spreadsheet data & incident tracking |
>>>>>>> 82c809b (fastapi backend)

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | LLaMA 3.3-70B via Groq API (ultra-fast ~200ms inference) |
| Backend | Python 3.13, FastAPI, Pydantic v2, SSE-Starlette |
| Prompt Engine | Custom system prompt with tool specs + JSON recovery |
| Execution | Async DAG runner with topological parallel scheduling |
| Infrastructure | Docker (Mock MCP Servers) |
<<<<<<< HEAD
| Frontend | React, Vite, Tailwind CSS, Material UI, React Flow |
=======
| Frontend | Next.js / React |
| Security | Audit logging, HITL gates, credential scoping, param redaction |
>>>>>>> 82c809b (fastapi backend)

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd agentic-mcp-gateway
<<<<<<< HEAD
pip install groq python-dotenv fastapi uvicorn
=======
pip install -r requirements.txt
>>>>>>> 82c809b (fastapi backend)
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Groq API key:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

> 🔑 Get your free key at [console.groq.com](https://console.groq.com) → API Keys → Create Key.

### 3. Run mock MCP servers (optional)

```bash
docker-compose up -d
```

### 4. Start the backend

```bash
python main.py
# or: python -m uvicorn main:app --reload --port 8000
```

<<<<<<< HEAD
### 5. Run the frontend
The frontend is located in the `frontend/` directory and can run completely standalone without the backend to demo the simulated capabilities, or connected to the real backend.

To run with real backend endpoints: edit `frontend/src/lib/api.ts` and set `USE_MOCK = false;`.

```bash
cd frontend
npm install
npm run dev
=======
### 5. Start the frontend

```bash
cd frontend
npm install && npm run dev
```

### 6. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Generate a DAG from natural language
curl -X POST http://localhost:8000/plan \
  -H "Content-Type: application/json" \
  -d '{"user_input": "Critical bug in Jira → Create GitHub branch → Notify Slack → Update tracker"}'

# Execute a DAG
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{"dag": {"workflow_name": "test", "nodes": [...]}, "auto_approve": true}'
>>>>>>> 82c809b (fastapi backend)
```

---

## Key Features

### 🧠 Workflow Decomposition Engine
Converts natural language into a validated DAG via LLM. Handles retry logic, JSON extraction from markdown fences, and Pydantic schema validation. Falls back gracefully on LLM errors.

### 📦 Context Management System
Maintains state across execution — stores node outputs, resolves `{{node_X.output.field}}` templates, handles large payloads via LLM summarization, and tracks multi-turn conversation state.

### ⚡ Reliable Execution Engine
Executes DAG nodes in topological order with parallelism for independent nodes. Features:
- Exponential backoff retry (configurable max_attempts, backoff_factor)
- Timeout boundaries per node
- Failure recovery — skip downstream nodes on upstream failure
- Resume from failed node support

### 🔒 Human-in-the-Loop (HITL)
Sensitive actions (e.g., `merge_pr`, `update_row`) can set `"requires_approval": true`. The execution engine pauses and the frontend shows an approval modal before proceeding.

### 📡 Real-Time Streaming (SSE)
The `/execute/stream` endpoint sends Server-Sent Events for every execution lifecycle event:
`workflow_start → node_start → node_running → node_success/failed/retry → workflow_complete`

### 🔐 Security & Audit Compliance
- Every tool invocation logged with timestamp, params, response, duration
- Sensitive parameters auto-redacted (passwords, tokens, API keys)
- HITL approval/rejection fully audited
- Queryable audit trail via `/audit/logs`, `/audit/stats`, `/audit/security`

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| LLM returns markdown fences | Stripped automatically via regex |
| Malformed JSON from LLM | Retried with enhanced "output valid JSON only" prompt |
| Pydantic schema validation failure | Retried with normalized field names |
| Invalid API key | Clean error, no retry, helpful message |
| All LLM retries fail | Returns structured error response |
| MCP tool transient failure | Exponential backoff retry (2ⁿ seconds) |
| MCP tool permanent failure | Node marked FAILED, downstream nodes SKIPPED |
| Circular DAG dependency | Caught at validation time via Kahn's algorithm |
| HITL rejection | Node skipped, downstream cascade |
| Large API response (>2000 chars) | Auto-summarized via LLM before storing in context |

---

## Demo Scenario

```
Input: "Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"

Execution Plan: 3 layers → [['node_1'], ['node_2'], ['node_3', 'node_4']]

[✅] Layer 1: node_1 (jira.get_issue)        → JIRA-102 detected       — 456ms
[✅] Layer 2: node_2 (github.create_branch)   → fix/jira-102 created    — 249ms
[✅] Layer 3: node_3 (slack.send_message)      → #on-call notified       — 343ms  ← PARALLEL
[✅] Layer 3: node_4 (sheets.append_row)       → Row 46 appended         — 750ms  ← PARALLEL

Total: 4/4 succeeded | 0 failed | 1460ms
Audit events: 10 (workflow_start, 4× tool_invocation, 4× tool_success, workflow_complete)
```

---

## Why We're Different

| Capability | Manual | Zapier/Make | AI Copilots | **Ours** |
|---|---|---|---|---|
| Natural Language Input | ✗ | ✗ | ✓ | ✓ |
| Multi-Step Planning | ✗ | Rigid Rules | ✓ | ✓ Dynamic DAG |
| Autonomous Execution | ✗ | Partial | ✗ | ✓ Parallel + Retry |
| Dynamic Recovery | ✗ | ✗ | ✗ | ✓ Exponential Backoff |
| Human-in-the-Loop | ✗ | ✗ | ✗ | ✓ Per-Node Gates |
| Audit Compliance | ✗ | Partial | ✗ | ✓ Full Trail |
| Real-Time Streaming | ✗ | ✗ | ✗ | ✓ SSE Events |

<<<<<<< HEAD
> Only system supporting full lifecycle automation with Human-in-the-Loop control.
=======
> **Only system supporting full lifecycle automation with Human-in-the-Loop control, real-time observability, and security audit compliance.**

---

## License

Built for Tic Tech Toe '26 Hackathon. All rights reserved by Team Quintessential Quincoders.
>>>>>>> 82c809b (fastapi backend)
