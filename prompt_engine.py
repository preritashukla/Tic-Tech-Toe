# prompt_engine.py
from groq import Groq
from dotenv import load_dotenv
import json
import re
import os

load_dotenv()

SYSTEM_PROMPT = """You are a workflow planning assistant. Your job is to convert a user's natural language request into a structured workflow DAG (Directed Acyclic Graph) as JSON.

Available tools and their actions:
- jira: get_issue, create_issue, update_issue
- github: create_branch, create_pr, merge_pr
- slack: send_message, create_channel
- sheets: read_row, update_row, append_row

Rules:
1. Output ONLY valid JSON. No explanation, no markdown, no code fences.
2. Each node must have: id (string), tool, action, params (object), depends_on (array of ids).
3. If two steps can run in parallel, give them the same depends_on value.
4. Infer reasonable param values from context.
5. Always include a workflow_name field.
6. Use template refs like {{node_1.field_name}} to pass runtime values between nodes.
"""

REQUIRED_NODE_FIELDS = {"id", "tool", "action", "params", "depends_on"}
VALID_TOOLS = {"jira", "github", "slack", "sheets"}
VALID_ACTIONS = {
    "jira":   {"get_issue", "create_issue", "update_issue"},
    "github": {"create_branch", "create_pr", "merge_pr"},
    "slack":  {"send_message", "create_channel"},
    "sheets": {"read_row", "update_row", "append_row"},
}

def validate_dag(dag: dict) -> list[str]:
    errors = []
    if "workflow_name" not in dag:
        errors.append("Missing 'workflow_name'")
    if "nodes" not in dag or not isinstance(dag["nodes"], list):
        errors.append("Missing or invalid 'nodes' array")
        return errors

    node_ids = {n.get("id") for n in dag["nodes"]}
    for i, node in enumerate(dag["nodes"]):
        prefix = f"Node {i+1} ({node.get('id', '?')})"
        missing = REQUIRED_NODE_FIELDS - node.keys()
        if missing:
            errors.append(f"{prefix}: missing fields {missing}")
        tool = node.get("tool")
        if tool not in VALID_TOOLS:
            errors.append(f"{prefix}: unknown tool '{tool}'")
        action = node.get("action")
        if tool in VALID_ACTIONS and action not in VALID_ACTIONS[tool]:
            errors.append(f"{prefix}: invalid action '{action}' for tool '{tool}'")
        for dep in node.get("depends_on", []):
            if dep not in node_ids:
                errors.append(f"{prefix}: depends_on references unknown id '{dep}'")
        if not isinstance(node.get("params"), dict):
            errors.append(f"{prefix}: 'params' must be an object")
    return errors

def extract_json(text: str) -> str:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()
    return text.strip()

def generate_dag(user_input: str, retries: int = 2) -> dict:
    client = Groq()  # reads GROQ_API_KEY from env
    last_error = None

    for attempt in range(1, retries + 2):
        try:
            print(f"[Attempt {attempt}] Calling Groq API...")

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",  # best Llama on Groq
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_input}
                ]
            )

            raw = response.choices[0].message.content
            clean = extract_json(raw)

            try:
                dag = json.loads(clean)
            except json.JSONDecodeError as e:
                last_error = f"Invalid JSON: {e}\nRaw output:\n{raw}"
                print(f"[Attempt {attempt}] JSON parse failed: {e}")
                continue

            errors = validate_dag(dag)
            if errors:
                last_error = f"Validation errors: {errors}"
                print(f"[Attempt {attempt}] Validation failed: {errors}")
                continue

            print(f"[Attempt {attempt}] ✅ DAG valid!")
            return dag

        except Exception as e:
            last_error = f"Unexpected error: {e}"
            break

    print(f"[generate_dag] All attempts failed. Last error: {last_error}")
    return {
        "workflow_name": "fallback_manual_review",
        "error": last_error,
        "nodes": []
    }

TEST_CASES = [
    "Critical bug filed in Jira -> Create GitHub branch -> Notify Slack -> Update incident tracker",
    "Create a new Jira ticket for a login bug",
    "Fix is merged on GitHub, now close the Jira ticket and notify the team on Slack",
    "New feature request came in — create a Jira story, make a GitHub branch, tell the team on Slack, and log it in the tracker",
]

if __name__ == "__main__":
    for i, test in enumerate(TEST_CASES, 1):
        print(f"\n{'='*60}")
        print(f"TEST {i}: {test}")
        print('='*60)
        dag = generate_dag(test)
        print(json.dumps(dag, indent=2))