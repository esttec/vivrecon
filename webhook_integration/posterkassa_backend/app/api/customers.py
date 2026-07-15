"""Klientide API — CRUD + otsing."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models import Customer, CustomerCategory, User
from app.schemas import CustomerIn, CustomerOut

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _enrich(c: Customer, db: Session) -> dict:
    """Lisab kliendi rea külge kategooria nime (mugavus front-i jaoks)."""
    d = CustomerOut.model_validate(c).model_dump()
    if c.category_id:
        cat = db.get(CustomerCategory, c.category_id)
        if cat:
            d["category_name"] = cat.name
    return d


@router.get("", response_model=list[CustomerOut])
def list_customers(
    segment: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Customer).order_by(Customer.created_at.desc())
    if segment:
        stmt = stmt.where(Customer.segment == segment)
    customers = list(db.execute(stmt).scalars())
    return [_enrich(c, db) for c in customers]


@router.get("/search", response_model=list[CustomerOut])
def search_customers(
    q: str = Query("", description="Otsisõna (nimi, telefon, klubikaart, e-post). Tühi = kõik kliendid."),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (q or "").strip()
    if not q:
        all_c = list(db.execute(
            select(Customer)
            .order_by(Customer.first_name, Customer.last_name)
            .limit(limit)
        ).scalars())
        return [_enrich(c, db) for c in all_c]

    results: list[Customer] = []
    seen: set[int] = set()

    def add(rows):
        for r in rows:
            if r.id not in seen:
                seen.add(r.id)
                results.append(r)

    add(db.execute(select(Customer).where(Customer.club_card_number == q)).scalars())
    add(db.execute(select(Customer).where(Customer.email == q)).scalars())
    phone_q = q.replace(" ", "").replace("-", "")
    add(db.execute(select(Customer).where(Customer.phone.like(f"%{phone_q}%"))).scalars())
    add(db.execute(select(Customer).where(Customer.qr_code == q)).scalars())
    add(db.execute(
        select(Customer)
        .where(or_(
            Customer.first_name.ilike(f"%{q}%"),
            Customer.last_name.ilike(f"%{q}%"),
        ))
        .order_by(Customer.first_name)
    ).scalars())

    return [_enrich(c, db) for c in results[:limit]]


@router.get("/lookup", response_model=CustomerOut)
def lookup_customer(
    q: str = Query(..., description="Telefon, QR-kood või e-post"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.execute(
        select(Customer).where(
            or_(
                Customer.phone == q,
                Customer.qr_code == q,
                Customer.club_card_number == q,
                Customer.email == q,
            )
        )
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Klienti ei leitud")
    return _enrich(c, db)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get single customer by ID — used by CoffeeIN loyalty sync."""
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "Klienti ei leitud")
    return _enrich(c, db)


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(
    payload: CustomerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.phone:
        existing = db.execute(
            select(Customer).where(Customer.phone == payload.phone)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(409, "Selle telefoninumbriga klient on juba olemas")
    c = Customer(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _enrich(c, db)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "Klienti ei leitud")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _enrich(c, db)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "manager")),
):
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "Klienti ei leitud")
    db.delete(c)
    db.commit()
