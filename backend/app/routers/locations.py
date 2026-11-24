"""
routers/locations.py — Returns campus locations for the feedback form dropdowns.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=list[schemas.LocationOut])
async def get_locations(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Location).order_by(models.Location.block_name, models.Location.floor)
    )
    return result.scalars().all()
