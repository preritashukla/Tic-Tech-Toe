"""
routers/epic.py — Jira Epic → Multi-Branch Workflow API Endpoints

Provides endpoints to decompose a Jira Epic into a parallel DAG
of GitHub branches with draft PRs, execute it, and handle rollback.

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.epic_workflow import EpicWorkflowConfig, get_epic_engine
from services.executor import ExecutionBridge
from services.audit import get_audit_logger
from services.rollback import get_rollback_engine
from services.integrations.jira_integration import get_epic_children
from services.session import get_session_manager

logger = logging.getLogger("mcp_gateway.router.epic")

router = APIRouter(prefix="/workflow/epic", tags=["Epic Workflows"])


# ─── Request/Response Models ──────────────────────────────────────

class EpicWorkflowRequest(BaseModel):
    """POST /workflow/epic — request body."""
    epic_key: str = Field(..., description="Jira Epic key (e.g., PROJ-100)")
    owner: str = Field(..., description="GitHub repository owner")
    repo: str = Field(..., description="GitHub repository name")
    base_branch: str = Field(default="main", description="Base branch to create branches from")
    create_draft_prs: bool = Field(default=True, description="Create draft PRs for each branch")
    update_jira_status: bool = Field(default=True, description="Update Jira issue statuses")
    notify_slack: bool = Field(default=True, description="Send Slack notification on completion")
    slack_channel: str = Field(default="#dev-team", description="Slack channel for notifications")
    auto_approve: bool = Field(default=True, description="Auto-approve HITL gates")
    rollback_policy: str = Field(default="auto", description="Rollback policy: auto, manual, none")
    session_id: Optional[str] = Field(default=None, description="Conversation session ID")
    credentials: Optional[dict] = Field(default=None, description="Service credentials")


class EpicWorkflowResponse(BaseModel):
    """POST /workflow/epic — response body."""
    success: bool
    execution_id: str
    epic_key: str
    total_children: int
    total_nodes: int
    succeeded: int
    failed: int
    skipped: int
    branches_created: list[str]
    prs_created: list[dict]
    rollback_triggered: bool = False
    rollback_details: Optional[dict] = None
    message: str


# ─── Endpoints ─────────────────────────────────────────────────────

@router.post(
    "",
    response_model=EpicWorkflowResponse,
    summary="Decompose a Jira Epic into multi-branch workflow",
    description=(
        "Fetches all child issues from a Jira Epic, creates parallel GitHub branches "
        "with draft PRs, updates Jira statuses, and sends Slack notification. "
        "Supports automatic rollback on any node failure."
    ),
    responses={
        200: {"description": "Epic workflow executed successfully"},
        400: {"description": "Invalid configuration or Epic has no children"},
        404: {"description": "Epic not found in Jira"},
        500: {"description": "Execution engine error"},
    }
)
async def create_epic_workflow(request: EpicWorkflowRequest) -> EpicWorkflowResponse:
    """
    POST /workflow/epic
    
    Full workflow:
    1. Fetch child issues from Jira Epic
    2. Generate DAG with parallel branches + draft PRs
    3. Execute the DAG
    4. Auto-rollback on any failure
    """
    logger.info(f"Epic workflow request: {request.epic_key} → {request.owner}/{request.repo}")
    audit = get_audit_logger()

    # Validate config
    config = EpicWorkflowConfig(
        epic_key=request.epic_key,
        owner=request.owner,
        repo=request.repo,
        base_branch=request.base_branch,
        create_draft_prs=request.create_draft_prs,
        update_jira_status=request.update_jira_status,
        notify_slack=request.notify_slack,
        slack_channel=request.slack_channel,
    )

    engine = get_epic_engine()
    config_errors = engine.validate_config(config)
    if config_errors:
        raise HTTPException(status_code=400, detail=f"Invalid config: {', '.join(config_errors)}")

    # Step 1: Fetch Epic children from Jira
    try:
        children_result = await get_epic_children(config.epic_key)
        children = children_result.get("children", [])
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Epic {config.epic_key} not found in Jira. "
                       f"Verify the issue key and check JIRA_EMAIL/JIRA_API_TOKEN env vars."
            )
        raise HTTPException(status_code=500, detail=f"Failed to fetch Epic children: {error_msg}")

    if not children:
        raise HTTPException(
            status_code=400,
            detail=f"Epic {config.epic_key} has no child issues. "
                   f"Create sub-tasks or stories under this Epic first."
        )

    logger.info(f"Epic {config.epic_key}: found {len(children)} child issues")

    # Step 2: Build the DAG
    try:
        dag = engine.build_dag(config, children)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DAG generation failed: {e}")

    # Step 3: Execute
    bridge = ExecutionBridge(
        dag=dag,
        auto_approve=request.auto_approve,
        dry_run=False,
        credentials=request.credentials,
        rollback_policy=request.rollback_policy,
    )

    try:
        execution = await bridge.run()
    except Exception as e:
        logger.error(f"Epic workflow execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")

    # Step 4: Inject feedback into session
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
                        "epic_key": config.epic_key,
                        "children_count": len(children),
                        "node_errors": {
                            r.node_id: r.error
                            for r in execution.node_results.values()
                            if r.error
                        },
                        "rollback": getattr(execution, 'rollback_result', None)
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to inject epic session feedback: {e}")

    # Collect results
    branches_created = [
        r.output.get("branch_name", "")
        for r in execution.node_results.values()
        if r.action == "create_branch" and r.status.value == "success" and r.output
    ]

    prs_created = [
        {
            "pr_number": r.output.get("pr_number"),
            "pr_url": r.output.get("pr_url", ""),
            "title": r.output.get("pr_title", ""),
        }
        for r in execution.node_results.values()
        if r.action == "create_pull_request" and r.status.value == "success" and r.output
    ]

    rollback_result = getattr(execution, 'rollback_result', None)
    
    return EpicWorkflowResponse(
        success=execution.failed == 0,
        execution_id=execution.execution_id,
        epic_key=config.epic_key,
        total_children=len(children),
        total_nodes=execution.total_nodes,
        succeeded=execution.succeeded,
        failed=execution.failed,
        skipped=execution.skipped,
        branches_created=branches_created,
        prs_created=prs_created,
        rollback_triggered=rollback_result is not None,
        rollback_details=rollback_result,
        message=(
            f"Epic {config.epic_key}: {execution.succeeded}/{execution.total_nodes} nodes succeeded. "
            f"Created {len(branches_created)} branches" +
            (f" with {len(prs_created)} draft PRs." if prs_created else ".")
        ),
    )


@router.get(
    "/{execution_id}",
    summary="Get Epic workflow status",
    description="Returns the status of an Epic workflow execution."
)
async def get_epic_status(execution_id: str) -> dict:
    """GET /workflow/epic/{execution_id}"""
    from services.execution_store import get_execution_store
    store = get_execution_store()
    execution = store.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail=f"Execution {execution_id} not found")

    return {
        "execution_id": execution.execution_id,
        "status": execution.status.value,
        "succeeded": execution.succeeded,
        "failed": execution.failed,
        "skipped": execution.skipped,
        "total_nodes": execution.total_nodes,
        "rollback_result": getattr(execution, 'rollback_result', None),
        "results": [
            {
                "node_id": r.node_id,
                "name": r.node_name,
                "tool": r.tool,
                "action": r.action,
                "status": r.status.value,
                "output": r.output,
                "error": r.error,
            }
            for r in execution.node_results.values()
        ]
    }


@router.post(
    "/{execution_id}/rollback",
    summary="Manually trigger Epic rollback",
    description="Manually trigger rollback for an Epic workflow execution."
)
async def rollback_epic(execution_id: str) -> dict:
    """POST /workflow/epic/{execution_id}/rollback"""
    rollback_engine = get_rollback_engine()

    if not rollback_engine.has_entries(execution_id):
        raise HTTPException(
            status_code=400,
            detail=f"No rollback entries found for execution {execution_id}"
        )

    from agentic_mcp_gateway.agentic_executor import dispatch_mcp
    result = await rollback_engine.execute_rollback(execution_id, mcp_dispatcher=dispatch_mcp)

    return {
        "execution_id": execution_id,
        "rollback": result.to_dict(),
        "message": (
            f"Rollback complete: {result.succeeded} succeeded, "
            f"{result.failed} failed, {result.skipped} skipped"
        )
    }


@router.get(
    "/{execution_id}/journal",
    summary="View rollback journal",
    description="View the rollback journal entries for an Epic workflow execution."
)
async def get_rollback_journal(execution_id: str) -> dict:
    """GET /workflow/epic/{execution_id}/journal"""
    rollback_engine = get_rollback_engine()
    journal = rollback_engine.get_journal(execution_id)
    return {
        "execution_id": execution_id,
        "entries": journal,
        "count": len(journal)
    }
