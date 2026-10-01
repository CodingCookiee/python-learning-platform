"""The SQLAlchemy models: companies, their applications, and each application's interview stages."""

from datetime import date, datetime
from typing import Literal

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

Status = Literal["applied", "interviewing", "offer", "accepted", "rejected", "withdrawn"]
Source = Literal["job board", "referral", "recruiter", "direct"]
StageKind = Literal["phone screen", "technical", "take-home", "onsite", "final"]
Outcome = Literal["pending", "passed", "failed"]

# Where an application may go next from each status. The last three are closed.
TRANSITIONS: dict[str, set[str]] = {
    "applied": {"interviewing", "rejected", "withdrawn"},
    "interviewing": {"offer", "rejected", "withdrawn"},
    "offer": {"accepted", "rejected", "withdrawn"},
    "accepted": set(),
    "rejected": set(),
    "withdrawn": set(),
}
ACTIVE: tuple[str, ...] = ("applied", "interviewing", "offer")
OPEN_FOR_STAGES: tuple[str, ...] = ("applied", "interviewing")


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    website: Mapped[str | None]
    location: Mapped[str | None] = mapped_column(String(100))
    applications: Mapped[list["Application"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    role: Mapped[str] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="applied")
    applied_on: Mapped[date]
    salary_min: Mapped[int | None]
    salary_max: Mapped[int | None]
    notes: Mapped[str] = mapped_column(default="")
    company: Mapped[Company] = relationship(back_populates="applications")
    stages: Mapped[list["Stage"]] = relationship(
        back_populates="application", cascade="all, delete-orphan", order_by="Stage.scheduled_at"
    )


class Stage(Base):
    __tablename__ = "stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    scheduled_at: Mapped[datetime]
    outcome: Mapped[str] = mapped_column(String(10), default="pending")
    notes: Mapped[str] = mapped_column(default="")
    application: Mapped[Application] = relationship(back_populates="stages")
