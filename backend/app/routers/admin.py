"""
routers/admin.py — Admin analytics, heatmap, trends, and ticket management.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import Counter
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.auth import require_admin
from app.database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])


def _days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


# ─── Stats ───────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=schemas.AdminStats)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    total = await db.scalar(select(func.count(models.Survey.survey_id)))
    critical = await db.scalar(
        select(func.count(models.AnalysisResult.analysis_id)).where(
            models.AnalysisResult.urgency_level == "Critical"
        )
    )
    pending = await db.scalar(
        select(func.count(models.IssueTicket.ticket_id)).where(
            models.IssueTicket.status == "Pending"
        )
    )
    total_tickets = await db.scalar(select(func.count(models.IssueTicket.ticket_id)))
    resolved = await db.scalar(
        select(func.count(models.IssueTicket.ticket_id)).where(
            models.IssueTicket.status == "Resolved"
        )
    )
    avg_urgency = await db.scalar(select(func.avg(models.AnalysisResult.urgency_score))) or 0.0
    resolved_pct = (resolved / total_tickets * 100) if total_tickets else 0.0

    return schemas.AdminStats(
        total_feedback=total or 0,
        critical_issues=critical or 0,
        pending_tickets=pending or 0,
        resolved_percentage=round(resolved_pct, 1),
        avg_urgency_score=round(avg_urgency, 3),
    )


# ─── Keywords ────────────────────────────────────────────────────────────────

@router.get("/keywords", response_model=list[schemas.KeywordFrequency])
async def admin_keywords(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    since = _days_ago(days)
    result = await db.execute(
        select(models.AnalysisResult.extracted_keywords)
        .join(models.Survey, models.AnalysisResult.survey_id == models.Survey.survey_id)
        .where(models.Survey.created_at >= since)
    )
    rows = result.scalars().all()
    counter: Counter = Counter()
    for kw_list in rows:
        if isinstance(kw_list, list):
            for kw in kw_list:
                counter[kw.lower().strip()] += 1
        elif isinstance(kw_list, str):
            try:
                parsed = json.loads(kw_list)
                for kw in parsed:
                    counter[kw.lower().strip()] += 1
            except Exception:
                pass

    return [
        schemas.KeywordFrequency(keyword=k, count=v)
        for k, v in counter.most_common(20)
    ]


# ─── Heatmap ─────────────────────────────────────────────────────────────────

@router.get("/heatmap", response_model=list[schemas.HeatmapCell])
async def admin_heatmap(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(
        select(
            models.Location.block_name,
            models.Location.floor,
            func.count(models.Survey.survey_id).label("count"),
        )
        .join(models.Survey, models.Survey.location_id == models.Location.location_id)
        .group_by(models.Location.block_name, models.Location.floor)
        .order_by(models.Location.block_name, models.Location.floor)
    )
    return [
        schemas.HeatmapCell(block_name=r.block_name, floor=r.floor, count=r.count)
        for r in result.all()
    ]


# ─── Trends ──────────────────────────────────────────────────────────────────

@router.get("/trends", response_model=list[schemas.TrendPoint])
async def admin_trends(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    since = _days_ago(days)
    result = await db.execute(
        select(
            func.date(models.Survey.created_at).label("date"),
            func.count(models.Survey.survey_id).label("count"),
        )
        .where(models.Survey.created_at >= since)
        .group_by(func.date(models.Survey.created_at))
        .order_by(func.date(models.Survey.created_at))
    )
    return [schemas.TrendPoint(date=str(r.date), count=r.count) for r in result.all()]


# ─── Department Distribution ─────────────────────────────────────────────────

@router.get("/department-distribution", response_model=list[schemas.DeptDistribution])
async def dept_distribution(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(
        select(
            models.AnalysisResult.assigned_dept,
            func.count(models.AnalysisResult.analysis_id).label("count"),
        )
        .group_by(models.AnalysisResult.assigned_dept)
        .order_by(func.count(models.AnalysisResult.analysis_id).desc())
    )
    return [
        schemas.DeptDistribution(department=r.assigned_dept, count=r.count)
        for r in result.all()
    ]


@router.get("/urgency-distribution")
async def urgency_distribution(
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(
        select(
            models.AnalysisResult.urgency_level,
            func.count(models.AnalysisResult.analysis_id).label("count"),
        )
        .group_by(models.AnalysisResult.urgency_level)
    )
    counts = {r.urgency_level: r.count for r in result.all()}
    return [
        {"level": lvl, "count": counts.get(lvl, 0)}
        for lvl in ["Low", "Medium", "High", "Critical"]
    ]


# ─── Tickets ─────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=schemas.TicketPage)
async def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    dept: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    block: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    base_query = (
        select(models.IssueTicket)
        .join(models.AnalysisResult, models.IssueTicket.analysis_id == models.AnalysisResult.analysis_id)
        .join(models.Survey, models.AnalysisResult.survey_id == models.Survey.survey_id)
        .join(models.Location, models.Survey.location_id == models.Location.location_id)
        .options(
            selectinload(models.IssueTicket.analysis).selectinload(models.AnalysisResult.survey).selectinload(models.Survey.location)
        )
    )

    filters = []
    if status_filter:
        filters.append(models.IssueTicket.status == status_filter)
    if dept:
        filters.append(models.AnalysisResult.assigned_dept.ilike(f"%{dept}%"))
    if urgency:
        filters.append(models.AnalysisResult.urgency_level == urgency)
    if block:
        filters.append(models.Location.block_name == block)
    if search:
        filters.append(models.Survey.raw_text.ilike(f"%{search}%"))

    if filters:
        base_query = base_query.where(and_(*filters))

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = await db.scalar(count_query) or 0

    # Paginate, sort by urgency desc
    urgency_order = case(
        (models.AnalysisResult.urgency_level == "Critical", 4),
        (models.AnalysisResult.urgency_level == "High", 3),
        (models.AnalysisResult.urgency_level == "Medium", 2),
        (models.AnalysisResult.urgency_level == "Low", 1),
        else_=0,
    )
    paged_query = (
        base_query
        .order_by(urgency_order.desc(), models.IssueTicket.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(paged_query)
    tickets = result.scalars().all()

    items = []
    for t in tickets:
        a = t.analysis
        s = a.survey
        loc = s.location
        items.append(
            schemas.TicketDetail(
                ticket_id=t.ticket_id,
                status=t.status,
                created_at=t.created_at,
                resolved_at=t.resolved_at,
                analysis_id=a.analysis_id,
                urgency_level=a.urgency_level,
                urgency_score=a.urgency_score,
                assigned_dept=a.assigned_dept,
                sentiment_compound=a.sentiment_compound,
                extracted_keywords=a.extracted_keywords if isinstance(a.extracted_keywords, list) else [],
                cleaned_text=a.cleaned_text,
                raw_text=s.raw_text,
                input_mode=s.input_mode,
                location_block=loc.block_name,
                location_floor=loc.floor,
                location_room=loc.room_number,
                submitted_at=s.created_at,
            )
        )

    return schemas.TicketPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.patch("/tickets/{ticket_id}", response_model=schemas.TicketOut)
async def update_ticket_status(
    ticket_id: int,
    payload: schemas.TicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    result = await db.execute(
        select(models.IssueTicket).where(models.IssueTicket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = payload.status
    if payload.status == "Resolved" and not ticket.resolved_at:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif payload.status != "Resolved":
        ticket.resolved_at = None

    await db.commit()
    await db.refresh(ticket)
    return ticket
