from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.platforms.schemas import VALID_PLATFORM_IDS
from .schemas import PlatformWeeklyReport
from .service import get_weekly_report

router = APIRouter()

AuthDep = Annotated[User, Depends(get_current_user)]


@router.get("/reports/{platform_id}", response_model=PlatformWeeklyReport)
def executive_report(
    platform_id: str,
    _: AuthDep,
    weeks_back: int = Query(0, ge=0, le=52, description="0 = current week"),
):
    if platform_id not in VALID_PLATFORM_IDS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform '{platform_id}' not found.",
        )
    try:
        return get_weekly_report(platform_id, weeks_back)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
