"""
routers/surveys.py — Student survey submission and submission history.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.nlp.pipeline import analyze

router = APIRouter(prefix="/surveys", tags=["Surveys"])


@router.post("", response_model=schemas.SurveySubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_survey(
    payload: schemas.SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Validate location exists
    loc_result = await db.execute(
        select(models.Location).where(models.Location.location_id == payload.location_id)
    )
    if not loc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Location not found")

    # Persist survey
    survey = models.Survey(
        user_id=current_user.user_id,
        location_id=payload.location_id,
        raw_text=payload.raw_text,
        input_mode=payload.input_mode,
    )
    db.add(survey)
    await db.flush()  # get survey_id without committing

    # Run NLP pipeline
    nlp_result = analyze(payload.raw_text)

    # Persist analysis
    analysis = models.AnalysisResult(
        survey_id=survey.survey_id,
        cleaned_text=nlp_result["cleaned_text"],
        extracted_keywords=nlp_result["keywords"],
        sentiment_compound=nlp_result["sentiment_compound"],
        urgency_score=nlp_result["urgency_score"],
        urgency_level=nlp_result["urgency_level"],
        assigned_dept=nlp_result["assigned_dept"],
    )
    db.add(analysis)
    await db.flush()

    # Create ticket
    ticket = models.IssueTicket(analysis_id=analysis.analysis_id)
    db.add(ticket)
    await db.commit()

    kws = analysis.extracted_keywords
    if isinstance(kws, str):
        try:
            import json
            kws = json.loads(kws)
        except Exception:
            kws = []

    analysis_out = schemas.AnalysisResultOut(
        analysis_id=analysis.analysis_id,
        cleaned_text=analysis.cleaned_text,
        extracted_keywords=kws if isinstance(kws, list) else [],
        sentiment_compound=analysis.sentiment_compound,
        urgency_score=analysis.urgency_score,
        urgency_level=analysis.urgency_level,
        assigned_dept=analysis.assigned_dept,
    )
    ticket_out = schemas.TicketOut(
        ticket_id=ticket.ticket_id,
        status=ticket.status,
        created_at=ticket.created_at,
        resolved_at=ticket.resolved_at,
    )
    survey_out = schemas.SurveyOut(
        survey_id=survey.survey_id,
        location_id=survey.location_id,
        raw_text=survey.raw_text,
        input_mode=survey.input_mode,
        created_at=survey.created_at,
        analysis=analysis_out,
        ticket=ticket_out,
    )

    return schemas.SurveySubmitResponse(
        survey=survey_out,
        analysis=analysis_out,
        ticket=ticket_out,
    )


@router.get("/mine", response_model=list[schemas.SurveyOut])
async def my_surveys(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Survey)
        .options(
            selectinload(models.Survey.analysis).selectinload(models.AnalysisResult.ticket)
        )
        .where(models.Survey.user_id == current_user.user_id)
        .order_by(models.Survey.created_at.desc())
    )
    surveys = result.scalars().all()

    out = []
    for s in surveys:
        ticket = s.analysis.ticket if s.analysis else None
        sv = schemas.SurveyOut(
            survey_id=s.survey_id,
            location_id=s.location_id,
            raw_text=s.raw_text,
            input_mode=s.input_mode,
            created_at=s.created_at,
            analysis=schemas.AnalysisResultOut.model_validate(s.analysis) if s.analysis else None,
            ticket=schemas.TicketOut.model_validate(ticket) if ticket else None,
        )
        out.append(sv)
    return out
