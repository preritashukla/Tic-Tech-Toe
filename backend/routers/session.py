"""
routers/session.py — Session Management Endpoints
Provides API access to conversation sessions for reconnection, history, and cleanup.

Author: Shivam Kumar (LLM Systems Developer)
"""

from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException

from services.session import get_session_manager

logger = logging.getLogger("mcp_gateway.router.session")

router = APIRouter(prefix="/session", tags=["Session Management"])


@router.get(
    "/active",
    summary="List active conversation sessions",
    description="Returns all active (non-expired) conversation sessions."
)
async def list_active_sessions() -> dict:
    """GET /session/active"""
    mgr = get_session_manager()
    return {
        "sessions": mgr.get_active_sessions(),
        "count": mgr.get_session_count()
    }


@router.get(
    "/{session_id}/history",
    summary="Get conversation history",
    description="Returns the full conversation history for a session."
)
async def get_session_history(session_id: str) -> dict:
    """GET /session/{session_id}/history"""
    mgr = get_session_manager()
    session = mgr.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found or expired")

    return {
        "session_id": session.session_id,
        "turn_count": session.turn_count,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
                "metadata": m.metadata
            }
            for m in session.messages
        ],
        "last_dag": session.last_dag_json,
        "last_execution_id": session.last_execution_id,
        "execution_history": session.execution_history,
        "has_summary": session.summary is not None,
        "created_at": session.created_at,
    }


@router.delete(
    "/{session_id}",
    summary="Delete a conversation session",
    description="Clears a conversation session and its history."
)
async def delete_session(session_id: str) -> dict:
    """DELETE /session/{session_id}"""
    mgr = get_session_manager()
    deleted = mgr.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return {"message": f"Session {session_id} deleted", "deleted": True}


@router.get(
    "/{session_id}/context",
    summary="Get session context for LLM",
    description="Returns the exact messages array that would be sent to the LLM."
)
async def get_session_context(session_id: str) -> dict:
    """
    GET /session/{session_id}/context
    
    Useful for debugging: shows exactly what context the LLM sees.
    """
    mgr = get_session_manager()
    session = mgr.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found or expired")

    llm_messages = session.get_messages_for_llm()
    return {
        "session_id": session.session_id,
        "llm_message_count": len(llm_messages),
        "llm_messages": llm_messages,
        "summary": session.summary,
        "total_messages_in_session": len(session.messages),
        "summarized_up_to": session._summary_cutoff,
    }
