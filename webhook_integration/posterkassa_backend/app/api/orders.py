"""Tellimuste API."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Order, User
from app.schemas import OrderCreate, OrderOut
from app.services.order_service import create_order
from app.services.webhook import fire_order_webhook

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
def post_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Loo uus tellimus. Kogu äriloogika order_service-s (transaktsioon)."""
    order = create_order(db, payload, cashier_id=user.id)

    # Fire loyalty webhook to CoffeeIN (non-blocking background thread)
    fire_order_webhook(order)

    return order


@router.get("", response_model=list[OrderOut])
def list_orders(
    day: date_type | None = Query(None, description="Filter kuupäeva järgi"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Order).order_by(Order.created_at.desc()).limit(limit)
    if day:
        stmt = select(Order).where(
            Order.created_at >= day,
        ).order_by(Order.created_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars())


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Tellimust ei leitud")
    return order
