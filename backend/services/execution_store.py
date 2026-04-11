from typing import Dict, Optional
from api_schemas.execution import WorkflowExecution, WorkflowStatus
import logging

logger = logging.getLogger("mcp_gateway.execution_store")

class ExecutionStore:
    """In-memory store for workflow execution states."""
    _instance = None
    _executions: Dict[str, WorkflowExecution] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ExecutionStore, cls).__new__(cls)
        return cls._instance

    def save(self, execution: WorkflowExecution):
        self._executions[execution.execution_id] = execution
        logger.debug(f"Saved execution {execution.execution_id} (Status: {execution.status})")

    def get(self, execution_id: str) -> Optional[WorkflowExecution]:
        return self._executions.get(execution_id)

    def get_all(self) -> Dict[str, WorkflowExecution]:
        return self._executions

def get_execution_store() -> ExecutionStore:
    return ExecutionStore()
