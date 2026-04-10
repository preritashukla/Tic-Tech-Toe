# Agentic MCP Gateway
### Quintessential Quincoders — Tic Tech Toe '26
**Problem Statement #6 | Domain: MCP Integrations & Agentic AI**
**Venue: DAU, Gandhinagar | April 10–12, 2026**

---

## What It Does

The Agentic MCP Gateway converts natural language commands into executable, multi-step workflows across Jira, GitHub, Slack, and Google Sheets — orchestrated via the Model Context Protocol (MCP).

**Example:**
> "Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"

The system automatically decomposes this into a DAG, executes each step via the appropriate MCP server, handles failures, and asks for human approval on sensitive actions.

---

## Architecture

```
User Input (Natural Language)
        ↓
  LLM Planner (Groq / LLaMA 3.3-70B)
        ↓ generates DAG JSON
  Agent Core (FastAPI + MCP SDK)
        ↓ executes nodes
  MCP Servers: Jira | GitHub | Slack | Sheets
        ↓
  Logs + Final Response → Frontend (Next.js/React)
```

### Key Components

**Workflow Decomposition Engine (`prompt_engine.py`)**
Converts natural language into a validated DAG JSON via the LLM. Handles retry logic, JSON extraction, and schema validation.

**DAG JSON Schema (the contract)**
```json
{
  "workflow_name": "bug_fix_pipeline",
  "nodes": [
    { "id": "node_1", "tool": "jira", "action": "get_issue", "params": {}, "depends_on": [] },
    { "id": "node_2", "tool": "github", "action": "create_branch", "params": {}, "depends_on": ["node_1"] },
    { "id": "node_3", "tool": "slack", "action": "send_message", "params": {}, "depends_on": ["node_2"] },
    { "id": "node_4", "tool": "sheets", "action": "append_row", "params": {}, "depends_on": ["node_2"] }
  ]
}
```
Nodes 3 and 4 share the same `depends_on` — they run in **parallel**.

**Execution Engine (Grishma)**
Executes DAG nodes sequentially and in parallel with retry + exponential backoff. Resumes from failed nodes. Emits logs per step.

**FastAPI Backend (Shivam)**
`/plan` endpoint calls `generate_dag()` from `prompt_engine.py`. Routes tool calls to the correct MCP server.

**Mock MCP Servers (Hemaksh)**
Docker containers mocking Jira, GitHub, Slack, and Sheets APIs for local development and testing.

**Frontend (Tejas)**
React/Vite UI with three screens:
- NL input chat
- Live DAG execution view with per-step status
- HITL approval modal for sensitive actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | LLaMA 3.3-70B via Groq API |
| Backend | Python, FastAPI, MCP SDK |
| Prompt Engine | `prompt_engine.py` with validation + retry |
| Infrastructure | Docker (Mock MCP Servers) |
| Frontend | React, Vite, Tailwind CSS, Material UI, React Flow |

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd agentic-mcp-gateway
pip install groq python-dotenv fastapi uvicorn
```

### 2. Set environment variables

Create a `.env` file in the root:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

Get your free key at [console.groq.com](https://console.groq.com) → API Keys → Create Key.

### 3. Run mock MCP servers

```bash
docker-compose up
```

### 4. Run the backend

```bash
uvicorn main:app --reload
```

### 5. Run the frontend
The frontend is located in the `frontend/` directory and can run completely standalone without the backend to demo the simulated capabilities, or connected to the real backend.

To run with real backend endpoints: edit `frontend/src/lib/api.ts` and set `USE_MOCK = false;`.

```bash
cd frontend
npm install
npm run dev
```

---

## Prompt Engine (`prompt_engine.py`)

The core of Prerita's role. Converts any natural language input to a validated DAG.

```python
from prompt_engine import generate_dag

dag = generate_dag("Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update tracker")
# Returns validated DAG dict, ready for the execution engine
```

### Supported Tools & Actions

| Tool | Actions |
|---|---|
| `jira` | `get_issue`, `create_issue`, `update_issue` |
| `github` | `create_branch`, `create_pr`, `merge_pr` |
| `slack` | `send_message`, `create_channel` |
| `sheets` | `read_row`, `update_row`, `append_row` |

### Error Handling

| Scenario | Behaviour |
|---|---|
| LLM returns markdown fences | Stripped automatically |
| Malformed JSON | Retried up to 2 times |
| Schema validation failure | Retried with same prompt |
| Invalid API key | Clean error, no retry |
| All retries fail | Returns safe fallback `{ "nodes": [] }` |

---

## Human-in-the-Loop (HITL)

Sensitive actions (e.g. `merge_pr`, `update_row`) set `"requires_approval": true` in the DAG node. The execution engine pauses and the frontend shows an approval modal before proceeding.

```json
{
  "id": "node_3",
  "tool": "github",
  "action": "merge_pr",
  "requires_approval": true,
  "params": {}
}
```

---

## Failure Handling Strategy

| Failure Type | Recovery |
|---|---|
| API Timeout | Retry with exponential backoff (2ⁿ) |
| API Failure | Re-plan or fallback flow |
| Partial Execution | Resume DAG from failed node |
| Sensitive Action | HITL approval gate |

---

## Demo Scenario (Live)

```
Input: "Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"

[✓] Jira issue detected (ID: JIRA-102)
[✓] DAG generated with 4 nodes
[✓] GitHub branch 'fix/jira-102' created
[✓] Slack notification sent to #on-call
[✓] Google Sheet updated (Row ID: 45)
```

---

## Why We're Different

| Capability | Manual | Zapier/Make | AI Copilots | **Ours** |
|---|---|---|---|---|
| Natural Language Input | ✗ | ✗ | ✓ | ✓ |
| Multi-Step Planning | ✗ | Rigid Rules | ✓ | ✓ |
| Autonomous Execution | ✗ | Partial | ✗ | ✓ Dynamic DAG |
| Dynamic Recovery | ✗ | ✗ | ✗ | ✓ |

> Only system supporting full lifecycle automation with Human-in-the-Loop control.
