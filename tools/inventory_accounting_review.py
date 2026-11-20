"""Independent accounting reference model; deliberately imports no production code."""
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re
from typing import Iterable

class InvariantViolation(AssertionError):
    pass

def exact(value: str, precision: int, scale: int) -> Decimal:
    if not isinstance(value, str):
        raise TypeError("decimal inputs must be strings; binary float is forbidden")
    if re.fullmatch(r"-?(0|[1-9][0-9]*)(?:\.[0-9]+)?", value) is None:
        raise ValueError("decimal must be a plain base-10 string without whitespace or exponent")
    try:
        number = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("invalid decimal string") from exc
    if not number.is_finite() or number.quantize(Decimal(1).scaleb(-scale)) != number:
        raise ValueError("invalid decimal scale or non-finite value")
    if number.copy_abs() >= Decimal(10) ** (precision - scale):
        raise ValueError("numeric precision exceeded")
    return number

def rounded(value: Decimal, scale: int) -> Decimal:
    return value.quantize(Decimal(1).scaleb(-scale), rounding=ROUND_HALF_UP)

@dataclass(frozen=True)
class SaleLine:
    quantity: str
    unit_price_usd: str
    line_total_usd: str
    product_name_snapshot: str
    sku_snapshot: str

@dataclass(frozen=True)
class Sale:
    lines: tuple[SaleLine, ...]
    subtotal_usd: str
    total_usd: str
    payment_allocations_usd: tuple[str, ...]
    rate_snapshot: str
    effective_date_snapshot: str

@dataclass(frozen=True)
class Movement:
    organization: str
    branch: str
    warehouse: str
    product: str
    delta: str
    movement_id: str

@dataclass(frozen=True)
class Balance:
    organization: str
    branch: str
    warehouse: str
    product: str
    on_hand: str
    reserved: str

@dataclass(frozen=True)
class Shift:
    organization: str
    branch: str
    register: str
    cashier: str
    opening_cash: str
    cash_tenders: str
    cash_refunds: str
    cash_adjustments: str
    counted_closing_cash: str

def validate_sale(sale: Sale) -> None:
    if not sale.lines:
        raise InvariantViolation("sale must contain at least one line")
    amounts = []
    for line in sale.lines:
        qty, price, persisted = exact(line.quantity,14,3), exact(line.unit_price_usd,14,4), exact(line.line_total_usd,14,4)
        if qty <= 0 or price < 0:
            raise InvariantViolation("invalid quantity or unit price")
        if rounded(qty * price,4) != persisted:
            raise InvariantViolation("line snapshot amount does not reconcile")
        amounts.append(persisted)
    subtotal, total = exact(sale.subtotal_usd,14,4), exact(sale.total_usd,14,4)
    if sum(amounts,Decimal("0.0000")) != subtotal or total != subtotal:
        raise InvariantViolation("lines, subtotal and total do not reconcile")
    paid = sum((exact(x,14,4) for x in sale.payment_allocations_usd),Decimal("0.0000"))
    if paid != total:
        raise InvariantViolation("payment allocations do not reconcile to sale total")
    if exact(sale.rate_snapshot,18,8) <= 0 or not sale.effective_date_snapshot:
        raise InvariantViolation("historical BCV snapshot is incomplete")

def validate_ledger(movements: Iterable[Movement], balance: Balance) -> None:
    scope=(balance.organization,balance.branch,balance.warehouse,balance.product)
    deltas=[]
    for m in movements:
        if (m.organization,m.branch,m.warehouse,m.product) != scope:
            raise InvariantViolation("movement crossed organization/branch/warehouse/product scope")
        deltas.append(exact(m.delta,14,3))
    on_hand,reserved=exact(balance.on_hand,14,3),exact(balance.reserved,14,3)
    if on_hand < 0 or reserved < 0 or reserved > on_hand:
        raise InvariantViolation("invalid on-hand/reserved balance")
    if sum(deltas,Decimal("0.000")) != on_hand:
        raise InvariantViolation("append-only ledger does not reconcile to balance")

def validate_shift(s: Shift) -> None:
    o,t,r,a,c=(exact(v,16,2) for v in (s.opening_cash,s.cash_tenders,s.cash_refunds,s.cash_adjustments,s.counted_closing_cash))
    if o+t-r+a != c:
        raise InvariantViolation("shift cash movements do not reconcile to closing count")

def validate_actor_scope(actor_org: str, actor_branches: set[str], row_org: str, row_branch: str) -> None:
    if actor_org != row_org or row_branch not in actor_branches:
        raise InvariantViolation("actor is outside the row tenant/branch scope")

def reference_sale() -> Sale:
    return Sale((SaleLine("1.250","23.8500","29.8125","Coffee","COF-1"),),"29.8125","29.8125",("29.8125",),"36.12345678","2026-11-19")

def reference_ledger():
    m=Movement("org-a","branch-a","warehouse-a","product-a","1.500","m-1")
    b=Balance("org-a","branch-a","warehouse-a","product-a","1.500","0.250")
    return [m],b

def reference_shift():
    return Shift("org-a","branch-a","register-a","cashier-a","20.00","15.00","2.00","0.00","33.00")
