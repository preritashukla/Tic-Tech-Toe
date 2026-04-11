"""
services/llm.py — Groq LLM Integration Service
Replaces Anthropic/Claude with Groq Llama 3.3-70B for ultra-fast DAG generation.
Consumes Prerita Shukla's system prompt. Returns validated DAG via Pydantic models.

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import json
import re
import os
import time
import logging
from typing import Optional

from groq import Groq
from dotenv import load_dotenv

from api_schemas.dag import WorkflowDAG
from prompts.system_prompt import SYSTEM_PROMPT, RETRY_SUFFIX

load_dotenv()
logger = logging.getLogger("mcp_gateway.llm")


class LLMService:
    """
    Groq-powered LLM service for workflow DAG generation.
    
    Features:
    - Calls Groq Llama 3.3-70B with Prerita's system prompt
    - JSON extraction from markdown-fenced or raw responses
    - Auto-retry with enhanced prompt on JSON parse failures
    - Pydantic validation of generated DAGs
    - Full audit trail of LLM calls
    """

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        self.is_mock = not api_key or api_key == "your_groq_api_key_here"
        
        if self.is_mock:
            logger.warning("Using MOCK LLM Service - GROQ_API_KEY not set!")
            self.client = None
        else:
            self.client = Groq(api_key=api_key)
        self.model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        self.max_tokens = int(os.getenv("LLM_MAX_TOKENS", "2048"))
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.1"))
        self._call_history: list[dict] = []
        logger.info(f"LLM Service initialized — model={self.model}")

    # ─── Public API ────────────────────────────────────────────────

    async def generate_dag(
        self,
        user_input: str,
        context: Optional[dict] = None,
        max_retries: int = 2
    ) -> dict:
        if self.is_mock:
            # Return a standard sample DAG for the demo
            return self._generate_mock_dag(user_input)

        errors: list[str] = []
        raw_output = ""
        last_dag = None

        for attempt in range(1, max_retries + 2):
            try:
                # Build the prompt — append retry suffix on subsequent attempts
                system_content = SYSTEM_PROMPT
                if attempt > 1:
                    system_content += RETRY_SUFFIX

                user_content = user_input
                if context:
                    user_content += f"\n\nAdditional context: {json.dumps(context)}"

                # Call Groq API
                start_time = time.time()
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    messages=[
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": user_content}
                    ]
                )
                elapsed_ms = (time.time() - start_time) * 1000

                raw_output = response.choices[0].message.content
                logger.info(f"[Attempt {attempt}] Groq response in {elapsed_ms:.0f}ms ({len(raw_output)} chars)")

                # Log the call
                self._log_call(attempt, user_input, raw_output, elapsed_ms)

                # Extract JSON from potential markdown fences
                clean_json = self._extract_json(raw_output)

                # Parse JSON
                try:
                    dag_dict = json.loads(clean_json)
                except json.JSONDecodeError as e:
                    error_msg = f"Attempt {attempt}: JSON parse error — {e}"
                    errors.append(error_msg)
                    logger.warning(error_msg)
                    continue

                # Normalize LLM output to match our schema
                dag_dict = self._normalize_dag(dag_dict)

                # Validate through Pydantic
                try:
                    dag = WorkflowDAG(**dag_dict)
                    logger.info(f"[Attempt {attempt}] ✅ DAG validated — {len(dag.nodes)} nodes")
                    return {
                        "success": True,
                        "dag": dag,
                        "raw": raw_output,
                        "errors": [],
                        "attempts": attempt,
                        "model": self.model,
                        "latency_ms": elapsed_ms
                    }
                except Exception as e:
                    error_msg = f"Attempt {attempt}: Pydantic validation error — {e}"
                    errors.append(error_msg)
                    logger.warning(error_msg)
                    last_dag = dag_dict
                    continue

            except Exception as e:
                error_msg = f"Attempt {attempt}: Groq API error — {e}"
                errors.append(error_msg)
                logger.error(error_msg)
                # Don't retry on auth errors
                if "auth" in str(e).lower() or "api_key" in str(e).lower():
                    break

        # All attempts failed — return structured error
        logger.error(f"All {max_retries + 1} attempts failed for: {user_input[:100]}")
        return {
            "success": False,
            "dag": None,
            "raw": raw_output,
            "errors": errors,
            "attempts": max_retries + 1,
            "model": self.model,
            "latency_ms": 0
        }

    async def summarize_payload(self, text: str, max_chars: int = 2000) -> str:
        """
        Summarize a large API response via LLM before passing to context.
        Used when tool output exceeds SUMMARIZE_THRESHOLD.
        """
        if len(text) <= max_chars:
            return text

        from prompts.system_prompt import SUMMARIZE_PROMPT
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=512,
                temperature=0.0,
                messages=[
                    {"role": "user", "content": SUMMARIZE_PROMPT.format(response_text=text[:4000])}
                ]
            )
            summary = response.choices[0].message.content
            logger.info(f"Summarized payload: {len(text)} → {len(summary)} chars")
            return summary
        except Exception as e:
            logger.warning(f"Summarization failed, truncating: {e}")
            return text[:max_chars] + "...[truncated]"

    def get_call_history(self) -> list[dict]:
        """Return full LLM call history for audit."""
        return self._call_history.copy()

    # ─── Private Helpers ───────────────────────────────────────────

    @staticmethod
    def _extract_json(text: str) -> str:
        """
        Extract JSON from LLM output that may be wrapped in markdown fences.
        Handles: ```json ... ```, ``` ... ```, or raw JSON.
        """
        # Try markdown code fence extraction
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            return match.group(1).strip()

        # Try to find raw JSON object
        text = text.strip()
        brace_start = text.find("{")
        if brace_start != -1:
            # Find the matching closing brace
            depth = 0
            for i in range(brace_start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        return text[brace_start:i + 1]

        return text

    @staticmethod
    def _normalize_dag(dag_dict: dict) -> dict:
        """
        Normalize LLM output to match WorkflowDAG schema.
        Handles the new prompt schema:
        - workflow_id, name, description, steps[]
        - service, tool (hierarchical), params, depends_on, outputs, requires_approval
        """
        # Ensure workflow_name exists (map from 'name' if necessary)
        if "workflow_name" not in dag_dict:
            dag_dict["workflow_name"] = dag_dict.get("name", dag_dict.get("workflow_id", "unnamed_workflow"))

        # Map 'steps' to 'nodes' if present
        if "steps" in dag_dict and "nodes" not in dag_dict:
            dag_dict["nodes"] = dag_dict.pop("steps")

        # Ensure nodes have correct field names and types
        if "nodes" in dag_dict:
            for node in dag_dict["nodes"]:
                # Normalize 'service' + hierarchical 'tool' -> 'tool' + 'action'
                # New: service="github", tool="github.get_repository"
                # Old: tool="github", action="get_repository"
                service = node.get("service")
                tool_raw = node.get("tool")
                
                if service and "." in str(tool_raw):
                    # It's using the new schema
                    node["tool"] = service
                    node["action"] = tool_raw.split(".")[-1]
                
                # Normalize 'inputs' <-> 'params'
                if "inputs" in node and "params" not in node:
                    node["params"] = node.pop("inputs")
                elif "params" in node and "inputs" not in node:
                    node["inputs"] = node["params"]

                # Ensure depends_on is a list
                if "depends_on" not in node:
                    node["depends_on"] = []
                elif node["depends_on"] is None:
                    node["depends_on"] = []

        return dag_dict

    def _log_call(self, attempt: int, user_input: str, output: str, latency_ms: float):
        """Record LLM call for audit trail."""
        self._call_history.append({
            "attempt": attempt,
            "model": self.model,
            "input_preview": user_input[:200],
            "output_length": len(output),
            "latency_ms": round(latency_ms, 1),
            "timestamp": time.time()
        })


    def _generate_mock_dag(self, user_input: str) -> dict:
        """Generates a static dummy DAG for demonstration when no LLM key is present."""
        logger.info(f"Generating mock DAG for input: {user_input}")
        
        # Simple heuristic to pick a template
        dag_dict = {
            "workflow_id": "wf-mock-" + str(int(time.time())),
            "workflow_name": "Demo: " + user_input[:30],
            "description": f"Mock workflow generated for: {user_input}",
            "nodes": [
                {
                    "id": "task_1",
                    "name": "Scan Input",
                    "tool": "jira",
                    "action": "get_issue",
                    "params": {"issue_id": "MOCK-101"},
                    "depends_on": [],
                    "requires_approval": False,
                    "retry": {"max_attempts": 3, "backoff_factor": 2.0, "initial_delay": 1.0, "timeout": 10}
                },
                {
                    "id": "task_2",
                    "name": "Sync with Github",
                    "tool": "github",
                    "action": "create_branch",
                    "params": {"branch_name": "fix/mock-101", "ref": "{{task_1.output.id}}"},
                    "depends_on": ["task_1"],
                    "requires_approval": False,
                    "retry": {"max_attempts": 3, "backoff_factor": 2.0, "initial_delay": 1.0, "timeout": 10}
                },
                {
                    "id": "task_3",
                    "name": "Notify Team",
                    "tool": "slack",
                    "action": "send_message",
                    "params": {"channel": "#alerts", "message": "Started work on {{task_1.output.title}}"},
                    "depends_on": ["task_1"],
                    "requires_approval": False,
                    "retry": {"max_attempts": 3, "backoff_factor": 2.0, "initial_delay": 1.0, "timeout": 10}
                }
            ]
        }
        
        return {
            "success": True,
            "dag": WorkflowDAG(**dag_dict),
            "raw": json.dumps(dag_dict, indent=2),
            "errors": [],
            "attempts": 1,
            "model": "mock-mode",
            "latency_ms": 150.0
        }


# ─── Module-level convenience (backward compatible with prompt_engine.py) ───

_service: Optional[LLMService] = None

def get_llm_service() -> LLMService:
    """Singleton accessor for the LLM service."""
    global _service
    if _service is None:
        _service = LLMService()
    return _service
