"""CoffeeIN webhook sender — fires after order is completed.

Posterkassa calls coffeein.eu with order data so the loyalty
system can credit bonus points to the customer.

Config (.env):
    COFFEEIN_WEBHOOK_URL    = https://coffeein.eu/poster/public/webhook/posterkassa
    COFFEEIN_WEBHOOK_SECRET = some-shared-secret-string
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import threading
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.config import settings
from app.models import Order

logger = logging.getLogger(__name__)


def _serialize(obj):
    """JSON serializer for Decimal and datetime."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _build_payload(order: Order) -> dict:
    """Build the webhook payload from an Order ORM object."""
    paid_with_loyalty = any(
        p.method in ("loyalty_points", "sayv") for p in order.payments
    )
    return {
        "event": "order.completed",
        "order_id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "total_gross": float(order.total_gross),
        "paid_with_loyalty": paid_with_loyalty,
        "lines": [
            {
                "product_id": line.product_id,
                "product_name": line.product_name,
                "quantity": float(line.quantity),
            }
            for line in order.lines
        ],
        "payments": [
            {"method": p.method, "amount": float(p.amount)}
            for p in order.payments
        ],
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _send(payload: dict) -> None:
    """Send the webhook. Runs in a background thread so it never blocks the response."""
    url = settings.COFFEEIN_WEBHOOK_URL
    secret = settings.COFFEEIN_WEBHOOK_SECRET

    if not url:
        return

    try:
        body = json.dumps(payload, default=_serialize, ensure_ascii=False).encode("utf-8")
        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Posterkassa-Signature": _sign(body, secret) if secret else "",
        }
        with httpx.Client(timeout=10) as client:
            r = client.post(url, content=body, headers=headers)
            if r.status_code not in (200, 201, 204):
                logger.warning(
                    "CoffeeIN webhook HTTP %s for order %s: %s",
                    r.status_code, payload.get("order_id"), r.text[:200],
                )
            else:
                logger.info(
                    "CoffeeIN webhook OK for order %s", payload.get("order_id")
                )
    except Exception as exc:
        logger.error("CoffeeIN webhook error for order %s: %s", payload.get("order_id"), exc)


def fire_order_webhook(order: Order) -> None:
    """Fire webhook in background thread. Call after db.commit()."""
    if not order.customer_id:
        return  # no customer attached — nothing to credit
    if not settings.COFFEEIN_WEBHOOK_URL:
        return  # not configured

    payload = _build_payload(order)
    t = threading.Thread(target=_send, args=(payload,), daemon=True)
    t.start()
