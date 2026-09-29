from datetime import datetime

from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import DeclarativeBase, Mapped, joinedload, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    applications: Mapped[list["Application"]] = relationship(back_populates="company")


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str]
    company: Mapped[Company] = relationship(back_populates="applications")
    interviews: Mapped[list["Interview"]] = relationship(back_populates="application")


class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"))
    scheduled_at: Mapped[datetime]
    kind: Mapped[str]
    application: Mapped[Application] = relationship(back_populates="interviews")


def schedule(session, start, end):
    """Interviews in [start, end), earliest first, with application and company loaded. One query."""
    ...


def format_schedule(interviews):
    """One line per interview: 'Mon 14 Sep 10:00  Company     Role                (kind)'."""
    ...
