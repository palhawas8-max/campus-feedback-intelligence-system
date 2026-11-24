"""
schemas.py — Pydantic v2 request/response models for all API endpoints.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="student", pattern="^(student|admin)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


class UserOut(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Locations ───────────────────────────────────────────────────────────────

class LocationOut(BaseModel):
    location_id: int
    block_name: str
    floor: str
    room_number: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Surveys ─────────────────────────────────────────────────────────────────

class SurveyCreate(BaseModel):
    location_id: int
    raw_text: str = Field(..., min_length=10, max_length=1000)
    input_mode: str = Field(default="typed", pattern="^(typed|voice)$")


class AnalysisResultOut(BaseModel):
    analysis_id: int
    cleaned_text: str
    extracted_keywords: list[str]
    sentiment_compound: float
    urgency_score: float
    urgency_level: str
    assigned_dept: str

    model_config = {"from_attributes": True}


class TicketOut(BaseModel):
    ticket_id: int
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SurveyOut(BaseModel):
    survey_id: int
    location_id: int
    raw_text: str
    input_mode: str
    created_at: datetime
    analysis: Optional[AnalysisResultOut] = None
    ticket: Optional[TicketOut] = None

    model_config = {"from_attributes": True}


class SurveySubmitResponse(BaseModel):
    survey: SurveyOut
    analysis: AnalysisResultOut
    ticket: TicketOut


# ─── Admin Stats ─────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_feedback: int
    critical_issues: int
    pending_tickets: int
    resolved_percentage: float
    avg_urgency_score: float


class KeywordFrequency(BaseModel):
    keyword: str
    count: int


class HeatmapCell(BaseModel):
    block_name: str
    floor: str
    count: int


class TrendPoint(BaseModel):
    date: str
    count: int


class DeptDistribution(BaseModel):
    department: str
    count: int


# ─── Admin Tickets ───────────────────────────────────────────────────────────

class TicketDetail(BaseModel):
    ticket_id: int
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    analysis_id: int
    urgency_level: str
    urgency_score: float
    assigned_dept: str
    sentiment_compound: float
    extracted_keywords: list[str]
    cleaned_text: str
    raw_text: str
    input_mode: str
    location_block: str
    location_floor: str
    location_room: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class TicketPage(BaseModel):
    items: list[TicketDetail]
    total: int
    page: int
    page_size: int
    total_pages: int


class TicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|In Progress|Resolved)$")
