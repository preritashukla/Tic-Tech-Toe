"""
main.py — Agentic MCP Gateway FastAPI Application
Entry point for the backend API server.

Author: Shivam Kumar (LLM Systems Developer)
Team: Quintessential Quincoders — Tic Tech Toe '26

Endpoints:
  GET  /health          — Health check + system status
  POST /plan            — Generate DAG from natural language
  POST /plan/validate   — Validate an existing DAG
  POST /execute         — Execute DAG (synchronous response)
  POST /execute/stream  — Execute DAG (SSE streaming)
  POST /execute/approve — HITL approval gate
  GET  /audit/logs      — Retrieve audit trail
  GET  /audit/stats     — Audit statistics
"""

from __future__ import annotations
import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.plan import router as plan_router
from routers.execute import router as execute_router
from services.audit import get_audit_logger
from services.execution_store import get_execution_store

# ─── Environment & Logging ─────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("mcp_gateway")


# ─── Application Lifespan ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    # ── Startup ──
    logger.info("=" * 60)
    logger.info("  Agentic MCP Gateway — Starting Up")
    logger.info("=" * 60)

    # Validate critical environment
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key or groq_key == "your_groq_api_key_here":
        logger.warning("⚠  GROQ_API_KEY not configured! POST /plan will fail.")
        logger.warning("   Get your free key at https://console.groq.com")
    else:
        logger.info(f"✅ GROQ_API_KEY configured (ends with ...{groq_key[-4:]})")

    model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    logger.info(f"✅ LLM Model: {model}")
    logger.info(f"✅ CORS Origins: {os.getenv('CORS_ORIGINS', 'http://localhost:3000')}")
    logger.info("✅ Audit logger initialized")
    logger.info("─" * 60)
    logger.info("  Server ready — Endpoints:")
    logger.info("    POST /plan           → Generate DAG from NL")
    logger.info("    POST /plan/validate  → Validate DAG schema")
    logger.info("    POST /execute        → Run DAG (sync)")
    logger.info("    POST /execute/stream → Run DAG (SSE)")
    logger.info("    GET  /health         → System health")
    logger.info("    GET  /audit/logs     → Audit trail")
    logger.info("─" * 60)

    yield

    # ── Shutdown ──
    logger.info("Agentic MCP Gateway — Shutting down")


# ─── FastAPI Application ───────────────────────────────────────────
app = FastAPI(
    title="Agentic MCP Gateway",
    description=(
        "AI-powered orchestration layer that connects to multiple third-party services "
        "via MCP servers, understands natural language workflow descriptions, decomposes "
        "them into executable DAG steps, and orchestrates cross-service operations."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS Middleware (for Tejas's Next.js frontend) ────────────────
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Mount Routers ─────────────────────────────────────────────────
app.include_router(plan_router)
app.include_router(execute_router)


# ─── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """System health check with service status."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    groq_ok = bool(groq_key and groq_key != "your_groq_api_key_here")

    return {
        "status": "healthy",
        "version": "1.0.0",
        "llm_model": os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        "services": {
            "groq_api": "connected" if groq_ok else "not_configured",
            "jira_mcp": "mock_active",
            "github_mcp": "mock_active",
            "slack_mcp": "mock_active",
            "sheets_mcp": "mock_active",
        },
        "features": {
            "dag_generation": True,
            "parallel_execution": True,
            "retry_with_backoff": True,
            "hitl_approval": True,
            "sse_streaming": True,
            "audit_logging": True,
            "context_management": True,
            "payload_summarization": groq_ok,
        }
    }


@app.get("/status", tags=["Execution"])
async def get_execution_status(id: str):
    """Retrieve the current status of a workflow execution by ID."""
    store = get_execution_store()
    execution = store.get(id)
    
    if not execution:
        # If not found in live store, check audit logs or return 404
        logger.warning(f"Status requested for unknown execution: {id}")
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    return {
        "execution_id": execution.execution_id,
        "status": execution.status.value,
        "workflow_name": execution.dag.workflow_name if execution.dag else "Unknown",
        "nodes": [
            {
                "id": r.node_id,
                "name": r.node_name,
                "tool": r.tool,
                "action": r.action,
                "status": r.status.value,
                "output": r.output,
                "error": r.error,
                "duration_ms": round(r.duration_ms, 1),
                "retries": r.retries
            }
            for r in execution.node_results.values()
        ],
        "total_nodes": execution.total_nodes,
        "succeeded": execution.succeeded,
        "failed": execution.failed,
        "skipped": execution.skipped,
        "timestamp": execution.start_time
    }
@app.get("/active-workflows", tags=["Execution"])
async def list_active_workflows():
    """List all current and past executions in the store."""
    store = get_execution_store()
    executions = store.get_all()
    
    return {
        "workflows": [
            {
                "workflow_id": e.execution_id,
                "status": e.status.value,
                "title": e.dag.workflow_name if e.dag else "Unnamed Workflow",
                "created_at": e.start_time,
                "nodes": [
                    {
                        "id": r.node_id,
                        "status": r.status.value,
                        "tool": r.tool,
                        "action": r.action
                    }
                    for r in e.node_results.values()
                ]
            }
            for e in executions.values()
        ]
    }


# ─── Audit Endpoints ──────────────────────────────────────────────
@app.get("/audit/logs", tags=["Audit"])
async def get_audit_logs(
    execution_id: str | None = None,
    event_type: str | None = None
):
    """Retrieve audit logs, optionally filtered by execution_id or event_type."""
    audit = get_audit_logger()

    if execution_id:
        return {"logs": audit.get_logs_by_execution(execution_id)}

    if event_type:
        from services.audit import AuditEventType
        try:
            et = AuditEventType(event_type)
            return {"logs": audit.get_logs_by_type(et)}
        except ValueError:
            return {"error": f"Unknown event type: {event_type}", "valid_types": [e.value for e in AuditEventType]}

    return {"logs": audit.get_all_logs()}


@app.get("/audit/stats", tags=["Audit"])
async def get_audit_stats():
    """Get audit event statistics."""
    return get_audit_logger().get_stats()


@app.get("/audit/security", tags=["Audit"])
async def get_security_events():
    """Get security-relevant events (HITL, permissions, errors)."""
    return {"events": get_audit_logger().get_security_events()}


# ─── Run with Uvicorn (if executed directly) ──────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        log_level="info"
    )
