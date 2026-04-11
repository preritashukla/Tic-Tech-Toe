import os
import httpx
import base64
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
BASE_URL = "https://api.github.com"

async def call_github_api(method: str, endpoint: str, data: Optional[dict] = None, params: Optional[dict] = None) -> dict:
    """Helper to call the real GitHub REST API."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Agentic-MCP-Gateway"
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        
    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}{endpoint}"
        response = await client.request(method, url, json=data, params=params, headers=headers)
        
        if response.status_code >= 400:
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            raise Exception(f"GitHub API Error ({response.status_code}): {error_detail}")
            
        return response.json()

async def get_repository(owner: str, repo: str) -> dict:
    data = await call_github_api("GET", f"/repos/{owner}/{repo}")
    return {
        "repo_full_name": data.get("full_name"),
        "repo_default_branch": data.get("default_branch"),
        "repo_clone_url": data.get("clone_url"),
        "repo_html_url": data.get("html_url"),
        "repo_open_issues": data.get("open_issues_count"),
        "repo_language": data.get("language"),
        "repo_private": data.get("private")
    }

async def list_branches(owner: str, repo: str, per_page: int = 30) -> dict:
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/branches", params={"per_page": per_page})
    return {
        "branch_names": [b["name"] for b in data],
        "branch_count": len(data)
    }

async def create_branch(owner: str, repo: str, branch_name: str, from_branch: str) -> dict:
    # 1. Get SHA of from_branch
    ref_data = await call_github_api("GET", f"/repos/{owner}/{repo}/git/refs/heads/{from_branch}")
    sha = ref_data["object"]["sha"]
    
    # 2. Create new ref
    payload = {
        "ref": f"refs/heads/{branch_name}",
        "sha": sha
    }
    data = await call_github_api("POST", f"/repos/{owner}/{repo}/git/refs", data=payload)
    return {
        "branch_name": branch_name,
        "branch_ref": data["ref"],
        "branch_sha": data["object"]["sha"],
        "branch_url": data["url"]
    }

async def list_issues(owner: str, repo: str, state: str = "open", labels: Optional[str] = None, assignee: Optional[str] = None) -> dict:
    params = {"state": state}
    if labels: params["labels"] = labels
    if assignee: params["assignee"] = assignee
    
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/issues", params=params)
    issues = [i for i in data if "pull_request" not in i] # Filter out PRs if needed, or keep them
    
    result = {
        "issues_json": issues,
        "issue_count": len(issues)
    }
    if issues:
        result.update({
            "first_issue_number": issues[0]["number"],
            "first_issue_title": issues[0]["title"],
            "first_issue_url": issues[0]["html_url"]
        })
    return result

async def get_issue(owner: str, repo: str, issue_number: int) -> dict:
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/issues/{issue_number}")
    return {
        "issue_number": data["number"],
        "issue_title": data["title"],
        "issue_body": data.get("body"),
        "issue_state": data["state"],
        "issue_labels": [l["name"] for l in data.get("labels", [])],
        "issue_assignee": data["assignee"]["login"] if data.get("assignee") else None,
        "issue_url": data["html_url"],
        "issue_created_at": data["created_at"]
    }

async def create_issue(owner: str, repo: str, title: str, body: Optional[str] = None, labels: Optional[list] = None, assignees: Optional[list] = None) -> dict:
    payload = {"title": title}
    if body: payload["body"] = body
    if labels: payload["labels"] = labels
    if assignees: payload["assignees"] = assignees
    
    data = await call_github_api("POST", f"/repos/{owner}/{repo}/issues", data=payload)
    return {
        "issue_number": data["number"],
        "issue_url": data["html_url"],
        "issue_api_url": data["url"],
        "issue_title": data["title"]
    }

async def get_branch(owner: str, repo: str, branch: str) -> dict:
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/branches/{branch}")
    return {
        "branch_name": data["name"],
        "branch_sha": data["commit"]["sha"],
        "branch_commit_url": data["commit"]["url"],
        "branch_protected": data.get("protected", False)
    }

async def add_issue_comment(owner: str, repo: str, issue_number: int, body: str) -> dict:
    data = await call_github_api("POST", f"/repos/{owner}/{repo}/issues/{issue_number}/comments", data={"body": body})
    return {
        "comment_id": data["id"],
        "comment_url": data["html_url"],
        "comment_created_at": data["created_at"]
    }

async def update_issue(owner: str, repo: str, issue_number: int, **kwargs) -> dict:
    # Filter out None values
    payload = {k: v for k, v in kwargs.items() if v is not None}
    data = await call_github_api("PATCH", f"/repos/{owner}/{repo}/issues/{issue_number}", data=payload)
    return {
        "issue_number": data["number"],
        "issue_state": data["state"],
        "issue_url": data["html_url"]
    }

async def list_pull_requests(owner: str, repo: str, state: str = "open", head: Optional[str] = None, base: Optional[str] = None) -> dict:
    params = {"state": state}
    if head: params["head"] = head
    if base: params["base"] = base
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/pulls", params=params)
    result = {"pr_count": len(data), "prs_json": data}
    if data:
        result.update({
            "first_pr_number": data[0]["number"],
            "first_pr_title": data[0]["title"],
            "first_pr_url": data[0]["html_url"]
        })
    return result

async def get_pull_request(owner: str, repo: str, pr_number: int) -> dict:
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}")
    return {
        "pr_number": data["number"],
        "pr_title": data["title"],
        "pr_state": data["state"],
        "pr_merged": data.get("merged", False),
        "pr_url": data["html_url"],
        "pr_head_branch": data["head"]["ref"],
        "pr_base_branch": data["base"]["ref"],
        "pr_mergeable": data.get("mergeable")
    }

async def merge_pull_request(owner: str, repo: str, pr_number: int, merge_method: str = "merge", commit_title: Optional[str] = None) -> dict:
    payload = {"merge_method": merge_method}
    if commit_title: payload["commit_title"] = commit_title
    data = await call_github_api("PUT", f"/repos/{owner}/{repo}/pulls/{pr_number}/merge", data=payload)
    return {
        "merge_sha": data["sha"],
        "merge_message": data["message"],
        "merged": data["merged"]
    }

async def add_labels(owner: str, repo: str, issue_number: int, labels: list[str]) -> dict:
    data = await call_github_api("POST", f"/repos/{owner}/{repo}/issues/{issue_number}/labels", data={"labels": labels})
    return {
        "labels_added": data,
        "label_count": len(data)
    }

async def get_file_content(owner: str, repo: str, path: str, ref: Optional[str] = None) -> dict:
    params = {}
    if ref: params["ref"] = ref
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/contents/{path}", params=params)
    content = ""
    if data.get("encoding") == "base64":
        content = base64.b64decode(data["content"]).decode("utf-8")
    return {
        "file_name": data["name"],
        "file_path": data["path"],
        "file_content": content,
        "file_sha": data["sha"],
        "file_size_bytes": data["size"],
        "file_html_url": data["html_url"]
    }

async def create_or_update_file(owner: str, repo: str, path: str, message: str, content: str, branch: Optional[str] = None, sha: Optional[str] = None) -> dict:
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8")
    }
    if branch: payload["branch"] = branch
    if sha: payload["sha"] = sha
    data = await call_github_api("PUT", f"/repos/{owner}/{repo}/contents/{path}", data=payload)
    return {
        "file_path": data["content"]["path"],
        "commit_sha": data["commit"]["sha"],
        "commit_url": data["commit"]["html_url"],
        "file_html_url": data["content"]["html_url"]
    }

async def list_commits(owner: str, repo: str, sha: Optional[str] = None, path: Optional[str] = None, per_page: int = 10) -> dict:
    params = {"per_page": per_page}
    if sha: params["sha"] = sha
    if path: params["path"] = path
    data = await call_github_api("GET", f"/repos/{owner}/{repo}/commits", params=params)
    result = {"commit_count": len(data), "commits_json": data}
    if data:
        result.update({
            "latest_commit_sha": data[0]["sha"],
            "latest_commit_msg": data[0]["commit"]["message"],
            "latest_commit_author": data[0]["commit"]["author"]["name"],
            "latest_commit_date": data[0]["commit"]["author"]["date"]
        })
    return result

async def create_release(owner: str, repo: str, tag_name: str, name: str, body: Optional[str] = None, draft: bool = False, prerelease: bool = False, target_commitish: Optional[str] = None) -> dict:
    payload = {
        "tag_name": tag_name,
        "name": name,
        "draft": draft,
        "prerelease": prerelease
    }
    if body: payload["body"] = body
    if target_commitish: payload["target_commitish"] = target_commitish
    data = await call_github_api("POST", f"/repos/{owner}/{repo}/releases", data=payload)
    return {
        "release_id": data["id"],
        "release_url": data["html_url"],
        "release_tag": data["tag_name"],
        "release_upload_url": data["upload_url"]
    }


# ── Rollback / Compensating Actions ────────────────────────────────────────

async def delete_branch(owner: str, repo: str, branch_name: str) -> dict:
    """Delete a branch (compensating action for create_branch)."""
    try:
        await call_github_api("DELETE", f"/repos/{owner}/{repo}/git/refs/heads/{branch_name}")
        return {
            "deleted": True,
            "branch_name": branch_name,
            "message": f"Branch '{branch_name}' deleted successfully"
        }
    except Exception as e:
        if "422" in str(e) or "Reference does not exist" in str(e):
            return {
                "deleted": False,
                "branch_name": branch_name,
                "message": f"Branch '{branch_name}' does not exist (already deleted?)"
            }
        raise


async def close_pull_request(owner: str, repo: str, pr_number: int) -> dict:
    """Close a PR without merging (compensating action for create_pull_request)."""
    # First check if PR is already merged
    try:
        pr_data = await call_github_api("GET", f"/repos/{owner}/{repo}/pulls/{pr_number}")
        if pr_data.get("merged", False):
            return {
                "pr_number": pr_number,
                "state": "merged",
                "message": f"PR #{pr_number} already merged — cannot close. Manual intervention required.",
                "rollback_skipped": True
            }
    except Exception:
        pass  # Continue trying to close

    data = await call_github_api(
        "PATCH",
        f"/repos/{owner}/{repo}/pulls/{pr_number}",
        data={"state": "closed"}
    )
    return {
        "pr_number": data["number"],
        "state": "closed",
        "pr_url": data.get("html_url", ""),
        "message": f"PR #{pr_number} closed successfully"
    }


async def close_issue(owner: str, repo: str, issue_number: int) -> dict:
    """Close an issue (compensating action for create_issue)."""
    data = await call_github_api(
        "PATCH",
        f"/repos/{owner}/{repo}/issues/{issue_number}",
        data={"state": "closed"}
    )
    return {
        "issue_number": data["number"],
        "state": "closed",
        "message": f"Issue #{issue_number} closed successfully"
    }

async def handle_github_tool(action: str, inputs: dict) -> dict:
    """Dispatcher for GitHub tools."""
    owner = inputs.get("owner")
    repo = inputs.get("repo")

    # ── Flexible owner/repo resolution ─────────────────────────────────────────
    # The LLM often passes "owner/repo" as a single field under various key names.
    # Also handles GitHub URLs like https://github.com/owner/repo
    if not owner or not repo:
        for key in ("repo_full_name", "full_name", "repository", "repo_name"):
            val = inputs.get(key, "")
            if val and "/" in str(val):
                # Strip any leading URL prefix e.g. https://github.com/owner/repo
                slug = str(val).split("github.com/")[-1].strip("/")
                parts = slug.split("/")
                if len(parts) >= 2:
                    owner, repo = parts[0], parts[1]
                    break

    if not owner or not repo:
        raise ValueError(
            f"Missing 'owner' and 'repo' in GitHub tool inputs. "
            f"Received: {list(inputs.keys())}"
        )

    if action == "get_repository":
        return await get_repository(owner, repo)
    elif action == "list_branches":
        return await list_branches(owner, repo, inputs.get("per_page", 30))
    elif action == "create_branch":
        return await create_branch(owner, repo, inputs.get("branch_name"), inputs.get("from_branch"))
    elif action == "get_branch":
        return await get_branch(owner, repo, inputs.get("branch"))
    elif action == "list_issues":
        return await list_issues(owner, repo, inputs.get("state", "open"), inputs.get("labels"), inputs.get("assignee"))
    elif action == "get_issue":
        return await get_issue(owner, repo, int(inputs.get("issue_number")))
    elif action == "create_issue":
        return await create_issue(owner, repo, inputs.get("title"), inputs.get("body"), inputs.get("labels"), inputs.get("assignees"))
    elif action == "add_issue_comment":
        return await add_issue_comment(owner, repo, int(inputs.get("issue_number")), inputs.get("body"))
    elif action == "update_issue":
        return await update_issue(owner, repo, int(inputs.get("issue_number")), 
                                   state=inputs.get("state"), title=inputs.get("title"), 
                                   body=inputs.get("body"), labels=inputs.get("labels"), 
                                   assignees=inputs.get("assignees"))
    elif action == "create_pull_request":
        payload = {
            "title": inputs.get("title"),
            "head": inputs.get("head"),
            "base": inputs.get("base"),
            "body": inputs.get("body"),
            "draft": inputs.get("draft", False)
        }
        data = await call_github_api("POST", f"/repos/{owner}/{repo}/pulls", data=payload)
        return {
            "pr_number": data["number"],
            "pr_url": data["html_url"],
            "pr_api_url": data["url"],
            "pr_title": data["title"],
            "pr_state": data["state"],
            "pr_diff_url": data["diff_url"]
        }
    elif action == "list_pull_requests":
        return await list_pull_requests(owner, repo, inputs.get("state", "open"), inputs.get("head"), inputs.get("base"))
    elif action == "get_pull_request":
        return await get_pull_request(owner, repo, int(inputs.get("pr_number")))
    elif action == "merge_pull_request":
        return await merge_pull_request(owner, repo, int(inputs.get("pr_number")), 
                                        inputs.get("merge_method", "merge"), inputs.get("commit_title"))
    elif action == "add_labels":
        return await add_labels(owner, repo, int(inputs.get("issue_number")), inputs.get("labels"))
    elif action == "get_file_content":
        return await get_file_content(owner, repo, inputs.get("path"), inputs.get("ref"))
    elif action == "create_or_update_file":
        return await create_or_update_file(owner, repo, inputs.get("path"), inputs.get("message"), 
                                           inputs.get("content"), inputs.get("branch"), inputs.get("sha"))
    elif action == "list_commits":
        return await list_commits(owner, repo, inputs.get("sha"), inputs.get("path"), inputs.get("per_page", 10))
    elif action == "create_release":
        return await create_release(owner, repo, inputs.get("tag_name"), inputs.get("name"), 
                                     inputs.get("body"), inputs.get("draft", False), 
                                     inputs.get("prerelease", False), inputs.get("target_commitish"))
    # ── Rollback Actions ──────────────────────────────────────────────────────
    elif action == "delete_branch":
        return await delete_branch(owner, repo, inputs.get("branch_name"))
    elif action == "close_pull_request":
        return await close_pull_request(owner, repo, int(inputs.get("pr_number")))
    elif action == "close_issue":
        return await close_issue(owner, repo, int(inputs.get("issue_number")))
    
    raise ValueError(f"Unknown GitHub action: {action}")
