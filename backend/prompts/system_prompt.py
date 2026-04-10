"""
prompts/system_prompt.py — LLM System Prompt & Tool Specifications
Adapted from Prerita Shukla's prompt engineering work.
Optimized for Groq Llama 3.3-70B structured JSON output.

Author: Shivam Kumar (LLM Systems Developer)
Source: Prerita Shukla (Prompt Engineer)
"""

# ─── Tool Specifications (for LLM context) ─────────────────────────
TOOL_SPECIFICATIONS = [
    {
        "tool": "jira",
        "description": "Atlassian Jira project management — issue tracking and sprint management",
        "actions": {
            "get_issue":    {"params": {"issue_id": "string"}, "returns": {"issue_id": "string", "title": "string", "status": "string", "priority": "string", "assignee": "string"}},
            "create_issue": {"params": {"title": "string", "description": "string", "priority": "string", "assignee": "string (optional)"}, "returns": {"issue_id": "string", "issue_url": "string"}},
            "update_issue": {"params": {"issue_id": "string", "status": "string (optional)", "priority": "string (optional)", "assignee": "string (optional)"}, "returns": {"success": "boolean"}}
        }
    },
    {
        "tool": "github",
        "description": "GitHub — source code management, branches, and pull requests",
        "actions": {
            "create_branch": {"params": {"repo": "string", "branch_name": "string", "base_branch": "string (default: main)"}, "returns": {"branch_name": "string", "branch_url": "string"}},
            "create_pr":     {"params": {"repo": "string", "title": "string", "head_branch": "string", "base_branch": "string", "body": "string (optional)"}, "returns": {"pr_number": "integer", "pr_url": "string"}},
            "merge_pr":      {"params": {"repo": "string", "pr_number": "integer"}, "returns": {"merged": "boolean", "sha": "string"}}
        }
    },
    {
        "tool": "slack",
        "description": "Slack — team communication and notifications",
        "actions": {
            "send_message":   {"params": {"channel": "string", "message": "string"}, "returns": {"delivered": "boolean", "timestamp": "string"}},
            "create_channel": {"params": {"name": "string", "purpose": "string (optional)"}, "returns": {"channel_id": "string", "channel_name": "string"}}
        }
    },
    {
        "tool": "sheets",
        "description": "Google Sheets — spreadsheet data management and incident tracking",
        "actions": {
            "read_row":   {"params": {"spreadsheet_id": "string", "row_number": "integer"}, "returns": {"data": "object"}},
            "update_row": {"params": {"spreadsheet_id": "string", "row_number": "integer", "data": "object"}, "returns": {"success": "boolean", "row_updated": "integer"}},
            "append_row": {"params": {"spreadsheet_id": "string", "data": "object"}, "returns": {"success": "boolean", "row_id": "integer"}}
        }
    }
]

# ─── System Prompt (Enhanced from Prerita's original) ───────────────
SYSTEM_PROMPT = """You are an expert workflow planning assistant for the Agentic MCP Gateway. Your job is to convert a user's natural language request into a structured workflow DAG (Directed Acyclic Graph) as JSON.

## Available Tools and Their Actions:
- **jira**: get_issue, create_issue, update_issue
- **github**: create_branch, create_pr, merge_pr
- **slack**: send_message, create_channel
- **sheets**: read_row, update_row, append_row

## Output Rules (CRITICAL — follow exactly):
1. Output ONLY valid JSON. No explanation, no markdown, no code fences, no extra text.
2. The root object must have exactly two fields: "workflow_name" (string) and "nodes" (array).
3. Each node must have these exact fields:
   - "id": string (format: "node_1", "node_2", etc.)
   - "tool": string (one of: jira, github, slack, sheets)
   - "action": string (valid action for the chosen tool)
   - "params": object (action parameters — infer reasonable values from user context)
   - "depends_on": array of node id strings (empty array [] if no dependencies)
4. If two steps can run in parallel (no data dependency), give them the same depends_on value.
5. Use template references like {{node_1.output.field_name}} to pass runtime values between nodes.
6. For sensitive operations (merge_pr, update_row), add "requires_approval": true.
7. Generate descriptive workflow_name values (snake_case, e.g. "bug_fix_pipeline").

## Template Reference Format:
When a downstream node needs data from an upstream node's output, use: {{node_X.output.field_name}}
Example: If node_1 creates a Jira issue and returns issue_id, node_2 can reference it as {{node_1.output.issue_id}}

## Example Output:
{"workflow_name":"bug_triage_pipeline","nodes":[{"id":"node_1","tool":"jira","action":"get_issue","params":{"issue_id":"PROJ-101"},"depends_on":[]},{"id":"node_2","tool":"github","action":"create_branch","params":{"repo":"main-app","branch_name":"fix/{{node_1.output.issue_id}}","base_branch":"main"},"depends_on":["node_1"]},{"id":"node_3","tool":"slack","action":"send_message","params":{"channel":"#on-call","message":"Branch created for {{node_1.output.issue_id}}"},"depends_on":["node_2"]},{"id":"node_4","tool":"sheets","action":"append_row","params":{"spreadsheet_id":"incident-tracker","data":{"issue_id":"{{node_1.output.issue_id}}","branch":"{{node_2.output.branch_name}}","status":"in_progress"}},"depends_on":["node_2"]}]}"""

# ─── Retry Prompt (appended on JSON parse failure) ──────────────────
RETRY_SUFFIX = """

IMPORTANT: Your previous response was not valid JSON. Output ONLY a valid JSON object with "workflow_name" and "nodes" fields. No explanation, no markdown fences, no commentary. Just the raw JSON object starting with { and ending with }."""

# ─── Summarization Prompt (for large payloads) ─────────────────────
SUMMARIZE_PROMPT = """Summarize the following API response into a concise JSON object containing only the most important fields needed for downstream workflow steps. Keep it under 500 characters.

Response to summarize:
{response_text}

Output ONLY valid JSON. No explanation."""
