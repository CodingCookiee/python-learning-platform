from collections.abc import Iterable
from typing import TypedDict


class OrderRow(TypedDict):
    order_id: str
    customer: str
    total_cents: int
    placed_on: str


class CustomerSummary(TypedDict):
    orders: int
    spent_cents: int
    last_order: str


def summarise(rows: Iterable[OrderRow]) -> dict[str, CustomerSummary]:
    """Orders, spend and latest order date per customer, biggest spender first."""
    summaries: dict[str, CustomerSummary] = {}
    for row in rows:
        customer = row["customer"].strip().lower()
        summary = summaries.get(customer)
        if summary is None:
            summaries[customer] = {
                "orders": 1,
                "spent_cents": row["total_cents"],
                "last_order": row["placed_on"],
            }
        else:
            summary["orders"] += 1
            summary["spent_cents"] += row["total_cents"]
            summary["last_order"] = max(summary["last_order"], row["placed_on"])
    ranked = sorted(summaries.items(), key=lambda item: (-item[1]["spent_cents"], item[0]))
    return dict(ranked)
