from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import sys
import os

# Adjust path so we can import from agentic_mcp_gateway and prompt_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prompt_engine import generate_dag as llm_generate_dag
from agentic_mcp_gateway.models import dag_from_dict, TaskStatus
from agentic_mcp_gateway.observability import ExecutionLogger
from agentic_mcp_gateway.hitl_async import AsyncHITLGate
from agentic_mcp_gateway.executor import DAGExecutor
from agentic_mcp_gateway.mock_mcp_servers import dispatch_mcp_call

app = FastAPI(title="Workflow Maestro API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's local hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory state for active workflows
# Format: { workflow_id: { "dag_obj": DAG, "logger": Logger, "hitl": AsyncHITLGate, "title": "..." } }
ACTIVE_WORKFLOWS: Dict[str, Dict[str, Any]] = {}

class PlanRequest(BaseModel):
    input: str

class PlanResponse(BaseModel):
    workflow_id: str
    message: str

class ApproveRequest(BaseModel):
    workflow_id: str
    node_id: str
    approved: bool

@app.post("/plan", response_model=PlanResponse)
async def plan_workflow(req: PlanRequest):
    # 1. Call prompt engine
    raw_dag_json = llm_generate_dag(req.input)
    
    # Generate an ID if one isn't provided by the prompt engine
    import uuid
    wf_id = raw_dag_json.get("workflow_name", f"wf-{uuid.uuid4().hex[:8]}")
    title = req.input
    raw_dag_json["workflow_id"] = wf_id

    # 2. Parse DAG into python objects
    try:
        dag = dag_from_dict(raw_dag_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DAG Parsing failed: {str(e)}")

    # 3. Setup observability and async HITL
    logger = ExecutionLogger(workflow_id=dag.workflow_id)
    hitl = AsyncHITLGate(logger=logger, auto_approve=False)

    executor = DAGExecutor(
        dag=dag,
        mcp_dispatcher=dispatch_mcp_call,
        hitl=hitl,
        logger=logger
    )

    # 4. Store in memory
    ACTIVE_WORKFLOWS[wf_id] = {
        "dag_obj": dag,
        "logger": logger,
        "hitl": hitl,
        "title": title
    }

    # 5. Kick off run in the background
    asyncio.create_task(executor.run())

    return PlanResponse(workflow_id=wf_id, message="Execution started")

@app.get("/status")
async def get_status(id: str):
    if id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf = ACTIVE_WORKFLOWS[id]
    dag = wf["dag_obj"]

    # Map backend Python state to frontend JSON contract
    nodes = []
    edges = []

    for node in dag.nodes.values():
        # Map python enum value to lowercase (WAITING_APPROVAL -> waiting_approval)
        raw_status = node.status.value.lower()
        if raw_status == 'waiting approval':
            raw_status = 'waiting_approval'

        # Infer tool name cleanly for icons
        tool_name = "generic"
        if "jira" in str(node.tool).lower(): tool_name = "jira"
        if "github" in str(node.tool).lower(): tool_name = "github"
        if "slack" in str(node.tool).lower(): tool_name = "slack"
        if "sheet" in str(node.tool).lower(): tool_name = "sheets"

        frontend_node = {
            "id": node.id,
            "title": node.name or node.action,
            "description": f"Tool: {node.tool} Action: {node.action}",
            "status": raw_status,
            "tool": tool_name,
            "inputs": node.inputs,
            "outputs": node.output
        }
        nodes.append(frontend_node)

        # Build edges based on depends_on array
        for dep in getattr(node, 'depends_on', []):
            edges.append({
                "source": dep,
                "target": node.id
            })

    return {
        "workflow_id": id,
        "title": wf.get("title", id),
        "nodes": nodes,
        "edges": edges
    }

@app.post("/approve")
async def approve_node(req: ApproveRequest):
    if req.workflow_id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf = ACTIVE_WORKFLOWS[req.workflow_id]
    hitl: AsyncHITLGate = wf["hitl"]
    
    success = hitl.trigger_approval(req.node_id, req.approved)
    
    if not success:
        raise HTTPException(status_code=400, detail="Node is not pending approval")
        
    return {"status": "ok", "message": f"Approval ({req.approved}) registered for {req.node_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
