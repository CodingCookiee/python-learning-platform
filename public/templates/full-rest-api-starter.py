# Full REST API - Starter Template

"""Starter scaffold for a FastAPI-based REST API project."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field


app = FastAPI(
    title="Full REST API Starter",
    description="Starter scaffold for a production-style REST API.",
    version="0.1.0",
)


class ItemBase(BaseModel):
    """Shared item fields."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class ItemCreate(ItemBase):
    """Request model for creating an item."""


class ItemUpdate(BaseModel):
    """Request model for updating an item."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class ItemRead(ItemBase):
    """Response model for an item."""

    id: UUID
    created_at: datetime


_ITEMS: dict[UUID, ItemRead] = {}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Basic liveness check."""

    return {"status": "ok"}


@app.get("/items", response_model=list[ItemRead])
def list_items(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ItemRead]:
    """List stored items with simple pagination."""

    items = list(_ITEMS.values())
    return items[offset : offset + limit]


@app.get("/items/{item_id}", response_model=ItemRead)
def get_item(item_id: UUID) -> ItemRead:
    """Fetch a single item by ID."""

    item = _ITEMS.get(item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@app.post("/items", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate) -> ItemRead:
    """Create an item and return the stored record."""

    item = ItemRead(
        id=uuid4(),
        name=payload.name,
        description=payload.description,
        created_at=datetime.utcnow(),
    )
    _ITEMS[item.id] = item
    return item


@app.put("/items/{item_id}", response_model=ItemRead)
def update_item(item_id: UUID, payload: ItemUpdate) -> ItemRead:
    """Update an existing item."""

    current = _ITEMS.get(item_id)
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    updated = current.model_copy(
        update={
            "name": payload.name if payload.name is not None else current.name,
            "description": payload.description if payload.description is not None else current.description,
        }
    )
    _ITEMS[item_id] = updated
    return updated


@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID) -> None:
    """Delete an item."""

    if item_id not in _ITEMS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    del _ITEMS[item_id]


def seed_demo_data() -> None:
    """Insert one example record for local experimentation."""

    demo_item = ItemRead(
        id=uuid4(),
        name="Demo item",
        description="Use this as a starting point for your API resources.",
        created_at=datetime.utcnow(),
    )
    _ITEMS[demo_item.id] = demo_item


def main() -> None:
    """Print the starter guidance."""

    seed_demo_data()
    print("=== Full REST API Starter ===")
    print("TODO: Add authentication, database models, migrations, tests, and OpenAPI polish.")
    print("Run with: uvicorn full_rest_api_starter:app --reload")


if __name__ == "__main__":
    main()
