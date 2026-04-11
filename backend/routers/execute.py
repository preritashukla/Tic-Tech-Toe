"""
routers/execute.py — POST /execute Endpoint + SSE Streaming
Triggers Grishma's DAG Execution Engine via HTTP/SSE adapter bridge.

Shivam's role: HTTP layer + SSE streaming + audit logging.
Grishma's role: Core execution logic (retry, HITL, parallel scheduling).

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api_schemas.requests import ExecuteRequest, ExecuteResponse
from api_schemas.dag import WorkflowDAG
from services.executor import ExecutionBridge
from services.audit import get_audit_logger
from services.execution_store import get_execution_store
from services.session import get_session_manager

logger = logging.getLogger("mcp_gateway.router.execute")

router = APIRouter(prefix="/execute", tags=["Execution"])


@router.post(
    "",
    response_model=ExecuteResponse,
    summary="Execute a workflow DAG",
    description=(
        "Executes a validated DAG through the execution engine. "
        "Runs nodes in topological order with parallelism for independent nodes. "
        "Returns final execution results with per-node status."
    )
)
async def execute_workflow(request: ExecuteRequest) -> ExecuteResponse:
    """
    POST /execute (synchronous response)
    
    Runs the DAG and returns results after all nodes complete.
    For real-time updates, use POST /execute/stream instead.
    """
    logger.info(f"Execute request: {request.dag.workflow_name} ({len(request.dag.nodes)} nodes)")

    # Bridge to Grishma's execution engine via HTTP adapter
    bridge = ExecutionBridge(
        dag=request.dag,
        auto_approve=request.auto_approve,
        dry_run=request.dry_run,
        credentials=request.credentials,
        rollback_policy=request.rollback_policy,
    )

    try:
        execution = await bridge.run()
    except Exception as e:
        logger.error(f"Execution engine error: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")

    # Inject execution results into conversation session (ChatGPT-like feedback)
    if request.session_id:
        try:
            session_mgr = get_session_manager()
            session = session_mgr.get(request.session_id)
            if session:
                session.add_execution_feedback(
                    execution_id=execution.execution_id,
                    results={
                        "status": execution.status.value,
                        "succeeded": execution.succeeded,
                        "failed": execution.failed,
                        "skipped": execution.skipped,
                        "node_errors": {
                            r.node_id: r.error
                            for r in execution.node_results.values()
                            if r.error
                        },
                        "rollback": getattr(execution, 'rollback_result', None)
                    }
                )
                logger.info(f"[Session {request.session_id}] Injected execution feedback")
        except Exception as e:
            logger.warning(f"Failed to inject session feedback: {e}")

    return ExecuteResponse(
        execution_id=execution.execution_id,
        success=execution.failed == 0,
        total_nodes=execution.total_nodes,
        succeeded=execution.succeeded,
        failed=execution.failed,
        skipped=execution.skipped,
        results=[
            {
                "node_id": r.node_id,
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
        audit_log=get_audit_logger().get_logs_by_execution(execution.execution_id)
    )


@router.post(
    "/stream",
    summary="Execute DAG with SSE streaming",
    description=(
        "Executes a validated DAG and streams real-time events via Server-Sent Events. "
        "Events include: workflow_start, node_start, node_running, node_success, "
        "node_failed, node_retry, node_skipped, hitl_required, workflow_complete."
    )
)
async def execute_workflow_stream(request: ExecuteRequest) -> StreamingResponse:
    """
    POST /execute/stream (SSE streaming response)
    
    Frontend connects with:
      const source = new EventSource('/execute/stream');
      
    Or using fetch with ReadableStream for POST body support.
    """
    logger.info(f"Stream execute: {request.dag.workflow_name} ({len(request.dag.nodes)} nodes)")

    # Bridge to Grishma's execution engine via HTTP adapter
    bridge = ExecutionBridge(
        dag=request.dag,
        auto_approve=request.auto_approve,
        dry_run=request.dry_run,
        credentials=request.credentials,
        rollback_policy=request.rollback_policy,
    )

    async def event_generator():
        """Generate SSE events bridged from Grishma's executor."""
        # Start execution in background
        exec_task = asyncio.create_task(bridge.run())

        # Stream events as they arrive
        try:
            async for event in bridge.stream_events():
                event_type = event.get("event", "message")
                data = event.get("data", "{}")
                yield f"event: {event_type}\ndata: {data}\n\n"
        except asyncio.CancelledError:
            logger.warning("SSE stream cancelled by client")
            exec_task.cancel()
            return

        # Wait for execution to finish
        try:
            execution = await exec_task
            # Send final summary
            summary = {
                "execution_id": execution.execution_id,
                "status": execution.status.value,
                "succeeded": execution.succeeded,
                "failed": execution.failed,
                "skipped": execution.skipped,
                "results": [
                    {
                        "node_id": r.node_id,
                        "status": r.status.value,
                        "output": r.output,
                        "error": r.error
                    }
                    for r in execution.node_results.values()
                ]
            }
            yield f"event: execution_summary\ndata: {json.dumps(summary)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get(
    "/status",
    summary="Get execution status",
    description="Retrieves the current status and results of a workflow execution by ID."
)
async def get_execution_status(id: str = Query(..., description="Execution ID")) -> dict:
    """
    GET /execute/status?id={execution_id}
    
    Returns the current execution status, node results, and audit log.
    Called by frontend to poll execution progress.
    Also searches by workflow_id if execution_id not found.
    """
    store = get_execution_store()
    execution = store.get(id)
    
    # If not found by execution_id, try searching by workflow_id
    if not execution:
        for exec_id, exec_record in store.get_all().items():
            if exec_record.execution_id == id or (hasattr(exec_record, 'dag') and exec_record.dag.workflow_id == id):
                execution = exec_record
                break
    
    if not execution:
        raise HTTPException(status_code=404, detail=f"Execution {id} not found")
    
    return {
        "execution_id": execution.execution_id,
        "workflow_id": execution.dag.workflow_id if execution.dag else id,
        "status": execution.status.value,
        "succeeded": execution.succeeded,
        "failed": execution.failed,
        "skipped": execution.skipped,
        "total_nodes": execution.total_nodes,
        "results": [
            {
                "node_id": r.node_id,
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
        "audit_log": get_audit_logger().get_logs_by_execution(execution.execution_id)
    }


@router.post(
    "/approve/{execution_id}/{node_id}",
    summary="Approve a HITL gate",
    description="Approves a pending human-in-the-loop approval for a specific node."
)
async def approve_hitl(execution_id: str, node_id: str, approved: bool = True) -> dict:
    """
    POST /execute/approve/{execution_id}/{node_id}
    
    Called by frontend when user approves/rejects a sensitive operation.
    In the current hackathon demo, HITL is handled via auto_approve flag.
    This endpoint is scaffolded for production use.
    """
    audit = get_audit_logger()
    audit.log_hitl_decision(execution_id, node_id, "unknown", "unknown", approved)

    return {
        "execution_id": execution_id,
        "node_id": node_id,
        "approved": approved,
        "message": f"Node {node_id} {'approved' if approved else 'rejected'}"
    }
