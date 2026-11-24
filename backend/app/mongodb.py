"""
mongodb.py — MongoDB Atlas integration for Campus Feedback Intelligence System.
Uses Motor (async driver) with certifi CA bundle for resilient SSL/TLS on Windows.
"""
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import certifi

from app.config import get_settings

logger = logging.getLogger("campus_feedback.mongodb")

_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_db: Optional[AsyncIOMotorDatabase] = None


async def init_mongo() -> Optional[AsyncIOMotorDatabase]:
    """Initialize MongoDB connection on app startup."""
    global _mongo_client, _mongo_db
    settings = get_settings()

    if not settings.MONGODB_URL:
        logger.warning("[MongoDB] MONGODB_URL is not set. MongoDB sync is disabled.")
        return None

    try:
        _mongo_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
        )
        # Test connection
        res = await _mongo_client.admin.command("ping")
        _mongo_db = _mongo_client[settings.MONGODB_DB_NAME]
        logger.info(f"[MongoDB] Connected successfully to Atlas ({settings.MONGODB_DB_NAME}): {res}")
        return _mongo_db
    except Exception as e:
        logger.error(f"[MongoDB] Failed to connect to MongoDB Atlas: {e}")
        _mongo_client = None
        _mongo_db = None
        return None


async def close_mongo() -> None:
    """Close MongoDB client connection on shutdown."""
    global _mongo_client, _mongo_db
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("[MongoDB] Connection closed.")


def get_mongo_db() -> Optional[AsyncIOMotorDatabase]:
    """Return the active MongoDB database handle, or None if disconnected."""
    return _mongo_db


async def check_mongo_health() -> dict:
    """Check MongoDB connection status and return metrics."""
    global _mongo_client, _mongo_db
    if not _mongo_client or _mongo_db is None:
        return {"status": "disconnected", "database": None}

    try:
        await _mongo_client.admin.command("ping")
        settings = get_settings()
        collections = await _mongo_db.list_collection_names()
        return {
            "status": "connected",
            "cluster": "MongoDB Atlas",
            "database": settings.MONGODB_DB_NAME,
            "collections": collections,
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Dual-Write Helper Functions ─────────────────────────────────────────────

async def mongo_sync_survey(
    survey_id: int,
    user_id: int,
    location_id: int,
    raw_text: str,
    input_mode: str,
    created_at: str,
    analysis: dict,
    ticket: Optional[dict] = None,
    location_info: Optional[dict] = None,
    user_info: Optional[dict] = None,
) -> bool:
    """Sync a completed survey and its NLP analysis into MongoDB Atlas."""
    if _mongo_db is None:
        return False

    try:
        doc = {
            "_id": f"survey_{survey_id}",
            "survey_id": survey_id,
            "user_id": user_id,
            "user": user_info or {},
            "location_id": location_id,
            "location": location_info or {},
            "raw_text": raw_text,
            "input_mode": input_mode,
            "created_at": created_at,
            "analysis": analysis,
            "ticket": ticket or {},
        }
        await _mongo_db.surveys.update_one(
            {"_id": doc["_id"]},
            {"$set": doc},
            upsert=True,
        )
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Failed to sync survey {survey_id}: {e}")
        return False


async def mongo_update_ticket_status(ticket_id: int, status: str, resolved_at: Optional[str] = None) -> bool:
    """Sync ticket status update into MongoDB Atlas."""
    if _mongo_db is None:
        return False

    try:
        update_data = {"ticket.status": status}
        if resolved_at:
            update_data["ticket.resolved_at"] = resolved_at
            
        await _mongo_db.surveys.update_one(
            {"ticket.ticket_id": ticket_id},
            {"$set": update_data},
        )
        await _mongo_db.issue_tickets.update_one(
            {"_id": f"ticket_{ticket_id}"},
            {"$set": {"status": status, "resolved_at": resolved_at}},
            upsert=True,
        )
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Failed to update ticket {ticket_id}: {e}")
        return False
