import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr


class Settings(BaseModel):
    service_name: str = "Tidewater bookings"
    admin_key: SecretStr
    allowed_origins: list[str] = []
    max_party_size: int = Field(default=8, ge=1)


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1)
    party_size: int = Field(ge=1)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


# get_bookings and require_admin dependencies, the two routers, and their routes


def create_app(settings: Settings) -> FastAPI:
    """A complete, independent booking app for one brand."""
    return FastAPI()
