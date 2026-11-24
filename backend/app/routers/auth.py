"""
routers/auth.py — Registration, login, and /me endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    # Check email uniqueness (case-insensitive)
    existing = await db.execute(select(models.User).where(func.lower(models.User.email) == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=payload.name.strip(),
        email=clean_email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
async def login(payload: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    result = await db.execute(select(models.User).where(func.lower(models.User.email) == clean_email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": str(user.user_id), "role": user.role})
    return schemas.TokenResponse(access_token=token, role=user.role, name=user.name)


@router.get("/me", response_model=schemas.UserOut)
async def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
