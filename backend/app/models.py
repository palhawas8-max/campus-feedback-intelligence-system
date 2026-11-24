"""
models.py — SQLAlchemy ORM models (normalized, with FK relationships).
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, String, Text, Float, DateTime, Enum as PgEnum,
    ForeignKey, JSON, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        PgEnum("student", "admin", name="user_role", native_enum=False), nullable=False, default="student"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    surveys: Mapped[list["Survey"]] = relationship("Survey", back_populates="user")


class Location(Base):
    __tablename__ = "locations"

    location_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    block_name: Mapped[str] = mapped_column(String(80), nullable=False)
    floor: Mapped[str] = mapped_column(String(20), nullable=False)
    room_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    surveys: Mapped[list["Survey"]] = relationship("Survey", back_populates="location")


class Survey(Base):
    __tablename__ = "surveys"

    survey_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.location_id"), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    input_mode: Mapped[str] = mapped_column(
        PgEnum("typed", "voice", name="input_mode", native_enum=False), nullable=False, default="typed"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="surveys")
    location: Mapped["Location"] = relationship("Location", back_populates="surveys")
    analysis: Mapped[Optional["AnalysisResult"]] = relationship(
        "AnalysisResult", back_populates="survey", uselist=False
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    survey_id: Mapped[int] = mapped_column(
        ForeignKey("surveys.survey_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    cleaned_text: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    sentiment_compound: Mapped[float] = mapped_column(Float, nullable=False)
    urgency_score: Mapped[float] = mapped_column(Float, nullable=False)
    urgency_level: Mapped[str] = mapped_column(
        PgEnum("Low", "Medium", "High", "Critical", name="urgency_level", native_enum=False), nullable=False
    )
    assigned_dept: Mapped[str] = mapped_column(String(120), nullable=False)

    survey: Mapped["Survey"] = relationship("Survey", back_populates="analysis")
    ticket: Mapped[Optional["IssueTicket"]] = relationship(
        "IssueTicket", back_populates="analysis", uselist=False
    )


class IssueTicket(Base):
    __tablename__ = "issue_tickets"

    ticket_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analysis_results.analysis_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        PgEnum("Pending", "In Progress", "Resolved", name="ticket_status", native_enum=False),
        nullable=False,
        default="Pending",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    analysis: Mapped["AnalysisResult"] = relationship("AnalysisResult", back_populates="ticket")
