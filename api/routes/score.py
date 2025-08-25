from fastapi import APIRouter
from typing import List
from schemas.notify import NotifyItem, NotifyResponse
from services.notify import notify as do_notify

router = APIRouter(prefix="/notify", tags=["notify"])

@router.post("", response_model=List[NotifyResponse])
def notify(items: List[NotifyItem]):
    return [NotifyResponse(**do_notify(it)) for it in items]
