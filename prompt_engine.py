# prompt_engine.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()  # loads ANTHROPIC_API_KEY (and others) from .env

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

def generate_dag(user_input: str) -> dict:
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_input}
        ]
    )

    raw = message.content[0].text
    return json.loads(raw)


if __name__ == "__main__":
    test_input = "Critical bug filed in Jira → Create GitHub branch → Notify Slack → Update incident tracker"
    dag = generate_dag(test_input)
    print(json.dumps(dag, indent=2))