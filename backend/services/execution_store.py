import os
import json
from typing import Dict, Optional
from api_schemas.execution import WorkflowExecution, WorkflowStatus
import logging

logger = logging.getLogger("mcp_gateway.execution_store")

class ExecutionStore:
    """In-memory store for workflow execution states with JSON persistence."""
    _instance = None
    _executions: Dict[str, WorkflowExecution] = {}
    _db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workflows_db.json")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ExecutionStore, cls).__new__(cls)
            cls._instance._load()
        return cls._instance

    def _load(self):
        """Load executions from disk."""
        if not os.path.exists(self._db_path):
            return
        try:
            with open(self._db_path, "r") as f:
                data = json.load(f)
                for eid, raw in data.items():
                    try:
                        self._executions[eid] = WorkflowExecution(**raw)
                    except Exception as e:
                        logger.error(f"Failed to parse execution {eid}: {e}")
            logger.info(f"Loaded {len(self._executions)} workflows from {self._db_path}")
        except Exception as e:
            logger.error(f"Failed to load workflows database: {e}")

    def _save(self):
        """Persist executions to disk."""
        try:
            data = {eid: exec.model_dump() for eid, exec in self._executions.items()}
            with open(self._db_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save workflows database: {e}")

    def save(self, execution: WorkflowExecution):
        self._executions[execution.execution_id] = execution
        self._save()
        logger.debug(f"Saved execution {execution.execution_id}")

    def get(self, execution_id: str) -> Optional[WorkflowExecution]:
        return self._executions.get(execution_id)

    def get_all(self) -> Dict[str, WorkflowExecution]:
        return self._executions

def get_execution_store() -> ExecutionStore:
    return ExecutionStore()
